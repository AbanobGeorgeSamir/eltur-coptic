import { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Save } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { isAdminRole } from '../data/grades';

const prayerOptions = [
  ['morning', 'صلاة باكر'],
  ['third', 'صلاة الساعة الثالثة'],
  ['sixth', 'صلاة الساعة السادسة'],
  ['ninth', 'صلاة الساعة التاسعة'],
  ['sleep', 'صلاة النوم'],
];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

export default function PrayerChecklist({ showToast }) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const isStudent = user?.role === 'student';
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.prayerChecklists(date));
      setEditingId('');
      setDraft(null);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  const setStudentCheck = (field, value) => {
    setEntries((current) => current.map((entry) => entry.studentId === user?.id
      ? { ...entry, checks: { ...entry.checks, [field]: value } }
      : entry));
  };

  const saveStudent = async () => {
    const entry = entries.find((item) => item.studentId === user?.id);
    if (!entry) return;
    setSaving(true);
    setError('');
    try {
      await api.savePrayerChecklist({ date, checks: entry.checks });
      showToast('تم حفظ صلوات اليوم');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAdminRow = async (studentId) => {
    setSaving(true);
    setError('');
    try {
      await api.updatePrayerChecklist(studentId, { date, checks: draft });
      setEntries((current) => current.map((entry) => entry.studentId === studentId ? { ...entry, checks: draft } : entry));
      setEditingId('');
      setDraft(null);
      showToast('تم تحديث اختيارات الطالب');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const title = isAdmin ? 'متابعة صلوات الطلاب' : isStudent ? 'صلوات اليوم' : 'متابعة صلوات الأبناء';

  return (
    <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <header className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-l from-amber-950/50 to-slate-900 p-5 sm:flex-row sm:items-end sm:justify-between md:p-6">
        <div><CheckSquare className="mb-2 h-7 w-7 text-amber-300" /><h1 className="text-2xl font-bold text-white">{title}</h1><p className="mt-1 text-sm text-slate-300">سجّل صلواتك اليومية وتابع الاختيارات بحسب التاريخ.</p></div>
        <label className="text-sm font-semibold text-slate-300">التاريخ<input type="date" value={date} max={today()} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white sm:w-auto" /></label>
      </header>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">جارٍ تحميل الاختيارات...</p> : isAdmin ? (
        <section className="space-y-3">
          <p className="text-sm text-slate-400">اختر «تعديل» لتحديث اختيارات الطالب لهذا اليوم.</p>
          <div className="space-y-3 sm:hidden">
            {entries.map((entry) => {
              const editing = editingId === entry.studentId;
              const checks = editing ? draft : entry.checks;
              return <article key={entry.studentId} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="break-words font-bold text-white">{entry.studentName}</h2>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {prayerOptions.map(([field, label]) => <label key={field} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <span className="flex min-w-0 items-center gap-2">
                      {editing && <input aria-label={`${label} - ${entry.studentName}`} type="checkbox" checked={Boolean(checks?.[field])} disabled={saving} onChange={(event) => setDraft((old) => ({ ...old, [field]: event.target.checked }))} className="h-4 w-4 shrink-0 accent-amber-400" />}
                      <span>{label}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${checks?.[field] ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>{checks?.[field] ? 'تمت' : 'لم تتم'}</span>
                  </label>)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editing ? <>
                    <button type="button" disabled={saving} onClick={() => saveAdminRow(entry.studentId)} className="min-h-10 rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                    <button type="button" disabled={saving} onClick={() => { setEditingId(''); setDraft(null); }} className="min-h-10 rounded-xl border border-slate-700 px-4 text-xs text-slate-200">إلغاء</button>
                  </> : <button type="button" onClick={() => { setEditingId(entry.studentId); setDraft({ ...entry.checks }); }} className="min-h-10 rounded-xl border border-amber-500/30 px-4 text-xs font-bold text-amber-300">تعديل اليوم</button>}
                </div>
              </article>;
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 sm:block">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-800 text-amber-300"><tr><th className="p-3">الطالب</th>{prayerOptions.map(([, label]) => <th key={label} className="p-3">{label}</th>)}<th className="p-3">إجراء</th></tr></thead>
              <tbody>{entries.map((entry) => {
                const editing = editingId === entry.studentId;
                const checks = editing ? draft : entry.checks;
                return <tr key={entry.studentId} className="border-t border-slate-800 text-slate-200">
                  <th scope="row" className="p-3 font-semibold">{entry.studentName}</th>
                  {prayerOptions.map(([field, label]) => <td key={field} className="p-3 text-center"><input aria-label={`${label} - ${entry.studentName}`} type="checkbox" checked={Boolean(checks?.[field])} disabled={!editing || saving} onChange={(event) => setDraft((old) => ({ ...old, [field]: event.target.checked }))} className="h-4 w-4 accent-amber-400" /></td>)}
                  <td className="p-3"><div className="flex gap-2">{editing ? <><button type="button" disabled={saving} onClick={() => saveAdminRow(entry.studentId)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">حفظ</button><button type="button" disabled={saving} onClick={() => { setEditingId(''); setDraft(null); }} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">إلغاء</button></> : <button type="button" onClick={() => { setEditingId(entry.studentId); setDraft({ ...entry.checks }); }} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300">تعديل</button>}</div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {!entries.length && <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">لا يوجد طلاب في مجموعتك.</p>}
        </section>
      ) : isStudent ? (
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <div><h2 className="font-bold text-amber-300">اختيارات صلواتك</h2><p className="mt-1 text-sm text-slate-400">حدّد الصلوات التي أتممتها ثم احفظها.</p></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {entries[0] && prayerOptions.map(([field, label]) => <label key={field} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-white"><input type="checkbox" checked={Boolean(entries[0].checks[field])} onChange={(event) => setStudentCheck(field, event.target.checked)} className="h-4 w-4 accent-amber-400" />{label}</label>)}
          </div>
          {entries[0] && <button type="button" disabled={saving} onClick={saveStudent} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'جارٍ الحفظ...' : 'حفظ الاختيارات'}</button>}
          {!entries.length && <p className="text-sm text-slate-400">تعذر العثور على حساب الطالب.</p>}
        </section>
      ) : (
        <section className="space-y-3">
          {entries.map((entry) => <article key={entry.studentId} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-5"><h2 className="font-bold text-white">{entry.studentName}</h2><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{prayerOptions.map(([field, label]) => <label key={field} className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(entry.checks[field])} disabled readOnly className="h-4 w-4 accent-amber-400" />{label}</label>)}</div></article>)}
          {!entries.length && <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">لا توجد حسابات أبناء مرتبطة.</p>}
        </section>
      )}
    </div>
  );
}
