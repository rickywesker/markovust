import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ------------------------------------------------------------------ */
/*  Reusable fade-in wrapper triggered on scroll                       */
/* ------------------------------------------------------------------ */
function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  1. Stochastic Process - animated SVG timeline                      */
/* ------------------------------------------------------------------ */
function StochasticTimeline() {
  const points = [0, 1, 2, 3, 4, 5]
  return (
    <div className="flex justify-center my-6 overflow-x-auto">
      <svg viewBox="-10 0 420 90" className="w-full max-w-lg" aria-label="Timeline of random variables">
        {/* axis */}
        <motion.line
          x1="0" y1="60" x2="400" y2="60"
          stroke="#64748b" strokeWidth="2"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        />
        {/* arrowhead */}
        <polygon points="400,55 400,65 412,60" fill="#64748b" />

        {points.map((t, i) => (
          <g key={t}>
            {/* tick */}
            <motion.line
              x1={40 + i * 65} y1="55" x2={40 + i * 65} y2="65"
              stroke="#94a3b8" strokeWidth="2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.12 }}
            />
            {/* t label */}
            <motion.text
              x={40 + i * 65} y="80" textAnchor="middle"
              fill="#94a3b8" fontSize="13" fontFamily="serif"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.12 }}
            >
              {t}
            </motion.text>
            {/* random variable bubble */}
            <motion.circle
              cx={40 + i * 65} cy="34" r="14"
              fill="#6366f1" fillOpacity="0.25" stroke="#818cf8" strokeWidth="1.5"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', delay: 0.5 + i * 0.12 }}
            />
            <motion.text
              x={40 + i * 65} y="39" textAnchor="middle"
              fill="#c7d2fe" fontSize="12" fontStyle="italic" fontFamily="serif"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 + i * 0.12 }}
            >
              X
              <tspan fontSize="9" dy="3">{t}</tspan>
            </motion.text>
          </g>
        ))}
        {/* axis label */}
        <text x="412" y="80" fill="#64748b" fontSize="13" fontStyle="italic" fontFamily="serif">t</text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  2. State Space - discrete vs continuous visual                     */
/* ------------------------------------------------------------------ */
function StateSpaceVisual() {
  const [mode, setMode] = useState('discrete')
  const states = [0, 1, 2, 3, 4, 5]

  return (
    <div className="my-6">
      <div className="flex gap-3 mb-4 justify-center">
        <button
          onClick={() => setMode('discrete')}
          className={mode === 'discrete' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
        >
          Discrete
        </button>
        <button
          onClick={() => setMode('continuous')}
          className={mode === 'continuous' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
        >
          Continuous
        </button>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <svg viewBox="-10 0 380 70" className="w-full max-w-md" aria-label="State space visualization">
          <AnimatePresence mode="wait">
            {mode === 'discrete' ? (
              <motion.g
                key="discrete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {states.map((s, i) => (
                  <g key={s}>
                    <motion.circle
                      cx={30 + i * 60} cy="35" r="20"
                      fill="#6366f1" fillOpacity="0.2" stroke="#818cf8" strokeWidth="2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: i * 0.08 }}
                    />
                    <motion.text
                      x={30 + i * 60} y="40" textAnchor="middle"
                      fill="#e0e7ff" fontSize="16" fontWeight="600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                    >
                      {s}
                    </motion.text>
                  </g>
                ))}
                <text x="365" y="40" fill="#64748b" fontSize="14">...</text>
              </motion.g>
            ) : (
              <motion.g
                key="continuous"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <defs>
                  <linearGradient id="contGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <motion.line
                  x1="20" y1="35" x2="340" y2="35"
                  stroke="url(#contGrad)" strokeWidth="5" strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6 }}
                />
                <polygon points="340,30 340,40 354,35" fill="#a78bfa" opacity="0.8" />
                <motion.text
                  x="10" y="55" fill="#94a3b8" fontSize="13" fontFamily="serif"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                >
                  {'\u2212\u221E'}
                </motion.text>
                <motion.text
                  x="340" y="55" fill="#94a3b8" fontSize="13" fontFamily="serif"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                >
                  {'+\u221E'}
                </motion.text>
                <motion.text
                  x="180" y="22" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontStyle="italic"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                >
                  all real numbers
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  3. Markov Property interactive demo                                */
/* ------------------------------------------------------------------ */
function MarkovPropertyDemo() {
  const [showProperty, setShowProperty] = useState(false)
  const nodes = [
    { label: 'X_0', x: 50 },
    { label: 'X_1', x: 130 },
    { label: 'X_2', x: 210 },
    { label: 'X_3', x: 290 },
    { label: 'X_4', x: 370 },
    { label: 'X_5', x: 450 },
  ]
  const presentIdx = 3 // X_3 is "present"

  const handleToggle = useCallback(() => {
    setShowProperty(prev => !prev)
  }, [])

  return (
    <div className="my-6">
      <div className="flex justify-center mb-4">
        <button onClick={handleToggle} className="btn-primary text-sm">
          {showProperty ? 'Reset' : 'Show Markov Property'}
        </button>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <svg viewBox="0 0 520 120" className="w-full max-w-xl" aria-label="Markov property visualization">
          {/* connection lines */}
          {nodes.slice(0, -1).map((n, i) => {
            const isPastEdge = i < presentIdx - 1
            const isPresentEdge = i === presentIdx - 1
            const isFutureEdge = i >= presentIdx

            let strokeColor = '#64748b'
            if (showProperty) {
              if (isPastEdge) strokeColor = '#334155'
              else if (isPresentEdge) strokeColor = '#22c55e'
              else if (isFutureEdge) strokeColor = '#3b82f6'
            }

            return (
              <motion.line
                key={`edge-${i}`}
                x1={n.x} y1="55" x2={nodes[i + 1].x} y2="55"
                stroke={strokeColor}
                strokeWidth={isPresentEdge && showProperty ? 3 : 2}
                animate={{
                  opacity: showProperty && isPastEdge ? 0.2 : 1,
                  stroke: strokeColor,
                }}
                transition={{ duration: 0.6 }}
              />
            )
          })}

          {/* curtain effect for past when showing property */}
          <AnimatePresence>
            {showProperty && (
              <motion.rect
                x="0" y="20" width={nodes[presentIdx].x - 40} height="80"
                rx="8"
                fill="#0f172a" fillOpacity="0.7"
                stroke="#334155" strokeWidth="1" strokeDasharray="4 4"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                style={{ originX: 1 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>

          {/* nodes */}
          {nodes.map((n, i) => {
            const isPast = i < presentIdx
            const isPresent = i === presentIdx
            const isFuture = i > presentIdx

            let fillColor = '#1e293b'
            let strokeColor = '#64748b'
            let textColor = '#cbd5e1'
            let glowRadius = 0

            if (showProperty) {
              if (isPast) {
                fillColor = '#1e293b'
                strokeColor = '#334155'
                textColor = '#475569'
              } else if (isPresent) {
                fillColor = '#052e16'
                strokeColor = '#22c55e'
                textColor = '#86efac'
                glowRadius = 8
              } else if (isFuture) {
                fillColor = '#0c1e3d'
                strokeColor = '#3b82f6'
                textColor = '#93c5fd'
                glowRadius = 6
              }
            }

            return (
              <g key={n.label}>
                {/* glow */}
                {showProperty && (isPresent || isFuture) && (
                  <motion.circle
                    cx={n.x} cy="55" r={22 + glowRadius}
                    fill="none" stroke={strokeColor} strokeOpacity="0.3" strokeWidth="2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <motion.circle
                  cx={n.x} cy="55" r="22"
                  animate={{
                    fill: fillColor,
                    stroke: strokeColor,
                    opacity: showProperty && isPast ? 0.4 : 1,
                  }}
                  strokeWidth="2"
                  transition={{ duration: 0.6 }}
                />
                <motion.text
                  x={n.x} y="59" textAnchor="middle"
                  fontSize="13" fontFamily="serif" fontStyle="italic"
                  animate={{ fill: textColor, opacity: showProperty && isPast ? 0.35 : 1 }}
                  transition={{ duration: 0.6 }}
                >
                  X<tspan fontSize="9" dy="3">{i}</tspan>
                </motion.text>
              </g>
            )
          })}

          {/* labels */}
          <AnimatePresence>
            {showProperty && (
              <>
                <motion.text
                  x={nodes[1].x} y="105" textAnchor="middle"
                  fill="#475569" fontSize="12" fontWeight="500"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ delay: 0.3 }}
                >
                  Past (irrelevant)
                </motion.text>
                <motion.text
                  x={nodes[presentIdx].x} y="105" textAnchor="middle"
                  fill="#22c55e" fontSize="12" fontWeight="600"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ delay: 0.4 }}
                >
                  Present
                </motion.text>
                <motion.text
                  x={(nodes[4].x + nodes[5].x) / 2} y="105" textAnchor="middle"
                  fill="#3b82f6" fontSize="12" fontWeight="500"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ delay: 0.5 }}
                >
                  Future
                </motion.text>
              </>
            )}
          </AnimatePresence>

        </svg>
      </div>

      {/* re-render the nicer node labels over the SVG text using KaTeX  */}
      <div className="flex justify-center gap-1 -mt-2 mb-2 overflow-x-auto">
        {nodes.map((n, i) => {
          let color = 'text-slate-300'
          let opacity = 'opacity-100'
          if (showProperty) {
            if (i < presentIdx) { color = 'text-slate-600'; opacity = 'opacity-40' }
            else if (i === presentIdx) color = 'text-green-400'
            else color = 'text-blue-400'
          }
          return (
            <span key={i} className={`w-20 text-center text-sm transition-all duration-500 ${color} ${opacity}`}>
              <InlineMath math={n.label} />
            </span>
          )
        })}
      </div>

      <AnimatePresence>
        {showProperty && (
          <motion.div
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4 text-sm text-amber-200/90"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="font-semibold text-amber-400">Caution:</span>{' '}
            The future <InlineMath math="X_s \; (s > t)" /> is <em>not</em> independent of the past{' '}
            <InlineMath math="X_s \; (s < t)" /> in general. It is only{' '}
            <em>conditionally</em> independent <em>given</em> the present{' '}
            <InlineMath math="X_t" />.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  5. Discrete vs Continuous Time visual                              */
/* ------------------------------------------------------------------ */
function TimelineTypes() {
  return (
    <div className="grid md:grid-cols-2 gap-6 my-6">
      {/* Discrete time */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-indigo-300 mb-3">Discrete Time</h4>
        <div className="flex justify-center mb-3">
          <svg viewBox="-5 0 260 50" className="w-full max-w-xs" aria-label="Discrete time axis">
            <line x1="0" y1="25" x2="240" y2="25" stroke="#475569" strokeWidth="1.5" />
            <polygon points="240,21 240,29 252,25" fill="#475569" />
            {[0, 1, 2, 3, 4, 5].map((t, i) => (
              <g key={t}>
                <motion.circle
                  cx={15 + i * 40} cy="25" r="5"
                  fill="#818cf8"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                />
                <text x={15 + i * 40} y="44" textAnchor="middle" fill="#94a3b8" fontSize="11">{t}</text>
              </g>
            ))}
            <text x="225" y="44" fill="#94a3b8" fontSize="11">...</text>
          </svg>
        </div>
        <p className="text-slate-400 text-sm">
          Time domain: <InlineMath math="\{0, 1, 2, \ldots\}" />
        </p>
      </div>

      {/* Continuous time */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-purple-300 mb-3">Continuous Time</h4>
        <div className="flex justify-center mb-3">
          <svg viewBox="-5 0 260 50" className="w-full max-w-xs" aria-label="Continuous time axis">
            <defs>
              <linearGradient id="timeLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <motion.line
              x1="10" y1="25" x2="240" y2="25"
              stroke="url(#timeLine)" strokeWidth="4" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            />
            <polygon points="240,20 240,30 254,25" fill="#c084fc" />
            <circle cx="10" cy="25" r="4" fill="#a78bfa" />
            <text x="10" y="44" textAnchor="middle" fill="#94a3b8" fontSize="11">0</text>
          </svg>
        </div>
        <p className="text-slate-400 text-sm">
          Time domain: <InlineMath math="[0, \infty)" />
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  6. Defining Equation animated reveal                               */
/* ------------------------------------------------------------------ */
function DefiningEquation() {
  const [step, setStep] = useState(0) // 0=full, 1=strikethrough, 2=simplified

  const advance = useCallback(() => {
    setStep(prev => (prev + 1) % 3)
  }, [])

  return (
    <div className="my-6">
      <div className="flex justify-center mb-4">
        <button onClick={advance} className="btn-primary text-sm">
          {step === 0 ? 'Simplify' : step === 1 ? 'Show Result' : 'Reset'}
        </button>
      </div>

      <div className="math-block relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <BlockMath math="P(X_{n+1} = j \mid X_0 = i_0,\; X_1 = i_1,\; \ldots,\; X_n = i) = \; ?" />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div
              key="strike"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <BlockMath math="P(X_{n+1} = j \mid \cancel{X_0 = i_0,}\; \cancel{X_1 = i_1,}\; \cancel{\ldots,}\; X_n = i)" />
              <motion.p
                className="text-center text-sm text-amber-300 mt-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                The history before time n is irrelevant!
              </motion.p>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="simple"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <BlockMath math="P(X_{n+1} = j \mid X_0 = i_0,\; X_1 = i_1,\; \ldots,\; X_n = i) = P(X_{n+1} = j \mid X_n = i)" />
              <motion.p
                className="text-center text-emerald-400 text-sm font-medium mt-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Only the current state matters.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */
export default function Definitions() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <FadeIn>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          3.2 &mdash; Definitions
        </h1>
        <p className="mt-3 text-slate-400 text-lg leading-relaxed">
          Building the formal language of Markov chains, one definition at a time.
        </p>
      </FadeIn>

      {/* ---- Definition 1: Stochastic Process ---- */}
      <FadeIn>
        <div className="section-card">
          <div className="definition-box">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Definition &mdash; Stochastic Process</h3>
            <p className="text-slate-300 leading-relaxed">
              A <strong>stochastic process</strong> is a family of random variables{' '}
              <InlineMath math="\{X_t : t \in T\}" /> defined on a common probability space and
              indexed by a parameter <InlineMath math="t" /> (usually representing time).
            </p>
          </div>

          <p className="text-slate-400 text-sm mt-4 mb-2">
            Visualize it: each point on the timeline carries its own random variable.
          </p>
          <StochasticTimeline />
        </div>
      </FadeIn>

      {/* ---- Definition 2: State Space ---- */}
      <FadeIn>
        <div className="section-card">
          <div className="definition-box">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Definition &mdash; State Space</h3>
            <p className="text-slate-300 leading-relaxed">
              The <strong>state space</strong> <InlineMath math="S" /> is the set of all possible
              values that the random variables <InlineMath math="X_t" /> can take. It can be
              discrete (countable) or continuous (uncountable).
            </p>
          </div>

          <p className="text-slate-400 text-sm mt-4 mb-1">
            Toggle between discrete and continuous state spaces:
          </p>
          <StateSpaceVisual />
        </div>
      </FadeIn>

      {/* ---- Definition 3: Markov Process ---- */}
      <FadeIn>
        <div className="section-card">
          <div className="definition-box">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Definition &mdash; Markov Process</h3>
            <p className="text-slate-300 leading-relaxed">
              A stochastic process <InlineMath math="\{X_t\}" /> is a <strong>Markov process</strong> if,
              at each time <InlineMath math="t" />, the future{' '}
              <InlineMath math="\{X_s : s > t\}" /> is conditionally independent of the past{' '}
              <InlineMath math="\{X_s : s < t\}" /> given the present <InlineMath math="X_t" />.
            </p>
          </div>

          <p className="text-slate-400 text-sm mt-4 mb-1">
            Click the button to see how the past becomes irrelevant once we know the present:
          </p>
          <MarkovPropertyDemo />

          {/* Things to Try */}
          <div className="mt-6 p-4 rounded-xl border border-teal-500/30 bg-teal-500/5">
            <h4 className="text-teal-400 font-semibold mb-2">Things to Try</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
              <li>Click &quot;Show Markov Property&quot; and notice how the past dims. The key insight: knowing the present state tells you everything about the future.</li>
              <li>Think of a real-life example: if you know today&apos;s weather, does knowing last week&apos;s weather help predict tomorrow?</li>
              <li>Caution: &quot;conditionally independent&quot; is not the same as &quot;independent.&quot; Can you think of why?</li>
            </ul>
          </div>
        </div>
      </FadeIn>

      {/* ---- Definition 4: Markov Chain ---- */}
      <FadeIn>
        <div className="section-card">
          <div className="definition-box">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">Definition &mdash; Markov Chain (MC)</h3>
            <p className="text-slate-300 leading-relaxed">
              A <strong>Markov chain</strong> is a Markov process whose state space is{' '}
              <em>discrete</em> (countable). The states are typically labeled{' '}
              <InlineMath math="0, 1, 2, \ldots" />
            </p>
          </div>
        </div>
      </FadeIn>

      {/* ---- Definition 5: Discrete vs Continuous Time ---- */}
      <FadeIn>
        <div className="section-card">
          <div className="definition-box">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">
              Definition &mdash; Discrete-Time vs Continuous-Time MC
            </h3>
            <p className="text-slate-300 leading-relaxed">
              A <strong>discrete-time MC</strong> has time index set{' '}
              <InlineMath math="T = \{0, 1, 2, \ldots\}" />. A{' '}
              <strong>continuous-time MC</strong> has{' '}
              <InlineMath math="T = [0, \infty)" />.
            </p>
          </div>

          <TimelineTypes />

          {/* Classification examples */}
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Quick classification of earlier examples:</h4>

            <div className="grid sm:grid-cols-2 gap-3">
              <motion.div
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm text-emerald-300 font-medium">Coin Toss &amp; Mickey Maze</p>
                <p className="text-xs text-slate-400 mt-1">
                  Discrete state space + discrete time = <strong className="text-emerald-400">Discrete-Time MC</strong>
                </p>
              </motion.div>

              <motion.div
                className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm text-blue-300 font-medium">Poisson Process</p>
                <p className="text-xs text-slate-400 mt-1">
                  Discrete state space + continuous time = <strong className="text-blue-400">Continuous-Time MC</strong>
                </p>
              </motion.div>

              <motion.div
                className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 sm:col-span-2"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm text-purple-300 font-medium">Brownian Motion</p>
                <p className="text-xs text-slate-400 mt-1">
                  Continuous state space + continuous time = <strong className="text-purple-400">Continuous Markov Process</strong>{' '}
                  (not a MC since the state space is not discrete)
                </p>
              </motion.div>
            </div>
          </div>

          {/* Things to Try */}
          <div className="mt-6 p-4 rounded-xl border border-teal-500/30 bg-teal-500/5">
            <h4 className="text-teal-400 font-semibold mb-2">Things to Try</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
              <li>Which examples have discrete state space? Which have continuous? Does time domain always match state space type?</li>
            </ul>
          </div>
        </div>
      </FadeIn>

      {/* ---- Definition 6: The Defining Equation ---- */}
      <FadeIn>
        <div className="section-card">
          <div className="definition-box">
            <h3 className="text-lg font-semibold text-indigo-300 mb-2">
              The Defining Equation
            </h3>
            <p className="text-slate-300 leading-relaxed">
              For a discrete-time Markov chain, the <strong>Markov property</strong> states:
            </p>
          </div>

          <p className="text-slate-400 text-sm mt-4 mb-1">
            Click to see the history terms drop away, leaving only the current state:
          </p>
          <DefiningEquation />

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 mt-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              In words: the probability of transitioning to state <InlineMath math="j" /> at
              time <InlineMath math="n{+}1" /> depends <em>only</em> on the current
              state <InlineMath math="i" /> at time <InlineMath math="n" />, regardless of the
              path taken to reach state <InlineMath math="i" />.
              This is sometimes described as the process being <strong>"memoryless."</strong>
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Key Takeaways */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5"
      >
        <h3 className="text-xl font-bold text-amber-400 mb-3">Key Takeaways</h3>
        <ul className="space-y-2 text-slate-300">
          <li>The <strong>Markov property</strong>: the future depends only on the present state, not on how you got there.</li>
          <li><em>Conditionally independent</em> given the present is <strong>not</strong> the same as independent -- the past and future can still be correlated.</li>
          <li>Discrete time + discrete (countable) state space = <strong>Markov chain</strong>. This is our focus throughout the chapter.</li>
        </ul>
      </motion.div>
    </div>
  )
}
