import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/examples', label: '3.1 Examples' },
  { path: '/definitions', label: '3.2 Definitions' },
  { path: '/transition', label: '3.3 Transition Prob.' },
  { path: '/more-examples', label: '3.4 More Examples' },
  { path: '/first-step', label: '3.5 First Step' },
  { path: '/branching', label: '3.6 Branching' },
  { path: '/regular-mc', label: '4.1-4.2 Regular MC' },
  { path: '/classification', label: '4.3-4.4 Classification' },
  { path: '/poisson-process', label: '5.1-5.3 Poisson Process' },
  { path: '/pure-birth', label: '6.1 Pure Birth' },
  { path: '/birth-death', label: '6.2-6.3 Birth & Death' },
  { path: '/renewal-basics', label: '7.1-7.2 Renewal Basics' },
  { path: '/renewal-asymptotic', label: '7.3 Renewal Asymptotic' },
  { path: '/exercises', label: 'Exercises' },
  { path: '/questions', label: 'Questions' },
  { path: '/progress', label: 'My Progress' },
]

const navGroups = [
  { items: [{ path: '/', label: 'Home' }] },
  {
    title: 'Chapter 3',
    items: [
      { path: '/examples', label: '3.1 Examples' },
      { path: '/definitions', label: '3.2 Definitions' },
      { path: '/transition', label: '3.3 Transition Prob.' },
      { path: '/more-examples', label: '3.4 More Examples' },
      { path: '/first-step', label: '3.5 First Step' },
      { path: '/branching', label: '3.6 Branching' },
    ],
  },
  {
    title: 'Chapter 4',
    items: [
      { path: '/regular-mc', label: '4.1-4.2 Regular MC' },
      { path: '/classification', label: '4.3-4.4 Classification' },
    ],
  },
  {
    title: 'Chapter 5',
    items: [
      { path: '/poisson-process', label: '5.1-5.3 Poisson Process' },
    ],
  },
  {
    title: 'Chapter 6',
    items: [
      { path: '/pure-birth', label: '6.1 Pure Birth' },
      { path: '/birth-death', label: '6.2-6.3 Birth & Death' },
    ],
  },
  {
    title: 'Chapter 7',
    items: [
      { path: '/renewal-basics', label: '7.1-7.2 Renewal Basics' },
      { path: '/renewal-asymptotic', label: '7.3 Renewal Asymptotic' },
    ],
  },
  { items: [{ path: '/exercises', label: 'Exercises' }] },
  {
    title: 'Practice',
    items: [
      { path: '/questions', label: 'Questions' },
      { path: '/progress', label: 'My Progress' },
    ],
  },
]

const linkBase = 'block px-4 py-2.5 pl-6 rounded-r-lg text-sm text-slate-400 border-l-[3px] border-transparent hover:text-white hover:bg-slate-800/60 transition-all duration-150'
const linkActive = 'border-l-[3px] !border-indigo-500 bg-indigo-500/10 !text-white font-medium'

function SidebarContent({ onNavigate }) {
  const { user, signOut } = useAuth()

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Markov Chains
        </span>
        <div className="text-sm text-slate-400 mt-1">Chapters 3-7</div>
      </div>
      <hr className="border-slate-800 mx-4" />
      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi < navGroups.length - 1 ? 'mb-6' : ''}>
            {group.title && (
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 px-4 mb-2">
                {group.title}
              </div>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-slate-800">
        {user ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 truncate max-w-[140px]">{user.email}</span>
            <button onClick={() => { signOut(); onNavigate?.(); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer">Logout</button>
          </div>
        ) : (
          <NavLink to="/login" onClick={onNavigate} className="text-sm text-indigo-400 hover:underline">Login</NavLink>
        )}
      </div>
    </>
  )
}

function PrevNextNav() {
  const { pathname } = useLocation()
  const idx = navItems.findIndex(item => item.path === pathname)
  const prev = idx > 0 ? navItems[idx - 1] : null
  const next = idx < navItems.length - 1 ? navItems[idx + 1] : null

  if (!prev && !next) return null

  return (
    <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-800">
      {prev ? (
        <Link to={prev.path} className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors">
          <span className="text-lg">&larr;</span>
          <span className="text-sm">Previous: {prev.label}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link to={next.path} className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors">
          <span className="text-sm">Next: {next.label}</span>
          <span className="text-lg">&rarr;</span>
        </Link>
      ) : <span />}
    </div>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 h-14 lg:hidden flex items-center px-4 justify-between">
        <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Markov Chains
        </span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-slate-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-md border-r border-slate-800 z-50 lg:hidden flex flex-col transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent onNavigate={() => setMenuOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="lg:ml-64">
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
          <PrevNextNav />
        </main>
        <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
          MATH 3425 - Stochastic Processes | Chapters 3-7: Markov Chains &amp; Renewal Theory
        </footer>
      </div>
    </div>
  )
}
