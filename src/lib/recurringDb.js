import { supabase } from './supabase'
import { dueDates } from './recurring'
import { localDateString } from './dates'
let ranKey = ''
// Creates due transactions for active rules. Safe to repeat (unique constraint). Never throws: a missing table must not break the app.
export async function generateRecurring(uid, force = false) {
  const today = localDateString(), key = uid + ':' + today
  if (!force && ranKey === key) return
  const { data: rules, error } = await supabase.from('recurring_rules').select('*').eq('active', true)
  if (error) { console.warn('Recurring skipped:', error.code, error.message); return }
  for (const r of rules) {
    const dates = dueDates(r, today)
    if (!dates.length) continue
    const rows = dates.map((date) => ({ user_id: uid, type: r.type, amount: r.amount, category: r.category, note: r.note, date, recurring_id: r.id }))
    const ins = await supabase.from('transactions').upsert(rows, { onConflict: 'recurring_id,date', ignoreDuplicates: true })
    if (ins.error) { console.warn('Recurring insert failed:', ins.error.code); continue }
    await supabase.from('recurring_rules').update({ last_generated: today }).eq('id', r.id)
  }
  ranKey = key
}
