import 'package:material_ui/material_ui.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:url_launcher/url_launcher.dart';

import '../models/user_model.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../data/colleges.dart';
import '../data/residence_options.dart';
import '../widgets/searchable_country_field.dart';

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
  String _filterAcademicYear = '';
  String _filterCollege = '';
  String _filterCountry = '';
  String _filterGovernorate = '';
  String? _error;
  String? _approvingParentKey;
  String? _rejectingStudentId;
  String? _assigningStudentId;

  Future<void> _load() async {
    if (!mounted) return;
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

  Future<void> _deleteStudent(UserModel student) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('حذف المستخدم نهائياً؟'),
        content: Text(
          'هل أنت متأكد من حذف حساب الطالب "${student.name}" وجميع سجلاته (الغياب، الاعترافات، المهام، وغيرها) نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_forever),
            label: const Text('حذف نهائياً'),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.dangerRed,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ApiService.deleteUser(student.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم حذف حساب الطالب وجميع سجلاته بنجاح.'),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_message(error))));
      }
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
      if (_filterAcademicYear.isNotEmpty &&
          student.academicYear != _filterAcademicYear) {
        return false;
      }
      if (_filterCollege.isNotEmpty && student.college != _filterCollege) {
        return false;
      }
      if (_filterCountry.isNotEmpty && student.country != _filterCountry) {
        return false;
      }
      if (_filterGovernorate.isNotEmpty &&
          student.governorate != _filterGovernorate) {
        return false;
      }
      if (normalized.isEmpty) {
        return true;
      }
      return [
        student.name,
        student.email,
        student.phone,
        student.whatsappNumber,
        student.academicYear,
        student.college,
        student.country,
        student.governorate,
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
              const SizedBox(height: 10),
              LayoutBuilder(
                builder: (context, constraints) {
                  final fieldWidth = constraints.maxWidth >= 600
                      ? (constraints.maxWidth - 10) / 2
                      : constraints.maxWidth;
                  return Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: [
                      SizedBox(
                        width: fieldWidth,
                        child: DropdownButtonFormField<String>(
                          initialValue: _filterAcademicYear,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'تصفية حسب الفرقة',
                            prefixIcon: Icon(Icons.groups_outlined),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('كل الفرق'),
                            ),
                            ...academicYears.map(
                              (year) => DropdownMenuItem(
                                value: year,
                                child: Text(
                                  year,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                          ],
                          onChanged: (value) =>
                              setState(() => _filterAcademicYear = value ?? ''),
                        ),
                      ),
                      SizedBox(
                        width: fieldWidth,
                        child: DropdownButtonFormField<String>(
                          initialValue: _filterCollege,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'تصفية حسب الكلية',
                            prefixIcon: Icon(Icons.account_balance_outlined),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('كل الكليات'),
                            ),
                            ...{
                              ...colleges.where(
                                (college) => college != otherCollegeLabel,
                              ),
                              ..._students
                                  .map((student) => student.college)
                                  .where((college) => college.isNotEmpty),
                            }.map(
                              (college) => DropdownMenuItem(
                                value: college,
                                child: Text(
                                  college,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                          ],
                          onChanged: (value) =>
                              setState(() => _filterCollege = value ?? ''),
                        ),
                      ),
                      SizedBox(
                        width: fieldWidth,
                        child: SearchableCountryField(
                          value: _filterCountry,
                          label: '\u0627\u0644\u0628\u0644\u062f',
                          hint:
                              '\u0643\u0644 \u0627\u0644\u0628\u0644\u062f\u0627\u0646',
                          allowClear: true,
                          onChanged: (value) => setState(() {
                            _filterCountry = value;
                            _filterGovernorate = '';
                          }),
                        ),
                      ),
                      SizedBox(
                        width: fieldWidth,
                        child: DropdownButtonFormField<String>(
                          initialValue: _filterGovernorate,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText:
                                '\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629',
                            prefixIcon: const Icon(
                              Icons.location_city_outlined,
                            ),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text(
                                '\u0643\u0644 \u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0627\u062a',
                              ),
                            ),
                            ...egyptGovernorates.map(
                              (governorate) => DropdownMenuItem(
                                value: governorate,
                                child: Text(governorate),
                              ),
                            ),
                          ],
                          onChanged: (value) =>
                              setState(() => _filterGovernorate = value ?? ''),
                        ),
                      ),
                    ],
                  );
                },
              ),
              if (_query.isNotEmpty ||
                  _filterAcademicYear.isNotEmpty ||
                  _filterCollege.isNotEmpty ||
                  _filterCountry.isNotEmpty ||
                  _filterGovernorate.isNotEmpty)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: TextButton.icon(
                    onPressed: () => setState(() {
                      _query = '';
                      _filterAcademicYear = '';
                      _filterCollege = '';
                      _filterCountry = '';
                      _filterGovernorate = '';
                    }),
                    icon: const Icon(Icons.filter_alt_off_outlined, size: 18),
                    label: const Text('مسح عوامل التصفية'),
                  ),
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
                    child: Text('لا توجد نتائج مطابقة للبحث أو عوامل التصفية.'),
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
    final isGlobalAdmin = AuthService.currentUser?.role == 'admin';
    final assignedToThisAdmin =
        student.assignedAdmin == AuthService.currentUser?.id;
    final canManageStudent = isGlobalAdmin || assignedToThisAdmin || unassigned;
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
                      Text(
                        _gradeLabel(student.grade),
                        style: TextStyle(
                          color: AppTheme.textSecondary(context),
                          fontSize: 12,
                        ),
                      ),
                      if (student.email.isNotEmpty)
                        Text(student.email, textDirection: TextDirection.ltr),
                    ],
                  ),
                ),
              ],
            ),
            if (student.academicYear.isNotEmpty ||
                student.college.isNotEmpty ||
                student.country.isNotEmpty ||
                student.governorate.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 10),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? AppTheme.accentGold.withValues(alpha: 0.12)
                      : AppTheme.lightGold,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.accentGold.withValues(alpha: 0.3)
                        : const Color(0xFFEADFCB),
                  ),
                ),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    if (student.academicYear.isNotEmpty)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.school_outlined,
                            size: 16,
                            color:
                                Theme.of(context).brightness == Brightness.dark
                                ? AppTheme.accentGold
                                : AppTheme.primaryBurgundy,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'الفرقة: ${student.academicYear}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color:
                                  Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? AppTheme.darkTextLight
                                  : AppTheme.textDark,
                            ),
                          ),
                        ],
                      ),
                    if (student.college.isNotEmpty)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.account_balance_outlined,
                            size: 16,
                            color:
                                Theme.of(context).brightness == Brightness.dark
                                ? AppTheme.accentGold
                                : AppTheme.primaryBurgundy,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'الكلية: ${student.college}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color:
                                  Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? AppTheme.darkTextLight
                                  : AppTheme.textDark,
                            ),
                          ),
                          if (student.country.isNotEmpty)
                            Chip(
                              label: Text(
                                '\u0627\u0644\u0628\u0644\u062f: ${student.country}',
                              ),
                              visualDensity: VisualDensity.compact,
                            ),
                          if (student.governorate.isNotEmpty)
                            Chip(
                              label: Text(
                                '\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629: ${student.governorate}',
                              ),
                              visualDensity: VisualDensity.compact,
                            ),
                        ],
                      ),
                  ],
                ),
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
                  OutlinedButton.icon(
                    onPressed: () => _deleteStudent(student),
                    icon: const Icon(
                      Icons.delete_outline,
                      color: AppTheme.dangerRed,
                    ),
                    label: const Text(
                      'حذف نهائياً',
                      style: TextStyle(color: AppTheme.dangerRed),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.dangerRed),
                    ),
                  ),
                ] else ...[
                  if (assignedToThisAdmin)
                    Chip(
                      avatar: const Icon(Icons.group, size: 18),
                      label: const Text('ضمن مجموعتك'),
                    ),
                  if (canManageStudent)
                    OutlinedButton.icon(
                      onPressed: () => _edit(student),
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('تعديل البيانات'),
                    ),
                  if (canManageStudent)
                    OutlinedButton.icon(
                      onPressed: () => _deleteStudent(student),
                      icon: const Icon(
                        Icons.delete_outline,
                        color: AppTheme.dangerRed,
                      ),
                      label: const Text(
                        'حذف المستخدم',
                        style: TextStyle(color: AppTheme.dangerRed),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.dangerRed),
                      ),
                    ),
                ],
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
  late String _academicYear;
  late String _collegeChoice;
  late String _country;
  late String _governorate;
  final _otherCollegeController = TextEditingController();
  bool _saving = false;
  bool _routeClosed = false;
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
    _academicYear = student.academicYear;
    _collegeChoice = collegeChoiceFor(student.college);
    _otherCollegeController.text = isKnownCollege(student.college)
        ? ''
        : student.college;
    _country = student.country;
    _governorate = student.governorate;
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    _otherCollegeController.dispose();
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
        if (isHigherEducationGrade(widget.student.grade)) ...{
          'academicYear': _academicYear,
          'college': _collegeChoice == otherCollegeValue
              ? _otherCollegeController.text.trim()
              : _collegeChoice,
          'country': _country,
          'governorate': _country == egyptCountryName ? _governorate : '',
        },
      });
      if (result == null) throw Exception('تعذر حفظ بيانات الطالب.');
      if (mounted) {
        _routeClosed = true;
        setState(() => _saving = false);
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted && !_routeClosed) setState(() => _saving = false);
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
                    if (isHigherEducationGrade(widget.student.grade)) ...[
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: academicYears.contains(_academicYear)
                            ? _academicYear
                            : null,
                        isExpanded: true,
                        decoration: InputDecoration(labelText: 'الفرقة *'),
                        hint: Text('اختر'),
                        items: academicYears
                            .map(
                              (year) => DropdownMenuItem(
                                value: year,
                                child: Text(year),
                              ),
                            )
                            .toList(),
                        onChanged: (value) =>
                            setState(() => _academicYear = value ?? ''),
                        validator: (value) => value == null || value.isEmpty
                            ? 'اختر الفرقة'
                            : null,
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _collegeChoice.isEmpty
                            ? null
                            : _collegeChoice,
                        isExpanded: true,
                        decoration: InputDecoration(labelText: 'الكلية *'),
                        hint: Text('اختر'),
                        items: [
                          ...colleges
                              .where((college) => college != otherCollegeLabel)
                              .map(
                                (college) => DropdownMenuItem(
                                  value: college,
                                  child: Text(
                                    college,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                          DropdownMenuItem(
                            value: otherCollegeValue,
                            child: Text(otherCollegeLabel),
                          ),
                        ],
                        onChanged: (value) => setState(() {
                          _collegeChoice = value ?? '';
                          if (_collegeChoice != otherCollegeValue) {
                            _otherCollegeController.clear();
                          }
                        }),
                        validator: (value) => value == null || value.isEmpty
                            ? 'اختر الكلية'
                            : null,
                      ),
                      if (_collegeChoice == otherCollegeValue) ...[
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _otherCollegeController,
                          maxLength: 160,
                          decoration: InputDecoration(
                            labelText: 'اكتب اسم الكلية *',
                            hintText:
                                '\u0627\u0633\u0645 \u0627\u0644\u0643\u0644\u064a\u0629 \u0623\u0648 \u0627\u0644\u0645\u0639\u0647\u062f',
                          ),
                          validator: (value) =>
                              _collegeChoice == otherCollegeValue &&
                                  (value == null || value.trim().isEmpty)
                              ? 'اكتب اسم الكلية أو المعهد'
                              : null,
                        ),
                      ],
                      const SizedBox(height: 8),
                      SearchableCountryField(
                        value: _country,
                        label:
                            '\u0628\u0644\u062f \u0627\u0644\u0625\u0642\u0627\u0645\u0629 *',
                        hint:
                            '\u0627\u062e\u062a\u0631 \u0628\u0644\u062f \u0627\u0644\u0625\u0642\u0627\u0645\u0629',
                        validator: (value) => value == null || value.isEmpty
                            ? '\u0627\u062e\u062a\u0631 \u0628\u0644\u062f \u0627\u0644\u0625\u0642\u0627\u0645\u0629'
                            : null,
                        onChanged: (value) => setState(() {
                          _country = value;
                          if (_country != egyptCountryName) _governorate = '';
                        }),
                      ),
                      if (_country == egyptCountryName) ...[
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          initialValue: _governorate.isEmpty
                              ? null
                              : _governorate,
                          isExpanded: true,
                          decoration: InputDecoration(labelText: 'المحافظة *'),
                          hint: Text('اختر المحافظة'),
                          items: egyptGovernorates
                              .map(
                                (governorate) => DropdownMenuItem(
                                  value: governorate,
                                  child: Text(governorate),
                                ),
                              )
                              .toList(),
                          onChanged: (value) =>
                              setState(() => _governorate = value ?? ''),
                          validator: (value) =>
                              _country == egyptCountryName &&
                                  (value == null || value.isEmpty)
                              ? 'اختر المحافظة'
                              : null,
                        ),
                      ],
                    ],
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
