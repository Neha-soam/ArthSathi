import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Pencil, Sparkles, Trash2, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { callAI, CATEGORIES, inr } from '../lib/ai'
import { useAuth } from '../lib/auth.jsx'
import { describeDbError } from '../lib/dberror'
import { budgetUsage, monthKey, summarize, useFinance } from '../lib/useFinance'
import { localDateString } from '../lib/dates'
import ErrorCard from '../components/ErrorCard.jsx'
import Field from '../components/Field.jsx'
import SelectField from '../components/SelectField.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { PageSkeleton } from '../components/Skeleton.jsx'
import { useToast } from '../components/Toast.jsx'
import { useCsvDownload } from '../components/useCsvDownload'
import ReportCard from '../components/ReportCard.jsx'
import RecurringCard from '../components/RecurringCard.jsx'
import { filterTx } from '../lib/filters'
import { toCsv } from '../lib/csv'

const INCOME_CATS = ['Salary', 'Other']
const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number({ invalid_type_error: 'Enter an amount' }).positive('Amount must be above 0').max(999999999),
  category: z.string().min(1), note: z.string().max(200).optional(), date: z.string().min(8, 'Pick a date'),
})
const blank = () => ({ type: 'expense', amount: '', category: 'Food', note: '', date: localDateString() })

export default function Budgeting() {
  const { user } = useAuth(), toast = useToast(), dlCsv = useCsvDownload()
  const { tx, budgets, loading, error, truncated, reload } = useFinance()
  const [form, setForm] = useState(blank()); const [editId, setEditId] = useState(null); const [err, setErr] = useState('')
  const [month, setMonth] = useState(monthKey()); const [cat, setCat] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [bCat, setBCat] = useState('Food'); const [bAmt, setBAmt] = useState('')
  const [ai, setAi] = useState(null); const [aiBusy, setAiBusy] = useState(false)

  const sum = useMemo(() => summarize(tx, month), [tx, month])
  const [q, setQ] = useState(''); const [typeF, setTypeF] = useState(''); const [bEdit, setBEdit] = useState(false)
  const filtered = useMemo(() => filterTx(tx, { q, cat, type: typeF, from, to }), [tx, q, cat, typeF, from, to])
  const chart = Object.entries(sum.byCat).map(([name, value]) => ({ name, value }))
  const usage = budgetUsage(budgets, sum.byCat)
  const [shown, setShown] = useState(50)

  async function save(e) {
    e.preventDefault(); setErr('')
    const p = schema.safeParse(form)
    if (!p.success) return setErr(p.error.issues[0].message)
    const row = { ...p.data, note: p.data.note || null }
    // user_id is sent explicitly; RLS still rejects it unless it equals auth.uid()
    const { error } = editId ? await supabase.from('transactions').update(row).eq('id', editId) : await supabase.from('transactions').insert({ ...row, user_id: user.id })
    if (error) { console.error('Save failed:', error); return setErr(describeDbError(error, 'save')) }
    toast.success(editId ? 'Transaction updated' : 'Transaction added'); setForm(blank()); setEditId(null); reload()
  }
  async function del(id) {
    if (!confirm('Delete this transaction?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { console.error(error); const m = describeDbError(error, 'delete'); setErr(m); return toast.error(m) }
    toast.success('Transaction deleted'); reload()
  }
  function edit(t) { setEditId(t.id); setForm({ type: t.type, amount: t.amount, category: t.category, note: t.note || '', date: t.date }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function saveBudget(e) {
    e.preventDefault(); const v = Number(bAmt)
    if (!(v > 0)) return
    setErr('')
    const { error } = await supabase.from('budgets').upsert({ user_id: user.id, category: bCat, monthly_limit: v }, { onConflict: 'user_id,category' })
    if (error) { console.error(error); return setErr(describeDbError(error, 'save')) }
    toast.success('Budget saved'); setBAmt(''); setBEdit(false); reload()
  }
  async function delBudget(id) {
    if (!confirm('Remove this budget?')) return
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) { console.error(error); const m = describeDbError(error, 'delete'); setErr(m); return toast.error(m) }
    toast.success('Budget removed'); reload()
  }
  function exportCsv() { dlCsv(`arthsathi-transactions-${localDateString()}.csv`, toCsv(filtered)) }
  async function insights() { setAiBusy(true); setAi(null); const { data, error } = await callAI({ action: 'insights' }); setAiBusy(false); setAi(error ? { error } : data) }

  if (loading) return <PageSkeleton />
  if (error) return <div className="space-y-6"><h1 className="page-title">Smart Budgeting</h1><ErrorCard error={error} onRetry={reload} /></div>
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="page-title">Smart Budgeting</h1>
        <input type="month" aria-label="Report month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} /></div>

      {truncated && <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">You have a very large number of transactions. Only the most recent 10,000 are included, so totals may be incomplete.</div>}
      {usage.rows.filter((r) => r.status !== 'ok').map((r) => (
        <div key={r.id} role="alert" className={`card text-sm ${r.status === 'over' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {r.status === 'over' ? `${r.category} is over budget by ${inr(-r.remaining)}.` : `${r.category} has used ${Math.round(r.pct)}% of its budget (${inr(r.remaining)} left).`}</div>))}
      <div className="grid grid-cols-3 gap-3">
        {[['Income this month', sum.income, 'text-brand-700'], ['Expenses this month', sum.expense, 'text-red-600'], ['Saved this month', sum.net, sum.net < 0 ? 'text-red-600' : 'text-slate-900']].map(([l, v, c]) => (
          <div key={l} className="card"><div className="text-xs text-slate-500">{l}</div><div className={`text-lg font-semibold ${c}`}>{inr(v)}</div></div>))}
      </div>

      <form onSubmit={save} className="card grid gap-3 sm:grid-cols-6">
        <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v, category: v === 'income' ? 'Salary' : 'Food' })} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        <Field label="Amount (₹)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <SelectField label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={form.type === 'income' ? INCOME_CATS : CATEGORIES} />
        <Field type="date" label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
        <div className="sm:col-span-2"><Field type="text" label="Note" maxLength={200} value={form.note} onChange={(v) => setForm({ ...form, note: v })} /></div>
        <div className="flex items-center gap-2 sm:col-span-6"><button className="btn">{editId ? 'Update' : 'Add transaction'}</button>
          {editId && <button type="button" className="btn-ghost" onClick={() => { setEditId(null); setForm(blank()) }}>Cancel</button>}
          {err && <span className="text-sm text-red-600">{err}</span>}</div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card"><h3 className="mb-2 font-semibold">Spending by category</h3>
          {chart.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip formatter={(v) => inr(v)} /><Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            : <p className="py-8 text-center text-sm text-slate-500">No expenses this month yet.</p>}</div>
        <div className="card"><h3 className="mb-2 font-semibold">Monthly budgets</h3>
          <form onSubmit={saveBudget} className="mb-3 flex gap-2"><select aria-label="Budget category" className="input" disabled={bEdit} value={bCat} onChange={(e) => setBCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input className="input" aria-label="Monthly limit in rupees" placeholder="Limit ₹" inputMode="decimal" value={bAmt} onChange={(e) => setBAmt(e.target.value)} /><button className="btn">{bEdit ? 'Update' : 'Set'}</button>{bEdit && <button type="button" className="btn-ghost" onClick={() => { setBEdit(false); setBAmt('') }}>Cancel</button>}</form>
          {budgets.length === 0 && <p className="text-sm text-slate-500">No budgets set. Add one above.</p>}
          <div className="space-y-3">{usage.rows.map((r) => (
            <div key={r.id}><div className="flex justify-between text-sm"><span>{r.category}</span><span className={r.status === 'over' ? 'text-red-600' : 'text-slate-600'}>{inr(r.used)} / {inr(r.limit)}<button className="btn-ghost" aria-label={`Edit ${r.category} budget`} onClick={() => { setBCat(r.category); setBAmt(String(r.limit)); setBEdit(true) }}><Pencil size={12} /></button><button className="btn-ghost" aria-label={`Remove ${r.category} budget`} onClick={() => delBudget(r.id)}><Trash2 size={12} /></button></span></div>
              <div className="mt-1 h-2 rounded bg-slate-100"><div className={`h-2 rounded ${r.status === 'over' ? 'bg-red-500' : r.status === 'near' ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: Math.min(100, r.pct) + '%' }} /></div>
              <div className="text-xs text-slate-500">{r.status === 'over' ? `Over by ${inr(-r.remaining)}` : `${inr(r.remaining)} left`}</div></div>))}</div></div>
      </div>

      <ReportCard tx={tx} budgets={budgets} month={month} />

      <div className="card"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-brand-600" />AI spending insights</h3>
        <button className="btn" onClick={insights} disabled={aiBusy}>{aiBusy ? 'Analysing…' : 'Analyse my last 90 days'}</button></div>
        {ai?.error && <p className="mt-2 text-sm text-red-600">{ai.error}</p>}
        {ai?.text && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{ai.text}</p>}
        <p className="mt-2 text-xs text-slate-500">How it works: the AI receives only your totals by category and by month for the last 90 days, plus your monthly budgets. It does not see your notes. It writes the summary; the figures come from your records. AI can make mistakes, so compare it with the report above.</p></div>

      <RecurringCard onChanged={reload} />

      <div className="card"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Transactions ({filtered.length})</h3><button className="btn-ghost" onClick={exportCsv} disabled={!filtered.length}><Download size={14} />Export CSV</button></div>
        <div className="mb-2 grid grid-cols-2 gap-2"><input aria-label="Search transactions" className="input" placeholder="Search notes or category" value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Type" className="input" value={typeF} onChange={(e) => setTypeF(e.target.value)}><option value="">Income and expenses</option><option value="expense">Expenses only</option><option value="income">Income only</option></select></div>
        <div className="mb-3 grid grid-cols-3 gap-2"><select aria-label="Filter by category" className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{[...CATEGORIES, 'Salary'].map((c) => <option key={c}>{c}</option>)}</select>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" /></div>
        {filtered.length === 0 ? <EmptyState icon={Wallet} title={tx.length === 0 ? 'No transactions yet' : 'No matching transactions'}>{tx.length === 0 ? 'Add your first income or expense above to start tracking.' : 'Try a different search or clear the filters.'}</EmptyState> :
          <ul className="divide-y">{filtered.slice(0, shown).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm"><div><div className="font-medium">{t.category}{t.note ? ` · ${t.note}` : ''}</div><div className="text-xs text-slate-500">{t.date}</div></div>
              <div className="flex items-center gap-1"><span className={t.type === 'income' ? 'text-brand-700' : 'text-slate-900'}>{t.type === 'income' ? '+' : '-'}{inr(t.amount)}</span>
                <button className="btn-ghost" onClick={() => edit(t)} aria-label="Edit"><Pencil size={14} /></button><button className="btn-ghost" onClick={() => del(t.id)} aria-label="Delete"><Trash2 size={14} /></button></div></li>))}</ul>}{filtered.length > shown && <button className="btn-ghost mt-2 w-full justify-center" onClick={() => setShown(shown + 50)}>Show more ({filtered.length - shown} remaining)</button>}</div>
    </div>
  )
}
