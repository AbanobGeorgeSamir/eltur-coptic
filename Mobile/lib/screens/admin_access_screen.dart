import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class AdminAccessScreen extends StatefulWidget {
  const AdminAccessScreen({super.key});

  @override
  State<AdminAccessScreen> createState() => _AdminAccessScreenState();
}

class _AdminAccessScreenState extends State<AdminAccessScreen> {
  static const _grades = <({String id, String label})>[
    (id: 'primary_1_3', label: 'المرحلة الابتدائية الأولى'),
    (id: 'primary_4_6', label: 'المرحلة الابتدائية الثانية'),
    (id: 'preparatory', label: 'المرحلة الإعدادية'),
    (id: 'secondary', label: 'المرحلة الثانوية'),
    (id: 'university', label: 'المرحلة الجامعية'),
    (id: 'expatriates', label: 'مرحلة المغتربين'),
    (id: 'primary', label: 'ابتدائي (حساب سابق)'),
  ];

  final _adminFormKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  List<Map<String, dynamic>> _groups = [];
  List<Map<String, dynamic>> _administrators = [];
  String _grade = '';
  String _newAdminGroup = '';
  bool _loading = true;
  bool _saving = false;
  bool _useExistingAccount = true;
  bool _candidateLoading = false;
  bool _candidateHasMore = false;
  String _candidateQuery = '';
  List<Map<String, dynamic>> _candidates = [];
  Map<String, dynamic>? _selectedCandidate;
  Timer? _candidateSearchTimer;
  int _candidateSearchVersion = 0;
  String? _error;
  int _loadVersion = 0;

  UserModel? get _user => AuthService.currentUser;
  bool get _isGlobalAdmin => _user?.role == 'admin';

  @override
  void initState() {
    super.initState();
    final userGrade = _user?.grade ?? '';
    _grade = _grades.any((item) => item.id == userGrade)
        ? userGrade
        : _grades.first.id;
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _candidateSearchTimer?.cancel();
    super.dispose();
  }

  void _onCandidateQueryChanged(String value) {
    _candidateSearchTimer?.cancel();
    final query = value.trim();
    final version = ++_candidateSearchVersion;
    setState(() {
      _candidateQuery = value;
      _selectedCandidate = null;
      _candidates = [];
      _candidateHasMore = false;
      _candidateLoading = query.length >= 2;
    });
    if (query.length < 2) return;
    _candidateSearchTimer = Timer(
      const Duration(milliseconds: 300),
      () => _loadCandidatePage(query, 0, version),
    );
  }

  Future<void> _loadCandidatePage(
    String query,
    int offset,
    int version, {
    bool append = false,
  }) async {
    try {
      final result = await ApiService.searchAdministratorCandidates(
        query,
        offset: offset,
      );
      if (!mounted || version != _candidateSearchVersion) return;
      final candidates = List<Map<String, dynamic>>.from(
        result['data'] as List? ?? const [],
      );
      setState(() {
        _candidates = append ? [..._candidates, ...candidates] : candidates;
        _candidateHasMore = result['hasMore'] == true;
        _candidateLoading = false;
      });
    } catch (error) {
      if (!mounted || version != _candidateSearchVersion) return;
      setState(() {
        _candidateLoading = false;
        _error = _message(error);
      });
    }
  }

  Future<void> _load() async {
    final loadVersion = ++_loadVersion;
    final grade = _grade;
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final results = await Future.wait<dynamic>([
        ApiService.getAdminMeetingGroups(grade),
        if (_isGlobalAdmin)
          ApiService.getAdministrators()
        else
          Future.value(<Map<String, dynamic>>[]),
      ]);
      if (!mounted || loadVersion != _loadVersion) return;
      final groups = results[0] as List<Map<String, dynamic>>;
      final administrators = results[1] as List<Map<String, dynamic>>;
      setState(() {
        _groups = groups;
        _administrators = administrators;
        if (!_groups.any(
          (group) =>
              group['id'] == _newAdminGroup && group['isActive'] != false,
        )) {
          _newAdminGroup = '';
        }
      });
    } catch (error) {
      if (mounted && loadVersion == _loadVersion) {
        setState(() => _error = _message(error));
      }
    } finally {
      if (mounted && loadVersion == _loadVersion) {
        setState(() => _loading = false);
      }
    }
  }

  String _message(Object error) =>
      error.toString().replaceFirst('Exception: ', '');

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _createAdministrator() async {
    if (!_adminFormKey.currentState!.validate()) return;
    final selectedUserId =
        (_selectedCandidate?['id'] ?? _selectedCandidate?['_id'])
            ?.toString()
            .trim() ??
        '';
    final selectedStage =
        _grades.any((item) => item.id == _grade && item.id != 'primary')
        ? _grade
        : _grades.first.id;
    if (_useExistingAccount &&
        !RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(selectedUserId)) {
      _showMessage('ابحث عن حساب مسجل واختره أولاً.');
      return;
    }
    final alreadyAssigned = _administrators.any(
      (administrator) =>
          administrator['role'] != 'admin' &&
          administrator['grade'] == selectedStage &&
          administrator['isActive'] != false,
    );
    if (alreadyAssigned) {
      _showMessage('يوجد مسؤول نشط لهذه المرحلة بالفعل.');
      return;
    }
    if (_grade != selectedStage) {
      setState(() {
        _grade = selectedStage;
        _newAdminGroup = '';
      });
    }
    setState(() => _saving = true);
    try {
      await ApiService.createAdministrator({
        if (_useExistingAccount) 'userId': selectedUserId,
        if (!_useExistingAccount) 'name': _nameController.text.trim(),
        if (!_useExistingAccount) 'username': _usernameController.text.trim(),
        if (!_useExistingAccount) 'phone': _phoneController.text.trim(),
        if (!_useExistingAccount) 'email': _emailController.text.trim(),
        if (!_useExistingAccount) 'password': _passwordController.text,
        'stage': selectedStage,
        'grade': selectedStage,
        'meetingGroup': _newAdminGroup,
      });
      if (!mounted) return;
      _nameController.clear();
      _usernameController.clear();
      _phoneController.clear();
      _emailController.clear();
      _passwordController.clear();
      _newAdminGroup = '';
      setState(() {
        _selectedCandidate = null;
        _candidateQuery = '';
        _candidates = [];
        _candidateHasMore = false;
      });
      _showMessage(
        _useExistingAccount
            ? 'تم تعيين الحساب المسجل كمسؤول للمرحلة.'
            : 'تم إنشاء مسؤول المرحلة.',
      );
      await _load();
    } catch (error) {
      _showMessage(_message(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _roleForGrade(String grade) => grade == 'primary'
      ? 'grade_admin'
      : const {'primary_1_3', 'primary_4_6'}.contains(grade)
      ? 'primary_admin'
      : 'secondary_admin';

  Future<void> _editAdministrator(Map<String, dynamic> administrator) async {
    final id = administrator['id']?.toString() ?? '';
    final isSelf = id == _user?.id;
    var globalRole = administrator['role'] == 'admin';
    var grade = (administrator['grade'] ?? _grades.first.id).toString();
    if (!_grades.any((item) => item.id == grade)) grade = _grades.first.id;
    var isActive = administrator['isActive'] != false;
    final currentGroup = administrator['meetingGroup'];
    var groupId = currentGroup is Map
        ? (currentGroup['id'] ?? '').toString()
        : '';
    var groupOptions = <Map<String, dynamic>>[];
    var groupsLoading = !globalRole;
    if (!globalRole) {
      try {
        groupOptions = await ApiService.getAdminMeetingGroups(
          grade,
          includeInactive: false,
        );
        if (!groupOptions.any((group) => group['id'] == groupId)) groupId = '';
      } catch (_) {
        groupOptions = [];
      }
    }
    if (!mounted) return;

    final updates = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          Future<void> loadGroups(String selectedGrade) async {
            setDialogState(() {
              groupsLoading = true;
              groupId = '';
            });
            try {
              final rows = await ApiService.getAdminMeetingGroups(
                selectedGrade,
                includeInactive: false,
              );
              if (dialogContext.mounted) {
                setDialogState(() => groupOptions = rows);
              }
            } catch (_) {
              if (dialogContext.mounted) {
                setDialogState(() => groupOptions = []);
              }
            } finally {
              if (dialogContext.mounted) {
                setDialogState(() => groupsLoading = false);
              }
            }
          }

          return AlertDialog(
            title: const Text('تعديل صلاحيات المسؤول'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(administrator['name']?.toString() ?? ''),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    key: ValueKey('role-${globalRole ? 'global' : 'stage'}'),
                    initialValue: globalRole ? 'admin' : 'stage',
                    decoration: const InputDecoration(
                      labelText: 'نوع الصلاحية',
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'stage',
                        child: Text('مسؤول مرحلة'),
                      ),
                      DropdownMenuItem(
                        value: 'admin',
                        child: Text('مسؤول خدمة (أمين عام)'),
                      ),
                    ],
                    onChanged: isSelf
                        ? null
                        : (value) {
                            setDialogState(() => globalRole = value == 'admin');
                            if (value == 'stage') unawaited(loadGroups(grade));
                          },
                  ),
                  if (!globalRole) ...[
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      key: ValueKey('grade-$grade'),
                      initialValue: grade,
                      decoration: const InputDecoration(labelText: 'المرحلة'),
                      items: _grades
                          .map(
                            (item) => DropdownMenuItem(
                              value: item.id,
                              child: Text(
                                item.label,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value == null) return;
                        setDialogState(() => grade = value);
                        unawaited(loadGroups(value));
                      },
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      key: ValueKey('group-$grade-$groupId'),
                      initialValue: groupId,
                      decoration: InputDecoration(
                        labelText: 'المجموعة',
                        helperText: groupsLoading
                            ? 'جارٍ تحميل الاجتماعات…'
                            : null,
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('كل اجتماعات المرحلة'),
                        ),
                        ...groupOptions.map(
                          (group) => DropdownMenuItem(
                            value: group['id'].toString(),
                            child: Text(
                              group['name'].toString(),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ],
                      onChanged: groupsLoading
                          ? null
                          : (value) =>
                                setDialogState(() => groupId = value ?? ''),
                    ),
                  ],
                  const SizedBox(height: 8),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('الحساب نشط'),
                    value: isActive,
                    onChanged: isSelf
                        ? null
                        : (value) => setDialogState(() => isActive = value),
                  ),
                  if (isSelf)
                    const Text(
                      'لا يمكن تغيير صلاحيات حسابك أو إيقافه من هنا.',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                    ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('إلغاء'),
              ),
              FilledButton(
                onPressed: isSelf
                    ? null
                    : () => Navigator.pop(dialogContext, {
                        'role': globalRole ? 'admin' : _roleForGrade(grade),
                        if (!globalRole) 'grade': grade,
                        'meetingGroup': globalRole ? '' : groupId,
                        'isActive': isActive,
                      }),
                child: const Text('حفظ التغييرات'),
              ),
            ],
          );
        },
      ),
    );
    if (updates == null || !mounted) return;
    try {
      await ApiService.updateAdministrator(id, updates);
      _showMessage('تم حفظ صلاحيات المسؤول.');
      await _load();
    } catch (error) {
      _showMessage(_message(error));
    }
  }

  Future<void> _deleteAdministrator(Map<String, dynamic> administrator) async {
    final id = administrator['id']?.toString() ?? '';
    if (id.isEmpty || id == _user?.id) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('حذف المسؤول'),
        content: Text(
          'سيُحذف حساب «${administrator['name'] ?? ''}» من قاعدة البيانات. ستُنقل سجلاته الإدارية إلى حسابك، وستعود حسابات الطلاب المعيّنة إليه إلى قائمة غير المعيّنين. لا يمكن التراجع.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('حذف المسؤول'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _saving = true);
    try {
      await ApiService.deleteAdministrator(id);
      await _load();
      _showMessage('تم حذف حساب المسؤول مع الاحتفاظ بسجلاته الإدارية.');
    } catch (error) {
      _showMessage(_message(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final alreadyAssigned = _administrators.any(
      (administrator) =>
          administrator['role'] != 'admin' &&
          administrator['grade'] == _grade &&
          administrator['isActive'] != false,
    );
    final activeGroups = _groups
        .where((group) => group['isActive'] != false)
        .toList();
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('إدارة المراحل والمسؤولين'),
          actions: [
            IconButton(
              onPressed: _loading ? null : _load,
              tooltip: 'تحديث',
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: _loading && _groups.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null)
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
                    if (!_isGlobalAdmin)
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.school_outlined),
                          title: const Text('إدارة المرحلة'),
                          subtitle: Text(
                            _user?.gradeInArabic.isNotEmpty == true
                                ? _user!.gradeInArabic
                                : 'يمكنك متابعة المخدومين من شاشة إدارة الطلاب.',
                          ),
                        ),
                      ),
                    if (_isGlobalAdmin) ...[
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Form(
                            key: _adminFormKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'إنشاء مسؤول مرحلة',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'اختر المرحلة التي سيُسند إليها الحساب. صلاحية primary_admin أو secondary_admin ستُحدد تلقائياً من المرحلة.',
                                ),
                                if (alreadyAssigned)
                                  const Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      'يوجد مسؤول نشط لهذه المرحلة بالفعل. أوقف الحساب الحالي قبل تعيين مسؤول جديد.',
                                      style: TextStyle(
                                        color: AppTheme.textMuted,
                                      ),
                                    ),
                                  ),
                                const SizedBox(height: 12),
                                DropdownButtonFormField<String>(
                                  key: ValueKey('create-stage-$_grade'),
                                  initialValue: _grade == 'primary'
                                      ? _grades.first.id
                                      : _grade,
                                  decoration: const InputDecoration(
                                    labelText: 'المرحلة المطلوبة *',
                                  ),
                                  items: _grades
                                      .where((item) => item.id != 'primary')
                                      .map(
                                        (item) => DropdownMenuItem(
                                          value: item.id,
                                          child: Text(
                                            item.label,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      )
                                      .toList(),
                                  validator: (value) =>
                                      value == null || value.isEmpty
                                      ? 'اختر المرحلة المطلوبة.'
                                      : null,
                                  onChanged: (value) {
                                    if (value == null) return;
                                    setState(() {
                                      _grade = value;
                                      _newAdminGroup = '';
                                    });
                                    unawaited(_load());
                                  },
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ChoiceChip(
                                        label: const Text('استخدام حساب مسجل'),
                                        selected: _useExistingAccount,
                                        onSelected: (_) => setState(() {
                                          _useExistingAccount = true;
                                          _error = null;
                                        }),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: ChoiceChip(
                                        label: const Text('إنشاء حساب جديد'),
                                        selected: !_useExistingAccount,
                                        onSelected: (_) => setState(() {
                                          _useExistingAccount = false;
                                          _selectedCandidate = null;
                                          _error = null;
                                        }),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                if (_useExistingAccount) ...[
                                  TextField(
                                    onChanged: _onCandidateQueryChanged,
                                    autocorrect: false,
                                    decoration: const InputDecoration(
                                      labelText:
                                          'ابحث بالاسم أو اسم المستخدم أو الهاتف',
                                      hintText: 'اكتب حرفين أو أكثر',
                                      prefixIcon: Icon(Icons.search),
                                    ),
                                  ),
                                  if (_candidateLoading)
                                    const Padding(
                                      padding: EdgeInsets.only(top: 8),
                                      child: LinearProgressIndicator(),
                                    ),
                                  if (_candidateQuery.trim().length >= 2 &&
                                      !_candidateLoading &&
                                      _candidates.isEmpty)
                                    const Padding(
                                      padding: EdgeInsets.only(top: 8),
                                      child: Text(
                                        'لم يتم العثور على حساب مسجل بهذا البحث.',
                                      ),
                                    ),
                                  ..._candidates.map((candidate) {
                                    final selected =
                                        _selectedCandidate?['id'] ==
                                        candidate['id'];
                                    return Card(
                                      margin: const EdgeInsets.only(top: 8),
                                      child: ListTile(
                                        selected: selected,
                                        selectedTileColor: AppTheme.lightGold,
                                        onTap: () => setState(
                                          () => _selectedCandidate = candidate,
                                        ),
                                        title: Text(
                                          candidate['name']?.toString() ?? '',
                                        ),
                                        subtitle: Text(
                                          '${candidate['role'] == 'parent' ? 'ولي أمر' : 'مخدوم'} · ${candidate['phone'] ?? ''}${candidate['isActive'] == false ? ' · حساب معطل' : ''}',
                                        ),
                                        trailing: Text(
                                          candidate['username']?.toString() ??
                                              '',
                                          textDirection: TextDirection.ltr,
                                        ),
                                      ),
                                    );
                                  }),
                                  if (_candidateHasMore)
                                    TextButton(
                                      onPressed: _candidateLoading
                                          ? null
                                          : () => _loadCandidatePage(
                                              _candidateQuery.trim(),
                                              _candidates.length,
                                              _candidateSearchVersion,
                                              append: true,
                                            ),
                                      child: const Text('عرض نتائج أخرى'),
                                    ),
                                  if (_selectedCandidate != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(
                                        'الحساب المختار: ${_selectedCandidate!['username']} · ${_selectedCandidate!['name']}',
                                        style: const TextStyle(
                                          color: Colors.green,
                                        ),
                                      ),
                                    ),
                                ] else ...[
                                  TextFormField(
                                    controller: _nameController,
                                    maxLength: 160,
                                    decoration: const InputDecoration(
                                      labelText: 'الاسم الكامل',
                                    ),
                                    validator: (value) =>
                                        (value?.trim().length ?? 0) < 7
                                        ? 'اكتب الاسم الكامل.'
                                        : null,
                                  ),
                                  const SizedBox(height: 8),
                                  TextFormField(
                                    controller: _usernameController,
                                    maxLength: 160,
                                    autocorrect: false,
                                    decoration: const InputDecoration(
                                      labelText: 'اسم الدخول (اختياري)',
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextFormField(
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    textDirection: TextDirection.ltr,
                                    decoration: const InputDecoration(
                                      labelText: 'الهاتف بصيغة دولية',
                                    ),
                                    validator: (value) =>
                                        RegExp(
                                          r'^\+[1-9]\d{7,14}$',
                                        ).hasMatch(value?.trim() ?? '')
                                        ? null
                                        : 'أدخل رقماً دولياً صحيحاً مثل +201001234567.',
                                  ),
                                  const SizedBox(height: 8),
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textDirection: TextDirection.ltr,
                                    autocorrect: false,
                                    decoration: const InputDecoration(
                                      labelText: 'البريد الإلكتروني (اختياري)',
                                    ),
                                    validator: (value) {
                                      final email = value?.trim() ?? '';
                                      if (email.isEmpty) return null;
                                      return RegExp(
                                            r'^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.com$',
                                            caseSensitive: false,
                                          ).hasMatch(email)
                                          ? null
                                          : 'أدخل بريداً صحيحاً ينتهي بـ .com.';
                                    },
                                  ),
                                  const SizedBox(height: 8),
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: true,
                                    maxLength: 256,
                                    decoration: const InputDecoration(
                                      labelText:
                                          'كلمة المرور (٨ أحرف على الأقل)',
                                    ),
                                    validator: (value) =>
                                        (value?.length ?? 0) < 8
                                        ? 'استخدم ٨ أحرف على الأقل.'
                                        : null,
                                  ),
                                ],
                                if (activeGroups.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  DropdownButtonFormField<String>(
                                    key: ValueKey(
                                      'new-admin-group-$_grade-$_newAdminGroup',
                                    ),
                                    initialValue: _newAdminGroup,
                                    decoration: const InputDecoration(
                                      labelText: 'المجموعة (اختياري)',
                                    ),
                                    items: [
                                      const DropdownMenuItem(
                                        value: '',
                                        child: Text('كل اجتماعات المرحلة'),
                                      ),
                                      ...activeGroups.map(
                                        (group) => DropdownMenuItem(
                                          value: group['id'].toString(),
                                          child: Text(
                                            group['name'].toString(),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ],
                                    onChanged: (value) => setState(
                                      () => _newAdminGroup = value ?? '',
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 14),
                                if (_grade == 'primary')
                                  const Padding(
                                    padding: EdgeInsets.only(bottom: 10),
                                    child: Text(
                                      'هذه مرحلة قديمة للحسابات السابقة؛ لا يمكن إنشاء مسؤول جديد عليها.',
                                      style: TextStyle(
                                        color: AppTheme.textMuted,
                                      ),
                                    ),
                                  ),
                                FilledButton.icon(
                                  onPressed:
                                      _saving ||
                                          _grade == 'primary' ||
                                          alreadyAssigned
                                      ? null
                                      : _createAdministrator,
                                  icon: _saving
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.person_add_alt_1_rounded,
                                        ),
                                  label: const Text('إنشاء الحساب'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'حسابات المسؤولين',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              if (_administrators.isEmpty)
                                const Text('لا توجد حسابات مسؤولين.'),
                              ..._administrators.map((administrator) {
                                final group = administrator['meetingGroup'];
                                final details =
                                    [
                                          _gradeLabel(
                                            (administrator['grade'] ?? '')
                                                .toString(),
                                          ),
                                          if (group is Map &&
                                              group['name'] != null)
                                            group['name'].toString(),
                                          administrator['isActive'] == false
                                              ? 'موقوف'
                                              : 'نشط',
                                        ]
                                        .where((value) => value.isNotEmpty)
                                        .join(' · ');
                                return Card(
                                  margin: const EdgeInsets.only(top: 8),
                                  child: Column(
                                    children: [
                                      ListTile(
                                        title: Text(
                                          administrator['name']?.toString() ??
                                              '',
                                        ),
                                        subtitle: Text(
                                          administrator['role'] == 'admin'
                                              ? 'مسؤول خدمة (أمين عام) · $details'
                                              : details,
                                        ),
                                        trailing: IconButton(
                                          tooltip: 'تعديل الصلاحيات',
                                          onPressed: () =>
                                              _editAdministrator(administrator),
                                          icon: const Icon(Icons.edit_outlined),
                                        ),
                                      ),
                                      Align(
                                        alignment:
                                            AlignmentDirectional.centerEnd,
                                        child: Padding(
                                          padding:
                                              const EdgeInsetsDirectional.only(
                                                end: 8,
                                                bottom: 4,
                                              ),
                                          child: TextButton.icon(
                                            onPressed:
                                                _saving ||
                                                    administrator['id'] ==
                                                        _user?.id
                                                ? null
                                                : () => _deleteAdministrator(
                                                    administrator,
                                                  ),
                                            icon: const Icon(
                                              Icons.delete_outline_rounded,
                                              size: 18,
                                            ),
                                            label: const Text('حذف المسؤول'),
                                            style: TextButton.styleFrom(
                                              foregroundColor: Theme.of(
                                                context,
                                              ).colorScheme.error,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),
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

  String _gradeLabel(String grade) {
    for (final item in _grades) {
      if (item.id == grade) return item.label;
    }
    return '';
  }
}
