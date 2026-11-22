// Single source of truth for money maths, used by BOTH Dashboard and Budgeting so their numbers always agree.
// Amounts are summed in integer paise to avoid floating-point drift (0.1 + 0.2).
const toPaise = (v) => Math.round((Number(v) || 0) * 100)

export function summarize(tx, month) {
  let ti = 0, te = 0, mi = 0, me = 0; const cat = {}
  for (const t of tx) {
    const p = toPaise(t.amount), inMonth = String(t.date).startsWith(month)
    if (t.type === 'income') { ti += p; if (inMonth) mi += p }
    else { te += p; if (inMonth) { me += p; cat[t.category] = (cat[t.category] || 0) + p } }
  }
  return {
    income: mi / 100, expense: me / 100, net: (mi - me) / 100,
    savingsRate: mi > 0 ? Math.round(((mi - me) / mi) * 100) : null, // null when there is no income (not 0%, not Infinity); negative when overspending
    byCat: Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, v / 100])),
    totalIncome: ti / 100, totalExpense: te / 100, balance: (ti - te) / 100,
  }
}

// status: 'ok' (<80%), 'near' (80% to 100% inclusive), 'over' (>100%)
export function budgetUsage(budgets, byCat) {
  const rows = budgets.map((b) => {
    const limit = Number(b.monthly_limit) || 0, used = byCat[b.category] || 0, pct = limit > 0 ? (used / limit) * 100 : 0
    return { id: b.id, category: b.category, limit, used, remaining: limit - used, pct, status: used > limit ? 'over' : pct >= 80 ? 'near' : 'ok' }
  })
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0), totalUsed = rows.reduce((s, r) => s + r.used, 0)
  return { rows, totalLimit, totalUsed, totalPct: totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0, overCount: rows.filter((r) => r.status === 'over').length, nearCount: rows.filter((r) => r.status === 'near').length }
}

// Reads every page so totals never silently ignore old rows. If the hard cap is hit, `truncated` is true and the UI must warn.
export async function fetchAllPages(fetchPage, pageSize = 1000, maxPages = 10) {
  let all = []
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await fetchPage(i * pageSize, (i + 1) * pageSize - 1)
    if (error) return { error }
    all = all.concat(data)
    if (data.length < pageSize) return { data: all, truncated: false }
  }
  return { data: all, truncated: true }
}
