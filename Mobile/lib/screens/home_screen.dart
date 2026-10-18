import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import '../models/confession_model.dart';
import '../models/attendance_model.dart';
import '../models/ministry_post_model.dart';
import '../models/task_model.dart';
import '../theme/app_theme.dart';
import '../utils/roles.dart';
import '../utils/liturgy_schedule.dart';
import '../widgets/church_date_card.dart';
import '../widgets/fathers_section.dart';
import 'agpeya_screen.dart';
import 'bible_screen.dart';
import 'prayer_checklist_screen.dart';
import 'sunday_school_screen.dart';
import 'liturgy_screen.dart';
import 'newsletters_screen.dart';
import 'gallery_screen.dart';
import 'quiz_screen.dart';
import 'tasks_screen.dart';
import 'attendance_screen.dart';
import 'confession_screen.dart';
import 'trips_screen.dart';
import 'profile_screen.dart';
import 'public_home_screen.dart';
import 'featured_verse_screen.dart';
import 'student_management_screen.dart';
import 'parent_dashboard_screen.dart';
import 'admin_access_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  ConfessionModel? _lastConfession;
  List<AttendanceModel> _attendanceHistory = [];
  UserModel? _childStudent;
  List<UserModel> _children = [];
  Map<String, dynamic> _attendanceSummary = {};
  List<MinistryPostModel> _dailyReadings = [];
  List<MinistryPostModel> _newsPosts = [];
  List<MinistryPostModel> _upcomingLiturgies = [];
  int _openTaskCount = 0;
  Map<String, dynamic>? _featuredVerse;
  bool _isLoading = true;
  bool _refreshingLiturgies = false;
  bool _notificationPopupShown = false;
  String? _liturgyError;
  String? _dashboardError;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    final currentUser = AuthService.currentUser;
    var partialFailure = false;
    try {
      final initialResults = await Future.wait([
        ApiService.getPosts(type: 'bible').catchError((_) {
          partialFailure = true;
          return <MinistryPostModel>[];
        }),
        ApiService.getPosts(type: 'psalm').catchError((_) {
          partialFailure = true;
          return <MinistryPostModel>[];
        }),
        ApiService.getPosts(type: 'newsletter').catchError((_) {
          partialFailure = true;
          return <MinistryPostModel>[];
        }),
        ApiService.getPosts(type: 'liturgy').catchError((_) {
          partialFailure = true;
          return <MinistryPostModel>[];
        }),
        ApiService.getStudentTasks(currentUser?.id ?? '').catchError((_) {
          partialFailure = true;
          return <TaskModel>[];
        }),
        ApiService.getAttendanceSummary().catchError((_) {
          partialFailure = true;
          return <String, dynamic>{};
        }),
        ApiService.getFeaturedVerse().catchError((_) {
          partialFailure = true;
          return null;
        }),
      ]);
      final readings = [
        ...(initialResults[0] as List<MinistryPostModel>),
        ...(initialResults[1] as List<MinistryPostModel>),
      ];
      final newsPosts = initialResults[2] as List<MinistryPostModel>;
      final liturgies = initialResults[3] as List<MinistryPostModel>;
      final tasks = initialResults[4] as List<TaskModel>;
      final attendanceSummary = initialResults[5] as Map<String, dynamic>;
      final featuredVerse = initialResults[6] as Map<String, dynamic>?;
      ConfessionModel? confession;
      List<AttendanceModel> attendances = [];
      UserModel? child;
      List<UserModel> children = [];
      if (currentUser?.role == 'student') {
        final personalResults = await Future.wait<dynamic>([
          ApiService.getLastConfession(currentUser!.id).catchError((_) {
            partialFailure = true;
            return null;
          }),
          ApiService.getStudentAttendance(currentUser.id).catchError((_) {
            partialFailure = true;
            return <AttendanceModel>[];
          }),
        ]);
        confession = personalResults[0] as ConfessionModel?;
        attendances = personalResults[1] as List<AttendanceModel>;
      } else if (currentUser?.role == 'parent') {
        final parentRecords = await ApiService.getParentDashboard().catchError((
          _,
        ) {
          partialFailure = true;
          return <Map<String, dynamic>>[];
        });
        final validParentRecords = parentRecords
            .where((record) => record['student'] is Map)
            .toList();
        children = validParentRecords
            .map(
              (record) => UserModel.fromJson(
                Map<String, dynamic>.from(record['student'] as Map),
              ),
            )
            .toList();
        if (children.isNotEmpty) {
          child = children.first;
          final childRecord = validParentRecords.first;
          final latestConfession = childRecord['latestConfession'];
          if (latestConfession is Map) {
            confession = ConfessionModel.fromJson(
              Map<String, dynamic>.from(latestConfession),
            );
          }
          final attendance = childRecord['attendance'];
          if (attendance is List) {
            attendances = attendance
                .whereType<Map>()
                .map(
                  (record) => AttendanceModel.fromJson(
                    Map<String, dynamic>.from(record),
                  ),
                )
                .toList();
          }
        }
      }
      if (mounted) {
        setState(() {
          _dailyReadings = readings;
          _newsPosts = newsPosts.take(3).toList();
          _upcomingLiturgies = _sortUpcomingLiturgies(
            liturgies,
          ).take(2).toList();
          _openTaskCount = tasks.where((task) => !task.isCompleted).length;
          _lastConfession = confession;
          _attendanceHistory = attendances;
          _childStudent = child;
          _children = children;
          _attendanceSummary = attendanceSummary;
          _featuredVerse = featuredVerse;
          _dashboardError = partialFailure
              ? 'تعذر تحديث بعض البيانات. اسحب الشاشة للأسفل لإعادة المحاولة.'
              : null;
          _isLoading = false;
        });
        _showNotificationPopup();
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _dashboardError = error.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _showNotificationPopup() async {
    if (_notificationPopupShown) return;
    _notificationPopupShown = true;
    try {
      final notifications = await ApiService.getNotifications();
      if (!mounted || notifications.isEmpty) return;
      final latest = notifications.first;
      final title = latest['title']?.toString().trim();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            title?.isNotEmpty == true
                ? 'تحديث جديد: $title'
                : 'لديك تحديث جديد للآية للجميع.',
          ),
          duration: const Duration(seconds: 6),
          action: SnackBarAction(
            label: 'عرض',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
        ),
      );
    } catch (_) {
      // A missing popup must not block the dashboard from loading.
    }
  }

  List<MinistryPostModel> _sortUpcomingLiturgies(
    List<MinistryPostModel> liturgies,
  ) {
    final now = DateTime.now();
    bool isPermanent(MinistryPostModel post) => isPermanentLiturgy(
      liturgyType: post.liturgyType,
      eventAt: post.eventAt,
      startTime: post.startTime,
      endTime: post.endTime,
    );

    final upcoming = liturgies.where((post) {
      if (isPermanent(post)) return true;
      final date = DateTime.tryParse(
        post.startAt.isNotEmpty ? post.startAt : post.eventAt,
      )?.toLocal();
      return date == null || !date.isBefore(now);
    }).toList();
    upcoming.sort((a, b) {
      final aPermanent = isPermanent(a);
      final bPermanent = isPermanent(b);
      if (aPermanent != bPermanent) return aPermanent ? -1 : 1;
      if (aPermanent) {
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
      final aDate = DateTime.tryParse(
        a.startAt.isNotEmpty ? a.startAt : a.eventAt,
      );
      final bDate = DateTime.tryParse(
        b.startAt.isNotEmpty ? b.startAt : b.eventAt,
      );
      if (aDate == null) return bDate == null ? 0 : 1;
      if (bDate == null) return -1;
      return aDate.compareTo(bDate);
    });
    return upcoming;
  }

  Future<void> _refreshLiturgies() async {
    setState(() {
      _refreshingLiturgies = true;
      _liturgyError = null;
    });
    try {
      final liturgies = await ApiService.getPosts(type: 'liturgy');
      if (mounted) {
        setState(() {
          _upcomingLiturgies = _sortUpcomingLiturgies(
            liturgies,
          ).take(2).toList();
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _liturgyError = error.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _refreshingLiturgies = false);
    }
  }

  String _formatLiturgyDate(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return 'التاريخ غير محدد';
    final local = date.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final time = value.contains('T')
        ? ' · ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}'
        : '';
    return '$day/$month/${local.year}$time';
  }

  String _formatLiturgyTime(String value) {
    final clock = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(value);
    final date = clock == null ? DateTime.tryParse(value)?.toLocal() : null;
    final hour = clock == null ? date?.hour : int.tryParse(clock.group(1)!);
    final minute = clock == null ? date?.minute : int.tryParse(clock.group(2)!);
    if (hour == null || minute == null) return 'الوقت غير محدد';
    return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
  }

  Future<void> _openMedia(MinistryPostModel post) async {
    final uri = Uri.tryParse(post.mediaUrl);
    if (uri == null || !['http', 'https'].contains(uri.scheme)) return;
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تعذر فتح المرفق.')));
    }
  }

  Widget _buildPostMedia(MinistryPostModel post) {
    if (post.mediaUrl.isEmpty) return const SizedBox.shrink();
    if (post.mediaKind.toLowerCase() == 'image') {
      return Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Image.network(
          post.mediaUrl,
          height: 190,
          width: double.infinity,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => TextButton.icon(
            onPressed: () => _openMedia(post),
            icon: const Icon(Icons.open_in_new),
            label: const Text('فتح الصورة'),
          ),
        ),
      );
    }
    final isPdf = post.mediaKind.toLowerCase() == 'pdf';
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: TextButton.icon(
        onPressed: () => _openMedia(post),
        icon: Icon(isPdf ? Icons.picture_as_pdf_outlined : Icons.link),
        label: Text(isPdf ? 'فتح ملف PDF' : 'فتح الرابط'),
      ),
    );
  }

  Widget _buildTaskSummary(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.checklist_rounded)),
        title: const Text('المهام غير المكتملة'),
        subtitle: Text('$_openTaskCount'),
        trailing: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const TasksScreen())),
      ),
    );
  }

  Widget _buildLiturgyHighlights() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'مواعيد القداسات',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            IconButton(
              tooltip: 'تحديث المواعيد',
              onPressed: _refreshingLiturgies ? null : _refreshLiturgies,
              icon: _refreshingLiturgies
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh_rounded),
            ),
            TextButton(
              onPressed: () => Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => const LiturgyScreen())),
              child: const Text('عرض الكل'),
            ),
          ],
        ),
        if (_liturgyError != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _liturgyError!,
              style: const TextStyle(color: Colors.red),
            ),
          ),
        if (_upcomingLiturgies.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('لا توجد مواعيد قادمة منشورة حالياً.'),
            ),
          )
        else
          ..._upcomingLiturgies.map((post) {
            final permanent = isPermanentLiturgy(
              liturgyType: post.liturgyType,
              eventAt: post.eventAt,
              startTime: post.startTime,
              endTime: post.endTime,
            );
            final startValue = post.startAt.isNotEmpty
                ? post.startAt
                : post.eventAt;
            final endValue = post.endAt.isNotEmpty
                ? post.endAt
                : post.autoDeleteAt;
            final scheduleLabel = permanent
                ? 'قداس دائم · البدء ${post.startTime.isEmpty ? 'غير محدد' : _formatLiturgyTime(post.startTime)} · الانتهاء ${post.endTime.isEmpty ? 'غير محدد' : _formatLiturgyTime(post.endTime)}'
                : '${_formatLiturgyDate(startValue)}${startValue.contains('T') ? ' · ${_formatLiturgyTime(startValue)}' : ''}${endValue.isEmpty ? '' : ' – ${_formatLiturgyTime(endValue)}'}';
            return Card(
              child: ListTile(
                leading: const Icon(
                  Icons.calendar_month_rounded,
                  color: AppTheme.primaryBurgundy,
                ),
                title: Text(post.title),
                subtitle: Text(
                  '$scheduleLabel${post.body.isEmpty ? '' : '\n${post.body}'}',
                ),
                isThreeLine: post.body.isNotEmpty,
              ),
            );
          }),
      ],
    );
  }

  Widget _buildNewsHighlights() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'آخر الإعلانات',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NewslettersScreen()),
              ),
              child: const Text('عرض الكل'),
            ),
          ],
        ),
        if (_newsPosts.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('لا توجد إعلانات منشورة حالياً.'),
            ),
          )
        else
          ..._newsPosts.map(
            (post) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (post.createdAt.isNotEmpty)
                      Text(
                        _formatLiturgyDate(post.createdAt),
                        style: const TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      post.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryBurgundy,
                      ),
                    ),
                    if (post.body.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(post.body, style: const TextStyle(height: 1.5)),
                    ],
                    _buildPostMedia(post),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Map<String, dynamic>? _studentAttendanceSummary(String? studentId) {
    if (studentId == null) return null;
    final entries = _attendanceSummary['students'];
    if (entries is! List) return null;
    for (final entry in entries) {
      if (entry is Map && entry['studentId']?.toString() == studentId) {
        return Map<String, dynamic>.from(entry);
      }
    }
    return null;
  }

  String _attendancePercentage(Object? rawValue) {
    if (rawValue is! num) return '—';
    final value = rawValue.toDouble();
    return '${value == value.roundToDouble() ? value.toStringAsFixed(0) : value.toStringAsFixed(1)}%';
  }

  Widget _buildAttendanceOverview(UserModel? user) {
    final rawOverall = _attendanceSummary['overall'];
    final overall = rawOverall is Map
        ? Map<String, dynamic>.from(rawOverall)
        : null;
    final roleLabel = user?.role == 'student'
        ? 'نسبة حضورك'
        : user?.role == 'parent'
        ? 'متوسط حضور الأبناء'
        : 'متوسط حضور المجموعة';
    final attended = overall?['attended'] ?? 0;
    final total = overall?['total'] ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 20,
          runSpacing: 12,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  roleLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryBurgundy,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _attendancePercentage(overall?['percentage']),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryBurgundy,
                  ),
                ),
              ],
            ),
            Text(
              '$attended من $total سجلاً محتسباً',
              style: const TextStyle(color: AppTheme.textMuted),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchWhatsApp() async {
    try {
      final contact = await ApiService.getContact();
      final url = contact['whatsappUrl']?.toString();
      if (url == null || url.isEmpty) {
        throw Exception('رقم واتساب الكنيسة غير مهيأ في الخادم.');
      }
      final baseUri = Uri.parse(url);
      final uri = baseUri.replace(
        queryParameters: {
          ...baseUri.queryParameters,
          'text': 'سلام ونعمة، استفسار عن الخدمة',
        },
      );
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw Exception('تعذر فتح واتساب على هذا الجهاز.');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    }
  }

  void _openPrimaryDestination(int index) {
    Widget? destination;
    switch (index) {
      case 1:
        destination = const BibleScreen();
        break;
      case 2:
        destination = const AgpeyaScreen();
        break;
      case 3:
        destination = const TasksScreen();
        break;
      case 4:
        _openMoreServices();
        return;
      default:
        return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => destination!));
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;
    final isWideLayout = MediaQuery.sizeOf(context).width >= 840;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 72,
          title: Row(
            children: [
              ClipOval(
                child: Image.asset(
                  'resources/images/kenesa.jpeg',
                  width: 40,
                  height: 40,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Semantics(
                  label: 'كنيسة موسي النبي ومارمرقس الرسول',
                  child: Text(
                    'كنيسة موسي النبي ومارمرقس الرسول',
                    maxLines: 2,
                    style: const TextStyle(fontSize: 14, height: 1.15),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.person),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () async {
                await ApiService.logout();
                if (!context.mounted) return;
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const PublicHomeScreen()),
                );
              },
            ),
          ],
        ),
        bottomNavigationBar: isWideLayout
            ? null
            : NavigationBar(
                selectedIndex: 0,
                onDestinationSelected: _openPrimaryDestination,
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.home_outlined),
                    selectedIcon: Icon(Icons.home_rounded),
                    label: 'الرئيسية',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.menu_book_outlined),
                    selectedIcon: Icon(Icons.menu_book_rounded),
                    label: 'الإنجيل',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.auto_stories_outlined),
                    selectedIcon: Icon(Icons.auto_stories_rounded),
                    label: 'الأجبية',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.checklist_rounded),
                    selectedIcon: Icon(Icons.checklist_rounded),
                    label: 'المهام',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.grid_view_rounded),
                    selectedIcon: Icon(Icons.grid_view_rounded),
                    label: 'المزيد',
                  ),
                ],
              ),
        body: LayoutBuilder(
          builder: (context, constraints) {
            final dashboard = _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadDashboardData,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 1120),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (_dashboardError != null)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppTheme.lightGold,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: AppTheme.accentGold.withValues(
                                        alpha: 0.6,
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Icon(
                                        Icons.sync_problem_outlined,
                                        color: AppTheme.primaryBurgundy,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          _dashboardError!,
                                          style: const TextStyle(
                                            color: AppTheme.deepNavy,
                                            height: 1.4,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              // User Welcome Banner
                              Card(
                                color: AppTheme.primaryBurgundy,
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 28,
                                        backgroundColor: AppTheme.accentGold,
                                        foregroundImage:
                                            user?.picture.isNotEmpty == true
                                            ? NetworkImage(user!.picture)
                                            : null,
                                        child: Text(
                                          user?.name.isNotEmpty == true
                                              ? user!.name[0]
                                              : 'C',
                                          style: const TextStyle(
                                            fontSize: 24,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.darkBurgundy,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'أهلاً بك: ${user?.fullNameArabic.isNotEmpty == true ? user!.fullNameArabic : user?.name}',
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.accentGold,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              user?.roleInArabic ?? '',
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: Colors.white70,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              const ChurchDateCard(),
                              const SizedBox(height: 12),
                              _buildAttendanceOverview(user),
                              const SizedBox(height: 16),
                              _buildTaskSummary(context),
                              const SizedBox(height: 16),

                              const FathersSection(),
                              const SizedBox(height: 16),

                              Card(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: const BorderSide(
                                    color: AppTheme.accentGold,
                                    width: 2,
                                  ),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(
                                            Icons.menu_book,
                                            color: AppTheme.primaryBurgundy,
                                            size: 28,
                                          ),
                                          SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'القراءات اليومية (الإنجيل والمزمور)',
                                              style: TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.primaryBurgundy,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const Divider(height: 20),
                                      if (_dailyReadings.isEmpty)
                                        const Text(
                                          'لا توجد قراءات منشورة حالياً.',
                                        )
                                      else
                                        ..._dailyReadings.map(
                                          (reading) => Padding(
                                            padding: const EdgeInsets.only(
                                              bottom: 12,
                                            ),
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  reading.title,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    color:
                                                        AppTheme.darkBurgundy,
                                                  ),
                                                ),
                                                if (reading.body.isNotEmpty)
                                                  Padding(
                                                    padding:
                                                        const EdgeInsets.only(
                                                          top: 4,
                                                        ),
                                                    child: Text(
                                                      reading.body,
                                                      style: const TextStyle(
                                                        fontSize: 14,
                                                        height: 1.5,
                                                      ),
                                                    ),
                                                  ),
                                                _buildPostMedia(reading),
                                              ],
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                              if (_featuredVerse?['text'] is String &&
                                  (_featuredVerse!['text'] as String)
                                      .isNotEmpty) ...[
                                const SizedBox(height: 12),
                                Card(
                                  color: AppTheme.deepNavy,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18),
                                    side: const BorderSide(
                                      color: AppTheme.accentGold,
                                    ),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'آية للجميع',
                                          style: TextStyle(
                                            color: AppTheme.accentGold,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          '«${_featuredVerse!['text']}»',
                                          style: const TextStyle(
                                            fontSize: 17,
                                            height: 1.8,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          _featuredVerse!['reference']
                                                  ?.toString() ??
                                              '',
                                          style: const TextStyle(
                                            color: AppTheme.accentGold,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              _buildLiturgyHighlights(),
                              const SizedBox(height: 16),
                              _buildNewsHighlights(),
                              const SizedBox(height: 20),

                              // Quick Access Services Grid
                              const Text(
                                'خدمات وأقسام التطبيق الكنسي:',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.deepNavy,
                                ),
                              ),
                              const SizedBox(height: 12),

                              LayoutBuilder(
                                builder: (context, constraints) {
                                  final columns = constraints.maxWidth >= 720
                                      ? 4
                                      : constraints.maxWidth >= 480
                                      ? 3
                                      : 2;
                                  return GridView.count(
                                    shrinkWrap: true,
                                    physics:
                                        const NeverScrollableScrollPhysics(),
                                    crossAxisCount: columns,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10,
                                    childAspectRatio: constraints.maxWidth < 360
                                        ? 1.05
                                        : 1.15,
                                    children: [
                                      _buildServiceTile(
                                        icon: Icons.auto_stories,
                                        title: 'الأجبية',
                                        color: AppTheme.primaryBurgundy,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const AgpeyaScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.menu_book,
                                        title: 'الإنجيل',
                                        color: AppTheme.darkBurgundy,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => const BibleScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.checklist,
                                        title: 'صلوات اليوم',
                                        color: Colors.deepOrange.shade700,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const PrayerChecklistScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.school,
                                        title: 'مدارس الأحد',
                                        color: Colors.blue.shade800,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const SundaySchoolScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.church,
                                        title: 'القداس الإلهي',
                                        color: Colors.purple.shade800,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const LiturgyScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.assignment_outlined,
                                        title: 'المهام',
                                        color: Colors.teal.shade800,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => const TasksScreen(),
                                          ),
                                        ),
                                      ),
                                      if (user?.role == 'student' ||
                                          isAdminRole(user?.role))
                                        _buildServiceTile(
                                          icon: Icons.quiz,
                                          title: 'اختبارات MCQs',
                                          color: Colors.amber.shade900,
                                          onTap: () =>
                                              Navigator.of(context).push(
                                                MaterialPageRoute(
                                                  builder: (_) =>
                                                      const QuizScreen(),
                                                ),
                                              ),
                                        ),
                                      _buildServiceTile(
                                        icon: Icons.directions_bus,
                                        title: 'الرحلات والأخبار',
                                        color: Colors.indigo.shade800,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const NewslettersScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.collections,
                                        title: 'معرض الصور',
                                        color: Colors.brown.shade700,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const GalleryScreen(),
                                          ),
                                        ),
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.chat,
                                        title: 'تواصل واتساب',
                                        color: Colors.green.shade700,
                                        onTap: _launchWhatsApp,
                                      ),
                                      _buildServiceTile(
                                        icon: Icons.badge,
                                        title: 'الملف الشخصي',
                                        color: AppTheme.darkBurgundy,
                                        onTap: () => Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const ProfileScreen(),
                                          ),
                                        ),
                                      ),
                                      if (user?.role == 'admin')
                                        _buildServiceTile(
                                          icon: Icons.format_quote,
                                          title: 'الآية للجميع',
                                          color: AppTheme.primaryBurgundy,
                                          onTap: () => Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  const FeaturedVerseScreen(),
                                            ),
                                          ),
                                        ),
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(height: 24),

                              // DYNAMIC ROLE DASHBOARD
                              if (user?.role == 'parent') ...[
                                // Requirement 15: Parent Account Panel
                                _buildParentPanel(),
                              ] else if (user?.role == 'student') ...[
                                // Student Panel
                                _buildStudentPanel(),
                              ] else if (isAdminRole(user?.role)) ...[
                                // Servant / Admin Panel (Requirement 1 & 3)
                                _buildServantAdminPanel(),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  );

            if (constraints.maxWidth < 840) return dashboard;
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                NavigationRail(
                  selectedIndex: 0,
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: Theme.of(context).colorScheme.surface,
                  onDestinationSelected: _openPrimaryDestination,
                  destinations: const [
                    NavigationRailDestination(
                      icon: Icon(Icons.home_outlined),
                      selectedIcon: Icon(Icons.home_rounded),
                      label: Text('الرئيسية'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.menu_book_outlined),
                      selectedIcon: Icon(Icons.menu_book_rounded),
                      label: Text('الإنجيل'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.auto_stories_outlined),
                      selectedIcon: Icon(Icons.auto_stories_rounded),
                      label: Text('الأجبية'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.checklist_rounded),
                      selectedIcon: Icon(Icons.checklist_rounded),
                      label: Text('المهام'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.grid_view_rounded),
                      selectedIcon: Icon(Icons.grid_view_rounded),
                      label: Text('المزيد'),
                    ),
                  ],
                ),
                const VerticalDivider(width: 1, thickness: 1),
                Expanded(child: dashboard),
              ],
            );
          },
        ),
      ),
    );
  }

  void _openMoreServices() {
    final user = AuthService.currentUser;
    final isAdmin = isAdminRole(user?.role);
    final options =
        <({String title, IconData icon, Color color, VoidCallback onTap})>[];

    void addPage(String title, IconData icon, Color color, Widget page) {
      options.add((
        title: title,
        icon: icon,
        color: color,
        onTap: () =>
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => page)),
      ));
    }

    addPage(
      'صلوات اليوم',
      Icons.checklist_rounded,
      Colors.deepOrange,
      const PrayerChecklistScreen(),
    );
    addPage(
      'مدارس الأحد',
      Icons.school_rounded,
      Colors.blue,
      const SundaySchoolScreen(),
    );
    addPage(
      'مواعيد القداسات',
      Icons.church_rounded,
      Colors.purple,
      const LiturgyScreen(),
    );
    addPage(
      'المعرض',
      Icons.photo_library_rounded,
      Colors.teal,
      const GalleryScreen(),
    );
    addPage(
      'الاعتراف',
      Icons.favorite_rounded,
      Colors.pink,
      const ConfessionScreen(),
    );
    addPage(
      'الأخبار والرحلات',
      Icons.campaign_rounded,
      Colors.indigo,
      const NewslettersScreen(),
    );
    addPage(
      'الإشعارات',
      Icons.notifications_none_rounded,
      Colors.blueGrey,
      const NotificationsScreen(),
    );
    addPage(
      'الرحلات والتسجيل',
      Icons.directions_bus_rounded,
      Colors.deepPurple,
      const TripsScreen(),
    );
    if (user?.role == 'student' || isAdmin) {
      addPage(
        'الاختبارات',
        Icons.quiz_rounded,
        Colors.amber.shade800,
        const QuizScreen(),
      );
    }
    if (user?.role == 'parent') {
      addPage(
        'متابعة الأبناء',
        Icons.family_restroom_rounded,
        AppTheme.primaryBurgundy,
        const ParentDashboardScreen(),
      );
    }
    if (isAdmin) {
      addPage(
        'إدارة المراحل والاجتماعات',
        Icons.admin_panel_settings_rounded,
        AppTheme.primaryBurgundy,
        const AdminAccessScreen(),
      );
      addPage(
        'إدارة الطلاب',
        Icons.groups_rounded,
        Colors.deepOrange,
        const StudentManagementScreen(),
      );
      addPage(
        'تسجيل الحضور',
        Icons.fact_check_rounded,
        Colors.blueGrey,
        const AttendanceScreen(),
      );
      if (user?.role == 'admin') {
        addPage(
          'الآية للجميع',
          Icons.format_quote_rounded,
          AppTheme.primaryBurgundy,
          const FeaturedVerseScreen(),
        );
      }
    }
    options.add((
      title: 'تواصل واتساب',
      icon: Icons.chat_rounded,
      color: Colors.green.shade700,
      onTap: _launchWhatsApp,
    ));

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        final maxHeight = MediaQuery.sizeOf(sheetContext).height * 0.76;
        final width = MediaQuery.sizeOf(sheetContext).width;
        final columns = width >= 700 ? 4 : 2;
        return SafeArea(
          top: false,
          child: SizedBox(
            height: maxHeight.clamp(360.0, 640.0),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'كل خدماتك',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'اختر القسم الذي تريد فتحه.',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: GridView.builder(
                      itemCount: options.length,
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: columns == 2 ? 1.55 : 1.5,
                      ),
                      itemBuilder: (context, index) {
                        final option = options[index];
                        return _buildServiceTile(
                          icon: option.icon,
                          title: option.title,
                          color: option.color,
                          onTap: () {
                            Navigator.of(sheetContext).pop();
                            option.onTap();
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildServiceTile({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        color: Colors.white,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Parent Dashboard View (Requirement 15)
  Widget _buildParentPanel() {
    return Card(
      color: AppTheme.lightGold,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.family_restroom,
                  color: AppTheme.darkBurgundy,
                  size: 28,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'متابعة الأبناء (${_children.length})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBurgundy,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),

            const Text(
              'نسبة الحضور لكل ابن',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppTheme.deepNavy,
              ),
            ),
            const SizedBox(height: 8),
            if (_children.isEmpty)
              const Text('لا توجد حسابات أبناء مرتبطة بهذا الرقم حالياً.')
            else
              ..._children.map((child) {
                final summary = _studentAttendanceSummary(child.id);
                final name = child.fullNameArabic.isNotEmpty
                    ? child.fullNameArabic
                    : child.name;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    dense: true,
                    title: Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      '${summary?['attended'] ?? 0} من ${summary?['total'] ?? 0} سجلاً محتسباً',
                    ),
                    trailing: Text(
                      _attendancePercentage(summary?['percentage']),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryBurgundy,
                      ),
                    ),
                  ),
                );
              }),

            // Last Confession of the first child
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(
                Icons.bookmark_added,
                color: AppTheme.primaryBurgundy,
              ),
              title: Text(
                _childStudent == null
                    ? 'آخر تاريخ اعتراف:'
                    : 'آخر تاريخ اعتراف لـ ${_childStudent!.name}:',
              ),
              subtitle: Text(
                _lastConfession != null
                    ? '${_lastConfession!.date} مع ${_lastConfession!.adminName}'
                    : 'لم يتم تسجيل اعتراف مؤخراً',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),

            // Child Attendance Log
            const SizedBox(height: 8),
            Text(
              'آخر سجلات حضور ${_childStudent?.name ?? "المخدوم"}:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppTheme.deepNavy,
              ),
            ),
            const SizedBox(height: 6),
            _attendanceHistory.isEmpty
                ? const Text('لا توجد سجلات حضور مسجلة بعد')
                : Column(
                    children: _attendanceHistory.map((att) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            Text('التاريخ: ${att.date}'),
                            Chip(
                              label: Text(att.statusInArabic),
                              backgroundColor: att.status == 'present'
                                  ? Colors.green.shade100
                                  : Colors.red.shade100,
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  // Student Dashboard View
  Widget _buildStudentPanel() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'بيانات ومتابعة المخدوم:',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryBurgundy,
              ),
            ),
            const Divider(),

            ListTile(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ConfessionScreen()),
              ),
              trailing: const Icon(Icons.chevron_left),
              leading: const Icon(
                Icons.history_edu,
                color: AppTheme.primaryBurgundy,
              ),
              title: const Text('آخر اعتراف مسجل لك:'),
              subtitle: Text(
                _lastConfession != null
                    ? _lastConfession!.date
                    : 'لا يوجد سجل سابق',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Servant / Admin Dashboard View (Requirement 1 & 3)
  Widget _buildServantAdminPanel() {
    return Card(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(
                  Icons.admin_panel_settings,
                  color: AppTheme.primaryBurgundy,
                  size: 28,
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'لوحة تحكم مسؤول خدمة (أمين عام):',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),

            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const AttendanceScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('تسجيل الحضور والغياب'),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const ConfessionScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.edit_note),
                  label: const Text('تسجيل متابعة الاعترافات'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
