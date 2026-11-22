import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { validateNewPassword } from '../lib/password'
export default function ResetPassword() {
  const { session, loading, recovery, completeReset, signOut } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  if (loading) return <div className="p-8 text-slate-500">Checking your reset link…</div>
  if (session && !recovery) return <Navigate to="/profile" replace /> // normal logged-in users change passwords in Settings
  if (!session) return (
    <div className="flex min-h-screen items-center justify-center p-4"><div className="card w-full max-w-sm space-y-3">
      <h1 className="text-xl font-bold">Link invalid or expired</h1><p className="text-sm text-slate-600">Request a new reset link to continue.</p>
      <Link className="btn w-full" to="/forgot-password">Request new link</Link></div></div>)
  async function submit(e) {
    e.preventDefault(); setErr('')
    const v = validateNewPassword(pw, confirm); if (v) return setErr(v)
    setBusy(true); const { error } = await completeReset(pw); setBusy(false)
    if (error) return setErr(/same|different/i.test(error.message) ? 'Choose a password you have not used before.' : 'Could not update the password. Request a new link and try again.')
    nav('/login', { replace: true, state: { msg: 'Password updated. Please log in with your new password.' } })
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-brand-700">Choose a new password</h1>
        <div><label className="label">New password</label><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /><p className="mt-1 text-xs text-slate-500">8+ characters with a letter and a number.</p></div>
        <div><label className="label">Confirm new password</label><input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        <button type="button" className="w-full text-sm text-slate-600 underline" onClick={signOut}>Cancel and log out</button>
      </form>
    </div>
  )
}
