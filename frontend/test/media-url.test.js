import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSafeMediaUrl } from '../src/utils/mediaUrl.js';

test('same-origin relative media URLs resolve on production', () => {
  const result = resolveSafeMediaUrl(
    '/api/media/0123456789abcdef01234567.pdf',
    '/api',
    'https://eltur-coptic.vercel.app',
  );

  assert.equal(result?.href, 'https://eltur-coptic.vercel.app/api/media/0123456789abcdef01234567.pdf');
});

test('the configured local API host works during development', () => {
  const result = resolveSafeMediaUrl(
    'http://localhost:8000/api/media/0123456789abcdef01234567.jpg',
    'http://localhost:8000/api',
    'http://localhost:5173',
  );

  assert.equal(result?.origin, 'http://localhost:8000');
});

test('HTTPS media links are supported', () => {
  assert.equal(
    resolveSafeMediaUrl('https://cdn.example.org/lesson.pdf', '/api', 'https://eltur-coptic.vercel.app')?.protocol,
    'https:',
  );
});

test('unsafe URL schemes and untrusted plaintext HTTP links are rejected', () => {
  const origin = 'https://eltur-coptic.vercel.app';

  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://attacker.invalid/payload.pdf',
  ]) {
    assert.equal(resolveSafeMediaUrl(value, '/api', origin), null, value);
  }
});
