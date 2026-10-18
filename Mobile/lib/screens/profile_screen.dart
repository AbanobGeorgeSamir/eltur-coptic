import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/phone_field.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameArabicController = TextEditingController();
  final _confessionFatherController = TextEditingController();
  final _phoneController = TextEditingController();
  String _whatsapp = '';
  final _addressController = TextEditingController();
  final _fatherNameController = TextEditingController();
  String _parentPhone = '';
  final _emailController = TextEditingController();
  final _interestsController = TextEditingController();
  final _nationalIdController = TextEditingController();
  String _grade = '';
  String _meetingGroup = '';
  List<Map<String, dynamic>> _meetingGroups = [];
  bool _groupsLoading = false;
  String? _groupsError;
  int _groupsLoadVersion = 0;

  bool _isDeacon = false;
  bool _isLoading = false;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    _populateData();
  }

  void _populateData() {
    final user = AuthService.currentUser;
    if (user != null) {
      _fullNameArabicController.text = user.fullNameArabic;
      _confessionFatherController.text = user.confessionFather;
      _phoneController.text = user.phone;
      _whatsapp = user.whatsappNumber;
      _addressController.text = user.address;
      _fatherNameController.text = user.fatherName;
      _parentPhone = user.parentPhone;
      _emailController.text = user.email;
      _interestsController.text = user.interests;
      _nationalIdController.text = user.nationalId;
      _isDeacon = user.isDeacon;
      _grade = user.grade;
      _meetingGroup = user.meetingGroup;
    }
  }

  Future<void> _loadMeetingGroups(String grade) async {
    final version = ++_groupsLoadVersion;
    setState(() {
      _grade = grade;
      _meetingGroup = '';
      _meetingGroups = [];
      _groupsLoading = true;
      _groupsError = null;
    });
    try {
      final groups = await ApiService.getMeetingGroups(grade);
      if (!mounted || version != _groupsLoadVersion) return;
      setState(() => _meetingGroups = groups);
    } catch (_) {
      if (!mounted || version != _groupsLoadVersion) return;
      setState(
        () => _groupsError =
            'تعذر تحميل الاجتماعات. تحقق من الاتصال ثم أعد اختيار المرحلة.',
      );
    } finally {
      if (mounted && version == _groupsLoadVersion) {
        setState(() => _groupsLoading = false);
      }
    }
  }

  Future<void> _updateProfile() async {
    final user = AuthService.currentUser;
    if (user == null || !_formKey.currentState!.validate()) return;
    final completingGrade = user.role == 'student' && user.grade.isEmpty;
    if (completingGrade &&
        (_grade.isEmpty ||
            _groupsLoading ||
            _groupsError != null ||
            (_meetingGroups.isNotEmpty && _meetingGroup.isEmpty))) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('اختر المرحلة والاجتماع قبل حفظ البيانات.'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final updates = {
      'name': _fullNameArabicController.text.trim(),
      'email': _emailController.text.trim().toLowerCase(),
      'interests': _interestsController.text.trim(),
      'phone': _phoneController.text.trim(),
      'confessionFather': _confessionFatherController.text.trim(),
      'whatsappNumber': _whatsapp,
      'address': _addressController.text.trim(),
      'fatherName': _fatherNameController.text.trim(),
      'guardianPhone': _parentPhone,
      'isDeacon': _isDeacon,
      if (completingGrade) 'grade': _grade,
      if (completingGrade) 'meetingGroup': _meetingGroup,
    };

    try {
      final updatedUser = await ApiService.updateUser(user.id, updates);
      if (updatedUser != null) {
        await AuthService.updateUser(updatedUser);
        if (mounted) {
          setState(() {
            _populateData();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تم تحديث البيانات الشخصية بنجاح')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ أثناء التحديث: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmDeleteAccount() async {
    final passwordController = TextEditingController();
    final password = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('حذف الحساب نهائيًا؟'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'سيُحذف الحساب والسجلات الشخصية المرتبطة به. لا يمكن التراجع عن ذلك.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passwordController,
              obscureText: true,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'كلمة المرور للتأكيد',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () =>
                Navigator.pop(dialogContext, passwordController.text),
            child: const Text('حذف الحساب'),
          ),
        ],
      ),
    );
    passwordController.dispose();
    if (password == null || password.isEmpty || !mounted) return;

    setState(() => _isDeleting = true);
    try {
      await ApiService.deleteAccount(password);
      await AuthService.logout();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _isDeleting = false);
    }
  }

  @override
  void dispose() {
    _fullNameArabicController.dispose();
    _confessionFatherController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _fatherNameController.dispose();
    _emailController.dispose();
    _interestsController.dispose();
    _nationalIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('الملف الشخصي والبيانات الكنسية')),
        body: user == null
            ? const Center(child: Text('غير مسجل دخول'))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 45,
                        backgroundColor: AppTheme.primaryBurgundy,
                        foregroundImage: user.picture.isEmpty
                            ? null
                            : NetworkImage(user.picture),
                        child: Text(
                          user.name.isNotEmpty ? user.name[0] : 'C',
                          style: const TextStyle(
                            fontSize: 36,
                            color: AppTheme.accentGold,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      Text(
                        user.fullNameArabic.isNotEmpty
                            ? user.fullNameArabic
                            : user.name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.deepNavy,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user.email.isEmpty
                            ? user.phone
                            : '${user.email}  ·  ${user.phone}',
                        textDirection: TextDirection.ltr,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Chip(
                        label: Text(user.roleInArabic),
                        backgroundColor: AppTheme.lightGold,
                      ),
                      if (user.gradeInArabic.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Chip(
                          avatar: const Icon(Icons.school_outlined, size: 18),
                          label: Text(user.gradeInArabic),
                          backgroundColor: AppTheme.lightGold,
                        ),
                      ],
                      if (user.role == 'student' && user.grade.isEmpty) ...[
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          initialValue: _grade.isEmpty ? null : _grade,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'المرحلة الدراسية (تُحدد مرة واحدة)',
                            prefixIcon: Icon(Icons.school_outlined),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'primary_1_3',
                              child: Text('المرحلة الابتدائية الأولى'),
                            ),
                            DropdownMenuItem(
                              value: 'primary_4_6',
                              child: Text('المرحلة الابتدائية الثانية'),
                            ),
                            DropdownMenuItem(
                              value: 'preparatory',
                              child: Text('المرحلة الإعدادية'),
                            ),
                            DropdownMenuItem(
                              value: 'secondary',
                              child: Text('المرحلة الثانوية'),
                            ),
                            DropdownMenuItem(
                              value: 'university',
                              child: Text('المرحلة الجامعية'),
                            ),
                            DropdownMenuItem(
                              value: 'expatriates',
                              child: Text('مرحلة المغتربين'),
                            ),
                          ],
                          onChanged: (value) {
                            if (value != null) _loadMeetingGroups(value);
                          },
                        ),
                        if (_grade.isNotEmpty && _meetingGroups.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: _meetingGroup.isEmpty
                                ? null
                                : _meetingGroup,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'الاجتماع الفرعي',
                              prefixIcon: Icon(Icons.groups_outlined),
                            ),
                            items: _meetingGroups.map((group) {
                              final id = group['id']?.toString() ?? '';
                              return DropdownMenuItem(
                                value: id,
                                child: Text(group['name']?.toString() ?? ''),
                              );
                            }).toList(),
                            onChanged: _groupsLoading
                                ? null
                                : (value) => setState(
                                    () => _meetingGroup = value ?? '',
                                  ),
                          ),
                        ],
                        if (_groupsLoading)
                          const Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: LinearProgressIndicator(),
                          ),
                        if (_groupsError != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              _groupsError!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                        if (!_groupsLoading &&
                            _groupsError == null &&
                            _grade.isNotEmpty &&
                            _meetingGroups.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: Text(
                              'لا توجد اجتماعات فرعية محددة لهذه المرحلة.',
                            ),
                          ),
                      ],
                      const SizedBox(height: 20),

                      TextFormField(
                        controller: _fullNameArabicController,
                        decoration: const InputDecoration(
                          labelText: 'الاسم رباعي باللغة العربية',
                          prefixIcon: Icon(
                            Icons.person,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _confessionFatherController,
                        decoration: const InputDecoration(
                          labelText: 'اسم أب الاعتراف',
                          prefixIcon: Icon(
                            Icons.church,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        textDirection: TextDirection.ltr,
                        decoration: const InputDecoration(
                          labelText: 'رقم الهاتف',
                          prefixIcon: Icon(
                            Icons.phone,
                            color: AppTheme.primaryBurgundy,
                          ),
                          helperText:
                              'اكتب الرقم بصيغة دولية، مثال: +201001234567.',
                        ),
                        validator: (value) {
                          final phone = value?.trim() ?? '';
                          return RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(phone)
                              ? null
                              : 'Enter a valid phone number with country code.';
                        },
                      ),
                      const SizedBox(height: 12),
                      PhoneField(
                        label: 'رقم الواتساب',
                        value: _whatsapp,
                        onChanged: (value) => setState(() => _whatsapp = value),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(
                          labelText: 'العنوان السكني (طور سيناء)',
                          prefixIcon: Icon(
                            Icons.home,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _fatherNameController,
                        decoration: const InputDecoration(
                          labelText: 'اسم الأب',
                          prefixIcon: Icon(
                            Icons.family_restroom,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      PhoneField(
                        label: 'رقم ولي الأمر',
                        value: _parentPhone,
                        onChanged: (value) =>
                            setState(() => _parentPhone = value),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textDirection: TextDirection.ltr,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'البريد الإلكتروني (.com) (اختياري)',
                          prefixIcon: Icon(
                            Icons.email,
                            color: AppTheme.primaryBurgundy,
                          ),
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
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _interestsController,
                        minLines: 2,
                        maxLines: 4,
                        maxLength: 500,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: const InputDecoration(
                          labelText: 'اهتماماتك (اختياري)',
                          hintText: 'مثال: الترانيم، القراءة، الرياضة...',
                          alignLabelWithHint: true,
                          prefixIcon: Icon(
                            Icons.interests_outlined,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _nationalIdController,
                        readOnly: true,
                        decoration: const InputDecoration(
                          labelText: 'الرقم القومي (14 رقم)',
                          prefixIcon: Icon(
                            Icons.credit_card,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      SwitchListTile(
                        title: const Text('شماس بالمذبح المبارك'),
                        value: _isDeacon,
                        onChanged: (v) => setState(() => _isDeacon = v),
                      ),
                      const SizedBox(height: 20),

                      _isLoading
                          ? const CircularProgressIndicator()
                          : ElevatedButton.icon(
                              onPressed: _updateProfile,
                              icon: const Icon(Icons.save),
                              label: const Text('حفظ وتحديث البيانات'),
                            ),
                      const SizedBox(height: 20),
                      OutlinedButton.icon(
                        onPressed: _isDeleting ? null : _confirmDeleteAccount,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red.shade700,
                          side: BorderSide(color: Colors.red.shade300),
                          minimumSize: const Size.fromHeight(48),
                        ),
                        icon: const Icon(Icons.delete_outline),
                        label: Text(
                          _isDeleting ? 'جارٍ حذف الحساب...' : 'حذف الحساب',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}
