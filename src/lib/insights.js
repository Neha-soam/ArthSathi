// Deterministic insights: every number comes from the user's saved transactions and every insight says how it was calculated.
import { budgetUsage, summarize } from './finance.js'
import { inr } from './format.js'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n) => String(n).padStart(2, '0')
export const prevMonth = (m) => { let [y, mo] = m.split('-').map(Number); if (--mo === 0) { mo = 12; y-- } return `${y}-${p2(mo)}` }
export const daysInMonth = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate() }
export const monthLabel = (m) => { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}` }

function expenseUpTo(tx, month, day) {
  const cat = {}; let total = 0
  for (const t of tx) {
    if (t.type !== 'expense' || !String(t.date).startsWith(month) || Number(t.date.slice(8, 10)) > day) continue
    const p = Math.round((Number(t.amount) || 0) * 100); total += p; cat[t.category] = (cat[t.category] || 0) + p
  }
  return { total: total / 100, byCat: Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, v / 100])) }
}

export function monthReport(tx, month, today) {
  const isCurrent = today.startsWith(month), dim = daysInMonth(month)
  const asOfDay = isCurrent ? Number(today.slice(8, 10)) : dim
  const s = summarize(tx, month), cur = expenseUpTo(tx, month, asOfDay)
  const prev = prevMonth(month), prevCmp = expenseUpTo(tx, prev, Math.min(asOfDay, daysInMonth(prev)))
  const avgDaily = Math.round((cur.total / asOfDay) * 100) / 100
  return {
    month, isCurrent, asOfDay, dim, income: s.income, expense: s.expense, net: s.net, savingsRate: s.savingsRate,
    top: Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([category, amount]) => ({ category, amount, share: s.expense > 0 ? Math.round((amount / s.expense) * 100) : 0 })),
    spentSoFar: cur.total, prevMonth: prev, prevSpent: prevCmp.total,
    changePct: prevCmp.total > 0 ? Math.round(((cur.total - prevCmp.total) / prevCmp.total) * 100) : null,
    avgDaily, projected: isCurrent && asOfDay >= 7 ? Math.round(avgDaily * dim) : null,
    txCount: tx.filter((t) => String(t.date).startsWith(month)).length,
  }
}

export function monthlySeries(tx, endMonth, n = 6) {
  const months = [endMonth]; while (months.length < n) months.unshift(prevMonth(months[0]))
  return months.map((m) => { const s = summarize(tx, m); return { month: m, label: MONTHS[Number(m.slice(5)) - 1], income: s.income, expense: s.expense } })
}

export function computeInsights(tx, budgets, month, today) {
  const r = monthReport(tx, month, today), out = [], L = monthLabel(month), PL = monthLabel(r.prevMonth)
  if (r.expense <= 0) return out
  const top = r.top[0]
  out.push({ id: 'top', tone: 'info', title: `${top.category} is your biggest expense`, text: `${inr(top.amount)}, which is ${top.share}% of this month's spending.`,
    how: `Total ${top.category} expenses in ${L} (${inr(top.amount)}) ÷ total expenses in ${L} (${inr(r.expense)}) = ${top.share}%.` })
  if (r.changePct !== null) out.push({ id: 'change', tone: r.changePct > 10 ? 'warn' : r.changePct < -10 ? 'good' : 'info',
    title: `${Math.abs(r.changePct)}% ${r.changePct >= 0 ? 'more' : 'less'} spending than ${PL}`, text: `${inr(r.spentSoFar)} vs ${inr(r.prevSpent)}${r.isCurrent ? ` over days 1 to ${r.asOfDay}` : ''}.`,
    how: `Compares expenses on days 1 to ${r.asOfDay} of ${L} with days 1 to ${Math.min(r.asOfDay, daysInMonth(r.prevMonth))} of ${PL}, so an unfinished month is not compared with a full one. Change = (new − old) ÷ old.` })
  out.push({ id: 'avg', tone: 'info', title: `About ${inr(r.avgDaily)} spent per day`, text: `Average daily spending in ${L}.`, how: `${inr(r.spentSoFar)} ÷ ${r.asOfDay} days.` })
  if (r.projected !== null) out.push({ id: 'projection', tone: 'info', title: `Pace suggests about ${inr(r.projected)} by month end`, text: 'This is a projection if your spending stays at the current daily pace.',
    how: `Average per day (${inr(r.avgDaily)}) × ${r.dim} days in ${L}. It is an estimate, not a prediction of what you will actually spend.` })
  const s = summarize(tx, month)
  for (const b of budgetUsage(budgets, s.byCat).rows) {
    if (b.status === 'over') out.push({ id: 'over-' + b.category, tone: 'warn', title: `${b.category} is over budget by ${inr(-b.remaining)}`, text: `${inr(b.used)} spent against a limit of ${inr(b.limit)}.`, how: `Spent in ${b.category} this month (${inr(b.used)}) − monthly limit (${inr(b.limit)}).` })
    else if (b.status === 'near') out.push({ id: 'near-' + b.category, tone: 'warn', title: `${b.category} has used ${Math.round(b.pct)}% of its budget`, text: `${inr(b.remaining)} left of ${inr(b.limit)}.`, how: `${inr(b.used)} ÷ ${inr(b.limit)}. A warning appears from 80%.` })
  }
  const cur = expenseUpTo(tx, month, r.asOfDay)
  const hist = []; let m = month
  for (let i = 0; i < 3; i++) { m = prevMonth(m); hist.push(expenseUpTo(tx, m, Math.min(r.asOfDay, daysInMonth(m)))) }
  Object.entries(cur.byCat).map(([cat, amt]) => ({ cat, amt, avg: hist.reduce((a, h) => a + (h.byCat[cat] || 0), 0) / 3, seen: hist.some((h) => (h.byCat[cat] || 0) > 0) }))
    .filter((x) => x.seen && x.amt > x.avg * 1.5 && x.amt - x.avg >= 500).sort((a, b) => (b.amt - b.avg) - (a.amt - a.avg)).slice(0, 2)
    .forEach((x) => out.push({ id: 'unusual-' + x.cat, tone: 'warn', title: `${x.cat} spending is higher than usual`, text: `${inr(x.amt)} so far, against a usual ${inr(x.avg)} for the same days.`,
      how: `${x.cat} so far: ${inr(x.amt)}. Average of the same days in the previous 3 months: ${inr(x.avg)}. Flagged because it is more than 1.5× that average and at least ₹500 higher.` }))
  return out
}
