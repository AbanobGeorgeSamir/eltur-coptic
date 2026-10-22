import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:project/models/ministry_post_model.dart';
import 'package:project/screens/post_creator_screen.dart';
import 'package:project/services/api_service.dart';

void main() {
  tearDown(() => ApiService.setHttpClientForTesting(null));

  testWidgets('editing and saving a trip price sends the decimal fee safely', (
    tester,
  ) async {
    final requests = <http.Request>[];
    ApiService.setHttpClientForTesting(
      MockClient((request) async {
        requests.add(request);
        return http.Response('{}', 200);
      }),
    );

    final trip = MinistryPostModel.fromJson({
      '_id': 'trip-id',
      'type': 'trip',
      'title': 'Test trip',
      'body': 'Trip details',
      'eventAt': '2026-12-01T12:00:00.000Z',
      'audienceMode': 'shared',
      'feeAmount': 42.75,
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute<void>(
                  builder: (_) => PostCreatorScreen(
                    initialType: 'trip',
                    postToEdit: trip,
                  ),
                ),
              ),
              child: const Text('Open trip'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open trip'));
    await tester.pumpAndSettle();

    final feeField = find.byWidgetPredicate(
      (widget) =>
          widget is TextFormField &&
          widget.controller?.text == '42.75',
    );
    expect(feeField, findsOneWidget);
    await tester.enterText(feeField, '99.25');

    final saveButton = find.ancestor(
      of: find.byIcon(Icons.publish),
      matching: find.byType(ElevatedButton),
    );
    await tester.ensureVisible(saveButton);
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    expect(requests, hasLength(1));
    expect(requests.single.method, 'PATCH');
    expect(requests.single.url.path, '/api/ministry/posts/trip-id');
    expect(jsonDecode(requests.single.body)['feeAmount'], 99.25);
    expect(tester.takeException(), isNull);
  });
}
