require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { connectDB, testConnection } = require('./config/db');
const { isAllowedOrigin } = require('./config/origins');
const authRoutes = require('./routes/auth');
const ministryRoutes = require('./routes/ministry');
const { apiRateLimit } = require('./middleware/rateLimit');
const { getSessionCookie } = require('./utils/sessionCookies');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.VERCEL ? 1 : false);

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
}));
app.use(compression({ threshold: 1024 }));
app.use((req, res, next) => {
    res.set({
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    });
    if (req.secure || req.get('x-forwarded-proto') === 'https') {
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

app.get('/', (req, res) => res.json({
    name: 'Eltor Coptic API',
    status: 'online',
    health: '/api/health',
}));

const ensureDatabaseConnection = async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        next(Object.assign(new Error('Database connection is unavailable.'), { statusCode: 503 }));
    }
};

app.use('/api', apiRateLimit);
app.use('/api/media', express.json({ limit: '7mb' }));
app.use('/api', express.json({ limit: '1mb' }));
app.use('/api', (req, res, next) => {
    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!unsafeMethod || !getSessionCookie(req)) return next();

    if (!isAllowedOrigin(req.get('origin')) || req.get('x-requested-with') !== 'XMLHttpRequest') {
        return res.status(403).json({ message: 'تعذر التحقق من مصدر الطلب. أعد تحميل الصفحة وحاول مجدداً.' });
    }
    return next();
});
app.use('/api', ensureDatabaseConnection);
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    next();
});

app.get('/api/health', async (req, res) => {
    try {
        await testConnection();
        return res.json({ status: 'ok', database: 'mongodb' });
    } catch (error) {
        return res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

app.use('/api', authRoutes);
app.use('/api', ministryRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error?.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'The request body must contain valid JSON.' });
    }

    if (error?.type === 'entity.too.large') {
        return res.status(413).json({ message: 'The request body is too large.' });
    }

    if (error?.message === 'Origin is not allowed by CORS.') {
        return res.status(403).json({ message: error.message });
    }

    const statusCode = Number(error?.statusCode)
        || (error?.name === 'ValidationError' ? 422 : 0)
        || (error?.name === 'CastError' ? 400 : 0)
        || (error?.code === 11000 ? 409 : 0)
        || 500;
    if (statusCode >= 500) {
        console.error('Unhandled request error:', {
            name: error?.name || 'Error',
            method: req.method,
            path: req.path,
        });
    }

    return res.status(statusCode).json({
        message: statusCode >= 500
            ? 'An unexpected server error occurred.'
            : statusCode === 422
                ? 'The submitted data is invalid.'
                : statusCode === 409
                    ? 'A record with these unique details already exists.'
                    : statusCode === 400 && error?.name === 'CastError'
                        ? 'The request contains an invalid identifier.'
                        : error.message
    });
});

const startServer = async () => {
    await connectDB();

    if (process.env.VERCEL) {
        console.log('MongoDB connected successfully.');
        return app;
    }

    const port = Number(process.env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be a valid port number in backend/.env.');
    }

    return app.listen(port, () => {
        console.log('MongoDB connected successfully.');
        console.log('Backend running at http://localhost:' + port);
    });
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Unable to start backend:', error.message);
        process.exit(1);
    });
}

// Vercel detects this callable Express application as a serverless function.
module.exports = app;
module.exports.default = app;
module.exports.app = app;
module.exports.startServer = startServer;
