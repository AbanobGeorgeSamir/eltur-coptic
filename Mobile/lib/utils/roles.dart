const gradeAdminRoles = <String>{
  'grade_admin',
  'admin_primary_1_3',
  'admin_primary_4_6',
  'admin_preparatory',
  'admin_secondary',
  'admin_university',
  'admin_expatriates',
  'primary_admin',
  'secondary_admin',
};

bool isGradeAdminRole(String? role) => gradeAdminRoles.contains(role);

bool isAdminRole(String? role) => role == 'admin' || isGradeAdminRole(role);
