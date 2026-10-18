import 'package:material_ui/material_ui.dart';

import '../models/ministry_post_model.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/ministry_feed.dart';
import 'post_creator_screen.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  int _refreshKey = 0;

  Future<void> _addPhoto() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const PostCreatorScreen(initialType: 'gallery'),
      ),
    );
    if (created == true && mounted) setState(() => _refreshKey++);
  }

  Future<void> _editPhoto(MinistryPostModel post) async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) =>
            PostCreatorScreen(initialType: 'gallery', postToEdit: post),
      ),
    );
    if (updated == true && mounted) setState(() => _refreshKey++);
  }

  Future<void> _deletePhoto(MinistryPostModel post) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('حذف الصورة؟'),
        content: Text('سيتم حذف «${post.title}» من المعرض المنشور.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_outline),
            label: const Text('حذف الصورة'),
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
      ).showSnackBar(const SnackBar(content: Text('تم حذف الصورة من المعرض.')));
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
    title: 'معرض صور الأنشطة',
    types: const ['gallery'],
    gallery: true,
    refreshKey: _refreshKey,
    onEditPost: isAdminRole(AuthService.currentUser?.role) ? _editPhoto : null,
    onDeletePost: isAdminRole(AuthService.currentUser?.role)
        ? _deletePhoto
        : null,
    floatingActionButton: isAdminRole(AuthService.currentUser?.role)
        ? FloatingActionButton.extended(
            onPressed: _addPhoto,
            backgroundColor: AppTheme.primaryBurgundy,
            foregroundColor: AppTheme.accentGold,
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: const Text('إضافة صورة'),
          )
        : null,
  );
}
