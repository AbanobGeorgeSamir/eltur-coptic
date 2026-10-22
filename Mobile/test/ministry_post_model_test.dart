import 'package:flutter_test/flutter_test.dart';
import 'package:project/models/ministry_post_model.dart';

void main() {
  group('MinistryPostModel trip fees', () {
    test('parses numeric fees without losing cents', () {
      final trip = MinistryPostModel.fromJson({
        '_id': 'trip-id',
        'type': 'trip',
        'feeAmount': 42.75,
      });

      expect(trip.feeAmount, 42.75);
    });

    test('accepts numeric strings from legacy API data', () {
      final trip = MinistryPostModel.fromJson({
        '_id': 'trip-id',
        'type': 'trip',
        'feeAmount': '42.75',
      });

      expect(trip.feeAmount, 42.75);
    });

    test('falls back to zero for invalid or unsafe fees', () {
      for (final value in ['bad', 'NaN', double.infinity, -1]) {
        final trip = MinistryPostModel.fromJson({
          '_id': 'trip-id',
          'type': 'trip',
          'feeAmount': value,
        });

        expect(trip.feeAmount, 0, reason: 'feeAmount=$value');
      }
    });
  });
}
