import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function AdminVerse({ showToast }) {
  const [form, setForm] = useState({ text: '', reference: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.featuredVerse().then((verse) => {
      if (active && verse) setForm({ text: verse.text || '', reference: verse.reference || '' });
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = await api.saveFeaturedVerse(form);
      setForm({ text: result.data.text, reference: result.data.reference });
      showToast('تم نشر الآية لجميع المستخدمين.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-white">الآية المعروضة للجميع</h1>
        <p className="mt-1 text-sm text-slate-400">حدّث نص الآية ومرجعها؛ ستظهر مباشرة في الصفحة الرئيسية للموقع والتطبيق.</p>
      </header>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
        <label className="block text-sm font-semibold text-slate-300">نص الآية
          <textarea required maxLength={1200} rows={5} value={form.text} onChange={(event) => setForm((old) => ({ ...old, text: event.target.value }))} className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 leading-8 text-white" placeholder="اكتب الآية هنا" />
          <span className="mt-1 block text-left text-xs text-slate-500">{form.text.length}/1200</span>
        </label>
        <label className="block text-sm font-semibold text-slate-300">المرجع
          <input required maxLength={160} value={form.reference} onChange={(event) => setForm((old) => ({ ...old, reference: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" placeholder="مثال: يوحنا 3:16" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={loading || saving || !form.text.trim() || !form.reference.trim()} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{saving ? 'جارٍ النشر…' : 'نشر الآية'}</button>
      </form>
      {form.text && <section aria-label="معاينة الآية" className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 to-amber-950/40 p-6">
        <p className="text-xs font-bold text-amber-300">معاينة</p>
        <blockquote className="mt-3 text-lg leading-9 text-white">«{form.text}»</blockquote>
        <p className="mt-3 text-sm font-semibold text-amber-300">{form.reference}</p>
      </section>}
    </div>
  );
}
