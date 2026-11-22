import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Star, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { buildMarket, dayChangePct, DEMO_SOURCE, RANGES, rangeStats, sliceRange } from '../lib/demoMarket'
import { computePortfolio, STARTING_CASH, validateTrade } from '../lib/portfolio'
import { localDateString } from '../lib/dates'
import { inr } from '../lib/format'
import { describeDbError } from '../lib/dberror'
import { useToast } from '../components/Toast.jsx'
import { ListSkeleton } from '../components/Skeleton.jsx'

const GLOSSARY = [['Index (Nifty 50, Sensex)', 'A basket of large listed companies that shows the overall direction of the market.'], ['Market cap', 'Share price × number of shares. Used to group companies as large, mid or small.'], ['P/E ratio', 'Share price divided by earnings per share. A rough idea of how expensive a stock is relative to its profit.'],
  ['Volatility', 'How sharply a price moves up and down. Higher volatility means bigger short-term swings.'], ['Drawdown', 'The fall from a previous peak to a later low. It shows how bad a rough patch got.'], ['Diversification', 'Spreading money across different assets so one bad outcome hurts less.'], ['Bull / bear market', 'A sustained period of rising / falling prices.']]
const Chg = ({ v }) => (v == null ? <span className="text-slate-400">—</span> : <span className={v >= 0 ? 'text-emerald-700' : 'text-red-600'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>)
const Stat = ({ l, v, sub }) => (<div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold">{v}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div>)
const price = (market, s) => market[s]?.series.at(-1).close ?? null

function Markets({ market, watched, toggle, lastDate, stamp }) {
  const [sel, setSel] = useState('DEMO-IDX'); const [range, setRange] = useState('1Y')
  const inst = market[sel], data = sliceRange(inst.series, range), st = rangeStats(data)
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">{Object.values(market).map((m) => (
        <div key={m.symbol} className={`card flex items-center justify-between gap-2 p-3 ${sel === m.symbol ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}>
          <button className="min-w-0 flex-1 text-left" onClick={() => setSel(m.symbol)}><div className="truncate font-medium">{m.name}</div><div className="text-xs text-slate-500">{m.symbol} · {m.type}</div></button>
          <div className="text-right text-sm"><div>{inr(price(market, m.symbol))}</div><div className="text-xs"><Chg v={dayChangePct(m.series)} /></div></div>
          <button className="btn-ghost" aria-label={watched.has(m.symbol) ? `Remove ${m.symbol} from watchlist` : `Add ${m.symbol} to watchlist`} onClick={() => toggle(m.symbol)}><Star size={16} className={watched.has(m.symbol) ? 'fill-amber-400 text-amber-500' : 'text-slate-400'} /></button></div>))}</div>
      <div className="card space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{inst.name} <span className="text-xs font-normal text-slate-500">(simulated)</span></h3>
        <div className="flex gap-1">{Object.keys(RANGES).map((k) => <button key={k} onClick={() => setRange(k)} className={`rounded px-2 py-1 text-xs ${range === k ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>{k}</button>)}</div></div>
        <ResponsiveContainer width="100%" height={240}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} minTickGap={40} tickFormatter={(d) => d.slice(2, 7)} /><YAxis fontSize={11} domain={['auto', 'auto']} width={48} /><Tooltip formatter={(v) => [inr(v), 'Simulated price']} /><Line type="monotone" dataKey="close" stroke="#059669" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
        {st && <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat l={`Change (${range})`} v={<Chg v={st.changePct} />} /><Stat l="High" v={inr(st.high)} /><Stat l="Low" v={inr(st.low)} /><Stat l="Worst fall from a peak" v={`${st.maxDrawdownPct.toFixed(1)}%`} /><Stat l="Volatility" v={`${st.volatilityPct.toFixed(1)}%`} sub="yearly, from daily moves" /></div>}
        <p className="text-xs text-slate-500">Data source: {DEMO_SOURCE.name}. <b>Not real market prices.</b> Simulated through {lastDate}. Page generated {stamp}. Past simulated movement says nothing about the future.</p></div>
    </div>
  )
}
function Watchlist({ market, watch, reload, uid, setErr }) {
  const [sym, setSym] = useState(''); const [msg, setMsg] = useState('')
  async function add(e) {
    e.preventDefault(); setMsg('')
    const s = sym.trim().toUpperCase()
    if (!/^[A-Z0-9.&-]{1,20}$/.test(s)) return setMsg('Use letters and numbers only, up to 20 characters.')
    const { error } = await supabase.from('watchlists').insert({ user_id: uid, symbol: s })
    if (error) return setMsg(error.code === '23505' ? 'Already in your watchlist.' : describeDbError(error, 'save'))
    setSym(''); reload()
  }
  async function remove(id) { const { error } = await supabase.from('watchlists').delete().eq('id', id); error ? setErr(describeDbError(error, 'delete')) : reload() }
  return (
    <div className="card"><h3 className="mb-2 font-semibold">My watchlist</h3>
      <form onSubmit={add} className="mb-3 flex gap-2"><input aria-label="Symbol to add" className="input" placeholder="e.g. DEMO-TECH or any symbol" value={sym} onChange={(e) => setSym(e.target.value)} maxLength={20} /><button className="btn">Add</button></form>
      {msg && <p className="mb-2 text-sm text-red-600" role="alert">{msg}</p>}
      {watch.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">Your watchlist is empty. Tap the star on an instrument in Markets, or add a symbol above.</p> :
        <ul className="divide-y">{watch.map((w) => { const m = market[w.symbol]; return (
          <li key={w.id} className="flex items-center justify-between py-2 text-sm"><div><div className="font-medium">{w.symbol}</div><div className="text-xs text-slate-500">{m ? m.name : 'No price data: no market feed is connected for real symbols.'}</div></div>
            <div className="flex items-center gap-3">{m && <div className="text-right"><div>{inr(price(market, w.symbol))}</div><div className="text-xs"><Chg v={dayChangePct(m.series)} /></div></div>}<button className="btn-ghost" aria-label={`Remove ${w.symbol}`} onClick={() => remove(w.id)}><Trash2 size={14} /></button></div></li>) })}</ul>}
    </div>
  )
}
function Paper({ market, uid }) {
  const toast = useToast()
  const [trades, setTrades] = useState(null); const [setup, setSetup] = useState(false); const [err, setErr] = useState('')
  const [f, setF] = useState({ symbol: 'DEMO-IDX', side: 'buy', quantity: '' })
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('paper_trades').select('*').order('created_at', { ascending: true }).limit(2000)
    if (error) { const miss = ['PGRST205', '42P01'].includes(error.code); setSetup(miss); setErr(miss ? '' : describeDbError(error)); setTrades([]); return }
    setTrades(data); setSetup(false)
  }, [])
  useEffect(() => { load() }, [load])
  const pf = computePortfolio(trades || [], (s) => price(market, s)), px = price(market, f.symbol), qty = Number(f.quantity)
  async function submit(e) {
    e.preventDefault(); setErr('')
    const v = validateTrade(trades || [], f, px); if (v) return setErr(v)
    const { error } = await supabase.from('paper_trades').insert({ user_id: uid, symbol: f.symbol, side: f.side, quantity: qty, price: px })
    if (error) { console.error(error); return setErr(describeDbError(error, 'save')) }
    toast.success(`${f.side === 'buy' ? 'Bought' : 'Sold'} ${qty} × ${f.symbol} at ${inr(px)} (simulated)`); setF({ ...f, quantity: '' }); load()
  }
  async function reset() { if (!confirm('Reset your paper portfolio? All simulated trades will be deleted.')) return; const { error } = await supabase.from('paper_trades').delete().eq('user_id', uid); if (error) return setErr(describeDbError(error, 'delete')); toast.success('Paper portfolio reset'); load() }
  if (setup) return <div className="card text-sm text-amber-800">Paper trading needs a one-time database update. Run <code>supabase/phase5_paper_trades.sql</code> in the Supabase SQL Editor, then reload.</div>
  if (trades === null) return <ListSkeleton rows={4} />
  return (
    <div className="space-y-4"><div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">Paper trading uses <b>virtual money and simulated prices</b>. No real money or real market is involved. Brokerage, taxes and fees are not modelled.</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat l="Virtual cash" v={inr(pf.cash)} /><Stat l="Holdings value" v={inr(pf.holdingsValue)} /><Stat l="Total value" v={inr(pf.totalValue)} /><Stat l="Profit / loss" v={<span className={pf.totalPnl >= 0 ? 'text-emerald-700' : 'text-red-600'}>{inr(pf.totalPnl)}</span>} sub={`vs ${inr(STARTING_CASH)} start`} /><Stat l="Realised profit / loss" v={inr(pf.realized)} /></div>
      <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-5"><div><label htmlFor="ps" className="label">Instrument</label><select id="ps" className="input" value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })}>{Object.values(market).map((m) => <option key={m.symbol} value={m.symbol}>{m.symbol}</option>)}</select></div>
        <div><label htmlFor="pd" className="label">Side</label><select id="pd" className="input" value={f.side} onChange={(e) => setF({ ...f, side: e.target.value })}><option value="buy">Buy</option><option value="sell">Sell</option></select></div>
        <div><label htmlFor="pq" className="label">Quantity</label><input id="pq" className="input" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
        <div className="text-sm"><div className="label">Simulated price</div><div className="py-2">{inr(px)}{qty > 0 && <div className="text-xs text-slate-500">Total {inr(qty * px)}</div>}</div></div>
        <div className="flex items-end"><button className="btn w-full">{f.side === 'buy' ? 'Buy' : 'Sell'}</button></div>{err && <p className="text-sm text-red-600 sm:col-span-5" role="alert">{err}</p>}</form>
      <div className="card"><h3 className="mb-2 font-semibold">Holdings</h3>
        {pf.holdings.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">No holdings yet. Place a simulated buy above.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-1">Instrument</th><th>Qty</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P/L</th></tr></thead><tbody className="divide-y">{pf.holdings.map((h) => <tr key={h.symbol}><td className="py-1.5 font-medium">{h.symbol}</td><td>{h.qty}</td><td>{inr(h.avgCost)}</td><td>{inr(h.price)}</td><td>{inr(h.value)}</td><td className={h.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}>{inr(h.pnl)} ({h.pnlPct}%)</td></tr>)}</tbody></table></div>}</div>
      <div className="card"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Trade history</h3>{trades.length > 0 && <button className="btn-ghost text-red-700" onClick={reset}><Trash2 size={14} />Reset portfolio</button>}</div>
        {trades.length === 0 ? <p className="text-sm text-slate-500">No trades yet.</p> : <ul className="divide-y text-sm">{[...trades].reverse().slice(0, 20).map((t) => <li key={t.id} className="flex justify-between py-1.5"><span>{t.side === 'buy' ? 'Bought' : 'Sold'} {t.quantity} × {t.symbol}</span><span className="text-slate-600">{inr(t.price)} · {new Date(t.created_at).toLocaleDateString('en-IN')}</span></li>)}</ul>}</div>
    </div>
  )
}
const TABS = [['markets', 'Markets'], ['watch', 'Watchlist'], ['paper', 'Paper trading'], ['learn', 'Learn']]
export default function Market() {
  const { user } = useAuth(), toast = useToast()
  const today = localDateString(); const market = useMemo(() => buildMarket(today), [today])
  const stamp = useMemo(() => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), [])
  const lastDate = market['DEMO-IDX'].series.at(-1).date
  const [tab, setTab] = useState('markets'); const [watch, setWatch] = useState([]); const [err, setErr] = useState('')
  const load = useCallback(async () => { const { data, error } = await supabase.from('watchlists').select('*').order('symbol'); if (error) return setErr(describeDbError(error)); setWatch(data); setErr('') }, [])
  useEffect(() => { load() }, [load])
  const watched = new Set(watch.map((w) => w.symbol))
  async function toggle(sym) {
    const row = watch.find((w) => w.symbol === sym)
    const { error } = row ? await supabase.from('watchlists').delete().eq('id', row.id) : await supabase.from('watchlists').insert({ user_id: user.id, symbol: sym })
    if (error) return setErr(describeDbError(error, 'save'))
    toast.success(row ? `${sym} removed from watchlist` : `${sym} added to watchlist`); load()
  }
  return (
    <div className="space-y-4"><h1 className="page-title">Market Insights</h1>
      <div className="card border-red-200 bg-red-50 text-sm text-red-900"><b>Demo data only.</b> No live or historical market feed is connected. Every price here is simulated for learning, uses fictional instruments, and is not real. Educational only; no real-money trading.</div>
      <div role="tablist" className="flex flex-wrap gap-2">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{l}</button>)}</div>
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      {tab === 'markets' && <Markets market={market} watched={watched} toggle={toggle} lastDate={lastDate} stamp={stamp} />}
      {tab === 'watch' && <Watchlist market={market} watch={watch} reload={load} uid={user.id} setErr={setErr} />}
      {tab === 'paper' && <Paper market={market} uid={user.id} />}
      {tab === 'learn' && <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2">{GLOSSARY.map(([t, d]) => <div key={t} className="card"><h3 className="font-semibold">{t}</h3><p className="text-sm text-slate-600">{d}</p></div>)}</div>
        <div className="card text-sm"><h3 className="mb-1 font-semibold">How to read a price chart</h3><ul className="list-disc space-y-1 pl-5 text-slate-700"><li>A rising line shows the price went up over the period you picked. It does not show why, and it does not predict what happens next.</li><li>Compare different time ranges. A 1-month rise can sit inside a 1-year fall.</li><li>A large "worst fall from a peak" means the investment has had deep drops.</li><li>Higher volatility means bigger swings in both directions.</li></ul></div></div>}
    </div>
  )
}
