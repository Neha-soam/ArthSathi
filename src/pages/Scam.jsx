import { useState } from 'react'
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { callAI } from '../lib/ai'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { maskForStorage } from '../lib/scamHighlight'
import { SAMPLES } from '../lib/scamSamples'
import HighlightedText from '../components/HighlightedText.jsx'
import ScamHistory from '../components/ScamHistory.jsx'

const ORDER = { Low: 0, Medium: 1, High: 2 }
const LEVEL = {
  Low: { title: 'Low risk', cls: 'border-emerald-300 bg-emerald-50 text-emerald-900', Icon: ShieldCheck, text: 'No strong warning signs were found. This does not mean the message is safe. Verify anything you did not expect.' },
  Medium: { title: 'Medium risk', cls: 'border-amber-300 bg-amber-50 text-amber-900', Icon: AlertTriangle, text: 'Some warning signs. Be careful, and verify with the organisation through an official channel before you act.' },
  High: { title: 'High risk', cls: 'border-red-300 bg-red-50 text-red-900', Icon: ShieldAlert, text: 'Strong warning signs of a scam. Do not click, reply, pay or share anything. Verify through official channels.' },
}
export default function Scam() {
  const { user } = useAuth()
  const [text, setText] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false); const [save, setSave] = useState(true); const [histKey, setHistKey] = useState(0)

  async function run(e) {
    e.preventDefault(); setBusy(true); setErr(''); setRes(null); setNote('')
    const { data, error } = await callAI({ action: 'scam', text })
    setBusy(false)
    if (error) return setErr(error)
    if (!LEVEL[data?.level]) return setErr('The AI service is out of date. Redeploy it with: npx supabase functions deploy ai')
    setRes(data)
    if (!save) return
    const { error: se } = await supabase.from('scam_checks').insert({ user_id: user.id, level: data.level, score: Math.min(100, data.score), signals: data.signals.map((s) => s.id), excerpt: maskForStorage(data.analyzed), ai_used: data.aiAvailable })
    if (se) { console.warn('History not saved:', se.code); setNote(['PGRST205', '42P01'].includes(se.code) ? 'History is not set up yet, so this check was not saved.' : 'This check could not be saved to your history.') }
    else setHistKey((k) => k + 1)
  }
  const L = res && LEVEL[res.level]
  return (
    <div className="space-y-4"><h1 className="page-title">AI Scam & Fraud Detector</h1>
      <div className="card border-amber-300 bg-amber-50 text-sm text-amber-900"><b>Never paste</b> your UPI PIN, OTP, card number, CVV or banking password here. Paste only the suspicious message itself.</div>

      <div className="card"><div className="mb-2 text-sm font-medium">Try a sample <span className="font-normal text-slate-500">(fictional messages)</span></div>
        <div className="flex flex-wrap gap-2">{SAMPLES.map((s) => <button key={s.id} type="button" className="btn-ghost border border-slate-200" onClick={() => { setText(s.text); setRes(null); setErr(''); setNote('') }}>{s.label}</button>)}</div></div>

      <form onSubmit={run} className="card space-y-3">
        <label htmlFor="scam-msg" className="label">Paste a suspicious SMS, WhatsApp message, email or payment request</label>
        <textarea id="scam-msg" className="input min-h-[140px]" maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} required minLength={10} />
        <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={save} onChange={(e) => setSave(e.target.checked)} />Save a masked summary to my history. Numbers with 4+ digits and UPI IDs are hidden, and you can delete it any time.</label>
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{text.length}/3000</span><button className="btn" disabled={busy}>{busy ? 'Analysing…' : 'Check message'}</button></div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      </form>

      {res && (<div className="space-y-3">
        <div className={`card border ${L.cls}`}><div className="flex items-center gap-3"><L.Icon size={28} /><div><div className="text-lg font-bold">{L.title}</div><div className="text-sm">{L.text}</div></div></div>
          {res.summary && <p className="mt-2 text-sm">{res.summary}</p>}
          <p className="mt-2 text-sm font-medium">Warning-sign points: {res.score}</p>
          <details className="mt-1 text-xs"><summary className="cursor-pointer">How the score works</summary><p className="mt-1">Each warning sign adds points, for example asking you to share an OTP adds 2 and a link that imitates a bank adds 3. {res.thresholds.medium - 1} or fewer points is Low, {res.thresholds.medium} to {res.thresholds.high - 1} is Medium, {res.thresholds.high} or more is High. This is a simple rule-based score, not a probability. It cannot prove a message is genuine or fraudulent.</p></details></div>
        {res.agreement === 'ai_unavailable' && <div className="card text-sm text-slate-600">The AI explanation is unavailable right now. This result comes from the built-in checks only.</div>}
        {res.agreement === 'differ' && <div className="card text-sm text-slate-600">{ORDER[res.aiLevel] > ORDER[res.ruleLevel] ? 'The AI saw more warning signs than the built-in checks, so the higher level is shown.' : 'The AI rated this lower than the built-in checks. The more cautious level is shown.'}</div>}

        <div className="card"><h3 className="mb-2 font-semibold">Your message</h3><HighlightedText text={res.analyzed} signals={res.signals} />
          <p className="mt-2 text-xs text-slate-500">{res.signals.some((s) => s.matches.length) ? 'Highlighted parts triggered a warning sign from the built-in checks.' : 'No parts of the message were highlighted.'}</p></div>

        {res.signals.length > 0 && <div className="card"><h3 className="mb-2 font-semibold">Why it looks suspicious</h3><ul className="space-y-3">{res.signals.map((s) => (
          <li key={s.id} className="text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{s.label}</span><span className="shrink-0 rounded bg-slate-100 px-2 text-xs">+{s.points}</span></div>
            <p className="text-slate-600">{s.why}</p>
            {s.matches.length > 0 && <p className="text-xs text-slate-500">Found: {[...new Set(s.matches.map((m) => m.text))].slice(0, 3).map((t) => `“${t}”`).join(', ')}</p>}</li>))}</ul></div>}
        {res.aiFlags.length > 0 && <div className="card"><h3 className="mb-2 font-semibold">Extra observations from the AI</h3><ul className="list-disc space-y-1 pl-5 text-sm">{res.aiFlags.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
        {res.info.length > 0 && <div className="card text-sm text-slate-600">{res.info.map((t, i) => <p key={i}>{t}</p>)}</div>}
        {res.links.length > 0 && <div className="card"><h3 className="mb-2 font-semibold">Links found (shown as text, do not open)</h3><ul className="space-y-2 text-sm">{res.links.map((l, i) => (<li key={i}><div className="break-all rounded bg-slate-100 px-2 py-1 font-mono">{l.url}</div>{l.flags.map((f, j) => <div key={j} className="mt-1 text-xs text-red-700">{f}</div>)}</li>))}</ul></div>}
        <div className="card"><h3 className="mb-2 font-semibold">What to do</h3><ul className="list-disc space-y-1 pl-5 text-sm">{res.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
        {note && <p className="text-xs text-slate-500">{note}</p>}
        <p className="text-xs text-slate-500">This tool looks for warning signs. It cannot guarantee that a message is genuine or fraudulent. When unsure, contact your bank through its official app or the number on your card. Report fraud: cybercrime.gov.in or helpline 1930.</p></div>)}

      <ScamHistory refreshKey={histKey} />
    </div>
  )
}
