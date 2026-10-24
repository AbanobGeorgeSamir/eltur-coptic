import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class FeaturedVerseScreen extends StatefulWidget {
  const FeaturedVerseScreen({super.key});

  @override
  State<FeaturedVerseScreen> createState() => _FeaturedVerseScreenState();
}

class _FeaturedVerseScreenState extends State<FeaturedVerseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _textController = TextEditingController();
  final _referenceController = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _textController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final verse = await ApiService.getFeaturedVerse();
      if (!mounted) return;
      _textController.text = verse?['text']?.toString() ?? '';
      _referenceController.text = verse?['reference']?.toString() ?? '';
      setState(() {
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiService.updateFeaturedVerse(
        text: _textController.text,
        reference: _referenceController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم نشر الآية لجميع المستخدمين.')),
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
          title: const Text('الآية المعروضة للجميع'),
          actions: [
            IconButton(
              tooltip: 'تحديث الآية',
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'حدّث نص الآية ومرجعها؛ ستظهر في الصفحة الرئيسية لجميع المستخدمين.',
                    style: TextStyle(color: AppTheme.textMuted, height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _textController,
                          maxLength: 1200,
                          maxLines: 5,
                          decoration: const InputDecoration(
                            labelText: 'نص الآية',
                            alignLabelWithHint: true,
                          ),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                              ? 'اكتب نص الآية.'
                              : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _referenceController,
                          maxLength: 160,
                          decoration: const InputDecoration(
                            labelText: 'المرجع',
                          ),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                              ? 'اكتب مرجع الآية.'
                              : null,
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _error!,
                            style: const TextStyle(color: Colors.red),
                          ),
                        ],
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _saving ? null : _save,
                          icon: _saving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.publish),
                          label: Text(_saving ? 'جارٍ النشر…' : 'نشر الآية'),
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
