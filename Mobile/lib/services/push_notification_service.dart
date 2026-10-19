import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:material_ui/material_ui.dart';

import '../firebase_options.dart';
import '../screens/notifications_screen.dart';
import 'api_service.dart';
import 'auth_service.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

class PushNotificationService {
  static const _channelId = 'verse_updates';
  static const _channelName = 'تحديثات الآية المميزة';
  static const _notificationPayload = 'featured_verse_updated';

  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static StreamSubscription<RemoteMessage>? _foregroundSubscription;
  static StreamSubscription<RemoteMessage>? _tapSubscription;
  static StreamSubscription<String>? _tokenSubscription;
  static bool _initialized = false;
  static bool _pendingOpen = false;

  static bool get isAvailable => _initialized;

  static Future<void> initialize() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    final options = AppFirebaseOptions.forPlatform(defaultTargetPlatform);
    if (options == null) {
      debugPrint('Phone notifications are not configured for this build.');
      return;
    }

    try {
      await Firebase.initializeApp(options: options);
      await _localNotifications.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
        ),
        onDidReceiveNotificationResponse: _onLocalNotificationResponse,
      );

      final androidNotifications = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await androidNotifications?.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          _channelName,
          description: 'إشعار عند تغيير الآية المميزة.',
          importance: Importance.max,
        ),
      );

      if (defaultTargetPlatform == TargetPlatform.iOS) {
        await FirebaseMessaging.instance
            .setForegroundNotificationPresentationOptions(
              alert: false,
              badge: false,
              sound: false,
            );
      }

      _foregroundSubscription = FirebaseMessaging.onMessage.listen(
        _showForegroundNotification,
      );
      _tapSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
        _openFromMessage,
      );
      _tokenSubscription = FirebaseMessaging.instance.onTokenRefresh.listen((
        token,
      ) {
        _registerToken(token);
      });
      _initialized = true;

      final initialMessage = await FirebaseMessaging.instance
          .getInitialMessage();
      if (initialMessage != null) _openFromMessage(initialMessage);
    } catch (error) {
      debugPrint('Phone notifications could not be initialized: $error');
    }
  }

  static Future<bool> syncIfPermissionGranted() async {
    if (!_initialized) return false;
    try {
      final settings = await FirebaseMessaging.instance
          .getNotificationSettings();
      final allowed = _isAllowed(settings.authorizationStatus);
      if (allowed && AuthService.isLoggedIn) {
        final token = await FirebaseMessaging.instance.getToken();
        if (token == null || token.isEmpty) return false;
        return _registerToken(token);
      }
      return allowed;
    } catch (error) {
      debugPrint('Could not sync phone notification permission: $error');
      return false;
    }
  }

  static Future<bool> requestPermissionAndRegister() async {
    if (!_initialized) return false;
    final settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (!_isAllowed(settings.authorizationStatus)) return false;
    if (!AuthService.isLoggedIn) return false;

    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return false;
    return _registerToken(token);
  }

  static bool _isAllowed(AuthorizationStatus status) =>
      status == AuthorizationStatus.authorized ||
      status == AuthorizationStatus.provisional;

  static Future<bool> _registerToken(String token) async {
    if (!AuthService.isLoggedIn || token.isEmpty) return false;
    try {
      await ApiService.registerPushToken(token);
      return true;
    } catch (error) {
      debugPrint('Could not register phone notification token: $error');
      return false;
    }
  }

  static Future<void> _showForegroundNotification(RemoteMessage message) async {
    if (message.data['type'] != _notificationPayload) return;
    final title = message.notification?.title ?? 'تم تحديث الآية المميزة';
    final body =
        message.notification?.body ??
        message.data['reference']?.toString() ??
        'تم تغيير الآية المميزة.';
    await _localNotifications.show(
      id: message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: 'إشعار عند تغيير الآية المميزة.',
          importance: Importance.max,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: _notificationPayload,
    );
  }

  static void _openFromMessage(RemoteMessage message) {
    if (message.data['type'] == _notificationPayload) _openFeaturedAyah();
  }

  static void _onLocalNotificationResponse(NotificationResponse response) {
    if (response.payload == _notificationPayload) _openFeaturedAyah();
  }

  static void _openFeaturedAyah() {
    final navigator = appNavigatorKey.currentState;
    if (navigator == null) {
      _pendingOpen = true;
      return;
    }
    navigator.push(
      MaterialPageRoute<void>(builder: (_) => const UpdatedVerseScreen()),
    );
  }

  static void openPendingNotification() {
    if (!_pendingOpen) return;
    _pendingOpen = false;
    _openFeaturedAyah();
  }

  static Future<void> dispose() async {
    await _foregroundSubscription?.cancel();
    await _tapSubscription?.cancel();
    await _tokenSubscription?.cancel();
  }
}
