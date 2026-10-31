import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { isAdminRole } from '../data/grades';
import GradeScopeFields from '../components/GradeScopeFields';

const emptyQuestion = () => ({ prompt: '', options: ['', '', '', ''], answerIndex: 0 });

const resultsFromAttempts = (attempts) => attempts.reduce((results, attempt) => {
  const quizId = typeof attempt.quiz === 'object'
    ? attempt.quiz?._id || attempt.quiz?.id
    : attempt.quiz;
  if (!quizId) return results;
  results[String(quizId)] = {
    score: attempt.score,
    total: attempt.total,
    submittedAt: attempt.submittedAt,
  };
  return results;
}, {});

const submittedAtLabel = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
};

export default function Quizzes() {
  const { user } = useAuth();
  const userRole = user?.role;
  const [quizzes, setQuizzes] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [parentAttempts, setParentAttempts] = useState([]);
  const [adminResults, setAdminResults] = useState({});
  const [quizAudiences, setQuizAudiences] = useState({});
  const [savingAudienceId, setSavingAudienceId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [quizForm, setQuizForm] = useState({ title: '', description: '' });
  const [audience, setAudience] = useState({ grade: '', meetingGroup: '' });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const load = useCallback(async () => {
    if (userRole !== 'student' && userRole !== 'parent' && !isAdminRole(userRole)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const quizData = await api.quizzes();
      setQuizzes(quizData);
      setQuizAudiences(Object.fromEntries(quizData.map((quiz) => [quiz._id || quiz.id, {
        grade: quiz.grade || '',
        meetingGroup: String(quiz.meetingGroup?._id || quiz.meetingGroup || ''),
      }])));
      if (isAdminRole(userRole)) {
        const resultEntries = await Promise.all(quizData.map(async (quiz) => {
          const quizId = quiz.id || quiz._id;
          return [quizId, await api.quizResults(quizId)];
        }));
        setAdminResults(Object.fromEntries(resultEntries));
      } else if (userRole === 'parent') {
        setParentAttempts(await api.parentQuizAttempts());
      } else {
        setResults(resultsFromAttempts(await api.quizAttempts()));
      }
    } catch (requestError) {
      setError(requestError.message || 'تعذر تحميل الاختبارات والنتائج.');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => { void load(); }, [load]);

  const createQuiz = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingQuiz(true);
    try {
      await api.createQuiz({ ...quizForm, questions, ...audience });
      setQuizForm({ title: '', description: '' });
      setAudience({ grade: '', meetingGroup: '' });
      setQuestions([emptyQuestion()]);
      setNotice('تم نشر الاختبار، وسيظهر للطلاب في صفحة الاختبارات.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'تعذر نشر الاختبار.');
    } finally {
      setSavingQuiz(false);
    }
  };

  const submit = async (quiz) => {
    const quizId = quiz.id || quiz._id;
    const selected = answers[quizId] || [];
    if (quiz.questions.some((_, index) => !Number.isInteger(selected[index]) || selected[index] < 0)) {
      setError('أجب عن جميع الأسئلة قبل إرسال الاختبار.');
      return;
    }
    setError('');
    setSubmitting(quizId);
    try {
      const response = await api.submitQuiz(quizId, selected);
      setResults((current) => ({ ...current, [quizId]: { ...response.result, justSubmitted: true } }));
    } catch (requestError) {
      if (requestError.status === 409) await load();
      setError(requestError.message || 'تعذر إرسال الإجابات.');
    } finally {
      setSubmitting('');
    }
  };

  const saveQuizAudience = async (quiz) => {
    const quizId = quiz._id || quiz.id;
    setError('');
    setSavingAudienceId(quizId);
    try {
      await api.updateQuizAudience(quizId, quizAudiences[quizId] || {});
      await load();
      setNotice('تم تحديث مرحلة الاختبار واجتماعه.');
    } catch (requestError) { setError(requestError.message); }
    finally { setSavingAudienceId(''); }
  };

  const deleteQuiz = async (quiz) => {
    const quizId = quiz._id || quiz.id;
    const confirmed = window.confirm(`هل أنت متأكد من حذف الاختبار "${quiz.title}" وجميع نتائجه نهائياً؟`);
    if (!confirmed) return;
    setError('');
    setNotice('');
    try {
      await api.deleteQuiz(quizId);
      setNotice('تم حذف الاختبار بنجاح.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'تعذر حذف الاختبار.');
    }
  };

  if (user?.role !== 'student' && user?.role !== 'parent' && !isAdminRole(user?.role)) {
    return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-5" dir="rtl">
      <h1 className="text-2xl font-bold text-white">الاختبارات</h1>
      <p className="mt-2 text-sm leading-6 text-slate-300">حل الاختبارات متاح لحسابات الطلاب.</p>
    </div>;
  }

  if (isAdminRole(user.role)) {
    return <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-white">الاختبارات ونتائج الطلاب</h1>
        <p className="mt-1 text-sm leading-6 text-slate-400">أنشئ اختبارًا، وتابع إجابات الطلاب ودرجاتهم أسفل كل اختبار.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">{notice}</p>}

      <form onSubmit={createQuiz} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-bold text-amber-300">إنشاء اختبار</h2>
        <input required maxLength={200} value={quizForm.title} onChange={(event) => setQuizForm({ ...quizForm, title: event.target.value })} placeholder="عنوان الاختبار" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" />
        <textarea maxLength={2000} value={quizForm.description} onChange={(event) => setQuizForm({ ...quizForm, description: event.target.value })} placeholder="وصف الاختبار (اختياري)" className="min-h-20 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" />
        <GradeScopeFields user={user} grade={audience.grade} meetingGroup={audience.meetingGroup} onChange={(key, value) => setAudience((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }))} idPrefix="quiz-audience" />
        {questions.map((question, index) => <fieldset key={index} className="space-y-3 rounded-xl border border-slate-700 p-4">
          <legend className="px-2 text-sm text-slate-300">السؤال {index + 1}</legend>
          <input required maxLength={1000} value={question.prompt} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, prompt: event.target.value } : item))} placeholder="نص السؤال" className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" />
          {question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2">
            <input type="radio" aria-label={`الإجابة الصحيحة: الخيار ${optionIndex + 1}`} name={`correct-${index}`} checked={question.answerIndex === optionIndex} onChange={() => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, answerIndex: optionIndex } : item))} />
            <input required maxLength={300} value={option} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, options: item.options.map((value, valueIndex) => valueIndex === optionIndex ? event.target.value : value) } : item))} placeholder={`الخيار ${optionIndex + 1}`} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white" />
          </div>)}
          {questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-300">إزالة السؤال</button>}
        </fieldset>)}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={questions.length >= 100} onClick={() => setQuestions((current) => [...current, emptyQuestion()])} className="min-h-10 rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 disabled:opacity-50">إضافة سؤال</button>
          <button disabled={savingQuiz} className="min-h-10 rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{savingQuiz ? 'جارٍ النشر...' : 'نشر الاختبار'}</button>
        </div>
      </form>

      <section className="space-y-4" aria-labelledby="quiz-results-heading">
        <h2 id="quiz-results-heading" className="text-lg font-bold text-white">الاختبارات والنتائج</h2>
        {loading && <p role="status" className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل النتائج...</p>}
        {!loading && !error && quizzes.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">لم تنشر أي اختبارات بعد.</p>}
        {quizzes.map((quiz) => {
          const quizId = quiz.id || quiz._id;
          const quizResults = adminResults[quizId] || [];
          return <article key={quizId} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 p-4">
              <div>
                <h3 className="font-bold text-amber-300">{quiz.title}</h3>
                {quiz.description && <p className="mt-1 text-sm text-slate-400">{quiz.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{quizResults.length} نتيجة</span>
                <button type="button" onClick={() => void deleteQuiz(quiz)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20">حذف الاختبار</button>
              </div>
            </div>
            <div className="space-y-3 border-b border-slate-800 p-4">
              <p className="text-xs font-semibold text-slate-400">نطاق ظهور الاختبار للطلاب</p>
              {!quiz.audienceMode && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">اختبار قديم بلا نطاق مرحلة محفوظ؛ هو مخفي عن الطلاب حتى يحفظ الأدمن نطاقه أدناه.</p>}
              <GradeScopeFields user={user} grade={quizAudiences[quizId]?.grade || ''} meetingGroup={quizAudiences[quizId]?.meetingGroup || ''} onChange={(key, value) => setQuizAudiences((current) => ({ ...current, [quizId]: { ...current[quizId], [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) } }))} idPrefix={`quiz-scope-${quizId}`} />
              <button type="button" disabled={savingAudienceId === quizId} onClick={() => void saveQuizAudience(quiz)} className="min-h-9 rounded-lg border border-amber-400/30 px-3 text-xs font-bold text-amber-200 disabled:opacity-50">{savingAudienceId === quizId ? 'جارٍ الحفظ...' : 'حفظ نطاق الاختبار'}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right text-sm">
                <thead className="bg-slate-800/70 text-amber-200">
                  <tr><th scope="col" className="px-4 py-3">#</th><th scope="col" className="px-4 py-3">الطالب</th><th scope="col" className="px-4 py-3">النتيجة</th><th scope="col" className="px-4 py-3">تاريخ التقديم</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {quizResults.map((result, index) => <tr key={result._id} className="text-slate-200">
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold">{result.student?.name || result.student?.username || '—'}</td>
                    <td className="px-4 py-3"><span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">{result.score} / {result.total}</span></td>
                    <td className="px-4 py-3 text-slate-400">{submittedAtLabel(result.submittedAt)}</td>
                  </tr>)}
                  {!quizResults.length && <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">لا توجد نتائج مسجلة لهذا الاختبار بعد.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>;
        })}
      </section>
    </div>;
  }

  if (userRole === 'parent') {
    return <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-white">اختبارات الأبناء</h1>
        <p className="mt-1 text-sm leading-6 text-slate-400">تابع الاختبارات المنشورة ونتائج الأبناء المرتبطين بحسابك.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
      {loading && <p role="status" className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل الاختبارات...</p>}
      {!loading && !error && quizzes.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">لا توجد اختبارات منشورة حاليًا.</p>}
      {quizzes.map((quiz) => {
        const quizId = quiz.id || quiz._id;
        const attempts = parentAttempts.filter((attempt) => String(attempt.quiz?._id || attempt.quiz?.id || attempt.quiz) === String(quizId));
        return <article key={quizId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-bold text-amber-200">{quiz.title}</h2>
          {quiz.description && <p className="mt-1 text-sm text-slate-400">{quiz.description}</p>}
          <h3 className="mt-4 text-sm font-semibold text-slate-300">نتائج الأبناء</h3>
          {attempts.length ? <ul className="mt-2 divide-y divide-slate-800 rounded-xl border border-slate-800">
            {attempts.map((attempt) => <li key={attempt._id || `${attempt.student?._id}-${attempt.submittedAt}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="font-semibold text-slate-200">{attempt.student?.name || 'أحد الأبناء'}</span>
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">{attempt.score} / {attempt.total}</span>
              <time className="text-xs text-slate-500">{submittedAtLabel(attempt.submittedAt)}</time>
            </li>)}
          </ul> : <p className="mt-2 text-sm text-slate-500">لم يقدم أحد الأبناء هذا الاختبار بعد.</p>}
        </article>;
      })}
    </div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-white">الاختبارات</h1>
        <p className="mt-1 text-sm leading-6 text-slate-400">حل الاختبارات المنشورة، واعرف نتيجتك فور إرسال الإجابات.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
      {loading && <p role="status" className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل الاختبارات...</p>}
      {!loading && !error && quizzes.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm leading-6 text-slate-300">لا توجد اختبارات منشورة حاليًا. ستظهر الاختبارات هنا تلقائيًا عند نشرها.</p>}
      {!loading && quizzes.map((quiz) => {
        const quizId = quiz.id || quiz._id;
        const result = results[quizId];
        return <section key={quizId} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">{quiz.title}</h2>
            {quiz.description && <p className="mt-1 text-sm text-slate-400">{quiz.description}</p>}
          </div>
          {result ? <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="font-bold text-emerald-300">{result.justSubmitted ? 'تم تصحيح إجاباتك' : 'سبق لك تقديم هذا الاختبار'}</p>
            <p className="mt-1 text-sm text-slate-100">النتيجة: {result.score} / {result.total}</p>
          </div> : <>
            <p className="text-xs font-semibold text-amber-300">يمكنك تقديم الاختبار مرة واحدة فقط.</p>
            {quiz.questions.map((question, index) => (
              <fieldset key={`${quizId}-${index}`} className="space-y-2">
                <legend className="text-sm font-semibold text-slate-200">{index + 1}. {question.prompt}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-center gap-2 rounded-xl bg-slate-800 p-3 text-sm text-slate-200">
                    <input type="radio" name={`${quizId}-${index}`} checked={answers[quizId]?.[index] === optionIndex} disabled={submitting === quizId}
                      onChange={() => setAnswers((current) => {
                        const selected = [...(current[quizId] || [])];
                        selected[index] = optionIndex;
                        return { ...current, [quizId]: selected };
                      })} />{option}
                  </label>)}
                </div>
              </fieldset>
            ))}
            <button type="button" disabled={submitting === quizId} onClick={() => void submit(quiz)} className="min-h-11 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
              {submitting === quizId ? 'جارٍ التصحيح...' : 'إرسال الإجابات'}
            </button>
          </>}
        </section>;
      })}
    </div>
  );
}
