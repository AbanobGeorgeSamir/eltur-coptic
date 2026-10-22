import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../models/ministry_post_model.dart';
import '../theme/app_theme.dart';
import 'post_creator_screen.dart';
import 'package:url_launcher/url_launcher.dart';

class NewslettersScreen extends StatefulWidget {
  const NewslettersScreen({super.key});

  @override
  State<NewslettersScreen> createState() => _NewslettersScreenState();
}

class _NewslettersScreenState extends State<NewslettersScreen> {
  List<MinistryPostModel> _posts = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPosts();
  }

  Future<void> _loadPosts() async {
    setState(() => _isLoading = true);
    try {
      final groups = await Future.wait([
        ApiService.getPosts(type: 'newsletter'),
        ApiService.getPosts(type: 'sunday_lesson'),
      ]);
      final posts = groups.expand((items) => items).toList()
        ..sort((a, b) {
          final aDate = DateTime.tryParse(a.createdAt);
          final bDate = DateTime.tryParse(b.createdAt);
          if (aDate == null) return bDate == null ? 0 : 1;
          if (bDate == null) return -1;
          return bDate.compareTo(aDate);
        });
      if (mounted) {
        setState(() {
          _posts = posts;
          _error = null;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _editPost(MinistryPostModel post) async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => PostCreatorScreen(postToEdit: post)),
    );
    if (updated == true && mounted) _loadPosts();
  }

  Future<void> _deletePost(MinistryPostModel post) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        scrollable: true,
        title: const Text('حذف الإعلان'),
        content: Text('هل تريد حذف "${post.title}"؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('إلغاء'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.deletePost(post.id);
      if (!mounted) return;
      await _loadPosts();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تم حذف الإعلان.')));
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

  Future<void> _openMedia(String value) async {
    final uri = Uri.tryParse(value);
    if (uri == null || !['http', 'https'].contains(uri.scheme)) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('رابط المرفق غير صالح.')));
      }
      return;
    }
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تعذر فتح المرفق.')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تعذر فتح المرفق.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final userRole = AuthService.currentUser?.role ?? 'student';
    final canPublish = isAdminRole(userRole);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('النشرات والإعلانات')),
        floatingActionButton: canPublish
            ? FloatingActionButton.extended(
                onPressed: () async {
                  final res = await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const PostCreatorScreen(),
                    ),
                  );
                  if (res == true && mounted) _loadPosts();
                },
                backgroundColor: AppTheme.primaryBurgundy,
                foregroundColor: AppTheme.accentGold,
                icon: const Icon(Icons.add),
                label: const Text('إضافة إعلان أو درس'),
              )
            : null,
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadPosts,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: _posts.isEmpty ? 1 : _posts.length,
                  itemBuilder: (context, index) {
                    if (_error != null) {
                      return Center(
                        child: Text(_error!, textAlign: TextAlign.center),
                      );
                    }
                    if (_posts.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.only(top: 60),
                          child: Text('لا توجد إعلانات منشورة حالياً.'),
                        ),
                      );
                    }
                    final post = _posts[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.lightGold,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    post.typeInArabic,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.darkBurgundy,
                                    ),
                                  ),
                                ),
                                Text(
                                  'الناشر: ${post.adminName}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textMuted,
                                  ),
                                ),
                                if (canPublish) ...[
                                  IconButton(
                                    tooltip: 'تعديل الإعلان',
                                    onPressed: () => _editPost(post),
                                    icon: const Icon(Icons.edit_outlined),
                                  ),
                                  IconButton(
                                    tooltip: 'حذف الإعلان',
                                    onPressed: () => _deletePost(post),
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      color: Colors.red,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 10),

                            Text(
                              post.title,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryBurgundy,
                              ),
                            ),
                            const SizedBox(height: 8),

                            if (post.mediaUrl.isNotEmpty) ...[
                              if (post.mediaKind == 'image')
                                InkWell(
                                  onTap: () => _openMedia(post.mediaUrl),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.network(
                                      post.mediaUrl,
                                      height: 180,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, _, _) => const Padding(
                                        padding: EdgeInsets.all(12),
                                        child: Text(
                                          'تعذر عرض الصورة، اضغط لفتح الرابط',
                                        ),
                                      ),
                                    ),
                                  ),
                                )
                              else
                                OutlinedButton.icon(
                                  onPressed: () => _openMedia(post.mediaUrl),
                                  icon: Icon(
                                    post.mediaKind == 'pdf'
                                        ? Icons.picture_as_pdf
                                        : Icons.open_in_new,
                                  ),
                                  label: Text(
                                    post.mediaKind == 'pdf'
                                        ? 'فتح ملف PDF'
                                        : 'فتح الرابط المرفق',
                                  ),
                                ),
                              const SizedBox(height: 10),
                            ],

                            Text(
                              post.body,
                              style: const TextStyle(fontSize: 14, height: 1.6),
                            ),
                            const SizedBox(height: 12),

                            if (post.eventAt.isNotEmpty) ...[
                              Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 6,
                                runSpacing: 4,
                                children: [
                                  const Icon(
                                    Icons.event,
                                    size: 16,
                                    color: AppTheme.primaryBurgundy,
                                  ),
                                  Text(
                                    'موعد الفاعلية / الرحلة: ${post.eventAt}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.deepNavy,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
