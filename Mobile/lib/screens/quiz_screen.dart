import 'package:material_ui/material_ui.dart';
import '../services/api_service.dart';
import '../utils/roles.dart';
import '../services/auth_service.dart';
import '../models/quiz_model.dart';
import '../theme/app_theme.dart';
import '../widgets/grade_scope_fields.dart';
import 'quiz_solver_screen.dart';
import 'quiz_creator_screen.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  List<QuizModel> _quizzes = [];
  List<QuizAttemptModel> _myAttempts = [];
  Map<String, List<QuizResultModel>> _adminResults = {};
  Map<String, Map<String, String>> _quizAudiences = {};
  String? _savingAudienceId;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    final user = AuthService.currentUser;
    if (user?.role != 'student' && !isAdminRole(user?.role)) {
      if (mounted) {
        setState(() {
          _quizzes = [];
          _myAttempts = [];
          _adminResults = {};
          _error = null;
          _isLoading = false;
        });
      }
      return;
    }
    setState(() => _isLoading = true);
    final studentId = user?.id ?? '';

    try {
      final quizzes = await ApiService.getQuizzes();
      final attempts = user?.role == 'student'
          ? await ApiService.getStudentQuizAttempts(studentId)
          : <QuizAttemptModel>[];
      final adminResults = <String, List<QuizResultModel>>{};
      if (isAdminRole(user?.role)) {
        await Future.wait(
          quizzes.map((quiz) async {
            adminResults[quiz.id] = await ApiService.getQuizResults(quiz.id);
          }),
        );
      }
      if (mounted) {
        setState(() {
          _quizzes = quizzes;
          _quizAudiences = {
            for (final quiz in quizzes)
              quiz.id: {'grade': quiz.grade, 'meetingGroup': quiz.meetingGroup},
          };
          _myAttempts = attempts;
          _adminResults = adminResults;
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

  Future<void> _saveQuizAudience(QuizModel quiz) async {
    setState(() => _savingAudienceId = quiz.id);
    try {
      await ApiService.updateQuizAudience(
        quiz.id,
        _quizAudiences[quiz.id] ?? const {'grade': '', 'meetingGroup': ''},
      );
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم تحديث مرحلة الاختبار واجتماعه.')),
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
      if (mounted) setState(() => _savingAudienceId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userRole = AuthService.currentUser?.role ?? 'student';
    final isServantOrAdmin = isAdminRole(userRole);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('مسابقات واختبارات كتابية (MCQs)'),
          actions: [
            IconButton(
              tooltip: 'تحديث الاختبارات والنتائج',
              onPressed: _isLoading ? null : _loadData,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        floatingActionButton: isServantOrAdmin
            ? FloatingActionButton.extended(
                onPressed: () async {
                  final res = await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const QuizCreatorScreen(),
                    ),
                  );
                  if (res == true) _loadData();
                },
                backgroundColor: AppTheme.primaryBurgundy,
                foregroundColor: AppTheme.accentGold,
                icon: const Icon(Icons.add),
                label: const Text('إنشاء اختبار جديد'),
              )
            : null,
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : userRole != 'student' && !isAdminRole(userRole)
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'حل الاختبارات متاح لحسابات الطلاب فقط.',
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : RefreshIndicator(
                onRefresh: _loadData,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            _error!,
                            style: const TextStyle(color: Colors.red),
                          ),
                        ),
                      if (_myAttempts.isNotEmpty) ...[
                        const Text(
                          'نتائج ودرجات الاختبارات السابقة:',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryBurgundy,
                          ),
                        ),
                        const SizedBox(height: 10),
                        ..._myAttempts.map(
                          (att) => Card(
                            color: AppTheme.lightGold.withValues(alpha: 0.4),
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: const Icon(
                                Icons.fact_check_outlined,
                                color: AppTheme.accentGold,
                                size: 32,
                              ),
                              title: Text(
                                att.quizTitle,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryBurgundy,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'الدرجة: ${att.score} / ${att.total}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      Text(
                        isServantOrAdmin
                            ? 'الاختبارات ونتائج الطلاب:'
                            : 'الاختبارات المتاحة للحل:',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.deepNavy,
                        ),
                      ),
                      const SizedBox(height: 10),

                      _quizzes.isEmpty
                          ? const Center(
                              child: Text('لا توجد اختبارات متاحة حالياً'),
                            )
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _quizzes.length,
                              itemBuilder: (context, index) {
                                final quiz = _quizzes[index];
                                QuizAttemptModel? previousAttempt;
                                for (final attempt in _myAttempts) {
                                  if (attempt.quizId == quiz.id) {
                                    previousAttempt = attempt;
                                    break;
                                  }
                                }
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          quiz.title,
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryBurgundy,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(quiz.description),
                                        if (isServantOrAdmin) ...[
                                          const SizedBox(height: 12),
                                          if (quiz.audienceMode.isEmpty)
                                            Container(
                                              margin: const EdgeInsets.only(
                                                bottom: 10,
                                              ),
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: Colors.amber.withValues(
                                                  alpha: 0.08,
                                                ),
                                                borderRadius:
                                                    BorderRadius.circular(10),
                                              ),
                                              child: const Text(
                                                'اختبار قديم بلا نطاق مرحلة محفوظ؛ هو مخفي عن الطلاب حتى حفظ نطاقه.',
                                                style: TextStyle(fontSize: 12),
                                              ),
                                            ),
                                          GradeScopeFields(
                                            user: AuthService.currentUser,
                                            grade:
                                                _quizAudiences[quiz
                                                    .id]?['grade'] ??
                                                '',
                                            meetingGroup:
                                                _quizAudiences[quiz
                                                    .id]?['meetingGroup'] ??
                                                '',
                                            onChanged: (key, value) => setState(
                                              () {
                                                final audience =
                                                    Map<String, String>.from(
                                                      _quizAudiences[quiz.id] ??
                                                          const {},
                                                    );
                                                if (key == 'grade') {
                                                  audience['grade'] = value;
                                                  audience['meetingGroup'] = '';
                                                } else {
                                                  audience['meetingGroup'] =
                                                      value;
                                                }
                                                _quizAudiences[quiz.id] =
                                                    audience;
                                              },
                                            ),
                                          ),
                                          Align(
                                            alignment: AlignmentDirectional
                                                .centerStart,
                                            child: OutlinedButton(
                                              onPressed:
                                                  _savingAudienceId == quiz.id
                                                  ? null
                                                  : () =>
                                                        _saveQuizAudience(quiz),
                                              child: Text(
                                                _savingAudienceId == quiz.id
                                                    ? 'جارٍ الحفظ...'
                                                    : 'حفظ نطاق الاختبار',
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 14),
                                          Text(
                                            'نتائج الطلاب (${_adminResults[quiz.id]?.length ?? 0})',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.deepNavy,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          _buildResultsTable(
                                            _adminResults[quiz.id] ?? const [],
                                          ),
                                        ],
                                        if (userRole == 'student') ...[
                                          const SizedBox(height: 8),
                                          Text(
                                            'تنبيه: يُسمح بإرسال هذا الاختبار مرة واحدة فقط.',
                                            style: TextStyle(
                                              color: Colors.orange.shade900,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                        const SizedBox(height: 10),
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.stretch,
                                          children: [
                                            Text(
                                              'عدد الأسئلة: ${quiz.questions.length} أسئلة اختيار من متعدد',
                                            ),
                                            if (userRole == 'student')
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                  top: 10,
                                                ),
                                                child: previousAttempt == null
                                                    ? Align(
                                                        alignment:
                                                            AlignmentDirectional
                                                                .centerStart,
                                                        child: ElevatedButton.icon(
                                                          onPressed: () async {
                                                            final res =
                                                                await Navigator.of(
                                                                  context,
                                                                ).push(
                                                                  MaterialPageRoute(
                                                                    builder: (_) =>
                                                                        QuizSolverScreen(
                                                                          quiz:
                                                                              quiz,
                                                                        ),
                                                                  ),
                                                                );
                                                            if (res == true) {
                                                              _loadData();
                                                            }
                                                          },
                                                          icon: const Icon(
                                                            Icons.play_arrow,
                                                          ),
                                                          label: const Text(
                                                            'بدء الاختبار',
                                                          ),
                                                        ),
                                                      )
                                                    : Container(
                                                        width: double.infinity,
                                                        padding:
                                                            const EdgeInsets.all(
                                                              12,
                                                            ),
                                                        decoration: BoxDecoration(
                                                          color: Colors.green
                                                              .withValues(
                                                                alpha: 0.08,
                                                              ),
                                                          border: Border.all(
                                                            color: Colors.green
                                                                .withValues(
                                                                  alpha: 0.2,
                                                                ),
                                                          ),
                                                          borderRadius:
                                                              BorderRadius.circular(
                                                                14,
                                                              ),
                                                        ),
                                                        child: Text(
                                                          'تم تقديم هذا الاختبار مسبقاً · الدرجة: ${previousAttempt.score} / ${previousAttempt.total}',
                                                          style: TextStyle(
                                                            color: Colors
                                                                .green
                                                                .shade800,
                                                            fontWeight:
                                                                FontWeight.bold,
                                                          ),
                                                        ),
                                                      ),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildResultsTable(List<QuizResultModel> results) {
    if (results.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(12),
          child: Text('لا توجد نتائج مسجلة لهذا الاختبار بعد.'),
        ),
      );
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('#')),
            DataColumn(label: Text('الطالب')),
            DataColumn(label: Text('النتيجة')),
            DataColumn(label: Text('تاريخ التقديم')),
          ],
          rows: [
            for (var index = 0; index < results.length; index++)
              DataRow(
                cells: [
                  DataCell(Text('${index + 1}')),
                  DataCell(Text(results[index].displayName)),
                  DataCell(
                    Text('${results[index].score} / ${results[index].total}'),
                  ),
                  DataCell(
                    Text(_formatSubmittedAt(results[index].submittedAt)),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  String _formatSubmittedAt(String value) {
    final date = DateTime.tryParse(value)?.toLocal();
    if (date == null) return '—';
    String twoDigits(int number) => number.toString().padLeft(2, '0');
    return '${date.year}/${twoDigits(date.month)}/${twoDigits(date.day)} ${twoDigits(date.hour)}:${twoDigits(date.minute)}';
  }
}
