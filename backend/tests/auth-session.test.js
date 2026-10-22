const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-local-validation';
const User = require('../models/User');
const dbConfig = require('../config/db');
dbConfig.connectDB = async () => {};
const app = require('../server');

const makeRequest = (server, path, headers = {}, { method = 'GET', body } = {}) => new Promise((resolve, reject) => {
    const request = http.request({
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers,
    }, (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { responseBody += chunk; });
        response.on('end', () => resolve({ response, body: responseBody }));
    });
    request.on('error', reject);
    request.end(body === undefined ? undefined : JSON.stringify(body));
});

test('logout revokes the bearer session on the server', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const user = {
        _id: new mongoose.Types.ObjectId(),
        role: 'student',
        isActive: true,
        sessionVersion: 0,
    };
    const token = jwt.sign({ userId: String(user._id), sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const originalFindById = User.findById;
    const originalUpdateOne = User.updateOne;
    User.findById = async () => user;
    User.updateOne = async (_filter, update) => {
        user.sessionVersion += update.$inc.sessionVersion;
        return { modifiedCount: 1 };
    };
    t.after(() => {
        User.findById = originalFindById;
        User.updateOne = originalUpdateOne;
    });

    const logout = await makeRequest(server, '/api/auth/logout', {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
    }, { method: 'POST', body: {} });
    assert.equal(logout.response.statusCode, 200);
    assert.equal(user.sessionVersion, 1);

    const revoked = await makeRequest(server, '/api/auth/me', { authorization: `Bearer ${token}` });
    assert.equal(revoked.response.statusCode, 401);
});

test('requests without an Origin header do not receive wildcard CORS access', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const { response } = await makeRequest(server, '/api/auth/login', {
        'content-type': 'application/json',
    }, { method: 'POST', body: {} });
    assert.equal(response.statusCode, 422);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('same-site cookie writes remain usable through a proxy that omits Origin', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const { response } = await makeRequest(server, '/api/auth/login', {
        'content-type': 'application/json',
        cookie: 'eltor_session=invalid-test-cookie',
        'x-requested-with': 'XMLHttpRequest',
    }, { method: 'POST', body: {} });
    assert.equal(response.statusCode, 422);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('the scheduled endpoint rejects a forged cron bearer token', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const previousSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test-cron-secret-that-is-not-valid';
    t.after(() => {
        if (previousSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = previousSecret;
    });

    const { response } = await makeRequest(server, '/api/maintenance/expire-liturgies', {
        authorization: 'Bearer forged-cron-token',
    });
    assert.equal(response.statusCode, 401);
});

test('unexpected server failures return a safe error without internal details', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const userId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ userId: String(userId), sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const originalFindById = User.findById;
    User.findById = () => ({
        then: (_resolve, reject) => reject(new Error('internal database secret token details')),
    });
    t.after(() => { User.findById = originalFindById; });

    const { response, body } = await makeRequest(server, '/api/auth/me', { authorization: `Bearer ${token}` });
    assert.equal(response.statusCode, 500);
    assert.equal(JSON.parse(body).message, 'An unexpected server error occurred.');
    assert.doesNotMatch(body, /internal database secret token details|stack/i);
});
