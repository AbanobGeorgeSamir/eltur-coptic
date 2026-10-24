import { useState } from 'react';
import { Download } from 'lucide-react';
import { API_URL } from '../services/api';
import { resolveSafeMediaUrl } from '../utils/mediaUrl';

export default function PostMedia({ mediaUrl, mediaKind = 'image', title = 'مرفق', className = '', downloadable = false }) {
  const [failed, setFailed] = useState(false);
  if (!mediaUrl) return null;

  const parsedMediaUrl = resolveSafeMediaUrl(mediaUrl, API_URL);
  if (!parsedMediaUrl) return null;

  let kind = mediaKind;
  if (/\.pdf$/i.test(parsedMediaUrl.pathname)) kind = 'pdf';

  if (kind === 'image') {
    const downloadUrl = new URL(parsedMediaUrl);
    if (/\/media\/[a-f\d]{24}\/?$/i.test(downloadUrl.pathname)) {
      downloadUrl.searchParams.set('download', '1');
    }
    return <div>
      {failed
        ? <a href={parsedMediaUrl.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="text-sm text-amber-300 underline">فتح الصورة</a>
        : <a href={parsedMediaUrl.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block">
          <img src={parsedMediaUrl.href} alt={title || 'مرفق'} width="1200" height="800" loading="lazy" decoding="async" onError={() => setFailed(true)} className={className || 'mt-3 aspect-[3/2] max-h-96 w-full rounded-xl bg-slate-950/40 object-contain'} />
        </a>}
      {downloadable && <a href={downloadUrl.href} download={`${title || 'صورة'}.jpg`} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">
        <Download className="h-4 w-4" />تنزيل الصورة
      </a>}
    </div>;
  }

  return <a href={parsedMediaUrl.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">
    {kind === 'pdf' ? 'فتح ملف PDF' : 'فتح الرابط'}
  </a>;
}
