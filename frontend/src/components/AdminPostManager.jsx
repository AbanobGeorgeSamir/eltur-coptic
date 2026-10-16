import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ImagePlus, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import PostMedia from './PostMedia';
import { useAuth } from '../contexts/useAuth';
import GradeScopeFields from './GradeScopeFields';
import { uploadMediaFile } from '../utils/uploadMediaFile';
import { compareUpcomingLiturgies, isPermanentLiturgy } from '../utils/liturgySchedule';

const cairoDateTimeParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const asCairoDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(cairoDateTimeParts.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const cairoParts = (value) => {
  const localValue = asCairoDateTimeLocal(value);
  return localValue ? localValue.split('T') : ['', ''];
};

const cairoDateTimeLocalToIso = (value) => {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = Object.fromEntries(cairoDateTimeParts.formatToParts(new Date(instant)).map(({ type, value: part }) => [type, part]));
    const displayedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant += target - displayedAsUtc;
  }
  return new Date(instant).toISOString();
};

const cairoDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير صالح';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
};

const emptyForm = (type) => ({
  type,
  title: '',
  body: '',
  eventAt: '',
  liturgyType: 'permanent',
  dayOfWeek: 'saturday',
  liturgyDate: '',
  startTime: '',
  endTime: '',
  mediaUrl: '',
  mediaKind: type === 'gallery' ? 'image' : 'link',
});

const sortPosts = (items, isSchedule, now) => items.slice().sort((a, b) => {
  if (isSchedule) {
    if (isPermanentLiturgy(a) && isPermanentLiturgy(b)) {
      return compareUpcomingLiturgies(a, b, new Date(now));
    }
    const aTime = a.eventAt ? new Date(a.eventAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.eventAt ? new Date(b.eventAt).getTime() : Number.POSITIVE_INFINITY;
    const aUpcoming = Number.isFinite(aTime) && aTime >= now;
    const bUpcoming = Number.isFinite(bTime) && bTime >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    if (!Number.isFinite(aTime)) return Number.isFinite(bTime) ? 1 : 0;
    if (!Number.isFinite(bTime)) return -1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  }
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
});

const prepareImage = async (file) => {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('اختر صورة بصيغة JPEG أو PNG أو WebP أو GIF.');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error('تعذر تجهيز الصورة.')),
    'image/jpeg',
    0.84,
  ));
  if (blob.size > 2 * 1024 * 1024) throw new Error('حجم الصورة بعد الضغط أكبر من ٢ ميجابايت. اختر صورة أصغر.');
  const filename = (file.name.replace(/\.[^.]+$/, '') || 'church-image').replace(/[\\/]+/g, '-') + '.jpg';
  return new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });
};

export default function AdminPostManager({ type, title, description, showToast }) {
  const { user } = useAuth();
  const isGallery = type === 'gallery';
  const isSchedule = type === 'liturgy';
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(() => emptyForm(type));
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageSource, setImageSource] = useState('link');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [scheduleCheckedAt, setScheduleCheckedAt] = useState(0);
  const [audience, setAudience] = useState({ grade: '', meetingGroup: '' });
  const [originalAudience, setOriginalAudience] = useState(null);
  const [audienceNeedsReview, setAudienceNeedsReview] = useState(false);
  const [audienceReviewed, setAudienceReviewed] = useState(false);

  useEffect(() => {
    if (!filePreview) return undefined;
    return () => URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setLoading(true);
      setError('');
    }
    try {
      const items = await api.posts(type, { includeUnpublished: isSchedule });
      const now = Date.now();
      if (isSchedule) setScheduleCheckedAt(now);
      setPosts(sortPosts(items, isSchedule, now));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [type, isSchedule]);

  useEffect(() => {
    let active = true;
    api.posts(type, { includeUnpublished: isSchedule })
      .then((items) => {
        if (!active) return;
        const now = Date.now();
        if (isSchedule) setScheduleCheckedAt(now);
        setPosts(sortPosts(items, isSchedule, now));
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, isSchedule]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setEditingId('');
    setForm(emptyForm(type));
    setSelectedFile(null);
    setImageSource('link');
    setError('');
    setAudience({ grade: '', meetingGroup: '' });
    setOriginalAudience(null);
    setAudienceNeedsReview(false);
    setAudienceReviewed(false);
  };

  const selectFile = (file) => {
    setSelectedFile(file);
    setFilePreview(file ? URL.createObjectURL(file) : '');
  };

  const edit = (post) => {
    const startAt = post.startAt || post.eventAt;
    const [liturgyDate, legacyStartTime] = cairoParts(startAt);
    const [, legacyEndTime] = cairoParts(post.endAt);
    setEditingId(post._id);
    setSelectedFile(null);
    setImageSource('link');
    setForm({
      type,
      title: post.title || '',
      body: post.body || '',
      eventAt: asCairoDateTimeLocal(post.eventAt),
      liturgyType: post.liturgyType || (post.eventAt ? 'temporary' : 'permanent'),
      dayOfWeek: post.dayOfWeek || 'saturday',
      liturgyDate,
      startTime: post.startTime || legacyStartTime,
      endTime: post.endTime || legacyEndTime,
      mediaUrl: post.mediaUrl || '',
      mediaKind: isGallery ? 'image' : (post.mediaKind || 'link'),
    });
    setAudience({
      grade: post.grade || '',
      meetingGroup: String(post.meetingGroup?._id || post.meetingGroup || ''),
    });
    setOriginalAudience({
      grade: post.grade || '',
      meetingGroup: String(post.meetingGroup?._id || post.meetingGroup || ''),
    });
    setAudienceNeedsReview(!post.audienceMode);
    setAudienceReviewed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const wasEditing = Boolean(editingId);
      if (wasEditing && audienceNeedsReview && !audienceReviewed) {
        throw new Error('يُرجى مراجعة نطاق المرحلة لهذا المحتوى القديم وتأكيده قبل الحفظ.');
      }
      let mediaUrl = form.mediaUrl.trim();
      if (isGallery && imageSource === 'file' && selectedFile) {
        const upload = await prepareImage(selectedFile);
        mediaUrl = await uploadMediaFile(upload);
      }
      if (mediaUrl.startsWith('blob:')) {
        mediaUrl = await uploadMediaFile(mediaUrl);
      }
      if (isGallery && !mediaUrl) throw new Error('اختر صورة من الجهاز أو أدخل رابط الصورة.');
      let schedulePayload = {};
      if (isSchedule) {
        schedulePayload = { liturgyType: form.liturgyType };
        if (!form.startTime || !form.endTime) throw new Error('أكمل وقت البدء والانتهاء.');
        if (form.liturgyType === 'temporary') {
          if (!form.liturgyDate) throw new Error('حدد تاريخ القداس المؤقت.');
          const startAt = cairoDateTimeLocalToIso(`${form.liturgyDate}T${form.startTime}`);
          const endAt = cairoDateTimeLocalToIso(`${form.liturgyDate}T${form.endTime}`);
          if (new Date(endAt) <= new Date(startAt)) throw new Error('يجب أن يكون وقت الانتهاء بعد وقت البدء في اليوم نفسه.');
          schedulePayload = { liturgyType: 'temporary', startAt, endAt, autoDeleteAt: endAt, eventAt: startAt };
        } else {
          if (form.endTime <= form.startTime) throw new Error('يجب أن يكون وقت الانتهاء بعد وقت البدء.');
          schedulePayload = { liturgyType: 'permanent', dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime };
        }
      }
      const payload = {
        ...form,
        ...schedulePayload,
        mediaUrl,
      };
      const audienceChanged = !editingId || !originalAudience
        || audience.grade !== originalAudience.grade
        || audience.meetingGroup !== originalAudience.meetingGroup
        || (audienceNeedsReview && audienceReviewed);
      if (audienceChanged) Object.assign(payload, audience);
      delete payload.liturgyDate;
      if (!isSchedule || form.liturgyType === 'temporary') {
        delete payload.startTime;
        delete payload.endTime;
      }
      if (!isSchedule || form.liturgyType === 'temporary') delete payload.dayOfWeek;
      if (editingId) await api.updatePost(editingId, payload);
      else await api.createPost(payload);
      reset();
      await load();
      showToast(wasEditing ? 'تم تحديث المحتوى.' : 'تمت الإضافة بنجاح.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (post) => {
    if (!window.confirm(`حذف «${post.title}»؟`)) return;
    setError('');
    try {
      await api.deletePost(post._id);
      await load();
      if (editingId === post._id) reset();
      showToast('تم حذف المحتوى.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <a href={isGallery ? '/gallery' : '/liturgy'} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-amber-400">
          معاينة صفحة المستخدم
        </a>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
        <div className="flex items-center gap-2 text-amber-300">
          {isGallery ? <ImagePlus className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
          <h2 className="font-bold">{editingId ? 'تعديل العنصر' : (isGallery ? 'إضافة صورة جديدة' : 'إضافة موعد قداس')}</h2>
        </div>
        <GradeScopeFields
          user={user}
          grade={audience.grade}
          meetingGroup={audience.meetingGroup}
          onChange={(key, value) => setAudience((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }))}
          idPrefix={`${type}-audience`}
        />
        {audienceNeedsReview && <label className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm leading-6 text-amber-100">
          <input type="checkbox" checked={audienceReviewed} onChange={(event) => setAudienceReviewed(event.target.checked)} className="mt-1 accent-amber-400" />
          <span>هذا محتوى قديم بلا نطاق مرحلة محفوظ. راجع المرحلة والاجتماع أعلاه، ثم أكد النطاق قبل حفظه. اختيار كل المراحل يجعله محتوى مشتركًا.</span>
        </label>}
        <label className="block text-sm text-slate-300">
          {isGallery ? 'عنوان الصورة' : 'اسم القداس أو المناسبة'}
          <input required maxLength={200} value={form.title} onChange={(event) => update('title', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" placeholder={isGallery ? 'مثال: يوم روحي لخدام المرحلة' : 'مثال: قداس الأحد'} />
        </label>
        {isSchedule && <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <label className="block max-w-sm text-sm text-slate-300">
            نوع القداس
            <select value={form.liturgyType} onChange={(event) => update('liturgyType', event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
              <option value="permanent">دائم</option>
              <option value="temporary">مؤقت</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
              {form.liturgyType === 'temporary' && <label className="block text-sm text-slate-300">
                التاريخ
                <input required type="date" value={form.liturgyDate} onChange={(event) => update('liturgyDate', event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>}
              {form.liturgyType === 'permanent' && <label className="block text-sm text-slate-300">
                يوم التشغيل الأسبوعي
                <select value={form.dayOfWeek} onChange={(event) => update('dayOfWeek', event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white">
                  <option value="saturday">السبت</option>
                  <option value="sunday">الأحد</option>
                  <option value="monday">الإثنين</option>
                  <option value="tuesday">الثلاثاء</option>
                  <option value="wednesday">الأربعاء</option>
                  <option value="thursday">الخميس</option>
                  <option value="friday">الجمعة</option>
                </select>
              </label>}
              <label className="block text-sm text-slate-300">
                وقت البدء
                <input required type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
              <label className="block text-sm text-slate-300">
                وقت الانتهاء
                <input required type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
          </div>
          <p className="text-xs leading-5 text-slate-500">جميع الأوقات بتوقيت القاهرة. القداس الدائم يُحفظ بيوم التشغيل ووقتَي البدء والانتهاء، والقداس المؤقت يُخفى عند وقت الانتهاء.</p>
        </div>}
        {isGallery && <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <span className="block text-sm font-semibold text-slate-300">طريقة إضافة الصورة</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={imageSource === 'file'} onClick={() => setImageSource('file')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${imageSource === 'file' ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-200'}`}>من الكمبيوتر</button>
            <button type="button" aria-pressed={imageSource === 'link'} onClick={() => setImageSource('link')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${imageSource === 'link' ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-200'}`}>من رابط</button>
          </div>
          {imageSource === 'file' ? <label className="block text-sm text-slate-300">
            اختر صورة من جهازك
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!form.mediaUrl && !selectedFile} onChange={(event) => selectFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white file:ml-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:font-bold file:text-slate-950" />
            <span className="mt-1 block text-xs text-slate-500">سيتم تصغير الصورة وضغطها قبل رفعها. الحد الأقصى ٢ ميجابايت.</span>
          </label> : <label className="block text-sm text-slate-300">
            رابط الصورة HTTPS
            <input required type="url" value={form.mediaUrl} onChange={(event) => update('mediaUrl', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" placeholder="https://..." />
          </label>}
        </div>}
        <label className="block text-sm text-slate-300">
          {isGallery ? 'وصف الصورة (اختياري)' : 'تفاصيل الموعد (اختياري)'}
          <textarea maxLength={20000} rows={isGallery ? 3 : 4} value={form.body} onChange={(event) => update('body', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 leading-7 text-white" placeholder={isGallery ? 'أضف وصفاً قصيراً للصورة' : 'أضف الكنيسة أو ملاحظات الحجز أو تفاصيل الخدمة'} />
        </label>
        {isGallery && (filePreview || form.mediaUrl) && <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-400">معاينة الصورة</p>
          <PostMedia mediaUrl={filePreview || form.mediaUrl} mediaKind="image" title={form.title || 'معاينة الصورة'} className="max-h-72 w-full rounded-lg object-contain" />
        </div>}
        {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة ونشر'}
          </button>
          {editingId && <button type="button" disabled={saving} onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 disabled:opacity-50"><X className="h-4 w-4" />إلغاء التعديل</button>}
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-white">{isGallery ? 'الصور المنشورة' : 'القداسات المسجلة'}</h2>
          <div className="flex items-center gap-2">
            {isSchedule && <button type="button" onClick={() => void load(true)} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-400/40 disabled:opacity-50">
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث القائمة
            </button>}
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">{posts.length} عنصر</span>
          </div>
        </div>
        {loading && <div role="status" className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل القائمة...</div>}
        {!loading && posts.length === 0 && <p className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">لا توجد عناصر منشورة بعد.</p>}
        <div className={isGallery ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
          {posts.map((post) => <article key={post._id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {isGallery && <PostMedia mediaUrl={post.mediaUrl} mediaKind="image" title={post.title} className="aspect-[4/3] w-full object-cover" />}
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="break-words font-bold text-amber-300">{post.title}</h3>
                {!post.audienceMode && <p role="status" className="mt-2 text-xs text-amber-200">محتوى قديم بلا نطاق مرحلة؛ مخفي عن الطلاب حتى مراجعته.</p>}
                {isSchedule && (() => {
                  const temporary = post.liturgyType === 'temporary' || (!post.liturgyType && Boolean(post.eventAt));
                  const startAt = post.startAt || post.eventAt;
                  const expiresAt = post.endAt || post.autoDeleteAt;
                  const expired = expiresAt && new Date(expiresAt).getTime() <= scheduleCheckedAt;
                  const [, legacyStartTime] = cairoParts(startAt);
                  const [, legacyEndTime] = cairoParts(post.endAt);
                  return <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-3">
                    <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <div>
                      <p className="text-[11px] font-semibold text-amber-200">
                        {!temporary ? 'قداس دائم' : expired ? 'مؤقت • منتهٍ ومخفي' : !post.published ? 'قداس مؤقت • مخفي' : new Date(startAt).getTime() >= scheduleCheckedAt ? 'قداس مؤقت • قادم' : 'قداس مؤقت • سابق'}
                      </p>
                      {!temporary ? <p className="mt-1 text-sm font-semibold text-white">وقت القداس: {post.startTime || legacyStartTime || 'غير محدد'}{(post.endTime || legacyEndTime) ? ` – ${post.endTime || legacyEndTime}` : ''}</p>
                        : startAt && <p className="mt-1 text-sm font-semibold text-white">التاريخ ووقت البدء: {cairoDateTime(startAt)}</p>}
                      {temporary && post.endAt && <p className="mt-1 text-xs text-slate-300">وقت الانتهاء: {cairoDateTime(post.endAt)}</p>}
                      {temporary && <p className="mt-1 text-xs text-slate-400">يُخفى تلقائيًا عند انتهاء القداس.</p>}
                      {!temporary && <p className="mt-1 text-xs text-slate-400">يبقى القداس منشورًا حتى يحذفه الأدمن يدويًا.</p>}
                    </div>
                  </div>;
                })()}
                {post.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{post.body}</p>}
              </div>
              <div className="inline-flex h-fit shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-950/70">
                <button type="button" onClick={() => edit(post)} aria-label={`تعديل ${post.title}`} className="p-2 text-amber-300 transition hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                <span aria-hidden="true" className="w-px bg-slate-700" />
                <button type="button" onClick={() => void remove(post)} aria-label={`حذف ${post.title}`} className="p-2 text-rose-300 transition hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </article>)}
        </div>
      </section>
    </div>
  );
}
