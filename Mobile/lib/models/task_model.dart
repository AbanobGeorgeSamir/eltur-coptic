class TaskModel {
  final String id;
  final String title;
  final String description;
  final String studentId;
  final String studentName;
  final String adminName;
  final String dueAt;
  final String completionNote;
  final bool isCompleted;
  final bool isGroupTask;
  final String audienceMode;
  final String grade;
  final String meetingGroup;
  final int completedCount;
  final List<TaskCompletionModel> completions;

  TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.studentId,
    required this.studentName,
    required this.adminName,
    required this.dueAt,
    required this.completionNote,
    required this.isCompleted,
    required this.isGroupTask,
    required this.audienceMode,
    required this.grade,
    required this.meetingGroup,
    required this.completedCount,
    required this.completions,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    String aName = 'الخادم المسؤول';
    if (json['admin'] is Map && json['admin']['name'] != null) {
      aName = json['admin']['name'];
    }
    return TaskModel(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      studentId: json['student'] is Map
          ? (json['student']['_id'] ?? json['student']['id'] ?? '').toString()
          : (json['student']?.toString() ?? ''),
      studentName: json['student'] is Map
          ? (json['student']['name'] ?? '').toString()
          : '',
      adminName: aName,
      dueAt: json['dueAt'] ?? '',
      completionNote: json['completionNote'] ?? '',
      isCompleted: json['completedAt'] != null,
      isGroupTask: json['assignToGroup'] == true,
      audienceMode: (json['audienceMode'] ?? '').toString(),
      grade: (json['grade'] ?? '').toString(),
      meetingGroup: json['meetingGroup'] is Map
          ? (json['meetingGroup']['_id'] ?? json['meetingGroup']['id'] ?? '')
                .toString()
          : (json['meetingGroup'] ?? '').toString(),
      completedCount: (json['completions'] as List?)?.length ?? 0,
      completions: (json['completions'] as List? ?? const [])
          .whereType<Map>()
          .map(
            (completion) => TaskCompletionModel.fromJson(
              Map<String, dynamic>.from(completion),
            ),
          )
          .toList(),
    );
  }
}

class TaskCompletionModel {
  final String studentName;
  final String completionNote;
  final String completedAt;

  const TaskCompletionModel({
    required this.studentName,
    required this.completionNote,
    required this.completedAt,
  });

  factory TaskCompletionModel.fromJson(Map<String, dynamic> json) {
    final student = json['student'] is Map
        ? Map<String, dynamic>.from(json['student'] as Map)
        : const <String, dynamic>{};
    return TaskCompletionModel(
      studentName: (student['name'] ?? student['username'] ?? 'طالب')
          .toString(),
      completionNote: (json['completionNote'] ?? '').toString(),
      completedAt: (json['completedAt'] ?? '').toString(),
    );
  }
}
