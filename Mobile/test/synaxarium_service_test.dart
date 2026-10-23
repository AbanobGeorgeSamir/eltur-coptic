import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project/services/synaxarium_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'mobile asset contains all reviewed Synaxarium dates and observances',
    () async {
      final json =
          jsonDecode(
                await rootBundle.loadString(
                  'resources/synaxarium_coptic_calendar.json',
                ),
              )
              as Map<String, dynamic>;
      final days = (json['days'] as List).cast<Map<String, dynamic>>();
      final observances = days.fold<int>(
        0,
        (count, day) => count + (day['observances'] as List).length,
      );

      expect(days, hasLength(366));
      expect(
        days.every((day) => day['extraction_status'] == 'extracted'),
        isTrue,
      );
      expect(
        days.every((day) => (day['observances'] as List).isNotEmpty),
        isTrue,
      );
      expect(observances, 860);

      final babeh18 = days.singleWhere((day) => day['id'] == 'babeh-18');
      expect(babeh18['observances'], hasLength(1));
      expect(
        (babeh18['observances'] as List).single['name_ar'],
        'نياحة البابا القديس ثاؤفيلس البطريرك الثالث والعشرين من بطاركة الكرازة المرقسية.',
      );
    },
  );

  test('mobile service returns the complete 18 Babah title', () async {
    final snapshot = await SynaxariumService.loadUpcoming(
      now: DateTime.utc(2026, 10, 27, 12),
      lookAheadDays: 1,
    );

    expect(snapshot.observances, hasLength(1));
    expect(
      snapshot.observances.single.name,
      'نياحة البابا القديس ثاؤفيلس البطريرك الثالث والعشرين من بطاركة الكرازة المرقسية.',
    );
  });

  test('expanding the mobile Synaxarium list reveals every observance', () {
    final observances = List.generate(
      11,
      (index) => SynaxariumObservance(
        id: '$index',
        name: 'commemoration $index',
        copticDate: '1 Tout',
        gregorianDate: '1 January',
        relativeDate: 'tomorrow',
      ),
    );

    expect(
      SynaxariumService.visibleObservances(observances, expanded: false),
      hasLength(3),
    );
    expect(
      SynaxariumService.visibleObservances(observances, expanded: true),
      hasLength(11),
    );
  });
}
