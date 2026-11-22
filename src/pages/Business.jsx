import { useState } from 'react'
import { inr } from '../lib/ai'
import Field from '../components/Field.jsx'
export default function Business() {
  const [g, setG] = useState({ amt: '10000', rate: '18', incl: false }); const [e, setE] = useState({ p: '500000', r: '11', y: '3' }); const [pl, setPl] = useState({ rev: '', cogs: '', opex: '' })
  const a = Number(g.amt) || 0, rt = Number(g.rate) / 100
  const base = g.incl ? a / (1 + rt) : a, gst = base * rt
  const mr = Number(e.r) / 1200, n = Number(e.y) * 12
  const emi = mr > 0 ? (Number(e.p) * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) : Number(e.p) / n
  const gp = Number(pl.rev) - Number(pl.cogs), np = gp - Number(pl.opex)
  const R = (l, v, b) => <div className={`flex justify-between text-sm ${b ? 'font-semibold' : ''}`}><span>{l}</span><span>{inr(v)}</span></div>
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Business Finance</h1>
      <div className="card text-sm text-slate-600">Simplified calculators for learning and quick estimates. They are not accounting or tax filing tools. Persistent business tracking is not built yet.</div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card space-y-3"><h3 className="font-semibold">GST calculator</h3><Field label="Amount (₹)" value={g.amt} onChange={(v) => setG({ ...g, amt: v })} />
          <div><label className="label">GST rate</label><select className="input" value={g.rate} onChange={(ev) => setG({ ...g, rate: ev.target.value })}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={g.incl} onChange={(ev) => setG({ ...g, incl: ev.target.checked })} />Amount already includes GST</label>
          {R('Base amount', base)}{R('GST total', gst)}{R('CGST / SGST (intra-state, each)', gst / 2)}{R('Invoice total', base + gst, true)}
          <p className="text-xs text-slate-500">Simplified: single rate, no cess, no input tax credit. Check current rates for your item.</p></div>
        <div className="card space-y-3"><h3 className="font-semibold">Business loan EMI</h3><Field label="Loan amount (₹)" value={e.p} onChange={(v) => setE({ ...e, p: v })} /><Field label="Annual interest (%)" value={e.r} onChange={(v) => setE({ ...e, r: v })} /><Field label="Tenure (years)" value={e.y} onChange={(v) => setE({ ...e, y: v })} />
          {R('Monthly EMI', emi, true)}{R('Total interest', emi * n - Number(e.p))}{R('Total payable', emi * n)}</div>
        <div className="card space-y-3"><h3 className="font-semibold">Profit & loss</h3><Field label="Revenue (₹)" value={pl.rev} onChange={(v) => setPl({ ...pl, rev: v })} /><Field label="Cost of goods (₹)" value={pl.cogs} onChange={(v) => setPl({ ...pl, cogs: v })} /><Field label="Operating expenses (₹)" value={pl.opex} onChange={(v) => setPl({ ...pl, opex: v })} />
          {R('Gross profit', gp)}{R('Net profit (before tax)', np, true)}{Number(pl.rev) > 0 && <div className="text-sm text-slate-600">Net margin: {((np / Number(pl.rev)) * 100).toFixed(1)}%</div>}</div>
      </div></div>
  )
}
