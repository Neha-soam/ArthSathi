import test from 'node:test'
import assert from 'node:assert'
import { csvCell, toCsv } from './csv.js'
import { filterTx } from './filters.js'
import { dueDates } from './recurring.js'
import { computeInsights, monthReport, monthlySeries, prevMonth, daysInMonth } from './insights.js'
const T = (type, amount, category, date, note = '') => ({ type, amount, category, date, note })

// ---- CSV ----
test('csv: quotes, commas, newlines are escaped', () => {
  assert.equal(csvCell('a,b'), '"a,b"'); assert.equal(csvCell('say "hi"'), '"say ""hi"""'); assert.equal(csvCell('l1\nl2'), '"l1\nl2"'); assert.equal(csvCell(null), '')
})
test('csv: formula injection is neutralised', () => {
  for (const bad of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)']) assert.ok(csvCell(bad).replace(/^"/, '').startsWith("'"), bad)
  assert.equal(csvCell('lunch'), 'lunch')
})
test('csv: header, row format, 2-decimals amount, CRLF', () => {
  const out = toCsv([T('expense', 12.5, 'Food', '2026-11-03', 'tea, snacks')])
  assert.equal(out, 'Date,Type,Category,Amount (INR),Note\r\n2026-11-03,expense,Food,12.50,"tea, snacks"\r\n')
})
// ---- filters ----
const rows = [T('expense', 100, 'Food', '2026-11-01', 'Swiggy dinner'), T('income', 5000, 'Salary', '2026-11-02', 'Nov pay'), T('expense', 50, 'Travel', '2026-11-05', 'metro'), T('expense', 70, 'Food', '2026-10-31')]
test('filter: search is case-insensitive on note and category', () => { assert.equal(filterTx(rows, { q: 'SWIGGY' }).length, 1); assert.equal(filterTx(rows, { q: 'food' }).length, 2) })
test('filter: type, category and inclusive date range combine', () => {
  assert.equal(filterTx(rows, { type: 'income' }).length, 1)
  assert.equal(filterTx(rows, { cat: 'Food', from: '2026-11-01', to: '2026-11-30' }).length, 1)
  assert.equal(filterTx(rows, { from: '2026-11-01', to: '2026-11-02' }).length, 2)
  assert.equal(filterTx(rows, {}).length, 4)
})
// ---- recurring ----
test('recurring: monthly dates from start, up to today', () => assert.deepEqual(dueDates({ start_date: '2026-09-01', day_of_month: 5, last_generated: null }, '2026-11-10'), ['2026-09-05', '2026-10-05', '2026-11-05']))
test('recurring: first occurrence is after start date, not before', () => assert.deepEqual(dueDates({ start_date: '2026-11-22', day_of_month: 5, last_generated: null }, '2026-12-10'), ['2026-12-05']))
test('recurring: starting today on the due day creates today', () => assert.deepEqual(dueDates({ start_date: '2026-11-22', day_of_month: 22, last_generated: null }, '2026-11-22'), ['2026-11-22']))
test('recurring: day 31 clamps to month end (incl. leap Feb)', () => {
  assert.deepEqual(dueDates({ start_date: '2027-01-01', day_of_month: 31, last_generated: null }, '2027-03-31'), ['2027-01-31', '2027-02-28', '2027-03-31'])
  assert.deepEqual(dueDates({ start_date: '2028-02-01', day_of_month: 30, last_generated: null }, '2028-02-29'), ['2028-02-29'])
})
test('recurring: nothing before last_generated, so a deleted entry is not recreated', () => assert.deepEqual(dueDates({ start_date: '2026-09-01', day_of_month: 5, last_generated: '2026-11-10' }, '2026-11-20'), []))
test('recurring: future due date not created yet; next run picks it up', () => {
  const r = { start_date: '2026-09-01', day_of_month: 25, last_generated: '2026-10-26' }
  assert.deepEqual(dueDates(r, '2026-11-10'), []); assert.deepEqual(dueDates(r, '2026-11-25'), ['2026-11-25'])
})
test('recurring: backlog is capped to the most recent 36', () => assert.equal(dueDates({ start_date: '2015-01-01', day_of_month: 1, last_generated: null }, '2026-11-22').length, 36))
// ---- insights (fixture: today = 15 Nov 2026) ----
const tx = [
  T('income', 50000, 'Salary', '2026-11-01'), T('expense', 3000, 'Food', '2026-11-02'), T('expense', 2000, 'Food', '2026-11-10'), T('expense', 1000, 'Travel', '2026-11-12'),
  T('expense', 2000, 'Food', '2026-10-03'), T('expense', 4000, 'Food', '2026-10-20'), T('expense', 500, 'Travel', '2026-10-05'), T('income', 40000, 'Salary', '2026-10-01'),
]
const TODAY = '2026-11-15'
test('date helpers', () => { assert.equal(prevMonth('2026-01'), '2025-12'); assert.equal(prevMonth('2026-11'), '2026-10'); assert.equal(daysInMonth('2028-02'), 29) })
test('report: current month uses same-days comparison, not the full previous month', () => {
  const r = monthReport(tx, '2026-11', TODAY)
  assert.equal(r.expense, 6000); assert.equal(r.spentSoFar, 6000); assert.equal(r.prevSpent, 2500) // Oct 20th (4000) is after day 15, excluded
  assert.equal(r.changePct, 140); assert.equal(r.avgDaily, 400); assert.equal(r.projected, 12000)
  assert.equal(r.top[0].category, 'Food'); assert.equal(r.top[0].share, 83); assert.equal(r.net, 44000)
})
test('report: finished month has no projection and uses all days', () => {
  const r = monthReport(tx, '2026-10', TODAY)
  assert.equal(r.isCurrent, false); assert.equal(r.projected, null); assert.equal(r.spentSoFar, 6500); assert.equal(r.asOfDay, 31)
})
test('report: projection suppressed in the first week (too little data)', () => assert.equal(monthReport(tx, '2026-11', '2026-11-05').projected, null))
test('report: no previous data -> changePct null (no divide by zero)', () => assert.equal(monthReport([T('expense', 100, 'Food', '2026-11-02')], '2026-11', TODAY).changePct, null))
test('insights: every insight explains how it was calculated', () => {
  const ins = computeInsights(tx, [{ id: 'b1', category: 'Food', monthly_limit: 4000 }, { id: 'b2', category: 'Travel', monthly_limit: 1100 }], '2026-11', TODAY)
  assert.ok(ins.length >= 6); for (const i of ins) { assert.ok(i.title && i.text && i.how && i.how.length > 10, i.id) }
  const ids = ins.map((i) => i.id)
  for (const id of ['top', 'change', 'avg', 'projection', 'over-Food', 'near-Travel', 'unusual-Food', 'unusual-Travel']) assert.ok(ids.includes(id), 'missing ' + id)
  assert.match(ins.find((i) => i.id === 'over-Food').title, /over budget by ₹1,000/)
  assert.match(ins.find((i) => i.id === 'change').title, /140% more/)
})
test('insights: empty month -> no insights (UI shows empty state)', () => assert.deepEqual(computeInsights([], [], '2026-11', TODAY), []))
test('insights: steady spending is not flagged as unusual', () => {
  const steady = [T('expense', 1000, 'Food', '2026-11-02'), T('expense', 1000, 'Food', '2026-10-02'), T('expense', 1000, 'Food', '2026-09-02'), T('expense', 1000, 'Food', '2026-08-02')]
  assert.ok(!computeInsights(steady, [], '2026-11', TODAY).some((i) => i.id.startsWith('unusual')))
})
test('series: 6 months ending at month, oldest first, with sums', () => {
  const s = monthlySeries(tx, '2026-11', 6)
  assert.deepEqual(s.map((x) => x.month), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
  assert.equal(s[5].expense, 6000); assert.equal(s[4].income, 40000); assert.equal(s[0].expense, 0); assert.equal(s[5].label, 'Nov')
})
