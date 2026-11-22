import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Briefcase, LayoutDashboard, LineChart, LogOut, MoreHorizontal, Receipt, ShieldAlert, TrendingUp, User, Wallet } from 'lucide-react'
import { MOBILE_PRIMARY, ROUTES, titleFor } from '../lib/routes'
import { useAuth } from '../lib/auth.jsx'
import { PageSkeleton } from './Skeleton.jsx'

const ICONS = { '/': LayoutDashboard, '/budgeting': Wallet, '/scam': ShieldAlert, '/invest': TrendingUp, '/tax': Receipt, '/market': LineChart, '/business': Briefcase, '/profile': User }
export const NAV = ROUTES.map(([to, label]) => [to, label, ICONS[to]])
const side = ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
const tab = ({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'font-medium text-brand-700' : 'text-slate-500'}`

export default function Layout() {
  const { pathname } = useLocation(), { signOut } = useAuth(), mainRef = useRef(null)
  const [more, setMore] = useState(false)
  const primary = NAV.filter(([to]) => MOBILE_PRIMARY.includes(to)), secondary = NAV.filter(([to]) => !MOBILE_PRIMARY.includes(to))
  useEffect(() => { document.title = titleFor(pathname); setMore(false); window.scrollTo(0, 0); mainRef.current?.focus({ preventScroll: true }) }, [pathname]) // title + focus move for screen readers
  useEffect(() => { if (!more) return; const h = (e) => e.key === 'Escape' && setMore(false); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [more])
  const label = NAV.find(([to]) => to === pathname)?.[1] || 'ArthSathi'
  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">Skip to content</a>
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-screen">
        <div><div className="mb-6 text-xl font-bold text-brand-700">ArthSathi</div>
          <nav aria-label="Main" className="space-y-1">{NAV.map(([to, l, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={side}><Icon size={18} aria-hidden="true" />{l}</NavLink>)}</nav></div>
        <button className="btn-ghost w-full justify-start" onClick={signOut}><LogOut size={18} aria-hidden="true" />Log out</button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden"><span className="text-lg font-bold text-brand-700">ArthSathi</span><span className="text-sm text-slate-500">{label}</span></header>
        <main id="main" ref={mainRef} tabIndex={-1} className="p-4 pb-28 outline-none md:p-8 md:pb-8"><div className="mx-auto max-w-5xl"><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></div></main>
      </div>
      {more && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setMore(false)} />}
      {more && <div id="more-menu" className="fixed inset-x-0 bottom-16 z-40 mx-3 rounded-xl border border-slate-200 bg-white p-2 shadow-lg md:hidden"><ul>{secondary.map(([to, l, Icon]) => <li key={to}><NavLink to={to} className={side}><Icon size={18} aria-hidden="true" />{l}</NavLink></li>)}</ul></div>}
      <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
        {primary.slice(0, 3).map(([to, l, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={tab}><Icon size={20} aria-hidden="true" />{l.split(' ')[0]}</NavLink>)}
        <button className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${more || secondary.some(([to]) => to === pathname) ? 'font-medium text-brand-700' : 'text-slate-500'}`} aria-expanded={more} aria-controls="more-menu" onClick={() => setMore((m) => !m)}><MoreHorizontal size={20} aria-hidden="true" />More</button>
        {primary.slice(3).map(([to, l, Icon]) => <NavLink key={to} to={to} className={tab}><Icon size={20} aria-hidden="true" />{l}</NavLink>)}
      </nav>
    </div>
  )
}
