import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/grade_scope_fields.dart';

class QuizCreatorScreen extends StatefulWidget {
  const QuizCreatorScreen({super.key});

  @override
  State<QuizCreatorScreen> createState() => _QuizCreatorScreenState();
}

class _QuizCreatorScreenState extends State<QuizCreatorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();

  final List<Map<String, dynamic>> _questions = [
    {
      'questionText': TextEditingController(),
      'opt0': TextEditingController(),
      'opt1': TextEditingController(),
      'opt2': TextEditingController(),
      'opt3': TextEditingController(),
      'correct': 0,
    },
  ];

  bool _isLoading = false;
  String _audienceGrade = '';
  String _audienceMeetingGroup = '';

  void _addQuestion() {
    setState(() {
      _questions.add({
        'questionText': TextEditingController(),
        'opt0': TextEditingController(),
        'opt1': TextEditingController(),
        'opt2': TextEditingController(),
        'opt3': TextEditingController(),
        'correct': 0,
      });
    });
  }

  Future<void> _saveQuiz() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final questionsPayload = _questions.map((q) {
      return {
        'questionText': (q['questionText'] as TextEditingController).text
            .trim(),
        'options': [
          (q['opt0'] as TextEditingController).text.trim(),
          (q['opt1'] as TextEditingController).text.trim(),
          (q['opt2'] as TextEditingController).text.trim(),
          (q['opt3'] as TextEditingController).text.trim(),
        ],
        'correctAnswerIndex': q['correct'] ?? 0,
      };
    }).toList();

    final quizData = {
      'title': _titleController.text.trim(),
      'description': _descController.text.trim(),
      'questions': questionsPayload,
      'published': true,
      'grade': _audienceGrade,
      'meetingGroup': _audienceMeetingGroup,
    };

    try {
      final success = await ApiService.createQuiz(quizData);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إنشاء الاختبار بنجاح')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('خطأ: ${e.toString()}')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('إنشاء مسابقة / اختبار جديد (MCQs)')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'نطاق ظهور الاختبار',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
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
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'عنوان الاختبار *',
                    prefixIcon: Icon(
                      Icons.quiz,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'يرجى كتابة العنوان'
                      : null,
                ),
                const SizedBox(height: 12),

                TextFormField(
                  controller: _descController,
                  decoration: const InputDecoration(
                    labelText: 'وصف الاختبار (الأصحاحات المقررة)',
                    prefixIcon: Icon(
                      Icons.description,
                      color: AppTheme.primaryBurgundy,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                ...List.generate(_questions.length, (idx) {
                  final q = _questions[idx];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'السؤال رقم ${idx + 1}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryBurgundy,
                            ),
                          ),
                          const SizedBox(height: 8),

                          TextFormField(
                            controller: q['questionText'],
                            decoration: const InputDecoration(
                              labelText: 'نص السؤال *',
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty ? 'مطلوب' : null,
                          ),
                          const SizedBox(height: 12),

                          TextFormField(
                            controller: q['opt0'],
                            decoration: const InputDecoration(
                              labelText: 'الخيار الأول (أ) *',
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty ? 'مطلوب' : null,
                          ),
                          const SizedBox(height: 8),

                          TextFormField(
                            controller: q['opt1'],
                            decoration: const InputDecoration(
                              labelText: 'الخيار الثاني (ب) *',
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty ? 'مطلوب' : null,
                          ),
                          const SizedBox(height: 8),

                          TextFormField(
                            controller: q['opt2'],
                            decoration: const InputDecoration(
                              labelText: 'الخيار الثالث (ج) *',
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty ? 'مطلوب' : null,
                          ),
                          const SizedBox(height: 8),

                          TextFormField(
                            controller: q['opt3'],
                            decoration: const InputDecoration(
                              labelText: 'الخيار الرابع (د) *',
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty ? 'مطلوب' : null,
                          ),
                          const SizedBox(height: 12),

                          DropdownButtonFormField<int>(
                            initialValue: q['correct'],
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'حدد الاختيار الصحيح *',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 0,
                                child: Text('الخيار الأول (أ) هو الصحيح'),
                              ),
                              DropdownMenuItem(
                                value: 1,
                                child: Text('الخيار الثاني (ب) هو الصحيح'),
                              ),
                              DropdownMenuItem(
                                value: 2,
                                child: Text('الخيار الثالث (ج) هو الصحيح'),
                              ),
                              DropdownMenuItem(
                                value: 3,
                                child: Text('الخيار الرابع (د) هو الصحيح'),
                              ),
                            ],
                            onChanged: (val) =>
                                setState(() => q['correct'] = val ?? 0),
                          ),
                        ],
                      ),
                    ),
                  );
                }),

                OutlinedButton.icon(
                  onPressed: _addQuestion,
                  icon: const Icon(Icons.add),
                  label: const Text('إضافة سؤال آخر للاختبار'),
                ),
                const SizedBox(height: 24),

                _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton.icon(
                        onPressed: _saveQuiz,
                        icon: const Icon(Icons.save),
                        label: const Text('حفظ ونشر الاختبار للطلاب'),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
