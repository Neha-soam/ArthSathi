// Pure helpers (unit-tested). Supabase Auth remains the source of truth for authentication.
export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.'
  if (pw.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[A-Za-z]/.test(pw)) return 'Password must include a letter.'
  if (!/[0-9]/.test(pw)) return 'Password must include a number.'
  return null
}
export function validateNewPassword(pw, confirm) {
  return validatePassword(pw) || (pw !== confirm ? 'Passwords do not match.' : null)
}
