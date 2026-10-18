import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _enabled = true;
  bool _loading = true;
  bool _savingPreference = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ApiService.getNotifications(),
        ApiService.getVerseUpdatePreference(),
      ]);
      if (!mounted) return;
      setState(() {
        _items = results[0] as List<Map<String, dynamic>>;
        _enabled = results[1] as bool;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _setPreference(bool value) async {
    final oldValue = _enabled;
    setState(() {
      _enabled = value;
      _savingPreference = true;
    });
    try {
      final saved = await ApiService.setVerseUpdatePreference(value);
      if (!mounted) return;
      setState(() => _enabled = saved);
      if (saved) await _load();
      if (!saved && mounted) setState(() => _items = []);
    } catch (error) {
      if (!mounted) return;
      setState(() => _enabled = oldValue);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _savingPreference = false);
    }
  }

  void _openVerse() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const UpdatedVerseScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('الإشعارات'),
          actions: [
            IconButton(
              tooltip: 'تحديث',
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('تحديثات الآية للجميع'),
              subtitle: const Text(
                'استقبل إشعارًا داخل التطبيق عند تغيير الآية المشتركة.',
              ),
              value: _enabled,
              onChanged: _savingPreference ? null : _setPreference,
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_error != null)
              Center(child: Text(_error!))
            else if (!_enabled || _items.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('لا توجد إشعارات لتحديثات الآية حتى الآن.'),
                ),
              )
            else
              ..._items.map(
                (item) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.menu_book_outlined),
                    title: Text(
                      item['title']?.toString() ?? 'تم تحديث الآية للجميع',
                    ),
                    subtitle: Text(
                      '${item['reference'] ?? ''}\n${item['text'] ?? ''}',
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                    ),
                    isThreeLine: true,
                    onTap: _openVerse,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class UpdatedVerseScreen extends StatefulWidget {
  const UpdatedVerseScreen({super.key});

  @override
  State<UpdatedVerseScreen> createState() => _UpdatedVerseScreenState();
}

class _UpdatedVerseScreenState extends State<UpdatedVerseScreen> {
  Map<String, dynamic>? _verse;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final verse = await ApiService.getFeaturedVerse();
      if (!mounted) return;
      setState(() {
        _verse = verse;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Directionality(
    textDirection: TextDirection.rtl,
    child: Scaffold(
      appBar: AppBar(title: const Text('الآية المحدثة للجميع')),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : _error != null
            ? Padding(padding: const EdgeInsets.all(24), child: Text(_error!))
            : _verse == null
            ? const Text('No featured ayah is available.')
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _verse!['text']?.toString() ?? '',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _verse!['reference']?.toString() ?? '',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
      ),
    ),
  );
}
