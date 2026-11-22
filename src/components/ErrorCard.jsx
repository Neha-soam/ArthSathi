export default function ErrorCard({ error, onRetry }) {
  return (
    <div className="card border-red-200 bg-red-50 text-sm text-red-800" role="alert">
      <p className="font-medium">{error.message}</p>
      <button className="btn mt-3" onClick={onRetry}>Try again</button>
      {error.detail && <details className="mt-3 text-xs text-red-700"><summary className="cursor-pointer">Technical details (for support)</summary><p className="mt-1 break-words font-mono">{error.detail}</p></details>}
    </div>
  )
}
