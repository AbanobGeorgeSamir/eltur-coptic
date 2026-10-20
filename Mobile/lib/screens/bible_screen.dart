import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import '../widgets/asset_pdf_viewer.dart';

import '../theme/app_theme.dart';
import '../widgets/ministry_feed.dart';

const _books = <({String id, String name, String testament})>[
  (id: 'Gen', name: 'سفر التكوين', testament: 'OT'),
  (id: 'Exod', name: 'سفر الخروج', testament: 'OT'),
  (id: 'Lev', name: 'سفر اللاويين', testament: 'OT'),
  (id: 'Num', name: 'سفر العدد', testament: 'OT'),
  (id: 'Deut', name: 'سفر التثنية', testament: 'OT'),
  (id: 'Josh', name: 'سفر يشوع', testament: 'OT'),
  (id: 'Judg', name: 'سفر القضاة', testament: 'OT'),
  (id: 'Ruth', name: 'سفر راعوث', testament: 'OT'),
  (id: '1Sam', name: 'سفر صموئيل الأول', testament: 'OT'),
  (id: '2Sam', name: 'سفر صموئيل الثاني', testament: 'OT'),
  (id: '1Kgs', name: 'سفر الملوك الأول', testament: 'OT'),
  (id: '2Kgs', name: 'سفر الملوك الثاني', testament: 'OT'),
  (id: '1Chr', name: 'سفر أخبار الأيام الأول', testament: 'OT'),
  (id: '2Chr', name: 'سفر أخبار الأيام الثاني', testament: 'OT'),
  (id: 'Ezra', name: 'سفر عزرا', testament: 'OT'),
  (id: 'Neh', name: 'سفر نحميا', testament: 'OT'),
  (id: 'Esth', name: 'سفر أستير', testament: 'OT'),
  (id: 'Job', name: 'سفر أيوب', testament: 'OT'),
  (id: 'Ps', name: 'سفر المزامير', testament: 'OT'),
  (id: 'Prov', name: 'سفر الأمثال', testament: 'OT'),
  (id: 'Eccl', name: 'سفر الجامعة', testament: 'OT'),
  (id: 'Song', name: 'نشيد الأنشاد', testament: 'OT'),
  (id: 'Isa', name: 'سفر إشعياء', testament: 'OT'),
  (id: 'Jer', name: 'سفر إرميا', testament: 'OT'),
  (id: 'Lam', name: 'مراثي إرميا', testament: 'OT'),
  (id: 'Ezek', name: 'سفر حزقيال', testament: 'OT'),
  (id: 'Dan', name: 'سفر دانيال', testament: 'OT'),
  (id: 'Hos', name: 'سفر هوشع', testament: 'OT'),
  (id: 'Joel', name: 'سفر يوئيل', testament: 'OT'),
  (id: 'Amos', name: 'سفر عاموس', testament: 'OT'),
  (id: 'Obad', name: 'سفر عوبديا', testament: 'OT'),
  (id: 'Jonah', name: 'سفر يونان', testament: 'OT'),
  (id: 'Mic', name: 'سفر ميخا', testament: 'OT'),
  (id: 'Nah', name: 'سفر ناحوم', testament: 'OT'),
  (id: 'Hab', name: 'سفر حبقوق', testament: 'OT'),
  (id: 'Zeph', name: 'سفر صفنيا', testament: 'OT'),
  (id: 'Hag', name: 'سفر حجي', testament: 'OT'),
  (id: 'Zech', name: 'سفر زكريا', testament: 'OT'),
  (id: 'Mal', name: 'سفر ملاخي', testament: 'OT'),
  (id: 'Matt', name: 'إنجيل متى', testament: 'NT'),
  (id: 'Mark', name: 'إنجيل مرقس', testament: 'NT'),
  (id: 'Luke', name: 'إنجيل لوقا', testament: 'NT'),
  (id: 'John', name: 'إنجيل يوحنا', testament: 'NT'),
  (id: 'Acts', name: 'سفر أعمال الرسل', testament: 'NT'),
  (id: 'Rom', name: 'رسالة رومية', testament: 'NT'),
  (id: '1Cor', name: 'رسالة كورنثوس الأولى', testament: 'NT'),
  (id: '2Cor', name: 'رسالة كورنثوس الثانية', testament: 'NT'),
  (id: 'Gal', name: 'رسالة غلاطية', testament: 'NT'),
  (id: 'Eph', name: 'رسالة أفسس', testament: 'NT'),
  (id: 'Phil', name: 'رسالة فيلبي', testament: 'NT'),
  (id: 'Col', name: 'رسالة كولوسي', testament: 'NT'),
  (id: '1Thess', name: 'رسالة تسالونيكي الأولى', testament: 'NT'),
  (id: '2Thess', name: 'رسالة تسالونيكي الثانية', testament: 'NT'),
  (id: '1Tim', name: 'رسالة تيموثاوس الأولى', testament: 'NT'),
  (id: '2Tim', name: 'رسالة تيموثاوس الثانية', testament: 'NT'),
  (id: 'Titus', name: 'رسالة تيطس', testament: 'NT'),
  (id: 'Phlm', name: 'رسالة فليمون', testament: 'NT'),
  (id: 'Heb', name: 'الرسالة إلى العبرانيين', testament: 'NT'),
  (id: 'Jas', name: 'رسالة يعقوب', testament: 'NT'),
  (id: '1Pet', name: 'رسالة بطرس الأولى', testament: 'NT'),
  (id: '2Pet', name: 'رسالة بطرس الثانية', testament: 'NT'),
  (id: '1John', name: 'رسالة يوحنا الأولى', testament: 'NT'),
  (id: '2John', name: 'رسالة يوحنا الثانية', testament: 'NT'),
  (id: '3John', name: 'رسالة يوحنا الثالثة', testament: 'NT'),
  (id: 'Jude', name: 'رسالة يهوذا', testament: 'NT'),
  (id: 'Rev', name: 'سفر الرؤيا', testament: 'NT'),
];

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
  String? _error;

  List<dynamic> get _chapters =>
      _bookData?['chapters'] as List<dynamic>? ?? const [];

  List<({String id, String name, String testament})> get _testamentBooks =>
      _books.where((book) => book.testament == _testament).toList();

  void _selectTestament(String testament) {
    if (_testament == testament) return;
    final firstBook = _books.firstWhere((book) => book.testament == testament);
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
    final book = _books.firstWhere((item) => item.id == _bookId);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('الكتاب المقدس'),
          actions: [
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
                padding: const EdgeInsets.all(16),
                children: [
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
                                final selectedBook = _books.firstWhere(
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
                                        (chapter) => chapter['chapter'] as int,
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
                                        .map((verse) => verse['number'] as int)
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
                  const SizedBox(height: 8),
                  Text(
                    _searchController.text.isNotEmpty
                        ? 'نتائج البحث: ${_visibleVerses.length}'
                        : 'ترجمة فان دايك · ${_visibleVerses.length} آية',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(height: 8),
                  if (_visibleVerses.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Text('لا توجد آيات مطابقة.'),
                      ),
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
                                style: const TextStyle(
                                  fontSize: 16,
                                  height: 1.9,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    })
                  else
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 22, 20, 26),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFAF0),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFE9DFCB)),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x12000000),
                            blurRadius: 14,
                            offset: Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 54,
                                height: 54,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF7D2038).withValues(alpha: 0.06),
                                  border: Border.all(
                                    color: const Color(0xFF7D2038).withValues(alpha: 0.20),
                                  ),
                                ),
                                child: Text(
                                  _arabicizeDigits(_chapterNumber),
                                  style: const TextStyle(
                                    fontSize: 23,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF7D2038),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'الكتاب المقدس',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF7D2038),
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      book.name,
                                      style: const TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF342C27),
                                      ),
                                    ),
                                    Text(
                                      'الإصحاح ${_arabicizeDigits(_chapterNumber)}',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Color(0xFF786B60),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 18),
                            child: Divider(height: 1, color: Color(0xFFE9DFCB)),
                          ),
                          SelectableText.rich(
                            TextSpan(
                              style: const TextStyle(
                                fontSize: 20,
                                height: 2.2,
                                color: Color(0xFF342C27),
                              ),
                              children: _visibleVerses.expand((verse) {
                                final number = verse['number'] ?? '';
                                return [
                                  TextSpan(
                                    text: '${_arabicizeDigits(number)} ',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF7D2038),
                                    ),
                                  ),
                                  TextSpan(
                                    text: '${verse['text']?.toString() ?? ''} ',
                                  ),
                                ];
                              }).toList(),
                            ),
                          ),
                        ],
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
