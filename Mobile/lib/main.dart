import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_localizations/flutter_localizations.dart'
    show GlobalWidgetsLocalizations;
import 'package:flutter/services.dart';
import 'screens/splash_screen.dart';
import 'services/push_notification_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized()
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
    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'Eltur Coptic',
      debugShowCheckedModeBanner: false,
      builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
        value: AppTheme.systemUiOverlayStyle,
        child: child ?? const SizedBox.shrink(),
      ),
      locale: const Locale('ar', 'EG'),
      supportedLocales: const [Locale('ar', 'EG'), Locale('en', 'US')],
      localizationsDelegates: const [
        ...GlobalMaterialLocalizations.delegates,
        GlobalWidgetsLocalizations.delegate,
      ],
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}
