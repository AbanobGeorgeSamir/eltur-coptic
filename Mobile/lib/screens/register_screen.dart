import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import '../data/colleges.dart' show academicYears, collegeGroups;
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import 'home_screen.dart';
import 'privacy_policy_screen.dart';
import '../widgets/phone_field.dart';
import '../widgets/theme_toggle_button.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameArabicController = TextEditingController();
  final _confessionFatherController = TextEditingController();
  String _phone = '';
  String _whatsapp = '';
  final _addressController = TextEditingController();
  final _fatherNameController = TextEditingController();
  String _parentPhone = '';
  final _emailController = TextEditingController();
  final _interestsController = TextEditingController();
  final _birthDateController = TextEditingController();
  final _nationalIdController = TextEditingController();
  bool _fatherNameManuallyEdited = false;
  bool _usernameManuallyEdited = false;

  String _gender = 'male';
  bool _isDeacon = false;
  bool _privacyPolicyAccepted = false;
  bool _isLoading = false;
  String _grade = '';
  String _academicYear = '';
  String _college = '';

  static const _grades = <Map<String, String>>[
    {
      'id': 'primary_1_3',
      'label':
          'المرحلة الابتدائية الأولى (من الصف الأول إلى الصف الثالث الابتدائي)',
    },
    {
      'id': 'primary_4_6',
      'label':
          'المرحلة الابتدائية الثانية (من الصف الرابع إلى الصف السادس الابتدائي)',
    },
    {'id': 'preparatory', 'label': 'المرحلة الإعدادية'},
    {'id': 'secondary', 'label': 'المرحلة الثانوية'},
    {'id': 'university', 'label': 'المرحلة الجامعية'},
    {'id': 'expatriates', 'label': 'مرحلة المغتربين'},
  ];
  Future<void> _selectBirthDate() async {
    final today = DateTime.now();
    final existingDate = DateTime.tryParse(_birthDateController.text);
    final initialDate = existingDate != null && !existingDate.isAfter(today)
        ? existingDate
        : DateTime(today.year - 18, today.month, today.day);
    final selectedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: DateTime(today.year, today.month, today.day),
    );
    if (selectedDate == null || !mounted) return;
    setState(() {
      _birthDateController.text = selectedDate
          .toIso8601String()
          .split('T')
          .first;
    });
  }

  String? _birthDateFromNationalId(String nationalId) {
    if (!RegExp(r'^[23]\d{13}$').hasMatch(nationalId)) return null;

    final century = nationalId[0] == '2' ? 1900 : 2000;
    final year = century + int.parse(nationalId.substring(1, 3));
    final month = int.parse(nationalId.substring(3, 5));
    final day = int.parse(nationalId.substring(5, 7));
    final date = DateTime(year, month, day);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    if (date.year != year ||
        date.month != month ||
        date.day != day ||
        date.isAfter(todayDate)) {
      return null;
    }

    return '${year.toString().padLeft(4, '0')}-'
        '${month.toString().padLeft(2, '0')}-'
        '${day.toString().padLeft(2, '0')}';
  }

  void _updateFatherNameFromFullName(String fullName) {
    final nameParts = fullName.trim().split(RegExp(r'\s+'));
    if (!_fatherNameManuallyEdited) {
      _fatherNameController.text = nameParts.length > 1 ? nameParts[1] : '';
    }
    if (!_usernameManuallyEdited) {
      _usernameController.text =
          nameParts.isNotEmpty && nameParts.first.isNotEmpty
          ? nameParts.first
          : '';
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _fullNameArabicController.dispose();
    _confessionFatherController.dispose();
    _addressController.dispose();
    _fatherNameController.dispose();
    _emailController.dispose();
    _interestsController.dispose();
    _birthDateController.dispose();
    _nationalIdController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_privacyPolicyAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('يجب الموافقة على سياسة الخصوصية للمتابعة'),
        ),
      );
      return;
    }
    if (_grade.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختر مرحلتك قبل إكمال التسجيل.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final userData = {
      'name': _fullNameArabicController.text.trim(),
      'username': _usernameController.text.trim(),
      'password': _passwordController.text,
      'email': _emailController.text.trim().toLowerCase(),
      'interests': _interestsController.text.trim(),
      'phone': _phone,
      'fullNameArabic': _fullNameArabicController.text.trim(),
      'confessionFather': _confessionFatherController.text.trim(),
      'address': _addressController.text.trim(),
      'fatherName': _fatherNameController.text.trim(),
      'guardianPhone': _parentPhone,
      'birthDate': _birthDateController.text.trim(),
      'gender': _gender,
      'nationalId': _nationalIdController.text.trim(),
      'isDeacon': _isDeacon,
      'whatsappNumber': _whatsapp.isNotEmpty ? _whatsapp : _phone,
      'privacyAccepted': _privacyPolicyAccepted,
      'grade': _grade,
      if (_grade == 'expatriates') 'academicYear': _academicYear,
      if (_grade == 'expatriates') 'college': _college,
    };

    var routeReplaced = false;
    try {
      final response = await ApiService.register(userData);
      final user = UserModel.fromJson(
        Map<String, dynamic>.from(response['user'] as Map),
      );
      final token = response['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('لم يُرجع الخادم رمز جلسة صالحاً.');
      }
      await AuthService.saveSession(user, token);

      if (!mounted) return;

      routeReplaced = true;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (_) => false,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'خطأ أثناء التسجيل: ${e.toString().replaceAll('Exception: ', '')}',
          ),
        ),
      );
    } finally {
      if (mounted && !routeReplaced) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          actions: const [ThemeToggleButton(), SizedBox(width: 8)],
          title: const Text(
            'استمارة تسجيل بيانات الخادم/المخدوم',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'استمارة تسجيل بيانات الخادم/المخدوم',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryBurgundy,
                  ),
                ),
                const SizedBox(height: 16),

                // 1. Full Arabic Name (الاسم رباعي)
                TextFormField(
                  controller: _fullNameArabicController,
                  onChanged: _updateFatherNameFromFullName,
                  decoration: const InputDecoration(
                    labelText: 'الاسم رباعي باللغة العربية *',
                    prefixIcon: Icon(
                      Icons.person,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (v) =>
                      v == null || v.trim().split(RegExp(r'\s+')).length < 4
                      ? 'يرجى إدخال الاسم رباعياً'
                      : null,
                ),
                const SizedBox(height: 12),

                // 2 & 3. Username & Password
                Column(
                  children: [
                    TextFormField(
                      controller: _usernameController,
                      onChanged: (_) => _usernameManuallyEdited = true,
                      decoration: const InputDecoration(
                        labelText: 'اسم المستخدم *',
                        prefixIcon: Icon(
                          Icons.account_circle,
                          color: AppTheme.primaryBurgundy,
                        ),
                      ),
                      validator: (v) =>
                          v == null || v.trim().isEmpty ? 'مطلوب' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      maxLength: 256,
                      decoration: const InputDecoration(
                        labelText: 'كلمة المرور *',
                        prefixIcon: Icon(
                          Icons.lock,
                          color: AppTheme.primaryBurgundy,
                        ),
                      ),
                      validator: (v) =>
                          v == null || v.length < 8 || v.length > 256
                          ? 'استخدم من 8 إلى 256 حرفاً.'
                          : null,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 5. Father of Confession (اب الاعتراف)
                DropdownButtonFormField<String>(
                  initialValue: _grade.isEmpty ? null : _grade,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'المرحلة الدراسية *',
                    prefixIcon: Icon(
                      Icons.school_outlined,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  items: _grades
                      .map(
                        (grade) => DropdownMenuItem(
                          value: grade['id'],
                          child: Text(
                            grade['label']!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _grade = value;
                        if (value != 'expatriates') {
                          _academicYear = '';
                          _college = '';
                        }
                      });
                    }
                  },
                  validator: (value) => value == null || value.isEmpty
                      ? 'يرجى اختيار المرحلة الدراسية'
                      : null,
                ),
                const SizedBox(height: 4),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(
                    'سيُراجع الأدمن طلبك ويضيفك إلى الاجتماع المناسب من إدارة الطلاب.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary(context),
                    ),
                  ),
                ),
                if (_grade == 'expatriates') ...[
                  const SizedBox(height: 12),
                  Card(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? AppTheme.darkCardSurface
                        : AppTheme.lightGold.withValues(alpha: 0.35),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'بيانات مرحلة المغتربين',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary(context),
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: _academicYear.isEmpty
                                ? null
                                : _academicYear,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: 'الفرقة *',
                              prefixIcon: Icon(
                                Icons.groups_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            hint: const Text('اختر'),
                            items: academicYears
                                .map(
                                  (year) => DropdownMenuItem(
                                    value: year,
                                    child: Text(
                                      year,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) =>
                                setState(() => _academicYear = value ?? ''),
                            validator: (value) => value == null || value.isEmpty
                                ? 'يرجى اختيار الفرقة'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: _college.isEmpty ? null : _college,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: 'الكلية *',
                              prefixIcon: Icon(
                                Icons.school_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            hint: const Text('اختر'),
                            items: [
                              for (final group in collegeGroups) ...[
                                for (final college in group.colleges)
                                  DropdownMenuItem(
                                    value: college,
                                    child: Text(
                                      college,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                              ],
                            ],
                            onChanged: (value) =>
                                setState(() => _college = value ?? ''),
                            validator: (value) => value == null || value.isEmpty
                                ? 'يرجى اختيار الكلية'
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 12),

                TextFormField(
                  controller: _confessionFatherController,
                  decoration: const InputDecoration(
                    labelText: 'اسم أب الاعتراف *',
                    prefixIcon: Icon(
                      Icons.church,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'يرجى إدخال اسم أب الاعتراف'
                      : null,
                ),
                const SizedBox(height: 12),

                PhoneField(
                  label: 'رقم الهاتف *',
                  value: _phone,
                  required: true,
                  onChanged: (value) => setState(() => _phone = value),
                ),
                const SizedBox(height: 12),
                PhoneField(
                  label: 'رقم الواتساب (اختياري)',
                  value: _whatsapp,
                  onChanged: (value) => setState(() => _whatsapp = value),
                ),
                const SizedBox(height: 12),

                // 8. Address (العنوان)
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    labelText: 'العنوان السكني (طور سيناء) *',
                    prefixIcon: Icon(
                      Icons.home,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'يرجى كتابة العنوان'
                      : null,
                ),
                const SizedBox(height: 12),

                // 9 & 10. Father's Name & Parent Phone
                TextFormField(
                  controller: _fatherNameController,
                  onChanged: (_) => _fatherNameManuallyEdited = true,
                  decoration: const InputDecoration(
                    labelText: 'اسم الأب *',
                    prefixIcon: Icon(
                      Icons.family_restroom,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'يرجى إدخال اسم الأب'
                      : null,
                ),
                const SizedBox(height: 12),
                PhoneField(
                  label: 'رقم ولي الأمر *',
                  value: _parentPhone,
                  required: true,
                  onChanged: (value) => setState(() => _parentPhone = value),
                ),
                const SizedBox(height: 12),

                // Email address
                Column(
                  children: [
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textDirection: TextDirection.ltr,
                      decoration: const InputDecoration(
                        labelText: 'البريد الإلكتروني (اختياري)',
                        prefixIcon: Icon(
                          Icons.email,
                          color: AppTheme.primaryBurgundy,
                        ),
                      ),
                      validator: (v) {
                        final email = v?.trim() ?? '';
                        if (email.isEmpty) return null;
                        return !RegExp(
                              r'^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.com$',
                              caseSensitive: false,
                            ).hasMatch(email)
                            ? 'أدخل بريداً صحيحاً ينتهي بـ .com.'
                            : null;
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
                const SizedBox(height: 12),

                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(
                    'اهتماماتك *',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'اكتب اهتمامًا أو أكثر بحرية. تُحفظ مع ملفك الشخصي.',
                  style: TextStyle(fontSize: 12, color: Colors.black54),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _interestsController,
                  minLines: 2,
                  maxLines: 4,
                  maxLength: 500,
                  textCapitalization: TextCapitalization.sentences,
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'اكتب اهتمامًا واحدًا على الأقل.'
                      : null,
                  decoration: const InputDecoration(
                    labelText: 'الاهتمامات',
                    hintText: 'اكتب اهتماماتك هنا...',
                    alignLabelWithHint: true,
                    prefixIcon: Icon(
                      Icons.interests_outlined,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // 13 & 14. Birth Date & National ID
                Column(
                  children: [
                    TextFormField(
                      controller: _birthDateController,
                      readOnly: true,
                      onTap: _selectBirthDate,
                      decoration: const InputDecoration(
                        labelText: 'تاريخ الميلاد *',
                        prefixIcon: Icon(
                          Icons.cake,
                          color: AppTheme.primaryBurgundy,
                        ),
                      ),
                      validator: (value) {
                        final date = DateTime.tryParse(value?.trim() ?? '');
                        if (date == null) return 'يرجى اختيار تاريخ الميلاد';
                        final today = DateTime.now();
                        if (date.isAfter(
                          DateTime(today.year, today.month, today.day),
                        )) {
                          return 'تاريخ الميلاد يجب أن يكون اليوم أو قبله';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _nationalIdController,
                      onChanged: (value) {
                        final birthDate = _birthDateFromNationalId(value);
                        if (birthDate != null) {
                          _birthDateController.text = birthDate;
                        }
                      },
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(14),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'الرقم القومي (14 رقم) *',
                        prefixIcon: Icon(
                          Icons.credit_card,
                          color: AppTheme.primaryBurgundy,
                        ),
                      ),
                      validator: (value) =>
                          RegExp(r'^\d{14}$').hasMatch(value?.trim() ?? '')
                          ? null
                          : 'أدخل الرقم القومي المكوّن من 14 رقماً',
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Gender & Is Deacon Switches
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const Text('النوع: '),
                            ChoiceChip(
                              label: const Text('ذكر'),
                              selected: _gender == 'male',
                              onSelected: (_) =>
                                  setState(() => _gender = 'male'),
                            ),
                            ChoiceChip(
                              label: const Text('أنثى'),
                              selected: _gender == 'female',
                              onSelected: (_) =>
                                  setState(() => _gender = 'female'),
                            ),
                          ],
                        ),
                        const Divider(),
                        SwitchListTile(
                          title: const Text(
                            'هل المتقدم شماس بالمذبح المبارك؟ (شماس)',
                          ),
                          value: _isDeacon,
                          onChanged: (v) => setState(() => _isDeacon = v),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Privacy Policy Consent Checkbox
                Row(
                  children: [
                    Checkbox(
                      value: _privacyPolicyAccepted,
                      activeColor: AppTheme.primaryBurgundy,
                      onChanged: (v) =>
                          setState(() => _privacyPolicyAccepted = v ?? false),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const PrivacyPolicyScreen(),
                            ),
                          );
                        },
                        child: const Text.rich(
                          TextSpan(
                            text: 'قرأت ووافقت على ',
                            children: [
                              TextSpan(
                                text: 'سياسة الخصوصية والشروط الكنسية',
                                style: TextStyle(
                                  color: AppTheme.primaryBurgundy,
                                  fontWeight: FontWeight.bold,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton(
                        onPressed: _register,
                        child: const Text('إنشاء الحساب'),
                      ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
