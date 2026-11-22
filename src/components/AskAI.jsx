import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { callAI } from '../lib/ai'
export default function AskAI({ topic, placeholder }) {
  const [q, setQ] = useState(''); const [out, setOut] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function ask(e) {
    e.preventDefault(); setBusy(true); setErr(''); setOut(null)
    const { data, error } = await callAI({ action: 'edu', topic, question: q })
    setBusy(false); error ? setErr(error) : setOut(data.text)
  }
  return (
    <div className="card">
      <h3 className="mb-2 flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-brand-600" />Ask the AI assistant</h3>
      <form onSubmit={ask} className="flex gap-2">
        <input className="input" maxLength={500} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} required minLength={3} />
        <button className="btn" disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </form>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {out && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{out}</p>}
      <p className="mt-2 text-xs text-slate-500">AI can be wrong. Educational information only, not personalised advice.</p>
    </div>
  )
}
