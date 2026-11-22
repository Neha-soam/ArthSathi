// Loading placeholders. The pulse is subtle and switched off for people who prefer reduced motion.
export const Skeleton = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded bg-slate-200 motion-reduce:animate-none ${className}`} />
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4"><span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-28" /></div>)}</div>
      <div className="card space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div>
    </div>
  )
}
export function ListSkeleton({ rows = 3 }) {
  return (<div role="status" aria-busy="true" className="space-y-3 py-2"><span className="sr-only">Loading…</span>{Array.from({ length: rows }, (_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-full" /></div>)}</div>)
}
