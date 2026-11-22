import { useState } from 'react'
import { inr } from '../lib/format'
import { CAPS, hraExemption, newRegime, oldRegime, TAX_YEAR, validateTaxInputs } from '../lib/tax'
import Field from '../components/Field.jsx'
import AskAI from '../components/AskAI.jsx'

const pct = (r) => `${Math.round(r * 1000) / 10}%`
function RegimeCard({ r, better }) {
  const row = (l, v, cls = '') => <div className={`flex justify-between gap-3 text-sm ${cls}`}><span className="text-slate-600">{l}</span><span className="shrink-0">{v}</span></div>
  return (
    <div className={`card space-y-2 ${better ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}>
      <div className="flex items-center justify-between"><h3 className="font-semibold">{r.regime} regime</h3>{better && <span className="rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-700">Lower tax</span>}</div>
      <div className="space-y-1 border-b pb-2">{row('Gross salary', inr(r.gross))}{row('Standard deduction', `-${inr(r.stdDeduction)}`)}
        {r.deductionRows.map((d) => <div key={d.label}>{row(d.label, `-${inr(d.allowed)}`)}{d.capped && <p className="text-xs text-amber-700">You entered {inr(d.claimed)}; the limit of {inr(d.cap)} was applied.</p>}</div>)}
        {row('Taxable income', inr(r.taxable), 'font-semibold')}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[300px] text-left text-xs"><thead className="text-slate-500"><tr><th className="py-1">Slab</th><th>Rate</th><th className="text-right">Amount</th><th className="text-right">Tax</th></tr></thead>
        <tbody className="divide-y">{r.slabRows.length === 0 && <tr><td colSpan={4} className="py-2 text-slate-500">No taxable income.</td></tr>}
          {r.slabRows.map((s, i) => <tr key={i}><td className="py-1">{inr(s.from)} to {s.to === Infinity ? 'above' : inr(s.to)}</td><td>{pct(s.rate)}</td><td className="text-right">{inr(s.amount)}</td><td className="text-right">{inr(s.tax)}</td></tr>)}</tbody></table></div>
      <div className="space-y-1 border-t pt-2">{row('Tax on slabs', inr(r.slabTax))}{r.rebate > 0 && row('Rebate (Section 87A)', `-${inr(r.rebate)}`)}{r.relief > 0 && row('Marginal relief', `-${inr(r.relief)}`)}{row('Health & education cess (4%)', inr(r.cess))}
        {row('Estimated tax', inr(r.total), 'border-t pt-1 font-semibold')}{row('Effective rate on gross salary', `${r.effectiveRate.toFixed(1)}%`)}</div>
      {r.surchargeWarning && <p className="text-xs text-amber-800">Taxable income is above ₹50 lakh, where surcharge applies. It is not included here, so the real tax will be higher.</p>}
    </div>
  )
}
const EXPLAIN = [
  ['Standard deduction', 'Both regimes', 'A flat deduction from salary income: ₹75,000 in the new regime, ₹50,000 in the old.'],
  ['Section 80C', 'Old regime only', `Investments and payments such as PPF, ELSS, life insurance premiums, tuition fees and home loan principal. Limit ₹${CAPS.d80c.toLocaleString('en-IN')} a year.`],
  ['NPS extra, 80CCD(1B)', 'Old regime only', `Your own additional NPS contribution, up to ₹${CAPS.d80ccd1b.toLocaleString('en-IN')} over the 80C limit.`],
  ['Health insurance, Section 80D', 'Old regime only', 'Premiums for you and family up to ₹25,000 (₹50,000 if you or your spouse are senior citizens), plus up to ₹25,000 for parents (₹50,000 if they are senior citizens).'],
  ['HRA exemption', 'Old regime only', 'For salaried people who pay rent. It is the least of: HRA received, rent paid minus 10% of basic salary, and 50% or 40% of basic salary depending on the city category set by the rules.'],
  ['Home loan interest, Section 24(b)', 'Old regime only', `Interest on a loan for a self-occupied home, up to ₹${CAPS.home.toLocaleString('en-IN')} a year.`],
  ['Employer NPS, 80CCD(2)', 'Both regimes', 'Your employer’s NPS contribution is deductible within limits even in the new regime. It is not modelled in this calculator.'],
]
export default function Tax() {
  const [f, setF] = useState({ gross: '', age: 'below60', parentsSenior: false, d80c: '', d80ccd1b: '', d80dSelf: '', d80dParents: '', hra: '', homeLoan: '', other: '' })
  const [h, setH] = useState({ basic: '', hraReceived: '', rent: '', metro: true }); const [showHra, setShowHra] = useState(false)
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const touched = f.gross !== ''
  const err = touched ? validateTaxInputs(f) : null
  const ok = touched && !err
  const nr = ok && newRegime(f), or = ok && oldRegime(f)
  const diff = ok ? or.total - nr.total : 0
  const hraRes = hraExemption({ basic: h.basic, hraReceived: h.hraReceived, rentPaid: h.rent, metro: h.metro })
  return (
    <div className="space-y-6"><h1 className="page-title">Tax Assistant</h1>
      <div className="card text-sm text-slate-700"><b>Educational estimate, not tax filing advice.</b> Applies to <b>{TAX_YEAR}</b>: resident individual, salary income only. Not included: surcharge, capital gains, other income, employer NPS and senior-citizen special rules. Rules were checked against public sources in November 2026, not an official calculator. Confirm on the official Income Tax portal (incometax.gov.in) or with a Chartered Accountant before filing.</div>

      <div className="card grid gap-3 sm:grid-cols-3">
        <Field label="Annual gross salary (₹)" value={f.gross} onChange={set('gross')} />
        <div><label htmlFor="age" className="label">Your age</label><select id="age" className="input" value={f.age} onChange={(e) => set('age')(e.target.value)}><option value="below60">Below 60</option><option value="60to79">60 to 79</option><option value="80plus">80 or above</option></select><p className="mt-1 text-xs text-slate-500">Affects old-regime slabs and the 80D limit</p></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.parentsSenior} onChange={(e) => set('parentsSenior')(e.target.checked)} />Parents are senior citizens (80D)</label>
        <Field label="80C investments (₹)" value={f.d80c} onChange={set('d80c')} hint={`Old regime. Limit ₹${CAPS.d80c.toLocaleString('en-IN')}`} />
        <Field label="NPS extra, 80CCD(1B) (₹)" value={f.d80ccd1b} onChange={set('d80ccd1b')} hint={`Old regime. Limit ₹${CAPS.d80ccd1b.toLocaleString('en-IN')}`} />
        <Field label="Health insurance, self/family (₹)" value={f.d80dSelf} onChange={set('d80dSelf')} hint="Old regime. Limit ₹25,000 (₹50,000 if senior)" />
        <Field label="Health insurance, parents (₹)" value={f.d80dParents} onChange={set('d80dParents')} hint="Old regime. Limit ₹25,000 (₹50,000 if senior)" />
        <Field label="Home loan interest (₹)" value={f.homeLoan} onChange={set('homeLoan')} hint={`Old regime. Limit ₹${CAPS.home.toLocaleString('en-IN')}`} />
        <Field label="HRA exemption (₹)" value={f.hra} onChange={set('hra')} hint="Old regime. Not sure? Use the helper below" />
        <Field label="Other deductions (₹)" value={f.other} onChange={set('other')} hint="Old regime, not capped here. Enter only what you are sure applies (e.g. education loan interest)" />
        <div className="sm:col-span-3"><button type="button" className="btn-ghost border border-slate-200" onClick={() => setShowHra((s) => !s)}>{showHra ? 'Hide' : 'Show'} HRA helper</button>
          {showHra && <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4"><Field label="Basic salary + DA, yearly (₹)" value={h.basic} onChange={(x) => setH({ ...h, basic: x })} /><Field label="HRA received, yearly (₹)" value={h.hraReceived} onChange={(x) => setH({ ...h, hraReceived: x })} /><Field label="Rent paid, yearly (₹)" value={h.rent} onChange={(x) => setH({ ...h, rent: x })} />
            <div><label htmlFor="metro" className="label">City category</label><select id="metro" className="input" value={h.metro ? '50' : '40'} onChange={(e) => setH({ ...h, metro: e.target.value === '50' })}><option value="50">50% of basic (metro)</option><option value="40">40% of basic (other)</option></select><p className="mt-1 text-xs text-slate-500">Which cities count as metro is set by the tax rules. Check the current list.</p></div>
            <div className="flex items-center gap-3 sm:col-span-4"><span className="text-sm">Estimated HRA exemption: <b>{inr(hraRes.exempt)}</b></span><button type="button" className="btn" onClick={() => set('hra')(String(hraRes.exempt))}>Use this amount</button></div></div>}</div>
      </div>

      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      {!touched && <div className="card py-8 text-center text-sm text-slate-500">Enter your gross salary to compare the old and new regimes.</div>}
      {ok && <>
        <div className="card text-sm">{diff === 0 ? 'Both regimes give the same estimated tax.' : <>The <b>{diff > 0 ? 'new' : 'old'} regime</b> gives lower estimated tax by <b>{inr(Math.abs(diff))}</b> with the numbers you entered.</>} This compares only what you typed here; your actual best choice depends on your full situation.</div>
        <div className="grid gap-4 md:grid-cols-2"><RegimeCard r={nr} better={nr.total <= or.total} /><RegimeCard r={or} better={or.total < nr.total} /></div></>}

      <div className="card"><h3 className="mb-2 font-semibold">Common deductions and exemptions</h3>
        <ul className="divide-y">{EXPLAIN.map(([t, who, d]) => <li key={t}><details className="py-2 text-sm"><summary className="cursor-pointer font-medium">{t} <span className="ml-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">{who}</span></summary><p className="mt-1 text-slate-600">{d}</p></details></li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">From 1 April 2026 the Income-tax Act, 2025 replaces the 1961 Act, and section numbers changed (publications report, for example, 80C becoming section 123 and 80D becoming section 126). The rules and slabs above are unchanged for FY 2026-27. Check the official section mapping before you file.</p></div>

      <AskAI topic="tax" placeholder="e.g. Which regime suits someone who pays rent and has a home loan?" />
    </div>
  )
}
