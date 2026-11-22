import test from 'node:test'
import assert from 'node:assert'
import { MAX_TOASTS, toastDuration, toastReducer } from './toastReducer.js'
import { MOBILE_PRIMARY, ROUTES, titleFor } from './routes.js'

const T = (id, kind = 'info') => ({ id, kind, message: 'm' + id })
test('toasts: add keeps order and caps at the newest 3', () => {
  let s = []; for (let i = 1; i <= 5; i++) s = toastReducer(s, { type: 'add', toast: T(i) })
  assert.equal(MAX_TOASTS, 3); assert.deepEqual(s.map((t) => t.id), [3, 4, 5])
})
test('toasts: dismiss removes only that toast; unknown actions are ignored; state is not mutated', () => {
  const a = [T(1), T(2)], b = toastReducer(a, { type: 'dismiss', id: 1 })
  assert.deepEqual(b.map((t) => t.id), [2]); assert.equal(a.length, 2); assert.equal(toastReducer(a, { type: 'nope' }), a); assert.deepEqual(toastReducer(a, { type: 'dismiss', id: 99 }), a)
})
test('toasts: errors stay visible longer than confirmations', () => { assert.ok(toastDuration('error') > toastDuration('success')); assert.equal(toastDuration('success'), toastDuration('info')) })
test('page titles: every route has a distinct title; unknown path falls back to the brand', () => {
  const titles = ROUTES.map(([p]) => titleFor(p)); assert.equal(new Set(titles).size, ROUTES.length); assert.equal(titleFor('/budgeting'), 'Budgeting · ArthSathi'); assert.equal(titleFor('/nope'), 'ArthSathi')
})
test('mobile nav: 4 primary routes exist, the rest (4) fit in the More menu', () => {
  const paths = ROUTES.map(([p]) => p); assert.ok(MOBILE_PRIMARY.every((p) => paths.includes(p))); assert.equal(MOBILE_PRIMARY.length, 4); assert.equal(paths.length - MOBILE_PRIMARY.length, 4)
})
