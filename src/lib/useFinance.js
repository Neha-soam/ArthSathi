import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { describeDbError, dbErrorDetail } from './dberror'
import { fetchAllPages } from './finance'
import { generateRecurring } from './recurringDb'
export { summarize, budgetUsage } from './finance'
export { localMonthKey as monthKey } from './dates'
const fail = (e) => ({ message: describeDbError(e), detail: dbErrorDetail(e) })

export function useFinance() {
  const [tx, setTx] = useState([]); const [budgets, setBudgets] = useState([]); const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null); const [truncated, setTruncated] = useState(false)
  const hadError = useRef(false)
  const load = useCallback(async () => {
    if (hadError.current) setLoading(true) // spinner only on first load / retry, not after every save
    try {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) { hadError.current = true; setError(fail({ status: 401, message: 'no session' })); return }
      await generateRecurring(s.session.user.id) // creates due recurring transactions first so every page sees the same data
      // RLS (user_id = auth.uid()) restricts both queries to the logged-in user's rows. Stable ordering (…, id) keeps pages consistent.
      const [t, b] = await Promise.all([
        fetchAllPages((from, to) => supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(from, to)),
        supabase.from('budgets').select('*'),
      ])
      const err = t.error || b.error
      if (err) { console.error('Supabase query failed:', err); hadError.current = true; setError(fail(err)); return }
      setTx(t.data); setTruncated(t.truncated); setBudgets(b.data); setError(null); hadError.current = false
    } catch (e) { console.error(e); hadError.current = true; setError(fail(e)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return { tx, budgets, loading, error, truncated, reload: load }
}
