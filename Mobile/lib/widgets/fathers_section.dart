import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';
import 'saint_card.dart';

class FathersSection extends StatelessWidget {
  const FathersSection({super.key});

  static const _prayerText =
      'بصلوات قداسة البابا المعظم الأنبا تواضروس الثاني وشريكه في الخدمة الرسولية نيافة الحبر الجليل الأنبا أبوللو أسقف سيناء الجنوبية ورئيس دير موسى النبي';

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Text(
        'آباؤنا الأحباء',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppTheme.deepNavy,
        ),
      ),
      const SizedBox(height: 4),
      const Text(
        _prayerText,
        style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.5),
      ),
      const SizedBox(height: 10),
      LayoutBuilder(
        builder: (context, constraints) {
          final gridWidth = constraints.maxWidth > 520
              ? 520.0
              : constraints.maxWidth;
          final cardWidth = (gridWidth - 12) / 2;
          return Center(
            child: SizedBox(
              width: gridWidth,
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  SizedBox(
                    width: cardWidth,
                    height: 340,
                    child: const SaintCard(
                      name: 'قداسة البابا تواضروس الثاني',
                      subtitle: 'بابا الإسكندرية وبطريرك الكرازة المرقسية',
                      assetPath: 'resources/images/saints/tawadros.jpeg',
                      imageFit: BoxFit.contain,
                    ),
                  ),
                  SizedBox(
                    width: cardWidth,
                    height: 340,
                    child: const SaintCard(
                      name: 'الأنبا أبوللو',
                      subtitle: 'أسقف إيبارشية طور سيناء',
                      assetPath: 'resources/images/saints/apollo.jpeg',
                      imageFit: BoxFit.cover,
                    ),
                  ),
                  SizedBox(
                    width: gridWidth,
                    height: 340,
                    child: const SaintCard(
                      name: 'تحت رعاية أبائنا الموقرين',
                      subtitle: 'القمص مينا سعد والقس أرسانيوس وجيه',
                      assetPath: 'resources/images/Mina and Arsanius.jpg',
                      imageFit: BoxFit.cover,
                      wide: true,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ],
  );
}
