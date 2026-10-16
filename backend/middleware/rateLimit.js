const crypto = require('node:crypto');

const MAX_CLIENTS = 50_000;

const createRateLimiter = ({ limit, windowMs, message, keyFor }) => {
    const clients = new Map();
    let lastCleanup = 0;

    return async (req, res, next) => {
        const now = Date.now();
        const key = String(keyFor ? keyFor(req) : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`).slice(0, 128);
        let count;
        let resetAt;

        if (now - lastCleanup > 60_000) {
            for (const [clientKey, entry] of clients) {
                if (entry.resetAt <= now) clients.delete(clientKey);
            }
            lastCleanup = now;
        }

        let entry = clients.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            clients.set(key, entry);
        }

        if (clients.size > MAX_CLIENTS) {
            const oldestKey = clients.keys().next().value;
            if (oldestKey !== undefined && oldestKey !== key) clients.delete(oldestKey);
        }

        count = entry.count + 1;
        resetAt = entry.resetAt;
        if (count <= limit) entry.count = count;

        const remaining = Math.max(0, limit - count);
        res.set({
            'RateLimit-Limit': String(limit),
            'RateLimit-Remaining': String(remaining),
            'RateLimit-Reset': String(Math.ceil((resetAt - now) / 1000)),
        });

        if (count > limit) {
            const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ message });
        }

        return next();
    };
};

const apiRateLimit = createRateLimiter({
    limit: 600,
    windowMs: 60_000,
    message: 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.',
});

const loginRateLimit = createRateLimiter({
    limit: 10,
    windowMs: 15 * 60_000,
    message: 'محاولات تسجيل الدخول كثيرة. انتظر قليلاً ثم حاول مجدداً.',
});

const loginAccountRateLimit = createRateLimiter({
    limit: 20,
    windowMs: 15 * 60_000,
    keyFor: (req) => {
        const identifier = String(req.body?.name || req.body?.username || '').trim().toLowerCase();
        return `account:${crypto.createHash('sha256').update(identifier).digest('hex')}`;
    },
    message: 'Too many login attempts for this account. Wait a while and try again.',
});

const registrationRateLimit = createRateLimiter({
    limit: 30,
    windowMs: 60 * 60_000,
    message: 'تم تجاوز عدد محاولات إنشاء الحساب. حاول مجدداً بعد قليل.',
});

const mediaUploadRateLimit = createRateLimiter({
    limit: 8,
    windowMs: 10 * 60_000,
    keyFor: (req) => `media:${req.user?._id || req.ip || req.socket.remoteAddress || 'unknown'}`,
    message: 'Too many uploads. Wait a while and try again.',
});

const bulkWriteRateLimit = createRateLimiter({
    limit: 30,
    windowMs: 60_000,
    keyFor: (req) => `bulk:${req.user?._id || req.ip || req.socket.remoteAddress || 'unknown'}`,
    message: 'Too many bulk updates. Wait a while and try again.',
});

module.exports = {
    apiRateLimit,
    loginRateLimit,
    loginAccountRateLimit,
    registrationRateLimit,
    mediaUploadRateLimit,
    bulkWriteRateLimit,
};
