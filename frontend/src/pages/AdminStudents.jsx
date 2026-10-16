import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { grades, gradeLabel, isGradeAdminRole } from '../data/grades';

export default function AdminStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [pendingParents, setPendingParents] = useState([]);
  const [approvingParent, setApprovingParent] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(null);
  const [savingId, setSavingId] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [assignedStudents, unassignedStudents, parents] = await Promise.all([
        api.students(),
        api.unassignedStudents(),
        api.pendingParents(),
      ]);
      setStudents([...new Map([...unassignedStudents, ...assignedStudents].map((student) => [student.id, student])).values()]);
      setPendingParents(parents);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);
  const refresh = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load, refresh]);

  const visibleStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ar');
    if (!normalized) return students;
    return students.filter((student) => [student.name, student.email, student.phone, student.whatsappNumber]
      .some((value) => String(value || '').toLocaleLowerCase('ar').includes(normalized)));
  }, [students, query]);

  const assign = async (id) => {
    setError('');
    try {
      await api.assignStudent(id);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const reject = async (student) => {
    const confirmed = window.confirm(`هل تريد رفض تسجيل ${student.name || 'هذا الطالب'}؟ سيُؤرشف الحساب ولن يظهر ضمن الطلاب النشطين.`);
    if (!confirmed) return;
    setError('');
    setNotice('');
    setRejectingId(student.id);
    try {
      await api.rejectStudent(student.id);
      setNotice('تم رفض تسجيل الطالب وأرشفة الحساب.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRejectingId('');
    }
  };
  const approveParent = async (parentId, studentId) => {
    setError('');
    setApprovingParent(`${parentId}:${studentId}`);
    try {
      await api.approveParent(parentId, studentId);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setApprovingParent('');
    }
  };
  const edit = (student) => {
    setEditingId(student.id);
    setDraft({
      name: student.name || '', email: student.email || '', phone: student.phone || '',
      interests: student.interests || '',
      fatherName: student.fatherName || '', confessionFather: student.confessionFather || '',
      guardianPhone: student.guardianPhone || '', address: student.address || '',
      birthDate: student.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : '',
      gender: student.gender || 'male', nationalId: student.nationalId || '',
      whatsappNumber: student.whatsappNumber || '', isDeacon: Boolean(student.isDeacon),
      grade: student.grade || '', meetingGroup: student.meetingGroup || '',
    });
  };
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }));
  const saveStudent = async (event) => {
    event.preventDefault();
    if (!draft || !editingId) return;
    setSavingId(editingId);
    setError('');
    try {
      const originalStudent = students.find((student) => student.id === editingId);
      const studentPayload = {
        ...draft,
        birthDate: draft.birthDate ? new Date(`${draft.birthDate}T12:00:00`).toISOString() : undefined,
      };
      if (draft.grade === (originalStudent?.grade || '')
        && draft.meetingGroup === (originalStudent?.meetingGroup || '')) {
        delete studentPayload.grade;
        delete studentPayload.meetingGroup;
      }
      await api.updateStudent(editingId, studentPayload);
      setEditingId('');
      setDraft(null);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId('');
    }
  };
  return (
    <div className="max-w-5xl mx-auto space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-white">الطلاب</h1><p className="text-sm text-slate-400 mt-1">بيانات مجموعتك، مع أسماء الطلاب غير المعيّنين لإضافتهم عند الحاجة.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50">{loading ? 'جارٍ التحديث…' : 'تحديث القائمة'}</button>
      </div>
      <label className="block text-sm text-slate-300">بحث بالاسم أو البريد أو أرقام التواصل
        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="ابحث عن طالب أو رقم واتساب" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500" />
      </label>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {pendingParents.length > 0 && <section aria-labelledby="parent-approval-title" className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:p-5">
        <div><h2 id="parent-approval-title" className="font-bold text-white">طلبات ربط أولياء الأمور</h2><p className="mt-1 text-sm leading-6 text-slate-400">تأكد من هوية ولي الأمر خارج التطبيق قبل منح الوصول إلى بيانات الطالب.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">{pendingParents.map((item) => {
          const key = `${item.parentId}:${item.studentId}`;
          return <article key={key} className="rounded-xl border border-white/[0.08] bg-slate-950/70 p-3">
            <p className="font-semibold text-white">{item.parentName}</p>
            <p className="mt-1 text-sm text-slate-300" dir="ltr">{item.parentPhone}</p>
            <p className="mt-2 text-xs text-slate-400">يريد متابعة: <span className="font-semibold text-amber-200">{item.studentName}</span></p>
            <button type="button" disabled={Boolean(approvingParent)} onClick={() => void approveParent(item.parentId, item.studentId)} className="mt-3 min-h-10 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-wait disabled:opacity-50">{approvingParent === key ? 'جارٍ الاعتماد...' : 'اعتماد ربط الطالب'}</button>
          </article>;
        })}</div>
      </section>}
      {!error && !loading && students.length === 0 && <p className="bg-slate-900 p-5 rounded-2xl text-slate-400">لا يوجد طلاب مسجلون حاليًا.</p>}
      {!error && !loading && students.length > 0 && visibleStudents.length === 0 && <p className="bg-slate-900 p-5 rounded-2xl text-slate-400">لا توجد نتائج مطابقة للبحث.</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {visibleStudents.map((student) => (
          <article key={student.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              {student.picture
                ? <img src={student.picture} alt={`صورة ${student.name}`} loading="lazy" className="h-14 w-14 shrink-0 rounded-full border border-amber-500/20 object-cover" />
                : <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-500/10 text-xl font-bold text-amber-300">{student.name?.slice(0, 1)}</div>}
              <div className="min-w-0"><h2 className="break-words font-bold text-white">{student.name}</h2>{student.email && <p className="mt-1 break-all text-sm text-slate-400">{student.email}</p>}<p className="mt-1 text-xs text-amber-200">{gradeLabel(student.grade)}{student.meetingGroupName ? ` · ${student.meetingGroupName}` : ''}</p>{!student.assignedAdmin && <p className="mt-1 text-xs text-slate-500">لم يتم ربطه بمسؤول بعد</p>}</div>
            </div>
            {student.interests && <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-amber-200">اهتمامات الطالب: </span>{student.interests}</p>}
            {student.phone && <p className="mt-3 text-sm text-slate-400" dir="ltr">{student.phone}</p>}
            {student.address && <p className="text-sm text-slate-400 mt-1">{student.address}</p>}
            {student.whatsappNumber && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-emerald-300">
              <span>واتساب:</span><span dir="ltr" className="font-mono">{student.whatsappNumber}</span>
              <a className="text-xs hover:underline" href={`https://wa.me/${student.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">فتح المحادثة</a>
            </div>}
            {!student.assignedAdmin && <div role="group" aria-label="إجراءات الطالب غير المعيّن" className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(rejectingId)} onClick={() => void assign(student.id)} className="min-h-10 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-wait disabled:opacity-50">ضمّ للمجموعة</button>
              <button type="button" disabled={Boolean(rejectingId)} onClick={() => void reject(student)} className="min-h-10 rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-400/20 disabled:cursor-wait disabled:opacity-50">{rejectingId === student.id ? 'جارٍ الرفض...' : 'رفض'}</button>
            </div>}
            <button type="button" onClick={() => editingId === student.id ? (setEditingId(''), setDraft(null)) : edit(student)} className="mt-4 min-h-10 rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-400/10">
              {editingId === student.id ? 'إلغاء التعديل' : 'تعديل بيانات الطالب'}
            </button>
            {editingId === student.id && draft && <form onSubmit={saveStudent} className="mt-4 space-y-3 border-t border-slate-800 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['name', 'الاسم رباعي', 'text'], ['email', 'البريد الإلكتروني (.com) (اختياري)', 'email'],
                  ['phone', 'هاتف الطالب', 'tel'], ['fatherName', 'اسم الأب', 'text'],
                  ['confessionFather', 'أب الاعتراف', 'text'], ['guardianPhone', 'هاتف ولي الأمر', 'tel'],
                  ['whatsappNumber', 'رقم واتساب', 'tel'], ['address', 'العنوان', 'text'],
                  ['nationalId', 'الرقم القومي (14 رقمًا)', 'text'],
                ].map(([key, label, type]) => <label key={key} className="block text-xs text-slate-400">{label}
                  <input required={key !== 'whatsappNumber' && key !== 'email'} maxLength={key === 'nationalId' ? 14 : undefined} pattern={key === 'nationalId' ? '[0-9]{14}' : undefined} value={draft[key]} type={type} onChange={(event) => updateDraft(key, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white" />
                </label>)}
                <label className="block text-xs text-slate-400 sm:col-span-2">اهتماماتك
                  <textarea maxLength={500} rows={3} value={draft.interests} onChange={(event) => updateDraft('interests', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white" />
                </label>
                <label className="block text-xs text-slate-400">تاريخ الميلاد
                  <input required type="date" value={draft.birthDate} onChange={(event) => updateDraft('birthDate', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white" />
                </label>
                <label className="block text-xs text-slate-400">النوع
                  <select value={draft.gender} onChange={(event) => updateDraft('gender', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white">
                    <option value="male">ذكر</option><option value="female">أنثى</option>
                  </select>
                </label>
                <label className="block text-xs text-slate-400">المرحلة الدراسية
                  <select value={draft.grade} disabled={isGradeAdminRole(user?.role)} onChange={(event) => updateDraft('grade', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white disabled:opacity-60">
                    {user?.role === 'admin' && <option value="">اختر المرحلة</option>}
                    {grades.filter((item) => !isGradeAdminRole(user?.role) || item.id === user.grade).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    {draft.grade === 'primary' && <option value="primary">ابتدائي (حساب سابق)</option>}
                  </select>
                </label>
                <StudentGroupSelector user={user} grade={draft.grade} value={draft.meetingGroup} onChange={(value) => updateDraft('meetingGroup', value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.isDeacon} onChange={(event) => updateDraft('isDeacon', event.target.checked)} />شماس</label>
              <button disabled={savingId === student.id} className="min-h-10 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{savingId === student.id ? 'جارٍ الحفظ...' : 'حفظ بيانات الطالب'}</button>
            </form>}
          </article>
        ))}
      </div>
    </div>
  );
}

function StudentGroupSelector({ user, grade, value, onChange }) {
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    let active = true;
    if (!grade) { setGroups([]); return () => { active = false; }; }
    api.adminMeetingGroups(grade, true).then((items) => { if (active) setGroups(items); }).catch(() => { if (active) setGroups([]); });
    return () => { active = false; };
  }, [grade]);
  const allowedGroups = isGradeAdminRole(user?.role) && user.meetingGroup
    ? groups.filter((group) => group.id === user.meetingGroup)
    : groups;
  return <label className="block text-xs text-slate-400">الاجتماع الفرعي
    <select value={value} disabled={isGradeAdminRole(user?.role) && Boolean(user.meetingGroup)} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white disabled:opacity-60">
      <option value="">بدون اجتماع فرعي</option>
      {allowedGroups.map((group) => <option key={group.id} value={group.id} disabled={!group.isActive}>{group.name}{group.isActive ? '' : ' (موقوف)'}</option>)}
    </select>
  </label>;
}
