import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, CheckSquare, Heart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import churchIcon from '../images/kenesa-icon.png';
import ThemeToggle from '../components/ThemeToggle';
import UpcomingSynaxarium from '../components/UpcomingSynaxarium';
import FathersSection from '../components/FathersSection';

const features = [
  { icon: BookOpen, title: 'الأجبية والإنجيل', text: 'صلوات وقراءات يومية، مع وصول سريع إلى السفر والإصحاح والآية.' },
  { icon: CheckSquare, title: 'مسيرتك الروحية', text: 'تابع صلواتك ومهامك الأسبوعية بسهولة ومن مكان واحد.' },
  { icon: CalendarDays, title: 'الحياة الكنسية', text: 'اعرف مواعيد القداسات والأنشطة والدروس القادمة.' },
  { icon: Users, title: 'خدمة مترابطة', text: 'مساحة آمنة للطلاب والأسر والخدام لمتابعة الخدمة.' },
];

function useParallax() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY * 0.25);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return offset;
}

export default function PublicHome() {
  const parallaxOffset = useParallax();

  return (
    <main className="min-h-dvh overflow-hidden text-slate-100" dir="rtl">
      <a href="#sections" className="skip-link">انتقل إلى المحتوى</a>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-slate-950/85 glass-header">
        <nav aria-label="التنقل الرئيسي" className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex min-w-0 items-center gap-2.5 text-white sm:gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-300/30 bg-amber-200 shadow-lg shadow-amber-950/20 sm:h-11 sm:w-11">
              <img src={churchIcon} alt="" width="44" height="44" loading="eager" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold sm:text-base">كنيسة موسي النبي ومارمرقس الرسول - طور سيناء</span>
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link to="/login" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-white/10 px-3 text-xs font-bold text-white transition-all duration-200 ease-out hover:border-amber-300/40 hover:bg-white/5 hover:scale-105 active:scale-95 sm:min-h-10 sm:px-4 sm:text-sm">تسجيل الدخول</Link>
            <Link to="/register" className="inline-flex min-h-9 items-center justify-center rounded-xl bg-amber-400 px-3 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-950/25 transition-all duration-200 ease-out hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 sm:min-h-10 sm:px-4 sm:text-sm">إنشاء حساب</Link>
          </div>
        </nav>
      </header>

      <section id="home" className="relative isolate mx-auto grid min-h-[min(760px,calc(100dvh-68px))] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-8 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-4 -z-10 h-80 w-80 rounded-full bg-amber-400/10 blur-[100px] gpu-accelerated" style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }} />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-0 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[110px] gpu-accelerated" style={{ transform: `translateY(${-parallaxOffset * 0.3}px)` }} />
        <div className="max-w-2xl animate-fade-in-up">
          <p className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3.5 py-2 text-xs font-bold text-amber-200 sm:text-sm">
            بوابة أبناء وخدام طور سيناء
          </p>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.3] tracking-tight text-white sm:text-5xl lg:text-6xl">
            حياة الكنيسة، <span className="text-amber-300">أقرب إليك.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg sm:leading-9">
            مساحة تجمع صلواتك وقراءاتك وخدمة مدارس الأحد، وتسهّل على الأسر والخدام متابعة حياة الخدمة اليومية.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <Link to="/login" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-950/25 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-amber-300 hover:shadow-xl hover:shadow-amber-400/20 active:translate-y-0 active:shadow-lg">
              تسجيل الدخول <ArrowLeft aria-hidden="true" className="h-4 w-4 transition group-hover:-translate-x-1" />
            </Link>
            <Link to="/register" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.035] px-6 py-3 text-sm font-bold text-white transition-all duration-200 ease-out hover:border-amber-300/40 hover:bg-white/[0.07] hover:scale-[1.02] active:scale-100">إنشاء حساب</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-400 sm:text-sm">
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />للطلاب</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />للأسر</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-300" />للخدام</span>
          </div>
        </div>

        <aside aria-label="نبذة عن كنيسة موسي النبي ومارمرقس الرسول" className="relative mx-auto w-full max-w-md lg:max-w-lg" style={{ animationDelay: '0.15s' }}>
          <div aria-hidden="true" className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-amber-300/25 via-transparent to-blue-400/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/70 p-5 shadow-2xl shadow-black/30 sm:p-7 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div aria-hidden="true" className="absolute -left-20 -top-20 h-56 w-56 rounded-full border border-amber-200/[0.08]" />
            <div className="relative flex items-center gap-4 sm:gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] border border-amber-200/30 bg-amber-100 shadow-xl shadow-amber-950/40 sm:h-24 sm:w-24">
                <img src={churchIcon} alt="أيقونة كنيسة موسي النبي ومارمرقس الرسول" width="96" height="96" className="h-full w-full object-cover" />
              </div>
              <div>
                <h2 className="mt-1 text-xl font-extrabold leading-8 text-white sm:text-2xl">طور سيناء</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">روحانية · تعليم · مجتمع</p>
              </div>
            </div>
            <div className="relative mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/20">
                <BookOpen aria-hidden="true" className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-sm font-bold text-white">قراءات وصلوات</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">في متناول يدك كل يوم</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300/20">
                <Heart aria-hidden="true" className="h-5 w-5 text-rose-300" />
                <p className="mt-3 text-sm font-bold text-white">خدمة ومتابعة</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">تنظيم يسند نموك</p>
              </div>
            </div>
            <p className="relative mt-5 border-t border-white/[0.08] pt-4 text-xs leading-6 text-slate-400">كل ما تحتاجه للخدمة الكنسية، بتجربة سهلة على الهاتف والكمبيوتر.</p>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
        <UpcomingSynaxarium />
      </section>

      <section id="sections" tabIndex="-1" aria-labelledby="features-heading" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.018] pt-4 pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold tracking-[0.18em] text-amber-300">كل ما يهمك في مكان واحد</p>
            <h2 id="features-heading" className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">مساحة مصممة لحياة الخدمة</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">أدوات بسيطة تساعدك أن تبقى قريباً من الكلمة والصلاة ومجتمع الكنيسة.</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-4">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article
                key={title}
                className="group rounded-3xl border border-white/[0.08] bg-slate-900/75 p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-amber-300/25 hover:bg-slate-900 hover:shadow-xl hover:shadow-amber-400/5 sm:p-6"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${index === 1 ? 'bg-sky-300/10 text-sky-200' : index === 2 ? 'bg-violet-300/10 text-violet-200' : index === 3 ? 'bg-rose-300/10 text-rose-200' : 'bg-amber-300/10 text-amber-200'}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-extrabold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FathersSection className="mx-auto max-w-7xl space-y-3 px-4 pt-4 pb-2 sm:px-6 lg:px-8" />

      <section className="px-4 pt-2 pb-8 sm:px-6 lg:px-8">
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 overflow-hidden rounded-[2rem] border border-amber-200/15 bg-gradient-to-br from-amber-400/10 via-slate-900 to-blue-950/60 p-6 sm:flex-row sm:items-center sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">أهلاً بك في بيتك.</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">سجّل الدخول لتتابع خدمتك، أو أنشئ حساباً جديداً للانضمام.</p>
          </div>
          <div className="relative flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition-all duration-200 ease-out hover:bg-amber-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-400/20 active:translate-y-0">تسجيل الدخول <ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
            <Link to="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-white/5 hover:scale-[1.02] active:scale-100">إنشاء حساب</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-slate-950/50 px-4 py-6 text-center text-xs text-slate-500 sm:py-8 sm:text-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
          <nav aria-label="روابط مهمة" className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/privacy" className="inline-flex min-h-10 items-center px-3 text-slate-300 transition hover:text-white">سياسة الخصوصية</Link>
            <a href="#home" className="inline-flex min-h-10 items-center px-3 text-amber-200 transition hover:text-amber-100">العودة إلى الأعلى ↑</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
