// Hypothetical projections for education. Nothing here predicts or promises returns.
export function sipProjection({ monthly, annualRate, years, stepUpPct = 0 }) {
  const r = annualRate / 1200, months = Math.round(years * 12), schedule = []
  let value = 0, invested = 0, amt = monthly
  for (let m = 1; m <= months; m++) {
    if (m > 1 && (m - 1) % 12 === 0) amt *= 1 + stepUpPct / 100 // yearly step-up
    value = (value + amt) * (1 + r); invested += amt           // deposit at the start of each month, then a month of growth
    if (m % 12 === 0) schedule.push({ year: m / 12, invested: Math.round(invested), value: Math.round(value) })
  }
  return { invested, value, gain: value - invested, schedule }
}
export function lumpProjection({ principal, annualRate, years, perYear = 1 }) {
  const f = (t) => principal * Math.pow(1 + annualRate / 100 / perYear, perYear * t)
  const schedule = Array.from({ length: Math.round(years) }, (_, i) => ({ year: i + 1, invested: Math.round(principal), value: Math.round(f(i + 1)) }))
  const value = f(years)
  return { invested: principal, value, gain: value - principal, schedule }
}
// Recurring deposit: monthly deposits, interest compounded quarterly (common bank convention; actual banks may differ slightly).
export function rdProjection({ monthly, annualRate, months }) {
  let value = 0
  for (let k = 1; k <= months; k++) value += monthly * Math.pow(1 + annualRate / 400, (months - k + 1) / 3)
  const invested = monthly * months
  return { invested, value, gain: value - invested }
}
export const realValue = (value, inflationPct, years) => value / Math.pow(1 + inflationPct / 100, years)

const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v))
const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi
export function validateInvest({ monthly, principal, annualRate, years, months, stepUpPct, inflation, perYear }) {
  if (monthly !== undefined && !inRange(num(monthly), 1, 1e7)) return 'Monthly amount must be between ₹1 and ₹1,00,00,000.'
  if (principal !== undefined && !inRange(num(principal), 1, 1e10)) return 'Amount must be between ₹1 and ₹1,000 crore.'
  if (!inRange(num(annualRate), 0, 50)) return 'Interest or return rate must be between 0% and 50%.'
  if (years !== undefined && !(Number.isInteger(num(years)) && inRange(num(years), 1, 50))) return 'Years must be a whole number from 1 to 50.'
  if (months !== undefined && !(Number.isInteger(num(months)) && inRange(num(months), 1, 120))) return 'Months must be a whole number from 1 to 120.'
  if (stepUpPct !== undefined && !inRange(num(stepUpPct), 0, 50)) return 'Step-up must be between 0% and 50%.'
  if (inflation !== undefined && !inRange(num(inflation), 0, 20)) return 'Inflation must be between 0% and 20%.'
  if (perYear !== undefined && ![1, 2, 4, 12].includes(Number(perYear))) return 'Choose a compounding frequency from the list.'
  return null
}
export const rateWarning = (rate) => (Number(rate) > 15 ? 'Rates above 15% a year are unusual and are never guaranteed. Treat this as an extreme example.' : '')
