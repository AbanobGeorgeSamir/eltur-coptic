import 'package:material_ui/material_ui.dart';
import '../widgets/asset_pdf_viewer.dart';
import '../widgets/ministry_feed.dart';

const _prayers = <({String id, String name, int page})>[
  (id: 'morning', name: 'صلاة باكر', page: 16),
  (id: 'third', name: 'صلاة الساعة الثالثة', page: 59),
  (
    id: 'sixth',
    name: 'صلاة الساعة السادسة',
    page: 90,
  ),
  (
    id: 'ninth',
    name: 'صلاة الساعة التاسعة',
    page: 120,
  ),
  (id: 'vespers', name: 'صلاة الغروب', page: 148),
  (id: 'compline', name: 'صلاة النوم', page: 172),
  (id: 'veil', name: 'صلاة الستار', page: 198),
  (id: 'midnight', name: 'صلاة نصف الليل', page: 246),
];

class AgpeyaScreen extends StatefulWidget {
  const AgpeyaScreen({super.key});

  @override
  State<AgpeyaScreen> createState() => _AgpeyaScreenState();
}

class _AgpeyaScreenState extends State<AgpeyaScreen> {
  String _selectedId = 'morning';

  ({String id, String name, int page}) get _selected =>
      _prayers.firstWhere((prayer) => prayer.id == _selectedId);

  @override
  Widget build(BuildContext context) => MinistryFeed(
    title: 'الأجبية والقراءات',
    types: const ['agpeya', 'psalm'],
    header: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'اختر الصلاة من الأجبية',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 6),
            const Text('اختر الصلاة لفتح موضعها مباشرة في الكتاب.'),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _selectedId,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'الصلاة'),
              items: _prayers
                  .map(
                    (prayer) => DropdownMenuItem(
                      value: prayer.id,
                      child: Text(prayer.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _selectedId = value);
              },
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => AgpeyaPdfScreen(
                      title: _selected.name,
                      initialPageNumber: _selected.page,
                    ),
                  ),
                ),
                icon: const Icon(Icons.menu_book_outlined),
                label: Text('افتح ${_selected.name}'),
              ),
            ),
            TextButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const AgpeyaPdfScreen(
                    title: 'الأجبية كاملة',
                    initialPageNumber: 1,
                  ),
                ),
              ),
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: const Text('تصفح الكتاب كاملاً'),
            ),
          ],
        ),
      ),
    ),
  );
}

class AgpeyaPdfScreen extends StatelessWidget {
  final String title;
  final int initialPageNumber;

  const AgpeyaPdfScreen({
    super.key,
    required this.title,
    required this.initialPageNumber,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(title)),
    body: AssetPdfViewer(
      assetPath: 'resources/books/agpeya.pdf',
      initialPageNumber: initialPageNumber,
    ),
  );
}
