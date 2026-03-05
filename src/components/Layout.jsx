import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useState } from 'react'

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
  { path: '/exercises', label: 'Exercises' },
]

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
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Markov Chains
              </span>
              <span className="text-sm text-slate-400 hidden sm:inline">Chapters 3 & 4</span>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : 'text-slate-400'}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-800 p-4 flex flex-col gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : 'text-slate-400'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
        <PrevNextNav />
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
        MATH 3425 - Stochastic Processes | Chapters 3 & 4: Markov Chains
      </footer>
    </div>
  )
}
