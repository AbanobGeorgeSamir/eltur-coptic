class MinistryPostModel {
  static const _productionApiHost = 'eltur-coptic-api-server.vercel.app';

  final String id;
  final String type; // post, event, trip, announcement
  final String title;
  final String body;
  final String mediaUrl;
  final String mediaKind;
  final String eventAt;
  final String liturgyType;
  final String dayOfWeek;
  final String startAt;
  final String endAt;
  final String autoDeleteAt;
  final String startTime;
  final String endTime;
  final String audienceMode;
  final String grade;
  final String meetingGroup;
  final String createdAt;
  final bool published;
  final double feeAmount;
  final String adminName;
  final bool assignToGroup;
  final List<String> assignedStudents;

  MinistryPostModel({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.mediaUrl,
    required this.mediaKind,
    required this.eventAt,
    required this.liturgyType,
    required this.dayOfWeek,
    required this.startAt,
    required this.endAt,
    required this.autoDeleteAt,
    required this.startTime,
    required this.endTime,
    required this.audienceMode,
    required this.grade,
    required this.meetingGroup,
    required this.createdAt,
    required this.published,
    required this.feeAmount,
    required this.adminName,
    required this.assignToGroup,
    required this.assignedStudents,
  });

  factory MinistryPostModel.fromJson(Map<String, dynamic> json) {
    String aName = 'الخدمة الكنسية';
    if (json['admin'] is Map && json['admin']['name'] != null) {
      aName = json['admin']['name'];
    }
    final rawMediaUrl = (json['mediaUrl'] ?? '').toString();
    final parsedMediaUrl = Uri.tryParse(rawMediaUrl);
    final mediaUrl =
        parsedMediaUrl != null &&
            parsedMediaUrl.scheme == 'http' &&
            parsedMediaUrl.host == _productionApiHost
        ? parsedMediaUrl.replace(scheme: 'https').toString()
        : rawMediaUrl;
    final rawFeeAmount = json['feeAmount'];
    final parsedFeeAmount = rawFeeAmount is num
        ? rawFeeAmount.toDouble()
        : double.tryParse(rawFeeAmount?.toString().trim() ?? '');
    return MinistryPostModel(
      id: json['_id'] ?? json['id'] ?? '',
      type: json['type'] ?? 'newsletter',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      mediaUrl: mediaUrl,
      mediaKind:
          json['mediaKind'] ??
          ((json['mediaUrl']
                      ?.toString()
                      .toLowerCase()
                      .split('?')
                      .first
                      .endsWith('.pdf') ??
                  false)
              ? 'pdf'
              : 'image'),
      eventAt: json['eventAt'] ?? '',
      liturgyType: (json['liturgyType'] ?? '').toString(),
      dayOfWeek: (json['dayOfWeek'] ?? 'friday').toString(),
      startAt: (json['startAt'] ?? '').toString(),
      endAt: (json['endAt'] ?? '').toString(),
      autoDeleteAt: (json['autoDeleteAt'] ?? '').toString(),
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      audienceMode: (json['audienceMode'] ?? '').toString(),
      grade: (json['grade'] ?? '').toString(),
      meetingGroup: json['meetingGroup'] is Map
          ? (json['meetingGroup']['_id'] ?? json['meetingGroup']['id'] ?? '')
                .toString()
          : (json['meetingGroup'] ?? '').toString(),
      createdAt: json['createdAt'] ?? '',
      published: json['published'] == true,
      feeAmount: parsedFeeAmount != null &&
              parsedFeeAmount.isFinite &&
              parsedFeeAmount >= 0
          ? parsedFeeAmount
          : 0,
      adminName: aName,
      assignToGroup: json['assignToGroup'] != false,
      assignedStudents: (json['assignedStudents'] as List? ?? const [])
          .map(
            (student) => student is Map
                ? (student['_id'] ?? student['id'] ?? '').toString()
                : student.toString(),
          )
          .where((id) => id.isNotEmpty)
          .toList(),
    );
  }

  String get typeInArabic {
    switch (type) {
      case 'newsletter':
        return 'نشرة وإعلان';
      case 'sunday_lesson':
        return 'درس مدارس الأحد';
      case 'trip':
        return 'رحلة';
      case 'liturgy':
        return 'مواعيد القداسات';
      case 'gallery':
        return 'معرض صور';
      case 'agpeya':
        return 'الأجبية';
      case 'bible':
        return 'قراءة كتابية';
      case 'psalm':
        return 'مزمور';
      default:
        return type;
    }
  }
}
