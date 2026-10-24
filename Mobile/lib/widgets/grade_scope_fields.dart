import 'package:material_ui/material_ui.dart';

import '../models/user_model.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';

class GradeScopeFields extends StatefulWidget {
  final UserModel? user;
  final String grade;
  final String meetingGroup;
  final void Function(String key, String value) onChanged;

  const GradeScopeFields({
    super.key,
    required this.user,
    required this.grade,
    required this.meetingGroup,
    required this.onChanged,
  });

  @override
  State<GradeScopeFields> createState() => _GradeScopeFieldsState();
}

class _GradeScopeFieldsState extends State<GradeScopeFields> {
  static const _grades = <({String id, String label})>[
    (id: 'primary_1_3', label: 'المرحلة الابتدائية الأولى'),
    (id: 'primary_4_6', label: 'المرحلة الابتدائية الثانية'),
    (id: 'preparatory', label: 'المرحلة الإعدادية'),
    (id: 'secondary', label: 'المرحلة الثانوية'),
    (id: 'university', label: 'المرحلة الجامعية'),
    (id: 'expatriates', label: 'مرحلة المغتربين'),
  ];

  List<Map<String, dynamic>> _groups = [];
  bool _loading = false;
  String? _error;
  int _loadVersion = 0;

  bool get _isGlobalAdmin => widget.user?.role == 'admin';
  bool get _isStageAdmin => isGradeAdminRole(widget.user?.role);
  String get _selectedGrade =>
      _isStageAdmin ? (widget.user?.grade ?? '') : widget.grade;

  String _gradeLabel(String grade) {
    for (final item in _grades) {
      if (item.id == grade) return item.label;
    }
    return 'مرحلتك';
  }

  String _assignedGroupLabel() {
    final assignedId = widget.user?.meetingGroup ?? '';
    for (final group in _groups) {
      if (group['id']?.toString() == assignedId) {
        return group['name']?.toString() ?? 'اجتماعك المعيّن';
      }
    }
    return 'اجتماعك المعيّن';
  }

  @override
  void initState() {
    super.initState();
    _loadGroups();
  }

  @override
  void didUpdateWidget(covariant GradeScopeFields oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.grade != widget.grade ||
        oldWidget.user?.grade != widget.user?.grade ||
        oldWidget.user?.meetingGroup != widget.user?.meetingGroup ||
        oldWidget.user?.role != widget.user?.role) {
      _loadGroups();
    }
  }

  Future<void> _loadGroups() async {
    final version = ++_loadVersion;
    final grade = _selectedGrade;
    if (grade.isEmpty) {
      if (mounted) {
        setState(() {
          _groups = [];
          _error = null;
          _loading = false;
        });
      }
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      var groups = await ApiService.getMeetingGroups(grade);
      final assignedGroup = widget.user?.meetingGroup ?? '';
      if (_isStageAdmin && assignedGroup.isNotEmpty) {
        groups = groups.where((group) => group['id'] == assignedGroup).toList();
      }
      if (mounted && version == _loadVersion) setState(() => _groups = groups);
    } catch (error) {
      if (mounted && version == _loadVersion) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted && version == _loadVersion) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedGrade = _selectedGrade;
    final selectedGroupExists = _groups.any(
      (group) => group['id']?.toString() == widget.meetingGroup,
    );
    final groupValue = selectedGroupExists || widget.meetingGroup.isNotEmpty
        ? widget.meetingGroup
        : '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_isGlobalAdmin)
          DropdownButtonFormField<String>(
            key: ValueKey('audience-grade-${widget.grade}'),
            initialValue: _grades.any((item) => item.id == widget.grade)
                ? widget.grade
                : '',
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'المرحلة المستهدفة'),
            items: [
              const DropdownMenuItem(
                value: '',
                child: Text('كل المراحل (محتوى عام)'),
              ),
              ..._grades.map(
                (item) =>
                    DropdownMenuItem(value: item.id, child: Text(item.label)),
              ),
            ],
            onChanged: (value) {
              widget.onChanged('grade', value ?? '');
              if ((value ?? '') != widget.grade) {
                widget.onChanged('meetingGroup', '');
              }
            },
          )
        else
          InputDecorator(
            decoration: const InputDecoration(labelText: 'المرحلة'),
            child: Text(_gradeLabel(selectedGrade)),
          ),
        if (selectedGrade.isNotEmpty) ...[
          const SizedBox(height: 12),
          if (_isStageAdmin && (widget.user?.meetingGroup.isNotEmpty ?? false))
            InputDecorator(
              decoration: const InputDecoration(labelText: 'الاجتماع المعيّن'),
              child: Text(_assignedGroupLabel()),
            )
          else
            DropdownButtonFormField<String>(
              key: ValueKey(
                'audience-group-$selectedGrade-${widget.meetingGroup}-${_groups.length}',
              ),
              initialValue: groupValue,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'الاجتماع'),
              items: [
                const DropdownMenuItem(
                  value: '',
                  child: Text('كل اجتماعات المرحلة'),
                ),
                if (widget.meetingGroup.isNotEmpty && !selectedGroupExists)
                  DropdownMenuItem(
                    value: widget.meetingGroup,
                    child: const Text('الاجتماع المحفوظ غير متاح'),
                  ),
                ..._groups.map(
                  (group) => DropdownMenuItem(
                    value: group['id']?.toString() ?? '',
                    child: Text(group['name']?.toString() ?? ''),
                  ),
                ),
              ],
              onChanged: _loading
                  ? null
                  : (value) => widget.onChanged('meetingGroup', value ?? ''),
            ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'جارٍ تحميل الاجتماعات...',
                style: TextStyle(fontSize: 12),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _error!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontSize: 12,
                ),
              ),
            ),
          if (!_loading && _error == null && _groups.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'لم تُضف اجتماعات فرعية لهذه المرحلة بعد.',
                style: TextStyle(fontSize: 12),
              ),
            ),
        ],
      ],
    );
  }
}
