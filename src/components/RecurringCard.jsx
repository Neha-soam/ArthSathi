import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, Repeat, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { CATEGORIES } from '../lib/ai'
import { inr } from '../lib/format'
import { describeDbError } from '../lib/dberror'
import { localDateString } from '../lib/dates'
import { generateRecurring } from '../lib/recurringDb'
import { useToast } from './Toast.jsx'

const blank = { type: 'expense', amount: '', category: 'Bills', day: '1', note: '' }
export default function RecurringCard({ onChanged }) {
  const { user } = useAuth(), toast = useToast()
  const [rules, setRules] = useState([]); const [f, setF] = useState(blank); const [err, setErr] = useState(''); const [setup, setSetup] = useState(false); const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('recurring_rules').select('*').order('created_at')
    if (error) { console.warn(error); setSetup(['PGRST205', '42P01'].includes(error.code)); if (!['PGRST205', '42P01'].includes(error.code)) setErr(describeDbError(error)); return }
    setRules(data)
  }, [])
  useEffect(() => { load() }, [load])
  async function add(e) {
    e.preventDefault(); setErr('')
    const amount = Number(f.amount), day = Number(f.day)
    if (!(amount > 0) || amount >= 1e9) return setErr('Enter an amount above 0.')
    if (!Number.isInteger(day) || day < 1 || day > 31) return setErr('Day of month must be between 1 and 31.')
    setBusy(true)
    const { error } = await supabase.from('recurring_rules').insert({ user_id: user.id, type: f.type, amount, category: f.category, note: f.note.trim() || null, day_of_month: day, start_date: localDateString() })
    if (error) { setBusy(false); console.error(error); return setErr(describeDbError(error, 'save')) }
    setF(blank); await generateRecurring(user.id, true); setBusy(false); toast.success('Recurring transaction added'); await load(); onChanged()
  }
  async function toggle(r) { await supabase.from('recurring_rules').update({ active: !r.active }).eq('id', r.id); await load() }
  async function remove(r) {
    if (!confirm('Delete this recurring rule? Transactions it already created will stay.')) return
    const { error } = await supabase.from('recurring_rules').delete().eq('id', r.id)
    if (error) return setErr(describeDbError(error, 'delete'))
    toast.success('Recurring rule deleted'); await load(); onChanged()
  }
  return (
    <div className="card"><h3 className="mb-1 flex items-center gap-2 font-semibold"><Repeat size={16} className="text-brand-600" />Recurring transactions</h3>
      <p className="mb-3 text-xs text-slate-500">Rent, subscriptions, SIP-like bills or salary. They are added automatically each month when you open ArthSathi.</p>
      {setup ? <p className="text-sm text-amber-800">Recurring transactions need a one-time database update. Run <code>supabase/phase3_recurring.sql</code> in the Supabase SQL Editor, then reload.</p> : <>
        <form onSubmit={add} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <select aria-label="Type" className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, category: e.target.value === 'income' ? 'Salary' : 'Bills' })}><option value="expense">Expense</option><option value="income">Income</option></select>
          <input aria-label="Amount" className="input" placeholder="Amount ₹" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <select aria-label="Category" className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{(f.type === 'income' ? ['Salary', 'Other'] : CATEGORIES).map((c) => <option key={c}>{c}</option>)}</select>
          <input aria-label="Day of month" className="input" type="number" min="1" max="31" placeholder="Day" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} />
          <input aria-label="Note" className="input col-span-2" maxLength={200} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className="btn col-span-2 sm:col-span-6 sm:justify-self-start" disabled={busy}>{busy ? 'Saving…' : 'Add recurring'}</button></form>
        {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
        {rules.length === 0 ? <p className="mt-3 text-sm text-slate-500">No recurring transactions yet.</p> :
          <ul className="mt-3 divide-y">{rules.map((r) => (<li key={r.id} className={`flex items-center justify-between py-2 text-sm ${r.active ? '' : 'opacity-50'}`}>
            <div><div className="font-medium">{r.type === 'income' ? '+' : '-'}{inr(r.amount)} · {r.category}{r.note ? ` · ${r.note}` : ''}</div><div className="text-xs text-slate-500">Day {r.day_of_month} of every month{r.active ? '' : ' (paused)'}</div></div>
            <div className="flex"><button className="btn-ghost" onClick={() => toggle(r)} aria-label={r.active ? 'Pause' : 'Resume'}>{r.active ? <Pause size={14} /> : <Play size={14} />}</button><button className="btn-ghost" onClick={() => remove(r)} aria-label="Delete rule"><Trash2 size={14} /></button></div></li>))}</ul>}</>}
    </div>
  )
}
