import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(name, password);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-3 py-8 sm:px-5 sm:py-12" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/35 sm:p-8 animate-fade-in-up">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center overflow-hidden rounded-[1.35rem] border border-amber-200/30 bg-amber-100 shadow-lg shadow-amber-950/20">
            <img src="/favicon.png" alt="" width="64" height="64" className="h-full w-full object-cover" />
          </span>
          <p className="text-xs font-bold text-amber-300">كنيسة موسى النبي ومارمرقس الرسول</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white">تسجيل الدخول</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">تابع قراءاتك وخدمتك من مكان واحد.</p>
        </div>
        <label className="mb-4 block text-sm font-semibold text-slate-300">اسم المستخدم أو البريد الإلكتروني
          <input required autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white transition-all duration-200 ease-out focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:shadow-[0_0_16px_rgba(251,191,36,0.12)]" />
        </label>
        <label className="mb-4 block text-sm font-semibold text-slate-300">كلمة المرور
          <div className="relative mt-2">
            <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pr-3 pl-11 text-white transition-all duration-200 ease-out focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:shadow-[0_0_16px_rgba(251,191,36,0.12)]" />
            <button type="button" tabIndex={-1} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-amber-300">
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </label>
        {error && <p role="alert" aria-live="polite" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm leading-6 text-rose-200 animate-fade-in">{error}</p>}
        <button disabled={loading} className="relative min-h-12 w-full rounded-xl bg-amber-400 px-5 py-3 font-extrabold text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              جارٍ تسجيل الدخول...
            </span>
          ) : 'تسجيل الدخول'}
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">ليس لديك حساب؟ <Link to="/register" className="font-bold text-amber-300 underline-offset-4 hover:underline">إنشاء حساب</Link></p>
        <p className="mt-6 border-t border-white/[0.08] pt-4 text-center text-xs text-slate-500"><Link to="/privacy" className="underline decoration-white/20 underline-offset-4 hover:text-slate-300">سياسة الخصوصية</Link></p>
      </form>
    </main>
  );
}
