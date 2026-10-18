import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';

import 'package:project/screens/notifications_screen.dart';
import 'package:project/services/api_service.dart';

void main() {
  tearDown(() => ApiService.setHttpClientForTesting(null));

  testWidgets('an ayah notification opens the updated verse', (tester) async {
    final requests = <String>[];
    ApiService.setHttpClientForTesting(MockClient((request) async {
      requests.add('${request.method} ${request.url.path}');
      if (request.url.path.endsWith('/notifications')) {
        return http.Response(
          jsonEncode({
            'data': [
              {
                'title': 'Featured ayah updated',
                'text': 'The updated verse text',
                'reference': 'John 3:16',
                'deepLink': 'eltorcoptic://featured-verse',
              },
            ],
          }),
          200,
        );
      }
      if (request.url.path.endsWith('/notification-preferences')) {
        return http.Response(jsonEncode({'data': {'verseUpdates': true}}), 200);
      }
      if (request.url.path.endsWith('/featured-verse')) {
        return http.Response(
          jsonEncode({
            'data': {'text': 'The updated verse text', 'reference': 'John 3:16'},
          }),
          200,
        );
      }
      return http.Response('Not found', 404);
    }));

    await tester.pumpWidget(const MaterialApp(home: NotificationsScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Featured ayah updated'), findsOneWidget);
    expect(find.textContaining('John 3:16'), findsOneWidget);
    await tester.tap(find.text('Featured ayah updated'));
    await tester.pumpAndSettle();

    expect(find.text('Updated featured ayah'), findsOneWidget);
    expect(find.text('The updated verse text'), findsOneWidget);
    expect(requests, contains('GET /api/notifications'));
    expect(requests, contains('GET /api/featured-verse'));
  });
}
