const productionOrigins = ['https://eltur-coptic.vercel.app'];
const localOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const configuredOrigins = [process.env.FRONTEND_URL, process.env.CLIENT_ORIGIN]
    .flatMap((value) => String(value || '').split(','));

const allowedOrigins = new Set([...productionOrigins, ...localOrigins, ...configuredOrigins]
    .map((origin) => origin.trim())
    .filter(Boolean));

const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);
const isBrowserOrigin = (origin) => Boolean(origin && allowedOrigins.has(origin));
const getRequestOrigin = (req) => {
    const origin = req.get('origin');
    if (origin) return origin;
    try {
        return new URL(req.get('referer')).origin;
    } catch {
        return null;
    }
};

const isBrowserRequest = (req) => {
    // The web client calls the API through a same-origin hosting proxy. Some
    // proxies strip Origin, Referer, and Fetch Metadata headers, so the client
    // explicitly requests the HttpOnly cookie session transport.
    if (req.get('x-session-transport') === 'cookie') return true;

    const origin = getRequestOrigin(req);
    if (origin) return isBrowserOrigin(origin);

    // Reverse proxies can omit Origin and Referer. Fetch Metadata is browser-set
    // and lets same-site browser sessions retain their HttpOnly cookie flow.
    const site = req.get('sec-fetch-site');
    const mode = req.get('sec-fetch-mode');
    return ['same-origin', 'same-site'].includes(site)
        && ['cors', 'same-origin'].includes(mode);
};

module.exports = { allowedOrigins, isAllowedOrigin, isBrowserOrigin, isBrowserRequest, getRequestOrigin };
