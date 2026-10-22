import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../data/bible_books.dart';
import '../widgets/asset_pdf_viewer.dart';

import '../theme/app_theme.dart';
import '../widgets/ministry_feed.dart';

String _latinizeDigits(String value) => value.replaceAllMapped(
  RegExp(r'[٠-٩]'),
  (match) => '٠١٢٣٤٥٦٧٨٩'.indexOf(match.group(0)!).toString(),
);

String _arabicizeDigits(Object? value) => value.toString().replaceAllMapped(
  RegExp(r'\d'),
  (match) => '٠١٢٣٤٥٦٧٨٩'[int.parse(match.group(0)!)],
);

String _normalizeArabic(String value) => _latinizeDigits(value)
    .replaceAll(RegExp(r'[\u064B-\u065F\u0670\u06D6-\u06ED]'), '')
    .replaceAll(RegExp('[أإآ]'), 'ا')
    .replaceAll('ى', 'ي')
    .toLowerCase();

class BibleScreen extends StatefulWidget {
  const BibleScreen({super.key});

  @override
  State<BibleScreen> createState() => _BibleScreenState();
}

class _BibleScreenState extends State<BibleScreen> {
  final _searchController = TextEditingController();
  final Map<String, Map<String, dynamic>> _cache = {};
  String _bookId = 'Matt';
  String _testament = 'NT';
  String? _selectedVerse = 'all';
  int _chapterNumber = 1;
  Map<String, dynamic>? _bookData;
  bool _loading = true;
  bool _showControls = false;
  String? _error;

  List<dynamic> get _chapters =>
      _bookData?['chapters'] as List<dynamic>? ?? const [];

  List<({String id, String name, String testament})> get _testamentBooks =>
      bibleBooks.where((book) => book.testament == _testament).toList();

  void _selectTestament(String testament) {
    if (_testament == testament) return;
    final firstBook = bibleBooks.firstWhere(
      (book) => book.testament == testament,
    );
    setState(() => _testament = testament);
    _loadBook(firstBook.id);
  }

  Map<String, dynamic>? get _currentChapter {
    for (final chapter in _chapters) {
      if (chapter is Map && chapter['chapter'] == _chapterNumber) {
        return Map<String, dynamic>.from(chapter);
      }
    }
    return null;
  }

  List<dynamic> get _currentVerses =>
      _currentChapter?['verses'] as List<dynamic>? ?? const [];

  @override
  void initState() {
    super.initState();
    _loadBook(_bookId);
  }

  Future<void> _loadBook(String id) async {
    setState(() {
      _bookId = id;
      _bookData = _cache[id];
      _chapterNumber = 1;
      _selectedVerse = 'all';
      _searchController.clear();
      _loading = _bookData == null;
      _error = null;
    });
    if (_bookData != null) return;
    try {
      final jsonText = await rootBundle.loadString('resources/bible/$id.json');
      final data = Map<String, dynamic>.from(jsonDecode(jsonText) as Map);
      _cache[id] = data;
      if (mounted && _bookId == id) {
        setState(() {
          _bookData = data;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted && _bookId == id) {
        setState(() {
          _error = error.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _visibleVerses {
    final query = _searchController.text.trim();
    if (query.isNotEmpty) {
      final normalized = _normalizeArabic(query);
      final reference = RegExp(
        r'^(\d+)\s*[:：.]\s*(\d+)$',
      ).firstMatch(normalized);
      final matches = <Map<String, dynamic>>[];
      for (final rawChapter in _chapters) {
        if (rawChapter is! Map) continue;
        final chapter = Map<String, dynamic>.from(rawChapter);
        final number = chapter['chapter'] as int? ?? 0;
        final verses = chapter['verses'] as List<dynamic>? ?? const [];
        for (final rawVerse in verses) {
          if (rawVerse is! Map) continue;
          final verse = Map<String, dynamic>.from(rawVerse);
          final verseNumber = verse['number'] as int? ?? 0;
          final text = verse['text']?.toString() ?? '';
          final matchesQuery = reference != null
              ? number == int.parse(reference.group(1)!) &&
                    verseNumber == int.parse(reference.group(2)!)
              : _normalizeArabic(text).contains(normalized);
          if (matchesQuery) matches.add({...verse, 'chapter': number});
        }
      }
      return matches;
    }

    return _currentVerses
        .whereType<Map>()
        .map((verse) => Map<String, dynamic>.from(verse))
        .where(
          (verse) =>
              _selectedVerse == 'all' ||
              verse['number'].toString() == _selectedVerse,
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final book = bibleBooks.firstWhere((item) => item.id == _bookId);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text(
            '${book.name} · ${_arabicizeDigits(_chapterNumber)}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          actions: [
            IconButton(
              tooltip: 'اختيار السفر والإصحاح والبحث',
              icon: Icon(_showControls ? Icons.close : Icons.tune),
              onPressed: () => setState(() => _showControls = !_showControls),
            ),
            IconButton(
              tooltip: 'القراءات المنشورة',
              icon: const Icon(Icons.article_outlined),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const MinistryFeed(
                    title: 'القراءات الإنجيلية',
                    types: ['bible'],
                  ),
                ),
              ),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () => _loadBook(_bookId),
                        icon: const Icon(Icons.refresh),
                        label: const Text('إعادة المحاولة'),
                      ),
                    ],
                  ),
                ),
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 24),
                children: [
                  if (_showControls)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'ابحث عن آية',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryBurgundy,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'اختر العهد والسفر والإصحاح والعدد، أو ابحث بكلمة أو مرجع مثل 3:16.',
                            ),
                            const SizedBox(height: 12),
                            SegmentedButton<String>(
                              showSelectedIcon: false,
                              segments: const [
                                ButtonSegment(
                                  value: 'OT',
                                  label: Text('العهد القديم'),
                                ),
                                ButtonSegment(
                                  value: 'NT',
                                  label: Text('العهد الجديد'),
                                ),
                              ],
                              selected: {_testament},
                              onSelectionChanged: (selection) =>
                                  _selectTestament(selection.first),
                            ),
                            const SizedBox(height: 14),
                            DropdownButtonFormField<String>(
                              initialValue: _bookId,
                              isExpanded: true,
                              decoration: const InputDecoration(
                                labelText: 'السفر',
                              ),
                              items: _testamentBooks
                                  .map(
                                    (item) => DropdownMenuItem(
                                      value: item.id,
                                      child: Text(item.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) {
                                if (value != null) {
                                  final selectedBook = bibleBooks.firstWhere(
                                    (item) => item.id == value,
                                  );
                                  setState(
                                    () => _testament = selectedBook.testament,
                                  );
                                  _loadBook(value);
                                }
                              },
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: DropdownButtonFormField<int>(
                                    initialValue: _chapterNumber,
                                    isExpanded: true,
                                    decoration: const InputDecoration(
                                      labelText: 'الإصحاح',
                                    ),
                                    items: _chapters
                                        .whereType<Map>()
                                        .map(
                                          (chapter) =>
                                              chapter['chapter'] as int,
                                        )
                                        .map(
                                          (number) => DropdownMenuItem(
                                            value: number,
                                            child: Text('$number'),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: (value) => setState(() {
                                      _chapterNumber = value ?? 1;
                                      _selectedVerse = 'all';
                                      _searchController.clear();
                                    }),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    initialValue: _selectedVerse,
                                    isExpanded: true,
                                    decoration: const InputDecoration(
                                      labelText: 'العدد',
                                    ),
                                    items: [
                                      const DropdownMenuItem(
                                        value: 'all',
                                        child: Text('الإصحاح كاملاً'),
                                      ),
                                      ..._currentVerses
                                          .whereType<Map>()
                                          .map(
                                            (verse) => verse['number'] as int,
                                          )
                                          .map(
                                            (number) => DropdownMenuItem(
                                              value: '$number',
                                              child: Text('$number'),
                                            ),
                                          ),
                                    ],
                                    onChanged: (value) => setState(() {
                                      _selectedVerse = value ?? 'all';
                                      _searchController.clear();
                                    }),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _searchController,
                              onChanged: (_) => setState(() {}),
                              decoration: InputDecoration(
                                labelText: 'بحث داخل ${book.name}',
                                hintText: 'كلمة أو مرجع مثل 3:16',
                                prefixIcon: const Icon(Icons.search),
                                suffixIcon: _searchController.text.isEmpty
                                    ? null
                                    : IconButton(
                                        tooltip: 'مسح البحث',
                                        onPressed: () {
                                          _searchController.clear();
                                          setState(() {});
                                        },
                                        icon: const Icon(Icons.close),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: () => Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const BiblePdfScreen(),
                                ),
                              ),
                              icon: const Icon(Icons.picture_as_pdf_outlined),
                              label: const Text('فتح ملف الكتاب PDF'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (_searchController.text.trim().isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
                      child: Text(
                        'نتائج البحث: ${_visibleVerses.length}',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                    ),
                  ],
                  if (_visibleVerses.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('لا توجد آيات مطابقة.'),
                    )
                  else if (_searchController.text.trim().isNotEmpty)
                    ..._visibleVerses.map((verse) {
                      final chapter = verse['chapter'] ?? _chapterNumber;
                      final number = verse['number'] ?? '';
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${book.name} $chapter:$number',
                                style: const TextStyle(
                                  color: AppTheme.primaryBurgundy,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              SelectableText(
                                verse['text']?.toString() ?? '',
                                textAlign: TextAlign.justify,
                                style: GoogleFonts.amiri(
                                  fontSize: 24,
                                  height: 1.8,
                                  color: Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    })
                  else
                    Container(
                      padding: const EdgeInsets.fromLTRB(8, 8, 8, 20),
                      child: SelectableText.rich(
                        TextSpan(
                          style: GoogleFonts.amiri(
                            fontSize: 29,
                            height: 1.9,
                            color: Colors.black,
                          ),
                          children: _visibleVerses.indexed.expand((entry) {
                            final (index, verse) = entry;
                            final number = verse['number'] ?? '';
                            return [
                              TextSpan(
                                text: '$number\u00a0',
                                style: GoogleFonts.amiri(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black,
                                ),
                              ),
                              TextSpan(
                                text:
                                    '${verse['text']?.toString() ?? ''}${index == _visibleVerses.length - 1 ? '' : '\n'}',
                              ),
                            ];
                          }).toList(),
                        ),
                        textAlign: TextAlign.justify,
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

class BiblePdfScreen extends StatelessWidget {
  const BiblePdfScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('كتاب الإنجيل')),
    body: const AssetPdfViewer(assetPath: 'resources/books/gospel-book.pdf'),
  );
}
