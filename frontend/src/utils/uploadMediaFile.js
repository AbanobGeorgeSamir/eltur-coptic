import { API_URL, api, request } from '../services/api';
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

  let session;
  try {
    session = await api.createMediaUploadSession(filename, contentType);
  } catch (error) {
    if (error?.status !== 503 || !/connect a vercel blob store/i.test(error.message || '')) {
      throw error;
    }

    // Small uploads can still be stored by the API while Blob is not connected.
    const body = new FormData();
    body.append('file', selected, filename);
    const response = await request('/media', {
      method: 'POST',
      body,
      timeoutMs: 45_000,
    });
    const safeUrl = resolveSafeMediaUrl(response?.data?.url, API_URL);
    if (!safeUrl || safeUrl.protocol === 'blob:') {
      throw new Error('Could not create a safe URL for the uploaded file.');
    }
    return response.data.url;
  }

  // The API has already issued a narrowly scoped, short-lived PUT URL. Upload
  // directly to Blob instead of asking the browser SDK to mint a second URL.
  const uploadUrl = new URL(session.uploadUrl);
  if (uploadUrl.protocol !== 'https:' || !uploadUrl.hostname) {
    throw new Error('The file upload address is invalid.');
  }
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: selected,
  });
  const uploaded = await response.json().catch(() => ({}));
  if (!response.ok || typeof uploaded.url !== 'string') {
    throw new Error(uploaded.message || 'The file upload failed. Please try again.');
  }

  const asset = await api.completeMediaUpload(session.id, uploaded.url);
  const storedUrl = asset?.url || `${API_URL}/media/${asset?.id || ''}`;
  const safeUrl = resolveSafeMediaUrl(storedUrl, API_URL);
  if (!safeUrl || safeUrl.protocol === 'blob:') {
    throw new Error('Could not create a safe URL for the uploaded file.');
  }
  return storedUrl;
}
