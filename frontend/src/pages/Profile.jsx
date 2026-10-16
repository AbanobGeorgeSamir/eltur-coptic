import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import PhoneField from '../components/PhoneField';
import { isValidComEmail, normalizeEmail } from '../utils/email';
import { grades, gradeLabel, isGradeAdminRole } from '../data/grades';

const initialForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  interests: user?.interests || '',
  phone: user?.phone || '',
  confessionFather: user?.confessionFather || '',
  fatherName: user?.fatherName || '',
  guardianPhone: user?.guardianPhone || '',
  whatsappNumber: user?.whatsappNumber || '',
  address: user?.address || '',
  isDeacon: Boolean(user?.isDeacon),
  grade: user?.grade || '',
  meetingGroup: user?.meetingGroup || '',
});

export default function Profile({ showToast }) {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => initialForm(user));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [meetingGroups, setMeetingGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    let active = true;
    if (user?.role !== 'student' || user.grade || !form.grade) {
      setMeetingGroups([]);
      return () => { active = false; };
    }
    setGroupsLoading(true);
    api.meetingGroups(form.grade)
      .then((groups) => { if (active) setMeetingGroups(groups); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setGroupsLoading(false); });
    return () => { active = false; };
  }, [user?.role, user?.grade, form.grade]);

  const save = async (event) => {
    event.preventDefault();
    setError('');
    const email = normalizeEmail(form.email);
    if (email && !isValidComEmail(email)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا ينتهي بـ .com.');
      return;
    }
    setSaving(true);
    try {
      const profilePayload = {
        ...form,
        email,
      };
      if (user?.role !== 'student' || user.grade) {
        delete profilePayload.grade;
        delete profilePayload.meetingGroup;
      }
      const result = await api.updateProfile(profilePayload);
      updateUser(result.user);
      setForm((old) => ({ ...old, ...initialForm(result.user) }));
      showToast?.('تم حفظ بيانات الملف الشخصي');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    setDeleteError('');
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword);
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <section className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
        {user?.picture && !pictureFailed ? (
          <img
            src={user.picture}
            alt="الصورة الشخصية"
            onError={() => setPictureFailed(true)}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-2xl text-amber-300">
            {user?.name?.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">{user?.name}</h1>
          <p className="text-sm text-amber-300">
            {user?.role === 'admin' ? 'الأدمن العام' : isGradeAdminRole(user?.role) ? `أدمن ${gradeLabel(user.grade)}` : user?.confessionFather || ''}
          </p>
          <p className="mt-1 break-all text-xs text-slate-400" dir="ltr">
            {[user?.email, user?.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
      </section>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
        <h2 className="font-bold text-amber-300">تعديل البيانات الشخصية</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            الاسم رباعي
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            البريد الإلكتروني (.com) (اختياري)
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-left text-white"
            />
          </label>
          <PhoneField
            label="هاتف الحساب"
            required
            value={form.phone}
            onChange={(phone) => update('phone', phone)}
          />
          {user?.role === 'student' && !user.grade && <>
            <label className="block text-xs text-slate-400">المرحلة الدراسية (تُحدد مرة واحدة)
              <select required value={form.grade} onChange={(event) => setForm((old) => ({ ...old, grade: event.target.value, meetingGroup: '' }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white">
                <option value="">اختر المرحلة</option>
                {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
              </select>
            </label>
            {meetingGroups.length > 0 && <label className="block text-xs text-slate-400">الاجتماع الفرعي
              <select required value={form.meetingGroup} disabled={groupsLoading} onChange={(event) => update('meetingGroup', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white disabled:opacity-60">
                <option value="">{groupsLoading ? 'جارٍ تحميل الاجتماعات...' : 'اختر الاجتماع'}</option>
                {meetingGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>}
          </>}
          <label className="block text-xs text-slate-400">
            اسم الأب
            <input
              type="text"
              value={form.fatherName}
              onChange={(event) => update('fatherName', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            أب الاعتراف
            <input
              type="text"
              value={form.confessionFather}
              onChange={(event) => update('confessionFather', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            العنوان
            <input
              type="text"
              value={form.address}
              onChange={(event) => update('address', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"
            />
          </label>
          <label className="block text-xs text-slate-400 sm:col-span-2">
            اهتماماتك
            <textarea
              maxLength={500}
              rows={3}
              value={form.interests}
              onChange={(event) => update('interests', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white"
            />
          </label>
          <PhoneField
            label="هاتف ولي الأمر"
            value={form.guardianPhone}
            onChange={(guardianPhone) => update('guardianPhone', guardianPhone)}
          />
          <PhoneField
            label="رقم واتساب"
            value={form.whatsappNumber}
            onChange={(whatsappNumber) => update('whatsappNumber', whatsappNumber)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.isDeacon}
            onChange={(event) => update('isDeacon', event.target.checked)}
          />
          شماس
        </label>
        <p className="text-xs text-slate-500">
          سيظهر البريد الإلكتروني إذا أُدخل، والهاتف المحفوظ في بطاقة الملف الشخصي بعد الحفظ.
        </p>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button
          disabled={saving}
          className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
        </button>
      </form>
      <section className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-5 md:p-6">
        <h2 className="font-bold text-rose-200">حذف الحساب</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">سيُحذف حسابك والسجلات الشخصية المرتبطة به. لا يمكن التراجع عن هذا الإجراء.</p>
        {!deleteOpen ? (
          <button type="button" onClick={() => setDeleteOpen(true)} className="mt-4 min-h-11 rounded-xl border border-rose-400/40 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/10">حذف حسابي</button>
        ) : (
          <form onSubmit={deleteAccount} className="mt-4 space-y-3">
            <label className="block text-sm text-slate-300">أدخل كلمة المرور للتأكيد
              <input required type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            </label>
            {deleteError && <p role="alert" className="text-sm text-rose-300">{deleteError}</p>}
            <div className="flex flex-wrap gap-2">
              <button disabled={deleting} className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{deleting ? 'جارٍ حذف الحساب...' : 'تأكيد الحذف'}</button>
              <button type="button" disabled={deleting} onClick={() => { setDeleteOpen(false); setDeletePassword(''); setDeleteError(''); }} className="min-h-11 rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200">إلغاء</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
