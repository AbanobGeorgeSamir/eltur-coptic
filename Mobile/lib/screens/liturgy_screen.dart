import 'package:material_ui/material_ui.dart';

import '../models/ministry_post_model.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../theme/app_theme.dart';
import '../widgets/ministry_feed.dart';
import 'post_creator_screen.dart';

class LiturgyScreen extends StatefulWidget {
  const LiturgyScreen({super.key});

  @override
  State<LiturgyScreen> createState() => _LiturgyScreenState();
}

class _LiturgyScreenState extends State<LiturgyScreen> {
  int _refreshKey = 0;

  Future<void> _addSchedule() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const PostCreatorScreen(initialType: 'liturgy'),
      ),
    );
    if (created == true && mounted) setState(() => _refreshKey++);
  }

  Future<void> _editSchedule(MinistryPostModel post) async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) =>
            PostCreatorScreen(initialType: 'liturgy', postToEdit: post),
      ),
    );
    if (updated == true && mounted) setState(() => _refreshKey++);
  }

  Future<void> _deleteSchedule(MinistryPostModel post) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('حذف موعد القداس؟'),
        content: Text('سيتم حذف «${post.title}» من المواعيد المنشورة.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_outline),
            label: const Text('حذف الموعد'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ApiService.deletePost(post.id);
      if (!mounted) return;
      setState(() => _refreshKey++);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تم حذف موعد القداس.')));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => MinistryFeed(
    title: 'مواعيد القداسات',
    types: const ['liturgy'],
    refreshKey: _refreshKey,
    onEditPost: isAdminRole(AuthService.currentUser?.role)
        ? _editSchedule
        : null,
    onDeletePost: isAdminRole(AuthService.currentUser?.role)
        ? _deleteSchedule
        : null,
    floatingActionButton: isAdminRole(AuthService.currentUser?.role)
        ? FloatingActionButton.extended(
            onPressed: _addSchedule,
            backgroundColor: AppTheme.primaryBurgundy,
            foregroundColor: AppTheme.accentGold,
            icon: const Icon(Icons.add),
            label: const Text('إضافة موعد'),
          )
        : null,
  );
}
