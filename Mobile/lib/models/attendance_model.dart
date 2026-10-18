class AttendanceModel {
  final String id;
  final String studentId;
  final String adminId;
  final String date;
  final String service;
  final String status; // present, absent, excused
  final String note;

  AttendanceModel({
    required this.id,
    required this.studentId,
    required this.adminId,
    required this.date,
    required this.service,
    required this.status,
    required this.note,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['_id'] ?? json['id'] ?? '',
      studentId: json['student'] is Map
          ? (json['student']['_id'] ?? json['student']['id'] ?? '').toString()
          : (json['student']?.toString() ?? ''),
      adminId: json['admin'] is Map
          ? (json['admin']['_id'] ?? json['admin']['id'] ?? '').toString()
          : (json['admin']?.toString() ?? ''),
      date: (json['date'] ?? '').toString(),
      service: json['service'] ?? 'إعدادي خدمة',
      status: json['status'] ?? 'present',
      note: json['note'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'student': studentId,
      'admin': adminId,
      'date': date,
      'service': service,
      'status': status,
      'note': note,
    };
  }

  String get statusInArabic {
    switch (status) {
      case 'present':
        return 'حاضر';
      case 'absent':
        return 'غائب';
      case 'excused':
        return 'بعذر';
      case 'late':
        return 'متأخر';
      default:
        return 'حاضر';
    }
  }
}
