const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword } = require('../utils/passwords');

test('passwords must use the salted scrypt format', async () => {
    const hash = await hashPassword('church-account-password');
    assert.notEqual(hash, 'church-account-password');
    assert.equal(await verifyPassword('church-account-password', hash), true);
    assert.equal(await verifyPassword('wrong-password', hash), false);
    assert.equal(await verifyPassword('legacy-password', 'legacy-password'), false);
});
