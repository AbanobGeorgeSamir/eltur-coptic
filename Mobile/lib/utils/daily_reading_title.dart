const _gospelBookIds = {'Matt', 'Mark', 'Luke', 'John'};

String formatDailyReadingTitle({
  required String bookId,
  required String bookName,
  required int chapter,
  required int startVerse,
  required int endVerse,
}) {
  final name = bookName.trim();
  final isGospel = _gospelBookIds.contains(bookId) || name.startsWith('إنجيل ');
  final bookTitle = isGospel && !name.startsWith('إنجيل ')
      ? 'إنجيل $name'
      : name;

  return '$bookTitle $chapter $startVerse: $endVerse';
}

String dailyReadingTitle(Map<String, dynamic> reading) {
  final bookId = reading['bookId']?.toString() ?? '';
  final bookName = reading['bookName']?.toString() ?? '';
  final chapter = int.tryParse(reading['chapter']?.toString() ?? '');
  final startVerse = int.tryParse(reading['startVerse']?.toString() ?? '');
  final endVerse = int.tryParse(reading['endVerse']?.toString() ?? '');

  if (bookName.isEmpty ||
      chapter == null ||
      startVerse == null ||
      endVerse == null) {
    return reading['reference']?.toString() ?? '';
  }

  return formatDailyReadingTitle(
    bookId: bookId,
    bookName: bookName,
    chapter: chapter,
    startVerse: startVerse,
    endVerse: endVerse,
  );
}
