export const MAX_TOASTS = 3
export const toastDuration = (kind) => (kind === 'error' ? 7000 : 4000) // errors stay longer so they can be read
export function toastReducer(state, action) {
  if (action.type === 'add') return [...state, action.toast].slice(-MAX_TOASTS)
  if (action.type === 'dismiss') return state.filter((t) => t.id !== action.id)
  return state
}
