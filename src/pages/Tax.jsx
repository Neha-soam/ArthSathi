import { useState } from 'react'
import { inr } from '../lib/ai'
import { newRegime, oldRegime, TAX_YEAR } from '../lib/tax'
import Field from '../components/Field.jsx'
import AskAI from '../components/AskAI.jsx'
export default function Tax() {
  const [f, setF] = useState({ gross: '', d80c: '', d80d: '', hra: '', homeLoan: '', other: '' })
  const set = (k) => (v) => setF({ ...f, [k]: v })
  const run = Number(f.gross) > 0
  const nr = run && newRegime(f), or = run && oldRegime(f)
  const row = (l, v) => <div className="flex justify-between text-sm"><span className="text-slate-600">{l}</span><span>{inr(v)}</span></div>
  const card = (r, better) => (<div className={`card ${better ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}><div className="mb-2 flex justify-between"><h3 className="font-semibold">{r.regime} regime</h3>{better && <span className="rounded bg-brand-100 px-2 text-xs text-brand-700">Lower tax</span>}</div>
    {row('Standard deduction', r.stdDeduction)}{r.regime === 'Old' && row('Other deductions', r.deductions)}{row('Taxable income', r.taxable)}{row('Tax on slabs', r.slabTax)}{row('Rebate (87A / marginal relief)', -(r.slabTax - (r.total / 1.04)))}{row('Cess (4%)', r.cess)}
    <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Estimated tax</span><span>{inr(r.total)}</span></div></div>)
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Tax Assistant</h1>
      <div className="card text-sm text-slate-700"><b>Assumptions:</b> {TAX_YEAR}; resident individual under 60; salary income only; no surcharge, capital gains or other special income. Slabs are based on public sources and not an official filing tool. Verify at incometax.gov.in or with a CA before filing.</div>
      <div className="card grid gap-3 sm:grid-cols-3">
        <Field label="Annual gross salary (₹)" value={f.gross} onChange={set('gross')} />
        <Field label="80C investments (₹)" value={f.d80c} onChange={set('d80c')} hint="Old regime only. Capped at ₹1,50,000" />
        <Field label="80D health insurance (₹)" value={f.d80d} onChange={set('d80d')} hint="Old regime only" />
        <Field label="HRA exemption (₹)" value={f.hra} onChange={set('hra')} hint="Old regime only. Enter the exempt amount you computed" />
        <Field label="Home loan interest (₹)" value={f.homeLoan} onChange={set('homeLoan')} hint="Old regime. Capped at ₹2,00,000" />
        <Field label="Other deductions (₹)" value={f.other} onChange={set('other')} hint="e.g. 80CCD(1B) NPS, 80E" />
      </div>
      {run ? <div className="grid gap-4 md:grid-cols-2">{card(nr, nr.total <= or.total)}{card(or, or.total < nr.total)}</div> : <p className="text-center text-sm text-slate-500">Enter your gross salary to compare both regimes.</p>}
      <AskAI topic="tax" placeholder="e.g. What is Section 80C?" />
    </div>
  )
}
