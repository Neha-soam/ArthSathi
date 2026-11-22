import { useId, useState } from 'react'
// Accessible input: label linked by id, hint and error linked with aria-describedby, aria-invalid, and a show/hide toggle for passwords.
export default function Field({ label, value, onChange, type = 'number', step, hint, error, placeholder, autoComplete, required, maxLength, inputMode }) {
  const id = useId(), hintId = `${id}-hint`, errId = `${id}-err`
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <div><label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} className={`input ${isPw ? 'pr-16' : ''} ${error ? 'border-red-500' : ''}`} type={isPw && show ? 'text' : type}
          inputMode={inputMode || (type === 'number' ? 'decimal' : undefined)} min={type === 'number' ? '0' : undefined} step={type === 'number' ? step || 'any' : undefined}
          value={value} placeholder={placeholder} autoComplete={autoComplete} required={required} maxLength={maxLength} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={[hint && hintId, error && errId].filter(Boolean).join(' ') || undefined} />
        {isPw && <button type="button" className="absolute inset-y-0 right-1 px-2 text-xs font-medium text-slate-600 hover:text-slate-900" aria-pressed={show} onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>}
      </div>
      {hint && <p id={hintId} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={errId} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
