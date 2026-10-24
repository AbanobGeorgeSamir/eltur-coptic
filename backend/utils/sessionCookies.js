const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const SESSION_COOKIE = production ? '__Host-eltor_session' : 'eltor_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const getSessionCookie = (req) => {
    const header = String(req.headers.cookie || '');
    for (const cookie of header.split(';')) {
        const separator = cookie.indexOf('=');
        if (separator < 0 || cookie.slice(0, separator).trim() !== SESSION_COOKIE) continue;
        try {
            return decodeURIComponent(cookie.slice(separator + 1).trim());
        } catch {
            return '';
        }
    }
    return '';
};

const cookieOptions = (maxAge) => [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    ...(production ? ['Secure'] : []),
    `Max-Age=${maxAge}`,
].join('; ');

const setSessionCookie = (res, token) => {
    const value = encodeURIComponent(token);
    res.append('Set-Cookie', cookieOptions(SESSION_MAX_AGE_SECONDS).replace(`${SESSION_COOKIE}=`, `${SESSION_COOKIE}=${value}`));
};

const clearSessionCookie = (res) => {
    res.append('Set-Cookie', cookieOptions(0));
};

module.exports = { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, getSessionCookie, setSessionCookie, clearSessionCookie };
