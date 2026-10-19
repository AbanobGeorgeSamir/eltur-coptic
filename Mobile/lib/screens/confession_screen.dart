import 'package:material_ui/material_ui.dart';
import '../models/confession_model.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class ConfessionScreen extends StatefulWidget {
  const ConfessionScreen({super.key});

  @override
  State<ConfessionScreen> createState() => _ConfessionScreenState();
}

class _ConfessionScreenState extends State<ConfessionScreen> {
  List<UserModel> _students = [];
  List<ConfessionModel> _records = [];
  String? _selectedStudentId;
  final _dateController = TextEditingController(
    text: DateTime.now().toString().split(' ').first,
  );
  final _noteController = TextEditingController();
  bool _isLoading = true;
  bool _saving = false;
  String? _error;

  UserModel? get _user => AuthService.currentUser;
  UserModel? get _selectedStudent {
    final id = _selectedStudentId;
    if (id == null || id.isEmpty) return null;
    for (final student in _students) {
      if (student.id == id) return student;
    }
    return null;
  }

  bool get _isAdmin => isAdminRole(_user?.role);
  bool get _canRecord => _isAdmin || _user?.role == 'student';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      if (_isAdmin || _user?.role == 'parent') {
        final uniqueStudents = <String, UserModel>{};
        for (final student in await ApiService.getUsers(role: 'student')) {
          if (student.id.isNotEmpty) {
            uniqueStudents.putIfAbsent(student.id, () => student);
          }
        }
        _students = uniqueStudents.values.toList();
        if (_isAdmin) {
          final previousId = _selectedStudentId;
          if (!_students.any((student) => student.id == previousId)) {
            _selectedStudentId = _students.isEmpty ? null : _students.first.id;
          }
        }
      }
      final records = await ApiService.getConfessions();
      if (mounted) {
        setState(() {
          _records = records;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  List<ConfessionModel> get _visibleRecords {
    if (_isAdmin || _user?.role == 'student') return _records;
    final children = _students.map((student) => student.id).toSet();
    return _records
        .where((record) => children.contains(record.studentId))
        .toList();
  }

  Map<String, ConfessionModel> get _latestByStudent {
    final latest = <String, ConfessionModel>{};
    for (final record in _records) {
      latest.putIfAbsent(record.studentId, () => record);
    }
    return latest;
  }

  ConfessionModel? get _latestForCurrentView {
    if (_isAdmin && _selectedStudent != null) {
      for (final record in _records) {
        if (record.studentId == _selectedStudent!.id) return record;
      }
      return null;
    }
    return _visibleRecords.isEmpty ? null : _visibleRecords.first;
  }

  Future<void> _recordConfession() async {
    final studentId = _isAdmin ? _selectedStudent?.id : _user?.id;
    if (studentId == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiService.recordConfession(
        studentId: studentId,
        date: _dateController.text.trim(),
        note: _noteController.text.trim(),
      );
      if (!mounted) return;
      _noteController.clear();
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _editConfession(ConfessionModel record) async {
    final noteController = TextEditingController(text: record.note);
    final selectedDate = DateTime.tryParse(record.date) ?? DateTime.now();
    var date = selectedDate;
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          scrollable: true,
          title: Text('تعديل اعتراف ${record.studentName}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              OutlinedButton.icon(
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime(2024),
                    lastDate: DateTime.now(),
                  );
                  if (picked != null && context.mounted) {
                    setDialogState(() => date = picked);
                  }
                },
                icon: const Icon(Icons.calendar_month),
                label: Text(date.toString().split(' ').first),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                maxLength: 1000,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'ملاحظة'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('إلغاء'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('حفظ التعديل'),
            ),
          ],
        ),
      ),
    );
    if (saved != true) {
      noteController.dispose();
      return;
    }
    try {
      await ApiService.updateConfession(
        id: record.id,
        date: date.toString().split(' ').first,
        note: noteController.text.trim(),
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم تعديل سجل الاعتراف.')));
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      noteController.dispose();
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final latest = _latestForCurrentView;
    final studentOptions = _students
        .where((student) => student.id.isNotEmpty)
        .toList();
    final selectedStudentId =
        studentOptions.any((student) => student.id == _selectedStudentId)
        ? _selectedStudentId
        : null;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(_isAdmin ? 'متابعة سجلات الاعتراف' : 'سجل الاعتراف'),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    if (_isAdmin || _user?.role == 'student') ...[
                      if (_isAdmin) ...[
                        DropdownButtonFormField<String>(
                          key: ValueKey(
                            'confession-student-${studentOptions.length}-$selectedStudentId',
                          ),
                          initialValue: selectedStudentId,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'اختر الطالب',
                          ),
                          hint: const Text('لا يوجد طلاب للاختيار'),
                          items: studentOptions
                              .map(
                                (student) => DropdownMenuItem(
                                  value: student.id,
                                  child: Text(student.name),
                                ),
                              )
                              .toList(),
                          onChanged: studentOptions.isEmpty
                              ? null
                              : (studentId) => setState(
                                  () => _selectedStudentId = studentId,
                                ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      Card(
                        child: ListTile(
                          leading: const Icon(
                            Icons.history_edu,
                            color: AppTheme.primaryBurgundy,
                          ),
                          title: Text(
                            _isAdmin
                                ? _selectedStudent?.name ?? 'آخر سجل'
                                : 'آخر اعتراف مسجل',
                          ),
                          subtitle: Text(
                            latest == null
                                ? 'لا توجد سجلات اعتراف محفوظة.'
                                : '${latest.date.split('T').first}\n${latest.note}',
                          ),
                          trailing: latest == null || _isAdmin
                              ? null
                              : IconButton(
                                  tooltip: 'تعديل آخر اعتراف',
                                  onPressed: () => _editConfession(latest),
                                  icon: const Icon(Icons.edit_outlined),
                                ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_canRecord) ...[
                        TextField(
                          controller: _dateController,
                          keyboardType: TextInputType.datetime,
                          decoration: const InputDecoration(
                            labelText: 'تاريخ الاعتراف (YYYY-MM-DD)',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _noteController,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'ملاحظة اختيارية',
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed:
                              _saving || (_isAdmin && _selectedStudent == null)
                              ? null
                              : _recordConfession,
                          child: Text(
                            _saving ? 'جارٍ الحفظ...' : 'حفظ موعد آخر اعتراف',
                          ),
                        ),
                      ],
                    ],
                    if (_isAdmin) ...[
                      const SizedBox(height: 20),
                      Text(
                        'آخر موعد اعتراف لكل طالب (${_students.length})',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      if (_students.isEmpty)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('لا يوجد طلاب في مجموعتك بعد.'),
                          ),
                        )
                      else
                        ..._students.map((student) {
                          final record = _latestByStudent[student.id];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              leading: const Icon(
                                Icons.event_available,
                                color: AppTheme.primaryBurgundy,
                              ),
                              title: Text(student.name),
                              subtitle: Text(
                                record == null
                                    ? 'لم يسجل موعداً بعد'
                                    : '${record.date.split('T').first}${record.note.isEmpty ? '' : '\n${record.note}'}',
                              ),
                              isThreeLine: record?.note.isNotEmpty ?? false,
                              trailing: record == null
                                  ? null
                                  : IconButton(
                                      tooltip: 'تعديل السجل',
                                      onPressed: () => _editConfession(record),
                                      icon: const Icon(Icons.edit_outlined),
                                    ),
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
