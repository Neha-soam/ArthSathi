import { useState } from 'react'
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { callAI } from '../lib/ai'
const STYLE = { 'Potentially Safe': ['bg-emerald-50 border-emerald-300 text-emerald-800', ShieldCheck], Suspicious: ['bg-amber-50 border-amber-300 text-amber-800', AlertTriangle], 'High Risk': ['bg-red-50 border-red-300 text-red-800', ShieldAlert] }
export default function Scam() {
  const [text, setText] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function run(e) {
    e.preventDefault(); setBusy(true); setErr(''); setRes(null)
    const { data, error } = await callAI({ action: 'scam', text })
    setBusy(false); error ? setErr(error) : setRes(data)
  }
  const [cls, Icon] = res ? STYLE[res.verdict] : []
  return (
    <div className="space-y-4"><h1 className="text-2xl font-bold">AI Scam & Fraud Detector</h1>
      <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900"><b>Never paste</b> your UPI PIN, OTP, card number, CVV or banking password here. Paste only the suspicious message itself.</div>
      <form onSubmit={run} className="card space-y-3">
        <label className="label">Paste a suspicious SMS, WhatsApp message, email or payment request</label>
        <textarea className="input min-h-[140px]" maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} required minLength={10} />
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{text.length}/3000</span><button className="btn" disabled={busy}>{busy ? 'Analysing…' : 'Check message'}</button></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
      {res && (<div className="space-y-3">
        <div className={`card flex items-center gap-3 border ${cls}`}><Icon size={28} /><div><div className="text-lg font-bold">{res.verdict}</div>{res.summary && <div className="text-sm">{res.summary}</div>}</div></div>
        {!res.aiAvailable && <div className="card text-sm text-slate-600">AI explanation is unavailable right now. This result is from built-in pattern checks only.</div>}
        {(res.ruleFlags.length > 0 || res.aiFlags.length > 0) && <div className="card"><h3 className="mb-2 font-semibold">Warning signs</h3><ul className="list-disc space-y-1 pl-5 text-sm">{[...res.ruleFlags, ...res.aiFlags].map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
        {res.links.length > 0 && <div className="card"><h3 className="mb-2 font-semibold">Links found (shown as text, do not open)</h3><ul className="space-y-1 text-sm">{res.links.map((l, i) => <li key={i} className="break-all rounded bg-red-50 px-2 py-1 font-mono text-red-800">{l}</li>)}</ul></div>}
        <div className="card"><h3 className="mb-2 font-semibold">What to do</h3><ul className="list-disc space-y-1 pl-5 text-sm">{res.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
        <p className="text-xs text-slate-500">This tool cannot guarantee whether a message is genuine or fraudulent. When unsure, contact your bank via its official app or number. Report fraud: cybercrime.gov.in or helpline 1930.</p></div>)}
    </div>
  )
}
