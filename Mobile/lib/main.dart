import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_localizations/flutter_localizations.dart'
    show GlobalWidgetsLocalizations;
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';
import 'services/push_notification_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ThemeController.initialize();
  runApp(const EltorCopticApp());
  WidgetsBinding.instance.addPostFrameCallback((_) {
    unawaited(
      PushNotificationService.initialize().then((_) {
        PushNotificationService.openPendingNotification();
      }),
    );
  });
}

class EltorCopticApp extends StatelessWidget {
  const EltorCopticApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.themeMode,
      builder: (context, currentMode, _) {
        final isDark = currentMode == ThemeMode.dark;
        return MaterialApp(
          navigatorKey: appNavigatorKey,
          title: 'Eltur Coptic',
          debugShowCheckedModeBanner: false,
          builder: (context, child) => ScrollConfiguration(
            behavior: const ScrollBehavior().copyWith(
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              scrollbars: true,
            ),
            child: AnnotatedRegion<SystemUiOverlayStyle>(
              value: isDark
                  ? AppTheme.darkSystemUiOverlayStyle
                  : AppTheme.systemUiOverlayStyle,
              child: child ?? const SizedBox.shrink(),
            ),
          ),
          locale: const Locale('ar', 'EG'),
          supportedLocales: const [Locale('ar', 'EG'), Locale('en', 'US')],
          localizationsDelegates: const [
            ...GlobalMaterialLocalizations.delegates,
            GlobalWidgetsLocalizations.delegate,
          ],
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: currentMode,
          home: const SplashScreen(),
        );
      },
    );
  }
}
