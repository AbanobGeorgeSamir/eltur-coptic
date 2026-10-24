const crypto = require('node:crypto');
const mongoose = require('mongoose');

const MAX_CLIENTS = 50_000;
const distributedStoreEnabled = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const rateLimitSchema = new mongoose.Schema({
    _id: { type: String },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
}, { versionKey: false, collection: 'rate_limit_buckets' });
const RateLimitBucket = mongoose.models.RateLimitBucket
    || mongoose.model('RateLimitBucket', rateLimitSchema);
let indexesReady;

const incrementDistributedBucket = async (key, now, windowMs) => {
    if (!indexesReady) {
        indexesReady = RateLimitBucket.createIndexes().catch((error) => {
            indexesReady = null;
            throw error;
        });
    }
    await indexesReady;
    const start = Math.floor(now / windowMs) * windowMs;
    const bucketKey = crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(`${key}:${start}`)
        .digest('hex');
    const update = {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(start + windowMs + 60_000) },
    };
    try {
        const entry = await RateLimitBucket.findOneAndUpdate(
            { _id: bucketKey }, update, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
        ).lean();
        return { count: entry.count, resetAt: start + windowMs };
    } catch (error) {
        // Concurrent first requests can race to upsert the same bucket.
        if (error?.code !== 11000) throw error;
        const entry = await RateLimitBucket.findOneAndUpdate(
            { _id: bucketKey }, { $inc: { count: 1 } }, { returnDocument: 'after' },
        ).lean();
        return { count: entry.count, resetAt: start + windowMs };
    }
};

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

        if (distributedStoreEnabled()) {
            try {
                ({ count, resetAt } = await incrementDistributedBucket(key, now, windowMs));
            } catch (error) {
                return next(Object.assign(new Error('Rate limiting is temporarily unavailable.'), { statusCode: 503 }));
            }
        } else {
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
        }

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
        const secret = process.env.JWT_SECRET || 'local-rate-limit-key';
        return `account:${crypto.createHmac('sha256', secret).update(identifier).digest('hex')}`;
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
    createRateLimiter,
};
