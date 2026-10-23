import { useState, useEffect, useRef } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import kenesaIcon from '../images/kenesa-icon.png';
import { isAdminRole } from '../data/grades';

export default function Navbar({ showToast, onRefresh }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        setVisible(false); // scrolling down
      } else if (currentY < lastScrollY.current - 5) {
        setVisible(true); // scrolling up
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
    showToast('تم تسجيل الخروج بنجاح');
  };

  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-amber-500/20 bg-slate-900/80 px-3 py-2.5 shadow-lg sm:px-4 sm:py-3 md:px-8 glass-header transition-all duration-300 ease-out ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      style={{ borderImage: 'linear-gradient(to left, rgba(251,191,36,0.3), rgba(251,191,36,0.05), rgba(251,191,36,0.3)) 1' }}
    >
      <button onClick={() => navigate('/')} className="flex min-w-0 items-center gap-2 text-right sm:gap-3">
        <img src={kenesaIcon} alt="كنيسة موسي النبي ومارمرقس الرسول" width="40" height="40" loading="eager" fetchPriority="high" decoding="async" className="h-9 w-9 shrink-0 rounded-full border border-amber-500/40 bg-white object-cover sm:h-10 sm:w-10" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-white sm:text-base">بوابة الكنيسة</span>
          <span className="block max-w-[170px] truncate text-[10px] text-amber-400 sm:max-w-[260px] sm:text-xs">كنيسة موسي النبي ومارمرقس الرسول</span>
          <span className="hidden sm:block text-xs text-slate-400">{user?.name || ''}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden sm:block text-xs text-slate-300">
          {isAdminRole(user?.role) ? (user?.role === 'admin' ? 'إدارة عامة' : 'إدارة المرحلة') : user?.role === 'parent' ? 'ولي أمر' : 'المخدوم'}
        </span>
        <button type="button" aria-label="تحديث بيانات الصفحة" title="تحديث بيانات الصفحة" onClick={onRefresh} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-700 text-slate-200 transition-all duration-200 ease-out hover:border-amber-400/50 hover:text-amber-300 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        </button>
        <button aria-label="تسجيل الخروج" onClick={handleLogout} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-red-500/20 px-2.5 py-2 text-xs font-bold text-red-300 transition-all duration-200 ease-out hover:bg-red-500/10 hover:scale-105 active:scale-95 sm:gap-2 sm:px-3">
          <LogOut className="h-4 w-4" /><span>خروج</span>
        </button>
      </div>
    </header>
  );
}
