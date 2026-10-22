import { useEffect, useRef, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Bus,
  Calendar,
  CheckSquare,
  FileText,
  Heart,
  Home,
  Image as ImageIcon,
  Menu,
  Quote,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { isGradeAdminRole } from '../data/grades';

const linksByRole = {
  student: [
    ['/', 'الرئيسية', Home],
    ['/bible', 'الإنجيل', BookOpen],
    ['/agpeya', 'الأجبية', BookOpen],
    ['/sunday-school', 'مدارس الأحد', FileText],
    ['/quizzes', 'الاختبارات', FileText],
    ['/tasks', 'المهام', CheckSquare],
    ['/trips', 'الرحلات والتسجيل', Bus],
    ['/prayers', 'صلوات اليوم', CheckSquare],
    ['/liturgy', 'مواعيد القداسات', Calendar],
    ['/gallery', 'المعرض', ImageIcon],
    ['/confession', 'الاعتراف', Heart],
    ['/profile', 'الملف الشخصي', User],
  ],
  admin: [
    ['/', 'الرئيسية', Home],
    ['/admin-students', 'الطلاب', Users],
    ['/admin-attendance', 'الحضور', UserCheck],
    ['/admin-tasks', 'المهام', CheckSquare],
    ['/sunday-school', 'مدارس الأحد', FileText],
    ['/quizzes', 'الاختبارات والنتائج', FileText],
    ['/admin-newsletter', 'الإعلانات والدروس', Bell],
    ['/trips', 'الرحلات والتحصيل', Bus],
    ['/admin-gallery', 'إدارة المعرض', ImageIcon],
    ['/admin-liturgy', 'مواعيد القداسات', Calendar],
    ['/admin-daily-reading', 'القراءة اليومية', BookOpen],
    ['/admin-verse', 'آية للجميع', Quote],
    ['/admin-access', 'إدارة المراحل والمسؤولين', ShieldCheck],
    ['/agpeya', 'الأجبية', BookOpen],
    ['/bible', 'الإنجيل', BookOpen],
    ['/prayers', 'متابعة الصلوات', CheckSquare],
    ['/confession', 'سجلات الاعتراف', Heart],
  ],
  parent: [
    ['/', 'الرئيسية', Home],
    ['/father-dashboard', 'متابعة الأبناء', Award],
    ['/trips', 'الرحلات', Bus],
    ['/prayers', 'صلوات الأبناء', CheckSquare],
    ['/bible', 'الإنجيل', BookOpen],
    ['/agpeya', 'الأجبية', BookOpen],
  ],
};

const primaryByRole = {
  student: ['/', '/bible', '/agpeya', '/tasks'],
  admin: ['/', '/admin-students', '/admin-attendance', '/admin-tasks'],
  grade_admin: ['/', '/admin-students', '/admin-attendance', '/admin-tasks'],
  parent: ['/', '/father-dashboard', '/prayers', '/bible'],
};

function LinkItem({ item, onNavigate, compact = false }) {
  const [path, label, Icon] = item;
  return (
    <NavLink
      to={path}
      end={path === '/'}
      onClick={onNavigate}
      className={({ isActive }) => `group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${isActive ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-950/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'} ${compact ? 'shrink-0 whitespace-nowrap' : ''}`}
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ userRole }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const location = useLocation();
  const links = isGradeAdminRole(userRole)
    ? linksByRole.admin.filter(([path]) => !['/admin-verse', '/admin-daily-reading'].includes(path))
    : linksByRole[userRole] || linksByRole.student;
  const primaryPaths = (isGradeAdminRole(userRole) ? primaryByRole.grade_admin : primaryByRole[userRole]) || primaryByRole.student;
  const primaryLinks = primaryPaths.map((path) => links.find(([itemPath]) => itemPath === path)).filter(Boolean);
  const secondaryLinks = links.filter(([path]) => !primaryPaths.includes(path));
  const sectionLabel = userRole === 'admin' || isGradeAdminRole(userRole)
    ? 'إدارة الخدمة'
    : userRole === 'parent'
      ? 'متابعة الأبناء'
      : 'الخدمات الكنسية';

  useEffect(() => setMoreOpen(false), [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscapeAndTrapFocus = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('a[href], button:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    window.addEventListener('keydown', closeOnEscapeAndTrapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscapeAndTrapFocus);
      moreTriggerRef.current?.focus();
    };
  }, [moreOpen]);

  const openMore = (event) => {
    moreTriggerRef.current = event.currentTarget;
    setMoreOpen(true);
  };

  return (
    <>
      <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] w-64 shrink-0 flex-col border-l border-white/[0.07] bg-slate-950/70 p-4 lg:flex">
        <div className="mb-4 px-3 pt-2">
          <p className="text-[10px] font-bold text-amber-300/70">كنيسة موسي النبي ومارمرقس الرسول</p>
          <h2 className="mt-1 text-sm font-bold text-white">{sectionLabel}</h2>
        </div>
        <nav aria-label="التنقل الرئيسي" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {links.map((item) => <LinkItem key={item[0]} item={item} />)}
        </nav>
        <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-xs leading-5 text-slate-500">
          معاً في حياة روحية وخدمة يومية.
        </p>
      </aside>

      <nav aria-label="التنقل السريع" className="scrollbar-none sticky top-[60px] z-30 hidden overflow-x-auto overscroll-x-contain border-b border-white/[0.07] bg-slate-950/90 px-4 py-2.5 backdrop-blur-xl sm:flex sm:items-center sm:gap-1 lg:hidden">
        <span className="ml-2 shrink-0 text-[11px] font-bold text-amber-300/75">{sectionLabel}</span>
        {primaryLinks.map((item) => <LinkItem key={item[0]} item={item} compact />)}
        {secondaryLinks.length > 0 && (
          <button type="button" onClick={openMore} className="mr-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-200 transition hover:border-amber-400/40 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            <Menu aria-hidden="true" className="h-4 w-4" /> كل الأقسام
          </button>
        )}
      </nav>

      <nav aria-label="التنقل السريع" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-lg gap-1" style={{ gridTemplateColumns: `repeat(${primaryLinks.length + 1}, minmax(0, 1fr))` }}>
          {primaryLinks.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${isActive ? 'bg-amber-400/12 text-amber-300' : 'text-slate-400 hover:text-white'}`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="max-w-full truncate px-1">{label}</span>
            </NavLink>
          ))}
          <button type="button" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={openMore} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${moreOpen ? 'bg-amber-400/12 text-amber-300' : 'text-slate-400 hover:text-white'}`}>
            <Menu aria-hidden="true" className="h-5 w-5" />
            <span>المزيد</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false); }}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="more-menu-title" className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
            <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-bold text-amber-300">{sectionLabel}</p>
                <h2 id="more-menu-title" className="mt-1 text-lg font-bold text-white">كل أقسام البوابة</h2>
              </div>
              <button ref={closeButtonRef} type="button" aria-label="إغلاق القائمة" onClick={() => setMoreOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </header>
            <nav aria-label="جميع الأقسام" className="grid max-h-[65dvh] grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 sm:p-5">
              {links.map((item) => <LinkItem key={item[0]} item={item} onNavigate={() => setMoreOpen(false)} />)}
            </nav>
          </section>
        </div>
      )}
    </>
  );
}
