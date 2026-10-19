import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/roles.dart';
import '../models/task_model.dart';
import '../theme/app_theme.dart';
import '../widgets/grade_scope_fields.dart';
import 'task_assign_screen.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  List<TaskModel> _tasks = [];
  final _searchController = TextEditingController();
  String _filter = 'all';
  bool _isLoading = true;
  String? _error;
  Map<String, Map<String, String>> _taskAudiences = {};
  String? _savingScopeId;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final user = AuthService.currentUser;
    final studentId = user?.role == 'parent' && user?.childStudentId != null
        ? user!.childStudentId!
        : (user?.id ?? '');

    try {
      final tasks = await ApiService.getStudentTasks(studentId);
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _taskAudiences = {
            for (final task in tasks.where((task) => task.isGroupTask))
              task.id: {'grade': task.grade, 'meetingGroup': task.meetingGroup},
          };
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

  Future<void> _saveTaskAudience(TaskModel task) async {
    setState(() => _savingScopeId = task.id);
    try {
      await ApiService.updateTaskAudience(
        task.id,
        _taskAudiences[task.id] ?? const {'grade': '', 'meetingGroup': ''},
      );
      await _loadTasks();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم تحديث نطاق ظهور المهمة.')),
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
    } finally {
      if (mounted) setState(() => _savingScopeId = null);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _submitTask(TaskModel task) async {
    final noteController = TextEditingController();
    try {
      final note = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          scrollable: true,
          title: const Text('تسليم المهمة'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                task.title,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                maxLength: 2000,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'ملاحظات التسليم (اختياري)',
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('إلغاء'),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.pop(context, noteController.text.trim()),
              child: const Text('تسليم المهمة'),
            ),
          ],
        ),
      );
      if (note == null) return;
      await ApiService.toggleTaskComplete(task.id, completionNote: note);
      await _loadTasks();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    } finally {
      noteController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final userRole = AuthService.currentUser?.role ?? 'student';
    final isServantOrAdmin = isAdminRole(userRole);
    final completedCount = _tasks.where((task) => task.isCompleted).length;
    final pendingCount = _tasks.length - completedCount;
    final progress = _tasks.isEmpty ? 0.0 : completedCount / _tasks.length;
    final query = _searchController.text.trim().toLowerCase();
    final visibleTasks = _tasks.where((task) {
      final statusMatches =
          _filter == 'all' ||
          (_filter == 'pending' && !task.isCompleted) ||
          (_filter == 'completed' && task.isCompleted);
      final textMatches =
          query.isEmpty ||
          '${task.title} ${task.description}'.toLowerCase().contains(query);
      return statusMatches && textMatches;
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('مهام ومسئوليات إعدادي خدمة')),
        floatingActionButton: isServantOrAdmin
            ? FloatingActionButton.extended(
                onPressed: () async {
                  final res = await Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const TaskAssignScreen()),
                  );
                  if (res == true) _loadTasks();
                },
                backgroundColor: AppTheme.primaryBurgundy,
                foregroundColor: AppTheme.accentGold,
                icon: const Icon(Icons.add_task),
                label: const Text('إسناد مهمة جديدة'),
              )
            : null,
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadTasks,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Expanded(
                                  child: Text(
                                    'إنجاز المهام',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Text(
                                  '${(progress * 100).round()}%',
                                  style: const TextStyle(
                                    color: AppTheme.primaryBurgundy,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            LinearProgressIndicator(
                              value: progress,
                              minHeight: 8,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '$completedCount مكتملة · $pendingCount قيد التنفيذ',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      children: [
                        for (final choice in [
                          ('all', 'الكل'),
                          ('pending', 'قيد التنفيذ'),
                          ('completed', 'مكتملة'),
                        ])
                          ChoiceChip(
                            label: Text(choice.$2),
                            selected: _filter == choice.$1,
                            onSelected: (_) =>
                                setState(() => _filter = choice.$1),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _searchController,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: query.isEmpty
                            ? null
                            : IconButton(
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {});
                                },
                                icon: const Icon(Icons.close),
                              ),
                        hintText: 'ابحث في المهام',
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_tasks.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(18),
                          child: Text('لا توجد مهام مسندة حالياً.'),
                        ),
                      )
                    else if (visibleTasks.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(18),
                          child: Text('لا توجد مهام مطابقة لهذا الاختيار.'),
                        ),
                      )
                    else
                      ...visibleTasks.map(
                        (task) => Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: CheckboxListTile(
                            value: task.isCompleted,
                            activeColor: AppTheme.primaryBurgundy,
                            controlAffinity: ListTileControlAffinity.leading,
                            title: Text(
                              task.title,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                decoration: task.isCompleted
                                    ? TextDecoration.lineThrough
                                    : null,
                              ),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (task.description.isNotEmpty)
                                    Text(task.description),
                                  if (task.isGroupTask &&
                                      isAdminRole(userRole)) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      'مهمة للمجموعة · أكملها ${task.completedCount} طالب',
                                    ),
                                  ],
                                  if ((isAdminRole(userRole) ||
                                          userRole == 'parent') &&
                                      task.studentName.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text('الطالب: ${task.studentName}'),
                                  ],
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 5,
                                    children: [
                                      Text(
                                        'الخادم: ${task.adminName}',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                      if (task.dueAt.isNotEmpty)
                                        Text(
                                          'الموعد: ${task.dueAt}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      if (task.completionNote.isNotEmpty &&
                                          !(isAdminRole(userRole) &&
                                              task.isGroupTask))
                                        Text(
                                          'ملاحظة التسليم: ${task.completionNote}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                    ],
                                  ),
                                  if (isAdminRole(userRole) &&
                                      task.isGroupTask) ...[
                                    if (task.audienceMode.isEmpty)
                                      Container(
                                        margin: const EdgeInsets.only(top: 10),
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.withValues(
                                            alpha: 0.08,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        child: const Text(
                                          'مهمة قديمة بلا نطاق مرحلة محفوظ؛ هي مخفية عن الطلاب حتى حفظ نطاقها.',
                                          style: TextStyle(fontSize: 12),
                                        ),
                                      ),
                                    const SizedBox(height: 10),
                                    GradeScopeFields(
                                      user: AuthService.currentUser,
                                      grade:
                                          _taskAudiences[task.id]?['grade'] ??
                                          '',
                                      meetingGroup:
                                          _taskAudiences[task
                                              .id]?['meetingGroup'] ??
                                          '',
                                      onChanged: (key, value) => setState(() {
                                        final audience =
                                            Map<String, String>.from(
                                              _taskAudiences[task.id] ??
                                                  const {},
                                            );
                                        if (key == 'grade') {
                                          audience['grade'] = value;
                                          audience['meetingGroup'] = '';
                                        } else {
                                          audience['meetingGroup'] = value;
                                        }
                                        _taskAudiences[task.id] = audience;
                                      }),
                                    ),
                                    Align(
                                      alignment:
                                          AlignmentDirectional.centerStart,
                                      child: OutlinedButton(
                                        onPressed: _savingScopeId == task.id
                                            ? null
                                            : () => _saveTaskAudience(task),
                                        child: Text(
                                          _savingScopeId == task.id
                                              ? 'جارٍ حفظ النطاق...'
                                              : 'حفظ نطاق المهمة',
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    const SizedBox(height: 10),
                                    const Text(
                                      'تسليمات وملاحظات الطلاب:',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 5),
                                    if (task.completions.isEmpty)
                                      const Text(
                                        'لم يسلّم أي طالب هذه المهمة بعد.',
                                      ),
                                    ...task.completions.map(
                                      (completion) => Container(
                                        width: double.infinity,
                                        margin: const EdgeInsets.only(
                                          bottom: 6,
                                        ),
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.green.withValues(
                                            alpha: 0.06,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          border: Border.all(
                                            color: Colors.green.withValues(
                                              alpha: 0.18,
                                            ),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              completion.studentName,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            if (completion
                                                .completedAt
                                                .isNotEmpty)
                                              Text(
                                                'تاريخ التسليم: ${completion.completedAt.split('T').first}',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                ),
                                              ),
                                            Text(
                                              completion.completionNote.isEmpty
                                                  ? 'لا توجد ملاحظة مرفقة.'
                                                  : 'ملاحظة التسليم: ${completion.completionNote}',
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            onChanged:
                                userRole == 'student' && !task.isCompleted
                                ? (_) => _submitTask(task)
                                : null,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
