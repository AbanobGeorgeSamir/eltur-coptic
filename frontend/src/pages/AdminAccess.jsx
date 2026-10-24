import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { grades, gradeLabel } from '../data/grades';
import PhoneField from '../components/PhoneField';

const inputClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';
const blankAdmin = { name: '', username: '', email: '', phone: '', password: '', grade: '', meetingGroup: '' };
const adminEmailPattern = /^[^\s@]+@(?:[^\s@.]+\.)+com$/i.source;

export default function AdminAccess() {
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === 'admin';
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState(blankAdmin);
  const [creationMode, setCreationMode] = useState('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [hasMoreCandidates, setHasMoreCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searching, setSearching] = useState(false);
  const candidateSearchId = useRef(0);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAdmins = useCallback(async () => {
    if (!isGlobalAdmin) return;
    try {
      const data = await api.administrators();
      setAdmins(data);
      setDrafts(Object.fromEntries(data.map((admin) => [admin.id, {
        role: admin.role === 'admin' ? 'admin' : 'grade_admin',
        grade: admin.grade || 'primary_1_3',
        meetingGroup: admin.meetingGroup?.id || '',
        isActive: admin.isActive,
      }])));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [isGlobalAdmin]);

  useEffect(() => { void loadAdmins(); }, [loadAdmins]);
  useEffect(() => {
    const query = searchQuery.trim();
    const requestId = ++candidateSearchId.current;
    if (!isGlobalAdmin || creationMode !== 'existing' || !query) {
      setCandidates([]);
      setHasMoreCandidates(false);
      setSearching(false);
      return undefined;
    }
    let active = true;
    setCandidates([]);
    setHasMoreCandidates(false);
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.administratorCandidates(query);
        if (active && candidateSearchId.current === requestId) {
          setCandidates(results.data);
          setHasMoreCandidates(results.hasMore);
        }
      } catch (requestError) {
        if (active && candidateSearchId.current === requestId) setError(requestError.message);
      } finally {
        if (active && candidateSearchId.current === requestId) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [creationMode, isGlobalAdmin, searchQuery]);

  const loadMoreCandidates = async () => {
    const query = searchQuery.trim();
    if (!query || !hasMoreCandidates || searching) return;
    const requestId = candidateSearchId.current;
    setSearching(true);
    try {
      const results = await api.administratorCandidates(query, candidates.length);
      if (candidateSearchId.current === requestId) {
        setCandidates((current) => {
          const knownIds = new Set(current.map((candidate) => candidate.id));
          return [...current, ...results.data.filter((candidate) => !knownIds.has(candidate.id))];
        });
        setHasMoreCandidates(results.hasMore);
      }
    } catch (requestError) {
      if (candidateSearchId.current === requestId) setError(requestError.message);
    } finally {
      if (candidateSearchId.current === requestId) setSearching(false);
    }
  };

  const updateAdminDraft = (id, key, value) => setDrafts((current) => ({
    ...current,
    [id]: { ...current[id], [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) },
  }));

  const activeStageAdmins = (gradeId, exceptId = '') => admins.filter((admin) =>
    admin.id !== exceptId && admin.role !== 'admin' && admin.grade === gradeId && admin.isActive !== false,
  );
  const activeStageAdmin = (gradeId, exceptId = '') => activeStageAdmins(gradeId, exceptId)[0];

  const createAdmin = async (event) => {
    event.preventDefault();
    setError(''); setNotice(''); setSaving(true);
    try {
      const selectedStage = grades.some((item) => item.id === newAdmin.grade)
        ? newAdmin.grade
        : '';
      if (!selectedStage) {
        setError('اختر مرحلة دراسية من القائمة قبل تعيين مسؤول المرحلة.');
        return;
      }
      if (activeStageAdmin(selectedStage)) {
        setError('يوجد أدمن نشط لهذه المرحلة بالفعل. اختر مرحلة أخرى أو عطّل الحساب الحالي أولًا.');
        return;
      }
      if (creationMode === 'existing' && !selectedCandidate) {
        setError('ابحث عن حساب مسجل واختره أولًا.');
        return;
      }
      const payload = creationMode === 'existing'
        ? { userId: selectedCandidate.id, stage: selectedStage, grade: selectedStage, meetingGroup: newAdmin.meetingGroup }
        : { ...newAdmin, stage: selectedStage, grade: selectedStage };
      await api.createAdministrator(payload);
      setNewAdmin(blankAdmin);
      setSelectedCandidate(null);
      setSearchQuery('');
      setNotice(creationMode === 'existing' ? 'تم تعيين الحساب المسجل كأدمن للمرحلة.' : 'تم إنشاء حساب أدمن المرحلة.');
      await loadAdmins();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  const saveAdmin = async (id) => {
    setError(''); setNotice(''); setSaving(true);
    try {
      await api.updateAdministrator(id, drafts[id]);
      setNotice('تم حفظ صلاحيات المسؤول.');
      await loadAdmins();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  const deleteAdmin = async (admin) => {
    if (!admin?.id || admin.id === user?.id) return;
    const confirmed = window.confirm(`سيُحذف حساب «${admin.name}» من قاعدة البيانات. ستُنقل سجلاته الإدارية إلى حسابك، وستعود حسابات الطلاب المعيّنة إليه إلى قائمة غير المعيّنين. لا يمكن التراجع. متابعة؟`);
    if (!confirmed) return;
    setError(''); setNotice(''); setSaving(true);
    try {
      await api.deleteAdministrator(admin.id);
      setNotice('تم حذف حساب المسؤول مع الاحتفاظ بسجلاته الإدارية.');
      await loadAdmins();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
    <header>
      <h1 className="text-2xl font-extrabold text-white">إدارة المراحل والمسؤولين</h1>
      <p className="mt-1 text-sm leading-6 text-slate-400">عيّن مسؤول المرحلة من حساب مسجل أو أنشئ له حسابًا جديدًا، وأدر صلاحيات المسؤولين.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{notice}</p>}
    {!isGlobalAdmin && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">إدارة حسابات المسؤولين متاحة لمسؤول خدمة (أمين عام) فقط.</p>}

    {isGlobalAdmin && <>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div><h2 className="text-lg font-bold text-amber-300">إنشاء مسؤول مرحلة</h2><p className="mt-1 text-sm text-slate-400">تُحدد صلاحية مسؤول المرحلة من المرحلة المختارة، ويقتصر نطاقه على مرحلته أو اجتماعه.</p></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {grades.map((item) => {
            const assignedAdmins = activeStageAdmins(item.id);
            const assigned = assignedAdmins[0];
            return <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className={`mt-1 text-xs ${assignedAdmins.length > 1 ? 'text-rose-300' : assigned ? 'text-emerald-300' : 'text-amber-200'}`}>
                {assignedAdmins.length > 1 ? `يوجد ${assignedAdmins.length} مسؤولين نشطين؛ عطّل الزائد ليبقى مسؤول واحد` : assigned ? `المسؤول: ${assigned.name}` : 'لم يُعيّن مسؤول لهذه المرحلة بعد'}
              </p>
            </div>;
          })}
        </div>
        <form onSubmit={createAdmin} className="grid gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <button type="button" aria-pressed={creationMode === 'existing'} onClick={() => { setCreationMode('existing'); setSelectedCandidate(null); }} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${creationMode === 'existing' ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-200'}`}>استخدام حساب مسجل</button>
            <button type="button" aria-pressed={creationMode === 'new'} onClick={() => { setCreationMode('new'); setSelectedCandidate(null); }} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${creationMode === 'new' ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-200'}`}>إنشاء حساب جديد</button>
          </div>
          {creationMode === 'existing' ? <div className="space-y-3 sm:col-span-2">
            <label className="block text-xs text-slate-400">ابحث بالاسم أو اسم المستخدم أو الهاتف
              <input type="search" minLength={2} value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSelectedCandidate(null); }} className={inputClass} placeholder="اكتب حرفين أو أكثر" />
            </label>
            {searching && <p role="status" className="text-xs text-slate-400">جارٍ البحث عن الحسابات المسجلة...</p>}
            {searchQuery.trim().length >= 2 && !searching && !candidates.length && <p className="text-xs text-slate-500">لم يتم العثور على حساب مسجل بهذا البحث.</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {candidates.map((candidate) => <button key={candidate.id} type="button" aria-pressed={selectedCandidate?.id === candidate.id} onClick={() => setSelectedCandidate(candidate)} className={`rounded-xl border p-3 text-right transition ${selectedCandidate?.id === candidate.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
                <span dir="ltr" className="block text-left text-sm font-bold text-amber-200">{candidate.username}</span>
                <span className="mt-1 block text-sm font-semibold text-white">{candidate.name}</span>
                <span className="mt-1 block text-xs text-slate-400">{candidate.role === 'parent' ? 'ولي أمر' : 'مخدوم'} · {candidate.phone}{candidate.isActive ? '' : ' · حساب معطل'}</span>
              </button>)}
            </div>
            {hasMoreCandidates && <button type="button" disabled={searching} onClick={() => void loadMoreCandidates()} className="min-h-10 rounded-lg border border-slate-700 px-4 text-xs font-semibold text-slate-300 hover:border-amber-400 disabled:opacity-50">عرض نتائج أخرى</button>}
            {selectedCandidate && <p className="text-xs text-emerald-300">الحساب المختار: {selectedCandidate.username} · {selectedCandidate.name}</p>}
          </div> : <>
            <label className="text-xs text-slate-400">اسم المسؤول (7 أحرف على الأقل)<input required minLength={7} maxLength={160} value={newAdmin.name} onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })} className={inputClass} /></label>
            <label className="text-xs text-slate-400">اسم المستخدم (اختياري)<input dir="ltr" autoCapitalize="none" autoComplete="username" maxLength={160} value={newAdmin.username} onChange={(event) => setNewAdmin({ ...newAdmin, username: event.target.value })} className={inputClass} /></label>
            <PhoneField label="الهاتف" required value={newAdmin.phone} onChange={(phone) => setNewAdmin({ ...newAdmin, phone })} />
            <label className="text-xs text-slate-400">البريد الإلكتروني (اختياري)<input dir="ltr" autoComplete="email" type="email" pattern={adminEmailPattern} title="أدخل بريدًا إلكترونيًا صحيحًا" value={newAdmin.email} onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value.toLowerCase() })} className={inputClass} /></label>
            <label className="text-xs text-slate-400">كلمة المرور (8 أحرف على الأقل)<input required minLength={8} maxLength={256} type="password" value={newAdmin.password} onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })} className={inputClass} /></label>
          </>}
          <label className="text-xs text-slate-400">المرحلة<select required value={newAdmin.grade} onChange={(event) => setNewAdmin({ ...newAdmin, grade: event.target.value, meetingGroup: '' })} className={inputClass}><option value="">اختر المرحلة</option>{grades.map((item) => <option key={item.id} value={item.id} disabled={Boolean(activeStageAdmin(item.id))}>{item.label}{activeStageAdmin(item.id) ? ' — لها أدمن نشط' : ''}</option>)}</select></label>
          <label className="text-xs text-slate-400 sm:col-span-2">الاجتماع المحدد (اختياري)
            <AdminGroupSelect grade={newAdmin.grade} value={newAdmin.meetingGroup} onChange={(value) => setNewAdmin({ ...newAdmin, meetingGroup: value })} />
          </label>
          <button disabled={saving || !newAdmin.grade || Boolean(activeStageAdmin(newAdmin.grade)) || (creationMode === 'existing' && !selectedCandidate)} className="min-h-11 rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50 sm:col-span-2">{creationMode === 'existing' ? 'تعيين الحساب كمسؤول مرحلة' : 'إنشاء الحساب'}</button>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div><h2 className="text-lg font-bold text-amber-300">حسابات المسؤولين</h2><p className="mt-1 text-sm text-slate-400">يمكنك تفعيل الحساب أو نقله بين الإدارة العامة وإدارة مرحلة.</p></div>
        {admins.map((admin) => {
          const draft = drafts[admin.id] || {};
          return <article key={admin.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-white">{admin.name}</h3><p className="text-xs text-slate-500" dir="ltr">{admin.phone} · {admin.username}</p></div><span className="text-xs text-slate-400">{admin.role === 'admin' ? 'مسؤول خدمة (أمين عام)' : `مسؤول ${gradeLabel(admin.grade)}${admin.meetingGroup ? ` · ${admin.meetingGroup.name}` : ''}`}</span></div>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs text-slate-400">الصلاحية<select value={draft.role || (admin.role === 'admin' ? 'admin' : 'grade_admin')} onChange={(event) => updateAdminDraft(admin.id, 'role', event.target.value)} className={inputClass}><option value="grade_admin">مسؤول مرحلة</option><option value="admin">مسؤول خدمة (أمين عام)</option></select></label>
              {draft.role === 'grade_admin' && <>
                <label className="text-xs text-slate-400">المرحلة<select value={draft.grade} onChange={(event) => updateAdminDraft(admin.id, 'grade', event.target.value)} className={inputClass}>{grades.map((item) => <option key={item.id} value={item.id} disabled={Boolean(activeStageAdmin(item.id, admin.id))}>{item.label}{activeStageAdmin(item.id, admin.id) ? ' — لها أدمن نشط' : ''}</option>)}{draft.grade === 'primary' && <option value="primary">ابتدائي (حساب سابق)</option>}</select></label>
                <label className="text-xs text-slate-400 sm:col-span-2">الاجتماع (فارغ = المرحلة كاملة)<AdminGroupSelect grade={draft.grade} value={draft.meetingGroup} onChange={(value) => updateAdminDraft(admin.id, 'meetingGroup', value)} /></label>
              </>}
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={draft.isActive !== false} onChange={(event) => updateAdminDraft(admin.id, 'isActive', event.target.checked)} />الحساب مفعّل</label>
              <div className="flex flex-wrap gap-2 sm:col-span-4">
                <button type="button" disabled={saving} onClick={() => void saveAdmin(admin.id)} className="min-h-10 rounded-lg border border-amber-400/30 px-4 text-xs font-bold text-amber-200 disabled:opacity-50">حفظ الصلاحيات</button>
                <button type="button" disabled={saving || admin.id === user?.id} onClick={() => void deleteAdmin(admin)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-400/30 px-4 text-xs font-bold text-rose-200 disabled:opacity-50" aria-label={`حذف حساب ${admin.name}`}><Trash2 aria-hidden="true" className="h-4 w-4" />حذف المسؤول</button>
              </div>
            </div>
          </article>;
        })}
      </section>
    </>}
  </div>;
}

function AdminGroupSelect({ grade, value, onChange }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    let active = true;
    if (!grade) { setOptions([]); return () => { active = false; }; }
    api.adminMeetingGroups(grade, false).then((items) => { if (active) setOptions(items); }).catch(() => { if (active) setOptions([]); });
    return () => { active = false; };
  }, [grade]);
  return <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
    <option value="">كل اجتماعات المرحلة</option>
    {options.filter((item) => item.isActive).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
  </select>;
}
