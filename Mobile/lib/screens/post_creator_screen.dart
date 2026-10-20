import 'dart:typed_data';

import 'package:material_ui/material_ui.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';

import '../models/ministry_post_model.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/grade_scope_fields.dart';

class PostCreatorScreen extends StatefulWidget {
  final String? initialType;
  final MinistryPostModel? postToEdit;

  const PostCreatorScreen({super.key, this.initialType, this.postToEdit});

  @override
  State<PostCreatorScreen> createState() => _PostCreatorScreenState();
}

class _PostCreatorScreenState extends State<PostCreatorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();
  final _mediaUrlController = TextEditingController();
  final _eventAtController = TextEditingController();
  final _feeController = TextEditingController();

  String _type = 'newsletter';
  String _mediaKind = 'image';
  String _imageSource = 'link';
  XFile? _pickedImage;
  Uint8List? _pickedImageBytes;
  PlatformFile? _pickedAttachment;
  String? _pickedAttachmentName;
  DateTime? _eventAt;
  String _liturgyType = 'permanent';
  String _liturgyDay = 'saturday';
  DateTime? _liturgyDate;
  TimeOfDay? _liturgyStartTime;
  TimeOfDay? _liturgyEndTime;
  String _audienceGrade = '';
  String _audienceMeetingGroup = '';
  String _originalAudienceGrade = '';
  String _originalAudienceMeetingGroup = '';
  String _originalAudienceMode = '';
  bool _audienceReviewed = false;
  bool _isLoading = false;
  bool _assignToGroup = true;
  bool _published = true;
  final Set<String> _selectedStudents = {};
  final List<UserModel> _students = [];
  String _studentQuery = '';

  bool get _isGallery => _type == 'gallery';
  bool get _isLiturgy => _type == 'liturgy';
  bool get _isTrip => _type == 'trip';
  bool get _isEditing => widget.postToEdit != null;

  Future<void> _pickGalleryImage() async {
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 84,
      );
      if (image == null || !mounted) return;
      final bytes = await image.readAsBytes();
      if (!mounted) return;
      setState(() {
        _pickedImage = image;
        _pickedImageBytes = bytes;
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('تعذر اختيار الصورة: $error')));
    }
  }

  @override
  void initState() {
    super.initState();
    final post = widget.postToEdit;
    if (post != null) {
      _type = post.type;
      _titleController.text = post.title;
      _bodyController.text = post.body;
      _mediaUrlController.text = post.mediaUrl;
      _mediaKind = post.mediaKind;
      _feeController.text = post.feeAmount.toStringAsFixed(2);
      _eventAt = DateTime.tryParse(post.eventAt)?.toLocal();
      if (_isLiturgy) {
        _liturgyDay = post.dayOfWeek.isEmpty ? 'saturday' : post.dayOfWeek;
        _liturgyType = post.liturgyType.isNotEmpty
            ? post.liturgyType
            : post.eventAt.isNotEmpty
            ? 'temporary'
            : 'permanent';
        final scheduleStart = DateTime.tryParse(
          post.startAt.isNotEmpty ? post.startAt : post.eventAt,
        )?.toLocal();
        final scheduleEnd = DateTime.tryParse(post.endAt)?.toLocal();
        _liturgyDate = scheduleStart == null
            ? null
            : DateTime(
                scheduleStart.year,
                scheduleStart.month,
                scheduleStart.day,
              );
        _liturgyStartTime =
            _parseClockTime(post.startTime) ??
            (scheduleStart == null
                ? null
                : TimeOfDay.fromDateTime(scheduleStart));
        _liturgyEndTime =
            _parseClockTime(post.endTime) ??
            (scheduleEnd == null ? null : TimeOfDay.fromDateTime(scheduleEnd));
      }
      _audienceGrade = post.grade;
      _audienceMeetingGroup = post.meetingGroup;
      _originalAudienceGrade = post.grade;
      _originalAudienceMeetingGroup = post.meetingGroup;
      _originalAudienceMode = post.audienceMode;
      _assignToGroup = post.assignToGroup;
      _published = post.published;
      _selectedStudents.addAll(post.assignedStudents);
      if (_eventAt != null) {
        final date = _eventAt!;
        _eventAtController.text =
            '${date.year}-${_twoDigits(date.month)}-${_twoDigits(date.day)} ${_twoDigits(date.hour)}:${_twoDigits(date.minute)}';
      }
    } else if (widget.initialType != null) {
      _type = widget.initialType!;
    }
    if (_isLiturgy && !_isEditing) _mediaKind = 'link';
    if (_isTrip) _loadStudents();
  }

  Future<void> _loadStudents() async {
    try {
      final students = await ApiService.getUsers(role: 'student');
      if (mounted) setState(() => _students.addAll(students));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر تحميل قائمة الطلاب: $error')),
      );
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    _mediaUrlController.dispose();
    _eventAtController.dispose();
    _feeController.dispose();
    super.dispose();
  }

  String _twoDigits(int value) => value.toString().padLeft(2, '0');

  TimeOfDay? _parseClockTime(String value) {
    final match = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(value);
    if (match == null) return null;
    final hour = int.tryParse(match.group(1)!);
    final minute = int.tryParse(match.group(2)!);
    if (hour == null || minute == null || hour > 23 || minute > 59) return null;
    return TimeOfDay(hour: hour, minute: minute);
  }

  String _clockValue(TimeOfDay? value) => value == null
      ? ''
      : '${_twoDigits(value.hour)}:${_twoDigits(value.minute)}';

  String _dateValue(DateTime? value) => value == null
      ? ''
      : '${value.year}-${_twoDigits(value.month)}-${_twoDigits(value.day)}';

  Future<void> _pickLiturgyDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final current = _liturgyDate ?? today;
    final selected = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: current.isBefore(today) ? DateTime(current.year, 1, 1) : today,
      lastDate: DateTime(now.year + 3),
      helpText: 'اختر تاريخ القداس المؤقت',
    );
    if (selected != null && mounted) {
      setState(
        () => _liturgyDate = DateTime(
          selected.year,
          selected.month,
          selected.day,
        ),
      );
    }
  }

  Future<void> _pickLiturgyTime({required bool start}) async {
    final value = start ? _liturgyStartTime : _liturgyEndTime;
    final selected = await showTimePicker(
      context: context,
      initialTime: value ?? const TimeOfDay(hour: 9, minute: 0),
      helpText: start ? 'اختر وقت البدء' : 'اختر وقت الانتهاء',
    );
    if (selected != null && mounted) {
      setState(() {
        if (start) {
          _liturgyStartTime = selected;
        } else {
          _liturgyEndTime = selected;
        }
      });
    }
  }

  Future<void> _pickAttachment() async {
    try {
      final file = await FilePicker.pickFile(
        dialogTitle: 'اختر صورة أو ملف PDF',
        type: FileType.custom,
        allowedExtensions: const ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'gif'],
      );
      if (file == null || !mounted) return;
      // Read the selected file bytes directly. On Flutter Web `uri` may be a
      // browser-local blob URL; that URL is only a picker handle and is never
      // sent or saved as the post's media URL.
      final fileLength = await file.length();
      if (fileLength == null || fileLength <= 0) {
        throw Exception('Choose a non-empty file.');
      }
      if (!mounted) return;
      setState(() {
        _pickedAttachment = file;
        _pickedAttachmentName = file.name;
        _mediaKind = file.extension?.toLowerCase() == 'pdf' ? 'pdf' : 'image';
        _mediaUrlController.clear();
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    }
  }

  Future<void> _pickEventAt() async {
    final now = DateTime.now();
    final current = _eventAt ?? now;
    final today = DateTime(now.year, now.month, now.day);
    final firstSelectableDate = current.isBefore(today)
        ? DateTime(current.year, 1, 1)
        : today;
    final date = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: firstSelectableDate,
      lastDate: DateTime(now.year + 3),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(current),
    );
    if (time == null || !mounted) return;
    final selected = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      _eventAt = selected;
      _eventAtController.text =
          '${selected.year}-${_twoDigits(selected.month)}-${_twoDigits(selected.day)} ${_twoDigits(selected.hour)}:${_twoDigits(selected.minute)}';
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isLiturgy) {
      final startTime = _clockValue(_liturgyStartTime);
      final endTime = _clockValue(_liturgyEndTime);
      if (startTime.isEmpty || endTime.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('أكمل وقت البدء والانتهاء.')),
        );
        return;
      }
      if (_liturgyType == 'permanent' && endTime.compareTo(startTime) <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('يجب أن يكون وقت الانتهاء بعد وقت البدء.'),
          ),
        );
        return;
      }
      if (_liturgyType == 'temporary' && _liturgyDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('حدد تاريخ القداس المؤقت.')),
        );
        return;
      }
      if (_liturgyType == 'temporary') {
        final start = DateTime(
          _liturgyDate!.year,
          _liturgyDate!.month,
          _liturgyDate!.day,
          _liturgyStartTime!.hour,
          _liturgyStartTime!.minute,
        );
        final end = DateTime(
          _liturgyDate!.year,
          _liturgyDate!.month,
          _liturgyDate!.day,
          _liturgyEndTime!.hour,
          _liturgyEndTime!.minute,
        );
        if (!end.isAfter(start)) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'يجب أن يكون وقت الانتهاء بعد وقت البدء في اليوم نفسه.',
              ),
            ),
          );
          return;
        }
      }
    }
    if (_isTrip && !_assignToGroup && _selectedStudents.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختر طالبًا واحدًا على الأقل للرحلة.')),
      );
      return;
    }
    if (_isEditing && _originalAudienceMode.isEmpty && !_audienceReviewed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('راجع نطاق المرحلة والاجتماع ثم أكد النطاق قبل الحفظ.'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    final postData = <String, dynamic>{
      'type': _type,
      'title': _titleController.text.trim(),
      'body': _bodyController.text.trim(),
      'mediaUrl': _mediaUrlController.text.trim(),
      'mediaKind': _mediaKind,
      'published': _published,
      if (_isTrip && (_eventAt != null || _isEditing))
        'eventAt': _eventAt?.toUtc().toIso8601String(),
      if (_isLiturgy) 'liturgyType': _liturgyType,
      if (_isLiturgy && _liturgyType == 'permanent') ...{
        'dayOfWeek': _liturgyDay,
        'startTime': _clockValue(_liturgyStartTime),
        'endTime': _clockValue(_liturgyEndTime),
      },
      if (_isLiturgy && _liturgyType == 'temporary') ...{
        'startAt': DateTime(
          _liturgyDate!.year,
          _liturgyDate!.month,
          _liturgyDate!.day,
          _liturgyStartTime!.hour,
          _liturgyStartTime!.minute,
        ).toUtc().toIso8601String(),
        'endAt': DateTime(
          _liturgyDate!.year,
          _liturgyDate!.month,
          _liturgyDate!.day,
          _liturgyEndTime!.hour,
          _liturgyEndTime!.minute,
        ).toUtc().toIso8601String(),
        'autoDeleteAt': DateTime(
          _liturgyDate!.year,
          _liturgyDate!.month,
          _liturgyDate!.day,
          _liturgyEndTime!.hour,
          _liturgyEndTime!.minute,
        ).toUtc().toIso8601String(),
        'eventAt': DateTime(
          _liturgyDate!.year,
          _liturgyDate!.month,
          _liturgyDate!.day,
          _liturgyStartTime!.hour,
          _liturgyStartTime!.minute,
        ).toUtc().toIso8601String(),
      },
      if (!_isEditing ||
          _audienceGrade != _originalAudienceGrade ||
          _audienceMeetingGroup != _originalAudienceMeetingGroup ||
          (_originalAudienceMode.isEmpty && _audienceReviewed)) ...{
        'grade': _audienceGrade,
        'meetingGroup': _audienceMeetingGroup,
      },
      if (_isTrip)
        'feeAmount': double.tryParse(_feeController.text.trim()) ?? 0,
      if (_isTrip) 'assignToGroup': _assignToGroup,
      if (_isTrip)
        'studentIds': _assignToGroup ? <String>[] : _selectedStudents.toList(),
    };

    var routeClosed = false;
    try {
      if (_isGallery && _imageSource == 'file') {
        if (_pickedImage == null || _pickedImageBytes == null) {
          throw Exception('اختر صورة من الجهاز أولاً.');
        }
        postData['mediaUrl'] = await ApiService.uploadImage(
          bytes: _pickedImageBytes!,
          filename: _pickedImage!.name.replaceAll(RegExp(r'\.[^.]+$'), ''),
        );
      }
      if (!_isGallery && _pickedAttachment != null) {
        final attachment = _pickedAttachment!;
        final attachmentLength = await attachment.length();
        if (attachmentLength == null || attachmentLength <= 0) {
          throw Exception('Choose a non-empty file.');
        }
        postData['mediaUrl'] = await ApiService.uploadMediaStream(
          bytes: attachment.readAsByteStream(),
          contentLength: attachmentLength,
          filename: _pickedAttachmentName ?? attachment.name,
        );
      }
      final success = _isEditing
          ? await ApiService.updatePost(widget.postToEdit!.id, postData)
          : await ApiService.createPost(postData);
      if (success && mounted) {
        routeClosed = true;
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isEditing ? 'تم تحديث الموعد بنجاح.' : 'تم النشر بنجاح.',
            ),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تعذر النشر: ${error.toString()}')),
        );
      }
    } finally {
      if (mounted && !routeClosed) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenTitle = _isGallery
        ? 'إضافة صورة إلى المعرض'
        : _isLiturgy
        ? _isEditing
              ? 'تعديل موعد قداس'
              : 'إضافة موعد قداس'
        : _isTrip
        ? _isEditing
              ? 'تعديل رحلة'
              : 'إضافة رحلة'
        : 'إضافة إعلان أو درس';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: Text(screenTitle)),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'نطاق ظهور المحتوى',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 10),
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
                        if (_isEditing && _originalAudienceMode.isEmpty) ...[
                          const SizedBox(height: 8),
                          CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            value: _audienceReviewed,
                            onChanged: (value) => setState(
                              () => _audienceReviewed = value == true,
                            ),
                            title: const Text('راجعت النطاق وأؤكد حفظه'),
                            subtitle: const Text(
                              'هذا محتوى قديم بلا مرحلة محفوظة، وهو مخفي عن الطلاب حتى تحديد نطاقه.',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (widget.initialType == null) ...[
                  DropdownButtonFormField<String>(
                    initialValue: _type,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'نوع المحتوى',
                      prefixIcon: Icon(
                        Icons.category,
                        color: AppTheme.primaryBurgundy,
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'newsletter',
                        child: Text('إعلان أو نشرة'),
                      ),
                      DropdownMenuItem(
                        value: 'sunday_lesson',
                        child: Text('درس مدارس الأحد'),
                      ),
                    ],
                    onChanged: (value) =>
                        setState(() => _type = value ?? 'newsletter'),
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: _titleController,
                  maxLength: 200,
                  decoration: InputDecoration(
                    labelText: _isGallery
                        ? 'عنوان الصورة *'
                        : _isLiturgy
                        ? 'اسم القداس *'
                        : 'العنوان الرئيس *',
                    prefixIcon: const Icon(
                      Icons.title,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'يرجى كتابة العنوان.'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _bodyController,
                  maxLength: 20000,
                  maxLines: 5,
                  decoration: InputDecoration(
                    labelText: _isGallery
                        ? 'وصف الصورة (اختياري)'
                        : _isLiturgy
                        ? 'تفاصيل الموعد (اختياري)'
                        : 'التفاصيل والمحتوى *',
                    alignLabelWithHint: true,
                    prefixIcon: const Icon(
                      Icons.article_outlined,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (value) =>
                      !_isGallery &&
                          !_isLiturgy &&
                          (value == null || value.trim().isEmpty)
                      ? 'يرجى كتابة المحتوى.'
                      : null,
                ),
                if (_isLiturgy) ...[
                  DropdownButtonFormField<String>(
                    initialValue: _liturgyType,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'نوع القداس'),
                    items: const [
                      DropdownMenuItem(value: 'permanent', child: Text('دائم')),
                      DropdownMenuItem(value: 'temporary', child: Text('مؤقت')),
                    ],
                    onChanged: (value) => setState(() {
                      _liturgyType = value ?? 'permanent';
                    }),
                  ),
                  const SizedBox(height: 12),
                  if (_liturgyType == 'temporary') ...[
                    InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'تاريخ القداس المؤقت',
                        prefixIcon: Icon(Icons.calendar_month_outlined),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _dateValue(_liturgyDate).isEmpty
                                  ? 'لم يُحدد التاريخ'
                                  : _dateValue(_liturgyDate),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _pickLiturgyDate,
                            icon: const Icon(Icons.edit_calendar_outlined),
                            label: Text(
                              _liturgyDate == null ? 'اختيار' : 'تغيير',
                            ),
                          ),
                          if (_liturgyDate != null)
                            IconButton(
                              tooltip: 'مسح التاريخ',
                              onPressed: () =>
                                  setState(() => _liturgyDate = null),
                              icon: const Icon(Icons.close),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_liturgyType == 'permanent') ...[
                    DropdownButtonFormField<String>(
                      key: ValueKey('liturgy-day-$_liturgyDay'),
                      initialValue: _liturgyDay,
                      decoration: const InputDecoration(
                        labelText: 'يوم تشغيل القداس الدائم',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'saturday',
                          child: Text('السبت'),
                        ),
                        DropdownMenuItem(value: 'sunday', child: Text('الأحد')),
                        DropdownMenuItem(
                          value: 'monday',
                          child: Text('الإثنين'),
                        ),
                        DropdownMenuItem(
                          value: 'tuesday',
                          child: Text('الثلاثاء'),
                        ),
                        DropdownMenuItem(
                          value: 'wednesday',
                          child: Text('الأربعاء'),
                        ),
                        DropdownMenuItem(
                          value: 'thursday',
                          child: Text('الخميس'),
                        ),
                        DropdownMenuItem(
                          value: 'friday',
                          child: Text('الجمعة'),
                        ),
                      ],
                      onChanged: (value) =>
                          setState(() => _liturgyDay = value ?? 'saturday'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'وقت البدء',
                          ),
                          child: TextButton.icon(
                            onPressed: () => _pickLiturgyTime(start: true),
                            icon: const Icon(Icons.schedule),
                            label: Text(
                              _clockValue(_liturgyStartTime).isEmpty
                                  ? 'اختر الوقت'
                                  : _clockValue(_liturgyStartTime),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'وقت الانتهاء',
                          ),
                          child: TextButton.icon(
                            onPressed: () => _pickLiturgyTime(start: false),
                            icon: const Icon(Icons.schedule),
                            label: Text(
                              _clockValue(_liturgyEndTime).isEmpty
                                  ? 'اختر الوقت'
                                  : _clockValue(_liturgyEndTime),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'جميع الأوقات بتوقيت القاهرة. القداس الدائم يُحفظ بوقتَي البدء والانتهاء فقط، والقداس المؤقت يختفي تلقائياً بعد انتهائه.',
                      style: TextStyle(fontSize: 12, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                if (_isTrip) ...[
                  TextFormField(
                    controller: _eventAtController,
                    readOnly: true,
                    onTap: _pickEventAt,
                    decoration: InputDecoration(
                      labelText: 'موعد الرحلة',
                      prefixIcon: Icon(
                        Icons.calendar_month,
                        color: AppTheme.primaryBurgundy,
                      ),
                      hintText: 'اختر التاريخ والوقت',
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                if (_isTrip) ...[
                  TextFormField(
                    controller: _feeController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'رسوم الرحلة لكل طالب',
                      prefixIcon: Icon(Icons.payments_outlined),
                    ),
                    validator: (value) {
                      final fee = double.tryParse(value?.trim() ?? '0');
                      return fee == null ||
                              !fee.isFinite ||
                              fee < 0 ||
                              fee > 1000000
                          ? 'أدخل رسوماً صحيحة.'
                          : null;
                    },
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('إتاحة الرحلة لجميع الطلاب'),
                    subtitle: const Text(
                      'أوقف الخيار لتحديد الطلاب المسموح لهم بالتسجيل.',
                    ),
                    value: _assignToGroup,
                    onChanged: (value) => setState(() {
                      _assignToGroup = value;
                      if (value) _selectedStudents.clear();
                    }),
                  ),
                  if (!_assignToGroup) ...[
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'ابحث باسم الطالب',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (value) =>
                          setState(() => _studentQuery = value),
                    ),
                    const SizedBox(height: 8),
                    Text('الطلاب المحددون: ${_selectedStudents.length}/200'),
                    const SizedBox(height: 6),
                    if (_students.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(12),
                        child: Text('جارٍ تحميل الطلاب...'),
                      )
                    else
                      Container(
                        constraints: const BoxConstraints(maxHeight: 240),
                        decoration: BoxDecoration(
                          border: Border.all(color: AppTheme.lightGold),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ListView(
                          shrinkWrap: true,
                          children: _students
                              .where(
                                (student) =>
                                    student.name.toLowerCase().contains(
                                      _studentQuery.trim().toLowerCase(),
                                    ),
                              )
                              .map((student) {
                                final selected = _selectedStudents.contains(
                                  student.id,
                                );
                                return CheckboxListTile(
                                  dense: true,
                                  value: selected,
                                  title: Text(student.name),
                                  subtitle: student.phone.isEmpty
                                      ? null
                                      : Text(student.phone),
                                  onChanged:
                                      !selected &&
                                          _selectedStudents.length >= 200
                                      ? null
                                      : (value) => setState(() {
                                          if (value == true) {
                                            _selectedStudents.add(student.id);
                                          } else {
                                            _selectedStudents.remove(
                                              student.id,
                                            );
                                          }
                                        }),
                                );
                              })
                              .toList(),
                        ),
                      ),
                    const SizedBox(height: 12),
                  ],
                  if (_isEditing)
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('نشر الرحلة وإتاحتها للتسجيل'),
                      value: _published,
                      onChanged: (value) => setState(() => _published = value),
                    ),
                ],
                if (_isGallery) ...[
                  const Text(
                    'طريقة إضافة الصورة',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('من الجهاز'),
                        selected: _imageSource == 'file',
                        onSelected: (_) =>
                            setState(() => _imageSource = 'file'),
                      ),
                      ChoiceChip(
                        label: const Text('من رابط'),
                        selected: _imageSource == 'link',
                        onSelected: (_) =>
                            setState(() => _imageSource = 'link'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_imageSource == 'file') ...[
                    OutlinedButton.icon(
                      onPressed: _pickGalleryImage,
                      icon: const Icon(Icons.add_photo_alternate_outlined),
                      label: Text(
                        _pickedImage?.name ?? 'اختيار صورة من الجهاز',
                      ),
                    ),
                    if (_pickedImageBytes != null) ...[
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.memory(
                          _pickedImageBytes!,
                          height: 180,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                  ],
                ],
                if ((_isGallery && _imageSource == 'link') ||
                    (!_isGallery && !_isLiturgy)) ...[
                  if (!_isGallery) ...[
                    OutlinedButton.icon(
                      onPressed: _pickAttachment,
                      icon: const Icon(Icons.attach_file),
                      label: Text(
                        _pickedAttachmentName ??
                            'اختيار صورة أو PDF من الجهاز (حتى 5 ميجابايت)',
                      ),
                    ),
                    if (_pickedAttachmentName != null)
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: TextButton.icon(
                          onPressed: () => setState(() {
                            _pickedAttachmentName = null;
                            _pickedAttachment = null;
                          }),
                          icon: const Icon(Icons.close, size: 16),
                          label: const Text('إزالة الملف المختار'),
                        ),
                      ),
                  ],
                  TextFormField(
                    controller: _mediaUrlController,
                    onChanged: (value) {
                      if (_isGallery) {
                        setState(() {});
                      } else if (value.isNotEmpty &&
                          _pickedAttachment != null) {
                        setState(() {
                          _pickedAttachmentName = null;
                          _pickedAttachment = null;
                        });
                      }
                    },
                    keyboardType: TextInputType.url,
                    decoration: InputDecoration(
                      labelText: _isGallery
                          ? 'رابط الصورة HTTPS *'
                          : 'رابط HTTPS للمرفق (اختياري)',
                      helperText: null,
                      prefixIcon: const Icon(
                        Icons.image_outlined,
                        color: AppTheme.primaryBurgundy,
                      ),
                    ),
                    validator: (value) {
                      final url = value?.trim() ?? '';
                      if (url.isEmpty && !_isGallery) return null;
                      final uri = Uri.tryParse(url);
                      return uri == null ||
                              uri.scheme != 'https' ||
                              uri.host.isEmpty
                          ? 'استخدم رابط HTTPS صالحاً.'
                          : null;
                    },
                  ),
                  if (!_isGallery) ...[
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _mediaKind,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'نوع المرفق',
                      ),
                      items: const [
                        DropdownMenuItem(value: 'image', child: Text('صورة')),
                        DropdownMenuItem(value: 'pdf', child: Text('ملف PDF')),
                        DropdownMenuItem(
                          value: 'link',
                          child: Text('رابط آخر'),
                        ),
                      ],
                      onChanged: (value) =>
                          setState(() => _mediaKind = value ?? 'image'),
                    ),
                  ],
                  if (_isGallery &&
                      _imageSource == 'link' &&
                      _mediaUrlController.text.startsWith('https://')) ...[
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        _mediaUrlController.text,
                        height: 180,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  ],
                ],
                const SizedBox(height: 24),
                _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton.icon(
                        onPressed: _submit,
                        icon: const Icon(Icons.publish),
                        label: Text(
                          _isEditing
                              ? 'حفظ التعديلات'
                              : _isGallery
                              ? 'نشر الصورة في المعرض'
                              : _isLiturgy
                              ? 'نشر موعد القداس'
                              : 'نشر المحتوى',
                        ),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
