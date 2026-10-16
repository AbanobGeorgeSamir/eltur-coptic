import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, CheckSquare, FileText, Heart, Image as ImageIcon, RefreshCw, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import PostMedia from '../components/PostMedia';
import FeaturedVerseCard from '../components/FeaturedVerseCard';
import ChurchDate from '../components/ChurchDate';
import { formatAttendanceCount, formatAttendancePercentage } from '../services/attendance';
import tawadrosImage from '../images/saints/tawadros.jpeg';
import apolloImage from '../images/saints/apollo.jpeg';
import { isAdminRole } from '../data/grades';

const studentLinks = [
  ['الأجبية', '/agpeya', BookOpen], ['الإنجيل', '/bible', BookOpen],
  ['المهام', '/tasks', CheckSquare], ['مواعيد القداسات', '/liturgy', CalendarDays],
  ['المعرض', '/gallery', ImageIcon], ['الاعتراف', '/confession', Heart],
];

const dateLabel = (value, withTime = false) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date);
};

const selectUpcomingLiturgies = (items) => items
  .filter((item) => item.eventAt && new Date(item.eventAt) >= new Date())
  .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt))
  .slice(0, 2);

function SectionTitle({ title, description, to, action = 'عرض الكل' }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {to && <Link to={to} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300">{action}<ArrowLeft className="h-4 w-4" /></Link>}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState({ news: [], readings: [], liturgies: [] });
  const [taskCount, setTaskCount] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingLiturgies, setRefreshingLiturgies] = useState(false);
  const [liturgyError, setLiturgyError] = useState('');
  const [loadErrors, setLoadErrors] = useState({});
  const links = isAdminRole(user?.role)
    ? [...studentLinks.filter(([, path]) => path !== '/tasks'), ['الطلاب', '/admin-students', UserCheck], ['إدارة المعرض', '/admin-gallery', ImageIcon], ['إدارة القداسات', '/admin-liturgy', CalendarDays]]
    : studentLinks;

  useEffect(() => {
    let active = true;
    const loadSafely = async (request, fallback) => {
      try {
        return { data: await request, failed: false };
      } catch {
        return { data: fallback, failed: true };
      }
    };
    Promise.all([
      loadSafely(api.postsPage('newsletter', 1, 3).then((result) => result.data || []), []),
      loadSafely(api.postsPage('bible', 1, 3).then((result) => result.data || []), []),
      loadSafely(api.upcomingLiturgies(2).then(selectUpcomingLiturgies), []),
      loadSafely(isAdminRole(user?.role) ? Promise.resolve([]) : api.tasks(), []),
      loadSafely(api.attendanceSummary(), null),
    ]).then(([newsResult, readingsResult, liturgiesResult, tasksResult, attendanceResult]) => {
      if (!active) return;
      setPosts({
        news: newsResult.data.slice(0, 3),
        readings: readingsResult.data.slice(0, 3),
        liturgies: liturgiesResult.data,
      });
      setTaskCount(tasksResult.failed ? null : tasksResult.data.filter((task) => !task.completedAt).length);
      setAttendanceSummary(attendanceResult.data);
      setLoadErrors({
        news: newsResult.failed,
        readings: readingsResult.failed,
        liturgies: liturgiesResult.failed,
        tasks: tasksResult.failed,
        attendance: attendanceResult.failed,
      });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user?.role]);

  const refreshLiturgies = async () => {
    setRefreshingLiturgies(true);
    setLiturgyError('');
    try {
      const liturgies = selectUpcomingLiturgies(await api.upcomingLiturgies(2));
      setPosts((current) => ({ ...current, liturgies }));
      setLoadErrors((current) => ({ ...current, liturgies: false }));
    } catch (requestError) {
      setLiturgyError(requestError.message || 'تعذر تحديث مواعيد القداسات.');
      setLoadErrors((current) => ({ ...current, liturgies: true }));
    } finally {
      setRefreshingLiturgies(false);
    }
  };

  return (
    <div aria-busy={loading} className="mx-auto max-w-6xl space-y-7 pb-4" dir="rtl">
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-blue-950 via-slate-900 to-amber-950/70 p-5 shadow-2xl shadow-black/20 sm:p-7 md:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">الخدمات الكنسية</span>
          <ChurchDate className="mt-3" />
          <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl">أهلاً بك، {user?.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">مساحتك لمتابعة القراءات والخدمة والأنشطة في كنيسة موسي النبي ومارمرقس الرسول.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {!isAdminRole(user?.role) && <Link to="/tasks" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-950/30 px-4 py-3 text-sm font-semibold text-white transition hover:border-amber-300"><CheckSquare className="h-4 w-4" />تابع مهامك</Link>}
          </div>
        </div>
      </section>

      <section aria-label="ملخص الخدمة" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!isAdminRole(user?.role) && <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><CheckSquare className="h-5 w-5" /></span><p className="text-sm font-semibold text-slate-300">المهام غير المكتملة</p></div>
          <p className="mt-4 text-3xl font-extrabold text-white">{taskCount ?? '—'}</p>
          <Link to="/tasks" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">الانتقال إلى المهام <ArrowLeft className="h-3.5 w-3.5" /></Link>
        </article>}
        {attendanceSummary?.overall && <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><UserCheck className="h-5 w-5" /></span><p className="text-sm font-semibold text-slate-300">{user?.role === 'student' ? 'نسبة حضورك' : user?.role === 'parent' ? 'حضور الأبناء' : 'حضور المجموعة'}</p></div>
          <p className="mt-4 text-3xl font-extrabold text-white">{formatAttendancePercentage(attendanceSummary.overall.percentage)}</p>
          <p className="mt-1 text-xs text-slate-500">{formatAttendanceCount(attendanceSummary.overall)}</p>
        </article>}
        <Link to="/confession" className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-rose-400/40 sm:p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/10 text-rose-300"><Heart className="h-5 w-5" /></span><p className="text-sm font-semibold text-slate-300">سجل الاعتراف</p></div>
          <p className="mt-4 text-sm leading-6 text-slate-400">راجع آخر موعد وأكمل تحديث بياناتك.</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-300">فتح السجل <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" /></span>
        </Link>
      </section>
      {loadErrors.tasks && <p role="alert" className="-mt-4 text-sm text-rose-300">تعذر تحميل ملخص المهام.</p>}
      {loadErrors.attendance && <p role="alert" className="-mt-4 text-sm text-rose-300">تعذر تحميل ملخص الحضور.</p>}

      <section className="space-y-3">
        <SectionTitle title="الوصول السريع" description="أقسامك الأساسية في مكان واحد." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {links.map(([title, path, Icon]) => <Link key={path} to={path} className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-slate-900/90">
            <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300 transition group-hover:bg-amber-400 group-hover:text-slate-950"><Icon className="h-5 w-5" /></span>
            <span className="text-sm font-bold text-white">{title}</span>
          </Link>)}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="القراءات الإنجيلية" description="أحدث القراءات التي نشرتها الكنيسة." to="/bible" />
        {loading && <div className="animate-pulse rounded-2xl bg-slate-900 p-5 text-sm text-slate-500">جارٍ تحميل القراءات...</div>}
        {!loading && loadErrors.readings && <p role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-200">تعذر تحميل القراءات. استخدم زر التحديث بالأعلى للمحاولة مرة أخرى.</p>}
        {!loading && !loadErrors.readings && posts.readings.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">لا توجد قراءات منشورة حالياً.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {posts.readings.map((post) => <article key={post._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <h3 className="font-bold text-amber-300">{post.title}</h3>
            {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{post.body}</p>}
            <PostMedia mediaUrl={post.mediaUrl} mediaKind={post.mediaKind} title={post.title} />
          </article>)}
        </div>
      </section>
      <FeaturedVerseCard />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white md:text-xl">مواعيد القداسات</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">المواعيد المنشورة من إدارة الكنيسة.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void refreshLiturgies()} disabled={loading || refreshingLiturgies} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300 disabled:opacity-50">
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshingLiturgies ? 'animate-spin' : ''}`} />تحديث
            </button>
            <Link to="/liturgy" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300">عرض الكل<ArrowLeft className="h-4 w-4" /></Link>
          </div>
        </div>
        {liturgyError && <p role="alert" className="text-sm text-rose-300">{liturgyError}</p>}
        {!loading && loadErrors.liturgies && !liturgyError && <p role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-200">تعذر تحميل مواعيد القداسات. استخدم زر التحديث للمحاولة مرة أخرى.</p>}
        {!loadErrors.liturgies && posts.liturgies.length === 0 && !loading && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">لا توجد مواعيد قادمة منشورة حالياً.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {posts.liturgies.map((post) => <article key={post._id} className="flex gap-3 rounded-2xl border border-amber-500/20 bg-slate-900 p-4 sm:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><CalendarDays className="h-5 w-5" /></span>
            <div><h3 className="font-bold text-white">{post.title}</h3><p className="mt-1 text-sm font-semibold text-amber-300">{dateLabel(post.eventAt, String(post.eventAt).includes('T'))}</p>{post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{post.body}</p>}</div>
          </article>)}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="آباؤنا الأحباء" description="صلوات قداسة البابا المعظم الأنبا تواضروس الثاني وشريكه في الخدمة الرسولية نيافة الحبر الجليل الأنبا أبوللو أسقف سيناء الجنوبية ورئيس دير موسى النبي" />
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-4">
          {[
            { name: 'قداسة البابا تواضروس الثاني', role: 'بابا الإسكندرية وبطريرك الكرازة المرقسية', image: tawadrosImage, wide: false },
            { name: 'الأنبا أبوللو', role: 'أسقف إيبارشية طور سيناء', image: apolloImage, wide: false },
            { name: 'تحت رعاية أبائنا الموقرين', role: 'القمص مينا سعد والقس أرسانيوس وجيه', imageAlt: 'الأب مينا سعد والأب أرسانيوس وجيه', image: '/images/Mina%20and%20Arsanius.jpg', wide: true },
          ].map((father) => <article key={father.name} className={`${father.wide ? 'col-span-2' : ''} overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900 shadow-lg shadow-black/10`}>
            <div style={{ aspectRatio: father.wide ? '3 / 1' : '3 / 2' }} className="relative w-full overflow-hidden bg-stone-100">
              <img src={father.image} alt={father.imageAlt ?? father.name} width={father.wide ? 768 : 480} height={father.wide ? 1365 : 600} loading="lazy" style={{ objectPosition: father.wide ? 'center 30%' : undefined }} className={`absolute inset-0 h-full w-full ${father.wide ? 'object-cover' : 'object-contain p-2'}`} />
            </div>
            <div className="min-h-24 border-t border-amber-500/15 p-3 text-center sm:min-h-28 sm:p-4"><h3 className="text-sm font-bold text-amber-300 sm:text-base">{father.name}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{father.role}</p></div>
          </article>)}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="آخر الإعلانات" description="تحديثات وأنشطة الخدمة." />
        {!loading && loadErrors.news && <p role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 text-sm text-rose-200">تعذر تحميل الإعلانات. استخدم زر التحديث بالأعلى للمحاولة مرة أخرى.</p>}
        {!loading && !loadErrors.news && posts.news.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">لا توجد إعلانات منشورة حالياً.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {posts.news.map((post) => <article key={post._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><FileText className="h-4 w-4" />{dateLabel(post.createdAt)}</div>
            <h3 className="mt-2 font-bold text-amber-300">{post.title}</h3>
            {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{post.body}</p>}
            <PostMedia mediaUrl={post.mediaUrl} mediaKind={post.mediaKind} title={post.title} />
          </article>)}
        </div>
      </section>
    </div>
  );
}
