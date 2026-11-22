import test from 'node:test'
import assert from 'node:assert'
import { newRegime, oldRegime, slabBreakdown, slabTax, hraExemption, validateTaxInputs, NEW_SLABS, OLD_SLABS } from './tax.js'

// Published worked examples (ClearTax / Tata Capital / Bajaj): new regime 10L -> 0, 12.75L -> 0, 15L -> 97,500.
test('new regime: 10L salary is tax-free (published example)', () => assert.equal(newRegime({ gross: 1000000 }).total, 0))
test('new regime: 12.75L salary is tax-free (published example)', () => assert.equal(newRegime({ gross: 1275000 }).total, 0))
test('new regime: 15L salary = 97,500 (published example)', () => { const r = newRegime({ gross: 1500000 }); assert.equal(r.taxable, 1425000); assert.equal(r.total, 97500) })
test('new regime: marginal relief just above 12L taxable', () => { const r = newRegime({ gross: 1280000 }); assert.equal(r.total, Math.round(5000 * 1.04)); assert.ok(r.relief > 0) })
test('new regime: 25L salary -> taxable 24.25L (published example), tax from slabs', () => { const r = newRegime({ gross: 2500000 }); assert.equal(r.taxable, 2425000); assert.equal(r.total, Math.round(307500 * 1.04)) })
test('old regime: 5.5L gross, no deductions -> rebate makes tax 0', () => assert.equal(oldRegime({ gross: 550000 }).total, 0))
test('old regime: 10L gross with 80C 1.5L -> taxable 8L, tax 75,400', () => { const r = oldRegime({ gross: 1000000, d80c: 150000 }); assert.equal(r.taxable, 800000); assert.equal(r.total, 75400) })
test('old regime: 25L salary with HRA 4L, 80C 1.5L, 80D 25k -> taxable 18.75L (published example)', () => {
  const r = oldRegime({ gross: 2500000, hra: 400000, d80c: 150000, d80dSelf: 25000 }); assert.equal(r.taxable, 1875000); assert.equal(r.total, Math.round(375000 * 1.04))
})
test('caps are applied and flagged: 80C, NPS, 80D, home loan', () => {
  const r = oldRegime({ gross: 3000000, d80c: 400000, d80ccd1b: 90000, d80dSelf: 60000, d80dParents: 60000, homeLoan: 500000 })
  const by = Object.fromEntries(r.deductionRows.map((x) => [x.label, x]))
  assert.equal(by['Section 80C investments'].allowed, 150000); assert.equal(by['NPS extra (80CCD(1B))'].allowed, 50000)
  assert.equal(by['Health insurance, self/family (80D)'].allowed, 25000); assert.equal(by['Health insurance, parents (80D)'].allowed, 25000)
  assert.equal(by['Home loan interest (self-occupied)'].allowed, 200000); assert.ok(r.deductionRows.every((x) => x.capped))
})
test('80D caps rise to 50,000 for senior self and senior parents', () => {
  const r = oldRegime({ gross: 3000000, age: '60to79', parentsSenior: true, d80dSelf: 60000, d80dParents: 60000 })
  assert.deepEqual(r.deductionRows.map((x) => x.allowed), [50000, 50000])
})
test('age-based old-regime slabs: same taxable 6L taxed differently by age', () => {
  assert.equal(oldRegime({ gross: 650000, age: 'below60' }).total, Math.round(32500 * 1.04))
  assert.equal(oldRegime({ gross: 650000, age: '60to79' }).total, Math.round(30000 * 1.04))
  assert.equal(oldRegime({ gross: 650000, age: '80plus' }).total, Math.round(20000 * 1.04))
})
test('slab breakdown rows add up to the slab tax and cover the taxable income', () => {
  for (const slabs of [NEW_SLABS, OLD_SLABS.below60, OLD_SLABS['80plus']]) for (const inc of [0, 399999, 1234567, 9999999]) {
    const rows = slabBreakdown(inc, slabs); assert.equal(rows.reduce((s, r) => s + r.amount, 0), inc); assert.equal(rows.reduce((s, r) => s + r.tax, 0), slabTax(inc, slabs))
  }
})
test('result has effective rate and surcharge warning above 50L taxable', () => {
  assert.ok(Math.abs(newRegime({ gross: 1500000 }).effectiveRate - 6.5) < 1e-9)
  assert.equal(newRegime({ gross: 6000000 }).surchargeWarning, true); assert.equal(newRegime({ gross: 1500000 }).surchargeWarning, false)
})
test('zero / empty inputs do not crash and give zero tax', () => { assert.equal(newRegime({ gross: 0 }).total, 0); assert.equal(oldRegime({ gross: '' }).total, 0); assert.equal(oldRegime({ gross: 'abc' }).taxable, 0) })
test('HRA exemption = least of three (metro vs non-metro)', () => {
  assert.equal(hraExemption({ basic: 500000, hraReceived: 200000, rentPaid: 150000, metro: true }).exempt, 100000)
  assert.equal(hraExemption({ basic: 500000, hraReceived: 300000, rentPaid: 400000, metro: false }).exempt, 200000)
  assert.equal(hraExemption({ basic: 500000, hraReceived: 200000, rentPaid: 40000, metro: true }).exempt, 0)
})
test('input validation', () => {
  assert.match(validateTaxInputs({ gross: '' }), /gross salary/i); assert.match(validateTaxInputs({ gross: '-5' }), /negative/); assert.match(validateTaxInputs({ gross: '10', d80c: 'x' }), /number/)
  assert.match(validateTaxInputs({ gross: '1e12' }), /too large/); assert.equal(validateTaxInputs({ gross: '1200000', d80c: '150000' }), null)
})
