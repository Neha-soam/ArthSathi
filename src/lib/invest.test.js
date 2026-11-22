import test from 'node:test'
import assert from 'node:assert'
import { sipProjection, lumpProjection, rdProjection, realValue, validateInvest, rateWarning } from './invest.js'
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`)

test('SIP matches the closed-form annuity-due formula (5000/month, 12%, 10y)', () => {
  const r = 0.01, n = 120, fv = 5000 * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  const p = sipProjection({ monthly: 5000, annualRate: 12, years: 10 }); close(p.value, fv, 0.5); assert.equal(p.invested, 600000); close(p.gain, fv - 600000, 0.5)
})
test('SIP: invested + gain = value, and schedule ends at the final value', () => {
  const p = sipProjection({ monthly: 2500, annualRate: 9, years: 7 }); close(p.invested + p.gain, p.value, 1e-6)
  assert.equal(p.schedule.length, 7); assert.equal(p.schedule[6].value, Math.round(p.value)); assert.equal(p.schedule[0].year, 1)
})
test('SIP at 0% returns exactly what was invested', () => { const p = sipProjection({ monthly: 1000, annualRate: 0, years: 3 }); assert.equal(p.value, 36000); assert.equal(p.gain, 0) })
test('SIP step-up raises the amount each year (12*P + 12*1.1*P after 2 years)', () => {
  const p = sipProjection({ monthly: 1000, annualRate: 0, years: 2, stepUpPct: 10 }); close(p.invested, 12000 + 13200, 1e-6)
})
test('lump sum yearly compounding: 1,00,000 @ 7% for 5y = 1,40,255.17', () => { const p = lumpProjection({ principal: 100000, annualRate: 7, years: 5 }); close(p.value, 140255.17, 0.01); close(p.gain, 40255.17, 0.01) })
test('lump sum quarterly equals an independent loop', () => {
  let v = 100000; for (let i = 0; i < 20; i++) v *= 1 + 0.075 / 4
  close(lumpProjection({ principal: 100000, annualRate: 7.5, years: 5, perYear: 4 }).value, v, 1e-6)
})
test('RD equals an independent per-deposit loop; 0% gives the deposits', () => {
  let v = 0; for (let k = 1; k <= 24; k++) v += 1000 * Math.pow(1 + 0.065 / 4, ((24 - k + 1) / 12) * 4)
  close(rdProjection({ monthly: 1000, annualRate: 6.5, months: 24 }).value, v, 1e-6)
  assert.equal(rdProjection({ monthly: 1000, annualRate: 0, months: 12 }).value, 12000)
})
test('RD is more than deposits but far less than the same total as a lump sum', () => { const r = rdProjection({ monthly: 1000, annualRate: 6, months: 12 }); assert.ok(r.value > 12000 && r.value < 12000 * 1.06) })
test('inflation-adjusted value', () => close(realValue(1000000, 6, 10), 558394.78, 0.01))
test('validation: ranges, whole years, frequency', () => {
  assert.equal(validateInvest({ monthly: '5000', annualRate: '12', years: '10' }), null)
  assert.match(validateInvest({ monthly: '0', annualRate: '12', years: '10' }), /Monthly/); assert.match(validateInvest({ monthly: '5000', annualRate: '80', years: '10' }), /rate/)
  assert.match(validateInvest({ monthly: '5000', annualRate: '12', years: '2.5' }), /whole number/); assert.match(validateInvest({ monthly: '5000', annualRate: '', years: '3' }), /rate/)
  assert.match(validateInvest({ principal: '1000', annualRate: '7', years: '5', perYear: '3' }), /frequency/); assert.match(validateInvest({ monthly: '1', annualRate: '5', months: '121' }), /Months/)
})
test('rate warning only for unusually high rates', () => { assert.equal(rateWarning(12), ''); assert.match(rateWarning(25), /never guaranteed/) })
