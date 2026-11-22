// Auth is isolated here so a Google OAuth method can be added later (supabase.auth.signInWithOAuth) without touching pages.
import { createContext, useContext, useEffect, useState } from 'react'
import { z } from 'zod'
import { supabase } from './supabase'

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email').max(254)
const RKEY = 'as_recovery'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // True only while the user holds a password-recovery session (persisted so a reload does not lose it)
  const [recovery, setRecovery] = useState(() => sessionStorage.getItem(RKEY) === '1' || /type=recovery/.test(window.location.hash))
  const markRecovery = (v) => { v ? sessionStorage.setItem(RKEY, '1') : sessionStorage.removeItem(RKEY); setRecovery(v) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') markRecovery(true)
      if (event === 'SIGNED_OUT') markRecovery(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const api = {
    session, user: session?.user ?? null, loading, recovery,
    signUp: ({ email, password }) => supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }),
    signIn: ({ email, password }) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    signOutAll: () => supabase.auth.signOut({ scope: 'global' }), // ends the session on every device
    requestReset: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
    // Recovery flow: set the new password, then end ALL sessions so the user logs in fresh.
    completeReset: async (password) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return { error }
      await supabase.auth.signOut(); markRecovery(false); return {}
    },
    // Settings flow: re-verify the current password with Supabase, then change it and revoke other sessions.
    changePassword: async (current, next) => {
      const email = session?.user?.email
      const check = await supabase.auth.signInWithPassword({ email, password: current })
      if (check.error) return { error: { message: 'Current password is incorrect.' } }
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) return { error }
      await supabase.auth.signOut({ scope: 'others' }); return {}
    },
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
