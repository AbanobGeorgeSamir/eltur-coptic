const express = require('express');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { del: deleteBlob, head: headBlob, issueSignedToken, presignUrl } = require('@vercel/blob');
const { handleUploadPresigned } = require('@vercel/blob/client');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Confession = require('../models/Confession');
const MinistryPost = require('../models/MinistryPost');
const Task = require('../models/Task');
const PrayerChecklist = require('../models/PrayerChecklist');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const FeaturedVerse = require('../models/FeaturedVerse');
const DailyReading = require('../models/DailyReading');
const VerseUpdateEvent = require('../models/VerseUpdateEvent');
const { sendFeaturedVerseUpdate } = require('../services/push_notifications');
const PhotoAsset = require('../models/PhotoAsset');
const TripRegistration = require('../models/TripRegistration');
const MeetingGroup = require('../models/MeetingGroup');
const auth = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const { sanitizeUser } = require('../utils/responses');
const { validEmail, validPhone, normalizePhone, hasFourPartName } = require('../utils/validation');
const { hashPassword } = require('../utils/passwords');
const { roleLabelFor } = require('../utils/roleLabels');
const { mediaUploadRateLimit, bulkWriteRateLimit } = require('../middleware/rateLimit');
const {
    grades, gradeIds, gradeAdminRoles, isGradeAdminRole, normalizeGradeId, adminRoleForGrade, adminRoleMatchesGrade,
} = require('../config/grades');

const router = express.Router();
const receiveMediaUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('file');
const postTypes = new Set(['bible', 'psalm', 'agpeya', 'sunday_lesson', 'liturgy', 'newsletter', 'gallery', 'trip']);
const liturgyWeekdayOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const cairoWeekdayTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});
const objectId = (value) => mongoose.isValidObjectId(value);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isGlobalAdmin = (user) => user?.role === 'admin';
const isAdmin = (user) => isGlobalAdmin(user) || isGradeAdminRole(user?.role);
const isPermanentLiturgy = (post) => post.liturgyType === 'permanent' || (!post.liturgyType && !post.eventAt);
const nextLiturgyOffsetMinutes = (post, now) => {
    if (isPermanentLiturgy(post)) {
        const parts = Object.fromEntries(cairoWeekdayTime.formatToParts(now)
            .map(({ type, value }) => [type, value]));
        const currentDay = liturgyWeekdayOrder.indexOf(parts.weekday.toLowerCase());
        const targetDay = liturgyWeekdayOrder.indexOf(post.dayOfWeek || 'friday');
        if (currentDay < 0 || targetDay < 0) return Number.POSITIVE_INFINITY;

        const currentMinute = Number(parts.hour) * 60 + Number(parts.minute);
        const startMatch = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(post.startTime || '00:00');
        const startMinute = startMatch ? Number(startMatch[1]) * 60 + Number(startMatch[2]) : 0;
        const endMatch = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(post.endTime || '');
        const endMinute = endMatch ? Number(endMatch[1]) * 60 + Number(endMatch[2]) : -1;
        let daysAhead = (targetDay - currentDay + liturgyWeekdayOrder.length) % liturgyWeekdayOrder.length;
        if (daysAhead === 0 && startMinute < currentMinute) {
            if (endMinute > currentMinute) return 0;
            daysAhead = liturgyWeekdayOrder.length;
        }
        return daysAhead * 24 * 60 + startMinute - currentMinute;
    }

    const eventTime = new Date(post.startAt || post.eventAt || '').getTime();
    return Number.isFinite(eventTime) ? (eventTime - now.getTime()) / 60_000 : Number.POSITIVE_INFINITY;
};
const productionMediaApiOrigin = 'https://eltur-coptic-api-server.vercel.app';
const requestOrigin = (req) => {
    const configured = String(process.env.PUBLIC_API_URL || '').trim();
    if (configured) {
        try {
            const parsed = new URL(configured);
            const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
            if (parsed.host && (parsed.protocol === 'https:' || !production && parsed.protocol === 'http:')) {
                return parsed.origin;
            }
        } catch {
            // Fall through to the deployment's trusted request host.
        }
    }
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        return productionMediaApiOrigin;
    }
    const requestHost = String(req.get('host') || '').trim();
    if (!requestHost) return '';
    const requestProtocol = String(req.protocol || 'http').toLowerCase();
    return `${requestProtocol === 'https' ? 'https' : 'http'}://${requestHost}`;
};
const mediaAssetUrl = (req, id) => {
    const origin = requestOrigin(req);
    if (!origin) return '';
    const apiPath = String(req.baseUrl || '').replace(/\/$/, '');
    return new URL(`${apiPath}/media/${id}`, origin).toString();
};
const adminScope = (user) => isGlobalAdmin(user) ? {} : {
    grade: user?.grade || '__invalid_grade__',
    ...(user?.meetingGroup ? { meetingGroup: user.meetingGroup } : {}),
};
const meetingGroupAdminScope = (user) => isGlobalAdmin(user) ? {} : user?.meetingGroup
    ? { _id: user.meetingGroup }
    : { grade: user?.grade || '__invalid_grade__' };
const applyAdminScope = (filter, user) => Object.assign(filter, adminScope(user));
const moveMeetingGroupReferences = async (sourceId, targetId, session) => {
    // These are all models with a direct MeetingGroup reference. Student-owned
    // history (attendance, confession, quiz attempts, trip registrations) keeps
    // its existing student/content ids when those records are moved.
    const scopedModels = [
        ['users', User],
        ['posts', MinistryPost],
        ['tasks', Task],
        ['quizzes', Quiz],
    ];
    const moved = {};
    for (const [key, Model] of scopedModels) {
        const result = await Model.updateMany(
            { meetingGroup: sourceId },
            { $set: { meetingGroup: targetId } },
            { session },
        );
        moved[key] = result.modifiedCount || 0;
    }
    return moved;
};

const audienceForStudents = (students) => {
    const scopes = [{ audienceMode: 'shared' }];
    for (const student of students) {
        if (!gradeIds.has(student.grade)) continue;
        scopes.push({
            audienceMode: 'grade',
            grade: student.grade,
            meetingGroup: { $in: [null, ...(student.meetingGroup ? [student.meetingGroup] : [])] },
        });
    }
    return { $or: scopes };
};

const studentScope = (user) => isGlobalAdmin(user) ? { role: 'student', isActive: { $ne: false } } : {
    role: 'student',
    isActive: { $ne: false },
    ...adminScope(user),
};
const pendingStudentScope = (user) => isGlobalAdmin(user) ? { role: 'student', isActive: { $ne: false } } : {
    role: 'student',
    isActive: { $ne: false },
    grade: user?.grade || '__invalid_grade__',
    ...(user?.meetingGroup ? { meetingGroup: { $in: [user.meetingGroup, null] } } : {}),
};

const validAudience = async (user, input = {}) => {
    const requestedGrade = input.grade || null;
    const grade = isGlobalAdmin(user) ? requestedGrade : user.grade;
    if (!isGlobalAdmin(user) && requestedGrade && requestedGrade !== user.grade) {
        return { error: 'You can only manage content for your assigned grade.' };
    }
    if (grade && !gradeIds.has(grade)) return { error: 'Choose a valid grade.' };
    let meetingGroup = input.meetingGroup || null;
    if (!isGlobalAdmin(user) && user.meetingGroup) {
        if (meetingGroup && String(meetingGroup) !== String(user.meetingGroup)) {
            return { error: 'You can only manage your assigned meeting group.' };
        }
        meetingGroup = user.meetingGroup;
    }
    if (meetingGroup) {
        if (!grade || !objectId(meetingGroup)) return { error: 'Choose a valid meeting group for a grade.' };
        const group = await MeetingGroup.findOne({ _id: meetingGroup, grade, isActive: true }).select('_id').lean();
        if (!group) return { error: 'The selected meeting group does not belong to that grade.' };
        meetingGroup = group._id;
    }
    return { grade, meetingGroup };
};

const readLiturgySchedule = (input, fallback = {}) => {
    const liturgyType = input.liturgyType ?? fallback.liturgyType ?? 'permanent';
    if (!['permanent', 'temporary'].includes(liturgyType)) {
        return { error: 'Liturgy type must be permanent or temporary.' };
    }
    const parseDate = (value) => {
        const parsed = value ? new Date(value) : null;
        return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
    };
    const timeFromDate = (value) => {
        const parsed = parseDate(value);
        return parsed ? new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Africa/Cairo',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).format(parsed) : null;
    };
    const startTime = input.startTime ?? fallback.startTime ?? timeFromDate(input.startAt ?? fallback.startAt ?? fallback.eventAt);
    const endTime = input.endTime ?? fallback.endTime ?? timeFromDate(input.endAt ?? fallback.endAt);
    const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
    const startAt = parseDate(input.startAt ?? fallback.startAt ?? fallback.eventAt);
    const endAt = parseDate(input.endAt ?? fallback.endAt);
    if (liturgyType === 'permanent') {
        if (!validTime(startTime) || !validTime(endTime)) return { error: 'Permanent liturgies require valid start and end times.' };
        if (endTime <= startTime) return { error: 'The end time must be later than the start time.' };
        const fallbackDay = fallback.dayOfWeek;
        const dayOfWeek = input.dayOfWeek ?? fallbackDay ?? 'friday';
        if (!['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(dayOfWeek)) {
            return { error: 'Choose a valid weekday for the permanent liturgy.' };
        }
        return {
            liturgyType,
            dayOfWeek,
            startTime,
            endTime,
            eventAt: undefined,
            startAt: undefined,
            endAt: undefined,
            autoDeleteAt: undefined,
            expiredAt: undefined,
        };
    }
    if (!startAt || !endAt) {
        return { error: 'Temporary liturgies require a valid date, start time, and end time.' };
    }
    if (endAt <= startAt) return { error: 'The end time must be later than the start time.' };
    return { liturgyType, dayOfWeek: undefined, startAt, endAt, autoDeleteAt: endAt, eventAt: startAt, expiredAt: undefined };
};

const cronAuthorized = (req) => {
    const secret = process.env.CRON_SECRET;
    const authorization = req.get('authorization') || '';
    if (!secret || !authorization.startsWith('Bearer ')) return false;
    const provided = Buffer.from(authorization.slice(7));
    const expected = Buffer.from(secret);
    return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

const getChildren = (user) => User.find({
    _id: { $in: user.parentApprovedStudentIds || [] },
    role: 'student',
    guardianPhone: user.phone,
}).select('-nationalId -password');

const getAccessibleStudentIds = async (user) => {
    if (isAdmin(user)) {
        const students = await User.find(studentScope(user)).select('_id').lean();
        return students.map((student) => student._id);
    }
    if (user.role === 'parent') {
        const children = await getChildren(user).select('_id').lean();
        return children.map((child) => child._id);
    }
    return [user._id];
};

const cairoDay = (value) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value);

router.get('/grades', (req, res) => res.json({ data: grades }));

router.get('/meeting-groups', async (req, res, next) => {
    try {
        const grade = String(req.query.grade || '');
        if (!gradeIds.has(grade)) return res.status(422).json({ message: 'Choose a valid grade.' });
        const groups = await MeetingGroup.find({ grade, isActive: true }).select('name grade').sort({ name: 1 }).lean();
        return res.json({ data: groups.map((group) => ({ id: String(group._id), name: group.name, grade: group.grade })) });
    } catch (error) {
        return next(error);
    }
});

router.get('/admin/meeting-groups', auth, adminOnly, async (req, res, next) => {
    try {
        let filter = {};
        if (req.query.grade) {
            if (!gradeIds.has(String(req.query.grade))) return res.status(422).json({ message: 'Choose a valid grade.' });
            filter.grade = String(req.query.grade);
        }
        if (req.query.includeInactive === '1') filter.isActive = { $in: [true, false] };
        else filter.isActive = true;
        if (isGradeAdminRole(req.user.role)) Object.assign(filter, meetingGroupAdminScope(req.user));
        const groups = await MeetingGroup.find(filter).sort({ grade: 1, name: 1 }).lean();
        const groupIds = groups.map((group) => group._id);
        const countByGroup = (entries) => new Map(entries.map((entry) => [String(entry._id), entry.count]));
        const countReferences = (Model, match = {}) => Model.aggregate([
            { $match: { ...match, meetingGroup: { $in: groupIds } } },
            { $group: { _id: '$meetingGroup', count: { $sum: 1 } } },
        ]);
        const [studentCounts, postCounts, taskCounts, quizCounts] = groupIds.length
            ? await Promise.all([
                countReferences(User, { role: 'student' }),
                countReferences(MinistryPost),
                countReferences(Task),
                countReferences(Quiz),
            ])
            : [[], [], [], []];
        const studentsByGroup = countByGroup(studentCounts);
        const postsByGroup = countByGroup(postCounts);
        const tasksByGroup = countByGroup(taskCounts);
        const quizzesByGroup = countByGroup(quizCounts);
        return res.json({ data: groups.map((group) => {
            const id = String(group._id);
            return {
                id,
                name: group.name,
                grade: group.grade,
                isActive: group.isActive,
                items: {
                    students: studentsByGroup.get(id) || 0,
                    posts: postsByGroup.get(id) || 0,
                    tasks: tasksByGroup.get(id) || 0,
                    quizzes: quizzesByGroup.get(id) || 0,
                },
            };
        }) });
    } catch (error) {
        return next(error);
    }
});

router.post('/admin/meeting-groups', auth, adminOnly, async (req, res, next) => {
    try {
        const grade = isGradeAdminRole(req.user.role) ? req.user.grade : String(req.body?.grade || '');
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        if (isGradeAdminRole(req.user.role) && req.user.meetingGroup) {
            return res.status(403).json({ message: 'Meeting-group admins cannot create another group.' });
        }
        if (!gradeIds.has(grade) || name.length < 2 || name.length > 80) {
            return res.status(422).json({ message: 'Choose a grade and a meeting-group name from 2 to 80 characters.' });
        }
        const group = await MeetingGroup.create({ grade, name, createdBy: req.user._id });
        return res.status(201).json({ message: 'Meeting group created.', data: { id: String(group._id), name: group.name, grade: group.grade, isActive: group.isActive } });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'A meeting group with that name already exists in this grade.' });
        return next(error);
    }
});

router.patch('/admin/meeting-groups/:id', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Meeting group not found.' });
        const filter = { _id: req.params.id, ...meetingGroupAdminScope(req.user) };
        const group = await MeetingGroup.findOne(filter);
        if (!group) return res.status(404).json({ message: 'Meeting group not found in your scope.' });
        if (req.body?.name !== undefined) {
            const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
            if (name.length < 2 || name.length > 80) return res.status(422).json({ message: 'Meeting-group name must contain 2 to 80 characters.' });
            group.name = name;
        }
        if (req.body?.isActive !== undefined) {
            if (typeof req.body.isActive !== 'boolean') return res.status(422).json({ message: 'Meeting-group status is invalid.' });
            if (!req.body.isActive) {
                const linkedRecords = await Promise.all([
                    User.exists({ meetingGroup: group._id }),
                    MinistryPost.exists({ meetingGroup: group._id }),
                    Task.exists({ meetingGroup: group._id }),
                    Quiz.exists({ meetingGroup: group._id }),
                ]);
                if (linkedRecords.some(Boolean)) {
                    return res.status(409).json({ message: 'Move this group into another active group before disabling it.' });
                }
            }
            group.isActive = req.body.isActive;
        }
        await group.save();
        return res.json({ message: 'Meeting group updated.', data: { id: String(group._id), name: group.name, grade: group.grade, isActive: group.isActive } });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'A meeting group with that name already exists in this grade.' });
        return next(error);
    }
});

router.post('/admin/meeting-groups/:id/merge', auth, adminOnly, async (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Only the global administrator can merge meeting groups.' });
    const sourceId = String(req.params.id || '');
    const targetId = String(req.body?.targetId || '');
    if (!objectId(sourceId) || !objectId(targetId) || sourceId === targetId) {
        return res.status(422).json({ message: 'Choose two different valid meeting groups.' });
    }

    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const source = await MeetingGroup.findOne({ _id: sourceId, isActive: true }).session(session);
            const target = await MeetingGroup.findOne({ _id: targetId, isActive: true }).session(session);
            if (!source || !target) {
                result = { status: 404, message: 'Both meeting groups must be active.' };
                return;
            }
            if (String(source.grade) !== String(target.grade)) {
                result = { status: 422, message: 'Meeting groups can only be merged within the same stage.' };
                return;
            }

            const moved = await moveMeetingGroupReferences(source._id, target._id, session);
            // Keep the source group as an inactive archive; never delete it or
            // any linked records after the references have been transferred.
            source.isActive = false;
            await source.save({ session });
            result = {
                status: 200,
                data: {
                    sourceId: String(source._id),
                    targetId: String(target._id),
                    grade: source.grade,
                    moved,
                },
            };
        });
        if (result?.status !== 200) return res.status(result?.status || 409).json({ message: result?.message || 'The meeting-group merge could not be completed.' });
        return res.json({ message: 'Meeting group merged and archived.', data: result.data });
    } catch (error) {
        return next(error);
    } finally {
        await session.endSession();
    }
});

router.get('/administrator-candidates', auth, async (req, res) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Public administrator access required.' });
    const query = String(req.query.q || '').trim();
    if (query.length > 100) return res.status(422).json({ message: 'Search text must be 100 characters or fewer.' });
    if (!query) return res.json({ data: [], hasMore: false });
    const offset = Number(req.query.offset || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 100000) {
        return res.status(422).json({ message: 'Search result offset is invalid.' });
    }
    const limit = 40;
    const search = new RegExp(escapeRegex(query), 'i');
    const filter = {
        role: { $in: ['student', 'parent'] },
        $or: [{ name: search }, { username: search }, { email: search }, { phone: search }],
    };
    const exactUsername = await User.findOne({ role: { $in: ['student', 'parent'] }, username: query.toLowerCase() })
        .select('name username email phone role grade isActive')
        .lean();
    const resultsFilter = exactUsername
        ? { ...filter, _id: { $ne: exactUsername._id } }
        : filter;
    const resultsOffset = Math.max(0, offset - (exactUsername ? 1 : 0));
    const resultLimit = limit + 1 - (offset === 0 && exactUsername ? 1 : 0);
    const results = await User.find(resultsFilter)
        .select('name username email phone role grade isActive')
        .sort({ username: 1, name: 1, _id: 1 })
        .skip(resultsOffset)
        .limit(resultLimit)
        .lean();
    const candidates = offset === 0 && exactUsername ? [exactUsername, ...results] : results;
    const hasMore = candidates.length > limit;
    const page = candidates.slice(0, limit);
    return res.json({ data: page.map((item) => ({
        id: String(item._id), name: item.name, username: item.username, email: item.email || '',
        phone: item.phone, role: item.role, grade: item.grade || null, isActive: item.isActive !== false,
    })), hasMore });
});

router.get('/administrators', auth, async (req, res) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Public administrator access required.' });
    const admins = await User.find({ role: { $in: ['admin', ...gradeAdminRoles] } })
        .select('name username email phone role grade meetingGroup isActive')
        .populate('meetingGroup', 'name')
        .sort({ role: 1, grade: 1, name: 1 })
        .lean();
    return res.json({ data: admins.map((item) => ({
        id: String(item._id), name: item.name, username: item.username, email: item.email || '', phone: item.phone,
        role: item.role, roleLabel: roleLabelFor(item.role, item.grade), grade: item.grade || null, stage: item.grade || null,
        meetingGroup: item.meetingGroup ? { id: String(item.meetingGroup._id), name: item.meetingGroup.name } : null,
        isActive: item.isActive !== false,
    })) });
});

router.post('/administrators', auth, async (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Public administrator access required.' });
    try {
        const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
        const username = String(req.body?.username || name).trim().toLowerCase();
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const phone = normalizePhone(req.body?.phone);
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const stageInput = req.body?.stage ?? req.body?.stageId ?? req.body?.studyStage;
        const gradeInput = req.body?.gradeId ?? req.body?.grade;
        const requestedStage = normalizeGradeId(stageInput);
        const legacyGrade = normalizeGradeId(gradeInput);
        if (requestedStage && legacyGrade && requestedStage !== legacyGrade) {
            return res.status(422).json({ message: 'The selected stage does not match the administrator grade.' });
        }
        const grade = requestedStage || legacyGrade;
        const role = adminRoleForGrade(grade);
        const groupInput = req.body?.meetingGroup;
        const meetingGroupId = String(groupInput && typeof groupInput === 'object'
            ? groupInput.id ?? groupInput._id ?? ''
            : groupInput || '').trim();
        const accountInput = req.body?.userId ?? req.body?.user;
        const userId = String(accountInput && typeof accountInput === 'object'
            ? accountInput.id ?? accountInput._id ?? ''
            : accountInput || '').trim();
        if (!gradeIds.has(grade) || !role || role === 'grade_admin') {
            return res.status(422).json({ message: 'Choose a valid stage for the administrator.' });
        }
        if (await User.exists({ role: { $in: gradeAdminRoles }, grade, isActive: true })) {
            return res.status(409).json({ message: 'An active administrator is already assigned to that stage.' });
        }
        let meetingGroup = null;
        if (meetingGroupId) {
            if (!objectId(meetingGroupId)) return res.status(422).json({ message: 'Choose a valid meeting group.' });
            meetingGroup = await MeetingGroup.findOne({ _id: meetingGroupId, grade, isActive: true }).select('_id').lean();
            if (!meetingGroup) return res.status(422).json({ message: 'The selected meeting group does not belong to that grade.' });
            meetingGroup = meetingGroup._id;
        }
        if (userId) {
            if (!objectId(userId)) return res.status(422).json({ message: 'Choose a valid registered account.' });
            const admin = await User.findOne({
                _id: userId,
                role: { $in: ['student', 'parent'] },
                isActive: { $ne: false },
            }).select('+password');
            if (!admin) return res.status(404).json({ message: 'That active registered account could not be found.' });
            admin.role = role;
            admin.grade = grade;
            admin.meetingGroup = meetingGroup || null;
            await admin.save();
            return res.status(201).json({
                message: 'Registered account assigned as grade administrator.',
                data: { id: String(admin._id), name: admin.name, username: admin.username, role: admin.role, roleLabel: roleLabelFor(admin.role, admin.grade), grade: admin.grade, stage: admin.grade, meetingGroup: admin.meetingGroup, isActive: admin.isActive },
            });
        }
        if (name.length < 7 || name.length > 160 || !username || username.length > 160
            || !validPhone(phone) || (email && !validEmail(email)) || password.length < 8 || password.length > 256) {
            return res.status(422).json({ message: 'Enter a name (7–160 characters), an international phone number such as +201001234567, a valid optional email, and a password of 8–256 characters.' });
        }
        const admin = await User.create({
            name, username, ...(email ? { email } : {}), phone, password: await hashPassword(password),
            role, grade, meetingGroup, privacyAcceptedAt: new Date(),
        });
        return res.status(201).json({ message: 'Grade administrator created.', data: { id: String(admin._id), name: admin.name, username: admin.username, role: admin.role, roleLabel: roleLabelFor(admin.role, admin.grade), grade: admin.grade, stage: admin.grade, meetingGroup: admin.meetingGroup, isActive: admin.isActive } });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'That username, phone, or email is already registered.' });
        return next(error);
    }
});

router.patch('/administrators/:id', auth, async (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Public administrator access required.' });
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Administrator not found.' });
        const admin = await User.findOne({ _id: req.params.id, role: { $in: ['admin', ...gradeAdminRoles] } });
        if (!admin) return res.status(404).json({ message: 'Administrator not found.' });
        const requestedRole = req.body?.role ?? admin.role;
        const grade = req.body?.grade ?? admin.grade;
        const groupId = req.body?.meetingGroup === undefined ? String(admin.meetingGroup || '') : String(req.body.meetingGroup || '');
        const isStageRole = requestedRole === 'grade_admin' || isGradeAdminRole(requestedRole);
        const role = requestedRole === 'admin' ? 'admin' : isStageRole ? adminRoleForGrade(grade) : null;
        if (!role || (isGradeAdminRole(requestedRole) && requestedRole !== 'grade_admin'
            && requestedRole !== role && !adminRoleMatchesGrade(requestedRole, grade))) {
            return res.status(422).json({ message: 'Administrator role is invalid for the selected grade.' });
        }
        if (String(admin._id) === String(req.user._id) && role !== admin.role) {
            return res.status(422).json({ message: 'You cannot change your own administrator role.' });
        }
        if (isGradeAdminRole(role)) {
            if (!gradeIds.has(grade)) return res.status(422).json({ message: 'A valid grade is required for a grade administrator.' });
            const remainsActive = req.body?.isActive === undefined ? admin.isActive !== false : req.body.isActive === true;
            if (remainsActive && await User.exists({ _id: { $ne: admin._id }, role: { $in: gradeAdminRoles }, grade, isActive: true })) {
                return res.status(409).json({ message: 'An active administrator is already assigned to that stage.' });
            }
            let group = null;
            if (groupId) {
                if (!objectId(groupId)) return res.status(422).json({ message: 'Choose a valid meeting group.' });
                group = await MeetingGroup.findOne({ _id: groupId, grade, isActive: true }).select('_id').lean();
                if (!group) return res.status(422).json({ message: 'Meeting group must belong to the assigned grade.' });
            }
            admin.grade = grade;
            admin.meetingGroup = group?._id || null;
        } else {
            admin.grade = null;
            admin.meetingGroup = null;
        }
        admin.role = role;
        if (req.body?.isActive !== undefined) {
            if (typeof req.body.isActive !== 'boolean') return res.status(422).json({ message: 'Administrator status is invalid.' });
            if (String(admin._id) === String(req.user._id) && !req.body.isActive) return res.status(422).json({ message: 'You cannot disable your own account.' });
            admin.isActive = req.body.isActive;
        }
        await admin.save();
        return res.json({ message: 'Administrator updated.', data: sanitizeUser(admin) });
    } catch (error) {
        return next(error);
    }
});

router.delete('/administrators/:id', auth, async (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Public administrator access required.' });
    if (!objectId(req.params.id)) return res.status(404).json({ message: 'Administrator not found.' });

    let session;
    let removedAdministratorId = '';
    let removalError = '';
    try {
        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            const administrator = await User.findOne({
                _id: req.params.id,
                role: { $in: ['admin', ...gradeAdminRoles] },
            }).session(session);
            if (!administrator) return;
            if (String(administrator._id) === String(req.user._id)) {
                removalError = 'You cannot delete your own administrator account.';
                return;
            }
            if (administrator.role === 'admin' && administrator.isActive !== false) {
                const activeGlobalAdmins = await User.countDocuments({ role: 'admin', isActive: { $ne: false } }).session(session);
                if (activeGlobalAdmins <= 1) {
                    removalError = 'The last active global administrator cannot be deleted.';
                    return;
                }
            }

            const administratorId = administrator._id;
            const replacementAdminId = req.user._id;
            await Attendance.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await Confession.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await MinistryPost.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await Task.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await PrayerChecklist.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await Quiz.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await TripRegistration.updateMany({ admin: administratorId }, { $set: { admin: replacementAdminId } }, { session });
            await MeetingGroup.updateMany({ createdBy: administratorId }, { $set: { createdBy: replacementAdminId } }, { session });
            await FeaturedVerse.updateMany({ updatedBy: administratorId }, { $set: { updatedBy: replacementAdminId } }, { session });
            await PhotoAsset.updateMany({ owner: administratorId }, { $set: { owner: replacementAdminId } }, { session });
            await User.updateMany({ assignedAdmin: administratorId }, { $set: { assignedAdmin: null } }, { session });
            await User.updateMany({ rejectedBy: administratorId }, { $set: { rejectedBy: replacementAdminId } }, { session });
            await User.updateMany({ parentApprovedStudentIds: administratorId }, { $pull: { parentApprovedStudentIds: administratorId } }, { session });
            const result = await User.deleteOne({ _id: administratorId }, { session });
            if (result.deletedCount) removedAdministratorId = String(administratorId);
        });

        if (removalError) return res.status(409).json({ message: removalError });
        if (!removedAdministratorId) return res.status(404).json({ message: 'Administrator not found.' });
        return res.json({
            message: 'Administrator account deleted. Existing administrative records were retained.',
            id: removedAdministratorId,
        });
    } catch (error) {
        return next(error);
    } finally {
        if (session) await session.endSession();
    }
});

router.get('/maintenance/expire-liturgies', async (req, res, next) => {
    if (!cronAuthorized(req)) return res.status(401).json({ message: 'Unauthorized.' });
    try {
        const now = new Date();
        const result = await MinistryPost.updateMany({
            type: 'liturgy',
            published: true,
            $or: [
                { liturgyType: 'temporary', endAt: { $lte: now } },
                { liturgyType: 'temporary', endAt: { $exists: false }, autoDeleteAt: { $lte: now } },
                { liturgyType: { $exists: false }, eventAt: { $exists: true }, endAt: { $lte: now } },
                { liturgyType: { $exists: false }, eventAt: { $exists: true }, endAt: { $exists: false }, autoDeleteAt: { $lte: now } },
            ],
        }, {
            $set: { published: false, expiredAt: now },
        });
        return res.json({ hidden: result.modifiedCount, checkedAt: now.toISOString() });
    } catch (error) {
        return next(error);
    }
});

const prayerFields = ['morning', 'third', 'sixth', 'ninth', 'sleep'];
const validPrayerDate = (value) => typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const parsePrayerChecks = (checks) => {
    if (!checks || typeof checks !== 'object' || Array.isArray(checks)) return null;
    const values = {};
    for (const field of prayerFields) {
        if (typeof checks[field] !== 'boolean') return null;
        values[field] = checks[field];
    }
    return values;
};

const hideQuizAnswers = (quiz) => ({
    id: String(quiz._id),
    title: quiz.title,
    description: quiz.description || '',
    questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })),
    createdAt: quiz.createdAt,
});

const imageMimeFromBuffer = (buffer) => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) return 'image/gif';
    return null;
};

const supportedMediaFromBuffer = (buffer) => {
    const imageType = imageMimeFromBuffer(buffer);
    if (imageType) return imageType;
    if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
    return null;
};

const mediaExtensions = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['application/pdf', 'pdf'],
]);
const sanitizeMediaFilename = (value, contentType) => {
    const extension = mediaExtensions.get(contentType);
    const input = String(value || 'church-file').split(/[\\/]/).pop();
    const stem = input.replace(/\.[a-z\d]{1,8}$/i, '')
        .replace(/[^a-z\d_.-]+/gi, '-')
        .replace(/^\.+|\.+$/g, '')
        .slice(0, 100) || 'church-file';
    return `${stem}.${extension}`;
};
const validBlobUrlForAsset = (value, asset) => {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:'
            && !parsed.username
            && !parsed.password
            && !parsed.port
            && parsed.hostname.endsWith('.public.blob.vercel-storage.com')
            && parsed.pathname === `/${asset.blobPath}`
            && !parsed.search
            && !parsed.hash;
    } catch {
        return false;
    }
};
const readBlobSignature = async (url) => {
    const response = await fetch(url, {
        headers: { Range: 'bytes=0-31' },
        redirect: 'error',
    });
    if (response.status !== 206 || !/^bytes 0-\d+\/\d+$/i.test(response.headers.get('content-range') || '')) {
        await response.body?.cancel();
        return null;
    }
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks = [];
    let size = 0;
    try {
        while (size < 32) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = Buffer.from(value).subarray(0, 32 - size);
            chunks.push(chunk);
            size += chunk.length;
        }
    } finally {
        await reader.cancel().catch(() => {});
    }
    return supportedMediaFromBuffer(Buffer.concat(chunks));
};

const dateKeyFor = (date) => cairoDay(date);
const dateFromKey = (key) => new Date(`${key}T00:00:00.000Z`);

const taskCompletionFor = (task, studentId) => (task.completions || []).find(
    (completion) => String(completion.student?._id || completion.student) === String(studentId),
);

const validMediaUrl = async (value, req) => {
    if (typeof value !== 'string' || !value.trim()) return true;
    try {
        const origin = requestOrigin(req);
        if (!origin) return false;
        const parsed = new URL(value.trim(), origin);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        if (parsed.protocol === 'https:' && parsed.origin !== origin) return true;
        if (parsed.origin !== origin) return false;
        const assetId = parsed.pathname.match(/(?:^|\/)media\/([a-f\d]{24})\/?$/i)?.[1] || null;
        return Boolean(assetId && await PhotoAsset.exists({ _id: assetId, owner: req.user._id, pending: { $ne: true } }));
    } catch {
        return false;
    }
};

router.post('/media/upload-session', auth, adminOnly, mediaUploadRateLimit, async (req, res, next) => {
    const contentType = String(req.body?.contentType || '').trim().toLowerCase();
    if (!mediaExtensions.has(contentType)) {
        return res.status(422).json({ message: 'Choose a JPEG, PNG, WebP, GIF, or PDF file.' });
    }

    const validUntil = Date.now() + 10 * 60_000;
    const id = new mongoose.Types.ObjectId();
    const filename = sanitizeMediaFilename(req.body?.filename, contentType);
    const blobPath = `ministry/${id}/${filename}`;
    const asset = new PhotoAsset({
        _id: id,
        filename,
        contentType,
        owner: req.user._id,
        blobPath,
        pending: true,
        uploadExpiresAt: new Date(validUntil),
    });

    try {
        const token = await issueSignedToken({
            pathname: blobPath,
            operations: ['put'],
            allowedContentTypes: [contentType],
            validUntil,
        });
        const { presignedUrl } = await presignUrl(token, {
            operation: 'put',
            pathname: blobPath,
            access: 'public',
            allowedContentTypes: [contentType],
            validUntil,
            addRandomSuffix: false,
            allowOverwrite: false,
            cacheControlMaxAge: 2_592_000,
        });
        await asset.save();
        return res.status(201).json({
            data: {
                id: String(asset._id),
                pathname: blobPath,
                uploadUrl: presignedUrl,
                contentType,
                filename,
                validUntil: new Date(validUntil).toISOString(),
            },
        });
    } catch (error) {
        await PhotoAsset.deleteOne({ _id: id, owner: req.user._id }).catch(() => {});
        if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
            return res.status(503).json({ message: 'Connect a Vercel Blob store to enable file uploads.' });
        }
        return next(error);
    }
});

router.post('/media/:id/presigned', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Upload session not found.' });
        const asset = await PhotoAsset.findOne({
            _id: req.params.id,
            owner: req.user._id,
            pending: true,
            uploadExpiresAt: { $gt: new Date() },
        });
        if (!asset) return res.status(404).json({ message: 'Upload session expired. Choose the file again.' });

        const response = await handleUploadPresigned({
            body: req.body,
            request: req,
            getSignedToken: async (pathname, clientPayload) => {
                if (pathname !== asset.blobPath || clientPayload !== String(asset._id)) {
                    throw new Error('Upload session does not match this file.');
                }
                const validUntil = asset.uploadExpiresAt.getTime();
                const token = await issueSignedToken({
                    pathname: asset.blobPath,
                    operations: ['put'],
                    allowedContentTypes: [asset.contentType],
                    validUntil,
                });
                return {
                    token,
                    urlOptions: {
                        allowedContentTypes: [asset.contentType],
                        validUntil,
                        addRandomSuffix: false,
                        allowOverwrite: false,
                        cacheControlMaxAge: 2_592_000,
                    },
                };
            },
        });
        return res.json(response);
    } catch (error) {
        return next(error);
    }
});

router.post('/media/:id/complete', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Upload session not found.' });
        const asset = await PhotoAsset.findOne({ _id: req.params.id, owner: req.user._id, pending: true });
        if (!asset) return res.status(404).json({ message: 'Upload session not found or already completed.' });
        if (!asset.uploadExpiresAt || asset.uploadExpiresAt <= new Date()) {
            return res.status(410).json({ message: 'Upload session expired. Choose the file again.' });
        }

        const blobUrl = typeof req.body?.blobUrl === 'string' ? req.body.blobUrl.trim() : '';
        if (!validBlobUrlForAsset(blobUrl, asset)) {
            return res.status(422).json({ message: 'The uploaded file could not be verified.' });
        }

        const blob = await headBlob(blobUrl);
        if (!blob.size || blob.contentType !== asset.contentType || blob.pathname !== asset.blobPath) {
            await deleteBlob(blobUrl).catch(() => {});
            return res.status(422).json({ message: 'The uploaded file type could not be verified.' });
        }
        const signatureType = await readBlobSignature(blobUrl);
        if (signatureType !== asset.contentType) {
            await deleteBlob(blobUrl).catch(() => {});
            return res.status(422).json({ message: 'The uploaded file is not a valid supported image or PDF.' });
        }

        asset.blobUrl = blobUrl;
        asset.byteSize = blob.size;
        asset.pending = false;
        asset.uploadExpiresAt = undefined;
        await asset.save();

        const url = mediaAssetUrl(req, String(asset._id));
        if (!url) return res.status(400).json({ message: 'The upload URL could not be created securely.' });
        return res.status(201).json({
            data: {
                id: String(asset._id),
                url,
                contentType: asset.contentType,
                filename: asset.filename,
                size: blob.size,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/media', auth, adminOnly, mediaUploadRateLimit, (req, res, next) => receiveMediaUpload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Choose a file smaller than 5 MB.' });
    return res.status(422).json({ message: 'Upload exactly one supported image or PDF file.' });
}), async (req, res, next) => {
    try {
        const file = req.file;
        let data = file?.buffer;
        let filenameInput = file?.originalname;
        if (!file && typeof req.body?.data === 'string') {
            const encoded = req.body.data;
            if (encoded.length > 7_000_000 || !/^[a-z\d+/]*={0,2}$/i.test(encoded)) {
                return res.status(422).json({ message: 'Supported files are JPEG, PNG, WebP, GIF, and PDF.' });
            }
            data = Buffer.from(encoded, 'base64');
            filenameInput = req.body.filename;
            if (data.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
                return res.status(422).json({ message: 'Choose a valid image or PDF file smaller than 5 MB.' });
            }
        }
        if (!data?.length || data.length > 5 * 1024 * 1024) {
            return res.status(422).json({ message: 'Choose a valid image or PDF file smaller than 5 MB.' });
        }
        const contentType = supportedMediaFromBuffer(data);
        if (!contentType) {
            return res.status(422).json({ message: 'صيغة الصورة غير مدعومة. استخدم JPEG أو PNG أو WebP أو GIF.' });
        }
        const filename = String(filenameInput || 'church-file')
            .split(/[\\/]/).pop()
            .replace(/[^a-z\d_.-]+/gi, '-')
            .replace(/^\.+|\.+$/g, '')
            .slice(0, 120) || 'church-file';
        const asset = await PhotoAsset.create({ data, contentType, filename, owner: req.user._id });
        const id = String(asset._id);
        const url = mediaAssetUrl(req, id);
        if (!url) return res.status(400).json({ message: 'The upload URL could not be created securely.' });
        return res.status(201).json({ data: { id, url, contentType, filename } });
    } catch (error) {
        return next(error);
    }
});

router.get('/media/:id', async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'الصورة غير موجودة.' });
        const asset = await PhotoAsset.findById(req.params.id).select('+data');
        if (!asset || asset.pending) return res.status(404).json({ message: 'Media not found.' });
        if (asset.blobUrl) {
            const target = new URL(asset.blobUrl);
            if (req.query.download === '1') target.searchParams.set('download', '1');
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            return res.redirect(302, target.toString());
        }
        if (!asset.data) return res.status(404).json({ message: 'Media not found.' });
        if (!asset) return res.status(404).json({ message: 'الصورة غير موجودة.' });
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' }[asset.contentType] || 'bin';
        const safeFilename = /\.[a-z\d]{1,8}$/i.test(asset.filename) ? asset.filename : `${asset.filename}.${extension}`;
        res.set({
            'Content-Type': asset.contentType,
            'Content-Length': asset.data.length,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${safeFilename}"`,
        });
        return res.send(asset.data);
    } catch (error) {
        return next(error);
    }
});

router.get('/featured-verse', async (req, res, next) => {
    try {
        const verse = await FeaturedVerse.findOne({ key: 'global' })
            .select('text reference updatedAt')
            .lean();
        return res.json({ data: verse });
    } catch (error) {
        return next(error);
    }
});

router.get('/daily-reading', async (req, res, next) => {
    try {
        const reading = await DailyReading.findOne({ key: 'global' })
            .select('bookId bookName chapter startVerse endVerse reference text updatedAt')
            .lean();
        return res.json({ data: reading });
    } catch (error) {
        return next(error);
    }
});

router.put('/daily-reading', auth, adminOnly, async (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Only the public administrator can edit the shared daily reading.' });
    try {
        const bookId = typeof req.body?.bookId === 'string' ? req.body.bookId.trim() : '';
        const bookName = typeof req.body?.bookName === 'string' ? req.body.bookName.trim() : '';
        const chapter = Number(req.body?.chapter);
        const startVerse = Number(req.body?.startVerse);
        const endVerse = Number(req.body?.endVerse);
        const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
        const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
        if (!/^[A-Za-z0-9]{1,12}$/.test(bookId)
            || !bookName || bookName.length > 100
            || !Number.isInteger(chapter) || chapter < 1 || chapter > 200
            || !Number.isInteger(startVerse) || startVerse < 1 || startVerse > 300
            || !Number.isInteger(endVerse) || endVerse < startVerse || endVerse > 300
            || !reference || reference.length > 200
            || !text || text.length > 20000) {
            return res.status(422).json({ message: 'تحقق من السفر والإصحاح ونطاق الآيات ونص القراءة.' });
        }

        const reading = await DailyReading.findOneAndUpdate(
            { key: 'global' },
            { $set: { bookId, bookName, chapter, startVerse, endVerse, reference, text, updatedBy: req.user._id } },
            { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
        ).select('bookId bookName chapter startVerse endVerse reference text updatedAt').lean();
        return res.json({ message: 'تم تحديث القراءة اليومية.', data: reading });
    } catch (error) {
        return next(error);
    }
});

router.put('/featured-verse', auth, adminOnly, async (req, res, next) => {
    if (!isGlobalAdmin(req.user)) return res.status(403).json({ message: 'Only the public administrator can edit the shared featured verse.' });
    try {
        const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
        const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
        const requestIdInput = typeof req.body?.requestId === 'string' ? req.body.requestId.trim() : '';
        const requestId = requestIdInput || crypto.randomUUID();
        if (!text || text.length > 1200 || !reference || reference.length > 160) {
            return res.status(422).json({ message: 'Enter a verse (up to 1200 characters) and its reference (up to 160 characters).' });
        }
        if (requestIdInput && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
            return res.status(422).json({ message: 'A valid update request ID is required.' });
        }

        await VerseUpdateEvent.init();
        const priorEvent = await VerseUpdateEvent.findOne({ requestId }).lean();
        if (priorEvent) {
            if (priorEvent.text !== text || priorEvent.reference !== reference) {
                return res.status(409).json({ message: 'This update request ID was already used for different content.' });
            }
            return res.json({ message: 'The featured verse was already updated.', data: {
                text: priorEvent.text,
                reference: priorEvent.reference,
                updatedAt: priorEvent.updatedAt,
            } });
        }

        const session = await mongoose.startSession();
        let savedVerse;
        let verseChanged = false;
        try {
            await session.withTransaction(async () => {
                const current = await FeaturedVerse.findOne({ key: 'global' }).session(session).lean();
                if (current?.text === text && current?.reference === reference) {
                    savedVerse = { text: current.text, reference: current.reference, updatedAt: current.updatedAt };
                    await VerseUpdateEvent.create([{
                        requestId,
                        title: 'The featured ayah was updated',
                        text: current.text,
                        reference: current.reference,
                        deepLink: 'eltorcoptic://featured-verse',
                        updatedAt: current.updatedAt,
                        notify: false,
                    }], { session });
                    return;
                }
                const verse = await FeaturedVerse.findOneAndUpdate(
                    { key: 'global' },
                    { $set: { text, reference, updatedBy: req.user._id } },
                    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true, session },
                ).select('text reference updatedAt').lean();
                verseChanged = true;
                await VerseUpdateEvent.create([{
                    requestId,
                    title: 'The featured ayah was updated',
                    text: verse.text,
                    reference: verse.reference,
                    deepLink: 'eltorcoptic://featured-verse',
                    updatedAt: verse.updatedAt,
                }], { session });
                savedVerse = verse;
            });
        } catch (error) {
            if (error?.code === 11000) {
                const existing = await VerseUpdateEvent.findOne({ requestId }).lean();
                if (existing?.text === text && existing?.reference === reference) {
                    return res.json({ message: 'The featured verse was already updated.', data: {
                        text: existing.text,
                        reference: existing.reference,
                        updatedAt: existing.updatedAt,
                    } });
                }
            }
            throw error;
        } finally {
            await session.endSession();
        }
        if (verseChanged) {
            try {
                await sendFeaturedVerseUpdate(savedVerse);
            } catch (pushError) {
                console.error('Featured ayah push delivery failed:', pushError.message);
            }
        }
        return res.json({ message: 'The featured verse was updated.', data: savedVerse });
    } catch (error) {
        return next(error);
    }
});

router.get('/notifications', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('notificationPreferences').lean();
        if (user?.notificationPreferences?.verseUpdates === false) return res.json({ data: [] });
        const events = await VerseUpdateEvent.find()
            .where({ notify: true })
            .select('title text reference deepLink updatedAt createdAt')
            .sort({ createdAt: -1, _id: -1 })
            .limit(50)
            .lean();
        return res.json({ data: events });
    } catch (error) {
        return next(error);
    }
});

router.get('/notification-preferences', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('notificationPreferences').lean();
        return res.json({ data: { verseUpdates: user?.notificationPreferences?.verseUpdates !== false } });
    } catch (error) {
        return next(error);
    }
});

router.patch('/notification-preferences', auth, async (req, res, next) => {
    if (typeof req.body?.verseUpdates !== 'boolean') {
        return res.status(422).json({ message: 'Choose whether to receive featured ayah updates.' });
    }
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { 'notificationPreferences.verseUpdates': req.body.verseUpdates } },
            { returnDocument: 'after', runValidators: true },
        ).select('notificationPreferences').lean();
        return res.json({ data: { verseUpdates: user?.notificationPreferences?.verseUpdates !== false } });
    } catch (error) {
        return next(error);
    }
});

router.post('/push-token', auth, async (req, res, next) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (token.length < 20 || token.length > 4096) {
        return res.status(422).json({ message: 'A valid phone notification token is required.' });
    }
    try {
        await User.updateMany({ pushTokens: token }, { $pull: { pushTokens: token } });
        await User.updateOne({ _id: req.user._id }, { $addToSet: { pushTokens: token } });
        return res.json({ message: 'Phone notifications are enabled for this device.' });
    } catch (error) {
        return next(error);
    }
});

router.delete('/push-token', auth, async (req, res, next) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token || token.length > 4096) {
        return res.status(422).json({ message: 'A valid phone notification token is required.' });
    }
    try {
        await User.updateMany({ pushTokens: token }, { $pull: { pushTokens: token } });
        return res.json({ message: 'Phone notifications were disabled for this device.' });
    } catch (error) {
        return next(error);
    }
});

router.post('/push-fid', auth, async (req, res, next) => {
    const fid = typeof req.body?.fid === 'string' ? req.body.fid.trim() : '';
    if (fid.length < 20 || fid.length > 4096) {
        return res.status(422).json({ message: 'A valid phone notification installation ID is required.' });
    }
    try {
        await User.updateMany({ pushFids: fid }, { $pull: { pushFids: fid } });
        await User.updateOne({ _id: req.user._id }, { $addToSet: { pushFids: fid } });
        return res.json({ message: 'Phone notifications are enabled for this device.' });
    } catch (error) {
        return next(error);
    }
});

router.delete('/push-fid', auth, async (req, res, next) => {
    const fid = typeof req.body?.fid === 'string' ? req.body.fid.trim() : '';
    if (!fid || fid.length > 4096) {
        return res.status(422).json({ message: 'A valid phone notification installation ID is required.' });
    }
    try {
        await User.updateMany({ pushFids: fid }, { $pull: { pushFids: fid } });
        return res.json({ message: 'Phone notifications were disabled for this device.' });
    } catch (error) {
        return next(error);
    }
});

router.get('/students', auth, adminOnly, async (req, res, next) => {
    try {
        const students = await User.find(studentScope(req.user))
            .populate('meetingGroup', 'name')
            .select('+nationalId')
            .sort({ name: 1 })
            .limit(500)
            .lean();
        return res.json({ data: students.map((student) => sanitizeUser(student, { includeNationalId: true })) });
    } catch (error) {
        return next(error);
    }
});

router.get('/students/unassigned', auth, adminOnly, async (req, res, next) => {
    try {
        const students = await User.find({ ...pendingStudentScope(req.user), assignedAdmin: null })
            .populate('meetingGroup', 'name')
            .select('+nationalId')
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return res.json({ data: students.map((student) => sanitizeUser(student, { includeNationalId: true })) });
    } catch (error) {
        return next(error);
    }
});

router.post('/students/:id/reject', auth, adminOnly, async (req, res, next) => {
    let session;
    let deletedStudentId = '';
    try {
        session = await mongoose.startSession();
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Student not found.' });
        await session.withTransaction(async () => {
            const student = await User.findOne({
                _id: req.params.id,
                ...pendingStudentScope(req.user),
                assignedAdmin: null,
            }).select('_id').session(session);
            if (!student) return;

            const userId = student._id;
            await Attendance.deleteMany({ student: userId }, { session });
            await Confession.deleteMany({ student: userId }, { session });
            await Task.deleteMany({ student: userId }, { session });
            await Task.updateMany({ assignToGroup: true }, { $pull: { completions: { student: userId } } }, { session });
            await PrayerChecklist.deleteMany({ student: userId }, { session });
            await QuizAttempt.deleteMany({ student: userId }, { session });
            await TripRegistration.deleteMany({ student: userId }, { session });
            await MinistryPost.updateMany({ assignedStudents: userId }, { $pull: { assignedStudents: userId } }, { session });
            await User.updateMany({ parentApprovedStudentIds: userId }, { $pull: { parentApprovedStudentIds: userId } }, { session });
            await User.deleteOne({ _id: userId }, { session });
            deletedStudentId = String(userId);
        });
        if (!deletedStudentId) {
            return res.status(409).json({ message: 'This student is already assigned, rejected, or outside your management scope.' });
        }
        return res.json({ message: 'Student registration rejected and the account with its personal records was deleted.', id: deletedStudentId });
    } catch (error) {
        return next(error);
    } finally {
        if (session) await session.endSession();
    }
});

router.patch('/students/:id', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Student not found.' });
        const student = await User.findOne({ _id: req.params.id, ...studentScope(req.user) }).select('+nationalId');
        if (!student) return res.status(404).json({ message: 'Student not found.' });

        const editable = [
            'name', 'phone', 'interests', 'fatherName', 'confessionFather', 'guardianPhone', 'address',
            'birthDate', 'gender', 'nationalId', 'isDeacon', 'whatsappNumber',
        ];
        for (const key of editable) {
            if (req.body?.[key] !== undefined) student[key] = req.body[key];
        }
        if (req.body?.grade !== undefined || req.body?.meetingGroup !== undefined) {
            const grade = req.body.grade === undefined ? student.grade : String(req.body.grade || '');
            const groupId = req.body.meetingGroup === undefined ? String(student.meetingGroup || '') : String(req.body.meetingGroup || '');
            const scopeChanged = grade !== student.grade || groupId !== String(student.meetingGroup || '');
            if (!gradeIds.has(grade)) return res.status(422).json({ message: 'Choose a valid study grade.' });
            if (isGradeAdminRole(req.user.role) && grade !== req.user.grade) {
                return res.status(403).json({ message: 'You can only assign students within your grade.' });
            }
            if (groupId) {
                if (!objectId(groupId)) return res.status(422).json({ message: 'Choose a valid meeting group.' });
                const group = await MeetingGroup.findOne({ _id: groupId, grade, isActive: true }).select('_id').lean();
                if (!group) return res.status(422).json({ message: 'The meeting group must belong to the selected grade.' });
                if (isGradeAdminRole(req.user.role) && req.user.meetingGroup && String(group._id) !== String(req.user.meetingGroup)) {
                    return res.status(403).json({ message: 'You can only assign students to your meeting group.' });
                }
                student.meetingGroup = group._id;
            } else {
                if (await MeetingGroup.exists({ grade, isActive: true })) {
                    return res.status(422).json({ message: 'Choose an active meeting group for this grade.' });
                }
                if (isGradeAdminRole(req.user.role) && req.user.meetingGroup) {
                    return res.status(403).json({ message: 'You cannot remove a student from your assigned meeting group.' });
                }
                student.meetingGroup = null;
            }
            student.grade = grade;
            if (scopeChanged) {
                const gradeAdmins = await User.find({ role: { $in: gradeAdminRoles }, grade, isActive: true })
                    .select('_id meetingGroup')
                    .lean();
                student.assignedAdmin = gradeAdmins.find((admin) => String(admin.meetingGroup || '') === groupId)?._id
                    || gradeAdmins.find((admin) => !admin.meetingGroup)?._id
                    || null;
            }
        }
        const email = req.body?.email === undefined
            ? undefined
            : typeof req.body.email === 'string'
                ? req.body.email.trim().toLowerCase()
                : req.body.email == null ? '' : String(req.body.email).trim().toLowerCase();
        if (email !== undefined && !validEmail(email)) {
            return res.status(422).json({ message: 'Email must be a valid address without spaces.' });
        }
        if (email !== undefined) student.email = email || undefined;
        if (req.body?.interests !== undefined) {
            student.interests = String(req.body.interests || '').trim();
            if (student.interests.length > 500) return res.status(422).json({ message: 'Interests must be 500 characters or fewer.' });
        }
        for (const field of ['phone', 'guardianPhone', 'whatsappNumber']) {
            if (req.body?.[field] && !validPhone(normalizePhone(req.body[field]))) {
                return res.status(422).json({ message: `${field} must use international phone format.` });
            }
            if (req.body?.[field]) student[field] = normalizePhone(req.body[field]);
        }
        if (req.body?.nationalId !== undefined && !/^\d{14}$/.test(String(req.body.nationalId))) {
            return res.status(422).json({ message: 'National ID must contain 14 digits.' });
        }
        if (req.body?.name !== undefined) {
            if (!hasFourPartName(req.body.name)) {
                return res.status(422).json({ message: 'Please enter the student full four-part name.' });
            }
            student.name = req.body.name.trim().replace(/\s+/g, ' ');
            student.username = student.name.toLowerCase();
        }
        if (req.body?.password !== undefined) {
            if (typeof req.body.password !== 'string' || req.body.password.length < 8 || req.body.password.length > 256) {
                return res.status(422).json({ message: 'Password must contain between 8 and 256 characters.' });
            }
            const { hashPassword } = require('../utils/passwords');
            student.password = await hashPassword(req.body.password);
        }
        await student.save();
        return res.json({ message: 'Student profile updated.', user: sanitizeUser(student) });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'Email, phone, or login name is already in use.' });
        return next(error);
    }
});

router.post('/students/:id/assign', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Student not found.' });
        const student = await User.findOne({
            _id: req.params.id,
            ...pendingStudentScope(req.user),
            assignedAdmin: null,
        });
        if (!student) return res.status(409).json({ message: 'This student is already assigned or outside your management scope.' });
        const grade = String(student.grade || '');
        if (!gradeIds.has(grade)) return res.status(422).json({ message: 'The student needs a valid study stage before assignment.' });

        let groupId = String(req.body?.meetingGroup || '').trim();
        if (!groupId && isGradeAdminRole(req.user.role) && req.user.meetingGroup) {
            groupId = String(req.user.meetingGroup);
        }
        let meetingGroup = null;
        if (groupId) {
            if (!objectId(groupId)) return res.status(422).json({ message: 'Choose a valid meeting group.' });
            meetingGroup = await MeetingGroup.findOne({ _id: groupId, grade, isActive: true }).select('_id').lean();
            if (!meetingGroup) return res.status(422).json({ message: 'Choose an active meeting group for the student stage.' });
            if (isGradeAdminRole(req.user.role) && req.user.meetingGroup
                && String(meetingGroup._id) !== String(req.user.meetingGroup)) {
                return res.status(403).json({ message: 'You can only assign students to your meeting group.' });
            }
        } else if (!isGlobalAdmin(req.user) && await MeetingGroup.exists({ grade, isActive: true })) {
            return res.status(422).json({ message: 'Choose an active meeting group before accepting this student.' });
        }

        student.meetingGroup = meetingGroup?._id || null;
        student.assignedAdmin = req.user._id;
        await student.save();
        return res.json({
            message: meetingGroup ? 'Student accepted into the selected group.' : 'Student registration accepted.',
            user: sanitizeUser(student),
        });
    } catch (error) {
        return next(error);
    }
});

router.get('/parents/pending', auth, adminOnly, async (req, res, next) => {
    try {
        const students = await User.find(studentScope(req.user))
            .select('name guardianPhone parentApprovedStudentIds')
            .lean();
        const phoneNumbers = [...new Set(students.map((student) => student.guardianPhone).filter(Boolean))];
        if (!phoneNumbers.length) return res.json({ data: [] });
        const parents = await User.find({ role: 'parent', phone: { $in: phoneNumbers } })
            .select('name phone parentApprovedStudentIds')
            .sort({ createdAt: 1 })
            .limit(500)
            .lean();
        const parentsByPhone = new Map(parents.map((parent) => [parent.phone, parent]));
        const data = students.flatMap((student) => {
            const parent = parentsByPhone.get(student.guardianPhone);
            if (!parent || (parent.parentApprovedStudentIds || []).some((id) => String(id) === String(student._id))) return [];
            return [{
                parentId: String(parent._id),
                parentName: parent.name,
                parentPhone: parent.phone,
                studentId: String(student._id),
                studentName: student.name,
            }];
        });
        return res.json({ data });
    } catch (error) {
        return next(error);
    }
});

router.post('/parents/:id/approve', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id) || !objectId(req.body?.studentId)) {
            return res.status(404).json({ message: 'Parent approval request not found.' });
        }
        const parent = await User.findOne({ _id: req.params.id, role: 'parent' });
        if (!parent) return res.status(404).json({ message: 'Parent approval request not found.' });
        const student = await User.findOne({
            _id: req.body.studentId,
            role: 'student',
            guardianPhone: parent.phone,
            ...adminScope(req.user),
        }).select('_id');
        if (!student) return res.status(404).json({ message: 'The student is not in your group or the guardian phone does not match.' });
        parent.parentApprovedStudentIds.addToSet(student._id);
        await parent.save();
        return res.json({ message: 'Parent access approved for this student.' });
    } catch (error) {
        return next(error);
    }
});

router.get('/ministry/posts', auth, async (req, res, next) => {
    try {
        const type = req.query.type;
        if (type && !postTypes.has(type)) return res.status(422).json({ message: 'Unknown ministry content type.' });
        const includeUnpublished = req.query.includeUnpublished === '1';
        if (req.query.includeUnpublished !== undefined && !includeUnpublished) {
            return res.status(422).json({ message: 'The unpublished filter must be 1.' });
        }
        if (includeUnpublished && (!isAdmin(req.user) || type !== 'liturgy')) {
            return res.status(403).json({ message: 'Only admins can view archived liturgies.' });
        }
        const upcomingOnly = req.query.upcoming === '1';
        if (req.query.upcoming !== undefined && !upcomingOnly) {
            return res.status(422).json({ message: 'The upcoming filter must be 1.' });
        }
        if (upcomingOnly && type !== 'liturgy') {
            return res.status(422).json({ message: 'Upcoming filtering is only available for liturgies.' });
        }
        const paginationRequested = req.query.page !== undefined || req.query.limit !== undefined || upcomingOnly;
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 18);
        if (paginationRequested && (!Number.isInteger(page) || page < 1 || page > 1000
            || !Number.isInteger(limit) || limit < 1 || limit > 30)) {
            return res.status(422).json({ message: 'Page must be 1–1000 and limit must be 1–30.' });
        }
        const filter = { published: true };
        if (type) filter.type = type;
        if (upcomingOnly) {
            const now = new Date();
            filter.$and = [{
                $or: [
                    { liturgyType: 'permanent' },
                    { liturgyType: { $exists: false }, eventAt: { $exists: false } },
                    { liturgyType: 'temporary', eventAt: { $gte: now } },
                    { liturgyType: { $exists: false }, eventAt: { $gte: now } },
                ],
            }];
        }
        if (isAdmin(req.user)) {
            if (type === 'trip') delete filter.published;
            if (type === 'liturgy' && includeUnpublished) delete filter.published;
            if (isGlobalAdmin(req.user)) {
                if (req.query.grade !== undefined) {
                    const grade = String(req.query.grade || '');
                    if (grade && !gradeIds.has(grade)) return res.status(422).json({ message: 'Choose a valid grade.' });
                    filter.grade = grade || null;
                }
                if (req.query.meetingGroup) {
                    if (!objectId(req.query.meetingGroup)) return res.status(422).json({ message: 'Choose a valid meeting group.' });
                    filter.meetingGroup = req.query.meetingGroup;
                }
            } else {
                applyAdminScope(filter, req.user);
            }
        } else {
            const students = req.user.role === 'parent'
                ? await getChildren(req.user).select('_id grade meetingGroup').lean()
                : [req.user];
            const studentIds = students.map((student) => student._id);
            if (type === 'trip') {
                filter.$and ||= [];
                filter.$and.push({
                    $or: [
                        { $and: [{ assignToGroup: { $ne: false } }, audienceForStudents(students)] },
                        { assignedStudents: { $in: studentIds } },
                    ],
                });
            } else {
                filter.$and ||= [];
                filter.$and.push(audienceForStudents(students));
            }
        }
        if (type === 'liturgy' && !includeUnpublished) {
            filter.$and ||= [];
            filter.$and.push({
                $or: [
                    { liturgyType: 'permanent' },
                    { liturgyType: { $exists: false }, eventAt: { $exists: false } },
                    { liturgyType: 'temporary', endAt: { $gt: new Date() } },
                    { liturgyType: 'temporary', endAt: { $exists: false }, autoDeleteAt: { $gt: new Date() } },
                    { liturgyType: { $exists: false }, eventAt: { $exists: true }, endAt: { $gt: new Date() } },
                    { liturgyType: { $exists: false }, eventAt: { $exists: true }, endAt: { $exists: false }, autoDeleteAt: { $gt: new Date() } },
                ],
            });
        }
        let postsQuery = MinistryPost.find(filter).sort(upcomingOnly
            ? { eventAt: 1, _id: 1 }
            : { createdAt: -1, _id: -1 });
        if (upcomingOnly) {
            postsQuery = postsQuery.limit(200);
        } else if (paginationRequested) {
            postsQuery = postsQuery.skip((page - 1) * limit).limit(limit + 1);
        } else if (!(isAdmin(req.user) && type === 'trip')) {
            postsQuery = postsQuery.limit(200);
        }
        const results = await postsQuery.lean();
        const normalizedResults = type === 'liturgy' ? results.map((post) => {
            const isPermanent = post.liturgyType === 'permanent' || (!post.liturgyType && !post.eventAt);
            return isPermanent ? { ...post, dayOfWeek: post.dayOfWeek || 'friday' } : post;
        }) : results;
        if (!paginationRequested) return res.json({ data: normalizedResults });

        const orderedResults = upcomingOnly
            ? normalizedResults.sort((a, b) => nextLiturgyOffsetMinutes(a, new Date()) - nextLiturgyOffsetMinutes(b, new Date()))
            : normalizedResults;
        const startIndex = upcomingOnly ? (page - 1) * limit : 0;
        const hasMore = orderedResults.length > startIndex + limit;
        return res.json({
            data: orderedResults.slice(startIndex, startIndex + limit),
            pagination: { page, limit, hasMore },
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/ministry/posts', auth, adminOnly, async (req, res, next) => {
    try {
        const { type, title, body, mediaUrl, mediaKind = 'image', eventAt, published } = req.body || {};
        if (!postTypes.has(type) || typeof title !== 'string' || !title.trim()) {
            return res.status(422).json({ message: 'A supported content type and title are required.' });
        }
        if (!await validMediaUrl(mediaUrl, req)) {
            return res.status(422).json({ message: 'Media URL must use HTTPS.' });
        }
        if (!['image', 'pdf', 'link'].includes(mediaKind)) {
            return res.status(422).json({ message: 'Media type must be image, PDF, or link.' });
        }
        const audience = await validAudience(req.user, req.body || {});
        if (audience.error) return res.status(422).json({ message: audience.error });
        const liturgySchedule = type === 'liturgy' ? readLiturgySchedule(req.body || {}) : null;
        if (liturgySchedule?.error) return res.status(422).json({ message: liturgySchedule.error });
        const feeAmount = type === 'trip' ? Number(req.body?.feeAmount ?? 0) : 0;
        if (!Number.isFinite(feeAmount) || feeAmount < 0 || feeAmount > 1000000) {
            return res.status(422).json({ message: 'Trip fee must be a non-negative amount.' });
        }
        const assignToGroup = req.body?.assignToGroup !== false;
        const assignedStudents = Array.isArray(req.body?.studentIds)
            ? [...new Set(req.body.studentIds.map(String))]
            : [];
        if (type === 'trip' && !assignToGroup && (!assignedStudents.length || assignedStudents.length > 200)) {
            return res.status(422).json({ message: 'Select 1 to 200 students or assign the trip to the group.' });
        }
        if (type === 'trip') {
            if (assignedStudents.some((id) => !objectId(id))) {
                return res.status(422).json({ message: 'Every studentId must be valid.' });
            }
            if (assignedStudents.length) {
                const targetedStudents = await User.find({ _id: { $in: assignedStudents }, ...studentScope(req.user) })
                    .select('_id grade meetingGroup').lean();
                if (targetedStudents.length !== assignedStudents.length) {
                    return res.status(422).json({ message: 'Every selected account must be a student.' });
                }
                if (audience.grade && targetedStudents.some((student) => student.grade !== audience.grade
                    || (audience.meetingGroup && String(student.meetingGroup || '') !== String(audience.meetingGroup)))) {
                    return res.status(422).json({ message: 'Selected students must belong to the trip grade and meeting group.' });
                }
            }
        }
        const post = await MinistryPost.create({
            type,
            title: title.trim(),
            body: typeof body === 'string' ? body : '',
            mediaUrl: typeof mediaUrl === 'string' ? mediaUrl.trim() : '',
            mediaKind,
            audienceMode: audience.grade ? 'grade' : 'shared',
            grade: audience.grade,
            meetingGroup: audience.meetingGroup,
            eventAt: type === 'liturgy' ? liturgySchedule.eventAt : (eventAt || undefined),
            ...(type === 'liturgy' ? liturgySchedule : {}),
            feeAmount,
            assignToGroup: type === 'trip' ? assignToGroup : true,
            assignedStudents: type === 'trip' && !assignToGroup ? assignedStudents : [],
            published: published !== false,
            admin: req.user._id,
        });
        return res.status(201).json({ message: 'Content created.', data: post });
    } catch (error) {
        return next(error);
    }
});

router.patch('/ministry/posts/:id', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Content not found.' });
        const post = await MinistryPost.findOne({ _id: req.params.id, ...adminScope(req.user) });
        if (!post) return res.status(404).json({ message: 'Content not found.' });
        if (post.type === 'trip' && req.body?.type !== undefined && req.body.type !== 'trip') {
            return res.status(422).json({ message: 'A trip cannot be changed into another content type.' });
        }
        for (const key of ['title', 'body', 'mediaUrl', 'published']) {
            if (req.body?.[key] !== undefined) post[key] = req.body[key];
        }
        if (req.body?.eventAt !== undefined && post.type !== 'liturgy') post.eventAt = req.body.eventAt;
        if (req.body?.mediaKind !== undefined) {
            if (!['image', 'pdf', 'link'].includes(req.body.mediaKind)) {
                return res.status(422).json({ message: 'Media type must be image, PDF, or link.' });
            }
            post.mediaKind = req.body.mediaKind;
        }
        if (req.body?.type !== undefined) {
            if (!postTypes.has(req.body.type)) return res.status(422).json({ message: 'Unknown ministry content type.' });
            post.type = req.body.type;
        }
        if (req.body?.grade !== undefined || req.body?.meetingGroup !== undefined) {
            const audience = await validAudience(req.user, {
                grade: req.body.grade === undefined ? post.grade : req.body.grade,
                meetingGroup: req.body.meetingGroup === undefined ? post.meetingGroup : req.body.meetingGroup,
            });
            if (audience.error) return res.status(422).json({ message: audience.error });
            post.grade = audience.grade;
            post.meetingGroup = audience.meetingGroup;
            post.audienceMode = audience.grade ? 'grade' : 'shared';
        }
        const liturgyScheduleSubmitted = ['liturgyType', 'dayOfWeek', 'startAt', 'endAt', 'autoDeleteAt'].some((key) => req.body?.[key] !== undefined);
        if (post.type === 'liturgy' && (liturgyScheduleSubmitted || req.body?.type === 'liturgy')) {
            const liturgySchedule = readLiturgySchedule(req.body || {}, post);
            if (liturgySchedule.error) return res.status(422).json({ message: liturgySchedule.error });
            Object.assign(post, liturgySchedule);
            post.published = liturgySchedule.liturgyType === 'permanent'
                || liturgySchedule.autoDeleteAt > new Date();
        }
        if (req.body?.feeAmount !== undefined) {
            const feeAmount = Number(req.body.feeAmount);
            if (!Number.isFinite(feeAmount) || feeAmount < 0 || feeAmount > 1000000) {
                return res.status(422).json({ message: 'Trip fee must be a non-negative amount.' });
            }
            post.feeAmount = feeAmount;
        }
        if (post.type === 'trip' && req.body?.assignToGroup !== undefined) {
            if (typeof req.body.assignToGroup !== 'boolean') {
                return res.status(422).json({ message: 'Trip audience selection is invalid.' });
            }
            post.assignToGroup = req.body.assignToGroup;
        }
        if (post.type === 'trip' && req.body?.studentIds !== undefined) {
            if (!Array.isArray(req.body.studentIds) || req.body.studentIds.length > 200) {
                return res.status(422).json({ message: 'Select up to 200 students.' });
            }
            const studentIds = [...new Set(req.body.studentIds.map(String))];
            if (studentIds.some((id) => !objectId(id))) {
                return res.status(422).json({ message: 'Every studentId must be valid.' });
            }
            const studentCount = studentIds.length
                ? await User.countDocuments({ _id: { $in: studentIds }, ...studentScope(req.user) })
                : 0;
            if (studentCount !== studentIds.length) {
                return res.status(422).json({ message: 'Every selected account must be a student.' });
            }
            post.assignedStudents = studentIds;
        }
        if (post.type === 'trip' && post.assignToGroup === false && !post.assignedStudents.length) {
            return res.status(422).json({ message: 'Select at least one student for this trip.' });
        }
        if (post.type === 'trip' && post.grade && post.assignedStudents.length) {
            const matchingTargets = await User.countDocuments({
                _id: { $in: post.assignedStudents },
                role: 'student',
                grade: post.grade,
                ...(post.meetingGroup ? { meetingGroup: post.meetingGroup } : {}),
            });
            if (matchingTargets !== post.assignedStudents.length) {
                return res.status(422).json({ message: 'Selected students must belong to the trip grade and meeting group.' });
            }
        }
        if (req.body?.mediaUrl !== undefined && req.body.mediaUrl !== post.mediaUrl && !await validMediaUrl(req.body.mediaUrl, req)) {
            return res.status(422).json({ message: 'Media URL must use HTTPS.' });
        }
        await post.save();
        return res.json({ message: 'Content updated.', data: post });
    } catch (error) {
        return next(error);
    }
});

router.delete('/ministry/posts/:id', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Content not found.' });
        const post = await MinistryPost.findOneAndDelete({ _id: req.params.id, ...adminScope(req.user) });
        if (!post) return res.status(404).json({ message: 'Content not found.' });
        if (post.type === 'trip') await TripRegistration.deleteMany({ trip: post._id });
        return res.json({ message: 'Content deleted.' });
    } catch (error) {
        return next(error);
    }
});

router.post('/trips/:id/register', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only student accounts can register for trips.' });
        }
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' });
        const trip = await MinistryPost.findOne({ _id: req.params.id, type: 'trip', published: true }).lean();
        const gradeVisible = Boolean(trip && (
            trip.audienceMode === 'shared'
            || (trip.audienceMode === 'grade' && trip.grade === req.user.grade
                && (!trip.meetingGroup || String(trip.meetingGroup) === String(req.user.meetingGroup || '')))
        ));
        const canSeeTrip = Boolean(trip && (
            (trip.assignToGroup !== false && gradeVisible)
            || (trip.assignedStudents || []).some((studentId) => String(studentId) === String(req.user._id))
        ));
        if (!canSeeTrip) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        const existing = await TripRegistration.findOne({ trip: trip._id, student: req.user._id });
        if (existing) return res.json({ message: 'You are already registered for this trip.', data: existing });
        const registration = await TripRegistration.create({
            trip: trip._id,
            student: req.user._id,
            admin: trip.admin || req.user.assignedAdmin || null,
            amountDue: Number(trip.feeAmount) || 0,
            amountPaid: 0,
        });
        return res.status(201).json({ message: 'Trip registration received.', data: registration });
    } catch (error) {
        if (error?.code === 11000) {
            const registration = await TripRegistration.findOne({ trip: req.params.id, student: req.user._id });
            if (registration) return res.json({ message: 'You are already registered for this trip.', data: registration });
        }
        return next(error);
    }
});

router.get('/trip-registrations', auth, async (req, res, next) => {
    try {
        let filter;
        if (isAdmin(req.user)) {
            const tripIds = await MinistryPost.find({ type: 'trip', ...adminScope(req.user) }).distinct('_id');
            filter = isGlobalAdmin(req.user) ? {} : {
                trip: { $in: tripIds },
                student: { $in: await getAccessibleStudentIds(req.user) },
            };
        } else if (req.user.role === 'student') {
            filter = { student: req.user._id };
        } else if (req.user.role === 'parent') {
            const children = await getChildren(req.user).select('_id').lean();
            filter = { student: { $in: children.map((child) => child._id) } };
        } else {
            return res.status(403).json({ message: 'You cannot view trip registrations.' });
        }
        let registrationsQuery = TripRegistration.find(filter)
            .populate('trip', 'title body eventAt feeAmount grade meetingGroup')
            .populate('student', 'name username phone')
            .sort({ createdAt: -1 });
        registrationsQuery = registrationsQuery.limit(1000);
        const registrations = await registrationsQuery.lean();
        return res.json({ data: registrations });
    } catch (error) {
        return next(error);
    }
});

router.patch('/trip-registrations/:id/payment', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Trip registration not found.' });
        const amountPaid = Number(req.body?.amountPaid);
        if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > 1000000) {
            return res.status(422).json({ message: 'Enter a valid payment amount.' });
        }
        const registration = await TripRegistration.findById(req.params.id).populate('trip', 'grade meetingGroup');
        if (!registration || (!isGlobalAdmin(req.user) && (
            registration.trip?.grade !== req.user.grade
            || (req.user.meetingGroup && String(registration.trip?.meetingGroup || '') !== String(req.user.meetingGroup))
        )) || (!isGlobalAdmin(req.user) && !await User.exists({ _id: registration.student, ...studentScope(req.user) }))) {
            return res.status(404).json({ message: 'Trip registration not found.' });
        }
        if (amountPaid > registration.amountDue) {
            return res.status(422).json({ message: 'Paid amount cannot exceed the trip fee.' });
        }
        registration.amountPaid = Math.round(amountPaid * 100) / 100;
        await registration.save();
        return res.json({ message: 'Trip payment updated.', data: registration });
    } catch (error) {
        return next(error);
    }
});

router.delete('/trip-registrations/:id', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Trip registration not found.' });
        const registration = await TripRegistration.findById(req.params.id).populate('trip', 'grade meetingGroup');
        if (!registration || (!isGlobalAdmin(req.user) && (
            registration.trip?.grade !== req.user.grade
            || (req.user.meetingGroup && String(registration.trip?.meetingGroup || '') !== String(req.user.meetingGroup))
        )) || (!isGlobalAdmin(req.user) && !await User.exists({ _id: registration.student, ...studentScope(req.user) }))) {
            return res.status(404).json({ message: 'Trip registration not found.' });
        }
        await registration.deleteOne();
        return res.json({ message: 'Trip registration deleted.' });
    } catch (error) {
        return next(error);
    }
});

router.get('/attendance', auth, async (req, res, next) => {
    try {
        const studentIds = await getAccessibleStudentIds(req.user);
        const filter = { student: { $in: studentIds } };
        const records = await Attendance.find(filter)
            .select('student admin date service status note')
            .populate('student', 'name username fullNameArabic')
            .sort({ date: -1, createdAt: -1 })
            .lean();
        return res.json({ data: records });
    } catch (error) {
        return next(error);
    }
});

router.get('/attendance/summary', auth, async (req, res, next) => {
    try {
        const studentIds = await getAccessibleStudentIds(req.user);
        const filter = { student: { $in: studentIds } };
        const studentSummaries = await Attendance.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$student',
                    attended: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0],
                        },
                    },
                    total: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['present', 'absent', 'late']] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const percentage = (attended, total) => total ? Math.round((attended / total) * 1000) / 10 : null;
        const students = studentSummaries.map(({ _id, attended, total }) => ({
            studentId: String(_id),
            attended,
            total,
            percentage: percentage(attended, total),
        }));
        const totals = students.reduce((result, item) => ({
            attended: result.attended + item.attended,
            total: result.total + item.total,
        }), { attended: 0, total: 0 });

        return res.json({
            data: {
                overall: { ...totals, percentage: percentage(totals.attended, totals.total) },
                students,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/attendance', auth, adminOnly, bulkWriteRateLimit, async (req, res, next) => {
    try {
        const entries = Array.isArray(req.body?.records) ? req.body.records : [req.body || {}];
        if (!entries.length || entries.length > 200) return res.status(422).json({ message: 'Submit 1 to 200 attendance records.' });
        const prepared = [];
        for (const item of entries) {
            if (!item || typeof item !== 'object' || Array.isArray(item)
                || !objectId(item.studentId) || !['present', 'absent', 'late', 'excused'].includes(item.status)) {
                return res.status(422).json({ message: 'Each record needs a valid studentId and attendance status.' });
            }
            const date = item.date ? new Date(item.date) : new Date();
            if (Number.isNaN(date.getTime())) return res.status(422).json({ message: 'Attendance date is invalid.' });
            const service = typeof item.service === 'string' ? item.service.trim() : 'Sunday service';
            if (!service || service.length > 120) return res.status(422).json({ message: 'Service name must contain 1 to 120 characters.' });
            date.setUTCHours(0, 0, 0, 0);
            prepared.push({
                student: item.studentId,
                date,
                service,
                status: item.status,
                note: typeof item.note === 'string' ? item.note.slice(0, 500) : '',
            });
        }
        const studentIds = [...new Set(prepared.map((record) => record.student))];
        const ownedCount = await User.countDocuments({
            _id: { $in: studentIds },
            ...studentScope(req.user),
        });
        if (ownedCount !== studentIds.length) {
            return res.status(403).json({ message: 'Attendance can only be recorded for student accounts.' });
        }
        await Attendance.bulkWrite(prepared.map((record) => ({
            updateOne: {
                filter: { student: record.student, date: record.date, service: record.service },
                update: { $set: { ...record, admin: req.user._id } },
                upsert: true,
            },
        })));
        const records = await Attendance.find({
            $or: prepared.map(({ student, date, service }) => ({ student, date, service })),
        }).populate('student', 'name username');
        return res.status(201).json({ message: 'Attendance saved.', data: records });
    } catch (error) {
        return next(error);
    }
});

router.get('/prayer-checklists', auth, async (req, res, next) => {
    try {
        const date = req.query.date || cairoDay(new Date());
        if (!validPrayerDate(date)) return res.status(422).json({ message: 'A valid prayer checklist date is required.' });
        const studentIds = await getAccessibleStudentIds(req.user);
        const [students, records] = await Promise.all([
            User.find({ _id: { $in: studentIds }, role: 'student' }).select('name').sort({ name: 1 }).lean(),
            PrayerChecklist.find({ student: { $in: studentIds }, date }).lean(),
        ]);
        const recordsByStudent = new Map(records.map((record) => [String(record.student), record]));
        const data = students.map((student) => {
            const record = recordsByStudent.get(String(student._id));
            return {
                id: record ? String(record._id) : null,
                date,
                studentId: String(student._id),
                studentName: student.name,
                checks: prayerFields.reduce((checks, field) => ({ ...checks, [field]: record?.checks?.[field] === true }), {}),
                updatedAt: record?.updatedAt || null,
            };
        });
        return res.json({ data });
    } catch (error) {
        return next(error);
    }
});

router.post('/prayer-checklists', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Only a student can submit their own prayer checklist.' });
        const date = req.body?.date || cairoDay(new Date());
        const checks = parsePrayerChecks(req.body?.checks);
        if (!validPrayerDate(date) || date > cairoDay(new Date()) || !checks) return res.status(422).json({ message: 'A valid date up to today and all prayer checkboxes are required.' });
        const record = await PrayerChecklist.findOneAndUpdate(
            { student: req.user._id, date },
            { $set: { admin: req.user.assignedAdmin || req.user._id, checks } },
            { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
        );
        return res.json({ message: 'Prayer checklist saved.', data: record });
    } catch (error) {
        return next(error);
    }
});

router.patch('/prayer-checklists/:studentId', auth, adminOnly, async (req, res, next) => {
    try {
        const studentId = req.params.studentId;
        const date = req.body?.date;
        const checks = parsePrayerChecks(req.body?.checks);
        if (!objectId(studentId) || !validPrayerDate(date) || date > cairoDay(new Date()) || !checks) {
            return res.status(422).json({ message: 'A valid student, date up to today, and all prayer checkboxes are required.' });
        }
        if (!await User.exists({ _id: studentId, ...studentScope(req.user) })) {
            return res.status(404).json({ message: 'Student not found in your group.' });
        }
        const record = await PrayerChecklist.findOneAndUpdate(
            { student: studentId, date },
            { $set: { admin: req.user._id, checks } },
            { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
        );
        return res.json({ message: 'Prayer checklist updated.', data: record });
    } catch (error) {
        return next(error);
    }
});

router.get('/confessions', auth, async (req, res, next) => {
    try {
        const studentIds = await getAccessibleStudentIds(req.user);
        const filter = { student: { $in: studentIds } };
        const records = await Confession.find(filter).populate('student', 'name username').sort({ date: -1, createdAt: -1 }).limit(500).lean();
        const uniqueByStudentAndDay = new Map();
        for (const record of records) {
            const studentId = String(record.student?._id || record.student);
            const key = `${studentId}:${record.dayKey || dateKeyFor(record.date)}`;
            if (!uniqueByStudentAndDay.has(key)) uniqueByStudentAndDay.set(key, record);
        }
        return res.json({ data: [...uniqueByStudentAndDay.values()] });
    } catch (error) {
        return next(error);
    }
});

router.post('/confessions', auth, async (req, res, next) => {
    try {
        const { date, note } = req.body || {};
        const studentId = req.user.role === 'student'
            ? String(req.body?.studentId || req.user._id)
            : String(req.body?.studentId || '');
        if (!['admin', ...gradeAdminRoles, 'student'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only a student or administrator can record a confession date.' });
        }
        if (!objectId(studentId) || !date || Number.isNaN(Date.parse(date)) || cairoDay(new Date(date)) > cairoDay(new Date())) {
            return res.status(422).json({ message: 'A studentId and valid confession date are required.' });
        }
        if (req.user.role === 'student' && studentId !== String(req.user._id)) {
            return res.status(403).json({ message: 'Students may only record their own confession dates.' });
        }
        if (isAdmin(req.user) && !await User.exists({ _id: studentId, ...studentScope(req.user) })) {
            return res.status(404).json({ message: 'Student not found in your group.' });
        }
        const parsedDate = new Date(date);
        const dayKey = dateKeyFor(parsedDate);
        const dayStart = dateFromKey(dayKey);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        const nearbyStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const nearbyEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);
        const nearbyRecords = await Confession.find({
            student: studentId,
            $or: [{ dayKey }, { date: { $gte: nearbyStart, $lt: nearbyEnd } }],
        }).sort({ createdAt: -1, date: -1 });
        const matchingRecords = nearbyRecords.filter((item) =>
            item.dayKey === dayKey || dateKeyFor(item.date) === dayKey,
        );
        const adminId = isAdmin(req.user) ? req.user._id : (req.user.assignedAdmin || req.user._id);
        const noteText = typeof note === 'string' ? note.slice(0, 1000) : '';
        if (matchingRecords.length) {
            const [record, ...duplicates] = matchingRecords;
            record.dayKey = dayKey;
            record.date = dayStart;
            record.admin = adminId;
            record.note = noteText;
            await record.save();
            if (duplicates.length) await Confession.deleteMany({ _id: { $in: duplicates.map((item) => item._id) } });
            return res.json({ message: 'This confession date was already recorded and has been kept once.', data: record });
        }
        try {
            const record = await Confession.create({
                student: studentId,
                admin: adminId,
                date: dayStart,
                dayKey,
                note: noteText,
            });
            return res.status(201).json({ message: 'Confession record saved.', data: record });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            const record = await Confession.findOne({ student: studentId, dayKey });
            if (!record) throw error;
            return res.json({ message: 'This confession date was already recorded.', data: record });
        }
    } catch (error) {
        return next(error);
    }
});

router.patch('/confessions/:id', auth, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Confession record not found.' });
        if (!['admin', ...gradeAdminRoles, 'student'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only a student or administrator can edit a confession record.' });
        }
        const ownership = isAdmin(req.user)
            ? { _id: req.params.id, student: { $in: await getAccessibleStudentIds(req.user) } }
            : { _id: req.params.id, student: req.user._id };
        const record = await Confession.findOne(ownership);
        if (!record) return res.status(404).json({ message: 'Confession record not found.' });
        if (req.user.role === 'student') {
            const latest = await Confession.findOne({ student: req.user._id })
                .sort({ date: -1, createdAt: -1 })
                .select('_id')
                .lean();
            if (String(latest?._id) !== String(record._id)) {
                return res.status(403).json({ message: 'Students can edit only their latest confession record.' });
            }
        }
        if (req.body?.date !== undefined) {
            if (!req.body.date || Number.isNaN(Date.parse(req.body.date)) || cairoDay(new Date(req.body.date)) > cairoDay(new Date())) {
                return res.status(422).json({ message: 'A valid confession date is required.' });
            }
            const dayKey = dateKeyFor(new Date(req.body.date));
            const dayStart = dateFromKey(dayKey);
            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
            const nearbyStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
            const nearbyEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000);
            const nearbyRecords = await Confession.find({
                _id: { $ne: record._id },
                student: record.student,
                $or: [{ dayKey }, { date: { $gte: nearbyStart, $lt: nearbyEnd } }],
            }).select('_id date dayKey').lean();
            const duplicate = nearbyRecords.find((item) =>
                item.dayKey === dayKey || dateKeyFor(item.date) === dayKey,
            );
            if (duplicate) return res.status(409).json({ message: 'This confession date is already recorded. Edit the existing record instead.' });
            record.date = dayStart;
            record.dayKey = dayKey;
        } else if (!record.dayKey) {
            record.dayKey = dateKeyFor(record.date);
        }
        if (req.body?.note !== undefined) {
            if (typeof req.body.note !== 'string') return res.status(422).json({ message: 'Confession note must be text.' });
            record.note = req.body.note.slice(0, 1000);
        }
        await record.save();
        return res.json({ message: 'Confession record updated.', data: record });
    } catch (error) {
        return next(error);
    }
});

router.get('/tasks', auth, async (req, res, next) => {
    try {
        const studentIds = await getAccessibleStudentIds(req.user);
        let filter;
        if (isAdmin(req.user)) {
            filter = applyAdminScope({}, req.user);
        } else {
            const students = req.user.role === 'parent'
                ? await getChildren(req.user).select('_id grade meetingGroup').lean()
                : [req.user];
            filter = {
                $or: [
                    { student: { $in: studentIds } },
                    { $and: [{ assignToGroup: true }, audienceForStudents(students)] },
                ],
            };
        }
        const tasks = await Task.find(filter)
            .populate('student', 'name username')
            .populate('completions.student', 'name username')
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();
        const accessibleIds = new Set(studentIds.map(String));
        for (const task of tasks) {
            task.completions = (task.completions || []).filter((completion) => accessibleIds.has(String(completion.student?._id || completion.student)));
        }
        if (isAdmin(req.user)) return res.json({ data: tasks });

        const accessibleStudents = req.user.role === 'parent'
            ? await User.find({ _id: { $in: studentIds } }).select('name username').lean()
            : [];
        const studentsById = new Map(accessibleStudents.map((student) => [String(student._id), student]));
        const visible = [];
        for (const task of tasks) {
            if (!task.assignToGroup) {
                visible.push(task);
                continue;
            }
            for (const studentId of studentIds) {
                const completion = taskCompletionFor(task, studentId);
                const student = req.user.role === 'student'
                    ? { _id: req.user._id, name: req.user.name, username: req.user.username }
                    : studentsById.get(String(studentId));
                if (!student) continue;
                visible.push({
                    ...task,
                    _id: req.user.role === 'student' ? task._id : `${task._id}:${studentId}`,
                    taskId: String(task._id),
                    student,
                    completedAt: completion?.completedAt || null,
                    completionNote: completion?.completionNote || '',
                });
            }
        }
        return res.json({ data: visible });
    } catch (error) {
        return next(error);
    }
});

router.post('/tasks', auth, adminOnly, bulkWriteRateLimit, async (req, res, next) => {
    try {
        const { title, description, studentIds, dueAt } = req.body || {};
        const assignToGroup = req.body?.assignToGroup === true;
        const audience = await validAudience(req.user, req.body || {});
        if (audience.error) return res.status(422).json({ message: audience.error });
        const targets = Array.isArray(studentIds) ? [...new Set(studentIds.map(String))] : [];
        if ((!assignToGroup && !targets.length) || targets.length > 200 || typeof title !== 'string' || !title.trim()) {
            return res.status(422).json({ message: 'A title and either a target group or 1 to 200 students are required.' });
        }
        for (const studentId of targets) {
            if (!objectId(studentId)) return res.status(422).json({ message: 'Every studentId must be valid.' });
        }
        let targetStudents = [];
        if (!assignToGroup) {
            targetStudents = await User.find({
                _id: { $in: targets },
                ...studentScope(req.user),
            }).select('_id grade meetingGroup').lean();
            if (targetStudents.length !== targets.length) return res.status(403).json({ message: 'All selected accounts must be students in your scope.' });
        }
        const tasks = assignToGroup
            ? [{
                title: title.trim(),
                description: typeof description === 'string' ? description : '',
                student: null,
                admin: req.user._id,
                audienceMode: audience.grade ? 'grade' : 'shared',
                grade: audience.grade,
                meetingGroup: audience.meetingGroup,
                assignToGroup: true,
                dueAt: dueAt || undefined,
            }]
            : targetStudents.map((student) => ({
                title: title.trim(),
                description: typeof description === 'string' ? description : '',
                student: student._id,
                admin: req.user._id,
                grade: student.grade || null,
                meetingGroup: student.meetingGroup || null,
                dueAt: dueAt || undefined,
            }));
        const created = await Task.insertMany(tasks);
        return res.status(201).json({ message: 'Tasks assigned.', data: created });
    } catch (error) {
        return next(error);
    }
});

router.patch('/tasks/:id/audience', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Task not found.' });
        const task = await Task.findOne({ _id: req.params.id, ...adminScope(req.user) });
        if (!task || !task.assignToGroup) return res.status(404).json({ message: 'Group task not found in your scope.' });
        const audience = await validAudience(req.user, req.body || {});
        if (audience.error) return res.status(422).json({ message: audience.error });
        task.grade = audience.grade;
        task.meetingGroup = audience.meetingGroup;
        task.audienceMode = audience.grade ? 'grade' : 'shared';
        task.admin = req.user._id;
        await task.save();
        return res.json({ message: 'Task audience updated.', data: task });
    } catch (error) {
        return next(error);
    }
});

router.patch('/tasks/:id/complete', auth, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Task not found.' });
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Only the assigned student can complete this task.' });
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found.' });
        const completionNote = typeof req.body?.completionNote === 'string' ? req.body.completionNote.slice(0, 2000) : '';
        if (task.assignToGroup) {
            const groupVisible = task.audienceMode === 'shared'
                || (task.audienceMode === 'grade' && task.grade === req.user.grade
                    && (!task.meetingGroup || String(task.meetingGroup) === String(req.user.meetingGroup || '')));
            if (!groupVisible) return res.status(404).json({ message: 'Task not found.' });
            const completion = task.completions.find((item) => String(item.student) === String(req.user._id));
            if (completion) {
                completion.completedAt = new Date();
                completion.completionNote = completionNote;
            } else {
                task.completions.push({ student: req.user._id, completedAt: new Date(), completionNote });
            }
            await task.save();
            return res.json({
                message: 'Task marked complete.',
                data: { ...task.toObject(), student: req.user._id, completedAt: task.completions.find((item) => String(item.student) === String(req.user._id)).completedAt, completionNote },
            });
        }
        if (String(task.student) !== String(req.user._id)) return res.status(404).json({ message: 'Task not found.' });
        task.completedAt = new Date();
        task.completionNote = completionNote;
        await task.save();
        return res.json({ message: 'Task marked complete.', data: task });
    } catch (error) {
        return next(error);
    }
});

router.get('/quizzes', auth, async (req, res, next) => {
    try {
        res.set('Cache-Control', 'no-store');
        const filter = { published: true };
        if (isAdmin(req.user)) applyAdminScope(filter, req.user);
        else {
            const students = req.user.role === 'parent'
                ? await getChildren(req.user).select('_id grade meetingGroup').lean()
                : [req.user];
            filter.$and = [audienceForStudents(students)];
        }
        const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
        return res.json({
            data: isAdmin(req.user)
                ? quizzes
                : quizzes.map(hideQuizAnswers),
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/quizzes', auth, adminOnly, async (req, res, next) => {
    try {
        const { title, description, questions, published } = req.body || {};
        const audience = await validAudience(req.user, req.body || {});
        if (audience.error) return res.status(422).json({ message: audience.error });
        if (typeof title !== 'string' || !title.trim() || !Array.isArray(questions) || !questions.length) {
            return res.status(422).json({ message: 'Quiz title and questions are required.' });
        }
        for (const question of questions) {
            if (typeof question.prompt !== 'string' || !Array.isArray(question.options)
                || question.options.length < 2 || question.options.length > 6
                || !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length) {
                return res.status(422).json({ message: 'Each question needs a prompt, 2 to 6 options, and a valid answerIndex.' });
            }
        }
        const quiz = await Quiz.create({
            title: title.trim(), description, questions, published: published !== false, admin: req.user._id,
            audienceMode: audience.grade ? 'grade' : 'shared',
            grade: audience.grade, meetingGroup: audience.meetingGroup,
        });
        return res.status(201).json({ message: 'Quiz created.', data: hideQuizAnswers(quiz) });
    } catch (error) {
        return next(error);
    }
});

router.patch('/quizzes/:id/audience', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Quiz not found.' });
        const quiz = await Quiz.findOne({ _id: req.params.id, ...adminScope(req.user) });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found in your scope.' });
        const audience = await validAudience(req.user, req.body || {});
        if (audience.error) return res.status(422).json({ message: audience.error });
        quiz.grade = audience.grade;
        quiz.meetingGroup = audience.meetingGroup;
        quiz.audienceMode = audience.grade ? 'grade' : 'shared';
        quiz.admin = req.user._id;
        await quiz.save();
        return res.json({ message: 'Quiz audience updated.', data: hideQuizAnswers(quiz) });
    } catch (error) {
        return next(error);
    }
});

router.post('/quizzes/:id/submit', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can submit quiz answers.' });
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Quiz not found.' });
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            published: true,
        });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
        const audienceVisible = quiz.audienceMode === 'shared'
            || (quiz.audienceMode === 'grade' && quiz.grade === req.user.grade
                && (!quiz.meetingGroup || String(quiz.meetingGroup) === String(req.user.meetingGroup || '')));
        if (!audienceVisible) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }
        const existingAttempt = await QuizAttempt.exists({ quiz: quiz._id, student: req.user._id });
        if (existingAttempt) {
            return res.status(409).json({ message: 'لقد سبق لك تقديم هذا الاختبار، ولا يمكن إرساله مرة أخرى.' });
        }
        const answers = req.body?.answers;
        if (!Array.isArray(answers) || answers.length !== quiz.questions.length
            || answers.some((answer, index) => !Number.isInteger(answer) || answer < 0 || answer >= quiz.questions[index].options.length)) {
            return res.status(422).json({ message: 'Provide one valid option index for every question.' });
        }
        const score = answers.reduce((total, answer, index) => total + (answer === quiz.questions[index].answerIndex ? 1 : 0), 0);
        try {
            const attempt = await QuizAttempt.create({ quiz: quiz._id, student: req.user._id, score, total: quiz.questions.length, answers });
            return res.status(201).json({ message: 'Quiz submitted.', result: { score, total: quiz.questions.length, submittedAt: attempt.submittedAt } });
        } catch (error) {
            if (error?.code === 11000) {
                return res.status(409).json({ message: 'لقد سبق لك تقديم هذا الاختبار، ولا يمكن إرساله مرة أخرى.' });
            }
            throw error;
        }
    } catch (error) {
        return next(error);
    }
});

router.get('/quiz-attempts', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Student account required.' });
        }
        const attempts = await QuizAttempt.find({ student: req.user._id })
            .populate('quiz', 'title')
            .sort({ submittedAt: -1 })
            .lean();
        return res.json({ data: attempts });
    } catch (error) {
        return next(error);
    }
});

router.get('/quizzes/:id/results', auth, adminOnly, async (req, res, next) => {
    try {
        if (!objectId(req.params.id)) return res.status(404).json({ message: 'Quiz not found.' });
        const quiz = await Quiz.exists({ _id: req.params.id, ...adminScope(req.user) });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
        const results = await QuizAttempt.find({
            quiz: req.params.id,
            ...(isGlobalAdmin(req.user) ? {} : { student: { $in: await getAccessibleStudentIds(req.user) } }),
        })
            .populate('student', 'name username')
            .sort({ submittedAt: -1 });
        return res.json({ data: results });
    } catch (error) {
        return next(error);
    }
});

router.get('/parents/dashboard', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).json({ message: 'Parent account required.' });
        const children = await getChildren(req.user);
        const data = await Promise.all(children.map(async (child) => {
            const [latestConfession, attendance] = await Promise.all([
                Confession.findOne({ student: child._id }).sort({ date: -1 }).select('date note'),
                Attendance.find({ student: child._id }).sort({ date: -1 }).limit(30).select('date service status'),
            ]);
            return {
                student: sanitizeUser(child),
                latestConfession,
                attendance,
            };
        }));
        return res.json({ data });
    } catch (error) {
        return next(error);
    }
});

router.get('/contact', (req, res) => {
    const number = String(process.env.WHATSAPP_NUMBER || '201223153437').replace(/\D/g, '');
    return res.json({
        whatsappUrl: number ? `https://wa.me/${number}` : null,
        message: number ? undefined : 'WhatsApp contact is not configured.',
    });
});

router.get('/mobile-app/download', (req, res) => {
    const downloadUrl = String(process.env.MOBILE_APP_DOWNLOAD_URL || '').trim();
    if (!downloadUrl || !/^https:\/\/\S+$/.test(downloadUrl)) {
        return res.status(404).json({ message: 'Mobile app download is not configured.' });
    }
    return res.redirect(302, downloadUrl);
});

router.get('/privacy-policy', (req, res) => res.json({
    name: 'Eltor Coptic Privacy Policy',
    updatedAt: '2026-10-10',
    sections: [
        { title: 'Information collected', body: 'We store account, contact, student profile, attendance, lessons, task, and confession-record information submitted to this service.' },
        { title: 'Use and access', body: 'Administrators can access students assigned to them. Students access their own records. Verified parent accounts can access records for children matching their verified guardian phone number.' },
        { title: 'Security and retention', body: 'Passwords are stored as salted hashes, access is authenticated, and phone verification codes expire. Administrators should only enter pastoral notes necessary for the service.' },
        { title: 'Your choices', body: 'Contact the church administrators to correct account information or request deletion. Do not enter emergency or highly sensitive information into optional notes.' },
    ],
}));

module.exports = router;
