import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../models/quiz_model.dart';
import '../theme/app_theme.dart';

class QuizSolverScreen extends StatefulWidget {
  final QuizModel quiz;

  const QuizSolverScreen({super.key, required this.quiz});

  @override
  State<QuizSolverScreen> createState() => _QuizSolverScreenState();
}

class _QuizSolverScreenState extends State<QuizSolverScreen> {
  final Map<int, int> _selectedAnswers = {};
  bool _isSubmitting = false;

  Future<void> _submitQuiz() async {
    if (_selectedAnswers.length < widget.quiz.questions.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('يرجى الإجابة على جميع الأسئلة قبل التسليم'),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    List<int> answersList = [];
    for (int i = 0; i < widget.quiz.questions.length; i++) {
      answersList.add(_selectedAnswers[i] ?? 0);
    }

    var routeClosed = false;
    try {
      final res = await ApiService.submitQuizAttempt(
        widget.quiz.id,
        answersList,
      );
      final score = res['score'] ?? 0;
      final total = res['total'] ?? widget.quiz.questions.length;

      if (!mounted) return;

      final shouldReturn = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            scrollable: true,
            title: const Text('نتيجة الاختبار', textAlign: TextAlign.center),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.stars, size: 64, color: AppTheme.accentGold),
                const SizedBox(height: 12),
                Text(
                  'حصلت على: $score من $total',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryBurgundy,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'ممتاز! ربنا يبارك حياتك وتنمو دائماً في كلمة الله.',
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('موافق والعودة'),
              ),
            ],
          ),
        ),
      );
      if (shouldReturn == true && mounted) {
        routeClosed = true;
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ أثناء تقديم الاختبار: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted && !routeClosed) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: Text(widget.quiz.title)),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ...List.generate(widget.quiz.questions.length, (qIdx) {
                final q = widget.quiz.questions[qIdx];
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'السؤال ${qIdx + 1}: ${q.questionText}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                        const SizedBox(height: 12),
                        RadioGroup<int>(
                          groupValue: _selectedAnswers[qIdx],
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _selectedAnswers[qIdx] = value);
                            }
                          },
                          child: Column(
                            children: List.generate(q.options.length, (oIdx) {
                              return RadioListTile<int>(
                                title: Text(q.options[oIdx]),
                                value: oIdx,
                                activeColor: AppTheme.primaryBurgundy,
                              );
                            }),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 16),

              _isSubmitting
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton.icon(
                      onPressed: _submitQuiz,
                      icon: const Icon(Icons.send),
                      label: const Text('إنهاء وتسليم الاختبار'),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
