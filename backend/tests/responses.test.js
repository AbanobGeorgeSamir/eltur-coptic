const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeUser } = require('../utils/responses');

test('user responses omit the national ID unless an administrator explicitly requests it', () => {
    const user = {
        _id: 'student-id',
        name: 'Student Example Name Here',
        nationalId: '12345678901234',
    };

    assert.equal(Object.hasOwn(sanitizeUser(user), 'nationalId'), false);
    assert.equal(sanitizeUser(user, { includeNationalId: true }).nationalId, user.nationalId);
});
