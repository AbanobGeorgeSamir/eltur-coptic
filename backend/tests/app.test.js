const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-local-validation';
const User = require('../models/User');
const Confession = require('../models/Confession');
const MeetingGroup = require('../models/MeetingGroup');
const PhotoAsset = require('../models/PhotoAsset');
const dbConfig = require('../config/db');
const { normalizeMongoUri, DEFAULT_DB_NAME } = dbConfig;
const { hashPassword } = require('../utils/passwords');
dbConfig.connectDB = async () => {};
dbConfig.testConnection = async () => {};
const app = require('../server');

const makeRequest = (server, path, headers = {}, { method = 'GET', body } = {}) => new Promise((resolve, reject) => {
    const request = http.request({
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers,
    }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ response, body }));
    });
    request.on('error', reject);
    request.end(body);
});

test('student registration creates a session without phone verification', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const originalCreate = User.create;
    const originalFind = User.find;
    const originalCountDocuments = MeetingGroup.countDocuments;
    User.create = async (input) => ({ ...input, _id: 'student-id' });
    User.find = () => ({ select: () => ({ lean: async () => [] }) });
    MeetingGroup.countDocuments = async () => 0;
    t.after(() => {
        User.create = originalCreate;
        User.find = originalFind;
        MeetingGroup.countDocuments = originalCountDocuments;
    });

    const { response, body } = await makeRequest(server, '/api/auth/register', {
        'content-type': 'application/json',
    }, {
        method: 'POST',
        body: JSON.stringify({
            name: 'Test Student Person Name',
            username: 'teststudent',
            email: 'student@example.com',
            phone: '+201001234567',
            password: 'secure-password',
            fatherName: 'Father',
            confessionFather: 'Confessor',
            guardianPhone: '+201009876543',
            address: 'Test address',
            interests: 'Bible study',
            grade: 'secondary',
            birthDate: '2010-01-01',
            gender: 'male',
            nationalId: '12345678901234',
            privacyAccepted: true,
        }),
    });

    assert.equal(response.statusCode, 201);
    assert.ok(JSON.parse(body).token);
    assert.equal(JSON.parse(body).user.phone, '+201001234567');
    assert.equal(JSON.parse(body).user.grade, 'secondary');
    assert.equal(JSON.parse(body).user.interests, 'Bible study');
    assert.equal(JSON.parse(body).user.nationalId, undefined);
});

test('registration rejects names without four parts and emails with spaces or non-.com domains', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const base = {
        name: 'Mary Mina George Hanna',
        username: 'marymina',
        email: 'student@example.com',
        phone: '+201001234567',
        password: 'secure-password',
        fatherName: 'Father',
        confessionFather: 'Confessor',
        guardianPhone: '+201009876543',
        address: 'Test address',
        birthDate: '2010-01-01',
        gender: 'female',
        nationalId: '12345678901234',
        privacyAccepted: true,
    };

    for (const invalid of [
        { name: 'Mary Mina George' },
        { email: 'student @example.com' },
        { email: 'student@example.org' },
    ]) {
        const { response } = await makeRequest(server, '/api/auth/register', {
            'content-type': 'application/json',
        }, { method: 'POST', body: JSON.stringify({ ...base, ...invalid }) });
        assert.equal(response.statusCode, 422);
    }
});

test('students can add only their own confession date, linked to their assigned admin', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const studentId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const student = { _id: studentId, assignedAdmin: adminId, role: 'student' };
    const originalFindById = User.findById;
    const originalCreate = Confession.create;
    const originalFind = Confession.find;
    User.findById = async () => student;
    Confession.find = () => ({ sort: async () => [] });
    Confession.create = async (record) => ({ _id: new mongoose.Types.ObjectId(), ...record });
    t.after(() => {
        User.findById = originalFindById;
        Confession.find = originalFind;
        Confession.create = originalCreate;
    });

    const token = jwt.sign({ userId: String(studentId) }, process.env.JWT_SECRET);
    const ownRecord = await makeRequest(server, '/api/confessions', {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
    }, {
        method: 'POST',
        body: JSON.stringify({ studentId: String(studentId), date: '2026-10-10', note: 'saved' }),
    });
    assert.equal(ownRecord.response.statusCode, 201);
    assert.equal(JSON.parse(ownRecord.body).data.admin, String(adminId));

    const otherStudent = await makeRequest(server, '/api/confessions', {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
    }, {
        method: 'POST',
        body: JSON.stringify({ studentId: String(new mongoose.Types.ObjectId()), date: '2026-10-10' }),
    });
    assert.equal(otherStudent.response.statusCode, 403);
});

test('login returns a usable session for the registered username and password', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const user = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Mary Mina George Hanna',
        username: 'marymina',
        email: 'mary@example.com',
        phone: '+201001234567',
        role: 'student',
        password: await hashPassword('secure-password'),
    };
    const originalFindOne = User.findOne;
    User.findOne = (query) => ({ select: async () => query.$or.some((item) => Object.values(item)[0] === user.username || Object.values(item)[0] === user.email) ? user : null });
    t.after(() => { User.findOne = originalFindOne; });

    for (const loginName of ['MaryMina', user.email.toUpperCase()]) {
        const { response, body } = await makeRequest(server, '/api/auth/login', {
            'content-type': 'application/json',
        }, { method: 'POST', body: JSON.stringify({ username: loginName, password: 'secure-password' }) });
        assert.equal(response.statusCode, 200);
        assert.equal(JSON.parse(body).user.id, String(user._id));
        assert.ok(JSON.parse(body).token);
    }

    const browserLogin = await makeRequest(server, '/api/auth/login', {
        'content-type': 'application/json',
        'x-session-transport': 'cookie',
    }, { method: 'POST', body: JSON.stringify({ name: 'marymina', password: 'secure-password' }) });
    assert.equal(browserLogin.response.statusCode, 200);
    assert.equal(JSON.parse(browserLogin.body).token, undefined);
    assert.ok(browserLogin.response.headers['set-cookie'].some((cookie) => cookie.startsWith('eltor_session=')));
});

test('mobile bearer sessions receive a renewed token before expiry', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const userId = new mongoose.Types.ObjectId();
    const user = {
        _id: userId,
        name: 'Mary Mina George Hanna',
        username: 'marymina',
        role: 'student',
        isActive: true,
    };
    const originalFindById = User.findById;
    User.findById = async () => user;
    t.after(() => { User.findById = originalFindById; });

    const expiringToken = jwt.sign(
        { userId: String(userId) },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
    );
    const { response, body } = await makeRequest(server, '/api/auth/me', {
        authorization: `Bearer ${expiringToken}`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(body).user.id, String(userId));
    const renewedToken = response.headers['x-session-token'];
    assert.ok(renewedToken);
    assert.ok(jwt.verify(renewedToken, process.env.JWT_SECRET).exp > jwt.verify(expiringToken, process.env.JWT_SECRET).exp);
});

test('the cookie-session request hint does not bypass CORS origin checks', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const { response } = await makeRequest(server, '/api/auth/login', {
        origin: 'https://attacker.example',
        'x-session-transport': 'cookie',
        'content-type': 'application/json',
    }, { method: 'POST', body: JSON.stringify({ name: 'marymina', password: 'secure-password' }) });
    assert.equal(response.statusCode, 403);
});

test('MongoDB connections use the Eltor Coptic database name', () => {
    const normalized = normalizeMongoUri('mongodb://localhost:27017/legacy?retryWrites=true');
    assert.equal(DEFAULT_DB_NAME, 'eltor_coptic');
    assert.match(normalized, /\/eltor_coptic(?:\?|$)/);
});

test('the root endpoint identifies the Eltor Coptic API', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const { response, body } = await makeRequest(server, '/');
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(body).name, 'Eltor Coptic API');
});

test('unknown routes return a JSON 404 with production safety headers', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const { response, body } = await makeRequest(server, '/missing');
    assert.equal(response.statusCode, 404);
    assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(JSON.parse(body).message, 'Route not found.');
});

test('public API routes respond and protected routes reject anonymous requests', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const contact = await makeRequest(server, '/api/contact');
    assert.equal(contact.response.statusCode, 200);
    assert.ok(Object.hasOwn(JSON.parse(contact.body), 'whatsappUrl'));

    const privacy = await makeRequest(server, '/api/privacy-policy');
    assert.equal(privacy.response.statusCode, 200);
    assert.ok(JSON.parse(privacy.body).sections.length > 0);

    const protectedRoute = await makeRequest(server, '/api/attendance');
    assert.equal(protectedRoute.response.statusCode, 401);

    const quizAttempts = await makeRequest(server, '/api/quiz-attempts');
    assert.equal(quizAttempts.response.statusCode, 401);

    const removedSendOtp = await makeRequest(server, '/api/auth/otp/send', {}, { method: 'POST' });
    assert.equal(removedSendOtp.response.statusCode, 404);

    const removedVerifyOtp = await makeRequest(server, '/api/auth/otp/verify', {}, { method: 'POST' });
    assert.equal(removedVerifyOtp.response.statusCode, 404);

    const malformedJson = await makeRequest(server, '/api/contact', {
        'content-type': 'application/json',
    }, { method: 'POST', body: '{' });
    assert.equal(malformedJson.response.statusCode, 400);
    assert.equal(JSON.parse(malformedJson.body).message, 'The request body must contain valid JSON.');
});

test('uploaded PDFs open inline and can be explicitly downloaded', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const id = new mongoose.Types.ObjectId();
    const asset = {
        _id: id,
        contentType: 'application/pdf',
        filename: 'lesson.pdf',
        data: Buffer.from('%PDF-1.4 test'),
    };
    const originalFindById = PhotoAsset.findById;
    PhotoAsset.findById = () => ({ select: async () => asset });
    t.after(() => { PhotoAsset.findById = originalFindById; });

    const opened = await makeRequest(server, `/api/media/${id}`);
    assert.equal(opened.response.statusCode, 200);
    assert.equal(opened.response.headers['content-type'], 'application/pdf');
    assert.equal(opened.response.headers['content-disposition'], 'inline; filename="lesson.pdf"');

    const downloaded = await makeRequest(server, `/api/media/${id}?download=1`);
    assert.equal(downloaded.response.statusCode, 200);
    assert.equal(downloaded.response.headers['content-disposition'], 'attachment; filename="lesson.pdf"');
});

test('media upload requires an administrator and rejects files without a supported signature', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const anonymous = await makeRequest(server, '/api/media', {
        'content-type': 'application/json',
    }, { method: 'POST', body: JSON.stringify({ data: Buffer.from('not a file').toString('base64') }) });
    assert.equal(anonymous.response.statusCode, 401);

    const userId = new mongoose.Types.ObjectId();
    const admin = { _id: userId, role: 'admin', isActive: true, sessionVersion: 0 };
    const token = jwt.sign({ userId: String(userId), sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const originalFindById = User.findById;
    User.findById = async () => admin;
    t.after(() => { User.findById = originalFindById; });

    const invalidFile = await makeRequest(server, '/api/media', {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
    }, { method: 'POST', body: JSON.stringify({ data: Buffer.from('not a file').toString('base64') }) });
    assert.equal(invalidFile.response.statusCode, 422);
});
