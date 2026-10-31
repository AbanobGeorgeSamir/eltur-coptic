import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, ExternalLink, X } from 'lucide-react';
import gospelBookUrl from '../books/gospel-book.pdf?url';
import FeaturedVerseCard from '../components/FeaturedVerseCard';
import { bibleBooks as books, loadBibleBook } from '../data/bibleBooks';

const latinizeDigits = (value) => value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
const arabicizeDigits = (value) => String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
const normalizeArabic = (value) => latinizeDigits(value)
  .normalize('NFD')
  .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .toLocaleLowerCase('ar');

const fieldClass = 'min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20';

export default function Bible() {
  const [bookId, setBookId] = useState('Matt');
  const [bookData, setBookData] = useState(null);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [verseNumber, setVerseNumber] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cache = useRef({});
  const currentBook = books.find((book) => book.id === bookId);

  useEffect(() => {
    let active = true;
    const loadBook = async () => {
      setLoading(true);
      setError('');
      try {
        const data = cache.current[bookId] || await loadBibleBook(bookId);
        cache.current[bookId] = data;
        if (active) setBookData(data);
      } catch (requestError) {
        if (active) setError(requestError.message || 'تعذر تحميل نص الإنجيل.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadBook();
    return () => { active = false; };
  }, [bookId, currentBook]);

  const chapter = bookData?.chapters?.find((item) => item.chapter === chapterNumber);
  const verses = chapter?.verses || [];
  const searchResults = useMemo(() => {
    const term = search.trim();
    if (!term || !bookData) return null;
    const normalizedTerm = normalizeArabic(term);
    const reference = normalizedTerm.match(/^(\d+)\s*[:：.]\s*(\d+)$/);
    return bookData.chapters.flatMap((item) => item.verses
      .filter((verse) => reference
        ? item.chapter === Number(reference[1]) && verse.number === Number(reference[2])
        : normalizeArabic(verse.text).includes(normalizedTerm))
      .map((verse) => ({ ...verse, chapter: item.chapter })));
  }, [search, bookData]);
  const visibleVerses = searchResults || (verseNumber === 'all'
    ? verses
    : verses.filter((verse) => verse.number === Number(verseNumber)));

  const chooseBook = (value) => {
    setBookId(value);
    setBookData(cache.current[value] || null);
    setChapterNumber(1);
    setVerseNumber('all');
    setSearch('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header className="overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300"><BookOpen className="h-4 w-4" /> مكتبة الكتاب المقدس</span>
            <h1 className="mt-4 text-2xl font-extrabold text-white md:text-3xl">ابحث عن آية بسهولة</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">اختر العهد والسفر والإصحاح والعدد، أو ابحث بكلمة من الآية. تُحمّل بيانات السفر عند اختياره وتظل متاحة دون اتصال لاحقاً.</p>
          </div>
          <a href={gospelBookUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm font-semibold text-white hover:border-amber-400">
            <BookOpen className="h-4 w-4 text-amber-300" /> ملف الكتاب المقدس PDF <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      <section aria-labelledby="bible-filter-heading" className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
        <div>
          <h2 id="bible-filter-heading" className="text-lg font-bold text-white">الوصول السريع للآية</h2>
          <p className="mt-1 text-sm text-slate-400">الترجمة العربية: فان دايك · ٦٦ سفراً من العهدين القديم والجديد.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-400">السفر
            <select value={bookId} onChange={(event) => chooseBook(event.target.value)} className={`${fieldClass} mt-2`}>
              <optgroup label="العهد القديم">
                {books.filter((book) => book.testament === 'OT').map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
              </optgroup>
              <optgroup label="العهد الجديد">
                {books.filter((book) => book.testament === 'NT').map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400">الإصحاح
            <select value={chapterNumber} onChange={(event) => { setChapterNumber(Number(event.target.value)); setVerseNumber('all'); setSearch(''); }} className={`${fieldClass} mt-2`} disabled={loading || !bookData}>
              {(bookData?.chapters || []).map((item) => <option key={item.chapter} value={item.chapter}>{item.chapter}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400">العدد
            <select value={verseNumber} onChange={(event) => { setVerseNumber(event.target.value); setSearch(''); }} className={`${fieldClass} mt-2`} disabled={loading || !chapter}>
              <option value="all">الإصحاح كاملاً</option>
              {verses.map((verse) => <option key={verse.number} value={verse.number}>{verse.number}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400">بحث داخل السفر المختار
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" className={`${fieldClass} pr-10 pl-10`} placeholder="كلمة أو مرجع مثل 3:16" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}
            </span>
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
        {loading && <div role="status" className="animate-pulse rounded-2xl bg-slate-950 p-5 text-sm text-slate-400">جارٍ تحميل {currentBook.name}...</div>}
        {!loading && !error && <>
          {searchResults && <p className="text-xs text-slate-400">{searchResults.length} نتيجة في {currentBook.name}</p>}
          {visibleVerses.length === 0
            ? <p className="rounded-2xl bg-slate-950 p-5 text-sm text-slate-400">لا توجد آيات مطابقة لهذا البحث.</p>
            : searchResults
              ? <div className="grid gap-2 sm:grid-cols-2">
                {visibleVerses.map((verse) => <article key={`${verse.chapter}:${verse.number}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="mb-2 text-xs font-bold text-amber-300">{currentBook.name} {verse.chapter}:{verse.number}</p>
                  <p className="text-base leading-8 text-white">{verse.text}</p>
                </article>)}
              </div>
              : <article className="reading-paper rounded-3xl border p-5 shadow-sm md:p-8">
                <header className="mb-6 flex items-center gap-4 border-b pb-5 reading-rule">
                  <span aria-hidden="true" className="reading-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-full border font-serif text-2xl font-bold">
                    {arabicizeDigits(chapterNumber)}
                  </span>
                  <div>
                    <p className="reading-accent text-xs font-semibold">الكتاب المقدس</p>
                    <h3 className="reading-body mt-1 text-lg font-bold md:text-xl">{currentBook.name}</h3>
                    <p className="reading-muted mt-1 text-sm">الإصحاح {arabicizeDigits(chapterNumber)}</p>
                  </div>
                </header>
                <p className="reading-body font-serif text-lg leading-[2.45] md:text-xl md:leading-[2.5]">
                  {visibleVerses.map((verse) => <span key={`${verse.chapter}:${verse.number}`}>
                    <sup className="reading-accent mx-1 text-xs font-bold">{arabicizeDigits(verse.number)}</sup>
                    {verse.text}{' '}
                  </span>)}
                </p>
              </article>}
        </>}
      </section>

      <FeaturedVerseCard />
    </div>
  );
}
