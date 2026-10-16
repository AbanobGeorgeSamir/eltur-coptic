import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { api } from '../services/api';

export default function FeaturedVerseCard() {
  const [verse, setVerse] = useState(null);
  useEffect(() => {
    let active = true;
    api.featuredVerse().then((value) => {
      if (active) setVerse(value);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!verse?.text) return null;

  return (
    <section aria-labelledby="featured-verse-heading" className="overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/60 p-5 shadow-xl shadow-black/10 md:p-7" dir="rtl">
      <div className="flex items-center gap-2 text-amber-300">
        <Quote className="h-5 w-5" />
        <h2 id="featured-verse-heading" className="text-sm font-bold">آية للجميع</h2>
      </div>
      <blockquote className="mt-3 text-xl font-semibold leading-10 text-white md:text-2xl">«{verse.text}»</blockquote>
      <p className="mt-3 text-sm font-semibold text-amber-300">{verse.reference}</p>
    </section>
  );
}
