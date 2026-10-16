import tawadrosImage from '../images/saints/tawadros.jpeg';
import apolloImage from '../images/saints/apollo.jpeg';

const fathers = [
  {
    name: 'قداسة البابا تواضروس الثاني',
    role: 'بابا الإسكندرية وبطريرك الكرازة المرقسية',
    image: tawadrosImage,
    imageFit: 'contain',
  },
  {
    name: 'الأنبا أبوللو',
    role: 'أسقف إيبارشية طور سيناء',
    image: apolloImage,
    imageFit: 'cover',
    imagePosition: 'center top',
  },
  {
    name: 'تحت رعاية أبائنا الموقرين',
    role: 'القمص مينا سعد والقس أرسانيوس وجيه',
    imageAlt: 'الأب مينا سعد والأب أرسانيوس وجيه',
    image: '/images/Mina%20and%20Arsanius.jpg',
    imageFit: 'cover',
    imagePosition: 'center 30%',
    wide: true,
  },
];

export default function FathersSection({ className = 'space-y-3' }) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white md:text-xl">آباؤنا الأحباء</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">صلوات قداسة البابا المعظم الأنبا تواضروس الثاني وشريكه في الخدمة الرسولية نيافة الحبر الجليل الأنبا أبوللو أسقف سيناء الجنوبية ورئيس دير موسى النبي</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-4">
        {fathers.map((father) => (
          <article key={father.name} className={`${father.wide ? 'col-span-2' : ''} overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900 shadow-lg shadow-black/10`}>
            <div style={{ aspectRatio: father.wide ? '3 / 1' : '4 / 5' }} className="relative w-full overflow-hidden bg-stone-100">
              <img
                src={father.image}
                alt={father.imageAlt ?? father.name}
                width={father.wide ? 768 : 480}
                height={father.wide ? 1365 : 600}
                loading="lazy"
                decoding="async"
                style={{ objectFit: father.imageFit, objectPosition: father.imagePosition ?? 'center' }}
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <div className="min-h-24 border-t border-amber-500/15 p-3 text-center sm:min-h-28 sm:p-4">
              <h3 className="text-sm font-bold text-amber-300 sm:text-base">{father.name}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">{father.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
