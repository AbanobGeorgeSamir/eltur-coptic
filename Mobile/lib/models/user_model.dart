class UserModel {
  final String id;
  final String name;
  final String username;
  final String email;
  final String interests;
  final String phone;
  final String role; // admin, primary_admin, secondary_admin, student, parent
  final String roleLabel;
  final String grade;
  final String academicYear;
  final String college;
  final String country;
  final String governorate;
  final String meetingGroup;
  final String? assignedAdmin;
  final String fullNameArabic;
  final String confessionFather;
  final String address;
  final String fatherName;
  final String parentPhone;
  final String picture;
  final String birthDate;
  final String gender;
  final String nationalId;
  final bool isDeacon;
  final String whatsappNumber;
  final bool privacyPolicyAccepted;
  final String? childStudentId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is UserModel && id.isNotEmpty && other.id == id);

  @override
  int get hashCode => id.hashCode;

  UserModel({
    required this.id,
    required this.name,
    required this.username,
    required this.email,
    required this.interests,
    required this.phone,
    required this.role,
    this.roleLabel = '',
    required this.grade,
    this.academicYear = '',
    this.college = '',
    this.country = '',
    this.governorate = '',
    required this.meetingGroup,
    this.assignedAdmin,
    required this.fullNameArabic,
    required this.confessionFather,
    required this.address,
    required this.fatherName,
    required this.parentPhone,
    required this.picture,
    required this.birthDate,
    required this.gender,
    required this.nationalId,
    required this.isDeacon,
    required this.whatsappNumber,
    required this.privacyPolicyAccepted,
    this.childStudentId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      interests: json['interests'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'student',
      roleLabel: (json['roleLabel'] ?? '').toString(),
      grade: json['grade'] ?? '',
      academicYear: json['academicYear'] ?? '',
      college: json['college'] ?? '',
      country: json['country'] ?? '',
      governorate: json['governorate'] ?? '',
      meetingGroup: json['meetingGroup'] is Map
          ? (json['meetingGroup']['_id'] ?? json['meetingGroup']['id'] ?? '')
                .toString()
          : (json['meetingGroup'] ?? '').toString(),
      assignedAdmin: json['assignedAdmin'] is Map
          ? json['assignedAdmin']['_id']
          : json['assignedAdmin']?.toString(),
      fullNameArabic: json['fullNameArabic'] ?? json['name'] ?? '',
      confessionFather: json['confessionFather'] ?? '',
      address: json['address'] ?? '',
      fatherName: json['fatherName'] ?? '',
      parentPhone: json['guardianPhone'] ?? json['parentPhone'] ?? '',
      picture: json['picture'] ?? '',
      birthDate: json['birthDate'] ?? '',
      gender: json['gender'] ?? 'male',
      nationalId: json['nationalId'] ?? '',
      isDeacon: json['isDeacon'] == true,
      whatsappNumber: json['whatsappNumber'] ?? json['phone'] ?? '',
      privacyPolicyAccepted:
          json['privacyAcceptedAt'] != null ||
          json['privacyPolicyAccepted'] == true,
      childStudentId: json['childStudentId'] is Map
          ? json['childStudentId']['_id']
          : json['childStudentId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'username': username,
      'email': email,
      'interests': interests,
      'phone': phone,
      'role': role,
      'roleLabel': roleLabel,
      'grade': grade,
      'academicYear': academicYear,
      'college': college,
      'country': country,
      'governorate': governorate,
      'meetingGroup': meetingGroup,
      'assignedAdmin': assignedAdmin,
      'fullNameArabic': fullNameArabic,
      'confessionFather': confessionFather,
      'address': address,
      'fatherName': fatherName,
      'guardianPhone': parentPhone,
      'picture': picture,
      'birthDate': birthDate,
      'gender': gender,
      'nationalId': nationalId,
      'isDeacon': isDeacon,
      'whatsappNumber': whatsappNumber,
      'privacyAcceptedAt': privacyPolicyAccepted ? true : null,
      'childStudentId': childStudentId,
    };
  }

  Map<String, dynamic> toSessionCacheJson() => {
    '_id': id,
    'name': name,
    'username': username,
    'role': role,
    'roleLabel': roleLabel,
    'grade': grade,
    'academicYear': academicYear,
    'college': college,
    'country': country,
    'governorate': governorate,
    'meetingGroup': meetingGroup,
    'assignedAdmin': assignedAdmin,
  };

  String get roleInArabic {
    if (roleLabel.isNotEmpty) return roleLabel;
    if (role.startsWith('admin_') ||
        role == 'primary_admin' ||
        role == 'secondary_admin' ||
        role == 'grade_admin') {
      return 'مسؤول مرحلة';
    }
    switch (role) {
      case 'admin':
        return 'مسؤول خدمة (أمين عام)';
      case 'grade_admin':
        return 'مسؤول مرحلة';
      case 'servant':
        return 'خادم إعدادي خدمة';
      case 'parent':
        return 'ولي أمر (أب/أم)';
      case 'student':
      default:
        return 'المخدوم';
    }
  }

  String get gradeInArabic {
    switch (grade) {
      case 'primary_1_3':
        return 'المرحلة الابتدائية الأولى (من الصف الأول إلى الصف الثالث الابتدائي)';
      case 'primary_4_6':
        return 'المرحلة الابتدائية الثانية (من الصف الرابع إلى الصف السادس الابتدائي)';
      case 'primary':
        return 'ابتدائي (حساب سابق)';
      case 'preparatory':
        return 'المرحلة الإعدادية';
      case 'secondary':
        return 'المرحلة الثانوية';
      case 'university':
        return 'المرحلة الجامعية';
      case 'expatriates':
        return 'مرحلة المغتربين';
      default:
        return '';
    }
  }

  bool get isExpatriate => grade == 'expatriates';
}
