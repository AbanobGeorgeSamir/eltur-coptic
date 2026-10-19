import 'dart:async';
import 'dart:convert';
import 'dart:ui' show DartPluginRegistrant;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../firebase_options.dart';
import '../screens/notifications_screen.dart';
import 'api_service.dart';
import 'auth_service.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

@pragma('vm:entry-point')
void ayahUpdateBackgroundDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    DartPluginRegistrant.ensureInitialized();
    WidgetsFlutterBinding.ensureInitialized();
    if (task != PushNotificationService.backgroundTaskName) return true;

    try {
      await PushNotificationService.initializeLocalNotifications();
      await PushNotificationService.checkForAyahChange();
      return true;
    } catch (error) {
      debugPrint('Background ayah check failed: $error');
      return false;
    }
  });
}

class PushNotificationService {
  static const backgroundTaskName = 'check_featured_ayah';
  static const _backgroundTaskId = 'featured_ayah_background_check';
  static const _channelId = 'verse_updates';
  static const _channelName = 'تحديثات الآية المميزة';
  static const _notificationPayload = 'featured_verse_updated';
  static const _enabledKey = 'featured_ayah_notifications_enabled';
  static const _lastVerseKey = 'featured_ayah_last_seen';
  static const _notificationId = 41802;

  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static StreamSubscription<RemoteMessage>? _foregroundSubscription;
  static StreamSubscription<RemoteMessage>? _tapSubscription;
  static StreamSubscription<String>? _tokenSubscription;
  static AppLifecycleListener? _lifecycleListener;
  static Timer? _foregroundTimer;
  static bool _initialized = false;
  static bool _localNotificationsInitialized = false;
  static bool _firebaseInitialized = false;
  static bool _pendingOpen = false;

  static bool get isAvailable => _initialized;

  static Future<void> initialize() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    try {
      await initializeLocalNotifications();
      if (defaultTargetPlatform == TargetPlatform.android) {
        await Workmanager().initialize(
          ayahUpdateBackgroundDispatcher,
          isInDebugMode: kDebugMode,
        );
      }
      _initialized = true;
    } catch (error) {
      debugPrint('Phone notifications could not be initialized: $error');
      return;
    }

    _lifecycleListener ??= AppLifecycleListener(
      onResume: () => unawaited(_startForegroundPollingIfEnabled()),
      onPause: () => _foregroundTimer?.cancel(),
      onDetach: () => _foregroundTimer?.cancel(),
    );

    await _initializeFirebaseIfConfigured();
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getBool(_enabledKey) == true) {
      unawaited(syncIfPermissionGranted());
    }
    if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
      unawaited(_startForegroundPollingIfEnabled());
    }
  }

  static Future<void> initializeLocalNotifications() async {
    if (_localNotificationsInitialized) return;

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

    final launchDetails = await _localNotifications
        .getNotificationAppLaunchDetails();
    if (launchDetails?.didNotificationLaunchApp == true &&
        launchDetails?.notificationResponse?.payload == _notificationPayload) {
      _pendingOpen = true;
    }
    _localNotificationsInitialized = true;
  }

  static Future<void> _initializeFirebaseIfConfigured() async {
    final options = AppFirebaseOptions.forPlatform(defaultTargetPlatform);
    if (options == null) return;

    try {
      await Firebase.initializeApp(options: options);
      _firebaseInitialized = true;
      _foregroundSubscription = FirebaseMessaging.onMessage.listen(
        _showForegroundNotification,
      );
      _tapSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
        _openFromMessage,
      );
      _tokenSubscription = FirebaseMessaging.instance.onTokenRefresh.listen((
        token,
      ) {
        unawaited(_registerToken(token));
      });

      if (defaultTargetPlatform == TargetPlatform.iOS) {
        await FirebaseMessaging.instance
            .setForegroundNotificationPresentationOptions(
              alert: false,
              badge: false,
              sound: false,
            );
      }

      final initialMessage = await FirebaseMessaging.instance
          .getInitialMessage();
      if (initialMessage != null) _openFromMessage(initialMessage);
    } catch (error) {
      debugPrint('Firebase push is unavailable; using local checks: $error');
      _firebaseInitialized = false;
    }
  }

  static Future<bool> syncIfPermissionGranted() async {
    if (!_initialized) return false;
    final allowed = await _hasNotificationPermission();
    if (!allowed) return false;
    await _activateAyahNotifications();
    if (_firebaseInitialized) await _syncFirebaseToken();
    return true;
  }

  static Future<bool> requestPermissionAndRegister() async {
    if (!_initialized) return false;

    bool allowed = false;
    if (_firebaseInitialized) {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      allowed = _isAllowed(settings.authorizationStatus);
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      final androidNotifications = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await androidNotifications?.requestNotificationsPermission();
      allowed = await androidNotifications?.areNotificationsEnabled() ?? false;
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      final iosNotifications = _localNotifications
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >();
      allowed =
          await iosNotifications?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
    }

    if (!allowed) return false;
    await _activateAyahNotifications();
    if (_firebaseInitialized) await _syncFirebaseToken();
    return true;
  }

  static Future<bool> _hasNotificationPermission() async {
    if (defaultTargetPlatform == TargetPlatform.android) {
      final androidNotifications = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      return await androidNotifications?.areNotificationsEnabled() ?? false;
    }
    if (_firebaseInitialized) {
      final settings = await FirebaseMessaging.instance
          .getNotificationSettings();
      return _isAllowed(settings.authorizationStatus);
    }
    final preferences = await SharedPreferences.getInstance();
    return preferences.getBool(_enabledKey) == true;
  }

  static bool _isAllowed(AuthorizationStatus status) =>
      status == AuthorizationStatus.authorized ||
      status == AuthorizationStatus.provisional;

  static Future<void> _activateAyahNotifications() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_enabledKey, true);
    await _seedCurrentVerseIfNeeded();

    if (_firebaseInitialized) {
      await Workmanager().cancelByUniqueName(_backgroundTaskId);
      _foregroundTimer?.cancel();
      return;
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      await Workmanager().registerPeriodicTask(
        _backgroundTaskId,
        backgroundTaskName,
        frequency: const Duration(minutes: 15),
        constraints: Constraints(networkType: NetworkType.connected),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      );
    }
    await _startForegroundPollingIfEnabled();
  }

  static Future<void> setVerseUpdatesEnabled(bool enabled) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_enabledKey, enabled);
    if (enabled) {
      if (!_initialized) return;
      if (await _hasNotificationPermission()) {
        await _activateAyahNotifications();
      }
      return;
    }

    _foregroundTimer?.cancel();
    if (_initialized && defaultTargetPlatform == TargetPlatform.android) {
      await Workmanager().cancelByUniqueName(_backgroundTaskId);
    }
  }

  static Future<void> _syncFirebaseToken() async {
    if (!_firebaseInitialized || !AuthService.isLoggedIn) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) await _registerToken(token);
    } catch (error) {
      debugPrint('Could not sync phone notification token: $error');
    }
  }

  static Future<bool> _registerToken(String token) async {
    if (!_firebaseInitialized || !AuthService.isLoggedIn || token.isEmpty) {
      return false;
    }
    try {
      await ApiService.registerPushToken(token);
      return true;
    } catch (error) {
      debugPrint('Could not register phone notification token: $error');
      return false;
    }
  }

  static Future<void> _seedCurrentVerseIfNeeded() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    if (preferences.containsKey(_lastVerseKey)) return;

    try {
      await ApiService.init();
      final verse = await ApiService.getFeaturedVerse();
      if (verse == null) return;
      await preferences.setString(_lastVerseKey, _verseFingerprint(verse));
    } catch (error) {
      debugPrint('Could not save the initial featured ayah: $error');
    }
  }

  static Future<bool> checkForAyahChange() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    if (preferences.getBool(_enabledKey) != true) return true;

    try {
      await ApiService.init();
      final verse = await ApiService.getFeaturedVerse();
      if (verse == null) return true;

      final currentFingerprint = _verseFingerprint(verse);
      final previousFingerprint = preferences.getString(_lastVerseKey);
      if (previousFingerprint == null) {
        await preferences.setString(_lastVerseKey, currentFingerprint);
        return true;
      }
      if (previousFingerprint == currentFingerprint) return true;

      await preferences.setString(_lastVerseKey, currentFingerprint);
      await _showAyahNotification(verse);
      return true;
    } catch (error) {
      debugPrint('Could not check for a featured ayah update: $error');
      return false;
    }
  }

  static String _verseFingerprint(Map<String, dynamic> verse) => jsonEncode([
    verse['updatedAt']?.toString() ?? '',
    verse['reference']?.toString() ?? '',
    verse['text']?.toString() ?? '',
  ]);

  static Future<void> _startForegroundPollingIfEnabled() async {
    if (!_initialized || _firebaseInitialized) return;
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    if (preferences.getBool(_enabledKey) != true) return;

    await checkForAyahChange();
    _foregroundTimer ??= Timer.periodic(const Duration(minutes: 1), (_) {
      unawaited(checkForAyahChange());
    });
  }

  static Future<void> _showAyahNotification(Map<String, dynamic> verse) async {
    await initializeLocalNotifications();
    final reference = verse['reference']?.toString() ?? '';
    final text = verse['text']?.toString() ?? '';
    final content = [
      reference,
      text,
    ].where((part) => part.isNotEmpty).join(' • ');
    final body = content.length > 180
        ? '${content.substring(0, 177)}…'
        : content;

    await _localNotifications.show(
      id: _notificationId,
      title: 'تم تحديث الآية المميزة',
      body: body.isEmpty ? 'اضغط لعرض الآية الجديدة.' : body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: 'إشعار عند تغيير الآية المميزة.',
          importance: Importance.max,
          priority: Priority.high,
          styleInformation: BigTextStyleInformation(body),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: _notificationPayload,
    );
  }

  static Future<void> _showForegroundNotification(RemoteMessage message) async {
    if (message.data['type'] != _notificationPayload) return;
    final title = message.notification?.title ?? 'تم تحديث الآية المميزة';
    final body =
        message.notification?.body ??
        message.data['reference']?.toString() ??
        'تم تغيير الآية المميزة.';
    await _localNotifications.show(
      id: message.messageId?.hashCode ?? _notificationId,
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
    _foregroundTimer?.cancel();
    _lifecycleListener?.dispose();
    _lifecycleListener = null;
  }
}
