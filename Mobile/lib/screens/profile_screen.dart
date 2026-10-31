import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../data/colleges.dart';
import '../data/residence_options.dart';
import '../widgets/phone_field.dart';
import '../widgets/residence_location_fields.dart';
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
  String _phone = '';
  String _whatsapp = '';
  final _addressController = TextEditingController();
  final _fatherNameController = TextEditingController();
  String _parentPhone = '';
  final _emailController = TextEditingController();
  final _interestsController = TextEditingController();
  final _nationalIdController = TextEditingController();
  final _otherCollegeController = TextEditingController();
  String _academicYear = '';
  String _collegeChoice = '';
  String _governorate = '';
  String _city = '';
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
      _phone = user.phone;
      _whatsapp = user.whatsappNumber;
      _addressController.text = user.address;
      _fatherNameController.text = user.fatherName;
      _parentPhone = user.parentPhone;
      _emailController.text = user.email;
      _interestsController.text = user.interests;
      _nationalIdController.text = user.nationalId;
      _isDeacon = user.isDeacon;
      _grade = user.grade;
      _academicYear = user.academicYear;
      _collegeChoice = collegeChoiceFor(user.college);
      _otherCollegeController.text = isKnownCollege(user.college)
          ? ''
          : user.college;
      _governorate = user.governorate;
      _city = user.city;
      _meetingGroup = user.meetingGroup;
    }
  }

  Future<void> _loadMeetingGroups(String grade) async {
    final version = ++_groupsLoadVersion;
    setState(() {
      _grade = grade;
      _meetingGroup = '';
      if (!isHigherEducationGrade(grade)) {
        _academicYear = '';
        _collegeChoice = '';
        _otherCollegeController.clear();
        _governorate = '';
        _city = '';
      }
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
      'phone': _phone,
      'confessionFather': _confessionFatherController.text.trim(),
      'whatsappNumber': _whatsapp,
      'address': _addressController.text.trim(),
      'fatherName': _fatherNameController.text.trim(),
      'guardianPhone': _parentPhone,
      'isDeacon': _isDeacon,
      if (user.role == 'student' && isHigherEducationGrade(_grade)) ...{
        'academicYear': _academicYear,
        'college': _collegeChoice == otherCollegeValue
            ? _otherCollegeController.text.trim()
            : _collegeChoice,
        'country': egyptCountryName,
        'governorate': _governorate,
        'city': _city,
      },
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
    var routeReplaced = false;
    try {
      await ApiService.deleteAccount(password);
      await AuthService.logout();
      if (!mounted) return;
      routeReplaced = true;
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
      if (mounted && !routeReplaced) setState(() => _isDeleting = false);
    }
  }

  @override
  void dispose() {
    _fullNameArabicController.dispose();
    _confessionFatherController.dispose();
    _addressController.dispose();
    _fatherNameController.dispose();
    _emailController.dispose();
    _interestsController.dispose();
    _nationalIdController.dispose();
    _otherCollegeController.dispose();
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
                      if (isHigherEducationGrade(user.grade) &&
                          (user.academicYear.isNotEmpty ||
                              user.college.isNotEmpty ||
                              user.governorate.isNotEmpty)) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            if (user.academicYear.isNotEmpty)
                              Chip(
                                avatar: const Icon(Icons.school, size: 16),
                                label: Text(
                                  '\u0627\u0644\u0641\u0631\u0642\u0629: ${user.academicYear}',
                                ),
                                backgroundColor: AppTheme.lightGold,
                              ),
                            if (user.college.isNotEmpty)
                              Chip(
                                avatar: const Icon(
                                  Icons.account_balance,
                                  size: 16,
                                ),
                                label: Text(
                                  '\u0627\u0644\u0643\u0644\u064a\u0629: ${user.college}',
                                ),
                                backgroundColor: AppTheme.lightGold,
                              ),
                            if (user.governorate.isNotEmpty)
                              Chip(
                                avatar: const Icon(
                                  Icons.location_city_outlined,
                                  size: 16,
                                ),
                                label: Text(
                                  '\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629: ${user.governorate}',
                                ),
                                backgroundColor: AppTheme.lightGold,
                              ),
                            if (user.city.isNotEmpty)
                              Chip(
                                avatar: const Icon(Icons.place_outlined, size: 16),
                                label: Text('المدينة/المركز: ${user.city}'),
                                backgroundColor: AppTheme.lightGold,
                              ),
                          ],
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
                      if (user.role == 'student' &&
                          isHigherEducationGrade(_grade)) ...[
                        const SizedBox(height: 16),
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: Text(
                            '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0631\u0627\u0633\u0629 \u0648\u0627\u0644\u0625\u0642\u0627\u0645\u0629',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          initialValue: academicYears.contains(_academicYear)
                              ? _academicYear
                              : null,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText: '\u0627\u0644\u0641\u0631\u0642\u0629 *',
                          ),
                          hint: Text('\u0627\u062e\u062a\u0631'),
                          items: [
                            ...academicYears.map(
                              (year) => DropdownMenuItem(
                                value: year,
                                child: Text(year),
                              ),
                            ),
                          ],
                          onChanged: (value) =>
                              setState(() => _academicYear = value ?? ''),
                          validator: (value) => value == null || value.isEmpty
                              ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0631\u0642\u0629'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _collegeChoice.isEmpty
                              ? null
                              : _collegeChoice,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText: '\u0627\u0644\u0643\u0644\u064a\u0629 *',
                          ),
                          hint: Text('\u0627\u062e\u062a\u0631'),
                          items: [
                            for (final group in collegeGroups)
                              for (final college in group.colleges)
                                if (college != otherCollegeLabel)
                                  DropdownMenuItem(
                                    value: college,
                                    child: Text(
                                      college,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
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
                              ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0643\u0644\u064a\u0629'
                              : null,
                        ),
                        if (_collegeChoice == otherCollegeValue) ...[
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _otherCollegeController,
                            maxLength: 160,
                            decoration: InputDecoration(
                              labelText:
                                  '\u0627\u0643\u062a\u0628 \u0627\u0633\u0645 \u0627\u0644\u0643\u0644\u064a\u0629 *',
                              hintText:
                                  '\u0627\u0633\u0645 \u0627\u0644\u0643\u0644\u064a\u0629 \u0623\u0648 \u0627\u0644\u0645\u0639\u0647\u062f',
                            ),
                            validator: (value) =>
                                _collegeChoice == otherCollegeValue &&
                                    (value == null || value.trim().isEmpty)
                                ? '\u0627\u0643\u062a\u0628 \u0627\u0633\u0645 \u0627\u0644\u0643\u0644\u064a\u0629 \u0627\u0633\u0645 \u0627\u0644\u0643\u0644\u064a\u0629 \u0623\u0648 \u0627\u0644\u0645\u0639\u0647\u062f'
                                : null,
                          ),
                        ],
                        const SizedBox(height: 12),
                        ResidenceLocationFields(
                          governorate: _governorate,
                          city: _city,
                          onGovernorateChanged: (value) =>
                              setState(() => _governorate = value),
                          onCityChanged: (value) => setState(() => _city = value),
                        ),
                        const SizedBox(height: 20),
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

                      PhoneField(
                        label: 'رقم الهاتف',
                        value: _phone,
                        required: true,
                        onChanged: (value) => setState(() => _phone = value),
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
                          labelText: 'البريد الإلكتروني',
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
