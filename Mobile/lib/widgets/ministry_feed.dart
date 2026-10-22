import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/ministry_post_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/roles.dart';
import '../utils/liturgy_schedule.dart';
import '../theme/app_theme.dart';

class MinistryFeed extends StatefulWidget {
  final String title;
  final List<String> types;
  final bool gallery;
  final Widget? header;
  final Widget? floatingActionButton;
  final Object? refreshKey;
  final Future<void> Function(MinistryPostModel post)? onEditPost;
  final Future<void> Function(MinistryPostModel post)? onDeletePost;

  const MinistryFeed({
    super.key,
    required this.title,
    required this.types,
    this.gallery = false,
    this.header,
    this.floatingActionButton,
    this.refreshKey,
    this.onEditPost,
    this.onDeletePost,
  });

  @override
  State<MinistryFeed> createState() => _MinistryFeedState();
}

class _MinistryFeedState extends State<MinistryFeed> {
  List<MinistryPostModel> _posts = [];
  String? _error;
  bool _loading = true;

  bool get _isSchedule => widget.types.contains('liturgy');
  bool get _includeUnpublished =>
      _isSchedule && isAdminRole(AuthService.currentUser?.role);

  bool _isPermanent(MinistryPostModel post) => isPermanentLiturgy(
    liturgyType: post.liturgyType,
    eventAt: post.eventAt,
    startTime: post.startTime,
    endTime: post.endTime,
  );

  DateTime? _scheduleStart(MinistryPostModel post) => DateTime.tryParse(
    post.startAt.isNotEmpty ? post.startAt : post.eventAt,
  )?.toLocal();

  DateTime? _scheduleEnd(MinistryPostModel post) => DateTime.tryParse(
    post.endAt.isNotEmpty ? post.endAt : post.autoDeleteAt,
  )?.toLocal();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant MinistryFeed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshKey != widget.refreshKey) _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final groups = await Future.wait(
        widget.types.map(
          (type) => ApiService.getPosts(
            type: type,
            includeUnpublished: type == 'liturgy' && _includeUnpublished,
          ),
        ),
      );
      final posts = groups.expand((items) => items).toList();
      if (_isSchedule) {
        final now = DateTime.now();
        posts.sort((a, b) {
          if (_isPermanent(a) != _isPermanent(b)) {
            return _isPermanent(a) ? -1 : 1;
          }
          if (_isPermanent(a)) {
            return comparePermanentLiturgies(
              a.dayOfWeek,
              a.startTime,
              a.endTime,
              b.dayOfWeek,
              b.startTime,
              b.endTime,
              now,
            );
          }
          final aDate = _scheduleStart(a);
          final bDate = _scheduleStart(b);
          final aUpcoming = aDate != null && aDate.isAfter(now);
          final bUpcoming = bDate != null && bDate.isAfter(now);
          if (aUpcoming != bUpcoming) return aUpcoming ? -1 : 1;
          if (aDate == null) return bDate == null ? 0 : 1;
          if (bDate == null) return -1;
          return aUpcoming ? aDate.compareTo(bDate) : bDate.compareTo(aDate);
        });
      } else {
        posts.sort((a, b) => b.eventAt.compareTo(a.eventAt));
      }
      if (mounted) {
        setState(() {
          _posts = posts;
          _error = null;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  String _eventLabel(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return 'التاريخ غير محدد';
    final local = date.toLocal();
    const weekdays = [
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
      'الأحد',
    ];
    const months = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    final dayLabel =
        '${weekdays[local.weekday - 1]}، ${local.day} ${months[local.month - 1]} ${local.year}';
    if (!value.contains('T')) return dayLabel;
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final period = local.hour < 12 ? 'ص' : 'م';
    return '$dayLabel · $hour:$minute $period';
  }

  String _timeLabel(String value) {
    final clock = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(value);
    final date = clock == null ? DateTime.tryParse(value)?.toLocal() : null;
    final hour = clock == null ? date?.hour : int.tryParse(clock.group(1)!);
    final minute = clock == null ? date?.minute : int.tryParse(clock.group(2)!);
    if (hour == null || minute == null) return 'الوقت غير محدد';
    final hour12 = hour % 12 == 0 ? 12 : hour % 12;
    return '$hour12:${minute.toString().padLeft(2, '0')} ${hour < 12 ? 'ص' : 'م'}';
  }

  String _weekdayLabel(String value) {
    const labels = {
      'sunday': 'الأحد',
      'monday': 'الإثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة',
      'saturday': 'السبت',
    };
    return labels[value] ?? 'الجمعة';
  }

  String _scheduleDateLabel(DateTime date) {
    const weekdays = [
      'الاثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
      'الأحد',
    ];
    const months = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    return '${weekdays[date.weekday - 1]}، ${date.day} ${months[date.month - 1]} ${date.year}';
  }

  Future<void> _downloadImage(String value) async {
    final parsed = Uri.tryParse(value);
    if (parsed == null || !parsed.hasScheme) return;
    final uri =
        parsed.pathSegments.length >= 2 &&
            parsed.pathSegments[parsed.pathSegments.length - 2] == 'media'
        ? parsed.replace(
            queryParameters: {...parsed.queryParameters, 'download': '1'},
          )
        : parsed;
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تعذر فتح الصورة للتنزيل.')));
    }
  }

  Future<void> _openAttachment(String value) async {
    final uri = Uri.tryParse(value);
    if (uri == null || !['http', 'https'].contains(uri.scheme)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('رابط المرفق غير صالح.')));
      return;
    }
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تعذر فتح المرفق.')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تعذر فتح المرفق.')));
      }
    }
  }

  Widget _mediaAttachment(MinistryPostModel post) {
    final isImage = widget.gallery || post.mediaKind.toLowerCase() == 'image';
    if (isImage) {
      return Image.network(
        post.mediaUrl,
        height: widget.gallery ? 180 : 220,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => SizedBox(
          height: widget.gallery ? 180 : 220,
          child: Center(
            child: OutlinedButton.icon(
              onPressed: () => _openAttachment(post.mediaUrl),
              icon: const Icon(Icons.open_in_new),
              label: const Text('فتح الصورة'),
            ),
          ),
        ),
      );
    }

    final isPdf = post.mediaKind.toLowerCase() == 'pdf';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: OutlinedButton.icon(
        onPressed: () => _openAttachment(post.mediaUrl),
        icon: Icon(isPdf ? Icons.picture_as_pdf_outlined : Icons.link),
        label: Text(isPdf ? 'فتح ملف PDF' : 'فتح المرفق'),
        style: OutlinedButton.styleFrom(
          alignment: AlignmentDirectional.centerStart,
          padding: const EdgeInsets.all(14),
        ),
      ),
    );
  }

  Widget _postCard(MinistryPostModel post) {
    return Card(
      margin: EdgeInsets.only(bottom: _isSchedule ? 8 : 4),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (post.mediaUrl.isNotEmpty) _mediaAttachment(post),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!_isSchedule)
                  Text(
                    post.typeInArabic,
                    style: const TextStyle(
                      color: AppTheme.primaryBurgundy,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                if (_isSchedule) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.lightGold.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.calendar_month_rounded,
                          color: AppTheme.primaryBurgundy,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isPermanent(post)
                                    ? 'قداس دائم'
                                    : 'موعد القداس',
                                style: TextStyle(
                                  color: AppTheme.primaryBurgundy,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                _isPermanent(post)
                                    ? '${_weekdayLabel(post.dayOfWeek)} · وقت البدء: ${post.startTime.isEmpty ? 'غير محدد' : _timeLabel(post.startTime)}'
                                    : _scheduleStart(post) == null
                                    ? 'التاريخ غير محدد'
                                    : '${_scheduleDateLabel(_scheduleStart(post)!)} · ${_timeLabel(post.startAt.isNotEmpty ? post.startAt : post.eventAt)}${_scheduleEnd(post) == null ? '' : ' – ${_timeLabel(post.endAt.isNotEmpty ? post.endAt : post.autoDeleteAt)}'}',
                                style: const TextStyle(
                                  color: AppTheme.deepNavy,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (_isPermanent(post) && post.endTime.isNotEmpty)
                                Text(
                                  'وقت الانتهاء: ${_timeLabel(post.endTime)}',
                                  style: const TextStyle(
                                    color: AppTheme.deepNavy,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              if (_includeUnpublished && !post.published)
                                const Text(
                                  'مخفي عن المستخدمين',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontSize: 12,
                                  ),
                                ),
                              if (_includeUnpublished &&
                                  _scheduleEnd(post) != null &&
                                  !_scheduleEnd(post)!.isAfter(DateTime.now()))
                                const Text(
                                  'انتهى موعد القداس',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                const SizedBox(height: 6),
                Text(
                  post.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.deepNavy,
                  ),
                ),
                if (post.body.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(post.body, style: const TextStyle(height: 1.6)),
                ],
                if (!_isSchedule && post.eventAt.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'الموعد: ${_eventLabel(post.eventAt)}',
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
                if (widget.gallery && post.mediaUrl.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: OutlinedButton.icon(
                      onPressed: () => _downloadImage(post.mediaUrl),
                      icon: const Icon(Icons.download_outlined, size: 18),
                      label: const Text('تنزيل الصورة'),
                    ),
                  ),
                ],
                if (widget.onEditPost != null ||
                    widget.onDeletePost != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.borderColor),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.onEditPost != null)
                          IconButton(
                            tooltip: 'تعديل الموعد',
                            onPressed: () => widget.onEditPost!(post),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                        if (widget.onEditPost != null &&
                            widget.onDeletePost != null)
                          Container(
                            width: 1,
                            height: 28,
                            color: AppTheme.borderColor,
                          ),
                        if (widget.onDeletePost != null)
                          IconButton(
                            tooltip: 'حذف الموعد',
                            onPressed: () => widget.onDeletePost!(post),
                            color: Colors.red.shade700,
                            icon: const Icon(Icons.delete_outline),
                          ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final permanentSchedules = _posts.where(_isPermanent).toList();
    final datedSchedules = _posts
        .where((post) => !_isPermanent(post) && _scheduleStart(post) != null)
        .toList();
    final upcomingSchedules = datedSchedules
        .where((post) => _scheduleStart(post)!.isAfter(now))
        .toList();
    final previousSchedules = datedSchedules
        .where((post) => !_scheduleStart(post)!.isAfter(now))
        .toList();
    final undatedSchedules = _posts
        .where((post) => !_isPermanent(post) && _scheduleStart(post) == null)
        .toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        floatingActionButton: widget.floatingActionButton,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.cloud_off_outlined, size: 36),
                      const SizedBox(height: 10),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: _load,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                ),
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (widget.header != null) widget.header!,
                    if (_isSchedule) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBurgundy.withValues(
                            alpha: 0.08,
                          ),
                          border: Border.all(
                            color: AppTheme.primaryBurgundy.withValues(
                              alpha: 0.16,
                            ),
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: AppTheme.primaryBurgundy,
                            ),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'المواعيد القادمة تظهر أولاً. اسحب الصفحة للأسفل لتحديث القائمة.',
                                style: TextStyle(height: 1.5),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (!_isSchedule && _posts.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(
                          child: Text('لا يوجد محتوى منشور حالياً.'),
                        ),
                      ),
                    if (_isSchedule) ...[
                      if (permanentSchedules.isNotEmpty) ...[
                        Text(
                          'القداسات الدائمة (${permanentSchedules.length})',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...permanentSchedules.map(_postCard),
                        const SizedBox(height: 12),
                      ],
                      const Text(
                        'المواعيد القادمة',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryBurgundy,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (upcomingSchedules.isEmpty)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('لا توجد مواعيد قادمة حالياً.'),
                          ),
                        ),
                      ...upcomingSchedules.map(_postCard),
                      if (previousSchedules.isNotEmpty)
                        ExpansionTile(
                          tilePadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                          ),
                          childrenPadding: const EdgeInsets.only(bottom: 8),
                          title: Text(
                            'المواعيد السابقة (${previousSchedules.length})',
                          ),
                          children: previousSchedules.map(_postCard).toList(),
                        ),
                      if (undatedSchedules.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          'مواعيد تحتاج إلى تحديد التاريخ (${undatedSchedules.length})',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        ...undatedSchedules.map(_postCard),
                      ],
                    ] else
                      ..._posts.map(_postCard),
                  ],
                ),
              ),
      ),
    );
  }
}
