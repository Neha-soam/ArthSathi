// Deterministic tax engine. FY 2026-27 (AY 2027-28), resident individual below 60, salaried.
// Slabs verified against multiple public sources (unchanged from FY 2025-26). Verify on incometax.gov.in before relying on it.
export const TAX_YEAR = 'FY 2026-27 (AY 2027-28)'
const NEW_SLABS = [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]]
const OLD_SLABS = [[250000, 0], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]]

export function slabTax(income, slabs) {
  let tax = 0, prev = 0
  for (const [limit, rate] of slabs) {
    if (income > prev) tax += (Math.min(income, limit) - prev) * rate
    prev = limit
  }
  return tax
}
const n = (v) => Math.max(0, Number(v) || 0)

export function newRegime({ gross }) {
  const taxable = Math.max(0, n(gross) - 75000)
  let base = slabTax(taxable, NEW_SLABS), rebate = 0
  if (taxable <= 1200000) rebate = base
  else base = Math.min(base, taxable - 1200000) // marginal relief just above 12L
  const afterRebate = base - rebate
  const cess = afterRebate * 0.04
  return { regime: 'New', stdDeduction: 75000, deductions: 0, taxable, slabTax: slabTax(taxable, NEW_SLABS), rebate, cess, total: Math.round(afterRebate + cess) }
}

export function oldRegime({ gross, d80c, d80d, hra, homeLoan, other }) {
  const ded = Math.min(n(d80c), 150000) + n(d80d) + n(hra) + Math.min(n(homeLoan), 200000) + n(other)
  const taxable = Math.max(0, n(gross) - 50000 - ded)
  const base = slabTax(taxable, OLD_SLABS)
  const rebate = taxable <= 500000 ? Math.min(base, 12500) : 0
  const afterRebate = base - rebate
  const cess = afterRebate * 0.04
  return { regime: 'Old', stdDeduction: 50000, deductions: ded, taxable, slabTax: base, rebate, cess, total: Math.round(afterRebate + cess) }
}
