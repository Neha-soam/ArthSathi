import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { toastDuration, toastReducer } from '../lib/toastReducer'

const Ctx = createContext(null)
export const useToast = () => useContext(Ctx) // { success, error, info }
const STYLE = { success: ['border-emerald-300', CheckCircle2, 'text-emerald-600'], error: ['border-red-300', AlertCircle, 'text-red-600'], info: ['border-slate-300', Info, 'text-slate-500'] }

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])
  const idRef = useRef(0)
  const push = useCallback((kind, message) => {
    const id = ++idRef.current
    dispatch({ type: 'add', toast: { id, kind, message } })
    setTimeout(() => dispatch({ type: 'dismiss', id }), toastDuration(kind))
  }, [])
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push])
  return (
    <Ctx.Provider value={api}>{children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        {toasts.map((t) => { const [border, Icon, tone] = STYLE[t.kind]; return (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border bg-white p-3 text-sm shadow-lg ${border}`}>
            <Icon size={18} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" /><span className="flex-1 break-words">{t.message}</span>
            <button className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Dismiss notification" onClick={() => dispatch({ type: 'dismiss', id: t.id })}><X size={16} /></button></div>) })}
      </div>
    </Ctx.Provider>
  )
}
