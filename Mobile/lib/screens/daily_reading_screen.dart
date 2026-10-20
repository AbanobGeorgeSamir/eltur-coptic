import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/bible_books.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/daily_reading_title.dart';

class DailyReadingScreen extends StatefulWidget {
  const DailyReadingScreen({super.key});

  @override
  State<DailyReadingScreen> createState() => _DailyReadingScreenState();
}

class _DailyReadingScreenState extends State<DailyReadingScreen> {
  final _textController = TextEditingController();
  String _bookId = 'Matt';
  String _testament = 'NT';
  int _chapterNumber = 1;
  int _startVerse = 1;
  int _endVerse = 1;
  bool _wholeChapter = true;
  Map<String, dynamic>? _bookData;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSavedReading();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  ({String id, String name, String testament}) get _book =>
      bibleBooks.firstWhere((item) => item.id == _bookId);

  List<dynamic> get _chapters =>
      _bookData?['chapters'] as List<dynamic>? ?? const [];

  Map<String, dynamic>? get _chapter {
    for (final item in _chapters) {
      if (item is Map && item['chapter'] == _chapterNumber) {
        return Map<String, dynamic>.from(item);
      }
    }
    return null;
  }

  List<dynamic> get _verses =>
      _chapter?['verses'] as List<dynamic>? ?? const [];

  List<({String id, String name, String testament})> get _testamentBooks =>
      bibleBooks.where((item) => item.testament == _testament).toList();

  String _passageText(int start, int end, {Map<String, dynamic>? chapter}) {
    final verses = chapter?['verses'] as List<dynamic>? ?? _verses;
    return verses
        .whereType<Map>()
        .where((verse) {
          final number = verse['number'] as int? ?? 0;
          return number >= start && number <= end;
        })
        .map((verse) => '${verse['number']} ${verse['text']}')
        .join('\n');
  }

  Future<Map<String, dynamic>> _readBook(String bookId) async {
    final text = await rootBundle.loadString('resources/bible/$bookId.json');
    return Map<String, dynamic>.from(jsonDecode(text) as Map);
  }

  Future<void> _loadSavedReading() async {
    try {
      final saved = await ApiService.getDailyReading();
      final bookId = saved?['bookId']?.toString() ?? 'Matt';
      final data = await _readBook(bookId);
      final chapters = data['chapters'] as List<dynamic>? ?? const [];
      final requestedChapter =
          int.tryParse(saved?['chapter']?.toString() ?? '') ?? 1;
      final matchingChapters = chapters
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .where((item) => item['chapter'] == requestedChapter)
          .toList();
      final chapter = matchingChapters.isEmpty
          ? (chapters.first as Map).cast<String, dynamic>()
          : matchingChapters.first;
      final verseCount =
          (chapter['verses'] as List<dynamic>? ?? const []).length;
      final start = (int.tryParse(saved?['startVerse']?.toString() ?? '') ?? 1)
          .clamp(1, verseCount)
          .toInt();
      final end =
          (int.tryParse(saved?['endVerse']?.toString() ?? '') ?? verseCount)
              .clamp(start, verseCount)
              .toInt();
      if (!mounted) return;
      setState(() {
        _bookId = bookId;
        _testament = _book.testament;
        _bookData = data;
        _chapterNumber = chapter['chapter'] as int? ?? 1;
        _startVerse = start;
        _endVerse = end;
        _wholeChapter = start == 1 && end == verseCount;
        _textController.text =
            saved?['text']?.toString() ??
            _passageText(start, end, chapter: chapter);
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _selectBook(String bookId) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _readBook(bookId);
      if (!mounted) return;
      final firstChapter = Map<String, dynamic>.from(
        (data['chapters'] as List<dynamic>).first as Map,
      );
      final verseCount = (firstChapter['verses'] as List<dynamic>).length;
      setState(() {
        _bookId = bookId;
        _testament = bibleBooks
            .firstWhere((item) => item.id == bookId)
            .testament;
        _bookData = data;
        _chapterNumber = firstChapter['chapter'] as int? ?? 1;
        _startVerse = 1;
        _endVerse = verseCount;
        _wholeChapter = true;
        _textController.text = _passageText(
          1,
          verseCount,
          chapter: firstChapter,
        );
      });
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectChapter(int chapterNumber) {
    final chapter = _chapters
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .firstWhere((item) => item['chapter'] == chapterNumber);
    final verseCount = (chapter['verses'] as List<dynamic>).length;
    setState(() {
      _chapterNumber = chapterNumber;
      _startVerse = 1;
      _endVerse = verseCount;
      _wholeChapter = true;
      _textController.text = _passageText(1, verseCount, chapter: chapter);
    });
  }

  void _setWholeChapter(bool wholeChapter) {
    final verseCount = _verses.length;
    final start = 1;
    final end = wholeChapter ? verseCount : verseCount.clamp(1, 5).toInt();
    setState(() {
      _wholeChapter = wholeChapter;
      _startVerse = start;
      _endVerse = end;
      _textController.text = _passageText(start, end);
    });
  }

  void _selectRange({int? startVerse, int? endVerse}) {
    var start = startVerse ?? _startVerse;
    var end = endVerse ?? _endVerse;
    if (start > end) {
      if (startVerse != null) {
        end = start;
      } else {
        start = end;
      }
    }
    setState(() {
      _startVerse = start;
      _endVerse = end;
      _textController.text = _passageText(start, end);
    });
  }

  String get _reference => formatDailyReadingTitle(
    bookId: _book.id,
    bookName: _book.name,
    chapter: _chapterNumber,
    startVerse: _startVerse,
    endVerse: _endVerse,
  );

  Future<void> _save() async {
    if (_textController.text.trim().isEmpty) {
      setState(() => _error = 'اكتب نص القراءة قبل النشر.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiService.updateDailyReading(
        bookId: _book.id,
        bookName: _book.name,
        chapter: _chapterNumber,
        startVerse: _startVerse,
        endVerse: _endVerse,
        reference: _reference,
        text: _textController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم نشر القراءة اليومية للمستخدمين.')),
      );
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (AuthService.currentUser?.role != 'admin') {
      return const Scaffold(
        body: Center(child: Text('هذه الصفحة متاحة للمسؤول فقط.')),
      );
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('إدارة القراءة اليومية'),
          actions: [
            IconButton(
              tooltip: 'تحديث القراءة الحالية',
              onPressed: _loading ? null : _loadSavedReading,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _bookData == null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error ?? 'تعذر تحميل بيانات القراءة اليومية.'),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: _loadSavedReading,
                        icon: const Icon(Icons.refresh),
                        label: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'اختر السفر والإصحاح كاملًا أو جزءًا منه. يمكنك أيضًا اختصار نص آية قبل النشر، وستظهر القراءة للمستخدمين على الهاتف والويب.',
                    style: TextStyle(color: AppTheme.textMuted, height: 1.6),
                  ),
                  const SizedBox(height: 16),
                  SegmentedButton<String>(
                    showSelectedIcon: false,
                    segments: const [
                      ButtonSegment(value: 'OT', label: Text('العهد القديم')),
                      ButtonSegment(value: 'NT', label: Text('العهد الجديد')),
                    ],
                    selected: {_testament},
                    onSelectionChanged: (selection) {
                      final nextTestament = selection.first;
                      final firstBook = bibleBooks.firstWhere(
                        (book) => book.testament == nextTestament,
                      );
                      _selectBook(firstBook.id);
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _bookId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'السفر'),
                    items: _testamentBooks
                        .map(
                          (book) => DropdownMenuItem(
                            value: book.id,
                            child: Text(book.name),
                          ),
                        )
                        .toList(),
                    onChanged: _saving || _loading
                        ? null
                        : (value) {
                            if (value != null) _selectBook(value);
                          },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<int>(
                    initialValue: _chapterNumber,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'الإصحاح'),
                    items: _chapters
                        .whereType<Map>()
                        .map((chapter) => chapter['chapter'] as int)
                        .map(
                          (number) => DropdownMenuItem(
                            value: number,
                            child: Text('$number'),
                          ),
                        )
                        .toList(),
                    onChanged: _saving
                        ? null
                        : (value) {
                            if (value != null) _selectChapter(value);
                          },
                  ),
                  const SizedBox(height: 14),
                  SegmentedButton<bool>(
                    showSelectedIcon: false,
                    segments: const [
                      ButtonSegment(value: true, label: Text('الإصحاح كاملًا')),
                      ButtonSegment(value: false, label: Text('اختيار آيات')),
                    ],
                    selected: {_wholeChapter},
                    onSelectionChanged: _saving
                        ? null
                        : (selection) => _setWholeChapter(selection.first),
                  ),
                  if (!_wholeChapter) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            initialValue: _startVerse,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'من آية',
                            ),
                            items: _verses
                                .whereType<Map>()
                                .map((verse) => verse['number'] as int)
                                .map(
                                  (number) => DropdownMenuItem(
                                    value: number,
                                    child: Text('$number'),
                                  ),
                                )
                                .toList(),
                            onChanged: _saving
                                ? null
                                : (value) {
                                    if (value != null)
                                      _selectRange(startVerse: value);
                                  },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            initialValue: _endVerse,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'إلى آية',
                            ),
                            items: _verses
                                .whereType<Map>()
                                .map((verse) => verse['number'] as int)
                                .where((number) => number >= _startVerse)
                                .map(
                                  (number) => DropdownMenuItem(
                                    value: number,
                                    child: Text('$number'),
                                  ),
                                )
                                .toList(),
                            onChanged: _saving
                                ? null
                                : (value) {
                                    if (value != null)
                                      _selectRange(endVerse: value);
                                  },
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _textController,
                    maxLength: 20000,
                    maxLines: 8,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'النص المنشور — يمكنك اختصار جزء من الآية',
                      alignLabelWithHint: true,
                    ),
                    enabled: !_saving,
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'اكتب نص القراءة.'
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.publish),
                    label: Text(_saving ? 'جارٍ النشر…' : 'حفظ ونشر القراءة'),
                  ),
                  if (_textController.text.trim().isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Card(
                      color: const Color(0xFFFFFAF0),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'معاينة القراءة اليومية',
                              style: TextStyle(
                                color: AppTheme.primaryBurgundy,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _reference,
                              style: const TextStyle(color: AppTheme.textMuted),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _textController.text,
                              style: const TextStyle(fontSize: 19, height: 1.8),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}
