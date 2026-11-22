import test from 'node:test'
import assert from 'node:assert'
import { newRegime, oldRegime } from './tax.js'
test('new regime: 12.75L salary is tax-free', () => assert.equal(newRegime({ gross: 1275000 }).total, 0))
test('new regime: 15L salary', () => { // taxable 14.25L: 20000+40000+ (2.25L*15%=33750) = 93750 *1.04 = 97500
  assert.equal(newRegime({ gross: 1500000 }).total, 97500) })
test('new regime: marginal relief just above 12L taxable', () => assert.equal(newRegime({ gross: 1280000 }).total, Math.round(5000 * 1.04)))
test('old regime: 5.5L gross, no deductions', () => { // taxable 5L -> 12500 tax, rebate -> 0
  assert.equal(oldRegime({ gross: 550000 }).total, 0) })
test('old regime: 10L gross with 80C 1.5L', () => { // taxable 8L: 12500+60000=72500*1.04=75400
  const r = oldRegime({ gross: 1000000, d80c: 150000 })
  assert.equal(r.taxable, 800000)
  assert.equal(r.total, 75400) })
