import { Link } from 'react-router-dom'
import { inr } from '../lib/format'
import { budgetUsage, monthKey, summarize, useFinance } from '../lib/useFinance'
import { NAV } from '../components/Layout.jsx'
import ErrorCard from '../components/ErrorCard.jsx'

export default function Dashboard() {
  const { tx, budgets, loading, error, truncated, reload } = useFinance()
  if (loading) return <p className="text-slate-500">Loading your data…</p>
  if (error) return <div className="space-y-6"><h1 className="text-2xl font-bold">Dashboard</h1><ErrorCard error={error} onRetry={reload} /></div>
  // Same functions as the Budgeting page, so both pages always show identical numbers.
  const s = summarize(tx, monthKey())
  const u = budgetUsage(budgets, s.byCat)
  const monthName = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const cards = [
    ['Total balance (all time)', inr(s.balance), s.balance < 0 ? 'text-red-600' : ''],
    [`Income (${monthName})`, inr(s.income), ''],
    [`Expenses (${monthName})`, inr(s.expense), ''],
    ['Savings rate (this month)', s.savingsRate === null ? '—' : s.savingsRate + '%', s.savingsRate !== null && s.savingsRate < 0 ? 'text-red-600' : ''],
  ]
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Dashboard</h1>
      {truncated && <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">You have a very large number of transactions. Only the most recent 10,000 are included, so totals may be incomplete.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v, c]) => (<div key={l} className="card"><div className="text-xs text-slate-500">{l}</div><div className={`text-xl font-semibold ${c}`}>{v}</div></div>))}
      </div>
      {s.income === 0 && s.expense > 0 && <p className="text-sm text-slate-500">No income recorded this month, so the savings rate can't be calculated.</p>}
      <p className="text-sm text-slate-500">All time: income {inr(s.totalIncome)} · expenses {inr(s.totalExpense)}</p>
      <div className="card"><h3 className="mb-2 font-semibold">Budget utilisation ({monthName})</h3>
        {u.rows.length ? <>
          <div className="h-3 rounded bg-slate-100"><div className={`h-3 rounded ${u.totalUsed > u.totalLimit ? 'bg-red-500' : u.totalPct >= 80 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: Math.min(100, u.totalPct) + '%' }} /></div>
          <p className="mt-1 text-sm text-slate-600">{inr(u.totalUsed)} of {inr(u.totalLimit)} spent in budgeted categories</p>
          {u.overCount > 0 && <p className="mt-1 text-sm text-red-600">{u.overCount} categor{u.overCount > 1 ? 'ies are' : 'y is'} over budget. <Link className="underline" to="/budgeting">Review</Link></p>}
        </> : <p className="text-sm text-slate-500">No budgets yet. <Link className="underline" to="/budgeting">Set one</Link>.</p>}</div>
      <div className="card"><h3 className="mb-2 font-semibold">Recent transactions</h3>
        {tx.length === 0 ? <p className="text-sm text-slate-500">Nothing yet. <Link className="underline" to="/budgeting">Add your first transaction</Link>.</p> :
          <ul className="divide-y">{tx.slice(0, 5).map((t) => <li key={t.id} className="flex justify-between py-2 text-sm"><span>{t.category}{t.note ? ` · ${t.note}` : ''} <span className="text-xs text-slate-500">{t.date}</span></span><span>{t.type === 'income' ? '+' : '-'}{inr(t.amount)}</span></li>)}</ul>}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{NAV.slice(1, 7).map(([to, label, Icon]) => (
        <Link key={to} to={to} className="card flex items-center gap-3 hover:border-brand-600"><Icon className="text-brand-600" size={20} />{label}</Link>))}</div>
    </div>
  )
}
