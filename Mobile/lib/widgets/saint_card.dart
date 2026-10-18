import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

class SaintCard extends StatelessWidget {
  const SaintCard({
    super.key,
    required this.name,
    required this.assetPath,
    this.subtitle,
    this.wide = false,
    this.imageFit,
  });

  final String name;
  final String assetPath;
  final String? subtitle;
  final bool wide;
  final BoxFit? imageFit;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(color: AppTheme.accentGold.withValues(alpha: 0.6)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ColoredBox(
            color: const Color(0xFFF5F0E7),
            child: Padding(
              padding: EdgeInsets.all(wide ? 0 : 8),
              child: Image.asset(
                assetPath,
                fit: imageFit ?? BoxFit.cover,
                alignment: imageFit == BoxFit.contain
                    ? Alignment.center
                    : wide
                    ? const Alignment(0, -0.4)
                    : Alignment.topCenter,
                semanticLabel: name,
              ),
            ),
          ),
        ),
        Container(
          height: wide ? null : 112,
          constraints: wide ? const BoxConstraints(minHeight: 54) : null,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          color: Colors.white,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                height: 50,
                child: Center(
                  child: Text(
                    name,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.clip,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.12,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBurgundy,
                    ),
                  ),
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 3),
                SizedBox(
                  height: 44,
                  child: Center(
                    child: Text(
                      subtitle!,
                      textAlign: TextAlign.center,
                      maxLines: 3,
                      overflow: TextOverflow.clip,
                      style: const TextStyle(
                      fontSize: 11.5,
                        height: 1.15,
                        color: AppTheme.darkBurgundy,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}
