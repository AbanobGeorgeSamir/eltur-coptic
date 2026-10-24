import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:project/theme/app_theme.dart';
import 'package:project/widgets/theme_toggle_button.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await ThemeController.initialize();
  });

  test('ThemeController toggles theme and persists value', () async {
    expect(ThemeController.themeMode.value, ThemeMode.light);
    expect(ThemeController.isDark, isFalse);

    await ThemeController.toggleTheme();
    expect(ThemeController.themeMode.value, ThemeMode.dark);
    expect(ThemeController.isDark, isTrue);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('app_theme_mode'), 'dark');

    await ThemeController.toggleTheme();
    expect(ThemeController.themeMode.value, ThemeMode.light);
    expect(ThemeController.isDark, isFalse);
    expect(prefs.getString('app_theme_mode'), 'light');
  });

  test('Dark theme has light text colors for visibility', () {
    final darkTheme = AppTheme.darkTheme;
    expect(darkTheme.brightness, Brightness.dark);
    expect(darkTheme.colorScheme.onSurface, AppTheme.darkTextLight);
    expect(darkTheme.textTheme.bodyMedium?.color, AppTheme.darkTextLight);
  });

  testWidgets('ThemeToggleButton displays correct icon and toggles theme on tap',
      (tester) async {
    ThemeController.themeMode.value = ThemeMode.light;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        home: Scaffold(
          body: Center(
            child: ThemeToggleButton(),
          ),
        ),
      ),
    );

    // Initial state should show dark_mode icon (to switch to dark)
    expect(find.byType(ThemeToggleButton), findsOneWidget);
    expect(find.byIcon(Icons.dark_mode_rounded), findsOneWidget);

    // Tap toggle button
    await tester.tap(find.byType(ThemeToggleButton));
    await tester.pumpAndSettle();

    // Now theme mode is dark
    expect(ThemeController.themeMode.value, ThemeMode.dark);
    expect(find.byIcon(Icons.light_mode_rounded), findsOneWidget);

    // Tap toggle button again
    await tester.tap(find.byType(ThemeToggleButton));
    await tester.pumpAndSettle();

    // Theme mode is back to light
    expect(ThemeController.themeMode.value, ThemeMode.light);
    expect(find.byIcon(Icons.dark_mode_rounded), findsOneWidget);
  });
}
