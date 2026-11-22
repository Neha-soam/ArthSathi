import { supabase } from './supabase'
// Calls the Edge Function; returns {data} or {error}. Never throws.
export async function callAI(body) {
  try {
    const { data, error } = await supabase.functions.invoke('ai', { body })
    if (error) {
      let msg = 'AI is temporarily unavailable. The rest of the app still works.'
      try { const j = await error.context.json(); if (j?.error) msg = j.error } catch { /* keep default */ }
      return { error: msg }
    }
    return { data }
  } catch { return { error: 'Could not reach the AI service. Check your connection.' } }
}
export { inr } from './format'
export const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Healthcare', 'Other']
