import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { isAdminRole } from '../data/grades';

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Confession({ showToast }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const isAdmin = isAdminRole(user?.role);
  const canEditRecord = isAdmin || user?.role === 'student';
  const canRecord = isAdmin || user?.role === 'student';
  const latestByStudent = new Map();
  for (const record of records) {
    const id = record.student?.id || record.student?._id || record.student;
    if (id && !latestByStudent.has(String(id))) latestByStudent.set(String(id), record);
  }

  const load = async () => {
    try {
      const data = await api.confessions();
      setRecords(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const role = user?.role;
  useEffect(() => {
    let current = true;
    api.confessions().then((data) => {
      if (current) setRecords(data);
    }).catch((requestError) => {
      if (current) setError(requestError.message);
    });
    if (isAdminRole(role)) {
      api.students().then((data) => {
        if (!current) return;
        setStudents(data);
        setStudentId((selected) => selected || data[0]?.id || '');
      }).catch((requestError) => { if (current) setError(requestError.message); });
    }
    return () => { current = false; };
  }, [role]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createConfession({ studentId: isAdmin ? studentId : user.id, date, note });
      setNote('');
      await load();
      showToast('تم حفظ موعد آخر اعتراف');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (record) => {
    setEditingRecord(record);
    setEditDate(new Date(record.date).toISOString().slice(0, 10));
    setEditNote(record.note || '');
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.updateConfession(editingRecord._id, { date: editDate, note: editNote });
      setEditingRecord(null);
      await load();
      showToast('تم تعديل سجل الاعتراف');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5" dir="rtl">
      <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <Heart className="mb-3 h-8 w-8 text-rose-400" />
        <h1 className="text-2xl font-bold text-white">{isAdmin ? 'سجلات الاعتراف' : user?.role === 'parent' ? 'سجل اعتراف الأبناء' : 'سجل الاعتراف'}</h1>
        <p className="mt-2 text-sm text-slate-400">{isAdmin ? 'مواعيد اعتراف طلاب مجموعتك مرتبة من الأحدث.' : user?.role === 'parent' ? 'مواعيد الاعتراف المسجلة للأبناء المرتبطين بحسابك.' : 'سجّل موعد اعترافك ليظهر في سجل الخدمة.'}</p>
      </header>
      {canRecord && <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-bold text-amber-300">إضافة موعد آخر اعتراف</h2>
        {isAdmin && <select required value={studentId} onChange={(event) => setStudentId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white">
          <option value="">اختر الطالب</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>}
        <label className="block text-sm text-slate-300">التاريخ
          <input required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" />
        </label>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="ملاحظة اختيارية" className="min-h-20 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" />
        <button disabled={saving || (isAdmin && !students.length)} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ الموعد'}</button>
      </form>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {!records.length && !error && <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">لا توجد سجلات اعتراف محفوظة.</p>}
      {isAdmin ? <>
        <div className="grid gap-4 sm:hidden">
          {students.map((student) => {
            const record = latestByStudent.get(String(student.id));
            return <article key={student.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="break-words font-bold text-white">{student.name}</h2><p className="mt-1 text-xs text-slate-400">آخر موعد اعتراف</p></div>
                {record && <button type="button" onClick={() => startEdit(record)} className="min-h-10 shrink-0 rounded-xl border border-amber-500/30 px-3 text-xs font-bold text-amber-300">تعديل</button>}
              </div>
              <p className="mt-4 rounded-xl bg-slate-950/60 p-3 text-sm font-semibold text-slate-200">{record ? new Date(record.date).toLocaleDateString('ar-EG') : 'لم يسجل بعد'}</p>
              {record?.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{record.note}</p>}
            </article>;
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 sm:block">
        <table className="w-full min-w-[600px] text-right text-sm">
          <thead className="bg-slate-800 text-amber-300"><tr><th className="p-3">الطالب</th><th className="p-3">آخر موعد اعتراف</th><th className="p-3">ملاحظة</th><th className="p-3">إجراء</th></tr></thead>
          <tbody>{students.map((student) => {
            const record = latestByStudent.get(String(student.id));
            return <tr key={student.id} className="border-t border-slate-800 text-slate-200">
            <td className="p-3">{student.name}</td>
            <td className="p-3" dir="ltr">{record ? new Date(record.date).toLocaleDateString('ar-EG') : 'لم يسجل بعد'}</td>
            <td className="whitespace-pre-wrap p-3">{record?.note || '—'}</td>
            <td className="p-3">{record && <button type="button" onClick={() => startEdit(record)} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10">تعديل</button>}</td>
          </tr>})}</tbody>
        </table>
        </div>
      </> : <div className="space-y-3">
        {records.map((record, index) => <article key={record._id} className={`rounded-2xl border bg-slate-900 p-5 ${index === 0 ? 'border-amber-500/35' : 'border-slate-800'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {index === 0 && <span className="text-xs font-bold text-amber-300">آخر اعتراف مسجل</span>}
              <p className="mt-1 font-bold text-white">{new Date(record.date).toLocaleDateString('ar-EG')}</p>
              {record.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{record.note}</p>}
            </div>
            {index === 0 && canEditRecord && <button type="button" onClick={() => startEdit(record)} className="rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10">تعديل آخر سجل</button>}
          </div>
        </article>)}
      </div>}
      {editingRecord && <div className="modal-scrim fixed inset-0 z-50 grid place-items-center overflow-y-auto p-3 sm:p-4" role="presentation">
        <form onSubmit={saveEdit} role="dialog" aria-modal="true" aria-labelledby="confession-edit-title" className="my-auto max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-amber-500/30 bg-slate-900 p-4 shadow-2xl sm:p-5">
          <h2 id="confession-edit-title" className="text-lg font-bold text-white">تعديل سجل {editingRecord.student?.name || 'الاعتراف'}</h2>
          <label className="block text-sm text-slate-300">التاريخ<input required type="date" max={today()} value={editDate} onChange={(event) => setEditDate(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" /></label>
          <label className="block text-sm text-slate-300">ملاحظة<textarea maxLength={1000} value={editNote} onChange={(event) => setEditNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" /></label>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <div className="flex gap-2"><button disabled={saving} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}</button><button type="button" disabled={saving} onClick={() => setEditingRecord(null)} className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-200">إلغاء</button></div>
        </form>
      </div>}
    </div>
  );
}
