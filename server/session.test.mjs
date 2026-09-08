import assert from 'node:assert/strict';
import test from 'node:test';
import { signSession, verifyInternal, verifySession } from './session.js';

const secret = 'test-secret';
const now = 1_800_000_000_000;

test('accepts a valid session', () => {
  const token = signSession({ uid: 'user-1', u: 'tester', exp: now / 1000 + 60 }, secret);
  assert.deepEqual(verifySession(token, secret, now), { uid: 'user-1', username: 'tester' });
});

test('rejects expired, malformed, or misconfigured sessions without throwing', () => {
  assert.equal(verifySession(signSession({ uid: 'user-1', exp: now / 1000 }, secret), secret, now), null);
  assert.equal(verifySession(signSession({ uid: 42, exp: now / 1000 + 60 }, secret), secret, now), null);
  assert.equal(verifySession('invalid', undefined, now), null);
  assert.equal(verifyInternal('invalid', undefined), false);
});
