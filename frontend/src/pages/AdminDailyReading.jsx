import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Save } from 'lucide-react';
import { api } from '../services/api';
import { bibleBooks, loadBibleBook } from '../data/bibleBooks';

const emptyState = {
  bookId: 'Matt',
  chapter: 1,
  mode: 'chapter',
  startVerse: 1,
  endVerse: 1,
  text: '',
};

const passageText = (chapter, startVerse, endVerse) => (chapter?.verses || [])
  .filter((verse) => verse.number >= startVerse && verse.number <= endVerse)
  .map((verse) => `${verse.number} ${verse.text}`)
  .join('\n');

const readingReference = (book, chapter, startVerse, endVerse) => (
  `${book?.name || ''} ${chapter}:${startVerse}${endVerse === startVerse ? '' : `–${endVerse}`}`.trim()
);

const fieldClass = 'min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50';

export default function AdminDailyReading({ showToast }) {
  const [form, setForm] = useState(emptyState);
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentBook = bibleBooks.find((book) => book.id === form.bookId);
  const chapterData = useMemo(
    () => bookData?.chapters?.find((chapter) => chapter.chapter === form.chapter) || null,
    [bookData, form.chapter],
  );
  const verseCount = chapterData?.verses?.length || 0;

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const saved = await api.dailyReading();
        const bookId = saved?.bookId || emptyState.bookId;
        const data = await loadBibleBook(bookId);
        if (!active) return;
        const chapter = Number(saved?.chapter) || 1;
        const chapterData = data.chapters.find((item) => item.chapter === chapter) || data.chapters[0];
        const count = chapterData?.verses?.length || 1;
        const startVerse = Math.min(Number(saved?.startVerse) || 1, count);
        const endVerse = Math.max(startVerse, Math.min(Number(saved?.endVerse) || count, count));
        setBookData(data);
        setForm({
          bookId,
          chapter: chapterData?.chapter || 1,
          mode: startVerse === 1 && endVerse === count ? 'chapter' : 'range',
          startVerse,
          endVerse,
          text: saved?.text || passageText(chapterData, startVerse, endVerse),
        });
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.message || 'تعذر تحميل القراءة اليومية.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const selectBook = async (bookId) => {
    setLoading(true);
    setError('');
    try {
      const data = await loadBibleBook(bookId);
      const firstChapter = data.chapters[0];
      const endVerse = firstChapter?.verses?.length || 1;
      setBookData(data);
      setForm({
        bookId,
        chapter: firstChapter?.chapter || 1,
        mode: 'chapter',
        startVerse: 1,
        endVerse,
        text: passageText(firstChapter, 1, endVerse),
      });
    } catch (requestError) {
      setError(requestError.message || 'تعذر تحميل السفر المختار.');
    } finally {
      setLoading(false);
    }
  };

  const selectChapter = (chapterNumber) => {
    const nextChapter = bookData?.chapters?.find((item) => item.chapter === chapterNumber);
    const endVerse = nextChapter?.verses?.length || 1;
    setForm((current) => ({
      ...current,
      chapter: chapterNumber,
      mode: 'chapter',
      startVerse: 1,
      endVerse,
      text: passageText(nextChapter, 1, endVerse),
    }));
  };

  const selectMode = (mode) => {
    if (!chapterData) return;
    const startVerse = 1;
    const endVerse = mode === 'chapter' ? verseCount : Math.min(5, verseCount);
    setForm((current) => ({
      ...current,
      mode,
      startVerse,
      endVerse,
      text: passageText(chapterData, startVerse, endVerse),
    }));
  };

  const selectRange = (key, value) => {
    let startVerse = key === 'startVerse' ? value : form.startVerse;
    let endVerse = key === 'endVerse' ? value : form.endVerse;
    if (startVerse > endVerse) {
      if (key === 'startVerse') endVerse = startVerse;
      else startVerse = endVerse;
    }
    setForm((current) => ({
      ...current,
      startVerse,
      endVerse,
      text: passageText(chapterData, startVerse, endVerse),
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!currentBook || !form.text.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.saveDailyReading({
        bookId: currentBook.id,
        bookName: currentBook.name,
        chapter: form.chapter,
        startVerse: form.startVerse,
        endVerse: form.endVerse,
        reference: readingReference(currentBook, form.chapter, form.startVerse, form.endVerse),
        text: form.text.trim(),
      });
      showToast(response.message || 'تم نشر القراءة اليومية للمستخدمين.');
    } catch (requestError) {
      setError(requestError.message || 'تعذر حفظ القراءة اليومية.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-white">إدارة القراءة اليومية</h1>
        <p className="mt-1 text-sm leading-6 text-slate-400">اختر السفر والإصحاح كاملًا أو نطاق آيات، ويمكنك اختصار النص قبل نشره للمستخدمين على الويب والهاتف.</p>
      </header>
      {loading && <p role="status" className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-300">جارٍ تحميل بيانات الكتاب...</p>}
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-400">السفر
            <select value={form.bookId} onChange={(event) => void selectBook(event.target.value)} className={`${fieldClass} mt-2`} disabled={loading || saving}>
              <optgroup label="العهد القديم">{bibleBooks.filter((book) => book.testament === 'OT').map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</optgroup>
              <optgroup label="العهد الجديد">{bibleBooks.filter((book) => book.testament === 'NT').map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</optgroup>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400">الإصحاح
            <select value={form.chapter} onChange={(event) => selectChapter(Number(event.target.value))} className={`${fieldClass} mt-2`} disabled={loading || !bookData || saving}>
              {(bookData?.chapters || []).map((chapter) => <option key={chapter.chapter} value={chapter.chapter}>{chapter.chapter}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-400">نطاق القراءة</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">
              <input type="radio" name="reading-mode" value="chapter" checked={form.mode === 'chapter'} onChange={() => selectMode('chapter')} disabled={!chapterData || saving} />
              الإصحاح كاملًا ({verseCount} آية)
            </label>
            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">
              <input type="radio" name="reading-mode" value="range" checked={form.mode === 'range'} onChange={() => selectMode('range')} disabled={!chapterData || saving} />
              جزء من الإصحاح
            </label>
          </div>
        </fieldset>
        {form.mode === 'range' && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-400">من الآية
            <select value={form.startVerse} onChange={(event) => selectRange('startVerse', Number(event.target.value))} className={`${fieldClass} mt-2`} disabled={!chapterData || saving}>
              {(chapterData?.verses || []).map((verse) => <option key={verse.number} value={verse.number}>{verse.number}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400">إلى الآية
            <select value={form.endVerse} onChange={(event) => selectRange('endVerse', Number(event.target.value))} className={`${fieldClass} mt-2`} disabled={!chapterData || saving}>
              {(chapterData?.verses || []).filter((verse) => verse.number >= form.startVerse).map((verse) => <option key={verse.number} value={verse.number}>{verse.number}</option>)}
            </select>
          </label>
        </div>}
        <label className="block text-xs font-semibold text-slate-400">النص المنشور — يمكنك اختصار جزء من الآية هنا
          <textarea required maxLength={20000} rows={8} value={form.text} onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))} className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-9 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50" disabled={!bookData || saving} />
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={loading || saving || !form.text.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">
          <Save className="h-4 w-4" />{saving ? 'جارٍ النشر…' : 'حفظ ونشر القراءة'}
        </button>
      </form>
      {form.text && <section aria-label="معاينة القراءة اليومية" className="rounded-2xl border border-amber-500/25 bg-slate-900 p-5 md:p-7">
        <div className="flex items-center gap-2 text-amber-300"><BookOpen className="h-5 w-5" /><h2 className="font-bold">معاينة القراءة اليومية</h2></div>
        <p className="mt-2 text-sm font-semibold text-amber-200">{readingReference(currentBook, form.chapter, form.startVerse, form.endVerse)}</p>
        <p className="mt-3 whitespace-pre-wrap text-lg leading-9 text-white">{form.text}</p>
      </section>}
    </div>
  );
}
