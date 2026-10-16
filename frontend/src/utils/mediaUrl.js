export function resolveSafeMediaUrl(value, apiBaseUrl, pageOrigin) {
  if (typeof value !== 'string' || !value.trim()) return null;

  const currentOrigin = pageOrigin
    || (typeof window !== 'undefined' ? window.location.origin : 'https://eltur-coptic.vercel.app');

  try {
    const pageUrl = new URL(currentOrigin);
    const mediaUrl = new URL(value, pageUrl);
    const apiOrigin = new URL(apiBaseUrl || '/api', pageUrl).origin;
    const trustedHttpOrigins = new Set([pageUrl.origin, apiOrigin]);
    const trustedApiHosts = new Set([
      new URL(apiOrigin).hostname,
      'eltur-coptic-api-server.vercel.app',
    ]);

    if (mediaUrl.protocol === 'blob:' && mediaUrl.origin === pageUrl.origin) return mediaUrl;

    // Older uploads could have been stored with an HTTP API URL behind a
    // reverse proxy. Upgrade only the known API host when viewed on HTTPS.
    if (mediaUrl.protocol === 'http:'
      && pageUrl.protocol === 'https:'
      && trustedApiHosts.has(mediaUrl.hostname)) {
      mediaUrl.protocol = 'https:';
    }

    const localDevelopment = pageUrl.protocol === 'http:'
      && ['localhost', '127.0.0.1'].includes(pageUrl.hostname)
      && trustedHttpOrigins.has(mediaUrl.origin);
    if (mediaUrl.protocol !== 'https:' && !localDevelopment) {
      return null;
    }

    return mediaUrl;
  } catch {
    return null;
  }
}
