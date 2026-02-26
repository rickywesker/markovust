import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/examples', label: '3.1 Examples' },
  { path: '/definitions', label: '3.2 Definitions' },
  { path: '/transition', label: '3.3 Transition Prob.' },
  { path: '/more-examples', label: '3.4 More Examples' },
  { path: '/exercises', label: 'Exercises' },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Chapter 3
              </span>
              <span className="text-sm text-slate-400 hidden sm:inline">Markov Chain: Introduction</span>
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
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
        MATH 3425 - Stochastic Processes | Chapter 3: Markov Chain Introduction
      </footer>
    </div>
  )
}
