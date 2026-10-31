import 'dart:convert';

import 'package:flutter/services.dart';

class SynaxariumObservance {
  const SynaxariumObservance({
    required this.id,
    required this.name,
    required this.copticDate,
    required this.gregorianDate,
    required this.relativeDate,
  });

  final String id;
  final String name;
  final String copticDate;
  final String gregorianDate;
  final String relativeDate;
}

class SynaxariumSnapshot {
  const SynaxariumSnapshot({
    required this.todayCopticDate,
    required this.todayGregorianDate,
    required this.observances,
  });

  final String todayCopticDate;
  final String todayGregorianDate;
  final List<SynaxariumObservance> observances;
}

class SynaxariumService {
  SynaxariumService._();

  static const _assetPath = 'resources/synaxarium_coptic_calendar.json';
  static const _copticMonths = [
    'توت',
    'بابه',
    'هاتور',
    'كيهك',
    'طوبة',
    'أمشير',
    'برمهات',
    'برمودة',
    'بشنس',
    'بؤونة',
    'أبيب',
    'مسرى',
    'النسيء',
  ];
  static const _gregorianMonths = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  static const _weekdays = [
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
    'الأحد',
  ];
  static const _arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  static List<SynaxariumObservance> visibleObservances(
    List<SynaxariumObservance> observances, {
    required bool expanded,
  }) => expanded ? observances : observances.take(3).toList(growable: false);

  static final Future<Map<String, dynamic>> _calendar = rootBundle
      .loadString(_assetPath)
      .then((contents) => jsonDecode(contents) as Map<String, dynamic>);

  static Future<SynaxariumSnapshot> loadUpcoming({
    DateTime? now,
    int lookAheadDays = 45,
    bool includeToday = false,
  }) async {
    final today = now ?? DateTime.now();
    final data = await _calendar;
    final days = (data['days'] as List)
        .map((record) => Map<String, dynamic>.from(record as Map))
        .toList(growable: false);
    final daysByDate = <String, Map<String, dynamic>>{
      for (final day in days) '${day['month_order']}-${day['day']}': day,
    };
    final upcoming = <SynaxariumObservance>[];

    for (var offset = includeToday ? 0 : 1; offset <= lookAheadDays; offset++) {
      final date = DateTime.utc(
        today.year,
        today.month,
        today.day + offset,
        12,
      );
      final coptic = _copticDate(date);
      final dayRecord = daysByDate['${coptic.month}-${coptic.day}'];
      if (dayRecord == null || dayRecord['extraction_status'] != 'extracted') {
        continue;
      }

      final rawObservances = dayRecord['observances'] as List? ?? const [];
      final names = rawObservances
          .map((record) => (record as Map)['name_ar']?.toString().trim() ?? '')
          .where((name) => name.isNotEmpty)
          .toList();
      for (var index = 0; index < names.length; index++) {
        upcoming.add(
          SynaxariumObservance(
            id: '${dayRecord['id']}-$index',
            name: names[index],
            copticDate:
                '${_digits(coptic.day)} ${_copticMonths[coptic.month - 1]}',
            gregorianDate: _formatShortGregorianDate(date),
            relativeDate: _relativeDayLabel(offset),
          ),
        );
      }
    }

    final todayCoptic = _copticDate(
      DateTime.utc(today.year, today.month, today.day, 12),
    );
    return SynaxariumSnapshot(
      todayCopticDate:
          '${_weekdays[today.weekday - 1]} ${_digits(todayCoptic.day)} '
          '${_copticMonths[todayCoptic.month - 1]} ${_digits(todayCoptic.year)} ش',
      todayGregorianDate: _formatGregorianDate(today, includeWeekday: false),
      observances: upcoming,
    );
  }

  static ({int month, int day, int year}) _copticDate(DateTime date) {
    final daysSinceEpoch = _julianDayNumber(date) - 1825030;
    final year = (4 * daysSinceEpoch + 1463) ~/ 1461;
    final firstDayOfYear = 365 * (year - 1) + year ~/ 4;
    final dayOfYear = daysSinceEpoch - firstDayOfYear;
    return (month: dayOfYear ~/ 30 + 1, day: dayOfYear % 30 + 1, year: year);
  }

  static int _julianDayNumber(DateTime date) {
    final a = (14 - date.month) ~/ 12;
    final year = date.year + 4800 - a;
    final month = date.month + 12 * a - 3;
    return date.day +
        (153 * month + 2) ~/ 5 +
        365 * year +
        year ~/ 4 -
        year ~/ 100 +
        year ~/ 400 -
        32045;
  }

  static String _formatGregorianDate(
    DateTime date, {
    bool includeWeekday = true,
  }) {
    final weekday = '${_weekdays[date.weekday - 1]}، ';
    return '${includeWeekday ? weekday : ''}${_digits(date.day)} '
        '${_gregorianMonths[date.month - 1]} ${_digits(date.year)} م';
  }

  static String _formatShortGregorianDate(DateTime date) =>
      '${_digits(date.day)} ${_gregorianMonths[date.month - 1]}';

  static String _relativeDayLabel(int offset) {
    if (offset == 0) return 'اليوم';
    if (offset == 1) return 'غدًا';
    if (offset == 2) return 'بعد غد';
    return 'بعد ${_digits(offset)} أيام';
  }

  static String _digits(int value) => value.toString().replaceAllMapped(
    RegExp(r'\d'),
    (match) => _arabicDigits[int.parse(match.group(0)!)],
  );
}
