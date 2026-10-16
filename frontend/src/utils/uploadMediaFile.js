import { API_URL, api } from '../services/api';
import { resolveSafeMediaUrl } from './mediaUrl';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const extensionForMimeType = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function readSelectedFile(file, requestedName) {
  let selected = file;
  let filename = requestedName || (typeof file?.name === 'string' ? file.name : '');

  if (typeof file === 'string') {
    let blobUrl;
    try {
      blobUrl = new URL(file, window.location.href);
    } catch {
      throw new Error('اختر ملفاً من الجهاز لرفعه بأمان.');
    }
    if (blobUrl.protocol !== 'blob:' || blobUrl.origin !== window.location.origin) {
      throw new Error('لا يمكن رفع هذا الرابط. اختر ملفاً من الجهاز.');
    }
    const response = await fetch(blobUrl.href);
    if (!response.ok) throw new Error('تعذرت قراءة الملف المختار من المتصفح.');
    selected = await response.blob();
  }

  if (!selected || typeof selected.arrayBuffer !== 'function' || typeof selected.size !== 'number') {
    throw new Error('اختر ملفاً من الجهاز لرفعه بأمان.');
  }
  if (!filename.trim()) {
    const extension = extensionForMimeType[selected.type] || '';
    filename = `church-file${extension ? `.${extension}` : ''}`;
  }
  return { selected, filename };
}

export async function uploadMediaFile(file, requestedName = '') {
  if (!file) return '';
  const { selected, filename } = await readSelectedFile(file, requestedName);
  if (selected.size <= 0 || selected.size > MAX_UPLOAD_BYTES) {
    throw new Error('حجم الملف يجب ألا يتجاوز 5 ميجابايت.');
  }
  if (!/\.(pdf|jpe?g|png|webp|gif)$/i.test(filename)) {
    throw new Error('اختر ملف PDF أو صورة بصيغة JPEG أو PNG أو WebP أو GIF.');
  }

  // Convert the browser File/Blob (including a same-page blob: URL) to bytes
  // before sending it. The server stores these bytes and returns a stable URL.
  const bytes = await selected.arrayBuffer();
  const uploadBlob = new Blob([bytes], { type: selected.type || 'application/octet-stream' });
  const asset = await api.uploadMedia(uploadBlob, filename);
  const storedUrl = asset?.url || `${API_URL}/media/${asset?.id || ''}`;
  const safeUrl = resolveSafeMediaUrl(storedUrl, API_URL);
  if (!safeUrl || safeUrl.protocol === 'blob:') {
    throw new Error('تعذر إنشاء رابط آمن للملف المرفوع.');
  }
  return storedUrl;
}
