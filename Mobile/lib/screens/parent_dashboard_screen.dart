import 'package:material_ui/material_ui.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../services/api_service.dart';
import '../theme/app_theme.dart';

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic> _attendanceSummary = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ApiService.getParentDashboard(),
        ApiService.getAttendanceSummary(),
      ]);
      if (!mounted) return;
      setState(() {
        _children = results[0] as List<Map<String, dynamic>>;
        _attendanceSummary = results[1] as Map<String, dynamic>;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Map<String, dynamic>? _summaryFor(String studentId) {
    final students = _attendanceSummary['students'];
    if (students is! List) return null;
    for (final item in students) {
      if (item is Map && item['studentId']?.toString() == studentId) {
        return Map<String, dynamic>.from(item);
      }
    }
    return null;
  }

  String _percentage(Object? raw) {
    if (raw is! num) return '—';
    final value = raw.toDouble();
    final formatted = value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toStringAsFixed(1);
    return '$formatted%';
  }

  String _date(Object? raw) {
    final value = raw?.toString() ?? '';
    final parsed = DateTime.tryParse(value);
    return parsed == null
        ? 'لا يوجد سجل'
        : DateFormat('yyyy/MM/dd').format(parsed.toLocal());
  }

  String _statusLabel(Object? raw) {
    switch (raw?.toString()) {
      case 'present':
        return 'حاضر';
      case 'absent':
        return 'غائب';
      case 'late':
        return 'متأخر';
      case 'excused':
        return 'بعذر';
      default:
        return raw?.toString() ?? 'غير محدد';
    }
  }

  Color _statusColor(Object? raw) {
    switch (raw?.toString()) {
      case 'present':
        return Colors.green.shade700;
      case 'late':
        return Colors.blue.shade700;
      case 'excused':
        return Colors.orange.shade800;
      default:
        return Colors.red.shade700;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('متابعة الأبناء')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      color: AppTheme.deepNavy,
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          children: [
                            const Icon(
                              Icons.family_restroom_rounded,
                              color: AppTheme.accentGold,
                              size: 36,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'متابعة الأبناء',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 21,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'تظهر بيانات الأبناء بعد اعتماد ربط ولي الأمر من مسؤول الخدمة (${_children.length}).',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white70,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Card(
                        color: Colors.red.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Text(
                            _error!,
                            style: TextStyle(color: Colors.red.shade900),
                          ),
                        ),
                      ),
                    ],
                    if (_error == null && _children.isEmpty) ...[
                      const SizedBox(height: 12),
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            'لا توجد بيانات أبناء معتمدة لهذا الحساب حالياً. إذا أنشأت الحساب للتو، تواصل مع مسؤول الخدمة لاعتماد الربط والتحقق من رقم ولي الأمر.',
                          ),
                        ),
                      ),
                    ],
                    if (_children.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _overallAttendanceCard(),
                      const SizedBox(height: 8),
                      for (final child in _children) _childCard(child),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  Widget _overallAttendanceCard() {
    final overall = _attendanceSummary['overall'];
    final data = overall is Map ? Map<String, dynamic>.from(overall) : null;
    if (data == null) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(
              Icons.fact_check_outlined,
              color: AppTheme.primaryBurgundy,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'متوسط حضور الأبناء',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${data['attended'] ?? 0} من ${data['total'] ?? 0} سجلاً محتسباً',
                  ),
                ],
              ),
            ),
            Text(
              _percentage(data['percentage']),
              style: const TextStyle(
                color: AppTheme.primaryBurgundy,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _childCard(Map<String, dynamic> entry) {
    final student = entry['student'];
    final studentData = student is Map
        ? Map<String, dynamic>.from(student)
        : <String, dynamic>{};
    final studentId = (studentData['_id'] ?? studentData['id'] ?? '')
        .toString();
    final name =
        (studentData['fullNameArabic'] ?? studentData['name'] ?? 'المخدوم')
            .toString();
    final summary = _summaryFor(studentId);
    final confession = entry['latestConfession'];
    final confessionData = confession is Map
        ? Map<String, dynamic>.from(confession)
        : null;
    final attendance = entry['attendance'] is List
        ? (entry['attendance'] as List).whereType<Map>().toList()
        : <Map>[];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const CircleAvatar(
                  backgroundColor: AppTheme.lightGold,
                  foregroundColor: AppTheme.darkBurgundy,
                  child: Icon(Icons.person_outline_rounded),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  _percentage(summary?['percentage']),
                  style: const TextStyle(
                    color: AppTheme.primaryBurgundy,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              '${summary?['attended'] ?? 0} من ${summary?['total'] ?? 0} سجلاً محتسباً',
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
            const Divider(height: 24),
            const Text(
              'آخر اعتراف',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(_date(confessionData?['date'])),
            const SizedBox(height: 14),
            const Text(
              'آخر سجلات الحضور',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (attendance.isEmpty)
              const Text(
                'لا توجد سجلات حضور.',
                style: TextStyle(color: AppTheme.textMuted),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final record in attendance)
                    Chip(
                      visualDensity: VisualDensity.compact,
                      label: Text(
                        '${_date(record['date'])} · ${_statusLabel(record['status'])}',
                      ),
                      labelStyle: TextStyle(
                        color: _statusColor(record['status']),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                      side: BorderSide(
                        color: _statusColor(
                          record['status'],
                        ).withValues(alpha: 0.24),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
