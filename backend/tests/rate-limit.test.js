const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loginRateLimit } = require('../middleware/rateLimit');

test('login limits are enforced without MongoDB counter records', async () => {
    const clientKey = `rate-limit-test-${Date.now()}`;
    let allowed = 0;

    const send = async () => {
        const response = {
            statusCode: 200,
            headers: {},
            set(headers) { Object.assign(this.headers, headers); return this; },
            status(statusCode) { this.statusCode = statusCode; return this; },
            json(body) { this.body = body; return this; },
        };
        await loginRateLimit(
            { ip: clientKey, socket: { remoteAddress: clientKey } },
            response,
            (error) => { assert.ifError(error); allowed += 1; },
        );
        return response;
    };

    for (let index = 0; index < 10; index += 1) {
        assert.equal((await send()).statusCode, 200);
    }
    const blocked = await send();
    assert.equal(allowed, 10);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.headers['RateLimit-Remaining'], '0');
});
