export const grades = [
  { id: 'primary_1_3', label: 'المرحلة الابتدائية الأولى (من الصف الأول إلى الصف الثالث الابتدائي)', adminRole: 'primary_admin' },
  { id: 'primary_4_6', label: 'المرحلة الابتدائية الثانية (من الصف الرابع إلى الصف السادس الابتدائي)', adminRole: 'primary_admin' },
  { id: 'preparatory', label: 'المرحلة الإعدادية', adminRole: 'secondary_admin' },
  { id: 'secondary', label: 'المرحلة الثانوية', adminRole: 'secondary_admin' },
  { id: 'university', label: 'المرحلة الجامعية', adminRole: 'secondary_admin' },
  { id: 'expatriates', label: 'مرحلة المغتربين', adminRole: 'secondary_admin' },
];

export const gradeAdminRoles = [...new Set([...grades.map(({ adminRole }) => adminRole), 'admin_primary_1_3', 'admin_primary_4_6', 'admin_preparatory', 'admin_secondary', 'admin_university', 'admin_expatriates', 'grade_admin'])];
export const isGradeAdminRole = (role) => gradeAdminRoles.includes(role);
export const isAdminRole = (role) => role === 'admin' || isGradeAdminRole(role);
export const gradeLabel = (id) => grades.find((grade) => grade.id === id)?.label
  || (id === 'primary' ? 'ابتدائي (حساب سابق)' : 'غير محدد');
