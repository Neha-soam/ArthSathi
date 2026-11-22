export default function Field({ label, value, onChange, step, hint }) {
  return (<div><label className="label">{label}</label><input className="input" type="number" min="0" step={step || 'any'} value={value} onChange={(e) => onChange(e.target.value)} />{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</div>)
}
