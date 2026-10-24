import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController {
  static const String _themeKey = 'app_theme_mode';
  static final ValueNotifier<ThemeMode> themeMode = ValueNotifier<ThemeMode>(ThemeMode.light);

  static bool get isDark => themeMode.value == ThemeMode.dark;

  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_themeKey);
      if (saved == 'dark') {
        themeMode.value = ThemeMode.dark;
      } else if (saved == 'light') {
        themeMode.value = ThemeMode.light;
      } else {
        themeMode.value = ThemeMode.light;
      }
    } catch (_) {
      themeMode.value = ThemeMode.light;
    }
  }

  static Future<void> toggleTheme() async {
    final next = themeMode.value == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await setThemeMode(next);
  }

  static Future<void> setThemeMode(ThemeMode mode) async {
    themeMode.value = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, mode == ThemeMode.dark ? 'dark' : 'light');
    } catch (_) {}
  }
}
