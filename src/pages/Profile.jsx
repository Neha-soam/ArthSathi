import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { validateNewPassword } from '../lib/password'
export default function Profile() {
  const { user, signOut, changePassword } = useAuth()
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr(''); setOk('')
    if (!cur) return setErr('Enter your current password.')
    const v = validateNewPassword(pw, confirm); if (v) return setErr(v)
    if (pw === cur) return setErr('New password must be different from the current one.')
    setBusy(true); const { error } = await changePassword(cur, pw); setBusy(false)
    if (error) return setErr(error.message === 'Current password is incorrect.' ? error.message : 'Could not change the password. Please try again.')
    setOk('Password changed. Other devices have been logged out.'); setCur(''); setPw(''); setConfirm('')
  }
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Profile & Settings</h1>
    <div className="card space-y-3"><div><div className="label">Email</div>{user.email}</div>
      <p className="text-xs text-slate-500">ArthSathi never asks for or stores your UPI PIN, OTP, card details, Aadhaar or PAN.</p>
      <button className="btn" onClick={signOut}>Log out</button></div>
    <form onSubmit={submit} className="card max-w-md space-y-3"><h3 className="font-semibold">Change password</h3>
      <div><label className="label">Current password</label><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <Link to="/forgot-password" className="mt-1 inline-block text-xs text-brand-700 underline">Forgot your current password? Reset it by email</Link></div>
      <div><label className="label">New password</label><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div><label className="label">Confirm new password</label><input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}{ok && <p className="text-sm text-brand-700">{ok}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form></div>)
}
