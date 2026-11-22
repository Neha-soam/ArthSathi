// Simplified business calculators. All money rounded to paise. Educational estimates, not accounting or tax-filing advice.
export const GST_RATES = [0, 5, 18, 40] // since 22 Sep 2025 (12% and 28% slabs removed). Special items may differ: a custom rate is allowed.
const toP = (v) => Math.round((Number(v) || 0) * 100)
const fromP = (p) => p / 100

export function gst({ amount, rate, inclusive = false, interState = false }) {
  const a = toP(amount), r = Number(rate) || 0
  const base = inclusive ? Math.round(a / (1 + r / 100)) : a
  const tax = inclusive ? a - base : Math.round((a * r) / 100)
  const half = interState ? 0 : Math.floor(tax / 2)
  return { base: fromP(base), gst: fromP(tax), cgst: fromP(interState ? 0 : half), sgst: fromP(interState ? 0 : tax - half), igst: fromP(interState ? tax : 0), total: fromP(base + tax) }
}
export function invoice({ items, interState = false }) {
  const lines = items.map((it) => {
    const taxable = Math.round(toP(it.price) * (Number(it.qty) || 0)), tax = Math.round((taxable * (Number(it.gstRate) || 0)) / 100)
    return { desc: it.desc, qty: Number(it.qty) || 0, price: Number(it.price) || 0, gstRate: Number(it.gstRate) || 0, taxable: fromP(taxable), tax: fromP(tax), total: fromP(taxable + tax) }
  })
  const taxableP = lines.reduce((s, l) => s + toP(l.taxable), 0), taxP = lines.reduce((s, l) => s + toP(l.tax), 0), half = Math.floor(taxP / 2)
  return { lines, taxable: fromP(taxableP), tax: fromP(taxP), cgst: fromP(interState ? 0 : half), sgst: fromP(interState ? 0 : taxP - half), igst: fromP(interState ? taxP : 0), total: fromP(taxableP + taxP) }
}
// Format check only (15 characters). It does not prove the GSTIN exists or is active.
export const validGstin = (s) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(s).toUpperCase())

export function emi({ principal, annualRate, months }) {
  const P = Number(principal), n = Math.round(months), r = annualRate / 1200
  const e = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const schedule = []; let bal = P
  for (let m = 1; m <= n; m++) {
    const interest = bal * r, principalPart = m === n ? bal : e - interest
    bal = m === n ? 0 : bal - principalPart
    schedule.push({ month: m, emi: m === n ? principalPart + interest : e, interest, principal: principalPart, balance: Math.max(0, bal) })
  }
  const years = []
  schedule.forEach((s) => { const y = Math.ceil(s.month / 12); const row = years[y - 1] || (years[y - 1] = { year: y, principal: 0, interest: 0, balance: 0 }); row.principal += s.principal; row.interest += s.interest; row.balance = s.balance })
  const totalPayable = schedule.reduce((s, x) => s + x.emi, 0)
  return { emi: e, totalPayable, totalInterest: totalPayable - P, schedule, years }
}

export function pnl({ revenue, cogs, opex }) {
  const rev = toP(revenue), c = toP(cogs), o = toP(opex), gross = rev - c, net = gross - o
  return { revenue: fromP(rev), cogs: fromP(c), grossProfit: fromP(gross), grossMarginPct: rev > 0 ? (gross / rev) * 100 : null, opex: fromP(o), netProfit: fromP(net), netMarginPct: rev > 0 ? (net / rev) * 100 : null }
}
// Cash vs profit. Loan EMI (principal + interest) appears only here, so the P&L above does not deduct loan interest.
export function cashflow({ opening, revenue, receivables, costs, payables, emiPaid, drawings, otherIn }) {
  const o = toP(opening), cashIn = toP(revenue) - toP(receivables) + toP(otherIn), cashOut = toP(costs) - toP(payables) + toP(emiPaid) + toP(drawings), net = cashIn - cashOut
  return { opening: fromP(o), cashIn: fromP(cashIn), cashOut: fromP(cashOut), net: fromP(net), closing: fromP(o + net) }
}
const nn = (v) => (v === '' || v === undefined ? 0 : Number(v))
export function validateBiz({ revenue, costs, receivables, payables, emiPaid, drawings, otherIn }) {
  for (const [v, l] of [[revenue, 'Revenue'], [costs, 'Costs'], [receivables, 'Unpaid customer amounts'], [payables, 'Unpaid supplier amounts'], [emiPaid, 'Loan EMI paid'], [drawings, 'Owner withdrawals'], [otherIn, 'Other cash received']]) {
    if (v === undefined) continue
    if (v !== '' && !Number.isFinite(Number(v))) return `${l} must be a number.`
    if (nn(v) < 0) return `${l} cannot be negative.`
    if (nn(v) > 1e11) return `${l} is too large.`
  }
  if (receivables !== undefined && nn(receivables) > nn(revenue)) return 'Unpaid customer amounts cannot exceed revenue.'
  if (payables !== undefined && nn(payables) > nn(costs)) return 'Unpaid supplier amounts cannot exceed costs.'
  return null
}
export function validateEmi({ principal, annualRate, months }) {
  if (!(Number(principal) > 0) || Number(principal) > 1e11) return 'Loan amount must be above ₹0.'
  if (!(Number(annualRate) >= 0 && Number(annualRate) <= 60)) return 'Interest rate must be between 0% and 60%.'
  if (!(Number.isInteger(Number(months)) && Number(months) >= 1 && Number(months) <= 360)) return 'Tenure must be a whole number of months from 1 to 360.'
  return null
}
export function validateGst({ amount, rate }) {
  if (!(Number(amount) >= 0) || !Number.isFinite(Number(amount)) || Number(amount) > 1e11) return 'Enter a valid amount.'
  if (!(Number(rate) >= 0 && Number(rate) <= 100)) return 'GST rate must be between 0% and 100%.'
  return null
}
