import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import { isAdminRole } from '../data/grades';

const cairoDate = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const cairoTime = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo',
  hour: 'numeric',
  minute: '2-digit',
});
const weekdayLabels = {
  saturday: 'السبت', sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
  thursday: 'الخميس', friday: 'الجمعة',
};
const weekdayOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function ScheduleCard({ post, label, featured = false }) {
  const date = new Date(post.startAt || post.eventAt);

  return (
    <article className={`overflow-hidden rounded-2xl border bg-slate-900 ${featured ? 'border-amber-400/40 shadow-lg shadow-amber-950/10' : 'border-slate-800'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${featured ? 'bg-amber-400/[0.08]' : 'bg-slate-800/60'}`}>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-300">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-amber-300" />
          {post.endAt ? `${cairoTime.format(date)} – ${cairoTime.format(new Date(post.endAt))}` : cairoTime.format(date)}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-sm text-slate-300">{cairoDate.format(date)}</p>
        <h2 className={`mt-2 font-bold text-white ${featured ? 'text-xl' : 'text-lg'}`}>{post.title}</h2>
        {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{post.body}</p>}
      </div>
    </article>
  );
}

function PermanentCard({ post }) {
  const startAt = post.startAt || post.eventAt;
  const date = startAt ? new Date(startAt) : null;
  const startTime = post.startTime || (date && !Number.isNaN(date.getTime()) ? cairoTime.format(date) : '');
  const endAt = post.endAt ? new Date(post.endAt) : null;
  const endTime = post.endTime || (endAt && !Number.isNaN(endAt.getTime()) ? cairoTime.format(endAt) : '');
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <span className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">قداس دائم · {weekdayLabels[post.dayOfWeek] || 'الجمعة'}</span>
      <h3 className="mt-3 text-lg font-bold text-white">{post.title}</h3>
      {startTime || endTime ? <div className="mt-3 space-y-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
        {startTime && <p className="font-semibold text-amber-200">وقت البدء: <bdi>{startTime}</bdi></p>}
        {endTime && <p className="font-semibold text-amber-200">وقت الانتهاء: <bdi>{endTime}</bdi></p>}
      </div> : <p className="mt-2 text-xs text-slate-500">لم يُحدد الوقت بعد.</p>}
      {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{post.body}</p>}
    </article>
  );
}

export default function Liturgy() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(0);

  const receiveSchedules = useCallback((schedules) => {
    setPosts(schedules);
    setCheckedAt(Date.now());
  }, []);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setLoading(true);
      setError('');
    }
    try {
      receiveSchedules(await api.posts('liturgy'));
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'تعذر تحميل مواعيد القداسات.');
    } finally {
      setLoading(false);
    }
  }, [receiveSchedules]);

  useEffect(() => {
    let current = true;
    api.posts('liturgy')
      .then((schedules) => {
        if (!current) return;
        receiveSchedules(schedules);
        setError('');
      })
      .catch((requestError) => {
        if (current) setError(requestError.message || 'تعذر تحميل مواعيد القداسات.');
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [receiveSchedules]);

  useEffect(() => {
    const now = Date.now();
    const nextExpiry = posts
      .filter((post) => (post.liturgyType === 'temporary' || (!post.liturgyType && post.eventAt)) && (post.endAt || post.autoDeleteAt))
      .map((post) => new Date(post.endAt || post.autoDeleteAt).getTime())
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > now)
      .sort((a, b) => a - b)[0];
    if (!nextExpiry) return undefined;
    const timeout = window.setTimeout(() => { void load(true); }, Math.min(nextExpiry - now + 250, 2_147_000_000));
    return () => window.clearTimeout(timeout);
  }, [posts, load]);

  const { permanent, upcoming, previous, undated } = useMemo(() => {
    const permanentItems = [];
    const upcomingItems = [];
    const previousItems = [];
    const undatedItems = [];

    for (const post of posts) {
      const isTemporary = post.liturgyType === 'temporary' || (!post.liturgyType && Boolean(post.eventAt));
      if (!isTemporary && post.liturgyType === 'permanent') {
        permanentItems.push(post);
        continue;
      }
      const eventTime = (post.startAt || post.eventAt) ? new Date(post.startAt || post.eventAt).getTime() : Number.NaN;
      if (!Number.isFinite(eventTime)) undatedItems.push(post);
      else if (eventTime >= checkedAt) upcomingItems.push(post);
      else previousItems.push(post);
    }

    permanentItems.sort((a, b) => {
      const aDay = weekdayOrder.indexOf(a.dayOfWeek);
      const bDay = weekdayOrder.indexOf(b.dayOfWeek);
      const dayDifference = (aDay < 0 ? weekdayOrder.length : aDay)
        - (bDay < 0 ? weekdayOrder.length : bDay);
      return dayDifference || String(a.startTime || '').localeCompare(String(b.startTime || ''));
    });
    upcomingItems.sort((a, b) => new Date(a.startAt || a.eventAt) - new Date(b.startAt || b.eventAt));
    previousItems.sort((a, b) => new Date(b.startAt || b.eventAt) - new Date(a.startAt || a.eventAt));
    return { permanent: permanentItems, upcoming: upcomingItems, previous: previousItems, undated: undatedItems };
  }, [posts, checkedAt]);

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">مواعيد القداسات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            المواعيد القادمة مرتبة من الأقرب. جميع الأوقات معروضة بتوقيت القاهرة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdminRole(user?.role) && <Link to="/admin-liturgy" className="inline-flex min-h-10 items-center rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/10">إدارة المواعيد</Link>}
          <button type="button" onClick={() => void load(true)} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400/40 disabled:opacity-50">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 text-sm text-rose-200">
        <p>{error}</p>
        <button type="button" onClick={() => void load(true)} className="mt-3 rounded-lg border border-rose-300/30 px-3 py-2 font-semibold hover:bg-rose-400/10">إعادة المحاولة</button>
      </div>}

      {loading ? <div role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">جارٍ تحميل المواعيد...</div> : !error && <>
        {permanent.length > 0 && <section aria-labelledby="permanent-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="permanent-title" className="text-lg font-bold text-white">القداديس الدائمة</h2>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">{permanent.length} قداس</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {permanent.map((post) => <PermanentCard key={post._id} post={post} />)}
          </div>
        </section>}
        {upcoming.length > 0 ? <section aria-labelledby="upcoming-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="upcoming-title" className="text-lg font-bold text-white">القداسات القادمة</h2>
            <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">{upcoming.length} موعد</span>
          </div>
          <ScheduleCard post={upcoming[0]} label="القداس القادم" featured />
          {upcoming.slice(1).length > 0 && <div className="grid gap-3 md:grid-cols-2">
            {upcoming.slice(1).map((post) => <ScheduleCard key={post._id} post={post} label="موعد قادم" />)}
          </div>}
        </section> : <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="font-bold text-white">لا توجد مواعيد قادمة حالياً</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">ستظهر المواعيد هنا عند نشرها من إدارة الكنيسة.</p>
        </section>}

        {undated.length > 0 && <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">مواعيد تحتاج إلى تحديد التاريخ</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {undated.map((post) => <article key={post._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs font-semibold text-slate-400">التاريخ غير محدد</span>
              <h3 className="mt-2 font-bold text-amber-300">{post.title}</h3>
              {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{post.body}</p>}
            </article>)}
          </div>
        </section>}

        {previous.length > 0 && <details className="group rounded-2xl border border-slate-800 bg-slate-900">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-bold text-slate-200 marker:hidden">
            <span>المواعيد السابقة</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{previous.length}</span>
          </summary>
          <div className="grid gap-3 border-t border-slate-800 p-3 sm:p-4 md:grid-cols-2">
            {previous.map((post) => <ScheduleCard key={post._id} post={post} label="موعد سابق" />)}
          </div>
        </details>}
      </>}
    </div>
  );
}
