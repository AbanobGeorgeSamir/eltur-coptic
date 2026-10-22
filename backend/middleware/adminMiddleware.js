const { gradeIds, isGradeAdminRole, gradeForAdminRole, adminRoleMatchesGrade } = require('../config/grades');

module.exports = (req, res, next) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    if (user.role === 'admin' || isGradeAdminRole(user.role)) {
        if (isGradeAdminRole(user.role) && !gradeIds.has(user.grade)) {
            return res.status(403).json({ message: 'This grade administrator has no valid grade assignment.' });
        }
        const roleGrade = gradeForAdminRole(user.role);
        if ((roleGrade && roleGrade !== user.grade) || !adminRoleMatchesGrade(user.role, user.grade)) {
            return res.status(403).json({ message: 'This grade administrator role does not match its grade assignment.' });
        }
        return next();
    }

    return res.status(403).json({
        message: 'Forbidden. Admin access required.',
    });
};
