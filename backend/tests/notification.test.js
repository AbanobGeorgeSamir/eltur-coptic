const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-local-validation';
const User = require('../models/User');
const FeaturedVerse = require('../models/FeaturedVerse');
const VerseUpdateEvent = require('../models/VerseUpdateEvent');
const dbConfig = require('../config/db');
dbConfig.connectDB = async () => {};
const app = require('../server');

const makeRequest = (server, path, token, { method = 'GET', body } = {}) => new Promise((resolve, reject) => {
    const request = http.request({
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers: {
            authorization: `Bearer ${token}`,
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
    }, (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { responseBody += chunk; });
        response.on('end', () => resolve({ response, body: responseBody }));
    });
    request.on('error', reject);
    request.end(body === undefined ? undefined : JSON.stringify(body));
});

const queryFor = (value) => {
    const query = {
        select: () => query,
        where: () => query,
        sort: () => query,
        limit: () => query,
        session: () => query,
        lean: async () => value,
        then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
    return query;
};

test('admin ayah updates create one post-save notification and respect user preferences', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const admin = {
        _id: new mongoose.Types.ObjectId(),
        role: 'admin',
        isActive: true,
        sessionVersion: 0,
        notificationPreferences: { verseUpdates: true },
    };
    const token = jwt.sign({ userId: String(admin._id), sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const originals = {
        userFindById: User.findById,
        userFindByIdAndUpdate: User.findByIdAndUpdate,
        verseInit: VerseUpdateEvent.init,
        eventFindOne: VerseUpdateEvent.findOne,
        eventFind: VerseUpdateEvent.find,
        eventCreate: VerseUpdateEvent.create,
        verseFindOne: FeaturedVerse.findOne,
        verseFindOneAndUpdate: FeaturedVerse.findOneAndUpdate,
        startSession: mongoose.startSession,
    };
    t.after(() => {
        User.findById = originals.userFindById;
        User.findByIdAndUpdate = originals.userFindByIdAndUpdate;
        VerseUpdateEvent.init = originals.verseInit;
        VerseUpdateEvent.findOne = originals.eventFindOne;
        VerseUpdateEvent.find = originals.eventFind;
        VerseUpdateEvent.create = originals.eventCreate;
        FeaturedVerse.findOne = originals.verseFindOne;
        FeaturedVerse.findOneAndUpdate = originals.verseFindOneAndUpdate;
        mongoose.startSession = originals.startSession;
    });

    let event = null;
    let currentVerse = { text: 'Old verse', reference: 'John 1:1', updatedAt: new Date('2026-01-01') };
    let updateCount = 0;
    let eventWriteCount = 0;
    let savedBeforeEvent = false;
    User.findById = () => queryFor(admin);
    User.findByIdAndUpdate = () => queryFor(admin);
    VerseUpdateEvent.init = async () => {};
    VerseUpdateEvent.findOne = () => queryFor(event);
    VerseUpdateEvent.find = () => queryFor(admin.notificationPreferences.verseUpdates ? event ? [event] : [] : []);
    VerseUpdateEvent.create = async ([record]) => {
        assert.equal(savedBeforeEvent, true, 'notification is created only after the verse save');
        eventWriteCount += 1;
        event = { ...record, createdAt: new Date('2026-02-01') };
        return [event];
    };
    FeaturedVerse.findOne = () => queryFor(currentVerse);
    FeaturedVerse.findOneAndUpdate = (_filter, update) => {
        updateCount += 1;
        currentVerse = {
            text: update.$set.text,
            reference: update.$set.reference,
            updatedAt: new Date('2026-02-01'),
        };
        savedBeforeEvent = true;
        return queryFor(currentVerse);
    };
    mongoose.startSession = async () => ({
        withTransaction: async (run) => run(),
        endSession: async () => {},
    });

    const requestId = 'b59e2c16-01f1-4b57-a7b1-4a63d827406f';
    const update = await makeRequest(server, '/api/featured-verse', token, {
        method: 'PUT',
        body: { text: 'A new verse', reference: 'John 3:16', requestId },
    });
    assert.equal(update.response.statusCode, 200);
    assert.equal(updateCount, 1);
    assert.equal(eventWriteCount, 1);

    const duplicate = await makeRequest(server, '/api/featured-verse', token, {
        method: 'PUT',
        body: { text: 'A new verse', reference: 'John 3:16', requestId },
    });
    assert.equal(duplicate.response.statusCode, 200);
    assert.equal(updateCount, 1);
    assert.equal(eventWriteCount, 1);

    const notifications = await makeRequest(server, '/api/notifications', token);
    assert.equal(notifications.response.statusCode, 200);
    const notification = JSON.parse(notifications.body).data[0];
    assert.equal(notification.reference, 'John 3:16');
    assert.equal(notification.text, 'A new verse');
    assert.equal(notification.deepLink, 'eltorcoptic://featured-verse');

    admin.notificationPreferences.verseUpdates = false;
    const optedOut = await makeRequest(server, '/api/notifications', token);
    assert.deepEqual(JSON.parse(optedOut.body).data, []);

    const invalidRequestId = await makeRequest(server, '/api/featured-verse', token, {
        method: 'PUT',
        body: { text: 'A new verse', reference: 'John 3:16', requestId: 'forged-id' },
    });
    assert.equal(invalidRequestId.response.statusCode, 422);
});

test('non-admin users cannot update the shared ayah', async (t) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());

    const student = { _id: new mongoose.Types.ObjectId(), role: 'student', isActive: true, sessionVersion: 0 };
    const token = jwt.sign({ userId: String(student._id), sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const originalFindById = User.findById;
    User.findById = () => queryFor(student);
    t.after(() => { User.findById = originalFindById; });

    const result = await makeRequest(server, '/api/featured-verse', token, {
        method: 'PUT',
        body: { text: 'A new verse', reference: 'John 3:16', requestId: 'b59e2c16-01f1-4b57-a7b1-4a63d827406f' },
    });
    assert.equal(result.response.statusCode, 403);
});
