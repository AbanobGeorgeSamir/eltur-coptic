const { roleLabelFor } = require('./roleLabels');

const getId = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return String(value._id);
    return String(value);
};

const sanitizeUser = (user, { includeNationalId = false } = {}) => {
    if (!user) return null;
    const result = {
        id: getId(user._id || user.id),
        name: user.name,
        username: user.username,
        email: user.email || null,
        phone: user.phone,
        interests: user.interests || '',
        role: user.role || null,
        roleLabel: roleLabelFor(user.role, user.grade),
        grade: user.grade || null,
        academicYear: user.academicYear || null,
        college: user.college || null,
        meetingGroup: getId(user.meetingGroup),
        meetingGroupName: user.meetingGroup && typeof user.meetingGroup === 'object' ? user.meetingGroup.name || null : null,
        isActive: user.isActive !== false,
        fatherName: user.fatherName || null,
        confessionFather: user.confessionFather || null,
        guardianPhone: user.guardianPhone || null,
        address: user.address || null,
        picture: user.picture || null,
        birthDate: user.birthDate || null,
        gender: user.gender || null,
        isDeacon: Boolean(user.isDeacon),
        whatsappNumber: user.whatsappNumber || null,
        assignedAdmin: getId(user.assignedAdmin),
    };
    if (includeNationalId && user.nationalId) result.nationalId = user.nationalId;
    if (user.privacyAcceptedAt) result.privacyAcceptedAt = user.privacyAcceptedAt;
    return result;
};

module.exports = { sanitizeUser };
