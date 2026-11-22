import { createClient } from '@supabase/supabase-js'
import { isRecoveryUrl } from './recovery'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
// Must run BEFORE createClient: supabase-js strips the URL hash while it initialises, which used to make the
// app miss that the user arrived from a reset email (so they landed in Profile asking for a current password).
if (typeof window !== 'undefined' && isRecoveryUrl(window.location.hash, window.location.search)) sessionStorage.setItem('as_recovery', '1')
// Anon key is safe in the browser: RLS limits what it can access.
export const supabase = createClient(url || 'http://localhost', key || 'missing', { auth: { flowType: 'implicit' } })
