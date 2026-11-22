import { segmentText } from '../lib/scamHighlight'
// Plain React text nodes only (no innerHTML), so pasted content can never run as markup.
export default function HighlightedText({ text, signals }) {
  const labels = Object.fromEntries(signals.map((s) => [s.id, s.label]))
  return (
    <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm leading-relaxed">
      {segmentText(text, signals).map((g, i) => g.ids.length
        ? <mark key={i} title={g.ids.map((id) => labels[id]).join(' + ')} className="rounded bg-amber-200 px-0.5 text-amber-950 underline decoration-amber-600 decoration-dotted">{g.text}</mark>
        : <span key={i}>{g.text}</span>)}
    </p>
  )
}
