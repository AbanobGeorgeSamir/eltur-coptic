import { useEffect, useState } from 'react';

const gregorianFormatter = new Intl.DateTimeFormat('ar-EG-u-ca-gregory', {
  timeZone: 'Africa/Cairo',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const copticFormatter = new Intl.DateTimeFormat('ar-EG-u-ca-coptic', {
  timeZone: 'Africa/Cairo',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function ChurchDate({ className = '' }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const updateDate = () => setNow(new Date());
    updateDate();
    const timer = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return <div aria-hidden="true" className={`min-h-5 ${className}`} />;

  const gregorianDate = gregorianFormatter.format(now);
  const copticDate = copticFormatter.formatToParts(now)
    .filter((part) => part.type !== 'era')
    .map((part) => part.value)
    .join('')
    .trim();

  return (
    <div aria-label={`التاريخ الميلادي ${gregorianDate}، والتاريخ القبطي ${copticDate}`} className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-slate-300 ${className}`} dir="rtl">
      <time dateTime={now.toISOString()}><span className="font-bold text-amber-200">ميلادي:</span> {gregorianDate}</time>
      <span aria-hidden="true" className="text-slate-500">·</span>
      <time dateTime={now.toISOString()}><span className="font-bold text-amber-200">قبطي:</span> {copticDate}</time>
    </div>
  );
}
