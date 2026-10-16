import { ArrowLeft, BookOpen, CalendarDays, CheckSquare, Heart, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import churchIcon from '../images/kenesa-icon.png';
import tawadrosImage from '../images/saints/tawadros.jpeg';
import apolloImage from '../images/saints/apollo.jpeg';
import ChurchDate from '../components/ChurchDate';

const features = [
  { icon: BookOpen, title: 'الأجبية والإنجيل', text: 'صلوات وقراءات يومية، مع وصول سريع إلى السفر والإصحاح والآية.' },
  { icon: CheckSquare, title: 'مسيرتك الروحية', text: 'تابع صلواتك ومهامك الأسبوعية بسهولة ومن مكان واحد.' },
  { icon: CalendarDays, title: 'الحياة الكنسية', text: 'اعرف مواعيد القداسات والأنشطة والدروس القادمة.' },
  { icon: Users, title: 'خدمة مترابطة', text: 'مساحة آمنة للطلاب والأسر والخدام لمتابعة الخدمة.' },
];

const fathers = [
  { name: 'قداسة البابا تواضروس الثاني', role: 'بابا الإسكندرية وبطريرك الكرازة المرقسية', image: tawadrosImage, wide: false },
  { name: 'الأنبا أبوللو', role: 'أسقف إيبارشية طور سيناء', image: apolloImage, wide: false },
  { name: 'تحت رعاية أبائنا الموقرين', role: 'القمص مينا سعد والقس أرسانيوس وجيه', imageAlt: 'الأب مينا سعد والأب أرسانيوس وجيه', image: '/images/Mina%20and%20Arsanius.jpg', wide: true },
];

export default function PublicHome() {
  return (
    <main className="min-h-dvh overflow-hidden text-slate-100" dir="rtl">
      <a href="#sections" className="skip-link">انتقل إلى المحتوى</a>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-slate-950/85 backdrop-blur-xl">
        <nav aria-label="التنقل الرئيسي" className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex min-w-0 items-center gap-2.5 text-white sm:gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-300/30 bg-amber-200 shadow-lg shadow-amber-950/20 sm:h-11 sm:w-11">
              <img src={churchIcon} alt="" width="44" height="44" loading="eager" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold sm:text-base">كنيسة موسي النبي ومارمرقس الرسول</span>
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/login" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-xs font-bold text-white transition hover:border-amber-300/40 hover:bg-white/5 sm:px-4 sm:text-sm">تسجيل الدخول</Link>
            <Link to="/register" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-400 px-3 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-950/25 transition hover:bg-amber-300 sm:px-4 sm:text-sm">إنشاء حساب</Link>
          </div>
        </nav>
      </header>

      <section id="home" className="relative isolate mx-auto grid min-h-[min(760px,calc(100dvh-68px))] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-8 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-4 -z-10 h-80 w-80 rounded-full bg-amber-400/10 blur-[100px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-0 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[110px]" />
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3.5 py-2 text-xs font-bold text-amber-200 sm:text-sm">
            <Sparkles aria-hidden="true" className="h-4 w-4" /> بوابة أبناء وخدام طور سيناء
          </p>
          <ChurchDate className="mt-4" />
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.3] tracking-tight text-white sm:text-5xl lg:text-6xl">
            حياة الكنيسة، <span className="text-amber-300">أقرب إليك.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg sm:leading-9">
            مساحة تجمع صلواتك وقراءاتك وخدمة مدارس الأحد، وتسهّل على الأسر والخدام متابعة حياة الخدمة اليومية.
          </p>
          <div className="mt-8 flex flex-col gap-3 xs:flex-row sm:flex-row">
            <Link to="/login" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-950/25 transition hover:-translate-y-0.5 hover:bg-amber-300">
              ابدأ رحلتك <ArrowLeft aria-hidden="true" className="h-4 w-4 transition group-hover:-translate-x-1" />
            </Link>
            <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.035] px-6 py-3 text-sm font-bold text-white transition hover:border-amber-300/40 hover:bg-white/[0.07]">إنشاء حساب</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-400 sm:text-sm">
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />للطلاب</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />للأسر</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-300" />للخدام</span>
          </div>
        </div>

        <aside aria-label="نبذة عن كنيسة موسي النبي ومارمرقس الرسول" className="relative mx-auto w-full max-w-md lg:max-w-lg">
          <div aria-hidden="true" className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-amber-300/25 via-transparent to-blue-400/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/70 p-5 shadow-2xl shadow-black/30 sm:p-7">
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
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4">
                <BookOpen aria-hidden="true" className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-sm font-bold text-white">قراءات وصلوات</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">في متناول يدك كل يوم</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4">
                <Heart aria-hidden="true" className="h-5 w-5 text-rose-300" />
                <p className="mt-3 text-sm font-bold text-white">خدمة ومتابعة</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">تنظيم يسند نموك</p>
              </div>
            </div>
            <p className="relative mt-5 border-t border-white/[0.08] pt-4 text-xs leading-6 text-slate-400">كل ما تحتاجه للخدمة الكنسية، بتجربة سهلة على الهاتف والكمبيوتر.</p>
          </div>
        </aside>
      </section>

      <section id="sections" tabIndex="-1" aria-labelledby="features-heading" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.018] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold tracking-[0.18em] text-amber-300">كل ما يهمك في مكان واحد</p>
            <h2 id="features-heading" className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">مساحة مصممة لحياة الخدمة</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">أدوات بسيطة تساعدك أن تبقى قريباً من الكلمة والصلاة ومجتمع الكنيسة.</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-4">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="group rounded-3xl border border-white/[0.08] bg-slate-900/75 p-5 transition duration-200 hover:-translate-y-1 hover:border-amber-300/25 hover:bg-slate-900 sm:p-6">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${index === 1 ? 'bg-sky-300/10 text-sky-200' : index === 2 ? 'bg-violet-300/10 text-violet-200' : index === 3 ? 'bg-rose-300/10 text-rose-200' : 'bg-amber-300/10 text-amber-200'}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-extrabold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="fathers-heading" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-amber-300">رعاة الإيبارشية</p>
            <h2 id="fathers-heading" className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">آباؤنا الأحباء</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-400">صلوات قداسة البابا المعظم الأنبا تواضروس الثاني وشريكه في الخدمة الرسولية نيافة الحبر الجليل الأنبا أبوللو أسقف سيناء الجنوبية ورئيس دير موسى النبي</p>
        </div>
        <div className="mx-auto mt-7 grid max-w-4xl grid-cols-2 items-stretch gap-3 sm:gap-5">
          {fathers.map((father) => (
            <article key={father.name} className={`group flex h-full flex-col ${father.wide ? 'col-span-2' : ''} overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-amber-300/30`}>
              <div style={{ aspectRatio: father.wide ? '3 / 1' : '3 / 2' }} className="relative mx-auto w-full shrink-0 overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.17),transparent_65%)]" />
                <img src={father.image} alt={father.imageAlt ?? father.name} width={father.wide ? 768 : 480} height={father.wide ? 1365 : 600} loading="lazy" decoding="async" style={{ objectPosition: father.wide ? 'center 30%' : 'center 24%' }} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300" />
              </div>
              <div className="flex min-h-28 flex-1 flex-col items-center justify-start border-t border-white/[0.07] px-3 py-4 text-center sm:min-h-32 sm:px-5">
                <h3 className={`${father.wide ? '' : 'flex min-h-12 items-center justify-center'} text-xs font-extrabold leading-6 text-amber-200 sm:text-base`}>{father.name}</h3>
                {father.role && <p className={`${father.wide ? '' : 'min-h-10'} mt-1 text-[10px] leading-5 text-slate-400 sm:text-xs`}>{father.role}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 overflow-hidden rounded-[2rem] border border-amber-200/15 bg-gradient-to-br from-amber-400/10 via-slate-900 to-blue-950/60 p-6 sm:flex-row sm:items-center sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">أهلاً بك في بيتك.</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">سجّل الدخول لتتابع خدمتك، أو أنشئ حساباً جديداً للانضمام.</p>
          </div>
          <div className="relative flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-300">تسجيل الدخول <ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
            <Link to="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5">إنشاء حساب</Link>
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
