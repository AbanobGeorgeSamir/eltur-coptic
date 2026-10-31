import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import PhoneField from '../components/PhoneField';
import { isValidComEmail, normalizeEmail } from '../utils/email';
import { grades, gradeLabel, isGradeAdminRole } from '../data/grades';
import { ACADEMIC_YEARS, COLLEGES } from '../data/expatriatesData';

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
  academicYear: user?.academicYear || '',
  college: user?.college || '',
});

export default function Profile({ showToast }) {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => initialForm(user));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const update = (key, value) => setForm((old) => ({
    ...old,
    [key]: value,
    ...(key === 'grade' && value !== 'expatriates' ? { academicYear: '', college: '' } : {}),
  }));

  const isExpatriate = user?.grade === 'expatriates' || form.grade === 'expatriates';

  const save = async (event) => {
    event.preventDefault();
    setError('');
    const email = normalizeEmail(form.email);
    if (email && !isValidComEmail(email)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    if (isExpatriate && (!form.academicYear || !form.college)) {
      setError('يرجى اختيار الفرقة والكلية لمرحلة المغتربين.');
      return;
    }
    setSaving(true);
    try {
      const profilePayload = {
        ...form,
        email,
      };
      delete profilePayload.academicYear;
      delete profilePayload.college;
      if (user?.role === 'student') {
        if (user.grade) delete profilePayload.grade;
        if (isExpatriate) {
          profilePayload.academicYear = form.academicYear;
          profilePayload.college = form.college;
        }
      } else {
        delete profilePayload.grade;
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
          {user?.grade === 'expatriates' && (user?.college || user?.academicYear) && (
            <p className="mt-1 flex flex-wrap gap-2 text-xs">
              {user.college && <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 font-bold text-amber-300">{user.college}</span>}
              {user.academicYear && <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 font-bold text-amber-300">{user.academicYear}</span>}
            </p>
          )}
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
            البريد الإلكتروني (اختياري)
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
          {user?.role === 'student' && !user.grade && (
            <label className="block text-xs text-slate-400">المرحلة الدراسية (تُحدد مرة واحدة)
              <select required value={form.grade} onChange={(event) => setForm((old) => ({ ...old, grade: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-sm text-white">
                <option value="">اختر المرحلة</option>
                {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
              </select>
            </label>
          )}

          {isExpatriate && (
            <>
              <label className="block text-xs font-semibold text-amber-300">
                الفرقة
                <select
                  value={form.academicYear}
                  onChange={(e) => update('academicYear', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-amber-400/40 bg-slate-800 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="">اختر</option>
                  {ACADEMIC_YEARS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-amber-300">
                الكلية
                <select
                  value={form.college}
                  onChange={(e) => update('college', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-amber-400/40 bg-slate-800 p-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="">اختر</option>
                  {COLLEGES.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </label>
            </>
          )}

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
            <div className="flex gap-2">
              <button disabled={deleting} className="min-h-11 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50">تأكيد حذف الحساب نهائيًا</button>
              <button type="button" onClick={() => setDeleteOpen(false)} className="min-h-11 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">إلغاء</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
