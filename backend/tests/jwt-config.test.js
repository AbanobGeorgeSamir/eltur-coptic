const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-long-enough-for-local-validation';

test('JWT signing and verification use the configured server secret', () => {
    assert.ok(process.env.JWT_SECRET);
    assert.ok(process.env.JWT_SECRET.length >= 32, 'JWT_SECRET must be at least 32 characters');

    const token = jwt.sign({ userId: 'environment-test' }, process.env.JWT_SECRET, { expiresIn: '1m' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    assert.equal(payload.userId, 'environment-test');
});
