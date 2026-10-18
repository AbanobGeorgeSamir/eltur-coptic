import 'package:material_ui/material_ui.dart';
import '../theme/app_theme.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('سياسة الخصوصية والشروط الكنسية')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'سياسة الخصوصية واستخدام البيانات - كنيسة أبطال طور سيناء',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryBurgundy,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'نحن في كنيسة أبطال طور سيناء ونشاط إعدادي خدمة والخدمات الكنسية، نلتزم بالحفاظ على خصوصية وأمان كافة بيانات الخدام وأبناء الخدمة وأولياء الأمور وفقًا للتعليمات الكنسية والقوانين المنظمة.',
                style: TextStyle(fontSize: 15, height: 1.6),
              ),
              const SizedBox(height: 16),
              _buildSectionTitle('1. البيانات التي يتم جمعها:'),
              _buildBullet(
                'الاسم رباعي باللغة العربية للتعرف الدقيق داخل الخدمة.',
              ),
              _buildBullet(
                'بيانات التواصل (رقم الهاتف، رقم الواتساب، البريد الإلكتروني).',
              ),
              _buildBullet(
                'البيانات الكنسية (اسم أب الاعتراف، الرسامة الشماسية).',
              ),
              _buildBullet(
                'سجلات الحضور والغياب والاعترافات لمتابعة النمو الروحي.',
              ),
              const SizedBox(height: 16),
              _buildSectionTitle('2. استخدام البيانات:'),
              _buildBullet(
                'متابعة حضور افتقاد أبناء الخدمة بواسطة الخدام والآباء الكهنة.',
              ),
              _buildBullet(
                'إرسال التنبيهات الخاصة بالرحلات والأنشطة والمسابقات الكنسية.',
              ),
              _buildBullet('عرض السجلات الخاصة بالأبناء لأولياء أمورهم.'),
              const SizedBox(height: 16),
              _buildSectionTitle('3. أمان البيانات والحماية:'),
              _buildBullet(
                'يتم تخزين كافة البيانات بشكل مشفر عبر قاعدة بيانات سحابية آمنة (MongoDB Online).',
              ),
              _buildBullet(
                'لا يتم مشاركة البيانات مع أي جهات خارجية أو استخدامها لأغراض تجارية.',
              ),
              const SizedBox(height: 24),
              Center(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.check_circle),
                  label: const Text('موافق وفهمت الشروط'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.bold,
          color: AppTheme.deepNavy,
        ),
      ),
    );
  }

  Widget _buildBullet(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '• ',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: AppTheme.accentGold,
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
