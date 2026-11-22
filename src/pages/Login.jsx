import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth, emailSchema } from '../lib/auth.jsx'
import { validatePassword } from '../lib/password'

const GENERIC_SIGNUP = 'We could not create an account with these details. If you may already have one, log in or reset your password.'
export default function Login() {
  const { user, recovery, signIn, signUp } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [err, setErr] = useState(''); const [info, setInfo] = useState(location.state?.msg || ''); const [busy, setBusy] = useState(false)
  if (user && recovery) return <Navigate to="/reset-password" replace />
  if (user) return <Navigate to="/" replace />

  async function submit(e) {
    e.preventDefault(); setErr(''); setInfo('')
    const em = emailSchema.safeParse(email)
    if (!em.success) return setErr(em.error.issues[0].message)
    // Strength rules apply at signup only, so existing users are never locked out by a rule change.
    const pwErr = mode === 'signup' ? validatePassword(password) : password ? null : 'Enter your password.'
    if (pwErr) return setErr(pwErr)
    setBusy(true)
    const { data, error } = mode === 'login' ? await signIn({ email: em.data, password }) : await signUp({ email: em.data, password })
    setBusy(false)
    if (mode === 'login') {
      if (!error) return
      return setErr(/not confirmed/i.test(error.message) ? 'Please confirm your email first, then log in.' : error.status === 429 ? 'Too many attempts. Please wait a minute.' : 'Invalid email or password.')
    }
    if (error) return setErr(error.status === 429 ? 'Too many attempts. Please wait a minute.' : error.status === 422 && /password/i.test(error.message) && !/already|registered/i.test(error.message) ? error.message : GENERIC_SIGNUP)
    // Supabase returns an obfuscated user with no identities (and no session) for an already-registered email.
    if (!data.session) setInfo('Check your email to confirm your account. If you already have an account, log in or reset your password.')
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div><h1 className="text-2xl font-bold text-brand-700">ArthSathi</h1><p className="text-sm text-slate-500">Your AI financial companion</p></div>
        <div><label className="label">Email</label><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label className="label">Password</label><input className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === 'signup' && <p className="mt-1 text-xs text-slate-500">8+ characters with a letter and a number.</p>}
          {mode === 'login' && <Link to="/forgot-password" className="mt-1 inline-block text-xs text-brand-700 underline">Forgot password?</Link>}</div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}{info && <p className="text-sm text-brand-700">{info}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="w-full text-sm text-slate-600 underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); setInfo('') }}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}</button>
      </form>
    </div>
  )
}
