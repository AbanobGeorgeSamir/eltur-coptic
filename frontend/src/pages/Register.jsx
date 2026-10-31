import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import PhoneField from '../components/PhoneField';
import ThemeToggle from '../components/ThemeToggle';
import { isValidComEmail, normalizeEmail } from '../utils/email';
import { grades } from '../data/grades';
import { academicYears, collegeGroups } from '../data/colleges';
import { getBirthDateFromNationalId } from '../utils/egyptianNationalId';

const fields = [
  ['name', 'الاسم رباعي', 'text'], ['username', 'اسم المستخدم', 'text'],
  ['email', 'البريد الإلكتروني (اختياري)', 'email'],
  ['password', 'كلمة المرور (8 أحرف على الأقل)', 'password'], ['fatherName', 'اسم الأب', 'text'],
  ['confessionFather', 'أب الاعتراف', 'text'],
  ['address', 'العنوان', 'text'], ['birthDate', 'تاريخ الميلاد', 'date'], ['nationalId', 'الرقم القومي (14 رقم)', 'text'],
];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    fatherName: '',
    confessionFather: '',
    guardianPhone: '',
    address: '',
    interests: '',
    birthDate: '',
    nationalId: '',
    gender: 'male',
    grade: '',
    academicYear: '',
    college: '',
    privacyAccepted: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fatherNameManuallyEdited = useRef(false);
  const usernameManuallyEdited = useRef(false);
  const navigate = useNavigate();
  const { saveSession } = useAuth();

  const updateField = (key, value) => {
    if (key === 'fatherName') fatherNameManuallyEdited.current = true;
    if (key === 'username') usernameManuallyEdited.current = true;
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'grade' && value !== 'expatriates') {
        next.academicYear = '';
        next.college = '';
      }
      if (key === 'nationalId') {
        const birthDate = getBirthDateFromNationalId(value);
        if (birthDate) next.birthDate = birthDate;
      }
      if (key === 'name' && !fatherNameManuallyEdited.current) {
        next.fatherName = value.trim().split(/\s+/)[1] || '';
      }
      if (key === 'name' && !usernameManuallyEdited.current) {
        next.username = value.trim().split(/\s+/)[0] || '';
      }
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.name.trim().split(/\s+/).length < 4) {
      setError('يرجى إدخال الاسم رباعياً.');
      return;
    }
    if (form.email.trim() && !isValidComEmail(form.email)) {
      setError('أدخل بريداً إلكترونياً صحيحاً بلا مسافات.');
      return;
    }
    if (!form.interests.trim()) {
      setError('يرجى كتابة اهتمام واحد على الأقل.');
      return;
    }
    if (!/^[0-9]{14}$/.test(form.nationalId)) {
      setError('أدخل الرقم القومي المكوّن من 14 رقماً.');
      return;
    }
    if (!form.grade) {
      setError('يرجى اختيار المرحلة الدراسية أو الاجتماع.');
      return;
    }
    if (form.grade === 'expatriates') {
      if (!form.academicYear) {
        setError('يرجى اختيار الفرقة الدراسية لمرحلة المغتربين.');
        return;
      }
      if (!form.college) {
        setError('يرجى اختيار الكلية لمرحلة المغتربين.');
        return;
      }
    }
    if (!form.privacyAccepted) {
      setError('يرجى قراءة سياسة الخصوصية والموافقة عليها للمتابعة.');
      return;
    }
    setLoading(true);
    try {
      const registration = {
        ...form,
        name: form.name.trim().replace(/\s+/g, ' '),
        username: form.username.trim().toLowerCase(),
        email: normalizeEmail(form.email),
        interests: form.interests.trim(),
        academicYear: form.grade === 'expatriates' ? form.academicYear : undefined,
        college: form.grade === 'expatriates' ? form.college : undefined,
      };
      const session = await api.register(registration);
      saveSession(session);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center px-3 py-8 sm:px-5 sm:py-12" dir="rtl">
      <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 sm:left-6 sm:top-6">
        <ThemeToggle />
      </div>
      <form onSubmit={submit} className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/35 sm:p-7 md:p-9">
        <div className="mb-7 flex items-center gap-3 sm:gap-4">
          <img src="/favicon.png" alt="" width="56" height="56" className="h-12 w-12 shrink-0 rounded-2xl border border-amber-300/25 bg-amber-100 object-cover sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-300">بوابة كنيسة موسي النبي ومارمرقس الرسول - طور سيناء</p>
            <h1 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">استمارة تسجيل بيانات الخادم/المخدوم</h1>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">المرحلة الدراسية
            <select
              required
              value={form.grade}
              onChange={(event) => updateField('grade', event.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">اختر المرحلة</option>
              {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
            </select>
            <span className="mt-1 block text-xs leading-5 text-slate-500">سيظهر طلب التسجيل للأدمن لاختيار المجموعة أو رفض الطلب.</span>
          </label>

          {form.grade === 'expatriates' && (
            <div className="grid animate-fade-in gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4 sm:col-span-2 sm:grid-cols-2">
              <p className="text-xs font-bold text-amber-300 sm:col-span-2">بيانات مرحلة المغتربين</p>
              <label className="text-sm font-bold text-amber-300">
                الفرقة *
                <select
                  required
                  value={form.academicYear}
                  onChange={(e) => setForm((old) => ({ ...old, academicYear: e.target.value }))}
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-amber-400/40 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                >
                  <option value="">اختر</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-medium text-amber-200/70">حدد الفرقة الجامعية أو سنة الدراسة</span>
              </label>

              <label className="text-sm font-bold text-amber-300">
                الكلية *
                <select
                  required
                  value={form.college}
                  onChange={(e) => setForm((old) => ({ ...old, college: e.target.value }))}
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-amber-400/40 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                >
                  <option value="">اختر</option>
                  {collegeGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.colleges.map((college) => (
                        <option key={college} value={college}>{college}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-medium text-amber-200/70">اختر كليتك أو تخصصك الدراسي</span>
              </label>
            </div>
          )}

          {fields.map(([key, label, type]) => (
            <label key={key} className="text-sm text-slate-300">{label}
              <input required={key !== 'email'} type={type} autoComplete={key === 'username' ? 'username' : key === 'email' ? 'email' : key === 'name' ? 'name' : key === 'password' ? 'new-password' : undefined} inputMode={key === 'nationalId' ? 'numeric' : undefined} minLength={key === 'password' ? 8 : key === 'nationalId' ? 14 : undefined} maxLength={key === 'nationalId' ? 14 : key === 'username' ? 64 : undefined}
                value={form[key]} onChange={(e) => updateField(key, e.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
            </label>
          ))}
          <PhoneField label="رقم الهاتف" required value={form.phone} onChange={(phone) => setForm((old) => ({ ...old, phone }))} />
          <PhoneField label="هاتف ولي الأمر" required value={form.guardianPhone} onChange={(guardianPhone) => setForm((old) => ({ ...old, guardianPhone }))} />
          <label className="text-sm text-slate-300">النوع
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none">
              <option value="male">ذكر</option><option value="female">أنثى</option>
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold text-slate-300">اهتماماتك *</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">اكتب اهتمامًا أو أكثر بحرية. تُحفظ مع ملفك الشخصي.</p>
            <textarea required maxLength={500} rows={3} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="اكتب اهتماماتك هنا..." className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
            <p className="mt-1 text-left text-xs text-slate-500">{form.interests.length}/500</p>
          </fieldset>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
          <input required type="checkbox" checked={form.privacyAccepted} onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-amber-400" />
          <span>قرأت ووافقت على <Link to="/privacy" target="_blank" rel="noreferrer" className="font-bold text-amber-300 underline decoration-amber-300/40 underline-offset-4">سياسة الخصوصية واستخدام البيانات</Link>.</span>
        </label>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm leading-6 text-rose-200">{error}</p>}
        <button disabled={loading} className="mt-5 min-h-12 w-full rounded-xl bg-amber-400 px-5 py-3 font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">
          {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">لديك حساب؟ <Link to="/login" className="font-bold text-amber-300 underline-offset-4 hover:underline">تسجيل الدخول</Link></p>
      </form>
    </main>
  );
}
