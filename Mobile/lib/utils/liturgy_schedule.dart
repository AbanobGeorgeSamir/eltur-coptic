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
