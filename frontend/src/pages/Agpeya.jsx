import { useEffect, useRef, useState } from 'react';
import { BookOpen, Clock3, Download, ExternalLink, Moon, Sun } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import MinistryPosts from '../components/MinistryPosts';

const agpeyaPdfUrl = '/agpeya.pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pageRendering, setPageRendering] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [viewerWidth, setViewerWidth] = useState(0);
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const selected = prayers.find((prayer) => prayer.id === selectedPrayer);
  const prayerPdfUrl = `${agpeyaPdfUrl}#page=${pageNumber}`;

  useEffect(() => {
    let active = true;
    const loadingTask = pdfjsLib.getDocument({ url: agpeyaPdfUrl });

    loadingTask.promise.then((document) => {
      if (!active) return;
      setPdfDocument(document);
      setPageCount(document.numPages);
      setPdfLoading(false);
    }).catch(() => {
      if (!active) return;
      setPdfError('Unable to load the Agpeya book. You can open or download the PDF directly.');
      setPdfLoading(false);
    });

    return () => {
      active = false;
      loadingTask.destroy();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewerWidth(entry.contentRect.width);
    });
    observer.observe(viewer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || viewerWidth <= 0) return undefined;

    let active = true;
    let renderTask;
    setPageRendering(true);

    pdfDocument.getPage(pageNumber).then((page) => {
      if (!active) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min((viewerWidth - 32) / baseViewport.width, 1.8);
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * outputScale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
      canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;
      renderTask = page.render({
        canvas,
        viewport,
      });
      return renderTask.promise;
    }).then(() => {
      if (active) setPageRendering(false);
    }).catch((error) => {
      if (active && error?.name !== 'RenderingCancelledException') {
        setPdfError('Unable to display this page. Open the PDF directly or download it.');
        setPageRendering(false);
      }
    });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdfDocument, pageNumber, viewerWidth]);

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
            <a href={prayerPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-400/10"><ExternalLink className="h-4 w-4" /> فتح الكتاب</a>
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
          {prayers.map(({ id, name, time, page, Icon }) => <button
            key={id}
            type="button"
            aria-pressed={selectedPrayer === id}
            onClick={() => {
              setSelectedPrayer(id);
              setPageNumber(page);
            }}
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
          {selected && <button type="button" onClick={() => { setSelectedPrayer(null); setPageNumber(1); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-amber-400">العودة لبداية الكتاب</button>}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 sm:px-4">
          <button type="button" onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber <= 1 || pdfLoading} className="rounded-lg border border-slate-700 px-3 py-2 font-semibold hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40">السابق</button>
          <span aria-live="polite">صفحة {pageNumber}{pageCount ? ` من ${pageCount}` : ''}</span>
          <button type="button" onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))} disabled={!pageCount || pageNumber >= pageCount || pdfLoading} className="rounded-lg border border-slate-700 px-3 py-2 font-semibold hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40">التالي</button>
        </div>
        <div ref={viewerRef} className="relative flex min-h-[60vh] justify-center overflow-auto rounded-b-2xl border-x border-b border-slate-700 bg-slate-800 p-4">
          {(pdfLoading || pageRendering) && <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/75 text-sm font-semibold text-amber-200">Loading page…</div>}
          {pdfError
            ? <div role="alert" className="m-auto max-w-md text-center text-sm leading-7 text-rose-200">
              <p>{pdfError}</p>
              <a href={prayerPdfUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-lg border border-amber-400/50 px-4 py-2 font-bold text-amber-200 hover:bg-amber-400/10">فتح الكتاب في صفحة جديدة</a>
            </div>
            : <canvas ref={canvasRef} role="img" aria-label={`صفحة ${pageNumber} من الأجبية`} className="max-w-full self-start rounded bg-white shadow-xl" />}
        </div>
      </section>

      <MinistryPosts types={['agpeya', 'psalm']} title="قراءات وصلوات منشورة" description="محتوى الأجبية والمزامير الذي تنشره إدارة الكنيسة." />
    </div>
  );
}
