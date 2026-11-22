// User-facing text is plain language. Technical codes go to dbErrorDetail() (shown only under "Technical details").
export function dbErrorDetail(err) {
  if (!err) return ''
  const hint = err.code === '42501' && /permission denied for table/i.test(err.message || '') ? ' | Developer hint: run supabase/fix_permissions.sql' : ''
  return `${err.code || err.status || 'error'}: ${String(err.message || '').slice(0, 200)}${hint}`
}
export function describeDbError(err, action = 'load') {
  if (!err) return ''
  const code = err.code || '', msg = String(err.message || '')
  if (err.status === 401 || /jwt|not authenticated|no session/i.test(msg)) return 'Your session has expired. Please log in again.'
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return "We can't connect right now. Please check your internet connection and try again."
  if (code === '23514') return 'Some details look invalid. Please check the amount, category and date.'
  const what = action === 'save' ? 'save this' : action === 'delete' ? 'delete this' : 'load your data'
  return `We couldn't ${what} right now. Please try again in a moment. If this keeps happening, contact support.`
}
