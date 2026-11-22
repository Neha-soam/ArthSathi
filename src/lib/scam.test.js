import test from 'node:test'
import assert from 'node:assert'
import { segmentText, maskForStorage } from './scamHighlight.js'
const sig = (id, ...spans) => ({ id, matches: spans.map(([start, end]) => ({ start, end })) })

test('segments: no signals -> one plain segment; empty text -> none', () => { assert.deepEqual(segmentText('hello', []), [{ text: 'hello', ids: [] }]); assert.deepEqual(segmentText('', [sig('a', [0, 3])]), []) })
test('segments: single span is split into before/marked/after and rejoins to the original', () => {
  const s = segmentText('share your OTP now', [sig('otp', [11, 14])])
  assert.deepEqual(s.map((x) => x.ids), [[], ['otp'], []]); assert.equal(s[1].text, 'OTP'); assert.equal(s.map((x) => x.text).join(''), 'share your OTP now')
})
test('segments: overlapping spans give the overlap both ids', () => {
  const s = segmentText('abcdefghij', [sig('a', [0, 6]), sig('b', [4, 9])])
  assert.deepEqual(s.map((x) => [x.text, x.ids]), [['abcd', ['a']], ['ef', ['a', 'b']], ['ghi', ['b']], ['j', []]])
})
test('segments: out-of-range and zero-length spans are safe', () => { assert.equal(segmentText('abc', [sig('a', [-5, 99], [2, 2])]).map((x) => x.text).join(''), 'abc'); assert.deepEqual(segmentText('abc', [sig('a', [1, 1])]), [{ text: 'abc', ids: [] }]) })
test('mask: OTP, phone, card digits hidden; small amounts kept', () => {
  assert.equal(maskForStorage('OTP 123456 call 9876543210'), 'OTP •••• call ••••')
  assert.equal(maskForStorage('card 4111 1111 1111 1111 expired'), 'card •••• •••• •••• •••• expired')
  assert.equal(maskForStorage('Pay Rs 500 now'), 'Pay Rs 500 now')
})
test('mask: UPI IDs and emails hidden', () => { assert.equal(maskForStorage('send to ravi.k@okaxis now'), 'send to •••@••• now'); assert.equal(maskForStorage('mail a.b@x.co.in'), 'mail •••@•••') })
test('mask: collapses whitespace and caps at 200 chars', () => { assert.equal(maskForStorage('a\n\n  b'), 'a b'); assert.equal(maskForStorage('x'.repeat(500)).length, 200) })
