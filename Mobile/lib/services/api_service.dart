import 'dart:convert';
import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../models/attendance_model.dart';
import '../models/confession_model.dart';
import '../models/ministry_post_model.dart';
import '../models/quiz_model.dart';
import '../models/task_model.dart';
import 'auth_service.dart';
import '../utils/roles.dart';

class ApiConnectionException implements Exception {
  final String message;

  const ApiConnectionException(this.message);

  @override
  String toString() => message;
}

class ApiResponseException implements Exception {
  final int statusCode;
  final String message;

  const ApiResponseException(this.statusCode, this.message);

  @override
  String toString() => message;
}

class ApiService {
  static String _newRequestId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  // Reuse connections across requests made by different screens.
  static http.Client _client = http.Client();
  static const String _productionBaseUrl =
      'https://eltur-coptic-api-server.vercel.app/api';
  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
  );
  static const String _apiUrlKey = 'eltor_coptic_api_base_url';
  static const String _pushTokenKey = 'eltor_coptic_push_token';
  static const String _pushFidKey = 'eltor_coptic_push_fid';
  static String? _runtimeBaseUrl;
  static String? _sessionBaseUrl;

  static void setHttpClientForTesting(http.Client? client) {
    _client = client ?? http.Client();
  }

  static String get baseUrl {
    final configured =
        (_sessionBaseUrl ?? _runtimeBaseUrl ?? _configuredBaseUrl).trim();
    if (configured.isEmpty) return _productionBaseUrl;
    try {
      return normalizeBaseUrl(configured);
    } on FormatException {
      return _productionBaseUrl;
    }
  }

  static Future<void> init() async {
    final preferences = await SharedPreferences.getInstance();
    _runtimeBaseUrl = preferences.getString(_apiUrlKey);
    if (_runtimeBaseUrl != null) {
      try {
        _runtimeBaseUrl = normalizeBaseUrl(_runtimeBaseUrl!);
      } on FormatException {
        _runtimeBaseUrl = null;
        await preferences.remove(_apiUrlKey);
      }
    }
  }

  static Future<void> configureBaseUrl(String value) async {
    final normalized = normalizeBaseUrl(value);
    final preferences = await SharedPreferences.getInstance();
    _runtimeBaseUrl = normalized;
    _sessionBaseUrl = normalized;
    await preferences.setString(_apiUrlKey, normalized);
  }

  static String normalizeBaseUrl(String value) {
    var normalized = value.trim().replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(normalized);
    if (uri == null ||
        !['http', 'https'].contains(uri.scheme) ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      throw const FormatException(
        'أدخل رابط خادم صالحاً يبدأ بـ http:// أو https://.',
      );
    }
    final path = uri.path.replaceFirst(RegExp(r'/+$'), '');
    if (path.isNotEmpty && path != '/api') {
      throw const FormatException('رابط الخادم يجب أن ينتهي بـ /api.');
    }
    final configuredUri = Uri.tryParse(_configuredBaseUrl.trim());
    final trustedProductionOrigins = <String>{
      Uri.parse(_productionBaseUrl).origin,
      if (configuredUri != null && configuredUri.scheme == 'https')
        configuredUri.origin,
    };
    final isTrustedProduction =
        uri.scheme == 'https' && trustedProductionOrigins.contains(uri.origin);
    final isPrivateDevelopmentHost = _isPrivateDevelopmentHost(uri.host);
    final isTrustedDevelopment =
        kDebugMode && uri.scheme == 'http' && isPrivateDevelopmentHost;
    if (!isTrustedProduction && !isTrustedDevelopment) {
      throw const FormatException(
        'لأمان حسابك، استخدم خادم الكنيسة الآمن عبر HTTPS.',
      );
    }
    if (!uri.path.endsWith('/api')) normalized = '$normalized/api';
    return normalized;
  }

  static bool _isPrivateDevelopmentHost(String host) {
    if (host == 'localhost' || host == '::1' || host == '127.0.0.1') {
      return true;
    }
    final parts = host.split('.').map(int.tryParse).toList();
    if (parts.length != 4 ||
        parts.any((part) => part == null || part < 0 || part > 255)) {
      return false;
    }
    final first = parts[0]!;
    final second = parts[1]!;
    return first == 10 ||
        first == 127 ||
        (first == 192 && second == 168) ||
        (first == 172 && second >= 16 && second <= 31) ||
        (first == 169 && second == 254);
  }

  static Future<Map<String, dynamic>> checkHealth() async {
    final candidates = <String>{baseUrl};
    final configured = _configuredBaseUrl.trim();
    if (configured.isNotEmpty) {
      candidates.add(configured.replaceFirst(RegExp(r'/+$'), ''));
    }

    Object? lastError;
    Map<String, dynamic>? lastResponse;
    for (final candidate in candidates) {
      try {
        final response = await checkHealthAt(candidate);
        if (response['status'] == 'ok') {
          if (candidate != baseUrl) await configureBaseUrl(candidate);
          return response;
        }
        lastResponse = response;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastResponse != null) return lastResponse;
    if (lastError != null) throw lastError;
    throw const ApiConnectionException('No API server address is configured.');
  }

  static Future<Map<String, dynamic>> checkHealthAt(String value) async {
    final candidate = normalizeBaseUrl(value);
    return Map<String, dynamic>.from(
      await _request(
            'GET',
            '/health',
            authenticated: false,
            baseUrlOverride: candidate,
            timeout: const Duration(seconds: 5),
          )
          as Map,
    );
  }

  static Future<dynamic> _request(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    bool authenticated = true,
    String? baseUrlOverride,
    Duration timeout = const Duration(seconds: 20),
  }) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    final token = AuthService.token;
    if (authenticated && token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final requestBaseUrl = baseUrlOverride ?? baseUrl;
    final uri = Uri.parse('$requestBaseUrl$endpoint');
    final request = http.Request(method, uri)
      ..followRedirects = false
      ..headers.addAll(headers);
    if (body != null) request.body = jsonEncode(body);
    late final http.Response response;
    try {
      final streamedResponse = await _client.send(request).timeout(timeout);
      response = await http.Response.fromStream(
        streamedResponse,
      ).timeout(timeout);
    } on TimeoutException {
      throw ApiConnectionException(
        'انتهت مهلة الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.',
      );
    } on http.ClientException {
      throw ApiConnectionException(
        'تعذر الوصول إلى الخادم. تحقق من اتصال الإنترنت وحاول مجدداً.',
      );
    } catch (error) {
      throw Exception('تعذر الاتصال بالخادم: $error');
    }

    final renewedToken = response.headers['x-session-token'];
    if (authenticated && token != null && renewedToken != null) {
      await AuthService.refreshToken(renewedToken, previousToken: token);
    }

    dynamic decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(response.body);
      } on FormatException {
        throw Exception('استجابة الخادم غير صالحة.');
      }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map ? decoded['message'] : null;
      throw ApiResponseException(
        response.statusCode,
        message?.toString() ?? 'تعذر إكمال الطلب (${response.statusCode}).',
      );
    }
    return decoded;
  }

  static List<dynamic> _dataList(dynamic response) {
    if (response is Map && response['data'] is List) {
      return response['data'] as List<dynamic>;
    }
    if (response is List) return response;
    return [];
  }

  static Future<Map<String, dynamic>?> getFeaturedVerse() async {
    final response = await _request(
      'GET',
      '/featured-verse',
      authenticated: false,
    );
    if (response is Map && response['data'] is Map) {
      return Map<String, dynamic>.from(response['data'] as Map);
    }
    return null;
  }

  static Future<Map<String, dynamic>> updateFeaturedVerse({
    required String text,
    required String reference,
  }) async => Map<String, dynamic>.from(
    await _request(
          'PUT',
          '/featured-verse',
          body: {
            'text': text,
            'reference': reference,
            'requestId': _newRequestId(),
          },
        )
        as Map,
  );

  static Future<List<Map<String, dynamic>>> getNotifications() async =>
      _dataList(
        await _request('GET', '/notifications'),
      ).map((item) => Map<String, dynamic>.from(item as Map)).toList();

  static Future<bool> getVerseUpdatePreference() async {
    final response = await _request('GET', '/notification-preferences');
    if (response is Map && response['data'] is Map) {
      return (response['data'] as Map)['verseUpdates'] != false;
    }
    return true;
  }

  static Future<bool> setVerseUpdatePreference(bool enabled) async {
    final response = await _request(
      'PATCH',
      '/notification-preferences',
      body: {'verseUpdates': enabled},
    );
    if (response is Map && response['data'] is Map) {
      return (response['data'] as Map)['verseUpdates'] != false;
    }
    return enabled;
  }

  static Future<void> registerPushToken(String token) async {
    await _request('POST', '/push-token', body: {'token': token});
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_pushTokenKey, token);
  }

  static Future<void> unregisterPushToken(String token) async {
    await _request('DELETE', '/push-token', body: {'token': token});
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getString(_pushTokenKey) == token) {
      await preferences.remove(_pushTokenKey);
    }
  }

  static Future<void> registerPushFid(String fid) async {
    await _request('POST', '/push-fid', body: {'fid': fid});
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_pushFidKey, fid);
  }

  static Future<void> unregisterPushFid(String fid) async {
    await _request('DELETE', '/push-fid', body: {'fid': fid});
    final preferences = await SharedPreferences.getInstance();
    if (preferences.getString(_pushFidKey) == fid) {
      await preferences.remove(_pushFidKey);
    }
  }

  static Future<void> deleteAccount(String password) async {
    await _request('DELETE', '/users/me', body: {'password': password});
  }

  static Future<void> logout() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final pushToken = preferences.getString(_pushTokenKey);
      if (pushToken != null && pushToken.isNotEmpty) {
        try {
          await unregisterPushToken(pushToken);
        } catch (_) {
          // Continue logout even when the notification API is unreachable.
        }
      }
      final pushFid = preferences.getString(_pushFidKey);
      if (pushFid != null && pushFid.isNotEmpty) {
        try {
          await unregisterPushFid(pushFid);
        } catch (_) {
          // Continue logout even when the notification API is unreachable.
        }
      }
      await _request('POST', '/auth/logout', body: {});
    } catch (_) {
      // Clear the local session even if the server cannot be reached.
    } finally {
      await AuthService.logout();
    }
  }

  static Future<Map<String, dynamic>> login(
    String username,
    String password,
  ) async {
    final result = await _request(
      'POST',
      '/auth/login',
      body: {'username': username.trim(), 'password': password},
      authenticated: false,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  static Future<Map<String, dynamic>> getCurrentUser({
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final result = await _request('GET', '/auth/me', timeout: timeout);
    if (result is! Map || result['user'] is! Map) {
      throw Exception('لم يرجع الخادم بيانات الحساب بصورة صحيحة.');
    }
    return Map<String, dynamic>.from(result['user'] as Map);
  }

  static Future<Map<String, dynamic>> register(
    Map<String, dynamic> userData,
  ) async {
    return Map<String, dynamic>.from(
      await _request(
            'POST',
            '/auth/register',
            body: userData,
            authenticated: false,
          )
          as Map,
    );
  }

  static Future<List<Map<String, dynamic>>> getMeetingGroups(
    String grade,
  ) async {
    final response = await _request(
      'GET',
      '/meeting-groups?grade=${Uri.encodeQueryComponent(grade)}',
      authenticated: false,
    );
    return _dataList(
      response,
    ).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
  }

  static Future<List<Map<String, dynamic>>> getAdminMeetingGroups(
    String grade, {
    bool includeInactive = true,
  }) async {
    final response = await _request(
      'GET',
      '/admin/meeting-groups?grade=${Uri.encodeQueryComponent(grade)}'
          '${includeInactive ? '&includeInactive=1' : ''}',
    );
    return _dataList(
      response,
    ).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
  }

  static Future<void> createMeetingGroup({
    required String grade,
    required String name,
  }) async {
    await _request(
      'POST',
      '/admin/meeting-groups',
      body: {'grade': grade, 'name': name},
    );
  }

  static Future<void> updateMeetingGroup(
    String id, {
    String? name,
    bool? isActive,
  }) async {
    await _request(
      'PATCH',
      '/admin/meeting-groups/${Uri.encodeComponent(id)}',
      body: {
        if (name case final String value) 'name': value,
        if (isActive case final bool value) 'isActive': value,
      },
    );
  }

  static Future<Map<String, dynamic>> mergeMeetingGroup(
    String sourceId,
    String targetId,
  ) async {
    final response = await _request(
      'POST',
      '/admin/meeting-groups/${Uri.encodeComponent(sourceId)}/merge',
      body: {'targetId': targetId},
    );
    return response is Map
        ? Map<String, dynamic>.from(response)
        : <String, dynamic>{};
  }

  static Future<List<Map<String, dynamic>>> getAdministrators() async =>
      _dataList(await _request('GET', '/administrators'))
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();

  static Future<Map<String, dynamic>> searchAdministratorCandidates(
    String query, {
    int offset = 0,
  }) async {
    final response = await _request(
      'GET',
      '/administrator-candidates?q=${Uri.encodeQueryComponent(query)}&offset=$offset',
    );
    if (response is! Map) {
      return {'data': <Map<String, dynamic>>[], 'hasMore': false};
    }
    return {
      'data': _dataList(response)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(),
      'hasMore': response['hasMore'] == true,
    };
  }

  static Future<void> createAdministrator(
    Map<String, dynamic> administrator,
  ) async {
    await _request('POST', '/administrators', body: administrator);
  }

  static Future<void> updateAdministrator(
    String id,
    Map<String, dynamic> updates,
  ) async {
    await _request(
      'PATCH',
      '/administrators/${Uri.encodeComponent(id)}',
      body: updates,
    );
  }

  static Future<void> deleteAdministrator(String id) async {
    await _request('DELETE', '/administrators/${Uri.encodeComponent(id)}');
  }

  static Future<List<UserModel>> getUsers({
    String? role,
    String? assignedAdmin,
  }) async {
    dynamic response;
    final currentUser = AuthService.currentUser;
    if (currentUser?.role == 'parent') {
      final children = (await getParentDashboard())
          .whereType<Map>()
          .map((item) => item['student'])
          .whereType<Map>()
          .map((item) => UserModel.fromJson(Map<String, dynamic>.from(item)))
          .toList();
      return _uniqueUsers(
        children.where((user) => role == null || role == 'student'),
      );
    }
    if (!isAdminRole(currentUser?.role) ||
        (role != null && role != 'student')) {
      return [];
    }
    response = await _request('GET', '/students');
    var users = _dataList(response)
        .map(
          (item) => UserModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
    if (assignedAdmin != null && assignedAdmin.isNotEmpty) {
      users = users
          .where((user) => user.assignedAdmin == assignedAdmin)
          .toList();
    }
    return _uniqueUsers(users);
  }

  static List<UserModel> _uniqueUsers(Iterable<UserModel> users) {
    final byId = <String, UserModel>{};
    for (final user in users) {
      if (user.id.isNotEmpty) byId.putIfAbsent(user.id, () => user);
    }
    return byId.values.toList();
  }

  static Future<List<UserModel>> getUnassignedStudents() async {
    if (!isAdminRole(AuthService.currentUser?.role)) return [];
    return _dataList(await _request('GET', '/students/unassigned'))
        .map(
          (item) => UserModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
  }

  static Future<List<Map<String, dynamic>>> getPendingParentApprovals() async =>
      _dataList(await _request('GET', '/parents/pending'))
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();

  static Future<void> approveParent(String parentId, String studentId) async {
    await _request(
      'POST',
      '/parents/${Uri.encodeComponent(parentId)}/approve',
      body: {'studentId': studentId},
    );
  }

  static Future<List<Map<String, dynamic>>> getParentDashboard() async {
    final response = await _request('GET', '/parents/dashboard');
    return _dataList(
      response,
    ).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
  }

  static Future<UserModel?> updateUser(
    String id,
    Map<String, dynamic> updates,
  ) async {
    final currentUser = AuthService.currentUser;
    final isSelf = currentUser?.id == id;
    final endpoint = isSelf ? '/users/me' : '/students/$id';
    if (!isSelf && !isAdminRole(currentUser?.role)) {
      throw Exception('لا يمكن تعديل بيانات حساب آخر.');
    }
    final response = await _request('PATCH', endpoint, body: updates);
    if (response is! Map || response['user'] is! Map) return null;
    return UserModel.fromJson(Map<String, dynamic>.from(response['user']));
  }

  static Future<UserModel?> assignStudent(
    String id, {
    String? meetingGroup,
  }) async {
    final response = await _request(
      'POST',
      '/students/${Uri.encodeComponent(id)}/assign',
      body: {
        if (meetingGroup != null && meetingGroup.isNotEmpty)
          'meetingGroup': meetingGroup,
      },
    );
    if (response is! Map || response['user'] is! Map) return null;
    return UserModel.fromJson(Map<String, dynamic>.from(response['user']));
  }

  static Future<void> rejectStudent(String id) async {
    await _request(
      'POST',
      '/students/${Uri.encodeComponent(id)}/reject',
      body: const {},
    );
  }

  static Future<bool> recordAttendance({
    required String studentId,
    required String date,
    required String status,
    String note = '',
  }) async {
    await _request(
      'POST',
      '/attendance',
      body: {
        'studentId': studentId,
        'date': date,
        'service': 'إعدادي خدمة',
        'status': status,
        'note': note,
      },
    );
    return true;
  }

  static Future<List<AttendanceModel>> getAttendanceRecords() async {
    return _dataList(await _request('GET', '/attendance'))
        .map(
          (item) =>
              AttendanceModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
  }

  static Future<Map<String, dynamic>> getAttendanceSummary() async {
    final response = await _request('GET', '/attendance/summary');
    if (response is Map && response['data'] is Map) {
      return Map<String, dynamic>.from(response['data'] as Map);
    }
    return {'overall': null, 'students': <dynamic>[]};
  }

  static Future<List<AttendanceModel>> getStudentAttendance(
    String studentId,
  ) async {
    return (await getAttendanceRecords())
        .where((record) => record.studentId == studentId)
        .toList();
  }

  static Future<bool> recordConfession({
    required String studentId,
    required String date,
    String note = '',
  }) async {
    await _request(
      'POST',
      '/confessions',
      body: {'studentId': studentId, 'date': date, 'note': note},
    );
    return true;
  }

  static Future<List<ConfessionModel>> getConfessions() async {
    final records =
        _dataList(await _request('GET', '/confessions'))
            .map(
              (item) => ConfessionModel.fromJson(
                Map<String, dynamic>.from(item as Map),
              ),
            )
            .toList()
          ..sort((a, b) => b.date.compareTo(a.date));
    return records;
  }

  static Future<bool> updateConfession({
    required String id,
    required String date,
    required String note,
  }) async {
    await _request(
      'PATCH',
      '/confessions/$id',
      body: {'date': date, 'note': note},
    );
    return true;
  }

  static Future<ConfessionModel?> getLastConfession(String studentId) async {
    final records = (await getConfessions())
        .where((record) => record.studentId == studentId)
        .toList();
    return records.isEmpty ? null : records.first;
  }

  static Future<List<MinistryPostModel>> getPosts({
    String? type,
    bool includeUnpublished = false,
  }) async {
    final parameters = <String, String>{
      if (type != null && type.isNotEmpty) 'type': type,
      if (includeUnpublished) 'includeUnpublished': '1',
    };
    final query = parameters.isEmpty
        ? ''
        : '?${Uri(queryParameters: parameters).query}';
    return _dataList(await _request('GET', '/ministry/posts$query'))
        .map(
          (item) => MinistryPostModel.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  }

  static Future<Map<String, dynamic>> getContact() async {
    return Map<String, dynamic>.from(
      await _request('GET', '/contact', authenticated: false) as Map,
    );
  }

  static Future<bool> createPost(Map<String, dynamic> postData) async {
    final payload = Map<String, dynamic>.from(postData)..remove('admin');
    if (payload['eventAt'] == '') payload.remove('eventAt');
    await _request('POST', '/ministry/posts', body: payload);
    return true;
  }

  static Future<bool> updatePost(
    String id,
    Map<String, dynamic> postData,
  ) async {
    final payload = Map<String, dynamic>.from(postData)..remove('admin');
    if (payload['eventAt'] == '') payload.remove('eventAt');
    await _request(
      'PATCH',
      '/ministry/posts/${Uri.encodeComponent(id)}',
      body: payload,
    );
    return true;
  }

  static Future<bool> deletePost(String id) async {
    await _request('DELETE', '/ministry/posts/${Uri.encodeComponent(id)}');
    return true;
  }

  static Future<List<Map<String, dynamic>>> getTripRegistrations() async =>
      _dataList(
        await _request('GET', '/trip-registrations'),
      ).map((item) => Map<String, dynamic>.from(item as Map)).toList();

  static Future<bool> registerForTrip(String tripId) async {
    await _request(
      'POST',
      '/trips/${Uri.encodeComponent(tripId)}/register',
      body: {},
    );
    return true;
  }

  static Future<void> updateTripPayment(
    String registrationId,
    double amountPaid,
  ) async {
    await _request(
      'PATCH',
      '/trip-registrations/${Uri.encodeComponent(registrationId)}/payment',
      body: {'amountPaid': amountPaid},
    );
  }

  static Future<void> deleteTripRegistration(String registrationId) async {
    await _request(
      'DELETE',
      '/trip-registrations/${Uri.encodeComponent(registrationId)}',
    );
  }

  static Future<String> uploadImage({
    required List<int> bytes,
    required String filename,
  }) async {
    if (bytes.isEmpty || bytes.length > 2 * 1024 * 1024) {
      throw Exception('حجم الصورة بعد الضغط يجب ألا يتجاوز ٢ ميجابايت.');
    }
    final response = await _request(
      'POST',
      '/media',
      body: {'data': base64Encode(bytes), 'filename': filename},
    );
    if (response is Map &&
        response['data'] is Map &&
        response['data']['id'] != null) {
      return _uploadedMediaUrl(response['data']);
    }
    throw Exception('تعذر حفظ الصورة.');
  }

  static Future<String> uploadMedia({
    required List<int> bytes,
    required String filename,
  }) async {
    if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
      throw Exception('File size must not exceed 5 MB.');
    }
    final response = await _request(
      'POST',
      '/media',
      body: {'data': base64Encode(bytes), 'filename': filename},
      timeout: const Duration(seconds: 60),
    );
    if (response is Map &&
        response['data'] is Map &&
        response['data']['id'] != null) {
      return _uploadedMediaUrl(response['data']);
    }
    throw Exception('Could not upload the selected file.');
  }

  static String _uploadedMediaUrl(Map data) {
    final storedUrl = data['url']?.toString().trim() ?? '';
    if (storedUrl.isNotEmpty) {
      final uri = Uri.tryParse(storedUrl);
      if (uri != null &&
          uri.host.isNotEmpty &&
          (uri.scheme == 'https' || (kDebugMode && uri.scheme == 'http'))) {
        return storedUrl;
      }
    }
    return '$baseUrl/media/${data['id']}';
  }

  static Future<List<QuizModel>> getQuizzes() async {
    return _dataList(await _request('GET', '/quizzes'))
        .map(
          (item) => QuizModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
  }

  static Future<Map<String, dynamic>> submitQuizAttempt(
    String quizId,
    List<int> answers,
  ) async {
    final response = await _request(
      'POST',
      '/quizzes/$quizId/submit',
      body: {'answers': answers},
    );
    final result = response is Map && response['result'] is Map
        ? Map<String, dynamic>.from(response['result'])
        : <String, dynamic>{};
    return {...result, 'message': response is Map ? response['message'] : null};
  }

  static Future<List<QuizAttemptModel>> getStudentQuizAttempts(
    String studentId,
  ) async {
    if (AuthService.currentUser?.id != studentId) return [];
    return _dataList(await _request('GET', '/quiz-attempts'))
        .map(
          (item) =>
              QuizAttemptModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
  }

  static Future<List<QuizResultModel>> getQuizResults(String quizId) async {
    return _dataList(
          await _request(
            'GET',
            '/quizzes/${Uri.encodeComponent(quizId)}/results',
          ),
        )
        .map(
          (item) =>
              QuizResultModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
  }

  static Future<bool> createQuiz(Map<String, dynamic> quizData) async {
    final payload = Map<String, dynamic>.from(quizData)..remove('admin');
    payload['questions'] = (payload['questions'] as List? ?? []).map((
      question,
    ) {
      final item = Map<String, dynamic>.from(question as Map);
      return {
        'prompt': item['prompt'] ?? item['questionText'] ?? '',
        'options': item['options'] ?? <String>[],
        'answerIndex': item['answerIndex'] ?? item['correctAnswerIndex'] ?? 0,
      };
    }).toList();
    await _request('POST', '/quizzes', body: payload);
    return true;
  }

  static Future<List<TaskModel>> getStudentTasks(String studentId) async {
    final currentUser = AuthService.currentUser;
    final tasks = _dataList(await _request('GET', '/tasks'))
        .map(
          (item) => TaskModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
    if (isAdminRole(currentUser?.role) || currentUser?.role == 'parent') {
      return tasks;
    }
    return tasks.where((task) => task.studentId == studentId).toList();
  }

  static Future<bool> createTask(Map<String, dynamic> taskData) async {
    final assignToGroup = taskData['assignToGroup'] == true;
    final studentIds = taskData['studentIds'] is List
        ? List<String>.from(taskData['studentIds'] as List)
        : [
            taskData['student']?.toString() ?? '',
          ].where((id) => id.isNotEmpty).toList();
    final payload = <String, dynamic>{
      'title': taskData['title'],
      'description': taskData['description'] ?? '',
      'assignToGroup': assignToGroup,
      'studentIds': assignToGroup ? <String>[] : studentIds,
      if (taskData['dueAt'] != null && taskData['dueAt'] != '')
        'dueAt': taskData['dueAt'],
      if (taskData['grade'] != null) 'grade': taskData['grade'],
      if (taskData['meetingGroup'] != null)
        'meetingGroup': taskData['meetingGroup'],
    };
    await _request('POST', '/tasks', body: payload);
    return true;
  }

  static Future<bool> toggleTaskComplete(
    String taskId, {
    String completionNote = '',
  }) async {
    await _request(
      'PATCH',
      '/tasks/$taskId/complete',
      body: {'completionNote': completionNote},
    );
    return true;
  }

  static Future<void> updateTaskAudience(
    String taskId,
    Map<String, dynamic> audience,
  ) async {
    await _request(
      'PATCH',
      '/tasks/${Uri.encodeComponent(taskId)}/audience',
      body: audience,
    );
  }

  static Future<void> updateQuizAudience(
    String quizId,
    Map<String, dynamic> audience,
  ) async {
    await _request(
      'PATCH',
      '/quizzes/${Uri.encodeComponent(quizId)}/audience',
      body: audience,
    );
  }

  static Future<List<Map<String, dynamic>>> getPrayerChecklists(
    String date,
  ) async {
    return _dataList(
      await _request('GET', '/prayer-checklists?date=$date'),
    ).map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  static Future<bool> savePrayerChecklist({
    required String date,
    required Map<String, bool> checks,
  }) async {
    await _request(
      'POST',
      '/prayer-checklists',
      body: {'date': date, 'checks': checks},
    );
    return true;
  }

  static Future<bool> updatePrayerChecklist({
    required String studentId,
    required String date,
    required Map<String, bool> checks,
  }) async {
    await _request(
      'PATCH',
      '/prayer-checklists/$studentId',
      body: {'date': date, 'checks': checks},
    );
    return true;
  }
}
