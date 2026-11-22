import test from 'node:test'
import assert from 'node:assert'
import { summarize, budgetUsage, fetchAllPages } from './finance.js'
import { localDateString, localMonthKey } from './dates.js'
import { inr } from './format.js'

const T = (type, amount, category, date) => ({ type, amount, category, date })

test('local dates use local components, not UTC (IST 1 Dec 01:30 stays December)', () => {
  const d = new Date(2026, 11, 1, 1, 30) // local time
  assert.equal(localDateString(d), '2026-12-01'); assert.equal(localMonthKey(d), '2026-12')
  assert.equal(localDateString(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
})
test('summarize: month vs all-time split', () => {
  const s = summarize([T('income', '50000.00', 'Salary', '2026-11-01'), T('expense', '12000.50', 'Food', '2026-11-03'), T('expense', '300', 'Travel', '2026-10-30'), T('income', 1000, 'Other', '2026-10-01')], '2026-11')
  assert.equal(s.income, 50000); assert.equal(s.expense, 12000.5); assert.equal(s.net, 37999.5)
  assert.equal(s.totalIncome, 51000); assert.equal(s.totalExpense, 12300.5); assert.equal(s.balance, 38699.5)
  assert.deepEqual(s.byCat, { Food: 12000.5 }); assert.equal(s.savingsRate, 76)
})
test('summarize: paise math has no float drift', () => assert.equal(summarize([T('income', 0.1, 'Other', '2026-11-01'), T('income', 0.2, 'Other', '2026-11-02')], '2026-11').income, 0.3))
test('zero income: savingsRate is null, not 0 or Infinity; expenses still counted', () => {
  const s = summarize([T('expense', 500, 'Food', '2026-11-02')], '2026-11')
  assert.equal(s.savingsRate, null); assert.equal(s.balance, -500); assert.equal(s.net, -500)
})
test('overspending gives a negative savings rate and negative balance', () => {
  const s = summarize([T('income', 1000, 'Salary', '2026-11-01'), T('expense', 1500, 'Bills', '2026-11-02')], '2026-11')
  assert.equal(s.savingsRate, -50); assert.equal(s.balance, -500)
})
test('empty data -> all zeros', () => { const s = summarize([], '2026-11'); assert.equal(s.balance, 0); assert.equal(s.savingsRate, null) })
test('no row cap in the maths: 2,500 transactions all counted', () => {
  const rows = Array.from({ length: 2500 }, (_, i) => T('expense', 10, 'Food', '2026-11-01'))
  assert.equal(summarize(rows, '2026-11').totalExpense, 25000)
})
test('budgetUsage thresholds: 79.9 ok, 80 near, 100 near, 100.01 over', () => {
  const u = budgetUsage([{ id: 1, category: 'A', monthly_limit: 1000 }, { id: 2, category: 'B', monthly_limit: 1000 }, { id: 3, category: 'C', monthly_limit: 1000 }, { id: 4, category: 'D', monthly_limit: 1000 }], { A: 799, B: 800, C: 1000, D: 1000.01 })
  assert.deepEqual(u.rows.map((r) => r.status), ['ok', 'near', 'near', 'over'])
  assert.equal(u.overCount, 1); assert.equal(u.nearCount, 2); assert.ok(u.rows[3].remaining < 0)
})
test('budgetUsage: zero limit and no spend are safe', () => {
  const u = budgetUsage([{ id: 1, category: 'A', monthly_limit: 0 }, { id: 2, category: 'B', monthly_limit: 500 }], {})
  assert.equal(u.rows[0].pct, 0); assert.equal(u.rows[1].status, 'ok'); assert.equal(u.totalPct, 0)
})
test('inr formatting', () => {
  assert.equal(inr(-5000), '-₹5,000'); assert.equal(inr(1234567), '₹12,34,567'); assert.equal(inr(123.45), '₹123.45')
  assert.equal(inr(0), '₹0'); assert.equal(inr(-0), '₹0'); assert.equal(inr(null), '₹0'); assert.equal(inr(-0.001), '₹0')
})
const fakeDb = (n) => async (from, to) => ({ data: Array.from({ length: Math.max(0, Math.min(n, to + 1) - from) }, (_, i) => ({ id: from + i })) })
test('fetchAllPages reads every page (2,500 rows)', async () => { const r = await fetchAllPages(fakeDb(2500)); assert.equal(r.data.length, 2500); assert.equal(r.truncated, false) })
test('fetchAllPages exact page multiple ends cleanly', async () => { const r = await fetchAllPages(fakeDb(2000)); assert.equal(r.data.length, 2000); assert.equal(r.truncated, false) })
test('fetchAllPages flags truncation at the cap instead of silently dropping', async () => { const r = await fetchAllPages(fakeDb(99999), 1000, 3); assert.equal(r.data.length, 3000); assert.equal(r.truncated, true) })
test('fetchAllPages propagates errors', async () => { const r = await fetchAllPages(async () => ({ error: { code: '42501' } })); assert.equal(r.error.code, '42501') })
