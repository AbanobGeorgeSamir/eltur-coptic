import { uploadPresigned } from '@vercel/blob/client';
import { API_URL, api } from '../services/api';
import { resolveSafeMediaUrl } from './mediaUrl';

const contentTypeForExtension = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

async function readSelectedFile(file, requestedName) {
  let selected = file;
  let filename = requestedName || (typeof file?.name === 'string' ? file.name : '');

  if (typeof file === 'string') {
    let blobUrl;
    try {
      blobUrl = new URL(file, window.location.href);
    } catch {
      throw new Error('Choose a file from this device to upload.');
    }
    if (blobUrl.protocol !== 'blob:' || blobUrl.origin !== window.location.origin) {
      throw new Error('Choose a file from this device to upload.');
    }
    const response = await fetch(blobUrl.href);
    if (!response.ok) throw new Error('Could not read the selected file.');
    selected = await response.blob();
  }

  if (!selected || typeof selected.size !== 'number') {
    throw new Error('Choose a file from this device to upload.');
  }
  if (!filename.trim()) {
    const extension = Object.entries(contentTypeForExtension)
      .find(([, type]) => type === selected.type)?.[0] || '';
    filename = `church-file${extension ? `.${extension}` : ''}`;
  }
  return { selected, filename };
}

export async function uploadMediaFile(file, requestedName = '') {
  if (!file) return '';
  const { selected, filename } = await readSelectedFile(file, requestedName);
  if (selected.size <= 0) throw new Error('Choose a non-empty file.');

  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const contentType = contentTypeForExtension[extension];
  if (!contentType) {
    throw new Error('Choose a JPEG, PNG, WebP, GIF, or PDF file.');
  }

  const session = await api.createMediaUploadSession(filename, contentType);
  let uploaded;
  const apiOrigin = new URL(API_URL, window.location.origin).origin;
  if (apiOrigin === window.location.origin) {
    uploaded = await uploadPresigned(session.pathname, selected, {
      access: 'public',
      contentType,
      handleUploadUrl: `${API_URL}/media/${encodeURIComponent(session.id)}/presigned`,
      clientPayload: session.id,
      multipart: selected.size > 100 * 1024 * 1024,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Session-Transport': 'cookie',
      },
    });
  } else {
    // Custom cross-origin VITE_API_URL setups can still use the scoped one-file
    // URL returned by the API without trying to send a cookie cross-origin.
    const response = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: selected,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.url !== 'string') {
      throw new Error('The file upload failed. Please try again.');
    }
    uploaded = result;
  }

  const asset = await api.completeMediaUpload(session.id, uploaded.url);
  const storedUrl = asset?.url || `${API_URL}/media/${asset?.id || ''}`;
  const safeUrl = resolveSafeMediaUrl(storedUrl, API_URL);
  if (!safeUrl || safeUrl.protocol === 'blob:') {
    throw new Error('Could not create a safe URL for the uploaded file.');
  }
  return storedUrl;
}
