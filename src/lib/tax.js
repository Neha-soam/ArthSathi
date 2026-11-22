// Deterministic tax engine for a resident individual with salary income.
// Rules checked against multiple public sources in Nov 2026 (slabs unchanged for FY 2026-27; Income-tax Act, 2025 in force from 1 Apr 2026):
//   New regime: slabs 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, >24L 30%; std deduction 75,000; rebate up to 60,000 (taxable <= 12L).
//   Old regime: basic exemption 2.5L (<60), 3L (60-79), 5L (80+); then 5% to 5L, 20% to 10L, 30% above; std deduction 50,000; rebate up to 12,500 (taxable <= 5L).
//   Old-regime caps: 80C 1.5L; 80CCD(1B) 50,000; 80D 25,000 self/family (50,000 if senior) + 25,000 parents (50,000 if senior); home-loan interest (self-occupied) 2L.
// Cess 4%. NOT modelled: surcharge, capital gains, other income, employer NPS 80CCD(2), senior-citizen specials. Educational estimate only.
export const TAX_YEAR = 'FY 2026-27 (Tax Year 2026-27 under the Income-tax Act, 2025)'
export const SURCHARGE_THRESHOLD = 5000000
export const CAPS = { d80c: 150000, d80ccd1b: 50000, home: 200000, d80dSelf: 25000, d80dSelfSenior: 50000, d80dParents: 25000, d80dParentsSenior: 50000 }
const INF = Infinity
export const NEW_SLABS = [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [INF, 0.30]]
export const OLD_SLABS = {
  below60: [[250000, 0], [500000, 0.05], [1000000, 0.20], [INF, 0.30]],
  '60to79': [[300000, 0], [500000, 0.05], [1000000, 0.20], [INF, 0.30]],
  '80plus': [[500000, 0], [1000000, 0.20], [INF, 0.30]],
}
const n = (v) => Math.max(0, Number(v) || 0)

export function slabBreakdown(income, slabs) {
  const rows = []; let prev = 0
  for (const [limit, rate] of slabs) {
    const amount = Math.max(0, Math.min(income, limit) - prev)
    if (amount > 0) rows.push({ from: prev, to: limit, rate, amount, tax: amount * rate })
    prev = limit
  }
  return rows
}
export const slabTax = (income, slabs) => slabBreakdown(income, slabs).reduce((s, r) => s + r.tax, 0)

export function hraExemption({ basic, hraReceived, rentPaid, metro }) {
  const parts = [n(hraReceived), Math.max(0, n(rentPaid) - 0.1 * n(basic)), (metro ? 0.5 : 0.4) * n(basic)]
  return { exempt: Math.round(Math.min(...parts)), parts }
}

function finish(regime, gross, stdDeduction, deductionRows, taxable, slabs) {
  const rows = slabBreakdown(taxable, slabs); let tax = rows.reduce((s, r) => s + r.tax, 0), rebate = 0, relief = 0
  if (regime === 'New') {
    if (taxable <= 1200000) rebate = tax
    else if (tax > taxable - 1200000) { relief = tax - (taxable - 1200000) } // marginal relief just above 12L
  } else if (taxable <= 500000) rebate = Math.min(tax, 12500)
  const afterRelief = tax - rebate - relief, cess = afterRelief * 0.04
  const total = Math.round(afterRelief + cess)
  return { regime, gross: n(gross), stdDeduction, deductionRows, deductions: deductionRows.reduce((s, r) => s + r.allowed, 0), taxable, slabRows: rows, slabTax: tax, rebate, relief, cess, total,
    effectiveRate: n(gross) > 0 ? (total / n(gross)) * 100 : 0, surchargeWarning: taxable > SURCHARGE_THRESHOLD }
}

export function newRegime({ gross }) {
  const taxable = Math.max(0, n(gross) - 75000)
  return finish('New', gross, 75000, [], taxable, NEW_SLABS)
}

export function oldRegime({ gross, age = 'below60', parentsSenior = false, d80c, d80ccd1b, d80dSelf, d80dParents, hra, homeLoan, other }) {
  const senior = age !== 'below60'
  const row = (label, claimed, cap) => ({ label, claimed: n(claimed), cap, allowed: cap === null ? n(claimed) : Math.min(n(claimed), cap), capped: cap !== null && n(claimed) > cap })
  const deductionRows = [
    row('Section 80C investments', d80c, CAPS.d80c), row('NPS extra (80CCD(1B))', d80ccd1b, CAPS.d80ccd1b),
    row('Health insurance, self/family (80D)', d80dSelf, senior ? CAPS.d80dSelfSenior : CAPS.d80dSelf),
    row('Health insurance, parents (80D)', d80dParents, parentsSenior ? CAPS.d80dParentsSenior : CAPS.d80dParents),
    row('HRA exemption', hra, null), row('Home loan interest (self-occupied)', homeLoan, CAPS.home), row('Other deductions you entered', other, null),
  ].filter((r) => r.claimed > 0)
  const total = deductionRows.reduce((s, r) => s + r.allowed, 0)
  return finish('Old', gross, 50000, deductionRows, Math.max(0, n(gross) - 50000 - total), OLD_SLABS[age] || OLD_SLABS.below60)
}

// Returns an error message, or null when the inputs are usable.
export function validateTaxInputs(f) {
  const MAX = 1e10
  for (const [k, label] of [['gross', 'Gross salary'], ['d80c', '80C'], ['d80ccd1b', 'NPS'], ['d80dSelf', '80D (self/family)'], ['d80dParents', '80D (parents)'], ['hra', 'HRA exemption'], ['homeLoan', 'Home loan interest'], ['other', 'Other deductions']]) {
    const v = f[k]; if (v === '' || v === undefined || v === null) continue
    if (!Number.isFinite(Number(v))) return `${label} must be a number.`
    if (Number(v) < 0) return `${label} cannot be negative.`
    if (Number(v) > MAX) return `${label} is too large.`
  }
  if (!(Number(f.gross) > 0)) return 'Enter your annual gross salary.'
  return null
}
