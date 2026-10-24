import { useState } from 'react';
import { BookOpen, Clock3, Download, ExternalLink, Moon, Sun } from 'lucide-react';
import MinistryPosts from '../components/MinistryPosts';

const agpeyaPdfUrl = '/agpeya.pdf';

const prayers = [
  { id: 'morning', name: 'صلاة باكر', time: 'الصلاة الأولى', page: 16, Icon: Sun },
  { id: 'third', name: 'صلاة الساعة الثالثة', time: 'الساعة التاسعة صباحاً', page: 59, Icon: Clock3 },
  { id: 'sixth', name: 'صلاة الساعة السادسة', time: 'الساعة الثانية عشرة ظهراً', page: 90, Icon: Clock3 },
  { id: 'ninth', name: 'صلاة الساعة التاسعة', time: 'الساعة الثالثة بعد الظهر', page: 120, Icon: Clock3 },
  { id: 'vespers', name: 'صلاة الغروب', time: 'الساعة الحادية عشرة', page: 148, Icon: Sun },
  { id: 'compline', name: 'صلاة النوم', time: 'الساعة الثانية عشرة', page: 172, Icon: Moon },
  { id: 'veil', name: 'صلاة الستار', time: 'للرهبان والآباء', page: 198, Icon: Moon },
  { id: 'midnight', name: 'صلاة نصف الليل', time: 'ثلاث خدمات', page: 246, Icon: Moon },
];

export default function Agpeya() {
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const selected = prayers.find((prayer) => prayer.id === selectedPrayer);
  const prayerPdfUrl = selected ? `${agpeyaPdfUrl}#page=${selected.page}` : agpeyaPdfUrl;

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header className="overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300"><BookOpen className="h-4 w-4" /> مكتبة الصلاة اليومية</span>
            <h1 className="mt-4 text-2xl font-extrabold text-white md:text-3xl">Agpeya</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">اختر الصلاة حسب وقتها لفتح موضعها مباشرةً في ملف الأجبية.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={prayerPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-400/10"><ExternalLink className="h-4 w-4" /> فتح العرض</a>
            <a href={agpeyaPdfUrl} download="agpeya.pdf" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400"><Download className="h-4 w-4" /> تنزيل كتاب الأجبية</a>
          </div>
        </div>
      </header>

      <section aria-labelledby="agpeya-filter-heading" className="space-y-4">
        <div>
          <h2 id="agpeya-filter-heading" className="text-lg font-bold text-white">اختر الصلاة</h2>
          <p className="mt-1 text-sm text-slate-400">تفتح كل بطاقة صفحة بداية الصلاة المختارة في الكتاب.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {prayers.map(({ id, name, time, Icon }) => <button
            key={id}
            type="button"
            aria-pressed={selectedPrayer === id}
            onClick={() => setSelectedPrayer(id)}
            className={`min-h-32 rounded-2xl border p-4 text-right transition hover:-translate-y-0.5 hover:border-amber-400/60 ${selectedPrayer === id ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-950/30' : 'border-slate-800 bg-slate-900'}`}
          >
            <Icon className="mb-4 h-5 w-5 text-amber-300" />
            <span className="block text-sm font-bold text-white">{name}</span>
            <span className="mt-1 block text-xs text-slate-400">{time}</span>
          </button>)}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">{selected ? selected.name : 'Agpeya'}</h2>
            <p className="mt-1 text-xs text-slate-400">{selected ? `${selected.time} · صفحة ${selected.page}` : 'اختر صلاة لفتح بدايتها، أو تصفح الكتاب كاملاً.'}</p>
          </div>
          {selected && <button type="button" onClick={() => setSelectedPrayer(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-amber-400">عرض الكتاب كاملاً</button>}
        </div>
        <iframe
          key={prayerPdfUrl}
          title={selected ? `${selected.name} في Agpeya` : 'Agpeya'}
          src={prayerPdfUrl}
          loading="lazy"
          className="h-[72vh] min-h-[520px] w-full rounded-2xl border border-slate-700 bg-white"
        />
      </section>

      <MinistryPosts types={['agpeya', 'psalm']} title="قراءات وصلوات منشورة" description="محتوى الأجبية والمزامير الذي تنشره إدارة الكنيسة." />
    </div>
  );
}
