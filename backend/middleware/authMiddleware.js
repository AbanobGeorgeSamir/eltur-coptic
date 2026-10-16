const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SESSION_MAX_AGE_SECONDS, getSessionCookie, setSessionCookie } = require('../utils/sessionCookies');
const { isBrowserRequest } = require('../config/origins');
const SESSION_REFRESH_THRESHOLD_SECONDS = Math.floor(SESSION_MAX_AGE_SECONDS / 2);

module.exports = async (req, res, next) => {
    let payload;
    let authenticatedWithBearer = false;
    const browserRequest = isBrowserRequest(req);
    const authorization = req.get('authorization') || '';
    const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const cookieToken = getSessionCookie(req);
    const tokens = (browserRequest ? [cookieToken, bearerToken] : [bearerToken, cookieToken]).filter(Boolean);

    for (const token of tokens) {
        if (token.length > 4096) continue;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            authenticatedWithBearer = token === bearerToken && Boolean(bearerToken);
            break;
        } catch {
            // An expired bearer token should not hide a valid browser session cookie.
        }
    }

    if (!payload) {
        return res.status(401).json({
            message: tokens.length ? 'Unauthorized. Please login again.' : 'Unauthorized. Please login.',
        });
    }

    try {
        const user = await User.findById(payload.userId);

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized. User account not found.' });
        }
        if (user.isActive === false) {
            return res.status(403).json({ message: 'This account is disabled. Contact the church administrator.' });
        }

        req.user = user;
        if (browserRequest) {
            const renewedToken = jwt.sign(
                { userId: String(user._id) },
                process.env.JWT_SECRET,
                { expiresIn: SESSION_MAX_AGE_SECONDS, algorithm: 'HS256' },
            );
            setSessionCookie(res, renewedToken);
        } else if (authenticatedWithBearer && Number.isFinite(payload.exp)
            && payload.exp - Math.floor(Date.now() / 1000) <= SESSION_REFRESH_THRESHOLD_SECONDS) {
            const renewedToken = jwt.sign(
                { userId: String(user._id) },
                process.env.JWT_SECRET,
                { expiresIn: SESSION_MAX_AGE_SECONDS, algorithm: 'HS256' },
            );
            res.set('X-Session-Token', renewedToken);
        }
        return next();
    } catch (error) {
        return next(error);
    }
};
