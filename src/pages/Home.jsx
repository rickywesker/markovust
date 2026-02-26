import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef, useCallback, useState } from 'react'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ──────────────────────────────────────────────
   Animated State Diagram — 3-state Markov chain
   drawn with SVG, transitions animate via framer-motion
   ────────────────────────────────────────────── */

const STATES = [
  { id: 0, label: 'A', cx: 100, cy: 70, color: '#818cf8' },
  { id: 1, label: 'B', cx: 260, cy: 70, color: '#34d399' },
  { id: 2, label: 'C', cx: 180, cy: 210, color: '#fbbf24' },
]

const TRANSITIONS = [
  { from: 0, to: 1, prob: '0.6', label: '0.6' },
  { from: 0, to: 2, prob: '0.4', label: '0.4' },
  { from: 1, to: 0, prob: '0.3', label: '0.3' },
  { from: 1, to: 2, prob: '0.7', label: '0.7' },
  { from: 2, to: 0, prob: '0.5', label: '0.5' },
  { from: 2, to: 1, prob: '0.5', label: '0.5' },
]

function StateDiagram() {
  const [active, setActive] = useState(0)
  const [transitioning, setTransitioning] = useState(null)
  const timerRef = useRef(null)

  const stepOnce = useCallback(() => {
    setActive(prev => {
      const outgoing = TRANSITIONS.filter(t => t.from === prev)
      const r = Math.random()
      let cumulative = 0
      for (const t of outgoing) {
        cumulative += parseFloat(t.prob)
        if (r < cumulative) {
          setTransitioning({ from: prev, to: t.to })
          setTimeout(() => setTransitioning(null), 600)
          return t.to
        }
      }
      return prev
    })
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(stepOnce, 1500)
    return () => clearInterval(timerRef.current)
  }, [stepOnce])

  const R = 26

  function arrowPath(from, to) {
    const dx = to.cx - from.cx
    const dy = to.cy - from.cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const nx = dx / dist
    const ny = dy / dist

    const startX = from.cx + nx * R
    const startY = from.cy + ny * R
    const endX = to.cx - nx * (R + 8)
    const endY = to.cy - ny * (R + 8)

    // curve offset perpendicular to line
    const perpX = -ny * 28
    const perpY = nx * 28
    const cpX = (startX + endX) / 2 + perpX
    const cpY = (startY + endY) / 2 + perpY

    return { startX, startY, endX, endY, cpX, cpY }
  }

  return (
    <svg viewBox="0 0 360 280" className="w-full max-w-sm mx-auto">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
        </marker>
        <marker
          id="arrowhead-active"
          markerWidth="8"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#818cf8" />
        </marker>
      </defs>

      {TRANSITIONS.map((t, i) => {
        const from = STATES[t.from]
        const to = STATES[t.to]
        const { startX, startY, endX, endY, cpX, cpY } = arrowPath(from, to)
        const isActive = transitioning &&
          transitioning.from === t.from && transitioning.to === t.to

        return (
          <g key={i}>
            <path
              d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
              fill="none"
              stroke={isActive ? '#818cf8' : '#475569'}
              strokeWidth={isActive ? 2.5 : 1.5}
              markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
            <text
              x={cpX}
              y={cpY}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? '#c7d2fe' : '#94a3b8'}
              fontSize="12"
              fontWeight={isActive ? '600' : '400'}
              style={{ transition: 'fill 0.3s' }}
            >
              {t.label}
            </text>
          </g>
        )
      })}

      {STATES.map(s => {
        const isActive = active === s.id
        return (
          <g key={s.id}>
            <motion.circle
              cx={s.cx}
              cy={s.cy}
              r={R}
              fill={isActive ? s.color : '#1e293b'}
              stroke={s.color}
              strokeWidth={isActive ? 3 : 2}
              animate={{
                scale: isActive ? 1.12 : 1,
                fillOpacity: isActive ? 1 : 0.15,
              }}
              transition={{ duration: 0.3 }}
              style={{ transformOrigin: `${s.cx}px ${s.cy}px` }}
            />
            <text
              x={s.cx}
              y={s.cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? '#0f172a' : s.color}
              fontSize="16"
              fontWeight="700"
              style={{ transition: 'fill 0.3s', pointerEvents: 'none' }}
            >
              {s.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ──────────────────────────────────────────────
   Section Cards — Roadmap items
   ────────────────────────────────────────────── */

const sections = [
  {
    path: '/examples',
    number: '3.1',
    title: 'Motivating Examples',
    desc: 'Coin tossing and Mickey in a maze -- two concrete scenarios that naturally give rise to Markov chains.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3c-1.5 3-1.5 6 0 9s1.5 6 0 9" />
        <path d="M3 12h18" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-400',
  },
  {
    path: '/definitions',
    number: '3.2',
    title: 'Definitions',
    desc: 'Formal definition of discrete-time Markov chains, state spaces, the Markov property, and stochastic matrices.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    gradient: 'from-indigo-500 to-blue-500',
    iconColor: 'text-indigo-400',
  },
  {
    path: '/transition',
    number: '3.3',
    title: 'Transition Probabilities',
    desc: 'One-step and n-step transition matrices, Chapman-Kolmogorov equations, and matrix computations.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    gradient: 'from-purple-500 to-fuchsia-500',
    iconColor: 'text-purple-400',
  },
  {
    path: '/more-examples',
    number: '3.4',
    title: 'More Examples',
    desc: 'Inventory model, Ehrenfest diffusion, Gambler\'s Ruin, weather model, and more classic applications.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-500',
    iconColor: 'text-amber-400',
  },
  {
    path: '/exercises',
    number: '',
    title: 'Exercises',
    desc: 'Practice problems to test your understanding of Markov chain fundamentals.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
    gradient: 'from-rose-500 to-pink-500',
    iconColor: 'text-rose-400',
  },
]

/* ──────────────────────────────────────────────
   Animation variants
   ────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
}

/* ──────────────────────────────────────────────
   Home Page
   ────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="space-y-16 pb-8">
      {/* ── Hero ── */}
      <section className="text-center pt-8 sm:pt-14">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-sm uppercase tracking-widest text-indigo-400 font-semibold mb-4"
        >
          MATH 3425 &mdash; Stochastic Processes
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
        >
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Chapter 3
          </span>
          <br />
          <span className="text-slate-100">Markov Chain Introduction</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto italic"
        >
          &ldquo;Whatever happened in the past, be it glory or misery, be Markov!&rdquo;
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <Link to="/examples" className="btn-primary inline-flex items-center gap-2">
            Get Started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link to="/definitions" className="btn-secondary inline-flex items-center gap-2">
            Jump to Definitions
          </Link>
        </motion.div>
      </section>

      {/* ── What is a Markov Chain? ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
        className="section-card"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            What is a Markov Chain?
          </span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <p className="text-slate-300 leading-relaxed">
              A <strong className="text-white">Markov chain</strong> is a stochastic
              process where the future state depends only on the <em>current</em> state
              -- not on how we got here. This is known as the{' '}
              <strong className="text-indigo-300">Markov property</strong> (or
              memorylessness).
            </p>

            <p className="text-slate-300 leading-relaxed">
              Formally, given a sequence of random variables{' '}
              <InlineMath math="X_0, X_1, X_2, \ldots" /> taking values in a
              countable state space <InlineMath math="S" />, we require:
            </p>

            <div className="math-block">
              <BlockMath math={String.raw`P(X_{n+1} = j \mid X_n = i, X_{n-1} = i_{n-1}, \ldots, X_0 = i_0) = P(X_{n+1} = j \mid X_n = i)`} />
            </div>

            <p className="text-slate-400 text-sm leading-relaxed">
              The right-hand side, <InlineMath math="P(X_{n+1} = j \mid X_n = i)" />,
              is the <strong className="text-slate-200">one-step transition probability</strong> from
              state <InlineMath math="i" /> to state <InlineMath math="j" />.
              We often write it as <InlineMath math="P_{ij}" />.
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500 text-center mb-3">
              Live 3-state Markov chain simulation
            </p>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <StateDiagram />
            </div>
            <p className="text-xs text-slate-600 text-center mt-2">
              Watch the chain transition between states A, B, and C
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Roadmap ── */}
      <section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Chapter Roadmap
          </h2>
          <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            Explore each section at your own pace. Every section includes interactive
            visualizations and worked examples.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((s, i) => (
            <motion.div
              key={s.path}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={fadeUp}
            >
              <Link
                to={s.path}
                className="group block section-card h-full hover:border-slate-600 transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 mt-0.5 ${s.iconColor}`}>
                    {s.icon}
                  </div>
                  <div>
                    {s.number && (
                      <span className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>
                        Section {s.number}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors mt-0.5">
                      {s.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center text-sm font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  Explore
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Key Properties Preview ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
        className="section-card"
      >
        <h2 className="text-xl font-bold text-slate-100 mb-5">
          Key Ideas You Will Learn
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-200">Transition Matrices</h3>
            <p className="text-sm text-slate-400">
              Encode all one-step probabilities <InlineMath math="P_{ij}" /> in a
              single stochastic matrix <InlineMath math="\mathbf{P}" />.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-200">Chapman-Kolmogorov</h3>
            <p className="text-sm text-slate-400">
              Compute <InlineMath math="n" />-step transition probabilities
              via <InlineMath math="\mathbf{P}^{(n)} = \mathbf{P}^n" />.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-200">Markov Property</h3>
            <p className="text-sm text-slate-400">
              The future is independent of the past, given the present:
              memorylessness is the defining feature.
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
