import 'package:material_ui/material_ui.dart';

import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/grade_scope_fields.dart';

class TaskAssignScreen extends StatefulWidget {
  const TaskAssignScreen({super.key});

  @override
  State<TaskAssignScreen> createState() => _TaskAssignScreenState();
}

class _TaskAssignScreenState extends State<TaskAssignScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _studentSearchController = TextEditingController();

  List<UserModel> _students = [];
  final Set<String> _selectedStudentIds = {};
  DateTime? _dueDate;
  bool _assignToGroup = true;
  String _audienceGrade = '';
  String _audienceMeetingGroup = '';
  bool _loadingStudents = true;
  bool _saving = false;
  String? _studentsError;

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    setState(() {
      _loadingStudents = true;
      _studentsError = null;
    });
    try {
      final students = await ApiService.getUsers(role: 'student');
      if (mounted) setState(() => _students = students);
    } catch (error) {
      if (mounted) {
        setState(() {
          _studentsError = error.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _loadingStudents = false);
    }
  }

  Future<void> _chooseDueDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final selectedDate = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? today,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      helpText: 'اختر موعد التسليم',
      cancelText: 'إلغاء',
      confirmText: 'اختيار',
    );
    if (selectedDate != null && mounted) {
      setState(() => _dueDate = selectedDate);
    }
  }

  String _formatDueDate(DateTime date) {
    final year = date.year.toString().padLeft(4, '0');
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }

  void _toggleStudent(String id, bool selected) {
    setState(() {
      if (selected) {
        if (_selectedStudentIds.length < 200) _selectedStudentIds.add(id);
      } else {
        _selectedStudentIds.remove(id);
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_assignToGroup && _selectedStudentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى اختيار طالب واحد على الأقل.')),
      );
      return;
    }

    setState(() => _saving = true);
    final taskData = {
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'assignToGroup': _assignToGroup,
      'studentIds': _assignToGroup ? <String>[] : _selectedStudentIds.toList(),
      'grade': _audienceGrade,
      'meetingGroup': _audienceMeetingGroup,
      if (_dueDate != null) 'dueAt': _formatDueDate(_dueDate!),
    };

    var routeClosed = false;
    try {
      await ApiService.createTask(taskData);
      if (mounted) {
        routeClosed = true;
        setState(() => _saving = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('تم إسناد المهمة وحفظها')));
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تعذر إسناد المهمة: ${error.toString()}')),
        );
      }
    } finally {
      if (mounted && !routeClosed) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final search = _studentSearchController.text.trim().toLowerCase();
    final visibleStudents = _students.where((student) {
      final name = '${student.name} ${student.fullNameArabic}'.toLowerCase();
      return search.isEmpty || name.contains(search);
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('إسناد مهمة جديدة')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _titleController,
                  maxLength: 200,
                  decoration: const InputDecoration(
                    labelText: 'عنوان المهمة *',
                    prefixIcon: Icon(
                      Icons.assignment,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'يرجى كتابة عنوان المهمة'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  maxLength: 5000,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'التفاصيل (اختياري)',
                    alignLabelWithHint: true,
                    prefixIcon: Icon(
                      Icons.description,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                GradeScopeFields(
                  user: AuthService.currentUser,
                  grade: _audienceGrade,
                  meetingGroup: _audienceMeetingGroup,
                  onChanged: (key, value) => setState(() {
                    if (key == 'grade') {
                      _audienceGrade = value;
                      _audienceMeetingGroup = '';
                    } else {
                      _audienceMeetingGroup = value;
                    }
                  }),
                ),
                const SizedBox(height: 12),
                InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'موعد التسليم',
                    prefixIcon: Icon(
                      Icons.event,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _dueDate == null
                              ? 'بدون موعد محدد'
                              : _formatDueDate(_dueDate!),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _chooseDueDate,
                        icon: const Icon(Icons.calendar_month_outlined),
                        label: Text(_dueDate == null ? 'اختيار' : 'تغيير'),
                      ),
                      if (_dueDate != null)
                        IconButton(
                          tooltip: 'مسح الموعد',
                          onPressed: () => setState(() => _dueDate = null),
                          icon: const Icon(Icons.close),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: SwitchListTile(
                    value: _assignToGroup,
                    onChanged: (value) => setState(() {
                      _assignToGroup = value;
                      _selectedStudentIds.clear();
                    }),
                    title: const Text('إسناد المهمة للمجموعة كلها'),
                    subtitle: const Text(
                      'ستظهر المهمة للطلاب الذين ينضمون للمجموعة لاحقًا.',
                    ),
                    activeThumbColor: AppTheme.primaryBurgundy,
                  ),
                ),
                if (!_assignToGroup) ...[
                  const SizedBox(height: 16),
                  Text(
                    'الطلاب (${_selectedStudentIds.length}/200)',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  if (_loadingStudents)
                    const Center(child: CircularProgressIndicator())
                  else if (_studentsError != null)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.cloud_off_outlined),
                        title: Text(_studentsError!),
                        trailing: IconButton(
                          tooltip: 'إعادة المحاولة',
                          onPressed: _loadStudents,
                          icon: const Icon(Icons.refresh),
                        ),
                      ),
                    )
                  else if (_students.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('لا يوجد طلاب ضمن المجموعة.'),
                      ),
                    )
                  else ...[
                    TextField(
                      controller: _studentSearchController,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'ابحث عن طالب',
                        prefixIcon: Icon(Icons.search),
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (visibleStudents.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(12),
                        child: Text('لا توجد نتائج مطابقة.'),
                      )
                    else
                      ...visibleStudents.map((student) {
                        final id = student.id;
                        final selected = _selectedStudentIds.contains(id);
                        final canSelect =
                            selected || _selectedStudentIds.length < 200;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 4),
                          child: CheckboxListTile(
                            value: selected,
                            onChanged: canSelect && id.isNotEmpty
                                ? (value) => _toggleStudent(id, value == true)
                                : null,
                            title: Text(
                              student.fullNameArabic.isNotEmpty
                                  ? student.fullNameArabic
                                  : student.name,
                            ),
                            controlAffinity: ListTileControlAffinity.leading,
                            activeColor: AppTheme.primaryBurgundy,
                          ),
                        );
                      }),
                  ],
                ],
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed:
                      _saving ||
                          (!_assignToGroup &&
                              (_selectedStudentIds.isEmpty || _loadingStudents))
                      ? null
                      : _submit,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check),
                  label: Text(
                    _saving
                        ? 'جارٍ الإسناد...'
                        : _assignToGroup
                        ? 'إسناد للمجموعة كلها'
                        : 'إسناد المهمة (${_selectedStudentIds.length})',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _studentSearchController.dispose();
    super.dispose();
  }
}
