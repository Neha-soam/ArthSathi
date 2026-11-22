import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { ShieldCheck } from 'lucide-react'
import { describeDbError } from '../lib/dberror'
import { useToast } from './Toast.jsx'
import EmptyState from './EmptyState.jsx'
import { ListSkeleton } from './Skeleton.jsx'

const BADGE = { Low: 'bg-emerald-100 text-emerald-800', Medium: 'bg-amber-100 text-amber-800', High: 'bg-red-100 text-red-800' }
export default function ScamHistory({ refreshKey }) {
  const { user } = useAuth(), toast = useToast()
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [setup, setSetup] = useState(false)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('scam_checks').select('*').order('created_at', { ascending: false }).limit(50)
    if (error) { const missing = ['PGRST205', '42P01'].includes(error.code); setSetup(missing); setErr(missing ? '' : describeDbError(error)); setRows([]); return }
    setRows(data); setErr(''); setSetup(false)
  }, [])
  useEffect(() => { load() }, [load, refreshKey])
  async function remove(id) { const { error } = await supabase.from('scam_checks').delete().eq('id', id); if (error) return toast.error(describeDbError(error, 'delete')); toast.success('Check deleted'); load() }
  async function clearAll() {
    if (!confirm('Delete your entire scan history? This cannot be undone.')) return
    const { error } = await supabase.from('scam_checks').delete().eq('user_id', user.id); if (error) return toast.error(describeDbError(error, 'delete')); toast.success('History cleared'); load()
  }
  return (
    <div className="card"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Scan history</h3>
      {rows?.length > 0 && <button className="btn-ghost text-red-700" onClick={clearAll}><Trash2 size={14} />Clear all</button>}</div>
      {setup ? <p className="text-sm text-amber-800">Scan history needs a one-time database update. Run <code>supabase/phase4_scam_history.sql</code> in the Supabase SQL Editor, then reload.</p>
        : rows === null ? <ListSkeleton rows={2} />
        : rows.length === 0 ? <EmptyState icon={ShieldCheck} title="No saved checks yet">Check a message above and keep "save to history" ticked to see it here.</EmptyState>
        : <ul className="divide-y">{rows.map((r) => (<li key={r.id} className="flex items-start justify-between gap-3 py-2 text-sm">
            <div className="min-w-0"><div className="flex items-center gap-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[r.level]}`}>{r.level}</span><span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {r.score} pts</span></div>
              <p className="mt-1 break-words text-slate-700">{r.excerpt}</p></div>
            <button className="btn-ghost shrink-0" aria-label="Delete this check" onClick={() => remove(r.id)}><Trash2 size={14} /></button></li>))}</ul>}
      {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
      <p className="mt-3 text-xs text-slate-500">Only a short excerpt is stored, with numbers of 4+ digits and UPI IDs hidden. Only you can see it.</p>
    </div>
  )
}
