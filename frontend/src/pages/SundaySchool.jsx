import { useEffect, useState } from 'react';
import { api } from '../services/api';
import PostMedia from '../components/PostMedia';
import { useAuth } from '../contexts/useAuth';
import { isAdminRole } from '../data/grades';

export default function SundaySchool() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const deleteLesson = async (lesson) => {
    if (!window.confirm(`هل أنت متأكد من حذف درس "${lesson.title}"؟`)) return;
    try {
      await api.deletePost(lesson._id);
      setLessons((current) => current.filter((item) => item._id !== lesson._id));
    } catch (err) {
      setError(err.message || 'تعذر حذف الدرس.');
    }
  };

  useEffect(() => {
    let active = true;
    api.posts('sunday_lesson')
      .then((items) => {
        if (!active) return;
        setLessons(items);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'تعذر تحميل الدروس.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retryKey]);

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <header><h1 className="text-2xl font-bold text-white">مدارس الأحد</h1><p className="text-sm text-slate-400 mt-1">دروس روحية منشورة من خدام الكنيسة.</p></header>
      {!loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"><p className="text-sm text-rose-200">{error}</p><button type="button" onClick={() => { setError(''); setLoading(true); setRetryKey((key) => key + 1); }} className="min-h-10 rounded-lg border border-rose-300/25 px-3 text-sm font-bold text-rose-100">إعادة المحاولة</button></div>}
      {loading && <p role="status" aria-live="polite" className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل الدروس...</p>}
      <section className="space-y-3">
        {lessons.map((lesson) => <article key={lesson._id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-amber-300">{lesson.title}</h2>
            {isAdmin && (
              <button type="button" onClick={() => void deleteLesson(lesson)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20">
                حذف
              </button>
            )}
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-7 whitespace-pre-wrap">{lesson.body}</p>
          <PostMedia mediaUrl={lesson.mediaUrl} mediaKind={lesson.mediaKind} title={lesson.title} />
        </article>)}
        {!loading && !lessons.length && !error && <p className="bg-slate-900 p-5 rounded-2xl text-slate-400">لا توجد دروس منشورة.</p>}
      </section>
    </div>
  );
}
