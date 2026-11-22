import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Plus, Printer, Trash2 } from 'lucide-react'
import { inr } from '../lib/format'
import { cashflow, emi, GST_RATES, gst, invoice, pnl, validateBiz, validateEmi, validateGst, validGstin } from '../lib/biz'
import { csvFromRows } from '../lib/csv'
import { useCsvDownload } from '../components/useCsvDownload'
import { localDateString } from '../lib/dates'
import Field from '../components/Field.jsx'

const Stat = ({ l, v, sub }) => (<div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold">{v}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div>)
const Row = ({ l, v, b }) => (<div className={`flex justify-between gap-3 text-sm ${b ? 'border-t pt-1 font-semibold' : ''}`}><span>{l}</span><span>{v}</span></div>)
const Note = ({ children }) => <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{children}</p>
const RateSelect = ({ id, value, onChange }) => (<select id={id} aria-label="GST rate" className="input" value={value} onChange={(e) => onChange(e.target.value)}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select>)

function GstTab() {
  const dlCsv = useCsvDownload()
  const [g, setG] = useState({ amount: '10000', rate: '18', custom: '', useCustom: false, inclusive: false, interState: false })
  const rate = g.useCustom ? g.custom : g.rate, err = validateGst({ amount: g.amount, rate })
  const r = !err && gst({ amount: g.amount, rate, inclusive: g.inclusive, interState: g.interState })
  const [inv, setInv] = useState({ seller: '', gstin: '', customer: '', no: '1', date: localDateString(), interState: false, items: [{ desc: '', qty: '1', price: '', gstRate: '18' }] })
  const setItem = (i, k, v) => setInv((p) => ({ ...p, items: p.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }))
  const itemErr = inv.items.some((it) => !(Number(it.qty) >= 0) || !(Number(it.price || 0) >= 0))
  const iv = useMemo(() => invoice({ items: inv.items, interState: inv.interState }), [inv])
  function csv() {
    const rows = [['Sample invoice (not a legally valid tax invoice)'], ['Seller', inv.seller], ['GSTIN', inv.gstin], ['Customer', inv.customer], ['Invoice no', inv.no], ['Date', inv.date], [], ['Description', 'Qty', 'Price', 'GST %', 'Taxable', 'GST', 'Total'],
      ...iv.lines.map((l) => [l.desc, l.qty, l.price, l.gstRate, l.taxable, l.tax, l.total]), [], ['Taxable value', iv.taxable], ...(inv.interState ? [['IGST', iv.igst]] : [['CGST', iv.cgst], ['SGST', iv.sgst]]), ['Total', iv.total]]
    dlCsv(`invoice-${inv.no || 'sample'}.csv`, csvFromRows(rows))
  }
  return (
    <div className="space-y-4">
      <div className="card no-print space-y-3"><h3 className="font-semibold">GST calculator</h3>
        <div className="grid gap-3 sm:grid-cols-4"><Field label="Amount (₹)" value={g.amount} onChange={(v) => setG({ ...g, amount: v })} />
          <div><label htmlFor="gr" className="label">GST rate</label><select id="gr" className="input" value={g.useCustom ? 'custom' : g.rate} onChange={(e) => (e.target.value === 'custom' ? setG({ ...g, useCustom: true }) : setG({ ...g, useCustom: false, rate: e.target.value }))}>{GST_RATES.map((x) => <option key={x} value={x}>{x}%</option>)}<option value="custom">Other rate…</option></select></div>
          {g.useCustom && <Field label="Custom rate (%)" value={g.custom} onChange={(v) => setG({ ...g, custom: v })} />}
          <div><label htmlFor="gs" className="label">Supply</label><select id="gs" className="input" value={g.interState ? 'inter' : 'intra'} onChange={(e) => setG({ ...g, interState: e.target.value === 'inter' })}><option value="intra">Within the state (CGST + SGST)</option><option value="inter">Between states (IGST)</option></select></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={g.inclusive} onChange={(e) => setG({ ...g, inclusive: e.target.checked })} />The amount already includes GST</label>
        {err ? <p className="text-sm text-red-600" role="alert">{err}</p> : <div className="space-y-1 rounded-lg bg-slate-50 p-3"><Row l="Amount before GST" v={inr(r.base)} />{g.interState ? <Row l="IGST" v={inr(r.igst)} /> : <><Row l={`CGST (${(Number(rate) / 2)}%)`} v={inr(r.cgst)} /><Row l={`SGST (${(Number(rate) / 2)}%)`} v={inr(r.sgst)} /></>}<Row l="Total GST" v={inr(r.gst)} /><Row l="Total amount" v={inr(r.total)} b /></div>}
        <Note>Since 22 September 2025 the main GST rates are 5% and 18%, with 40% for luxury and sin goods and 0% for exempt or nil-rated items. The old 12% and 28% rates were removed. Some items have other special rates, so check the rate that applies to yours. Simplified: one rate per calculation, no cess or input tax credit.</Note></div>

      <div className="card no-print space-y-3"><h3 className="font-semibold">Sample invoice builder</h3>
        <div className="grid gap-3 sm:grid-cols-3"><Field type="text" label="Your business name" value={inv.seller} onChange={(v) => setInv({ ...inv, seller: v })} /><Field type="text" label="Your GSTIN (optional)" value={inv.gstin} onChange={(v) => setInv({ ...inv, gstin: v })} hint={inv.gstin && !validGstin(inv.gstin) ? 'Format looks wrong (15 characters). Only the format is checked.' : 'Only the format is checked, not that it exists'} />
          <Field type="text" label="Customer name" value={inv.customer} onChange={(v) => setInv({ ...inv, customer: v })} /><Field type="text" label="Invoice number" value={inv.no} onChange={(v) => setInv({ ...inv, no: v })} /><Field type="date" label="Date" value={inv.date} onChange={(v) => setInv({ ...inv, date: v })} step="1" />
          <div><label htmlFor="is" className="label">Supply</label><select id="is" className="input" value={inv.interState ? 'inter' : 'intra'} onChange={(e) => setInv({ ...inv, interState: e.target.value === 'inter' })}><option value="intra">Within the state</option><option value="inter">Between states</option></select></div></div>
        {inv.items.map((it, i) => (<div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-6"><input aria-label={`Item ${i + 1} description`} className="input col-span-2" placeholder="Description" maxLength={80} value={it.desc} onChange={(e) => setItem(i, 'desc', e.target.value)} /><input aria-label="Quantity" className="input" inputMode="decimal" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} /><input aria-label="Price" className="input" inputMode="decimal" placeholder="Price ₹" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} /><RateSelect value={it.gstRate} onChange={(v) => setItem(i, 'gstRate', v)} />
          <button className="btn-ghost justify-self-start" aria-label="Remove item" disabled={inv.items.length === 1} onClick={() => setInv((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))}><Trash2 size={14} /></button></div>))}
        <div className="flex flex-wrap gap-2"><button className="btn-ghost border border-slate-200" disabled={inv.items.length >= 10} onClick={() => setInv((p) => ({ ...p, items: [...p.items, { desc: '', qty: '1', price: '', gstRate: '18' }] }))}><Plus size={14} />Add item</button>
          <button className="btn-ghost border border-slate-200" disabled={itemErr} onClick={csv}><Download size={14} />Download CSV</button><button className="btn-ghost border border-slate-200" disabled={itemErr} onClick={() => window.print()}><Printer size={14} />Print / save as PDF</button></div>
        {itemErr && <p className="text-sm text-red-600" role="alert">Quantity and price must be numbers of 0 or more.</p>}</div>

      <div className="card space-y-2"><div className="flex justify-between"><div><div className="text-lg font-bold">{inv.seller || 'Your business'}</div>{inv.gstin && <div className="text-xs text-slate-500">GSTIN: {inv.gstin}</div>}</div><div className="text-right text-sm"><div>Invoice {inv.no}</div><div className="text-slate-500">{inv.date}</div></div></div>
        <div className="text-sm">Bill to: {inv.customer || '—'}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-1">Item</th><th>Qty</th><th>Price</th><th>GST</th><th className="text-right">Total</th></tr></thead><tbody className="divide-y">{iv.lines.map((l, i) => <tr key={i}><td className="py-1">{l.desc || '—'}</td><td>{l.qty}</td><td>{inr(l.price)}</td><td>{l.gstRate}%</td><td className="text-right">{inr(l.total)}</td></tr>)}</tbody></table></div>
        <div className="ml-auto max-w-xs space-y-1"><Row l="Taxable value" v={inr(iv.taxable)} />{inv.interState ? <Row l="IGST" v={inr(iv.igst)} /> : <><Row l="CGST" v={inr(iv.cgst)} /><Row l="SGST" v={inr(iv.sgst)} /></>}<Row l="Total" v={inr(iv.total)} b /></div>
        <p className="text-xs text-slate-500">Sample invoice for practice. It is not a legally valid GST tax invoice: it omits mandatory fields such as HSN/SAC codes and the place of supply.</p></div>
    </div>
  )
}
function EmiTab() {
  const dlCsv = useCsvDownload()
  const [e, setE] = useState({ principal: '1000000', annualRate: '10', months: '60' })
  const err = validateEmi(e), r = !err && emi({ principal: +e.principal, annualRate: +e.annualRate, months: +e.months })
  const yearly = r ? r.years.map((y) => ({ year: `Y${y.year}`, Principal: Math.round(y.principal), Interest: Math.round(y.interest) })) : []
  const csv = () => dlCsv('emi-schedule.csv', csvFromRows([['Month', 'EMI', 'Principal', 'Interest', 'Balance'], ...r.schedule.map((s) => [s.month, +s.emi.toFixed(2), +s.principal.toFixed(2), +s.interest.toFixed(2), +s.balance.toFixed(2)])]))
  return (
    <div className="card space-y-3"><h3 className="font-semibold">Business loan EMI</h3>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Loan amount (₹)" value={e.principal} onChange={(v) => setE({ ...e, principal: v })} /><Field label="Interest rate (% a year)" value={e.annualRate} onChange={(v) => setE({ ...e, annualRate: v })} /><Field label="Tenure (months)" value={e.months} onChange={(v) => setE({ ...e, months: v })} step="1" /></div>
      {err ? <p className="text-sm text-red-600" role="alert">{err}</p> : <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat l="Monthly EMI" v={inr(r.emi)} /><Stat l="Total interest" v={inr(r.totalInterest)} sub={`${((r.totalInterest / r.totalPayable) * 100).toFixed(0)}% of total payable`} /><Stat l="Total payable" v={inr(r.totalPayable)} /><Stat l="Loan amount" v={inr(+e.principal)} /></div>
        <div><h4 className="mb-1 text-sm font-medium">Principal vs interest each year</h4><ResponsiveContainer width="100%" height={220}><BarChart data={yearly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" fontSize={11} /><YAxis fontSize={11} tickFormatter={(x) => (x >= 100000 ? `${Math.round(x / 100000)}L` : x)} /><Tooltip formatter={(x) => inr(x)} /><Legend /><Bar dataKey="Principal" stackId="a" fill="#059669" /><Bar dataKey="Interest" stackId="a" fill="#f59e0b" /></BarChart></ResponsiveContainer></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[380px] text-left text-xs"><caption className="pb-1 text-left text-sm font-medium">First 12 months</caption><thead className="text-slate-500"><tr><th className="py-1">Month</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody className="divide-y">{r.schedule.slice(0, 12).map((s) => <tr key={s.month}><td className="py-1">{s.month}</td><td>{inr(s.emi)}</td><td>{inr(s.principal)}</td><td>{inr(s.interest)}</td><td>{inr(s.balance)}</td></tr>)}</tbody></table></div>
        <button className="btn-ghost border border-slate-200" onClick={csv}><Download size={14} />Download full schedule (CSV)</button></>}
      <Note>Assumes a fixed rate and equal monthly instalments. Not included: processing fees, insurance, prepayment, or rate changes. Your lender’s schedule may differ slightly because of rounding and day-count rules.</Note></div>
  )
}
function PnlTab() {
  const dlCsv = useCsvDownload()
  const [f, setF] = useState({ revenue: '', cogs: '', opex: '', opening: '', receivables: '', payables: '', emiPaid: '', drawings: '', otherIn: '' })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const n = (v) => Number(v) || 0, costs = n(f.cogs) + n(f.opex)
  const err = ['cogs', 'opex', 'opening'].map((k) => validateBiz({ costs: f[k] })).find(Boolean) || validateBiz({ revenue: f.revenue, costs: String(costs), receivables: f.receivables, payables: f.payables, emiPaid: f.emiPaid, drawings: f.drawings, otherIn: f.otherIn })
  const started = f.revenue !== '' || f.cogs !== '' || f.opex !== ''
  const p = pnl({ revenue: f.revenue, cogs: f.cogs, opex: f.opex }), c = cashflow({ opening: f.opening, revenue: f.revenue, receivables: f.receivables, costs, payables: f.payables, emiPaid: f.emiPaid, drawings: f.drawings, otherIn: f.otherIn })
  const chart = [{ name: 'Revenue', v: p.revenue }, { name: 'Costs', v: costs }, { name: 'Net profit', v: p.netProfit }, { name: 'Net cash flow', v: c.net }]
  const csv = () => dlCsv('business-summary.csv', csvFromRows([['Profit and loss (simplified)', ''], ['Revenue', p.revenue], ['Cost of goods', p.cogs], ['Gross profit', p.grossProfit], ['Operating expenses', p.opex], ['Net profit before tax', p.netProfit], [], ['Cash flow (simplified)', ''], ['Opening cash', c.opening], ['Cash received', c.cashIn], ['Cash paid out', c.cashOut], ['Net cash flow', c.net], ['Closing cash', c.closing]]))
  return (
    <div className="card space-y-3"><h3 className="font-semibold">Profit & loss and cash flow (one period)</h3>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Revenue / sales (₹)" value={f.revenue} onChange={set('revenue')} /><Field label="Cost of goods sold (₹)" value={f.cogs} onChange={set('cogs')} /><Field label="Operating expenses (₹)" value={f.opex} onChange={set('opex')} hint="Rent, salaries, utilities, etc." />
        <Field label="Opening cash (₹)" value={f.opening} onChange={set('opening')} /><Field label="Customers still owe you (₹)" value={f.receivables} onChange={set('receivables')} hint="Sales not yet received" /><Field label="You still owe suppliers (₹)" value={f.payables} onChange={set('payables')} hint="Costs not yet paid" />
        <Field label="Loan EMI paid (₹)" value={f.emiPaid} onChange={set('emiPaid')} /><Field label="Owner withdrawals (₹)" value={f.drawings} onChange={set('drawings')} /><Field label="Other cash received (₹)" value={f.otherIn} onChange={set('otherIn')} /></div>
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      {!started && !err && <p className="py-4 text-center text-sm text-slate-500">Enter your revenue and costs to see profit and cash flow.</p>}
      {started && !err && <>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-1 rounded-lg bg-slate-50 p-3"><h4 className="mb-1 text-sm font-medium">Profit and loss</h4><Row l="Revenue" v={inr(p.revenue)} /><Row l="Cost of goods" v={`-${inr(p.cogs)}`} /><Row l="Gross profit" v={inr(p.grossProfit)} b />{p.grossMarginPct !== null && <Row l="Gross margin" v={`${p.grossMarginPct.toFixed(1)}%`} />}<Row l="Operating expenses" v={`-${inr(p.opex)}`} /><Row l="Net profit before tax" v={inr(p.netProfit)} b />{p.netMarginPct !== null && <Row l="Net margin" v={`${p.netMarginPct.toFixed(1)}%`} />}</div>
          <div className="space-y-1 rounded-lg bg-slate-50 p-3"><h4 className="mb-1 text-sm font-medium">Cash flow</h4><Row l="Opening cash" v={inr(c.opening)} /><Row l="Cash received" v={`+${inr(c.cashIn)}`} /><Row l="Cash paid out" v={`-${inr(c.cashOut)}`} /><Row l="Net cash flow" v={inr(c.net)} b /><Row l="Closing cash" v={inr(c.closing)} b /></div></div>
        <ResponsiveContainer width="100%" height={220}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} tickFormatter={(x) => (Math.abs(x) >= 100000 ? `${Math.round(x / 100000)}L` : x)} /><Tooltip formatter={(x) => inr(x)} /><Bar dataKey="v" name="Amount" fill="#059669" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        <p className="text-sm text-slate-700">Profit is {inr(p.netProfit)} but cash moved by {inr(c.net)}. They differ when customers pay late, bills are unpaid, loans are repaid or the owner withdraws money.</p>
        <button className="btn-ghost border border-slate-200" onClick={csv}><Download size={14} />Download summary (CSV)</button></>}
      <Note>Simplified: one period, no tax, depreciation or stock changes. Loan EMI appears only in cash flow, so loan interest is not deducted in the profit figure above. Not accounting or tax advice.</Note></div>
  )
}
const TABS = [['gst', 'GST & invoice'], ['emi', 'Loan EMI'], ['pnl', 'Profit & cash flow']]
export default function Business() {
  const [tab, setTab] = useState('gst')
  return (
    <div className="space-y-4"><h1 className="no-print page-title">Business Finance</h1>
      <div role="tablist" className="no-print flex flex-wrap gap-2">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{l}</button>)}</div>
      <p className="no-print text-xs text-slate-500">Quick calculators for learning and estimates. Nothing here is saved, and none of it is accounting or tax-filing advice.</p>
      {tab === 'gst' && <GstTab />}{tab === 'emi' && <EmiTab />}{tab === 'pnl' && <PnlTab />}
    </div>
  )
}
