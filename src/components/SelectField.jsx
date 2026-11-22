import { useId } from 'react'
export default function SelectField({ label, value, onChange, options, hint, disabled }) {
  const id = useId()
  return (
    <div><label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}</select>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</div>
  )
}
