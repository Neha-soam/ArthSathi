import test from 'node:test'
import assert from 'node:assert'
import { buildMarket, generateSeries, INSTRUMENTS, rangeStats, sliceRange, dayChangePct, DEMO_SOURCE } from './demoMarket.js'
import { computePortfolio, validateTrade, STARTING_CASH } from './portfolio.js'
import { gst, invoice, validGstin, emi, pnl, cashflow, validateBiz, validateEmi, validateGst, GST_RATES } from './biz.js'
import { csvCell, csvFromRows } from './csv.js'
const close = (a, b, e = 0.01) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`)

// ---- demo market ----
test('demo data is clearly flagged as not real', () => { assert.equal(DEMO_SOURCE.real, false); assert.ok(INSTRUMENTS.every((i) => i.symbol.startsWith('DEMO-'))) })
test('series is deterministic and weekdays-only', () => {
  const a = generateSeries(INSTRUMENTS[0], '2026-06-30'), b = generateSeries(INSTRUMENTS[0], '2026-06-30')
  assert.deepEqual(a, b); assert.equal(a[0].date, '2024-01-01'); assert.ok(a.every((p) => ![0, 6].includes(new Date(p.date + 'T00:00:00').getDay())))
})
test('extending the end date never changes earlier prices', () => {
  const short = generateSeries(INSTRUMENTS[1], '2025-03-31'), long = generateSeries(INSTRUMENTS[1], '2026-11-22')
  assert.deepEqual(long.slice(0, short.length), short); assert.ok(long.length > short.length)
})
test('prices stay positive and instruments differ', () => {
  const m = buildMarket('2026-11-22'); for (const x of Object.values(m)) assert.ok(x.series.every((p) => p.close > 0))
  assert.notDeepEqual(m['DEMO-IDX'].series.slice(-5), m['DEMO-TECH'].series.slice(-5))
})
test('rangeStats on a hand-made series', () => {
  const s = [100, 110, 99, 120].map((close, i) => ({ date: 'd' + i, close }))
  const r = rangeStats(s); close(r.changePct, 20, 1e-9); assert.equal(r.high, 120); assert.equal(r.low, 99); close(r.maxDrawdownPct, -10, 1e-9); assert.ok(r.volatilityPct > 0)
  assert.equal(rangeStats([{ date: 'x', close: 1 }]), null)
})
test('constant prices -> zero change, zero volatility; slice ranges; day change', () => {
  const flat = Array.from({ length: 30 }, (_, i) => ({ date: 'd' + i, close: 50 })); const r = rangeStats(flat); assert.equal(r.changePct, 0); assert.equal(r.volatilityPct, 0)
  assert.equal(sliceRange(flat, '1M').length, 21); assert.equal(sliceRange(flat, 'All').length, 30); close(dayChangePct([{ close: 100 }, { close: 102 }]), 2, 1e-9)
})
// ---- paper portfolio ----
const T = (side, symbol, quantity, price, n) => ({ id: 't' + n, created_at: '2026-01-0' + n, side, symbol, quantity, price })
const px = (s) => ({ 'DEMO-A': 120, 'DEMO-B': 50 }[s] ?? null)
test('portfolio: average cost, cash, unrealized and realized P&L', () => {
  const t = [T('buy', 'DEMO-A', 10, 100, 1), T('buy', 'DEMO-A', 10, 110, 2), T('sell', 'DEMO-A', 5, 130, 3)]
  const p = computePortfolio(t, px); const h = p.holdings[0]
  assert.equal(h.qty, 15); assert.equal(h.avgCost, 105); assert.equal(p.cash, STARTING_CASH - 2100 + 650); assert.equal(p.realized, 125) // (130-105)*5
  assert.equal(h.value, 1800); assert.equal(h.pnl, 225); assert.equal(p.totalPnl, 125 + 225)
})
test('portfolio: selling everything removes the holding; trades are order-independent', () => {
  const t = [T('sell', 'DEMO-B', 4, 60, 2), T('buy', 'DEMO-B', 4, 50, 1)]; const p = computePortfolio(t, px)
  assert.equal(p.holdings.length, 0); assert.equal(p.realized, 40); assert.equal(p.cash, STARTING_CASH + 40)
})
test('portfolio: invalid oversell in the log is ignored, not applied', () => assert.equal(computePortfolio([T('sell', 'DEMO-A', 5, 100, 1)], px).cash, STARTING_CASH))
test('trade validation: quantity, cash, oversell, missing price', () => {
  const t = [T('buy', 'DEMO-A', 10, 100, 1)]
  assert.match(validateTrade(t, { symbol: 'DEMO-A', side: 'buy', quantity: 1.5 }, 100), /whole number/); assert.match(validateTrade(t, { symbol: 'DEMO-A', side: 'buy', quantity: 0 }, 100), /whole number/)
  assert.match(validateTrade(t, { symbol: 'DEMO-A', side: 'buy', quantity: 100000 }, 100), /Not enough virtual cash/); assert.match(validateTrade(t, { symbol: 'DEMO-A', side: 'sell', quantity: 11 }, 100), /only hold 10/)
  assert.match(validateTrade(t, { symbol: 'DEMO-A', side: 'buy', quantity: 1 }, 0), /No price/); assert.equal(validateTrade(t, { symbol: 'DEMO-A', side: 'sell', quantity: 10 }, 100), null)
})
// ---- GST ----
test('GST rates list reflects the 5%/18%/40% structure (no 12% or 28%)', () => { assert.deepEqual(GST_RATES, [0, 5, 18, 40]) })
test('GST exclusive and inclusive give the same split; CGST+SGST = GST', () => {
  const ex = gst({ amount: 1000, rate: 18 }), inc = gst({ amount: 1180, rate: 18, inclusive: true })
  assert.deepEqual([ex.base, ex.gst, ex.total, ex.cgst, ex.sgst], [1000, 180, 1180, 90, 90]); assert.deepEqual([inc.base, inc.gst, inc.total], [1000, 180, 1180])
})
test('GST inclusive rounding keeps total = base + gst exactly (1000 @ 5%)', () => { const g = gst({ amount: 1000, rate: 5, inclusive: true }); assert.equal(g.base, 952.38); assert.equal(g.gst, 47.62); assert.equal(g.total, 1000) })
test('GST odd paise: CGST + SGST still equal GST; inter-state uses IGST only', () => {
  const g = gst({ amount: 0.1, rate: 10 }); assert.equal(g.gst, 0.01); assert.equal(g.cgst + g.sgst, g.gst)
  const i = gst({ amount: 1000, rate: 18, interState: true }); assert.deepEqual([i.cgst, i.sgst, i.igst], [0, 0, 180]); assert.equal(gst({ amount: 500, rate: 0 }).gst, 0); assert.equal(gst({ amount: 1000, rate: 3 }).gst, 30)
})
test('invoice totals add up across lines with different rates', () => {
  const v = invoice({ items: [{ desc: 'A', qty: 2, price: 500, gstRate: 18 }, { desc: 'B', qty: 1, price: 200, gstRate: 5 }] })
  assert.equal(v.taxable, 1200); assert.equal(v.tax, 190); assert.equal(v.total, 1390); assert.equal(v.cgst + v.sgst, v.tax); assert.equal(v.lines[0].total, 1180)
})
test('GSTIN format check', () => { assert.ok(validGstin('27AAPFU0939F1ZV')); assert.ok(validGstin('27aapfu0939f1zv')); assert.ok(!validGstin('27AAPFU0939F1Z')); assert.ok(!validGstin('')); assert.ok(!validGstin('XXAAPFU0939F1ZV')) })
// ---- EMI ----
test('EMI: 10,00,000 at 10% for 12 months = 87,915.89 (standard published value)', () => close(emi({ principal: 1000000, annualRate: 10, months: 12 }).emi, 87915.89, 0.01))
test('EMI schedule: principal repaid = loan, ends at zero, interest consistent', () => {
  const e = emi({ principal: 500000, annualRate: 11, months: 36 })
  close(e.schedule.reduce((s, x) => s + x.principal, 0), 500000, 1e-6); close(e.schedule[35].balance, 0, 1e-6); close(e.totalInterest, e.totalPayable - 500000, 1e-6)
  close(e.schedule[0].interest, 500000 * 0.11 / 12, 1e-6); assert.equal(e.years.length, 3); close(e.years.reduce((s, y) => s + y.principal, 0), 500000, 1e-6)
})
test('EMI at 0% interest is simply principal / months', () => { const e = emi({ principal: 120000, annualRate: 0, months: 12 }); assert.equal(e.emi, 10000); assert.equal(e.totalInterest, 0) })
// ---- P&L / cash flow ----
test('P&L arithmetic and margins; zero revenue gives null margins', () => {
  const p = pnl({ revenue: 100000, cogs: 40000, opex: 25000 }); assert.deepEqual([p.grossProfit, p.netProfit, p.grossMarginPct, p.netMarginPct], [60000, 35000, 60, 35]); assert.equal(pnl({ revenue: 0, cogs: 0, opex: 100 }).netMarginPct, null)
  assert.equal(pnl({ revenue: 100, cogs: 150, opex: 0 }).netProfit, -50)
})
test('cash flow: unpaid invoices and bills make cash differ from profit', () => {
  const c = cashflow({ opening: 50000, revenue: 100000, receivables: 20000, costs: 60000, payables: 10000, emiPaid: 8000, drawings: 5000, otherIn: 0 })
  assert.deepEqual([c.cashIn, c.cashOut, c.net, c.closing], [80000, 63000, 17000, 67000])
})
test('validation of business inputs', () => {
  assert.match(validateBiz({ revenue: '100', costs: '0', receivables: '200' }), /cannot exceed revenue/); assert.match(validateBiz({ revenue: '-1' }), /negative/); assert.match(validateBiz({ revenue: 'x' }), /number/)
  assert.equal(validateBiz({ revenue: '1000', costs: '500', receivables: '100', payables: '50' }), null)
  assert.match(validateEmi({ principal: 0, annualRate: 10, months: 12 }), /Loan amount/); assert.match(validateEmi({ principal: 1000, annualRate: 10, months: 12.5 }), /whole number/); assert.equal(validateEmi({ principal: 1000, annualRate: 10, months: 12 }), null)
  assert.match(validateGst({ amount: -1, rate: 18 }), /valid amount/); assert.match(validateGst({ amount: 100, rate: 150 }), /rate/)
})
// ---- CSV numbers ----
test('csv: negative numbers are not prefixed, text formulas still are', () => { assert.equal(csvCell(-500), '-500'); assert.equal(csvCell('-500'), "'-500"); assert.equal(csvFromRows([['Net profit', -50.5]]), 'Net profit,-50.5\r\n') })
