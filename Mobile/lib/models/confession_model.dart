class ConfessionModel {
  final String id;
  final String studentId;
  final String studentName;
  final String adminId;
  final String adminName;
  final String date;
  final String note;

  ConfessionModel({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.adminId,
    required this.adminName,
    required this.date,
    required this.note,
  });

  factory ConfessionModel.fromJson(Map<String, dynamic> json) {
    String aName = 'أب الاعتراف';
    if (json['admin'] is Map && json['admin']['name'] != null) {
      aName = json['admin']['name'];
    }
    return ConfessionModel(
      id: json['_id'] ?? json['id'] ?? '',
      studentId: json['student'] is Map
          ? (json['student']['_id'] ?? json['student']['id'] ?? '').toString()
          : (json['student']?.toString() ?? ''),
      studentName: json['student'] is Map
          ? (json['student']['name'] ?? '').toString()
          : '',
      adminId: json['admin'] is Map
          ? (json['admin']['_id'] ?? json['admin']['id'] ?? '').toString()
          : (json['admin']?.toString() ?? ''),
      adminName: aName,
      date: (json['date'] ?? '').toString(),
      note: json['note'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'student': studentId, 'admin': adminId, 'date': date, 'note': note};
  }
}
