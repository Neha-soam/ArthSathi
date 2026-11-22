import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, emailSchema } from '../lib/auth.jsx'
export default function ForgotPassword() {
  const { requestReset } = useAuth()
  const [email, setEmail] = useState(''); const [err, setErr] = useState(''); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr('')
    const em = emailSchema.safeParse(email)
    if (!em.success) return setErr(em.error.issues[0].message)
    setBusy(true); const { error } = await requestReset(em.data); setBusy(false)
    if (error?.status === 429) return setErr('Too many requests. Please wait a few minutes and try again.')
    setSent(true) // identical message whether or not the email is registered (no account enumeration)
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-brand-700">Reset your password</h1>
        {sent ? <p className="text-sm text-slate-700">If an account exists for that email, a reset link has been sent. Check your inbox and spam folder. The link expires after a short time.</p> : <>
          <div><label className="label">Registered email</label><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button></>}
        <Link to="/login" className="block text-center text-sm text-slate-600 underline">Back to log in</Link>
      </form>
    </div>
  )
}
