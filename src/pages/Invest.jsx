import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { inr } from '../lib/format'
import { lumpProjection, rateWarning, rdProjection, realValue, sipProjection, validateInvest } from '../lib/invest'
import Field from '../components/Field.jsx'
import AskAI from '../components/AskAI.jsx'

const PRODUCTS = [
  { name: 'Fixed Deposit (FD)', risk: 1, returns: 'Fixed, agreed in advance', liquidity: 'Medium (early exit usually has a penalty)', horizon: 'Months to years', what: 'You lock a lump sum with a bank for a set period at an agreed interest rate.', watch: 'Interest is taxable and may not beat inflation. Deposit insurance covers only up to a limit, so check the current one.' },
  { name: 'Recurring Deposit (RD)', risk: 1, returns: 'Fixed, agreed in advance', liquidity: 'Medium', horizon: 'Months to a few years', what: 'You deposit a fixed amount every month for a fixed term and earn interest at an agreed rate.', watch: 'Missed instalments can attract penalties. Returns are modest and interest is taxable.' },
  { name: 'SIP (a method, not a product)', risk: 3, returns: 'Depends on the fund you pick', liquidity: 'High (open-ended funds)', horizon: 'Usually 5+ years for equity funds', what: 'A Systematic Investment Plan puts a fixed amount into a mutual fund at regular intervals, so you buy at many different prices.', watch: 'A SIP does not remove risk or guarantee profit. If the fund falls, your SIP value falls too.' },
  { name: 'Mutual Fund', risk: 3, returns: 'Market-linked, not guaranteed', liquidity: 'High (check exit load)', horizon: 'Depends on type', what: 'A professionally managed pool of money invested in shares, bonds or both. Risk depends on what the fund holds.', watch: 'Check the fund’s riskometer, expense ratio and past performance across market ups and downs.' },
  { name: 'Index Fund', risk: 4, returns: 'Market-linked, not guaranteed', liquidity: 'High', horizon: '5+ years is typical guidance', what: 'A fund that simply copies an index such as the Nifty 50, so it holds many companies at low cost.', watch: 'It rises and falls with the index. It can lose value for years. Small tracking differences from the index are normal.' },
  { name: 'Bonds', risk: 2, returns: 'Interest agreed, price can vary', liquidity: 'Varies', horizon: 'Until maturity', what: 'You lend money to a government or company and receive interest. You get the face value back at maturity if the issuer pays.', watch: 'The issuer can default, and bond prices fall when interest rates rise. Check the credit rating.' },
  { name: 'Stocks', risk: 5, returns: 'Market-linked, not guaranteed', liquidity: 'High, but the price may be low when you sell', horizon: 'Long term', what: 'Part-ownership of one company. Its price depends on the company’s results and on market mood.', watch: 'One company can fall sharply or fail. Prices swing daily. Only money you can leave invested for years belongs here.' },
]
const LABEL = ['', 'Low', 'Low to medium', 'Medium', 'Medium to high', 'High']
const Dots = ({ n }) => (<span aria-label={`Risk: ${LABEL[n]}`} className="text-brand-600">{'●'.repeat(n)}<span className="text-slate-300">{'●'.repeat(5 - n)}</span></span>)
const Stat = ({ l, v, sub }) => (<div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold">{v}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div>)
const TABS = [['sip', 'SIP'], ['lump', 'Lump sum / FD'], ['rd', 'RD']]

export default function Invest() {
  const [tab, setTab] = useState('sip')
  const [sip, setSip] = useState({ monthly: '5000', annualRate: '12', years: '10', stepUpPct: '0' })
  const [lump, setLump] = useState({ principal: '100000', annualRate: '7', years: '5', perYear: '4' })
  const [rd, setRd] = useState({ monthly: '2000', annualRate: '6.5', months: '24' })
  const [infl, setInfl] = useState('6')
  const v = tab === 'sip' ? sip : tab === 'lump' ? lump : rd
  const set = (k) => (x) => (tab === 'sip' ? setSip : tab === 'lump' ? setLump : setRd)((p) => ({ ...p, [k]: x }))
  const err = validateInvest({ ...v, inflation: infl })
  let res = null, years = 0
  if (!err) {
    if (tab === 'sip') { res = sipProjection({ monthly: +sip.monthly, annualRate: +sip.annualRate, years: +sip.years, stepUpPct: +sip.stepUpPct }); years = +sip.years }
    else if (tab === 'lump') { res = lumpProjection({ principal: +lump.principal, annualRate: +lump.annualRate, years: +lump.years, perYear: +lump.perYear }); years = +lump.years }
    else { res = rdProjection({ monthly: +rd.monthly, annualRate: +rd.annualRate, months: +rd.months }); years = +rd.months / 12 }
  }
  const assumption = tab === 'sip' ? 'Monthly compounding, with each instalment invested at the start of the month. Step-up raises the instalment once a year. No fees, exit loads or taxes.'
    : tab === 'lump' ? `Interest added ${lump.perYear} time(s) a year at a constant rate. No taxes. For a real FD, the bank’s own rate and method decide the maturity amount.`
    : 'Interest compounded quarterly on each monthly deposit. Banks’ methods vary slightly, so your bank’s figure may differ. No taxes.'
  return (
    <div className="space-y-6"><h1 className="page-title">Investment Learning Guide</h1>
      <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">Educational information only. This is not personalised investment advice, and nothing here promises returns. ArthSathi is not SEBI-registered.</div>

      <div className="grid gap-3 md:grid-cols-2">{PRODUCTS.map((p) => (
        <div key={p.name} className="card text-sm"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{p.name}</h3><Dots n={p.risk} /></div>
          <p className="mt-1 text-slate-700">{p.what}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"><dt className="text-slate-500">Returns</dt><dd>{p.returns}</dd><dt className="text-slate-500">Risk</dt><dd>{LABEL[p.risk]}</dd><dt className="text-slate-500">Liquidity</dt><dd>{p.liquidity}</dd><dt className="text-slate-500">Typical horizon</dt><dd>{p.horizon}</dd></dl>
          <p className="mt-2 text-xs text-slate-600"><b>Watch out:</b> {p.watch}</p></div>))}</div>

      <div className="card"><h3 className="mb-2 font-semibold">Compare at a glance</h3>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-1 pr-3">Product</th><th className="pr-3">Return type</th><th className="pr-3">Risk</th><th>Liquidity</th></tr></thead>
          <tbody className="divide-y">{PRODUCTS.map((p) => <tr key={p.name}><td className="py-1.5 pr-3 font-medium">{p.name.split(' (')[0]}</td><td className="pr-3">{p.returns.split(',')[0]}</td><td className="pr-3">{LABEL[p.risk]}</td><td>{p.liquidity.split(' (')[0]}</td></tr>)}</tbody></table></div>
        <p className="mt-2 text-xs text-slate-500">General education, not a ranking or a recommendation. The right mix depends on your goals, time horizon and ability to bear losses.</p></div>

      <div className="card space-y-2 text-sm"><h3 className="font-semibold">Risk in simple words</h3>
        <ul className="list-disc space-y-1 pl-5 text-slate-700">
          <li><b>Higher possible return usually means higher risk.</b> An investment that promises high returns with no risk is a warning sign.</li>
          <li><b>Volatility</b> is how much a price jumps around. Large swings are normal for shares and equity funds, and a fall is a real loss if you have to sell.</li>
          <li><b>Inflation risk:</b> if your money grows slower than prices rise, it buys less over time, even when the balance goes up.</li>
          <li><b>Diversification</b> means spreading money across different things so one bad outcome hurts less. It reduces risk but does not remove it.</li>
          <li><b>Time horizon:</b> money you need soon should not sit in investments that can fall sharply.</li></ul></div>

      <div className="card space-y-3"><h3 className="font-semibold">Calculators (hypothetical projections)</h3>
        <div role="tablist" className="flex gap-2">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{l}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-4">
          {tab === 'sip' && <><Field label="Monthly amount (₹)" value={sip.monthly} onChange={set('monthly')} /><Field label="Assumed yearly return (%)" value={sip.annualRate} onChange={set('annualRate')} /><Field label="Years" value={sip.years} onChange={set('years')} step="1" /><Field label="Yearly step-up (%)" value={sip.stepUpPct} onChange={set('stepUpPct')} hint="Optional: raise the SIP each year" /></>}
          {tab === 'lump' && <><Field label="Amount (₹)" value={lump.principal} onChange={set('principal')} /><Field label="Interest rate (% a year)" value={lump.annualRate} onChange={set('annualRate')} /><Field label="Years" value={lump.years} onChange={set('years')} step="1" />
            <div><label htmlFor="cmp" className="label">Compounding</label><select id="cmp" className="input" value={lump.perYear} onChange={(e) => set('perYear')(e.target.value)}><option value="1">Yearly</option><option value="2">Half-yearly</option><option value="4">Quarterly</option><option value="12">Monthly</option></select></div></>}
          {tab === 'rd' && <><Field label="Monthly deposit (₹)" value={rd.monthly} onChange={set('monthly')} /><Field label="Interest rate (% a year)" value={rd.annualRate} onChange={set('annualRate')} /><Field label="Months" value={rd.months} onChange={set('months')} step="1" /></>}
          <Field label="Inflation for today's-money view (%)" value={infl} onChange={setInfl} hint="Assumption, not a forecast" /></div>
        {err ? <p className="text-sm text-red-600" role="alert">{err}</p> : <>
          {rateWarning(v.annualRate) && <p className="text-sm text-amber-800">{rateWarning(v.annualRate)}</p>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat l="You invest" v={inr(res.invested)} /><Stat l="Estimated gain" v={inr(res.gain)} sub="hypothetical" /><Stat l="Estimated value" v={inr(res.value)} sub="hypothetical" /><Stat l="In today's money" v={inr(realValue(res.value, +infl, years))} sub={`after ${infl}% yearly inflation`} /></div>
          {res.schedule && res.schedule.length > 1 && <ResponsiveContainer width="100%" height={230}><AreaChart data={res.schedule}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" fontSize={11} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11 }} /><YAxis fontSize={11} tickFormatter={(x) => (x >= 100000 ? `${(x / 100000).toFixed(x >= 1e7 ? 0 : 1)}L` : x)} /><Tooltip formatter={(x) => inr(x)} /><Legend /><Area dataKey="invested" name="Invested" stroke="#64748b" fill="#cbd5e1" /><Area dataKey="value" name="Estimated value" stroke="#059669" fill="#a7f3d0" fillOpacity={0.6} /></AreaChart></ResponsiveContainer>}</>}
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><b>Hypothetical only.</b> This assumes the rate you typed stays the same every year. Real investments go up and down, and returns are never guaranteed. {assumption}</div></div>

      <AskAI topic="investment" placeholder="e.g. What is the difference between an FD and a debt mutual fund?" />
    </div>
  )
}
