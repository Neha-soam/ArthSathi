// True when the URL came from a Supabase password-recovery email link.
export const isRecoveryUrl = (hash = '', search = '') => /(^|[#?&])type=recovery(&|$)/.test(hash) || /(^|[?&])type=recovery(&|$)/.test(search)
