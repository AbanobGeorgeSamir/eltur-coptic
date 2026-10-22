import 'package:material_ui/material_ui.dart';

import '../services/api_service.dart';

Future<void> showServerConnectionDialog(BuildContext context) async {
  final controller = TextEditingController(text: ApiService.baseUrl);
  final value = await showDialog<String>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      scrollable: true,
      title: const Text('إعداد اتصال الخادم'),
      content: TextField(
        controller: controller,
        keyboardType: TextInputType.url,
        textDirection: TextDirection.ltr,
        decoration: const InputDecoration(
          labelText: 'رابط API',
          hintText: 'http://192.168.1.10:8000/api',
          helperText: 'على الهاتف الحقيقي استخدم عنوان الحاسوب على الشبكة.',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('إلغاء'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(dialogContext, controller.text),
          child: const Text('حفظ وفحص الاتصال'),
        ),
      ],
    ),
  );
  controller.dispose();
  if (value == null || !context.mounted) return;

  try {
    final result = await ApiService.checkHealthAt(value);
    if (!context.mounted) return;
    final connected = result['status'] == 'ok';
    if (!connected) {
      throw Exception('The server responded, but its database is unavailable.');
    }
    await ApiService.configureBaseUrl(value);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Server connected. The address has been saved.')),
    );
  } catch (error) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
    );
  }
}
