const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Confession = require('../models/Confession');
const Task = require('../models/Task');
const PrayerChecklist = require('../models/PrayerChecklist');
const QuizAttempt = require('../models/QuizAttempt');
const TripRegistration = require('../models/TripRegistration');
const { gradeIds, isGradeAdminRole } = require('../config/grades');
const { hashPassword, verifyPassword, needsRehash } = require('../utils/passwords');
const { sanitizeUser } = require('../utils/responses');
const { countries, egyptGovernorates, egyptCountryName, isHigherEducationGrade } = require('../utils/registrationOptions');
const auth = require('../middleware/authMiddleware');
const { loginRateLimit, loginAccountRateLimit, registrationRateLimit } = require('../middleware/rateLimit');
const { isBrowserRequest } = require('../config/origins');
const { SESSION_MAX_AGE_SECONDS, setSessionCookie, clearSessionCookie } = require('../utils/sessionCookies');
const { validEmail, validPhone, normalizePhone, hasFourPartName } = require('../utils/validation');

const router = express.Router();
const signToken = (user) => jwt.sign(
    { userId: String(user._id), sessionVersion: Number(user.sessionVersion || 0) },
    process.env.JWT_SECRET,
    { expiresIn: SESSION_MAX_AGE_SECONDS, algorithm: 'HS256' }
);

const respondWithSession = (req, res, statusCode, message, user) => {
    const token = signToken(user);
    const browserRequest = isBrowserRequest(req);
    const response = { message, user: sanitizeUser(user), ...(!browserRequest ? { token } : {}) };
    if (browserRequest) {
        setSessionCookie(res, token);
        response.authMode = 'cookie';
    }
    return res.status(statusCode).json(response);
};

const normalizeRegistration = (body = {}) => ({
    name: String(body.name || body.fullName || '').trim().replace(/\s+/g, ' '),
    username: String(body.username || body.name || body.fullName || '').trim().toLowerCase(),
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email == null ? '' : String(body.email),
    phone: normalizePhone(body.phone),
    password: typeof body.password === 'string' ? body.password : '',
    fatherName: String(body.fatherName || '').trim(),
    confessionFather: String(body.confessionFather || '').trim(),
    guardianPhone: normalizePhone(body.guardianPhone || body.parentPhone),
    address: String(body.address || '').trim(),
    interests: String(body.interests || '').trim(),
    grade: String(body.grade || '').trim(),
    academicYear: String(body.academicYear || '').trim(),
    college: String(body.college || '').trim(),
    country: String(body.country || '').trim(),
    governorate: String(body.governorate || '').trim(),
    birthDate: body.birthDate,
    gender: body.gender,
    nationalId: String(body.nationalId || '').trim(),
    isDeacon: body.isDeacon === true || body.isDeacon === 'true',
    whatsappNumber: normalizePhone(body.whatsappNumber || body.whatsapp),
    privacyAccepted: body.privacyAccepted === true || body.privacyAccepted === 'true',
});

const checkRegistration = (input, { parent = false } = {}) => {
    if (!input.name || input.name.length > 160 || (!parent && !hasFourPartName(input.name))) {
        return parent ? 'Full name is required.' : 'Please enter your full four-part name.';
    }
    if (!input.username || input.username.length > 160) return 'A valid login name is required.';
    if (!validEmail(input.email)) return 'Please enter a valid email address.';
    if (input.interests.length > 500) return 'Interests must be 500 characters or fewer.';
    if (!parent && !input.interests) return 'Enter at least one interest.';
    if (!parent && !gradeIds.has(input.grade)) return 'Choose a valid study grade.';
    if (!parent && isHigherEducationGrade(input.grade)) {
        if (!input.academicYear) return 'Choose your academic year.';
        if (input.academicYear.length > 80) return 'Academic year must be 80 characters or fewer.';
        if (!input.college) return 'Choose your college.';
        if (input.college.length > 160) return 'College must be 160 characters or fewer.';
        if (!countries.has(input.country)) return 'Choose a valid country of residence.';
        if (input.country === egyptCountryName) {
            if (!egyptGovernorates.has(input.governorate)) return 'Choose a valid Egyptian governorate.';
        } else if (input.governorate) {
            return 'A governorate can only be selected when the country is Egypt.';
        }
    }
    if (!validPhone(input.phone)) return 'Phone number must use international format, such as +201001234567.';
    if (input.password.length < 8 || input.password.length > 256) return 'Password must contain between 8 and 256 characters.';
    if (!parent && (!input.fatherName || !input.confessionFather || !input.address || !input.guardianPhone)) {
        return 'Father name, confession father, guardian phone, and address are required.';
    }
    if (!parent && !validPhone(input.guardianPhone)) return 'Guardian phone must use international format.';
    if (!parent && !/^\d{14}$/.test(input.nationalId)) return 'National ID must contain 14 digits.';
    if (!parent && !['male', 'female'].includes(input.gender)) return 'Gender must be male or female.';
    if (!parent && (!input.birthDate || Number.isNaN(Date.parse(input.birthDate)) || new Date(input.birthDate) > new Date())) {
        return 'A valid birth date in the past is required.';
    }
    if (!input.privacyAccepted) return 'You must accept the privacy policy.';
    return null;
};

const completeRegistration = async (req, res, role) => {
    const input = normalizeRegistration(req.body);
    const validation = checkRegistration(input, { parent: role === 'parent' });
    if (validation) return res.status(422).json({ message: validation });

    if (role === 'parent') {
        const child = await User.exists({
            role: 'student',
            guardianPhone: input.phone,
        });
        if (!child) return res.status(404).json({ message: 'No student is registered with this guardian phone.' });
    }

    try {
        const user = await User.create({
            name: input.name,
            username: input.username,
            ...(input.email ? { email: input.email } : {}),
            phone: input.phone,
            interests: input.interests,
            password: await hashPassword(input.password),
            role,
            ...(role === 'student' ? { grade: input.grade, meetingGroup: null, assignedAdmin: null } : {}),
            ...(role === 'student' && isHigherEducationGrade(input.grade) ? {
                academicYear: input.academicYear,
                college: input.college,
                country: input.country,
                governorate: input.governorate || null,
            } : {}),
            ...(role === 'student' ? {
                fatherName: input.fatherName,
                confessionFather: input.confessionFather,
                guardianPhone: input.guardianPhone,
                address: input.address,
                birthDate: new Date(input.birthDate),
                gender: input.gender,
                nationalId: input.nationalId,
                isDeacon: input.isDeacon,
                whatsappNumber: input.whatsappNumber || input.phone,
            } : {}),
            privacyAcceptedAt: new Date(),
        });
        const message = role === 'parent'
            ? 'Account created. A church administrator must approve access to linked students.'
            : 'Registration successful.';
        return respondWithSession(req, res, 201, message, user);
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'Name, email, or phone is already registered.' });
        throw error;
    }
};

router.post(['/register', '/auth/register'], registrationRateLimit, async (req, res, next) => {
    try {
        return await completeRegistration(req, res, 'student');
    } catch (error) {
        return next(error);
    }
});

router.post('/auth/parents/register', registrationRateLimit, async (req, res, next) => {
    try {
        return await completeRegistration(req, res, 'parent');
    } catch (error) {
        return next(error);
    }
});

router.post(['/login', '/auth/login'], loginRateLimit, loginAccountRateLimit, async (req, res, next) => {
    try {
        const username = String(req.body?.name || req.body?.username || '').trim().toLowerCase();
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const selectedGrade = typeof req.body?.grade === 'string' ? req.body.grade.trim() : '';
        if (!username || username.length > 160 || !password || password.length > 256) {
            return res.status(422).json({ message: 'A valid login name and password are required.' });
        }
        if (selectedGrade && !gradeIds.has(selectedGrade) && !['legacy', 'other'].includes(selectedGrade)) {
            return res.status(422).json({ message: 'Choose a valid study grade or account type.' });
        }

        const user = await User.findOne({ $or: [{ username }, { email: username }] })
            .select('+password');
        const passwordMatches = user
            ? await verifyPassword(password, user.password)
            : (await hashPassword(password), false);
        if (!user || !passwordMatches) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        if (needsRehash(user.password)) {
            user.password = await hashPassword(password);
            await user.save();
        }
        if (selectedGrade) {
            const matchesStoredAccount = user.role === 'student'
                ? (user.grade
                    ? selectedGrade === user.grade || (user.grade === 'primary' && ['primary_1_3', 'primary_4_6'].includes(selectedGrade))
                    : selectedGrade === 'legacy')
                : selectedGrade === 'other';
            if (!matchesStoredAccount) {
                return res.status(401).json({ message: 'بيانات الدخول أو اختيار المرحلة غير صحيح.' });
            }
        }
        if (user.isActive === false) return res.status(403).json({ message: 'This account is disabled. Contact the church administrator.' });

        return respondWithSession(req, res, 200, 'Login successful.', user);
    } catch (error) {
        return next(error);
    }
});

router.get(['/user', '/auth/me'], auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const response = { user: sanitizeUser(user) };
        if (isBrowserRequest(req)) {
            response.authMode = 'cookie';
        }
        return res.json(response);
    } catch (error) {
        return next(error);
    }
});

router.patch('/users/me', auth, async (req, res, next) => {
    try {
        const allowed = ['name', 'email', 'phone', 'interests', 'fatherName', 'confessionFather', 'guardianPhone', 'address', 'birthDate', 'gender', 'isDeacon', 'whatsappNumber', 'academicYear', 'college', 'country', 'governorate'];
        const changes = {};
        for (const key of allowed) {
            if (req.body?.[key] !== undefined) changes[key] = req.body[key];
        }
        if (req.body?.grade !== undefined || req.body?.meetingGroup !== undefined) {
            if (req.user.role !== 'student' || req.user.grade) {
                return res.status(403).json({ message: 'The study grade can only be selected once by a student account without an assigned grade.' });
            }
            const grade = String(req.body?.grade || '');
            if (!gradeIds.has(grade)) return res.status(422).json({ message: 'Choose a valid study grade.' });
            changes.grade = grade;
            changes.meetingGroup = null;
            changes.assignedAdmin = null;
        }
        const studyDetailsTouched = ['academicYear', 'college', 'country', 'governorate'].some((field) => changes[field] !== undefined);
        if (studyDetailsTouched) {
            if (req.user.role !== 'student') {
                return res.status(403).json({ message: 'Study details are only available for student accounts.' });
            }
            for (const [field, max] of [['academicYear', 80], ['college', 160], ['country', 100], ['governorate', 100]]) {
                if (changes[field] !== undefined) {
                    changes[field] = String(changes[field] || '').trim();
                    if (changes[field].length > max) return res.status(422).json({ message: 'Study details are too long.' });
                }
            }
        }
        if (req.user.role === 'student') {
            const resolvedGrade = changes.grade !== undefined ? changes.grade : req.user.grade;
            if (isHigherEducationGrade(resolvedGrade)) {
                const academicYear = changes.academicYear !== undefined ? changes.academicYear : req.user.academicYear;
                const college = changes.college !== undefined ? changes.college : req.user.college;
                const country = changes.country !== undefined ? changes.country : req.user.country;
                const governorate = changes.governorate !== undefined ? changes.governorate : req.user.governorate;
                if (!academicYear || !college || !countries.has(country)) {
                    return res.status(422).json({ message: 'Academic year, college, and a valid country are required for university students.' });
                }
                if (country === egyptCountryName && !egyptGovernorates.has(governorate)) {
                    return res.status(422).json({ message: 'Choose a valid Egyptian governorate.' });
                }
                if (studyDetailsTouched) {
                    changes.country = country;
                    changes.governorate = country === egyptCountryName ? governorate : null;
                }
            } else if (studyDetailsTouched || changes.grade !== undefined) {
                changes.academicYear = null;
                changes.college = null;
                changes.country = null;
                changes.governorate = null;
            }
        }
        if (changes.email !== undefined) {
            changes.email = typeof changes.email === 'string'
                ? changes.email.trim().toLowerCase()
                : changes.email == null ? '' : String(changes.email).trim().toLowerCase();
            if (!validEmail(changes.email)) {
                return res.status(422).json({ message: 'Please enter a valid email address.' });
            }
            if (!changes.email) delete changes.email;
        }
        if (changes.interests !== undefined) {
            changes.interests = String(changes.interests || '').trim();
            if (changes.interests.length > 500) return res.status(422).json({ message: 'Interests must be 500 characters or fewer.' });
        }
        if (changes.phone !== undefined) {
            changes.phone = normalizePhone(changes.phone);
            if (!validPhone(changes.phone)) {
                return res.status(422).json({ message: 'Phone number must use international format, such as +201001234567.' });
            }
        }
        if (changes.name !== undefined && !hasFourPartName(changes.name)) {
            return res.status(422).json({ message: 'Please enter your full four-part name.' });
        }
        if (changes.name !== undefined) {
            changes.name = changes.name.trim().replace(/\s+/g, ' ');
            changes.username = changes.name.toLowerCase();
        }
        if (req.user.role === 'parent' && changes.phone && changes.phone !== req.user.phone) {
            // A changed guardian phone needs fresh administrator approval before it can read linked student records.
            changes.parentApprovedStudentIds = [];
        }
        for (const field of ['guardianPhone', 'whatsappNumber']) {
            if (changes[field] && !validPhone(normalizePhone(changes[field]))) {
                return res.status(422).json({ message: `${field} must use international phone format.` });
            }
            if (changes[field]) changes[field] = normalizePhone(changes[field]);
        }
        const update = { $set: changes };
        if (req.body?.email !== undefined && !changes.email) update.$unset = { email: 1 };
        const user = await User.findByIdAndUpdate(req.user._id, update, { returnDocument: 'after', runValidators: true });
        return res.json({ message: 'Profile updated.', user: sanitizeUser(user) });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Email, phone, or login name is already in use.' });
        }
        return next(error);
    }
});

router.delete('/users/me', auth, async (req, res, next) => {
    try {
        if (req.user.role === 'admin' || isGradeAdminRole(req.user.role)) {
            return res.status(403).json({ message: 'Administrator accounts must be disabled by a public administrator.' });
        }
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        if (!password) return res.status(422).json({ message: 'Enter your password to delete this account.' });
        const user = await User.findById(req.user._id).select('+password');
        if (!user) return res.status(404).json({ message: 'Account not found.' });
        if (!await verifyPassword(password, user.password)) {
            return res.status(401).json({ message: 'The password is incorrect.' });
        }

        const userId = user._id;
        if (user.role === 'student') {
            await Promise.all([
                Attendance.deleteMany({ student: userId }),
                Confession.deleteMany({ student: userId }),
                Task.deleteMany({ student: userId }),
                Task.updateMany({ assignToGroup: true }, { $pull: { completions: { student: userId } } }),
                PrayerChecklist.deleteMany({ student: userId }),
                QuizAttempt.deleteMany({ student: userId }),
                TripRegistration.deleteMany({ student: userId }),
            ]);
        } else if (user.role === 'parent') {
            await TripRegistration.deleteMany({ student: userId });
        }

        await User.deleteOne({ _id: userId });
        return res.json({ message: 'Account and associated personal records were deleted.' });
    } catch (error) {
        return next(error);
    }
});

router.patch('/users/me/phone', auth, async (req, res, next) => {
    try {
        const phone = normalizePhone(req.body?.phone);
        if (!validPhone(phone)) return res.status(422).json({ message: 'Phone number must use international format.' });
        const changes = { phone };
        if (req.user.role === 'parent' && phone !== req.user.phone) changes.parentApprovedStudentIds = [];
        const user = await User.findByIdAndUpdate(req.user._id, {
            $set: changes,
        }, { returnDocument: 'after', runValidators: true });
        return res.json({ message: 'Phone number updated.', user: sanitizeUser(user) });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'Phone number is already in use.' });
        return next(error);
    }
});

router.post(['/logout', '/auth/logout'], auth, async (req, res, next) => {
    try {
        await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
    } catch (error) {
        return next(error);
    }
    clearSessionCookie(res);
    return res.json({ message: 'Logout successful.' });
});

module.exports = router;
