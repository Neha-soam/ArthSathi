import { useState } from 'react'
import { inr } from '../lib/ai'
import Field from '../components/Field.jsx'
import AskAI from '../components/AskAI.jsx'
const PRODUCTS = [
  ['Fixed Deposit', 'Low', 'You lock money with a bank for a fixed period at a fixed rate. Predictable, but returns may not beat inflation after tax.'],
  ['Bonds', 'Low–Medium', 'You lend to a government or company and receive interest. Risks: issuer default and interest-rate changes.'],
  ['Index Fund', 'Medium–High', 'A mutual fund that copies an index like Nifty 50. Low cost and diversified, but value rises and falls with the market.'],
  ['Mutual Fund', 'Varies', 'A pool of money managed by a professional. Risk depends on what it holds (equity, debt, hybrid). Check expense ratio and the risk label.'],
  ['SIP', 'Depends on fund', 'Not a product but a method: investing a fixed amount regularly into a mutual fund. Spreads your buying across market ups and downs.'],
  ['Stocks', 'High', 'Part-ownership in one company. Prices can swing sharply and you can lose money. Concentrated in one business.'],
]
export default function Invest() {
  const [sip, setSip] = useState({ m: '5000', r: '12', y: '10' }); const [ci, setCi] = useState({ p: '100000', r: '7', y: '5', n: '1' })
  const mr = Number(sip.r) / 1200, n = Number(sip.y) * 12
  const sipFv = mr > 0 ? Number(sip.m) * ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr) : Number(sip.m) * n
  const ciFv = Number(ci.p) * Math.pow(1 + Number(ci.r) / 100 / Number(ci.n || 1), Number(ci.n || 1) * Number(ci.y))
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Investment Learning Guide</h1>
      <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900">Educational information only. This is not personalised investment advice and nothing here promises returns. ArthSathi is not SEBI-registered.</div>
      <div className="grid gap-3 md:grid-cols-2">{PRODUCTS.map(([n, risk, d]) => (<div key={n} className="card"><div className="flex justify-between"><h3 className="font-semibold">{n}</h3><span className="text-xs text-slate-500">Risk: {risk}</span></div><p className="mt-1 text-sm text-slate-600">{d}</p></div>))}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3"><h3 className="font-semibold">SIP calculator</h3>
          <Field label="Monthly investment (₹)" value={sip.m} onChange={(v) => setSip({ ...sip, m: v })} /><Field label="Assumed annual return (%)" value={sip.r} onChange={(v) => setSip({ ...sip, r: v })} /><Field label="Years" value={sip.y} onChange={(v) => setSip({ ...sip, y: v })} />
          <div className="rounded bg-slate-50 p-3 text-sm">Invested: <b>{inr(Number(sip.m) * n)}</b><br />Illustrative value: <b>{inr(sipFv)}</b></div>
          <p className="text-xs text-slate-500">A hypothetical projection using the rate you typed. Real returns vary and can be negative.</p></div>
        <div className="card space-y-3"><h3 className="font-semibold">Compound interest calculator</h3>
          <Field label="Principal (₹)" value={ci.p} onChange={(v) => setCi({ ...ci, p: v })} /><Field label="Annual rate (%)" value={ci.r} onChange={(v) => setCi({ ...ci, r: v })} /><Field label="Years" value={ci.y} onChange={(v) => setCi({ ...ci, y: v })} /><Field label="Compounding per year" value={ci.n} onChange={(v) => setCi({ ...ci, n: v })} hint="1 = yearly, 4 = quarterly, 12 = monthly" />
          <div className="rounded bg-slate-50 p-3 text-sm">Final amount: <b>{inr(ciFv)}</b><br />Interest earned: <b>{inr(ciFv - Number(ci.p))}</b></div></div>
      </div>
      <AskAI topic="investment" placeholder="e.g. What is the difference between SIP and lump sum?" />
    </div>
  )
}
