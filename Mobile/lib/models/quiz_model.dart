class QuizQuestion {
  final String questionText;
  final List<String> options;
  final int correctAnswerIndex;

  QuizQuestion({
    required this.questionText,
    required this.options,
    required this.correctAnswerIndex,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      questionText: json['prompt'] ?? json['questionText'] ?? '',
      options: List<String>.from(json['options'] ?? []),
      correctAnswerIndex:
          json['answerIndex'] ?? json['correctAnswerIndex'] ?? -1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'prompt': questionText,
      'options': options,
      'answerIndex': correctAnswerIndex,
    };
  }
}

class QuizModel {
  final String id;
  final String title;
  final String description;
  final List<QuizQuestion> questions;
  final bool published;
  final String audienceMode;
  final String grade;
  final String meetingGroup;

  QuizModel({
    required this.id,
    required this.title,
    required this.description,
    required this.questions,
    required this.published,
    required this.audienceMode,
    required this.grade,
    required this.meetingGroup,
  });

  factory QuizModel.fromJson(Map<String, dynamic> json) {
    var qList = json['questions'] as List? ?? [];
    return QuizModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      questions: qList.map((q) => QuizQuestion.fromJson(q)).toList(),
      published: json['published'] == true,
      audienceMode: (json['audienceMode'] ?? '').toString(),
      grade: (json['grade'] ?? '').toString(),
      meetingGroup: json['meetingGroup'] is Map
          ? (json['meetingGroup']['_id'] ?? json['meetingGroup']['id'] ?? '')
                .toString()
          : (json['meetingGroup'] ?? '').toString(),
    );
  }
}

class QuizAttemptModel {
  final String id;
  final String quizId;
  final String quizTitle;
  final int score;
  final int total;
  final String submittedAt;

  QuizAttemptModel({
    required this.id,
    required this.quizId,
    required this.quizTitle,
    required this.score,
    required this.total,
    required this.submittedAt,
  });

  factory QuizAttemptModel.fromJson(Map<String, dynamic> json) {
    String qTitle = 'اختبار كنسي';
    String qId = '';
    if (json['quiz'] is Map && json['quiz']['title'] != null) {
      qTitle = json['quiz']['title'];
    }
    if (json['quiz'] is Map) {
      qId = (json['quiz']['_id'] ?? json['quiz']['id'] ?? '').toString();
    } else {
      qId = (json['quiz'] ?? json['quizId'] ?? '').toString();
    }
    return QuizAttemptModel(
      id: json['_id'] ?? json['id'] ?? '',
      quizId: qId,
      quizTitle: qTitle,
      score: json['score'] ?? 0,
      total: json['total'] ?? 0,
      submittedAt: json['submittedAt'] ?? '',
    );
  }
}

class QuizResultModel {
  final String id;
  final String studentName;
  final String studentUsername;
  final int score;
  final int total;
  final String submittedAt;

  const QuizResultModel({
    required this.id,
    required this.studentName,
    required this.studentUsername,
    required this.score,
    required this.total,
    required this.submittedAt,
  });

  factory QuizResultModel.fromJson(Map<String, dynamic> json) {
    final student = json['student'] is Map
        ? Map<String, dynamic>.from(json['student'] as Map)
        : const <String, dynamic>{};
    return QuizResultModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      studentName: (student['name'] ?? '').toString(),
      studentUsername: (student['username'] ?? '').toString(),
      score: (json['score'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
      submittedAt: (json['submittedAt'] ?? '').toString(),
    );
  }

  String get displayName => studentName.isNotEmpty
      ? studentName
      : (studentUsername.isNotEmpty ? studentUsername : '—');
}
