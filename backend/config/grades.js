const grades = [
    { id: 'primary_1_3', label: 'المرحلة الابتدائية الأولى (من الصف الأول إلى الصف الثالث الابتدائي)', adminRole: 'primary_admin' },
    { id: 'primary_4_6', label: 'المرحلة الابتدائية الثانية (من الصف الرابع إلى الصف السادس الابتدائي)', adminRole: 'primary_admin' },
    { id: 'preparatory', label: 'المرحلة الإعدادية', adminRole: 'secondary_admin' },
    { id: 'secondary', label: 'المرحلة الثانوية', adminRole: 'secondary_admin' },
    { id: 'university', label: 'المرحلة الجامعية', adminRole: 'secondary_admin' },
    { id: 'expatriates', label: 'مرحلة المغتربين', adminRole: 'secondary_admin' },
];

// Keep the former primary id valid so existing accounts and their data remain usable.
const legacyGradeIds = ['primary'];
const gradeIds = new Set([...grades.map(({ id }) => id), ...legacyGradeIds]);
const legacyGradeAdminRoles = ['admin_primary_1_3', 'admin_primary_4_6', 'admin_preparatory', 'admin_secondary', 'admin_university', 'admin_expatriates', 'grade_admin'];
const gradeAdminRoles = [...new Set([...legacyGradeAdminRoles, 'primary_admin', 'secondary_admin'])];
const gradeAdminRoleIds = new Set(gradeAdminRoles);
const gradeByAdminRole = new Map(grades.map(({ id, adminRole }) => [id, adminRole]));
const gradeByLabel = new Map(grades.map(({ id, label }) => [label.trim(), id]));
const legacyGradeByAdminRole = new Map([
    ['admin_primary_1_3', 'primary_1_3'],
    ['admin_primary_4_6', 'primary_4_6'],
    ['admin_preparatory', 'preparatory'],
    ['admin_secondary', 'secondary'],
    ['admin_university', 'university'],
    ['admin_expatriates', 'expatriates'],
]);

const isGradeAdminRole = (role) => gradeAdminRoleIds.has(role);
const normalizeGradeId = (value) => {
    if (value && typeof value === 'object') {
        const nested = value.id ?? value._id ?? value.value ?? value.gradeId ?? value.stageId ?? value.grade ?? value.stage ?? value.label ?? value.name;
        return nested === undefined || nested === value ? '' : normalizeGradeId(nested);
    }
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    const candidate = String(value).trim();
    if (!candidate) return '';
    if (gradeIds.has(candidate)) return candidate === 'primary' ? 'primary_1_3' : candidate;
    return gradeByLabel.get(candidate) || candidate;
};
const adminRoleForGrade = (grade) => gradeByAdminRole.get(grade) || (grade === 'primary' ? 'grade_admin' : null);
const gradeForAdminRole = (role) => legacyGradeByAdminRole.get(role) || null;
const adminRoleMatchesGrade = (role, grade) => {
    if (role === 'primary_admin') return grade === 'primary_1_3' || grade === 'primary_4_6' || grade === 'primary';
    if (role === 'secondary_admin') return gradeIds.has(grade) && grade !== 'primary_1_3' && grade !== 'primary_4_6' && grade !== 'primary';
    const legacyGrade = gradeForAdminRole(role);
    return !legacyGrade || legacyGrade === grade;
};

module.exports = {
    grades,
    gradeIds,
    gradeAdminRoles,
    isGradeAdminRole,
    normalizeGradeId,
    adminRoleForGrade,
    gradeForAdminRole,
    adminRoleMatchesGrade,
};
