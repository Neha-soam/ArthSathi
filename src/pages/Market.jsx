import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
const TERMS = [['Nifty 50 / Sensex', 'Indices tracking 50 / 30 large listed companies. They indicate overall market direction.'], ['Market cap', 'Share price × number of shares. Used to classify large, mid and small caps.'], ['P/E ratio', 'Price divided by earnings per share. A rough measure of how expensive a stock is relative to profit.'], ['Volatility', 'How sharply prices move up and down. Higher volatility means higher short-term risk.'], ['Diversification', 'Spreading money across different assets so one bad outcome hurts less.'], ['Bull / Bear market', 'A sustained period of rising / falling prices.']]
export default function Market() {
  const [list, setList] = useState([]); const [sym, setSym] = useState(''); const [err, setErr] = useState('')
  const load = async () => { const { data } = await supabase.from('watchlists').select('*').order('symbol'); setList(data || []) }
  useEffect(() => { load() }, [])
  async function add(e) {
    e.preventDefault(); setErr('')
    const s = sym.trim().toUpperCase()
    if (!/^[A-Z0-9.&-]{1,20}$/.test(s)) return setErr('Use letters/numbers only, up to 20 characters.')
    const { error } = await supabase.from('watchlists').insert({ symbol: s })
    if (error) return setErr(error.code === '23505' ? 'Already in your watchlist.' : 'Could not add.')
    setSym(''); load()
  }
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Market Insights</h1>
      <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900"><b>No market data feed is connected.</b> No live or historical prices are shown, so nothing here is presented as market data. Educational only; no real-money trading.</div>
      <div className="card"><h3 className="mb-2 font-semibold">My watchlist (symbols only)</h3>
        <form onSubmit={add} className="mb-3 flex gap-2"><input className="input" placeholder="e.g. TCS, RELIANCE" value={sym} onChange={(e) => setSym(e.target.value)} maxLength={20} /><button className="btn">Add</button></form>
        {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
        {list.length === 0 ? <p className="text-sm text-slate-500">Your watchlist is empty.</p> : <ul className="divide-y">{list.map((w) => <li key={w.id} className="flex justify-between py-2 text-sm"><span>{w.symbol}</span><button className="btn-ghost" aria-label="Remove" onClick={async () => { await supabase.from('watchlists').delete().eq('id', w.id); load() }}><Trash2 size={14} /></button></li>)}</ul>}</div>
      <div className="grid gap-3 md:grid-cols-2">{TERMS.map(([t, d]) => <div key={t} className="card"><h3 className="font-semibold">{t}</h3><p className="text-sm text-slate-600">{d}</p></div>)}</div>
    </div>
  )
}
