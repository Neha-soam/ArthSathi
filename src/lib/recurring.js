// Monthly recurring rules. Returns the dates still to be created: on/after start_date, after last_generated, up to today.
// Day 31 in a 30-day month (or 29/30/31 in February) is clamped to the month's last day. Deleting a generated
// transaction does not bring it back, because generation only moves forward from last_generated.
const p2 = (n) => String(n).padStart(2, '0')
export function dueDates(rule, today, cap = 36) {
  let [y, m] = rule.start_date.slice(0, 7).split('-').map(Number)
  const out = []
  for (let guard = 0; guard < 1200; guard++) {
    const day = Math.min(rule.day_of_month, new Date(y, m, 0).getDate())
    const d = `${y}-${p2(m)}-${p2(day)}`
    if (d > today) break
    if (d >= rule.start_date && (!rule.last_generated || d > rule.last_generated)) out.push(d)
    if (++m > 12) { m = 1; y++ }
  }
  return out.slice(-cap)
}
