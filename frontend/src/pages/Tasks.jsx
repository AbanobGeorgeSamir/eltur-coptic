import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Check, CheckSquare, Circle, Search, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';

const filters = [
  ['all', 'الكل'],
  ['pending', 'قيد التنفيذ'],
  ['completed', 'مكتملة'],
];

const dateLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ar-EG', { dateStyle: 'long' });
};

export default function Tasks({ showToast }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [completingTask, setCompletingTask] = useState(null);
  const [completionNote, setCompletionNote] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    api.tasks().then((items) => {
      if (active) setTasks(items);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const pendingCount = tasks.filter((task) => !task.completedAt).length;
  const completedCount = tasks.length - pendingCount;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ar');
    return tasks
      .filter((task) => filter === 'all'
        || (filter === 'pending' ? !task.completedAt : Boolean(task.completedAt)))
      .filter((task) => !normalizedQuery || `${task.title} ${task.description}`.toLocaleLowerCase('ar').includes(normalizedQuery))
      .sort((a, b) => {
        if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
        if (!a.completedAt) return new Date(a.dueAt || '9999-12-31') - new Date(b.dueAt || '9999-12-31');
        return new Date(b.completedAt) - new Date(a.completedAt);
      });
  }, [tasks, filter, query]);

  const complete = async (task) => {
    setBusy(task._id);
    setError('');
    try {
      const completedAt = new Date().toISOString();
      await api.completeTask(task._id, completionNote.trim());
      setTasks((current) => current.map((item) => item._id === task._id
        ? { ...item, completedAt, completionNote: completionNote.trim() }
        : item));
      setCompletingTask(null);
      setCompletionNote('');
      showToast('تم تسجيل إنجاز المهمة.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300"><CheckSquare className="h-4 w-4" />متابعة الخدمة</span>
          <h1 className="mt-3 text-2xl font-extrabold text-white md:text-3xl">المهام والواجبات الروحية</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">تابع ما عليك، وسجّل إنجازك بخطوة واحدة.</p>
        </div>
        {user?.role === 'student' && pendingCount > 0 && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm font-semibold text-amber-200">لديك {pendingCount} مهمة تحتاج إلى متابعة</div>}
      </header>

      <section className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-300">نسبة الإنجاز</span><span className="text-2xl font-extrabold text-amber-300">{progress}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-l from-amber-300 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2 text-xs text-slate-500">{completedCount} مكتملة من {tasks.length} مهمة</p>
        </article>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setFilter('pending')} className={`rounded-2xl border p-4 text-right transition ${filter === 'pending' ? 'border-amber-400/50 bg-amber-400/10' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
            <span className="text-xs text-slate-400">قيد التنفيذ</span><span className="mt-2 block text-2xl font-bold text-white">{pendingCount}</span>
          </button>
          <button type="button" onClick={() => setFilter('completed')} className={`rounded-2xl border p-4 text-right transition ${filter === 'completed' ? 'border-emerald-400/50 bg-emerald-400/5' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
            <span className="text-xs text-slate-400">مكتملة</span><span className="mt-2 block text-2xl font-bold text-white">{completedCount}</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية المهام">
            {filters.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`min-h-10 rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === value ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}>{label}</button>)}
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="ابحث في المهام" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pr-10 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}
          </label>
        </div>

        {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
        {loading && <div role="status" className="animate-pulse rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل المهام...</div>}
        {!loading && tasks.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"><Circle className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 font-semibold text-white">لا توجد مهام مسندة حالياً</p><p className="mt-1 text-sm text-slate-400">ستظهر المهام الجديدة هنا عند إضافتها.</p></div>}
        {!loading && tasks.length > 0 && visibleTasks.length === 0 && <p className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">لا توجد نتائج مطابقة لهذا الاختيار.</p>}

        <div className="grid gap-3 lg:grid-cols-2">
          {visibleTasks.map((task) => {
            const completed = Boolean(task.completedAt);
            const overdue = !completed && task.dueAt && new Date(task.dueAt).getTime() < now;
            return <article key={task._id} className={`flex min-w-0 flex-col rounded-2xl border bg-slate-900 p-4 transition sm:p-5 ${completed ? 'border-emerald-500/20' : overdue ? 'border-rose-500/25' : 'border-slate-800 hover:border-amber-500/30'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${completed ? 'bg-emerald-400/10 text-emerald-300' : overdue ? 'bg-rose-400/10 text-rose-300' : 'bg-amber-400/10 text-amber-300'}`}>
                      {completed ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                      {completed ? 'مكتملة' : overdue ? 'متأخرة' : 'قيد التنفيذ'}
                    </span>
                    {task.dueAt && <span className="inline-flex items-center gap-1 text-xs text-slate-400"><AlarmClock className="h-3.5 w-3.5" />{dateLabel(task.dueAt)}</span>}
                  </div>
                  <h2 className={`break-words font-bold ${completed ? 'text-slate-300' : 'text-white'}`}>{task.title}</h2>
                  {task.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{task.description}</p>}
                  {user?.role !== 'student' && task.student?.name && <p className="mt-3 text-xs text-slate-500">الطالب: {task.student.name}</p>}
                  {completed && task.completionNote && <p className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-sm leading-6 text-emerald-100">ملاحظتك: {task.completionNote}</p>}
                </div>
              </div>
              {!completed && user?.role === 'student' && <button type="button" disabled={busy === task._id} onClick={() => { setCompletingTask(task); setCompletionNote(''); }} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50 sm:w-auto sm:self-start"><Check className="h-4 w-4" />تسليم المهمة</button>}
            </article>;
          })}
        </div>
      </section>

      {completingTask && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 p-3 sm:p-4" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !busy) setCompletingTask(null); }}>
        <form onSubmit={(event) => { event.preventDefault(); void complete(completingTask); }} role="dialog" aria-modal="true" aria-labelledby="complete-task-title" className="my-auto max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-amber-500/30 bg-slate-900 p-4 shadow-2xl sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 id="complete-task-title" className="text-lg font-bold text-white">تسليم المهمة</h2><p className="mt-1 text-sm text-amber-300">{completingTask.title}</p></div><button type="button" onClick={() => setCompletingTask(null)} disabled={Boolean(busy)} aria-label="إغلاق" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div>
          <label className="block text-sm text-slate-300">ملاحظة التسليم (اختيارية)
            <textarea maxLength={2000} value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white focus:border-amber-400 focus:outline-none" placeholder="اكتب ما أنجزته أو أضف ملاحظة قصيرة..." />
          </label>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} className="min-h-11 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'جارٍ التسجيل...' : 'تأكيد الإنجاز'}</button><button type="button" disabled={Boolean(busy)} onClick={() => setCompletingTask(null)} className="min-h-11 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200">إلغاء</button></div>
        </form>
      </div>}
    </div>
  );
}
