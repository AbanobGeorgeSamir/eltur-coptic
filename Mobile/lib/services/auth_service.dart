import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class AuthService {
  static const String _userKey = 'eltor_coptic_current_user';
  static const String _tokenKey = 'eltor_coptic_token';
  static final FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  static UserModel? _currentUser;
  static String? _token;

  static UserModel? get currentUser => _currentUser;
  static String? get token => _token;

  static bool get isLoggedIn =>
      _currentUser != null && _token != null && _token!.isNotEmpty;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    _token = await _secureStorage.read(key: _tokenKey);
    if (_token == null || _token!.isEmpty) {
      final oldToken = prefs.getString(_tokenKey);
      if (oldToken != null && oldToken.isNotEmpty) {
        await _secureStorage.write(key: _tokenKey, value: oldToken);
        _token = oldToken;
      }
    }
    await prefs.remove(_tokenKey);
    _currentUser = null;

    if (_token != null && _token!.isNotEmpty && userJson != null) {
      try {
        final decoded = jsonDecode(userJson);
        if (decoded is Map<String, dynamic>) {
          _currentUser = UserModel.fromJson(decoded);
          await prefs.setString(
            _userKey,
            jsonEncode(_currentUser!.toSessionCacheJson()),
          );
        }
      } catch (_) {
        _currentUser = null;
      }
    }

    if (_currentUser == null) {
      await prefs.remove(_userKey);
    }
  }

  static Future<void> saveSession(UserModel user, String token) async {
    _currentUser = user;
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.write(key: _tokenKey, value: token);
    await prefs.remove(_tokenKey);
    await prefs.setString(_userKey, jsonEncode(user.toSessionCacheJson()));
  }

  static Future<void> updateUser(UserModel updatedUser) async {
    _currentUser = updatedUser;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _userKey,
      jsonEncode(updatedUser.toSessionCacheJson()),
    );
  }

  static Future<void> refreshToken(
    String token, {
    required String previousToken,
  }) async {
    if (token.isEmpty || _token != previousToken) return;

    _token = token;
    try {
      final prefs = await SharedPreferences.getInstance();
      await _secureStorage.write(key: _tokenKey, value: token);
      await prefs.remove(_tokenKey);
    } catch (_) {
      // Keep the renewed token in memory if secure storage is temporarily unavailable.
    }
  }

  static Future<void> logout() async {
    _currentUser = null;
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.remove(_tokenKey);
    await _secureStorage.delete(key: _tokenKey);
  }
}
