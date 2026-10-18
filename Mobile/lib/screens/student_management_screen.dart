import 'package:material_ui/material_ui.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:url_launcher/url_launcher.dart';

import '../models/user_model.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class StudentManagementScreen extends StatefulWidget {
  const StudentManagementScreen({super.key});

  @override
  State<StudentManagementScreen> createState() =>
      _StudentManagementScreenState();
}

class _StudentManagementScreenState extends State<StudentManagementScreen> {
  List<UserModel> _students = [];
  List<Map<String, dynamic>> _pendingParents = [];
  bool _loading = true;
  String _query = '';
  String? _error;
  String? _approvingParentKey;
  String? _rejectingStudentId;
  String? _assigningStudentId;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<Object>([
        ApiService.getUsers(role: 'student'),
        ApiService.getUnassignedStudents(),
        ApiService.getPendingParentApprovals(),
      ]);
      final students = [
        ...(results[0] as List<UserModel>),
        ...(results[1] as List<UserModel>),
      ];
      final uniqueStudents = <String, UserModel>{};
      for (final student in students) {
        if (student.id.isNotEmpty) {
          uniqueStudents.putIfAbsent(student.id, () => student);
        }
      }
      if (!mounted) return;
      setState(() {
        _students = uniqueStudents.values.toList();
        _pendingParents = results[2] as List<Map<String, dynamic>>;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _message(error);
        _loading = false;
      });
    }
  }

  String _message(Object error) =>
      error.toString().replaceFirst('Exception: ', '');

  Future<void> _assign(UserModel student) async {
    setState(() => _assigningStudentId = student.id);
    try {
      await ApiService.assignStudent(student.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم قبول الطالب وضمّه بنجاح.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_message(error))));
      }
    } finally {
      if (mounted) setState(() => _assigningStudentId = null);
    }
  }

  Future<void> _reject(UserModel student) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('رفض طلب التسجيل؟'),
        content: Text(
          'سيُعطّل حساب ${student.name} ويُؤرشف طلبه. ستظل بياناته محفوظة ويمكن مراجعتها لاحقًا.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.block_outlined),
            label: const Text('رفض'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _rejectingStudentId = student.id);
    try {
      await ApiService.rejectStudent(student.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم رفض الطلب وأرشفة الحساب.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_message(error))));
      }
    } finally {
      if (mounted) setState(() => _rejectingStudentId = null);
    }
  }

  Future<void> _approveParent(Map<String, dynamic> request) async {
    final parentId = request['parentId']?.toString() ?? '';
    final studentId = request['studentId']?.toString() ?? '';
    if (parentId.isEmpty || studentId.isEmpty) return;
    final key = '$parentId:$studentId';
    setState(() => _approvingParentKey = key);
    try {
      await ApiService.approveParent(parentId, studentId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم اعتماد ربط ولي الأمر بالطالب.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_message(error))));
      }
    } finally {
      if (mounted) setState(() => _approvingParentKey = null);
    }
  }

  Future<void> _openWhatsApp(UserModel student) async {
    final number = student.whatsappNumber.replaceAll(RegExp(r'\D'), '');
    if (number.isEmpty) return;
    await launchUrl(
      Uri.parse('https://wa.me/$number'),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _edit(UserModel student) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.94,
        child: _StudentEditor(student: student),
      ),
    );
    if (saved == true) await _load();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (!isAdminRole(AuthService.currentUser?.role)) {
      return const Scaffold(
        body: Center(child: Text('This section is for administrators.')),
      );
    }
    final normalized = _query.trim().toLowerCase();
    final visibleStudents = _students.where((student) {
      if (normalized.isEmpty) return true;
      return [
        student.name,
        student.email,
        student.phone,
        student.whatsappNumber,
      ].any((value) => value.toLowerCase().contains(normalized));
    }).toList();
    final unassignedStudents = visibleStudents
        .where(
          (student) =>
              student.assignedAdmin == null || student.assignedAdmin!.isEmpty,
        )
        .toList();
    final assignedStudents = visibleStudents
        .where(
          (student) =>
              student.assignedAdmin != null &&
              student.assignedAdmin!.isNotEmpty,
        )
        .toList();
    final isGlobalAdmin = AuthService.currentUser?.role == 'admin';
    final assignedByGrade = <String, List<UserModel>>{};
    for (final student in assignedStudents) {
      assignedByGrade.putIfAbsent(student.grade, () => []).add(student);
    }
    final gradeKeys = assignedByGrade.keys.toList()
      ..sort((a, b) => _gradeLabel(a).compareTo(_gradeLabel(b)));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('إدارة الطلاب'),
          actions: [
            IconButton(
              tooltip: 'تحديث القائمة',
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextField(
                textDirection: TextDirection.rtl,
                decoration: const InputDecoration(
                  labelText: 'بحث بالاسم أو البريد أو رقم التواصل',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (value) => setState(() => _query = value),
              ),
              const SizedBox(height: 12),
              if (_error != null)
                Card(
                  color: Colors.red.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                ),
              if (_pendingParents.isNotEmpty)
                Card(
                  color: AppTheme.lightGold,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'طلبات ربط أولياء الأمور',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.deepNavy,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'تحقق من هوية ولي الأمر خارج التطبيق قبل منح الوصول لبيانات الطالب.',
                          style: TextStyle(height: 1.5),
                        ),
                        const SizedBox(height: 8),
                        for (final request in _pendingParents)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text(
                                      request['parentName']?.toString() ?? '',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      request['parentPhone']?.toString() ?? '',
                                      textDirection: TextDirection.ltr,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'طلب متابعة: ${request['studentName'] ?? ''}',
                                    ),
                                    Align(
                                      alignment:
                                          AlignmentDirectional.centerStart,
                                      child: OutlinedButton.icon(
                                        onPressed: _approvingParentKey == null
                                            ? () => _approveParent(request)
                                            : null,
                                        icon: const Icon(
                                          Icons.verified_user_outlined,
                                        ),
                                        label: Text(
                                          _approvingParentKey ==
                                                  '${request['parentId']}:${request['studentId']}'
                                              ? 'جارٍ الاعتماد...'
                                              : 'اعتماد ربط الطالب',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_students.isEmpty && _error == null)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(18),
                    child: Text(
                      'لا يوجد طلاب في مجموعتك حالياً. تظهر هنا أسماء الطلاب غير المعيّنين لتتمكن من ضمّهم.',
                    ),
                  ),
                )
              else if (visibleStudents.isEmpty && _error == null)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(18),
                    child: Text('لا توجد نتائج مطابقة للبحث.'),
                  ),
                )
              else ...[
                if (unassignedStudents.isNotEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'طلبات التسجيل غير المعيّنة (${unassignedStudents.length})',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 10),
                          ...unassignedStudents.map(
                            (student) =>
                                _studentCard(student, unassigned: true),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (assignedStudents.isNotEmpty && isGlobalAdmin)
                  ...gradeKeys.map((grade) {
                    final stageStudents = assignedByGrade[grade]!;
                    return Card(
                      margin: const EdgeInsets.only(top: 8),
                      clipBehavior: Clip.antiAlias,
                      child: ExpansionTile(
                        leading: const Icon(Icons.folder_open_rounded),
                        title: Text(_gradeLabel(grade)),
                        subtitle: Text('${stageStudents.length} مخدوم'),
                        children: stageStudents
                            .map((student) => _studentCard(student))
                            .toList(),
                      ),
                    );
                  }),
                if (assignedStudents.isNotEmpty && !isGlobalAdmin)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'المخدومون داخل مجموعتك (${assignedStudents.length})',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 10),
                          ...assignedStudents.map(
                            (student) => _studentCard(student),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _gradeLabel(String grade) => switch (grade) {
    'primary_1_3' => 'المرحلة الابتدائية الأولى',
    'primary_4_6' => 'المرحلة الابتدائية الثانية',
    'preparatory' => 'المرحلة الإعدادية',
    'secondary' => 'المرحلة الثانوية',
    'university' => 'المرحلة الجامعية',
    'expatriates' => 'مرحلة المغتربين',
    _ => 'مرحلة غير محددة',
  };

  Widget _studentCard(UserModel student, {bool unassigned = false}) {
    final assignedToThisAdmin =
        student.assignedAdmin == AuthService.currentUser?.id;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.lightGold,
                  foregroundColor: AppTheme.darkBurgundy,
                  backgroundImage: student.picture.isEmpty
                      ? null
                      : NetworkImage(student.picture),
                  child: student.picture.isEmpty
                      ? Text(student.name.isEmpty ? '?' : student.name[0])
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        student.name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      if (student.email.isNotEmpty)
                        Text(student.email, textDirection: TextDirection.ltr),
                    ],
                  ),
                ),
              ],
            ),
            if (student.phone.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                'هاتف الطالب: ${student.phone}',
                textDirection: TextDirection.ltr,
              ),
            ],
            if (student.address.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text(student.address),
              ),
            if (student.interests.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text('اهتمامات الطالب: ${student.interests}'),
              ),
            if (student.whatsappNumber.isNotEmpty)
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                children: [
                  Text(
                    'واتساب: ${student.whatsappNumber}',
                    textDirection: TextDirection.ltr,
                  ),
                  TextButton.icon(
                    onPressed: () => _openWhatsApp(student),
                    icon: const Icon(Icons.chat_outlined, size: 18),
                    label: const Text('فتح المحادثة'),
                  ),
                ],
              ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (unassigned) ...[
                  OutlinedButton.icon(
                    onPressed: _assigningStudentId == null
                        ? () => _assign(student)
                        : null,
                    icon: _assigningStudentId == student.id
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.person_add_alt_1),
                    label: Text(
                      _assigningStudentId == student.id
                          ? 'جارٍ الضم...'
                          : 'ضم للمجموعة',
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: _rejectingStudentId == null
                        ? () => _reject(student)
                        : null,
                    icon: _rejectingStudentId == student.id
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.block_outlined),
                    label: const Text('رفض'),
                  ),
                ] else if (assignedToThisAdmin)
                  Chip(
                    avatar: Icon(
                      assignedToThisAdmin ? Icons.group : Icons.lock_outline,
                      size: 18,
                    ),
                    label: Text('ضمن مجموعتك'),
                  ),
                if (!unassigned && assignedToThisAdmin)
                  OutlinedButton.icon(
                    onPressed: () => _edit(student),
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('تعديل بيانات الطالب'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StudentEditor extends StatefulWidget {
  const _StudentEditor({required this.student});

  final UserModel student;

  @override
  State<_StudentEditor> createState() => _StudentEditorState();
}

class _StudentEditorState extends State<_StudentEditor> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  late String _gender;
  late bool _isDeacon;
  late DateTime? _birthDate;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final student = widget.student;
    _controllers.addAll({
      'name': TextEditingController(text: student.name),
      'email': TextEditingController(text: student.email),
      'interests': TextEditingController(text: student.interests),
      'phone': TextEditingController(text: student.phone),
      'fatherName': TextEditingController(text: student.fatherName),
      'confessionFather': TextEditingController(text: student.confessionFather),
      'guardianPhone': TextEditingController(text: student.parentPhone),
      'whatsappNumber': TextEditingController(text: student.whatsappNumber),
      'address': TextEditingController(text: student.address),
      'nationalId': TextEditingController(text: student.nationalId),
    });
    _gender = student.gender == 'female' ? 'female' : 'male';
    _isDeacon = student.isDeacon;
    _birthDate = DateTime.tryParse(student.birthDate);
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _chooseBirthDate() async {
    final now = DateTime.now();
    final initial = _birthDate ?? DateTime(now.year - 12, now.month, now.day);
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (date != null && mounted) setState(() => _birthDate = date);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_birthDate == null) {
      setState(() => _error = 'يرجى تحديد تاريخ الميلاد.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final result = await ApiService.updateUser(widget.student.id, {
        for (final entry in _controllers.entries)
          entry.key: entry.value.text.trim(),
        'gender': _gender,
        'isDeacon': _isDeacon,
        'birthDate': DateTime(
          _birthDate!.year,
          _birthDate!.month,
          _birthDate!.day,
          12,
        ).toUtc().toIso8601String(),
      });
      if (result == null) throw Exception('تعذر حفظ بيانات الطالب.');
      if (mounted) Navigator.of(context).pop(true);
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

  @override
  Widget build(BuildContext context) {
    final dateLabel = _birthDate == null
        ? 'اختر تاريخ الميلاد'
        : DateFormat('yyyy/MM/dd').format(_birthDate!);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Material(
        color: Theme.of(context).scaffoldBackgroundColor,
        child: Column(
          children: [
            AppBar(
              title: Text('تعديل ${widget.student.name}'),
              leading: IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ),
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    _field('name', 'الاسم رباعي', required: true),
                    _field(
                      'email',
                      'البريد الإلكتروني (.com) (اختياري)',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    _field(
                      'interests',
                      'اهتمامات الطالب (اختياري)',
                      maxLength: 500,
                      maxLines: 3,
                    ),
                    _field(
                      'phone',
                      'هاتف الطالب',
                      required: true,
                      keyboardType: TextInputType.phone,
                    ),
                    _field('fatherName', 'اسم الأب', required: true),
                    _field('confessionFather', 'أب الاعتراف', required: true),
                    _field(
                      'guardianPhone',
                      'هاتف ولي الأمر',
                      required: true,
                      keyboardType: TextInputType.phone,
                    ),
                    _field(
                      'whatsappNumber',
                      'رقم واتساب',
                      keyboardType: TextInputType.phone,
                    ),
                    _field('address', 'العنوان', required: true),
                    _field(
                      'nationalId',
                      'الرقم القومي (14 رقمًا)',
                      required: true,
                      keyboardType: TextInputType.number,
                      maxLength: 14,
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: _chooseBirthDate,
                      icon: const Icon(Icons.calendar_month),
                      label: Text('تاريخ الميلاد: $dateLabel'),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _gender,
                      decoration: const InputDecoration(labelText: 'النوع'),
                      items: const [
                        DropdownMenuItem(value: 'male', child: Text('ذكر')),
                        DropdownMenuItem(value: 'female', child: Text('أنثى')),
                      ],
                      onChanged: (value) =>
                          setState(() => _gender = value ?? 'male'),
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('شماس'),
                      value: _isDeacon,
                      onChanged: (value) => setState(() => _isDeacon = value),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    FilledButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: _saving
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save_outlined),
                      label: Text(
                        _saving ? 'جارٍ الحفظ...' : 'حفظ بيانات الطالب',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    String key,
    String label, {
    bool required = false,
    TextInputType? keyboardType,
    int? maxLength,
    int maxLines = 1,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextFormField(
      controller: _controllers[key],
      keyboardType: keyboardType,
      maxLength: maxLength,
      minLines: maxLines == 1 ? null : 2,
      maxLines: maxLines,
      textDirection:
          key == 'phone' ||
              key == 'guardianPhone' ||
              key == 'whatsappNumber' ||
              key == 'nationalId'
          ? TextDirection.ltr
          : TextDirection.rtl,
      decoration: InputDecoration(labelText: label),
      validator: (value) {
        final text = value?.trim() ?? '';
        if (required && text.isEmpty) return 'هذا الحقل مطلوب.';
        if (key == 'nationalId' && !RegExp(r'^\d{14}$').hasMatch(text)) {
          return 'يجب أن يتكون الرقم القومي من 14 رقمًا.';
        }
        if (key == 'email' &&
            text.isNotEmpty &&
            !RegExp(
              r'^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.com$',
              caseSensitive: false,
            ).hasMatch(text)) {
          return 'أدخل بريداً صحيحاً ينتهي بـ .com.';
        }
        return null;
      },
    ),
  );
}
