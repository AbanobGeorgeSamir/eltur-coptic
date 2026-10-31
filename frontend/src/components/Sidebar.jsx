import { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Calendar,
  CheckSquare,
  Award,
  Users,
  Image,
  Shield,
  Layers,
  Sparkles,
  MapPin,
  Heart,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { isGradeAdminRole } from '../data/grades';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef(null);

  const isGlobalAdmin = user?.role === 'admin';
  const isStageAdmin = isGradeAdminRole(user?.role);
  const isStudent = user?.role === 'student';
  const isParent = user?.role === 'parent';

  // Section title based on role
  const sectionLabel = isGlobalAdmin
    ? 'الإدارة العامة'
    : isStageAdmin
    ? 'إدارة المرحلة'
    : isParent
    ? 'بوابة ولي الأمر'
    : 'خدمات الكنيسة';

  const studentLinks = [
    ['/', 'الرئيسية', Home],
    ['/bible', 'الإنجيل', BookOpen],
    ['/agpeya', 'الأجبية', BookOpen],
    ['/liturgy', 'القداسات', Calendar],
    ['/tasks', 'الواجبات', CheckSquare],
    ['/quizzes', 'المسابقات', Award],
    ['/trips', 'الرحلات', MapPin],
    ['/confession', 'الاعتراف', Heart],
    ['/sunday-school', 'مدارس الأحد', Sparkles],
    ['/prayer-checklist', 'متابعة الصلاة', CheckSquare],
    ['/gallery', 'معرض الصور', Image],
  ];

  const parentLinks = [
    ['/', 'الرئيسية', Home],
    ['/bible', 'الإنجيل', BookOpen],
    ['/agpeya', 'الأجبية', BookOpen],
    ['/liturgy', 'القداسات', Calendar],
    ['/tasks', 'واجبات الأبناء', CheckSquare],
    ['/quizzes', 'مسابقات الأبناء', Award],
    ['/trips', 'الرحلات والتسجيل', MapPin],
    ['/gallery', 'معرض الصور', Image],
  ];

  const adminLinks = isGlobalAdmin
    ? [
        ['/', 'الرئيسية', Home],
        ['/admin-students', 'إدارة الطلاب', Users],
        ['/admin-attendance', 'تسجيل الحضور', Calendar],
        ['/admin-access', 'المراحل والخدام', Shield],
        ['/admin-tasks', 'تكليف الواجبات', CheckSquare],
        ['/quizzes', 'المسابقات والنتائج', Award],
        ['/trips', 'الرحلات والتسجيل', MapPin],
        ['/admin-verse', 'آية اليوم', Sparkles],
        ['/admin-daily-reading', 'القراءة اليومية', BookOpen],
        ['/admin-newsletter', 'الرحلات والإعلانات', Layers],
        ['/admin-gallery', 'إدارة المعرض', Image],
        ['/admin-liturgy', 'إدارة القداسات', Calendar],
        ['/bible', 'الإنجيل', BookOpen],
        ['/agpeya', 'الأجبية', BookOpen],
      ]
    : isStageAdmin
    ? [
        ['/', 'الرئيسية', Home],
        ['/admin-students', 'طلاب المرحلة', Users],
        ['/admin-attendance', 'حضور المرحلة', Calendar],
        ['/admin-tasks', 'واجبات المرحلة', CheckSquare],
        ['/quizzes', 'المسابقات', Award],
        ['/trips', 'الرحلات والتسجيل', MapPin],
        ['/admin-access', 'مجموعات المرحلة', Shield],
        ['/admin-newsletter', 'الرحلات والإعلانات', Layers],
        ['/bible', 'الإنجيل', BookOpen],
        ['/agpeya', 'الأجبية', BookOpen],
      ]
    : studentLinks;

  const links = isParent ? parentLinks : isStudent ? studentLinks : adminLinks;

  // Split links for compact horizontal subnav: first 4 visible, rest under "المزيد"
  const primaryLinks = links.slice(0, 4);
  const secondaryLinks = links.slice(4);

  // Close "more" popover on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const LinkItem = ({ item, compact = false, onClick }) => {
    const [path, label, Icon] = item;
    return (
      <NavLink
        to={path}
        end={path === '/'}
        onClick={onClick}
        className={({ isActive }) =>
          `group flex items-center gap-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
            compact ? 'min-h-9 px-3 py-1.5' : 'min-h-11 px-3 py-2.5'
          } ${
            isActive
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/20'
              : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 ${
                isActive ? 'text-slate-950' : 'text-amber-400/90'
              }`}
            />
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>
    );
  };

  const openMore = (event) => {
    moreTriggerRef.current = event.currentTarget;
    setMoreOpen(true);
  };

  return (
    <>
      <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] w-64 shrink-0 flex-col border-l border-white/[0.07] bg-slate-950/70 p-4 lg:flex">
        <div className="mb-4 px-3 pt-2">
          <p className="text-[10px] font-bold text-amber-300/70">كنيسة موسي النبي ومارمرقس الرسول - طور سيناء</p>
          <h2 className="mt-1 text-sm font-bold text-white">{sectionLabel}</h2>
        </div>
        <nav aria-label="التنقل الرئيسي" className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-none">
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
          <button type="button" onClick={openMore} className="mr-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-200 transition-all duration-200 ease-out hover:border-amber-400/40 hover:text-amber-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            <span>المزيد</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center p-3 animate-fade-in" onClick={() => setMoreOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-amber-300">{sectionLabel} - المزيد</span>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto">
              {secondaryLinks.map((item) => (
                <LinkItem key={item[0]} item={item} compact onClick={() => setMoreOpen(false)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
