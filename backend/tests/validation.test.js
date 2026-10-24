const test = require('node:test');
const assert = require('node:assert/strict');
const { validEmail, validPhone, normalizePhone, hasFourPartName } = require('../utils/validation');

test('email validation requires a no-space address ending in .com', () => {
    assert.equal(validEmail('student@example.com'), true);
    assert.equal(validEmail('student@school.org'), false);
    assert.equal(validEmail('student @example.com'), false);
    assert.equal(validEmail('student@example .com'), false);
    assert.equal(validEmail('studentexample.com'), false);
});

test('full names need at least four parts', () => {
    assert.equal(hasFourPartName('Mary Mina George Hanna'), true);
    assert.equal(hasFourPartName('Mary Mina George'), false);
});

test('phone numbers normalize to international digits and validate as E.164', () => {
    assert.equal(normalizePhone('+20 (100) 123-4567'), '+201001234567');
    assert.equal(validPhone('+201001234567'), true);
    assert.equal(validPhone('01001234567'), false);
});
