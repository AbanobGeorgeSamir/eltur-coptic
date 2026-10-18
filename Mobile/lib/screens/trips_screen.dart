import 'package:material_ui/material_ui.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:url_launcher/url_launcher.dart';

import '../models/ministry_post_model.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'post_creator_screen.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  List<MinistryPostModel> _trips = [];
  List<Map<String, dynamic>> _registrations = [];
  bool _loading = true;
  bool _hasLoaded = false;
  String? _deletingTripId;
  String? _error;

  bool get _isAdmin => isAdminRole(AuthService.currentUser?.role);
  bool get _isStudent => AuthService.currentUser?.role == 'student';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!_hasLoaded) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final values = await Future.wait([
        ApiService.getPosts(type: 'trip'),
        ApiService.getTripRegistrations(),
      ]);
      if (!mounted) return;
      setState(() {
        _trips = values[0] as List<MinistryPostModel>;
        _registrations = values[1] as List<Map<String, dynamic>>;
        _loading = false;
        _hasLoaded = true;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
        _hasLoaded = true;
      });
    }
  }

  Future<void> _createTrip() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const PostCreatorScreen(initialType: 'trip'),
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _editTrip(MinistryPostModel trip) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) =>
            PostCreatorScreen(initialType: 'trip', postToEdit: trip),
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _deleteTrip(MinistryPostModel trip) async {
    final tripRegistrations = _registrations
        .where((item) => _tripId(item['trip']) == trip.id)
        .toList();
    final paid = tripRegistrations.fold<double>(
      0,
      (sum, item) => sum + ((item['amountPaid'] as num?)?.toDouble() ?? 0),
    );
    final registrationWarning = tripRegistrations.isEmpty
        ? ''
        : '\n\nسيتم حذف ${tripRegistrations.length} طلب تسجيل وإجمالي المبالغ المسجلة كمدفوعة (${paid.toStringAsFixed(2)} ج.م).';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('حذف الرحلة؟'),
        content: Text(
          'سيتم حذف رحلة «${trip.title}» نهائيًا.$registrationWarning',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.tonalIcon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_outline),
            label: const Text('حذف الرحلة'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _deletingTripId = trip.id);
    try {
      await ApiService.deletePost(trip.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم حذف الرحلة وطلبات تسجيلها.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _deletingTripId = null);
    }
  }

  Future<void> _openMedia(MinistryPostModel trip) async {
    final uri = Uri.tryParse(trip.mediaUrl);
    if (uri == null || !uri.hasScheme) return;
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the trip attachment.')),
      );
    }
  }

  Future<void> _register(MinistryPostModel trip) async {
    try {
      await ApiService.registerForTrip(trip.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم تسجيل طلب الرحلة.')));
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

  Future<void> _recordPayment(Map<String, dynamic> registration) async {
    final controller = TextEditingController(
      text: '${registration['amountPaid'] ?? 0}',
    );
    final paid = await showDialog<double>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('تسجيل دفعة الطالب'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText:
                'المبلغ المدفوع من أصل ${registration['amountDue'] ?? 0}',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () {
              final amount = double.tryParse(controller.text.trim());
              if (amount != null) Navigator.pop(dialogContext, amount);
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (paid == null) return;
    try {
      await ApiService.updateTripPayment(registration['_id'].toString(), paid);
      await _load();
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

  Future<void> _deleteRegistration(Map<String, dynamic> registration) async {
    final student = registration['student'] is Map
        ? Map<String, dynamic>.from(registration['student'])
        : <String, dynamic>{};
    final trip = registration['trip'] is Map
        ? Map<String, dynamic>.from(registration['trip'])
        : <String, dynamic>{};
    final amountPaid = (registration['amountPaid'] as num?)?.toDouble() ?? 0;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('حذف طلب التسجيل؟'),
        content: Text(
          'سيتم حذف طلب ${student['name'] ?? 'الطالب'} في ${trip['title'] ?? 'الرحلة'}'
          '${amountPaid > 0 ? ' وسجل المبلغ المدفوع (${amountPaid.toStringAsFixed(2)} ج.م).' : '.'}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.tonalIcon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_outline),
            label: const Text('حذف الطلب'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.deleteTripRegistration(registration['_id'].toString());
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم حذف طلب التسجيل.')));
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

  String _dateLabel(String value) {
    final date = DateTime.tryParse(value)?.toLocal();
    return date == null
        ? 'لم يحدد الموعد'
        : DateFormat('yyyy/MM/dd · HH:mm').format(date);
  }

  String _tripId(dynamic trip) =>
      trip is Map ? '${trip['_id'] ?? ''}' : '$trip';

  @override
  Widget build(BuildContext context) {
    final due = _registrations.fold<double>(
      0,
      (sum, item) => sum + ((item['amountDue'] as num?)?.toDouble() ?? 0),
    );
    final paid = _registrations.fold<double>(
      0,
      (sum, item) => sum + ((item['amountPaid'] as num?)?.toDouble() ?? 0),
    );
    final registeredTripIds = _registrations
        .map((item) => _tripId(item['trip']))
        .toSet();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(_isAdmin ? 'إدارة الرحلات والتحصيل' : 'الرحلات'),
        ),
        floatingActionButton: _isAdmin
            ? FloatingActionButton.extended(
                onPressed: _createTrip,
                icon: const Icon(Icons.add),
                label: const Text('إضافة رحلة'),
                backgroundColor: AppTheme.primaryBurgundy,
                foregroundColor: AppTheme.accentGold,
              )
            : null,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    if (_isAdmin) ...[
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Wrap(
                            spacing: 24,
                            runSpacing: 12,
                            children: [
                              Text(
                                'طلبات التسجيل: ${_registrations.length}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text('إجمالي الرسوم: ${due.toStringAsFixed(2)}'),
                              Text(
                                'تم تحصيله: ${paid.toStringAsFixed(2)}',
                                style: const TextStyle(color: Colors.green),
                              ),
                              Text(
                                'المتبقي: ${(due - paid).toStringAsFixed(2)}',
                                style: const TextStyle(
                                  color: AppTheme.primaryBurgundy,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_trips.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Text(
                            _isAdmin
                                ? 'لا توجد رحلات بعد. أضف رحلة لبدء استقبال الطلبات.'
                                : 'لا توجد رحلات معلنة حالياً.',
                          ),
                        ),
                      )
                    else
                      ..._trips.map((trip) {
                        final registered = registeredTripIds.contains(trip.id);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  trip.title,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                if (_isAdmin && !trip.published)
                                  const Padding(
                                    padding: EdgeInsets.only(top: 5),
                                    child: Chip(
                                      avatar: Icon(
                                        Icons.visibility_off_outlined,
                                        size: 17,
                                      ),
                                      label: Text('مسودة غير منشورة'),
                                      visualDensity: VisualDensity.compact,
                                    ),
                                  ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 14,
                                  runSpacing: 6,
                                  children: [
                                    Text(_dateLabel(trip.eventAt)),
                                    Text(
                                      'الرسوم: ${trip.feeAmount.toStringAsFixed(2)}',
                                    ),
                                  ],
                                ),
                                if (trip.body.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  Text(trip.body),
                                ],
                                if (_isAdmin)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Text(
                                      trip.assignToGroup
                                          ? 'متاحة لجميع الطلاب'
                                          : 'مخصصة لـ ${trip.assignedStudents.length} طالب',
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                  ),
                                if (trip.mediaUrl.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  if (trip.mediaKind == 'image')
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Image.network(
                                        trip.mediaUrl,
                                        width: double.infinity,
                                        height: 190,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) =>
                                            const SizedBox.shrink(),
                                      ),
                                    )
                                  else
                                    OutlinedButton.icon(
                                      onPressed: () => _openMedia(trip),
                                      icon: Icon(
                                        trip.mediaKind == 'pdf'
                                            ? Icons.picture_as_pdf
                                            : Icons.open_in_new,
                                      ),
                                      label: Text(
                                        trip.mediaKind == 'pdf'
                                            ? 'فتح ملف PDF'
                                            : 'فتح المرفق',
                                      ),
                                    ),
                                ],
                                if (_isStudent) ...[
                                  const SizedBox(height: 12),
                                  FilledButton.tonalIcon(
                                    onPressed: registered
                                        ? null
                                        : () => _register(trip),
                                    icon: Icon(
                                      registered
                                          ? Icons.check_circle
                                          : Icons.hiking,
                                    ),
                                    label: Text(
                                      registered
                                          ? 'تم إرسال طلبك'
                                          : 'التسجيل في الرحلة',
                                    ),
                                  ),
                                ],
                                if (_isAdmin) ...[
                                  const SizedBox(height: 10),
                                  Align(
                                    alignment: AlignmentDirectional.centerStart,
                                    child: Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        OutlinedButton.icon(
                                          onPressed: _deletingTripId == trip.id
                                              ? null
                                              : () => _editTrip(trip),
                                          icon: const Icon(Icons.edit_outlined),
                                          label: const Text('تعديل الرحلة'),
                                        ),
                                        OutlinedButton.icon(
                                          onPressed: _deletingTripId == trip.id
                                              ? null
                                              : () => _deleteTrip(trip),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor:
                                                Colors.red.shade700,
                                          ),
                                          icon: const Icon(
                                            Icons.delete_outline,
                                          ),
                                          label: Text(
                                            _deletingTripId == trip.id
                                                ? 'جارٍ الحذف...'
                                                : 'حذف الرحلة',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      }),
                    if (_registrations.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        _isAdmin
                            ? 'طلبات الطلاب والتحصيل'
                            : 'طلبات تسجيل الأبناء',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ..._registrations.map((item) {
                        final student = item['student'] is Map
                            ? Map<String, dynamic>.from(item['student'])
                            : <String, dynamic>{};
                        final trip = item['trip'] is Map
                            ? Map<String, dynamic>.from(item['trip'])
                            : <String, dynamic>{};
                        final amountDue =
                            (item['amountDue'] as num?)?.toDouble() ?? 0;
                        final amountPaid =
                            (item['amountPaid'] as num?)?.toDouble() ?? 0;
                        return Card(
                          child: ListTile(
                            isThreeLine: true,
                            title: Text(
                              '${student['name'] ?? 'طالب'} · ${trip['title'] ?? 'رحلة'}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${student['phone'] ?? ''}\nالرسوم ${amountDue.toStringAsFixed(2)} · المدفوع ${amountPaid.toStringAsFixed(2)} · المتبقي ${(amountDue - amountPaid).toStringAsFixed(2)}',
                            ),
                            trailing: _isAdmin
                                ? Wrap(
                                    spacing: -8,
                                    children: [
                                      IconButton(
                                        tooltip: 'تسجيل دفعة',
                                        onPressed: () => _recordPayment(item),
                                        icon: const Icon(Icons.edit_note),
                                      ),
                                      IconButton(
                                        tooltip: 'حذف طلب التسجيل',
                                        onPressed: () =>
                                            _deleteRegistration(item),
                                        color: Colors.red,
                                        icon: const Icon(Icons.delete_outline),
                                      ),
                                    ],
                                  )
                                : null,
                          ),
                        );
                      }),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}
