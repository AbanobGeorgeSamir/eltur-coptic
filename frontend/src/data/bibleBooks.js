const bookFiles = import.meta.glob('./bible/*.json', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const bibleBooks = [
  ['Gen', 'سفر التكوين', 'OT'], ['Exod', 'سفر الخروج', 'OT'], ['Lev', 'سفر اللاويين', 'OT'],
  ['Num', 'سفر العدد', 'OT'], ['Deut', 'سفر التثنية', 'OT'], ['Josh', 'سفر يشوع', 'OT'],
  ['Judg', 'سفر القضاة', 'OT'], ['Ruth', 'سفر راعوث', 'OT'], ['1Sam', 'سفر صموئيل الأول', 'OT'],
  ['2Sam', 'سفر صموئيل الثاني', 'OT'], ['1Kgs', 'سفر الملوك الأول', 'OT'], ['2Kgs', 'سفر الملوك الثاني', 'OT'],
  ['1Chr', 'سفر أخبار الأيام الأول', 'OT'], ['2Chr', 'سفر أخبار الأيام الثاني', 'OT'], ['Ezra', 'سفر عزرا', 'OT'],
  ['Neh', 'سفر نحميا', 'OT'], ['Esth', 'سفر أستير', 'OT'], ['Job', 'سفر أيوب', 'OT'],
  ['Ps', 'سفر المزامير', 'OT'], ['Prov', 'سفر الأمثال', 'OT'], ['Eccl', 'سفر الجامعة', 'OT'],
  ['Song', 'نشيد الأنشاد', 'OT'], ['Isa', 'سفر إشعياء', 'OT'], ['Jer', 'سفر إرميا', 'OT'],
  ['Lam', 'مراثي إرميا', 'OT'], ['Ezek', 'سفر حزقيال', 'OT'], ['Dan', 'سفر دانيال', 'OT'],
  ['Hos', 'سفر هوشع', 'OT'], ['Joel', 'سفر يوئيل', 'OT'], ['Amos', 'سفر عاموس', 'OT'],
  ['Obad', 'سفر عوبديا', 'OT'], ['Jonah', 'سفر يونان', 'OT'], ['Mic', 'سفر ميخا', 'OT'],
  ['Nah', 'سفر ناحوم', 'OT'], ['Hab', 'سفر حبقوق', 'OT'], ['Zeph', 'سفر صفنيا', 'OT'],
  ['Hag', 'سفر حجي', 'OT'], ['Zech', 'سفر زكريا', 'OT'], ['Mal', 'سفر ملاخي', 'OT'],
  ['Matt', 'إنجيل متى', 'NT'], ['Mark', 'إنجيل مرقس', 'NT'], ['Luke', 'إنجيل لوقا', 'NT'],
  ['John', 'إنجيل يوحنا', 'NT'], ['Acts', 'سفر أعمال الرسل', 'NT'], ['Rom', 'رسالة رومية', 'NT'],
  ['1Cor', 'رسالة كورنثوس الأولى', 'NT'], ['2Cor', 'رسالة كورنثوس الثانية', 'NT'],
  ['Gal', 'رسالة غلاطية', 'NT'], ['Eph', 'رسالة أفسس', 'NT'], ['Phil', 'رسالة فيلبي', 'NT'],
  ['Col', 'رسالة كولوسي', 'NT'], ['1Thess', 'رسالة تسالونيكي الأولى', 'NT'],
  ['2Thess', 'رسالة تسالونيكي الثانية', 'NT'], ['1Tim', 'رسالة تيموثاوس الأولى', 'NT'],
  ['2Tim', 'رسالة تيموثاوس الثانية', 'NT'], ['Titus', 'رسالة تيطس', 'NT'], ['Phlm', 'رسالة فليمون', 'NT'],
  ['Heb', 'الرسالة إلى العبرانيين', 'NT'], ['Jas', 'رسالة يعقوب', 'NT'], ['1Pet', 'رسالة بطرس الأولى', 'NT'],
  ['2Pet', 'رسالة بطرس الثانية', 'NT'], ['1John', 'رسالة يوحنا الأولى', 'NT'],
  ['2John', 'رسالة يوحنا الثانية', 'NT'], ['3John', 'رسالة يوحنا الثالثة', 'NT'],
  ['Jude', 'رسالة يهوذا', 'NT'], ['Rev', 'سفر الرؤيا', 'NT'],
].map(([id, name, testament]) => ({
  id,
  name,
  testament,
  url: bookFiles[`./bible/${id}.json`],
}));

const bookCache = new Map();

export async function loadBibleBook(bookId) {
  if (bookCache.has(bookId)) return bookCache.get(bookId);
  const book = bibleBooks.find((item) => item.id === bookId);
  if (!book?.url) throw new Error('تعذر تحميل السفر المطلوب.');
  const response = await fetch(book.url);
  if (!response.ok) throw new Error('تعذر تحميل السفر المطلوب.');
  const data = await response.json();
  bookCache.set(bookId, data);
  return data;
}
