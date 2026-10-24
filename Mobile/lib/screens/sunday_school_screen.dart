import 'package:material_ui/material_ui.dart';
import '../widgets/ministry_feed.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/roles.dart';
import '../models/ministry_post_model.dart';
import '../theme/app_theme.dart';

class SundaySchoolScreen extends StatefulWidget {
  const SundaySchoolScreen({super.key});

  @override
  State<SundaySchoolScreen> createState() => _SundaySchoolScreenState();
}

class _SundaySchoolScreenState extends State<SundaySchoolScreen> {
  int _refreshKey = 0;

  Future<void> _deleteLesson(MinistryPostModel post) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('حذف الدرس'),
        content: Text('هل أنت متأكد من حذف درس "${post.title}" نهائياً؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_outline),
            label: const Text('حذف'),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.dangerRed,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ApiService.deletePost(post.id);
      setState(() => _refreshKey++);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم حذف الدرس بنجاح.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = isAdminRole(AuthService.currentUser?.role);
    return MinistryFeed(
      title: 'دروس مدارس الأحد',
      types: const ['sunday_lesson'],
      refreshKey: _refreshKey,
      onDeletePost: isAdmin ? _deleteLesson : null,
    );
  }
}
