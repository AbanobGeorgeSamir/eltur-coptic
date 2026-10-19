import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/church_date_card.dart';
import '../widgets/fathers_section.dart';
import 'login_screen.dart';
import 'privacy_policy_screen.dart';
import 'register_screen.dart';

class PublicHomeScreen extends StatelessWidget {
  const PublicHomeScreen({super.key});

  void _open(BuildContext context, Widget page) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  }

  Future<void> _openWhatsApp(BuildContext context) async {
    try {
      final contact = await ApiService.getContact();
      final value = contact['whatsappUrl']?.toString() ?? '';
      final baseUri = Uri.tryParse(value);
      if (baseUri == null ||
          baseUri.scheme != 'https' ||
          baseUri.host.isEmpty) {
        throw Exception('رقم واتساب الكنيسة غير متاح حالياً.');
      }
      final queryParameters = Map<String, String>.from(baseUri.queryParameters)
        ..remove('text');
      final uri = baseUri.replace(queryParameters: queryParameters);
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw Exception('تعذر فتح واتساب على هذا الجهاز.');
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 72,
          title: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  'resources/images/kenesa-icon.png',
                  width: 38,
                  height: 38,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Semantics(
                  label: 'كنيسة موسي النبي ومارمرقس الرسول',
                  child: Text(
                    'كنيسة موسي النبي ومارمرقس الرسول',
                    maxLines: 2,
                    style: const TextStyle(fontSize: 14, height: 1.15),
                  ),
                ),
              ),
            ],
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1000),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    color: AppTheme.deepNavy,
                    child: Padding(
                      padding: const EdgeInsets.all(22),
                      child: Column(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(22),
                            child: Image.asset(
                              'resources/images/kenesa.jpeg',
                              width: 92,
                              height: 92,
                              fit: BoxFit.cover,
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'حياة الكنيسة، أقرب إليك.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'مساحة تجمع صلواتك وقراءاتك وخدمة مدارس الأحد، وتساعد الأسر والخدام على متابعة حياة الخدمة اليومية.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white70,
                              height: 1.7,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Center(
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 480),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  FilledButton.icon(
                                    onPressed: () =>
                                        _open(context, const LoginScreen()),
                                    icon: const Icon(Icons.login_rounded),
                                    label: const Text('تسجيل الدخول'),
                                  ),
                                  const SizedBox(height: 8),
                                  OutlinedButton.icon(
                                    onPressed: () =>
                                        _open(context, const RegisterScreen()),
                                    icon: const Icon(Icons.person_add_alt_1),
                                    label: const Text('إنشاء حساب'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      side: const BorderSide(
                                        color: Colors.white54,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  OutlinedButton.icon(
                                    onPressed: () => _openWhatsApp(context),
                                    icon: const Icon(Icons.chat_rounded),
                                    label: const Text('تواصل معنا عبر واتساب'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      side: const BorderSide(
                                        color: Colors.white54,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const ChurchDateCard(),
                  const SizedBox(height: 24),
                  const _SectionHeading(
                    eyebrow: 'كل ما يهمك في مكان واحد',
                    title: 'مساحة مصممة لحياة الخدمة',
                  ),
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final columns = constraints.maxWidth >= 680 ? 4 : 2;
                      final cardWidth =
                          (constraints.maxWidth - (columns - 1) * 10) / columns;
                      const features = [
                        (
                          Icons.menu_book_rounded,
                          'الأجبية والإنجيل',
                          'صلوات وقراءات يومية، مع وصول سريع إلى السفر والإصحاح والآية.',
                        ),
                        (
                          Icons.check_box_rounded,
                          'مسيرتك الروحية',
                          'تابع صلواتك ومهامك الأسبوعية من مكان واحد.',
                        ),
                        (
                          Icons.calendar_month_rounded,
                          'الحياة الكنسية',
                          'اعرف مواعيد القداسات والأنشطة والدروس القادمة.',
                        ),
                        (
                          Icons.groups_rounded,
                          'خدمة مترابطة',
                          'مساحة للطلاب والأسر والخدام لمتابعة الخدمة.',
                        ),
                      ];
                      return Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          for (final feature in features)
                            SizedBox(
                              width: cardWidth,
                              child: Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Icon(
                                        feature.$1,
                                        color: AppTheme.primaryBurgundy,
                                        size: 26,
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        feature.$2,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        feature.$3,
                                        style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          height: 1.5,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  const FathersSection(),
                  const SizedBox(height: 22),
                  Card(
                    color: AppTheme.lightGold,
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        children: [
                          const Text(
                            'أهلاً بك في بيتك.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppTheme.darkBurgundy,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'سجّل الدخول لمتابعة خدمتك، أو أنشئ حساباً جديداً للانضمام.',
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 10),
                          TextButton.icon(
                            onPressed: () =>
                                _open(context, const PrivacyPolicyScreen()),
                            icon: const Icon(Icons.privacy_tip_outlined),
                            label: const Text('سياسة الخصوصية'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.eyebrow, required this.title});

  final String eyebrow;
  final String title;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        eyebrow,
        style: const TextStyle(
          color: AppTheme.primaryBurgundy,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
      const SizedBox(height: 3),
      Text(
        title,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    ],
  );
}
