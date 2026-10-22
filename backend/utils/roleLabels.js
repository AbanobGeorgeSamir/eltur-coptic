const { grades, isGradeAdminRole } = require('../config/grades');

const roleLabelFor = (role, grade) => {
    if (role === 'admin') return 'مسؤول خدمة (أمين عام)';
    if (isGradeAdminRole(role)) {
        const stage = grades.find((item) => item.id === grade)?.label;
        return stage ? `مسؤول ${stage}` : 'مسؤول مرحلة';
    }
    if (role === 'parent') return 'ولي أمر';
    if (role === 'servant') return 'خادم';
    return 'المخدوم';
};

module.exports = { roleLabelFor };
