import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

const _prayerOptions = <(String, String)>[
  ('morning', 'صلاة باكر'),
  ('third', 'صلاة الساعة الثالثة'),
  ('sixth', 'صلاة الساعة السادسة'),
  ('ninth', 'صلاة الساعة التاسعة'),
  ('sleep', 'صلاة النوم'),
];

String _today() => DateTime.now().toString().split(' ').first;

class PrayerChecklistScreen extends StatefulWidget {
  const PrayerChecklistScreen({super.key});

  @override
  State<PrayerChecklistScreen> createState() => _PrayerChecklistScreenState();
}

class _PrayerChecklistScreenState extends State<PrayerChecklistScreen> {
  List<Map<String, dynamic>> _entries = [];
  Map<String, bool>? _draft;
  String _date = _today();
  String? _editingStudentId;
  String? _error;
  bool _loading = true;
  bool _saving = false;

  bool get _isAdmin => isAdminRole(AuthService.currentUser?.role);
  bool get _isStudent => AuthService.currentUser?.role == 'student';

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
      final entries = await ApiService.getPrayerChecklists(_date);
      if (mounted) {
        setState(() {
          _entries = entries;
          _editingStudentId = null;
          _draft = null;
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

  Future<void> _chooseDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_date) ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked == null || !mounted) return;
    setState(() => _date = picked.toString().split(' ').first);
    await _load();
  }

  Map<String, bool> _checksOf(Map<String, dynamic> entry) {
    final raw = entry['checks'] is Map
        ? Map<String, dynamic>.from(entry['checks'] as Map)
        : <String, dynamic>{};
    return {for (final (key, _) in _prayerOptions) key: raw[key] == true};
  }

  void _setStudentCheck(String field, bool checked) {
    final studentId = AuthService.currentUser?.id;
    setState(() {
      _entries = _entries.map((entry) {
        if (entry['studentId']?.toString() != studentId) return entry;
        final checks = _checksOf(entry)..[field] = checked;
        return {...entry, 'checks': checks};
      }).toList();
    });
  }

  Future<void> _saveStudent() async {
    final studentId = AuthService.currentUser?.id;
    final entry = _entries.cast<Map<String, dynamic>?>().firstWhere(
      (item) => item?['studentId']?.toString() == studentId,
      orElse: () => null,
    );
    if (entry == null) return;
    await _save(
      () =>
          ApiService.savePrayerChecklist(date: _date, checks: _checksOf(entry)),
    );
  }

  Future<void> _saveAdmin(String studentId) async {
    final checks = _draft;
    if (checks == null) return;
    await _save(
      () => ApiService.updatePrayerChecklist(
        studentId: studentId,
        date: _date,
        checks: checks,
      ),
    );
  }

  Future<void> _save(Future<bool> Function() action) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await action();
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تم حفظ اختيارات الصلوات.')));
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
          _saving = false;
        });
      }
    }
  }

  Widget _prayerChecks(
    Map<String, bool> checks, {
    required bool enabled,
    required ValueChanged<Map<String, bool>>? onChanged,
  }) {
    return Wrap(
      spacing: 6,
      runSpacing: 2,
      children: [
        for (final (field, label) in _prayerOptions)
          SizedBox(
            width: 245,
            child: CheckboxListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              value: checks[field] ?? false,
              activeColor: AppTheme.primaryBurgundy,
              title: Text(label, style: const TextStyle(fontSize: 13)),
              onChanged: enabled && onChanged != null
                  ? (value) => onChanged({...checks, field: value == true})
                  : null,
            ),
          ),
      ],
    );
  }

  Widget _studentCard(Map<String, dynamic> entry) {
    final studentId = entry['studentId']?.toString() ?? '';
    final editing = _editingStudentId == studentId;
    final checks = editing && _draft != null ? _draft! : _checksOf(entry);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  entry['studentName']?.toString() ?? '',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (_isAdmin)
                  editing
                      ? Wrap(
                          spacing: 6,
                          children: [
                            TextButton(
                              onPressed: _saving
                                  ? null
                                  : () => _saveAdmin(studentId),
                              child: const Text('حفظ'),
                            ),
                            TextButton(
                              onPressed: () => setState(() {
                                _editingStudentId = null;
                                _draft = null;
                              }),
                              child: const Text('إلغاء'),
                            ),
                          ],
                        )
                      : TextButton.icon(
                          onPressed: () => setState(() {
                            _editingStudentId = studentId;
                            _draft = _checksOf(entry);
                          }),
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          label: const Text('تعديل'),
                        ),
              ],
            ),
            _prayerChecks(
              checks,
              enabled: _isStudent || (_isAdmin && editing),
              onChanged: _isStudent
                  ? (values) {
                      for (final (field, _) in _prayerOptions) {
                        if ((checks[field] ?? false) !=
                            (values[field] ?? false)) {
                          _setStudentCheck(field, values[field] ?? false);
                        }
                      }
                    }
                  : _isAdmin && editing
                  ? (values) => setState(() => _draft = values)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _isAdmin
        ? 'متابعة صلوات الطلاب'
        : _isStudent
        ? 'صلوات اليوم'
        : 'متابعة صلوات الأبناء';
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: Text(title)),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      color: AppTheme.lightGold,
                      child: ListTile(
                        leading: const Icon(
                          Icons.calendar_month,
                          color: AppTheme.primaryBurgundy,
                        ),
                        title: const Text(
                          'التاريخ',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(_date),
                        trailing: IconButton(
                          tooltip: 'اختيار التاريخ',
                          onPressed: _chooseDate,
                          icon: const Icon(Icons.edit_calendar),
                        ),
                      ),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    if (_isStudent && _entries.isNotEmpty) ...[
                      Text(
                        'حدّد الصلوات التي أتممتها ثم احفظ اختياراتك.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 8),
                      _studentCard(_entries.first),
                      FilledButton.icon(
                        onPressed: _saving ? null : _saveStudent,
                        icon: const Icon(Icons.save_outlined),
                        label: Text(
                          _saving ? 'جارٍ الحفظ...' : 'حفظ الاختيارات',
                        ),
                      ),
                    ] else if (_entries.isNotEmpty)
                      ..._entries.map(_studentCard)
                    else
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(20),
                          child: Text(
                            'لا يوجد طلاب أو أبناء لعرضهم لهذا الحساب.',
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
