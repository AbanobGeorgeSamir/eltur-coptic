import 'package:material_ui/material_ui.dart';
import '../theme/app_theme.dart';

class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({
    super.key,
    this.color,
    this.size = 22,
    this.tooltip,
  });

  final Color? color;
  final double size;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.themeMode,
      builder: (context, mode, _) {
        final isDark = mode == ThemeMode.dark;
        return IconButton(
          tooltip: tooltip ?? (isDark ? 'الوضع النهاري' : 'الوضع الليلي'),
          icon: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, anim) => RotationTransition(
              turns: anim,
              child: FadeTransition(opacity: anim, child: child),
            ),
            child: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              key: ValueKey<bool>(isDark),
              size: size,
              color: color ?? (isDark ? AppTheme.accentGold : Colors.white),
            ),
          ),
          onPressed: () {
            ThemeController.toggleTheme();
          },
        );
      },
    );
  }
}
