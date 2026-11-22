import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth.jsx'
import { validateNewPassword } from '../lib/password'
import { describeDbError } from '../lib/dberror'
import { downloadText } from '../lib/download'
import { localDateString } from '../lib/dates'
import { useToast } from '../components/Toast.jsx'
import Field from '../components/Field.jsx'

const TABLES = ['profiles', 'transactions', 'budgets', 'recurring_rules', 'scam_checks', 'watchlists', 'paper_trades', 'savings_goals']
export default function Profile() {
  const { user, signOut, signOutAll, changePassword } = useAuth(), toast = useToast()
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [exporting, setExporting] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr('')
    if (!cur) return setErr('Enter your current password.')
    const v = validateNewPassword(pw, confirm); if (v) return setErr(v)
    if (pw === cur) return setErr('New password must be different from the current one.')
    setBusy(true); const { error } = await changePassword(cur, pw); setBusy(false)
    if (error) return setErr(error.message === 'Current password is incorrect.' ? error.message : 'Could not change the password. Please try again.')
    toast.success('Password changed. Other devices have been logged out.'); setCur(''); setPw(''); setConfirm('')
  }
  async function everywhere() { if (confirm('Log out of ArthSathi on every device, including this one?')) await signOutAll() }
  async function exportData() {
    setExporting(true)
    try {
      const tables = {}, skipped = []
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select('*').limit(50000) // RLS: only this user's rows are ever returned
        if (error) { if (['PGRST205', '42P01'].includes(error.code)) { skipped.push(t); continue } throw error }
        tables[t] = data
      }
      downloadText(`arthsathi-my-data-${localDateString()}.json`, JSON.stringify({ app: 'ArthSathi', exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email }, tables, notSetUp: skipped }, null, 2))
      toast.success('Your data was downloaded.')
    } catch (e) { console.error(e); toast.error(describeDbError(e, 'load')) }
    setExporting(false)
  }
  return (
    <div className="space-y-4"><h1 className="page-title">Profile & Settings</h1>
      <div className="card space-y-3"><div><div className="label">Email</div><div className="text-sm">{user.email}</div></div>
        <div className="flex flex-wrap gap-2"><button className="btn" onClick={signOut}><LogOut size={16} aria-hidden="true" />Log out</button><button className="btn-ghost border border-slate-200" onClick={everywhere}>Log out of all devices</button></div></div>
      <form onSubmit={submit} className="card max-w-md space-y-3" noValidate><h2 className="font-semibold">Change password</h2>
        <Field type="password" label="Current password" value={cur} onChange={setCur} autoComplete="current-password" />
        <Link to="/forgot-password" className="inline-block text-xs text-brand-700 underline">Forgot your current password? Reset it by email</Link>
        <Field type="password" label="New password" value={pw} onChange={setPw} autoComplete="new-password" hint="8+ characters with a letter and a number." />
        <Field type="password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form>
      <div className="card max-w-md space-y-2"><h2 className="font-semibold">Your data</h2><p className="text-sm text-slate-600">Download a copy of everything ArthSathi has stored for you (transactions, budgets, history and more) as a JSON file. It never includes your password.</p>
        <button className="btn-ghost border border-slate-200" onClick={exportData} disabled={exporting}><Download size={16} aria-hidden="true" />{exporting ? 'Preparing…' : 'Download my data'}</button></div>
      <p className="text-xs text-slate-500">ArthSathi never asks for or stores your UPI PIN, OTP, card details, Aadhaar or PAN.</p>
    </div>
  )
}
