import 'package:material_ui/material_ui.dart';
import 'package:intl/intl.dart' show DateFormat;
import '../services/api_service.dart';
import '../models/user_model.dart';
import '../models/attendance_model.dart';
import '../theme/app_theme.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  List<UserModel> _students = [];
  final Map<String, String> _attendanceMap = {};
  List<AttendanceModel> _records = [];
  Map<String, dynamic> _summary = {};
  bool _isLoading = true;
  String _selectedDate = DateTime.now().toString().split(' ')[0];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        // Admin accounts can manage the full student roster across groups.
        ApiService.getUsers(role: 'student'),
        ApiService.getAttendanceRecords(),
        ApiService.getAttendanceSummary(),
      ]);
      final students = results[0] as List<UserModel>;
      final records = results[1] as List<AttendanceModel>;
      final summary = results[2] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _students = students;
        _records = records;
        _summary = summary;
        _attendanceMap
          ..clear()
          ..addEntries(
            records
                .where(
                  (record) => record.date.split('T').first == _selectedDate,
                )
                .map((record) => MapEntry(record.studentId, record.status)),
          );
        _error = null;
        _isLoading = false;
      });
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveAttendance(UserModel student, String status) async {
    try {
      await ApiService.recordAttendance(
        studentId: student.id,
        date: _selectedDate,
        status: status,
        note: 'تسجيل من شاشة الخدمة',
      );
      final refreshed = await Future.wait([
        ApiService.getAttendanceRecords(),
        ApiService.getAttendanceSummary(),
      ]);
      if (mounted) {
        setState(() {
          _attendanceMap[student.id] = status;
          _records = refreshed[0] as List<AttendanceModel>;
          _summary = refreshed[1] as Map<String, dynamic>;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'تم تسجيل ${student.name} - ${_getStatusArabic(status)} بنجاح',
            ),
            duration: const Duration(seconds: 1),
          ),
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
    }
  }

  String _getStatusArabic(String status) {
    switch (status) {
      case 'present':
        return 'حاضر';
      case 'absent':
        return 'غائب';
      case 'late':
        return 'متأخر';
      case 'excused':
        return 'بعذر';
      default:
        return 'حاضر';
    }
  }

  String _formatAttendanceDate(String value) {
    final dateOnly = value.split('T').first;
    final parsed = DateTime.tryParse('${dateOnly}T12:00:00');
    if (parsed == null) return dateOnly;
    return DateFormat('dd/MM/yyyy').format(parsed);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'present':
        return Colors.green.shade700;
      case 'late':
        return Colors.orange.shade800;
      case 'absent':
        return Colors.red.shade700;
      case 'excused':
        return AppTheme.textMuted;
      default:
        return AppTheme.textMuted;
    }
  }

  Map<String, dynamic>? _summaryForStudent(String studentId) {
    final entries = _summary['students'];
    if (entries is! List) return null;
    for (final entry in entries) {
      if (entry is Map && entry['studentId']?.toString() == studentId) {
        return Map<String, dynamic>.from(entry);
      }
    }
    return null;
  }

  String _percentage(Map<String, dynamic>? summary) {
    final value = summary?['percentage'];
    if (value is! num) return '—';
    final percent = value.toDouble();
    return '${percent == percent.roundToDouble() ? percent.toStringAsFixed(0) : percent.toStringAsFixed(1)}%';
  }

  Widget _buildSummaryCard() {
    final overallValue = _summary['overall'];
    final overall = overallValue is Map
        ? Map<String, dynamic>.from(overallValue)
        : null;
    final attended = overall?['attended'] ?? 0;
    final total = overall?['total'] ?? 0;
    final studentsWithRecords = ((_summary['students'] as List?) ?? const [])
        .whereType<Map>()
        .where((item) => (item['total'] as num? ?? 0) > 0)
        .length;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'ملخص حضور المجموعة',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryBurgundy,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 24,
              runSpacing: 12,
              children: [
                _SummaryMetric(
                  label: 'نسبة حضور جميع الطلاب',
                  value: _percentage(overall),
                ),
                _SummaryMetric(
                  label: 'حضور محتسب',
                  value: '$attended من $total',
                ),
                _SummaryMetric(
                  label: 'طلاب لهم سجل',
                  value: '$studentsWithRecords من ${_students.length}',
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'المتأخر يُحسب حضوراً، وحالات العذر لا تخفض النسبة.',
              style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'الحضور والغياب',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          actions: [
            IconButton(
              tooltip: 'تحديث بيانات الحضور',
              onPressed: _isLoading ? null : _loadData,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    color: AppTheme.lightGold,
                    child: Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 230),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.calendar_month,
                                color: AppTheme.primaryBurgundy,
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  'تاريخ الخدمة: $_selectedDate',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.darkBurgundy,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now(),
                              firstDate: DateTime(2024),
                              lastDate: DateTime(2030),
                            );
                            if (picked != null) {
                              setState(() {
                                _selectedDate = picked.toString().split(' ')[0];
                                _attendanceMap
                                  ..clear()
                                  ..addEntries(
                                    _records
                                        .where(
                                          (record) =>
                                              record.date.split('T').first ==
                                              _selectedDate,
                                        )
                                        .map(
                                          (record) => MapEntry(
                                            record.studentId,
                                            record.status,
                                          ),
                                        ),
                                  );
                              });
                            }
                          },
                          icon: const Icon(Icons.edit_calendar, size: 16),
                          label: const Text('تغيير'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _students.isEmpty
                        ? const Center(
                            child: Text('لا يوجد مخدومين مضافين حالياً'),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _students.length + 1,
                            itemBuilder: (context, index) {
                              if (index == 0) return _buildSummaryCard();
                              final student = _students[index - 1];
                              final currentStatus =
                                  _attendanceMap[student.id] ?? 'present';
                              final studentHistory =
                                  _records
                                      .where(
                                        (record) =>
                                            record.studentId == student.id,
                                      )
                                      .toList()
                                    ..sort((a, b) => b.date.compareTo(a.date));
                              final studentSummary = _summaryForStudent(
                                student.id,
                              );
                              final displayName =
                                  student.fullNameArabic.isNotEmpty
                                  ? student.fullNameArabic
                                  : student.name;

                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          CircleAvatar(
                                            backgroundColor:
                                                AppTheme.primaryBurgundy,
                                            child: Text(
                                              student.name.isNotEmpty
                                                  ? student.name[0]
                                                  : 'ط',
                                              style: const TextStyle(
                                                color: AppTheme.accentGold,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  displayName,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 15,
                                                  ),
                                                ),
                                                Text(
                                                  'أب الاعتراف: ${student.confessionFather.isNotEmpty ? student.confessionFather : "لم يحدد"}',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: AppTheme.textMuted,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                _percentage(studentSummary),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  color:
                                                      AppTheme.primaryBurgundy,
                                                ),
                                              ),
                                              const Text(
                                                'الحضور',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: AppTheme.textMuted,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      DropdownButtonFormField<String>(
                                        key: ValueKey(
                                          '${student.id}-$currentStatus',
                                        ),
                                        initialValue: currentStatus,
                                        isExpanded: true,
                                        decoration: const InputDecoration(
                                          labelText: 'حالة الحضور',
                                          prefixIcon: Icon(
                                            Icons.fact_check_outlined,
                                          ),
                                        ),
                                        items: const [
                                          DropdownMenuItem(
                                            value: 'present',
                                            child: Text('حاضر'),
                                          ),
                                          DropdownMenuItem(
                                            value: 'absent',
                                            child: Text('غائب'),
                                          ),
                                          DropdownMenuItem(
                                            value: 'late',
                                            child: Text('متأخر'),
                                          ),
                                          DropdownMenuItem(
                                            value: 'excused',
                                            child: Text('بعذر'),
                                          ),
                                        ],
                                        onChanged: (value) {
                                          if (value != null &&
                                              value != currentStatus) {
                                            _saveAttendance(student, value);
                                          }
                                        },
                                      ),
                                      const SizedBox(height: 14),
                                      Row(
                                        children: [
                                          const Expanded(
                                            child: Text(
                                              'سجل الحضور الكامل',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.primaryBurgundy,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            '${studentHistory.length} سجلاً',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: AppTheme.textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      if (studentHistory.isEmpty)
                                        const Text(
                                          'لا توجد سجلات سابقة لهذا الطالب.',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.textMuted,
                                          ),
                                        )
                                      else
                                        SingleChildScrollView(
                                          scrollDirection: Axis.horizontal,
                                          child: DataTable(
                                            horizontalMargin: 8,
                                            columnSpacing: 16,
                                            headingRowHeight: 42,
                                            dataRowMinHeight: 44,
                                            dataRowMaxHeight: 60,
                                            columns: const [
                                              DataColumn(
                                                label: Text('التاريخ'),
                                              ),
                                              DataColumn(label: Text('الخدمة')),
                                              DataColumn(label: Text('الحضور')),
                                            ],
                                            rows: studentHistory.map((record) {
                                              final color = _statusColor(
                                                record.status,
                                              );
                                              return DataRow(
                                                cells: [
                                                  DataCell(
                                                    Text(
                                                      _formatAttendanceDate(
                                                        record.date,
                                                      ),
                                                      textDirection:
                                                          TextDirection.ltr,
                                                      style: const TextStyle(
                                                        fontSize: 12,
                                                      ),
                                                    ),
                                                  ),
                                                  DataCell(
                                                    SizedBox(
                                                      width: 112,
                                                      child: Text(
                                                        record.service,
                                                        maxLines: 2,
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                        style: const TextStyle(
                                                          fontSize: 12,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                  DataCell(
                                                    Container(
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 9,
                                                            vertical: 5,
                                                          ),
                                                      decoration: BoxDecoration(
                                                        color: color.withValues(
                                                          alpha: 0.1,
                                                        ),
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              20,
                                                            ),
                                                      ),
                                                      child: Text(
                                                        record.statusInArabic,
                                                        style: TextStyle(
                                                          color: color,
                                                          fontSize: 12,
                                                          fontWeight:
                                                              FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              );
                                            }).toList(),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _SummaryMetric extends StatelessWidget {
  const _SummaryMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 135,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryBurgundy,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
        ),
      ],
    ),
  );
}
