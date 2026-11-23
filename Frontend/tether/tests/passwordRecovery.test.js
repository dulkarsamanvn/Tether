import assert from 'node:assert/strict'
import test from 'node:test'
import { readResetLink, retrySeconds, validateNewPassword } from '../src/utils/passwordRecovery.js'

const token = 'a'.repeat(64)

test('reset links decode email and accept a complete fragment or query', () => {
  assert.deepEqual(readResetLink({ hash: `#token=${token}&email=writer%2Btest%40example.com` }), { token, email: 'writer+test@example.com' })
  assert.deepEqual(readResetLink({ search: `?token=${token}&email=writer%40example.com` }), { token, email: 'writer@example.com' })
})

test('incomplete, malformed, and ambiguous links are rejected before submission', () => {
  for (const hash of ['', '#email=a%40example.com', `#token=${token}`, '#token=bad&email=a%40example.com',
    `#token=${token}&email=invalid`, `#token=${token}&email=a%40example.com&token=${token}`,
    `#token=${token}&email=a%40example.com&email=b%40example.com`,
    `#token=${token}%0A&email=a%40example.com`, `#token=${token}&email=a%40example.com%0A`]) {
    assert.equal(readResetLink({ hash }), null)
  }
  assert.equal(readResetLink({ hash: '#invalid', search: `?token=${token}&email=a%40example.com` }), null)
})

test('password rules cover confirmation and bcrypt byte limits for Unicode', () => {
  assert.match(validateNewPassword('short', 'short'), /8 characters/)
  assert.match(validateNewPassword('secure-password', 'different'), /do not match/)
  assert.match(validateNewPassword('é'.repeat(37), 'é'.repeat(37)), /72 bytes/)
  assert.equal(validateNewPassword('é'.repeat(36), 'é'.repeat(36)), '')
  assert.equal(validateNewPassword('a'.repeat(72), 'a'.repeat(72)), '')
})

test('cooldown honors numerical and HTTP-date retry headers with safe fallbacks', () => {
  assert.equal(retrySeconds({ response: { headers: { 'retry-after': '120' } } }), 120)
  const seconds = retrySeconds({ response: { headers: { 'retry-after': new Date(Date.now() + 120000).toUTCString() } } })
  assert.ok(seconds >= 119 && seconds <= 120)
  assert.equal(retrySeconds({}), 60)
  assert.equal(retrySeconds({ response: { headers: { 'retry-after': 'bad' } } }), 60)
  assert.equal(retrySeconds({ response: { headers: { 'retry-after': '0' } } }), 1)
})
