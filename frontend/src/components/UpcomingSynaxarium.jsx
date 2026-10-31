import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronDown } from 'lucide-react';
import { getCairoDateLabels, getUpcomingSynaxariumObservances, getVisibleSynaxariumObservances, loadSynaxarium } from '../utils/synaxarium';

export default function UpcomingSynaxarium() {
  const [now, setNow] = useState(() => new Date());
  const [calendar, setCalendar] = useState(undefined);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    loadSynaxarium()
      .then((data) => { if (active) setCalendar(data); })
      .catch(() => { if (active) setCalendar(null); });
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const dateLabels = useMemo(() => getCairoDateLabels(now), [now]);
  const observances = useMemo(() => getUpcomingSynaxariumObservances(now, calendar), [now, calendar]);
  const visibleObservances = getVisibleSynaxariumObservances(observances, expanded);

  return (
    <section aria-busy={calendar === undefined} aria-labelledby="today-synaxarium-title" className="synaxarium-card relative isolate overflow-hidden rounded-3xl border shadow-xl shadow-black/10" dir="rtl">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 -z-10 h-64 w-64 rounded-full bg-[#7d2038]/[0.07] blur-3xl" />
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8 lg:p-7">
        <header className="flex flex-col justify-between gap-5 border-b pb-5 synaxarium-rule lg:border-b-0 lg:border-l lg:pb-0 lg:pl-7">
          <div>
            <span className="synaxarium-badge inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold">
              السنكسار القبطي
            </span>
            <h2 id="today-synaxarium-title" className="synaxarium-heading mt-3 text-2xl font-extrabold sm:text-3xl">أعياد اليوم والأيام القادمة</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">تذكارات الكنيسة مرتبة حسب اليوم</p>
          </div>
          <div className="synaxarium-surface rounded-2xl border p-4">
            <p className="synaxarium-accent text-sm font-bold leading-6">{dateLabels.copticDate}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{dateLabels.gregorianDate}</p>
          </div>
        </header>

        <div>
          {calendar === undefined ? (
            <div className="space-y-3" role="status" aria-label="جارٍ تحميل السنكسار">
              {[0, 1, 2].map((item) => <div key={item} aria-hidden="true" className="synaxarium-rule animate-pulse border-b py-5 last:border-0"><div className="synaxarium-skeleton h-5 w-4/5 rounded" /><div className="synaxarium-skeleton mt-3 h-3 w-2/5 rounded" /></div>)}
            </div>
          ) : calendar === null ? (
            <p role="alert" className="synaxarium-surface rounded-2xl border p-5 text-sm leading-6 text-rose-800">تعذر تحميل تذكارات السنكسار الآن.</p>
          ) : visibleObservances.length > 0 ? (
            <ol className="synaxarium-divide divide-y">
              {visibleObservances.map((observance) => (
                <li key={observance.id} className="relative py-4 first:pt-1 last:pb-1">
                  <span aria-hidden="true" className="absolute right-0 top-[1.15rem] grid h-7 w-7 place-items-center rounded-full bg-[#2e376f]/10 text-[#2e376f]">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </span>
                  <div className="pr-10">
                    <h3 className="synaxarium-heading text-base font-bold leading-7 sm:text-lg">{observance.name}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 sm:text-sm">
                      <span>{observance.copticDate}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>{observance.gregorianDate}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="synaxarium-accent">{observance.relativeDate}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="synaxarium-surface rounded-2xl border p-5 text-sm leading-6 text-slate-600">لا توجد تذكارات مسجلة لهذا اليوم أو الأيام القادمة.</p>
          )}

          {observances.length > 3 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="synaxarium-action mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition focus-visible:outline-[#7d2038]"
            >
              {expanded ? 'عرض أقل' : 'المزيد'}
              {expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4 rotate-180" /> : <ArrowLeft aria-hidden="true" className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
