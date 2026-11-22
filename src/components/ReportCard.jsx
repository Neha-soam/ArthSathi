import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { computeInsights, monthLabel, monthReport, monthlySeries } from '../lib/insights'
import { inr } from '../lib/format'
import { localDateString } from '../lib/dates'

const DOT = { warn: 'bg-amber-500', good: 'bg-brand-600', info: 'bg-slate-400' }
const Stat = ({ label, value, sub }) => (<div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="font-semibold">{value}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div>)

export default function ReportCard({ tx, budgets, month }) {
  const today = localDateString()
  const r = monthReport(tx, month, today)
  const insights = computeInsights(tx, budgets, month, today)
  const series = monthlySeries(tx, month, 6)
  if (r.txCount === 0) return (<div className="card"><h3 className="font-semibold">Monthly report: {monthLabel(month)}</h3><p className="py-6 text-center text-sm text-slate-500">No transactions in this month yet. Add some to see your report and insights.</p></div>)
  return (
    <div className="card space-y-4"><h3 className="font-semibold">Monthly report: {monthLabel(month)}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Spent" value={inr(r.expense)} sub={`Income ${inr(r.income)}`} />
        <Stat label={`vs ${monthLabel(r.prevMonth)}`} value={r.changePct === null ? '—' : `${r.changePct > 0 ? '+' : ''}${r.changePct}%`} sub={r.changePct === null ? 'No earlier data' : r.isCurrent ? `same ${r.asOfDay} days` : 'full month'} />
        <Stat label="Average per day" value={inr(r.avgDaily)} sub={`over ${r.asOfDay} days`} />
        <Stat label={r.projected !== null ? 'Month-end pace' : 'Transactions'} value={r.projected !== null ? inr(r.projected) : r.txCount} sub={r.projected !== null ? 'projection only' : ''} />
      </div>
      {r.top.length > 0 && <div><h4 className="mb-1 text-sm font-medium">Top categories</h4><ul className="space-y-1 text-sm">{r.top.map((c) => <li key={c.category} className="flex justify-between"><span>{c.category}</span><span className="text-slate-600">{inr(c.amount)} · {c.share}%</span></li>)}</ul></div>}
      <div><h4 className="mb-1 text-sm font-medium">Income vs expenses, last 6 months</h4>
        <ResponsiveContainer width="100%" height={220}><BarChart data={series}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip formatter={(v) => inr(v)} /><Legend /><Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div><h4 className="mb-2 text-sm font-medium">Insights from your data</h4>
        {insights.length === 0 ? <p className="text-sm text-slate-500">No spending recorded this month, so there is nothing to analyse yet.</p> :
          <ul className="space-y-3">{insights.map((i) => (<li key={i.id} className="flex gap-3 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[i.tone]}`} />
            <div><div className="font-medium">{i.title}</div><div className="text-slate-600">{i.text}</div>
              <details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer">How this was calculated</summary><p className="mt-1">{i.how}</p></details></div></li>))}</ul>}</div>
      <p className="text-xs text-slate-500">Educational summary of your own records. Not financial advice.</p>
    </div>
  )
}
