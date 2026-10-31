import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const dateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function Notifications({ showToast }) {
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [browserPermission, setBrowserPermission] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  ));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const latestEventId = useRef('');

  const load = useCallback(async () => {
    try {
      const [notifications, preferences] = await Promise.all([
        api.notifications(),
        api.notificationPreferences(),
      ]);
      setItems(notifications);
      setEnabled(preferences.verseUpdates !== false);
      latestEventId.current = notifications[0]?._id || notifications[0]?.id || '';
    } catch (requestError) {
      setError(requestError.message || 'تعذر تحميل الإشعارات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = () => {
    setLoading(true);
    setError('');
    void load();
  };

  useEffect(() => {
    if (!enabled || browserPermission !== 'granted') return undefined;
    const poll = async () => {
      try {
        const notifications = await api.notifications();
        const latest = notifications[0];
        const latestId = latest?._id || latest?.id || '';
        if (latestId && latestEventId.current && latestId !== latestEventId.current) {
          new window.Notification(latest.title || 'تحديث جديد للآية', {
            body: [latest.reference, latest.text].filter(Boolean).join(' · '),
            tag: latestId,
          });
        }
        if (latestId) latestEventId.current = latestId;
        setItems(notifications);
      } catch {
        // Keep the existing inbox visible if a background refresh fails.
      }
    };
    const timer = window.setInterval(poll, 60_000);
    return () => window.clearInterval(timer);
  }, [enabled, browserPermission]);

  const setPreference = async (value) => {
    const previousValue = enabled;
    setEnabled(value);
    setSaving(true);
    setError('');
    try {
      const saved = await api.updateNotificationPreferences({ verseUpdates: value });
      setEnabled(saved.verseUpdates !== false);
      await load();
      showToast?.(value ? 'تم تفعيل تحديثات الآية.' : 'تم إيقاف تحديثات الآية.');
    } catch (requestError) {
      setEnabled(previousValue);
      setError(requestError.message || 'تعذر حفظ تفضيل الإشعارات.');
    } finally {
      setSaving(false);
    }
  };

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setBrowserPermission('unsupported');
      return;
    }
    try {
      setBrowserPermission(await window.Notification.requestPermission());
    } catch {
      setBrowserPermission('denied');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Bell aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold text-white">الإشعارات</h1>
            <p className="mt-1 text-sm text-slate-400">تحديثات الآية للجميع التي أُرسلت إلى حسابك.</p>
          </div>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-amber-400/40 disabled:opacity-50">
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث
        </button>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <h2 className="font-bold text-white">تحديثات الآية</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">فعّل الخيار للاحتفاظ بتنبيهات الآيات الجديدة في قائمة إشعاراتك.</p>
        </div>
        <label className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 px-3 text-sm font-semibold text-slate-200">
          <input type="checkbox" checked={enabled} disabled={saving} onChange={(event) => void setPreference(event.target.checked)} className="h-5 w-5 accent-amber-400" />
          {saving ? 'جارٍ الحفظ...' : enabled ? 'مفعلة' : 'متوقفة'}
        </label>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <h2 className="font-bold text-white">تنبيهات المتصفح</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">يمكن للموقع تنبيهك عند وصول آية جديدة أثناء فتحه في هذا المتصفح.</p>
        </div>
        {browserPermission === 'granted' ? <span className="text-sm font-semibold text-emerald-300">مفعلة</span> : browserPermission === 'unsupported' ? <span className="text-sm text-slate-500">غير متاحة في هذا المتصفح</span> : browserPermission === 'denied' ? <span className="text-sm text-slate-400">اسمح بها من إعدادات المتصفح</span> : <button type="button" onClick={() => void enableBrowserNotifications()} className="min-h-11 rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-400/5">تفعيل تنبيهات المتصفح</button>}
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
      {loading && <p role="status" className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل الإشعارات...</p>}
      {!loading && !error && items.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">{enabled ? 'لا توجد تحديثات جديدة حالياً.' : 'أوقفت استقبال تحديثات الآية.'}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item._id || item.id || `${item.reference}-${item.createdAt}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start gap-3">
              <BookOpen aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <h2 className="break-words font-bold text-amber-200">{item.title || 'تحديث جديد للآية'}</h2>
                {item.reference && <p className="mt-1 text-xs font-semibold text-slate-400">{item.reference}</p>}
                {item.text && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">{item.text}</p>}
                {dateLabel(item.updatedAt || item.createdAt) && <p className="mt-3 text-xs text-slate-500">{dateLabel(item.updatedAt || item.createdAt)}</p>}
                <Link to="/bible" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-amber-400/25 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/5">عرض الآية</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">يفحص الموقع تنبيهات المتصفح كل دقيقة أثناء فتحه؛ تظهر تنبيهات الهاتف بالخلفية من تطبيق الهاتف.</p>
    </div>
  );
}
