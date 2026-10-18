bool isPermanentLiturgy({
  String liturgyType = '',
  String eventAt = '',
  String startTime = '',
  String endTime = '',
}) =>
    liturgyType == 'permanent' ||
    (liturgyType.isEmpty &&
        eventAt.isEmpty &&
        (startTime.isNotEmpty || endTime.isNotEmpty));

int liturgyTimeOrder(String value) {
  final clock = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(value);
  if (clock != null) {
    final hour = int.tryParse(clock.group(1)!);
    final minute = int.tryParse(clock.group(2)!);
    if (hour == null || minute == null || hour > 23 || minute > 59) {
      return 24 * 60;
    }
    return (hour * 60) + minute;
  }

  final date = DateTime.tryParse(value)?.toLocal();
  return date == null ? 24 * 60 : (date.hour * 60) + date.minute;
}

int compareLiturgyTimes(String first, String second) =>
    liturgyTimeOrder(first).compareTo(liturgyTimeOrder(second));

const _liturgyWeekdayOrder = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

int _cairoWeekdayIndex(DateTime date) => (date.weekday + 1) % 7;

int nextLiturgyOffsetMinutes(
  String weekday,
  String startTime,
  String endTime,
  DateTime now,
) {
  final targetDay = _liturgyWeekdayOrder.indexOf(weekday.toLowerCase());
  if (targetDay < 0) return 7 * 24 * 60;

  final currentDay = _cairoWeekdayIndex(now);
  final currentMinute = now.hour * 60 + now.minute;
  final parsedStart = startTime.isEmpty ? 0 : liturgyTimeOrder(startTime);
  final startMinute = parsedStart >= 24 * 60 ? 0 : parsedStart;
  final parsedEnd = endTime.isEmpty ? -1 : liturgyTimeOrder(endTime);
  final endMinute = parsedEnd >= 24 * 60 ? -1 : parsedEnd;
  var daysAhead = (targetDay - currentDay + 7) % 7;
  if (daysAhead == 0 && startMinute < currentMinute) {
    if (endMinute > currentMinute) return 0;
    daysAhead = 7;
  }
  return daysAhead * 24 * 60 + startMinute - currentMinute;
}

int comparePermanentLiturgies(
  String firstDay,
  String firstStartTime,
  String firstEndTime,
  String secondDay,
  String secondStartTime,
  String secondEndTime,
  DateTime now,
) {
  final firstOffset = nextLiturgyOffsetMinutes(
    firstDay,
    firstStartTime,
    firstEndTime,
    now,
  );
  final secondOffset = nextLiturgyOffsetMinutes(
    secondDay,
    secondStartTime,
    secondEndTime,
    now,
  );
  return firstOffset.compareTo(secondOffset);
}
