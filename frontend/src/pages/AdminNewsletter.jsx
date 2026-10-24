import { useEffect, useState } from 'react';
import { api } from '../services/api';
import PostMedia from '../components/PostMedia';
import { uploadMediaFile } from '../utils/uploadMediaFile';
import { useAuth } from '../contexts/useAuth';
import GradeScopeFields from '../components/GradeScopeFields';

export default function AdminNewsletter({ showToast }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [type, setType] = useState('newsletter');
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaKind, setMediaKind] = useState('image');
  const [audience, setAudience] = useState({ grade: '', meetingGroup: '' });
  const [originalAudience, setOriginalAudience] = useState(null);
  const [audienceNeedsReview, setAudienceNeedsReview] = useState(false);
  const [audienceReviewed, setAudienceReviewed] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => Promise.all([api.posts('newsletter'), api.posts('sunday_lesson')])
    .then((collections) => setPosts(collections.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
    .catch((requestError) => setError(requestError.message));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId && audienceNeedsReview && !audienceReviewed) {
        throw new Error('يُرجى مراجعة نطاق المرحلة لهذا المحتوى القديم وتأكيده قبل الحفظ.');
      }
      const uploadedUrl = attachmentFile ? await uploadMediaFile(attachmentFile) : mediaUrl;
      const payload = { type, title, body, eventAt: eventAt || undefined, mediaUrl: uploadedUrl, mediaKind };
      const audienceChanged = !editingId || !originalAudience
        || audience.grade !== originalAudience.grade
        || audience.meetingGroup !== originalAudience.meetingGroup
        || (audienceNeedsReview && audienceReviewed);
      if (audienceChanged) Object.assign(payload, audience);
      if (editingId) await api.updatePost(editingId, payload);
      else await api.createPost(payload);
      setTitle('');
      setBody('');
      setEventAt('');
      setMediaUrl('');
      setMediaKind('image');
      setAttachmentFile(null);
      setEditingId('');
      setAudience({ grade: '', meetingGroup: '' });
      setOriginalAudience(null);
      setAudienceNeedsReview(false);
      setAudienceReviewed(false);
      await load();
      showToast(editingId ? 'تم تحديث المحتوى' : 'تم نشر المحتوى');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (post) => {
    setEditingId(post._id);
    setType(post.type);
    setTitle(post.title);
    setBody(post.body || '');
    setEventAt(post.eventAt ? new Date(post.eventAt).toISOString().slice(0, 10) : '');
    setMediaUrl(post.mediaUrl || '');
    setMediaKind(post.mediaKind || 'image');
    setAudience({ grade: post.grade || '', meetingGroup: String(post.meetingGroup?._id || post.meetingGroup || '') });
    setOriginalAudience({ grade: post.grade || '', meetingGroup: String(post.meetingGroup?._id || post.meetingGroup || '') });
    setAudienceNeedsReview(!post.audienceMode);
    setAudienceReviewed(false);
    setAttachmentFile(null);
  };

  const remove = async (id) => {
    if (!window.confirm('هل تريد حذف هذا المحتوى؟')) return;
    setError('');
    try {
      await api.deletePost(id);
      await load();
      showToast('تم حذف المحتوى');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <div><h1 className="text-2xl font-bold text-white">النشرات والإعلانات</h1><p className="text-sm text-slate-400 mt-1">الإعلانات المنشورة من حسابك.</p></div>
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-2xl space-y-4">
        <GradeScopeFields user={user} grade={audience.grade} meetingGroup={audience.meetingGroup} onChange={(key, value) => setAudience((current) => ({ ...current, [key]: value, ...(key === 'grade' ? { meetingGroup: '' } : {}) }))} idPrefix="post-audience" />
        {audienceNeedsReview && <label className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm leading-6 text-amber-100">
          <input type="checkbox" checked={audienceReviewed} onChange={(event) => setAudienceReviewed(event.target.checked)} className="mt-1 accent-amber-400" />
          <span>هذا محتوى قديم بلا نطاق مرحلة محفوظ. راجع المرحلة والاجتماع أعلاه، ثم أكد النطاق قبل حفظه. اختيار كل المراحل يجعله محتوى مشتركًا.</span>
        </label>}
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 bg-slate-800 rounded-xl text-sm text-white border border-slate-700">
          <option value="newsletter">إعلان ونشرة</option><option value="sunday_lesson">درس مدارس الأحد</option>
        </select>
        <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإعلان أو الرحلة" className="w-full p-3 bg-slate-800 rounded-xl text-sm text-white border border-slate-700" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="تفاصيل الإعلان" className="w-full p-3 bg-slate-800 rounded-xl text-sm text-white border border-slate-700 min-h-28" />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300">موعد الفعالية<input type="date" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className="block mt-1 w-full p-2 bg-slate-800 rounded-xl border border-slate-700 text-white" /></label>
          <label className="text-sm text-slate-300">نوع المرفق
            <select value={mediaKind} onChange={(e) => setMediaKind(e.target.value)} className="block mt-1 w-full p-2 bg-slate-800 rounded-xl border border-slate-700 text-white">
              <option value="image">صورة</option><option value="pdf">ملف PDF</option><option value="link">رابط آخر</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">رابط HTTPS للمرفق (اختياري)<input type="url" value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); if (e.target.value) setAttachmentFile(null); }} className="block mt-1 w-full p-2 bg-slate-800 rounded-xl border border-slate-700 text-white" /></label>
        </div>
        <label className="block text-sm text-slate-300">مرفق من الجهاز (صورة أو PDF، حتى 5 ميجابايت)
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={(event) => { const file = event.target.files?.[0] || null; setAttachmentFile(file); setMediaUrl(''); if (file) setMediaKind(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'); }} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm text-white file:ml-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:font-bold file:text-slate-950" />
          {attachmentFile && <span className="mt-1 block text-xs text-amber-300">{attachmentFile.name}</span>}
        </label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex gap-2">
          <button disabled={saving} className="px-5 py-3 bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm">{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'نشر المحتوى'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(''); setTitle(''); setBody(''); setEventAt(''); setMediaUrl(''); setAttachmentFile(null); setOriginalAudience(null); setAudience({ grade: '', meetingGroup: '' }); setAudienceNeedsReview(false); setAudienceReviewed(false); }} className="px-4 py-3 border border-slate-600 text-slate-200 rounded-xl text-sm">إلغاء</button>}
        </div>
      </form>
      <section className="space-y-3">
        <h2 className="font-bold text-white">الإعلانات السابقة</h2>
        {posts.map((post) => <article key={post._id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><span className="text-[11px] text-slate-400">{post.type}</span>{!post.audienceMode && <p role="status" className="mt-1 text-xs text-amber-200">محتوى قديم بلا نطاق مرحلة؛ مخفي عن الطلاب حتى مراجعته.</p>}<h3 className="font-bold text-amber-300">{post.title}</h3><p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{post.body}</p><PostMedia mediaUrl={post.mediaUrl} mediaKind={post.mediaKind} title={post.title} /></div>
            <div className="flex gap-2 shrink-0"><button onClick={() => edit(post)} className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-amber-300">تعديل</button><button onClick={() => remove(post._id)} className="px-3 py-2 rounded-lg bg-rose-900/50 text-xs text-rose-200">حذف</button></div>
          </div>
        </article>)}
        {!posts.length && !error && <p className="text-sm text-slate-400">لا توجد إعلانات بعد.</p>}
      </section>
    </div>
  );
}
