import 'package:flutter_test/flutter_test.dart';
import 'package:project/utils/liturgy_schedule.dart';

void main() {
  group('permanent liturgy schedules', () {
    test('uses date-free start and end times', () {
      expect(
        isPermanentLiturgy(
          liturgyType: 'permanent',
          startTime: '07:30',
          endTime: '10:00',
        ),
        isTrue,
      );
    });

    test('recognizes legacy schedules with clock fields and no date', () {
      expect(isPermanentLiturgy(startTime: '07:30', endTime: '10:00'), isTrue);
    });

    test('does not treat a dated schedule as permanent', () {
      expect(
        isPermanentLiturgy(
          eventAt: '2026-10-16T07:30:00.000Z',
          startTime: '07:30',
          endTime: '10:00',
        ),
        isFalse,
      );
    });

    test('sorts clock times and puts invalid values last', () {
      expect(compareLiturgyTimes('07:30', '10:00'), lessThan(0));
      expect(compareLiturgyTimes('10:00', '07:30'), greaterThan(0));
      expect(compareLiturgyTimes('bad', '23:59'), greaterThan(0));
    });
  });
}
