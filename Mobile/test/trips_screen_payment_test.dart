import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:project/screens/trips_screen.dart';
import 'package:project/services/api_service.dart';
import 'package:project/services/auth_service.dart';
import 'package:project/models/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  tearDown(() => ApiService.setHttpClientForTesting(null));

  testWidgets('admin can update a trip payment without a widget assertion', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.updateUser(
      UserModel.fromJson({'_id': 'admin-id', 'role': 'admin'}),
    );

    final requests = <http.Request>[];
    final registration = <String, dynamic>{
      '_id': 'registration-id',
      'student': {'name': 'Test student', 'phone': ''},
      'trip': {'title': 'Test trip'},
      'amountDue': 100,
      'amountPaid': 20,
    };
    ApiService.setHttpClientForTesting(
      MockClient((request) async {
        requests.add(request);
        if (request.url.path.endsWith('/trip-registrations')) {
          return http.Response(jsonEncode({'data': [registration]}), 200);
        }
        if (request.url.path.endsWith('/ministry/posts')) {
          return http.Response(jsonEncode({'data': []}), 200);
        }
        if (request.url.path.endsWith('/payment')) {
          registration['amountPaid'] =
              (jsonDecode(request.body) as Map<String, dynamic>)['amountPaid'];
        }
        return http.Response('{}', 200);
      }),
    );

    await tester.pumpWidget(const MaterialApp(home: TripsScreen()));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('تسجيل دفعة'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), '50.75');
    await tester.tap(find.text('حفظ'));
    await tester.pumpAndSettle();

    expect(registration['amountPaid'], 50.75);
    expect(
      requests.where((request) => request.url.path.endsWith('/payment')),
      hasLength(1),
    );
    expect(tester.takeException(), isNull);
  });
}
