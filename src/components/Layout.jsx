import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Wallet, ShieldAlert, TrendingUp, Receipt, LineChart, Briefcase, User } from 'lucide-react'
export const NAV = [
  ['/', 'Dashboard', LayoutDashboard], ['/budgeting', 'Budgeting', Wallet], ['/scam', 'Scam Detector', ShieldAlert],
  ['/invest', 'Invest Guide', TrendingUp], ['/tax', 'Tax', Receipt], ['/market', 'Market', LineChart],
  ['/business', 'Business', Briefcase], ['/profile', 'Profile', User],
]
const link = ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`
export default function Layout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-6 text-xl font-bold text-brand-700">ArthSathi</div>
        <nav className="space-y-1">{NAV.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={link}><Icon size={18} />{label}</NavLink>)}</nav>
      </aside>
      <main className="flex-1 p-4 pb-24 md:p-8"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
      <nav className="fixed inset-x-0 bottom-0 flex overflow-x-auto border-t border-slate-200 bg-white md:hidden">
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? 'text-brand-700' : 'text-slate-500'}`}><Icon size={20} />{label.split(' ')[0]}</NavLink>
        ))}
      </nav>
    </div>
  )
}
