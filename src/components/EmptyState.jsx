export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {Icon && <span className="rounded-full bg-brand-50 p-3 text-brand-600"><Icon size={22} aria-hidden="true" /></span>}
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-sm text-sm text-slate-500">{children}</p>}
      {action}
    </div>
  )
}
