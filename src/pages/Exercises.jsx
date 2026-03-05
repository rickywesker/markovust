import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ─── tiny helpers ─── */
const Stars = ({ n }) => (
  <span className="text-amber-400 text-lg tracking-wide" aria-label={`Difficulty: ${n} out of 3`}>
    {'★'.repeat(n)}{'☆'.repeat(3 - n)}
  </span>
)

function HintButton({ index, revealed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        revealed
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer'
      }`}
    >
      {revealed ? `Hint ${index + 1}` : `Show Hint ${index + 1}`}
    </button>
  )
}

function HintSection({ hints }) {
  const [revealed, setRevealed] = useState([])

  const reveal = (i) => {
    if (!revealed.includes(i)) setRevealed(prev => [...prev, i])
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {hints.map((_, i) => (
          <HintButton key={i} index={i} revealed={revealed.includes(i)} onClick={() => reveal(i)} />
        ))}
      </div>
      <AnimatePresence>
        {hints.map((hint, i) =>
          revealed.includes(i) ? (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-slate-300 text-sm"
            >
              <span className="font-semibold text-amber-400">Hint {i + 1}: </span>
              {hint}
            </motion.div>
          ) : null
        )}
      </AnimatePresence>
    </div>
  )
}

function SolutionToggle({ children, onReveal }) {
  const [show, setShow] = useState(false)
  return (
    <div className="mt-6">
      {!show && (
        <button
          onClick={() => { setShow(true); onReveal?.() }}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Show Solution
        </button>
      )}
      {!show && (
        <p className="text-xs text-slate-500 mt-1 italic">Try it yourself first!</p>
      )}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-6 mt-2"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-emerald-400 font-semibold">Solution</h4>
              <button onClick={() => setShow(false)} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer">
                Hide
              </button>
            </div>
            <div className="text-slate-300 text-sm leading-relaxed space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════ EXERCISE 3.1 ═══════════════════ */

const DEN_POSITIONS = {
  A: { x: 200, y: 60 },
  B: { x: 80, y: 250 },
  C: { x: 320, y: 250 },
}

function BunnyDiagram({ bunnyDen }) {
  const dens = [
    { id: 'A', color: '#22c55e', x: 200, y: 60 },
    { id: 'B', color: '#f97316', x: 80, y: 250 },
    { id: 'C', color: '#f97316', x: 320, y: 250 },
  ]

  // Arrow helper: draw a curved arrow from one den to another, offset from center
  const makeArrow = (from, to, label, side = 0) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const r = 28
    // unit vector
    const ux = dx / len, uy = dy / len
    // perpendicular
    const px = -uy, py = ux
    const offset = side * 14
    const sx = from.x + ux * r + px * offset
    const sy = from.y + uy * r + py * offset
    const ex = to.x - ux * r + px * offset
    const ey = to.y - uy * r + py * offset
    // control point for slight curve
    const mx = (sx + ex) / 2 + px * (12 + Math.abs(side) * 6)
    const my = (sy + ey) / 2 + py * (12 + Math.abs(side) * 6)
    const path = `M${sx},${sy} Q${mx},${my} ${ex},${ey}`
    // label position
    const lx = mx + px * 10
    const ly = my + py * 10
    return { path, lx, ly, label, ex, ey, mx, my }
  }

  const arrows = [
    makeArrow(dens[1], dens[0], '0.9', 1),    // B → A
    makeArrow(dens[2], dens[0], '0.9', -1),   // C → A
    makeArrow(dens[1], dens[2], '0.1', 1),    // B → C
    makeArrow(dens[2], dens[1], '0.1', -1),   // C → B
    makeArrow(dens[0], dens[1], '1/2', 1),    // A → B
    makeArrow(dens[0], dens[2], '1/2', -1),   // A → C
  ]

  const bunnyPos = DEN_POSITIONS[bunnyDen] || DEN_POSITIONS.A

  return (
    <svg viewBox="0 0 400 310" className="w-full max-w-md mx-auto">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>

      {/* arrows */}
      {arrows.map((a, i) => (
        <g key={i}>
          <path d={a.path} fill="none" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
          <text x={a.lx} y={a.ly} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
            {a.label}
          </text>
        </g>
      ))}

      {/* dens */}
      {dens.map(d => (
        <g key={d.id}>
          <circle cx={d.x} cy={d.y} r="26" fill={d.color + '22'} stroke={d.color} strokeWidth="2.5" />
          <text x={d.x} y={d.y + 1} textAnchor="middle" dominantBaseline="middle" fill={d.color} fontSize="18" fontWeight="bold">
            {d.id}
          </text>
        </g>
      ))}

      {/* bunny */}
      <motion.text
        animate={{ x: bunnyPos.x, y: bunnyPos.y - 38 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="24"
      >
        🐰
      </motion.text>

      {/* note about A */}
      <text x="200" y="16" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontStyle="italic">
        Stays 2 nights, leaves on 3rd
      </text>
    </svg>
  )
}

function BunnySimulation() {
  // State machine: A1 (first night at A), A2 (second night at A), B, C
  const [state, setState] = useState('A1')
  const [history, setHistory] = useState(['A1'])
  const [running, setRunning] = useState(false)

  const step = useCallback(() => {
    setState(prev => {
      let next
      if (prev === 'A1') {
        next = 'A2'
      } else if (prev === 'A2') {
        next = Math.random() < 0.5 ? 'B' : 'C'
      } else if (prev === 'B') {
        next = Math.random() < 0.9 ? 'A1' : 'C'
      } else {
        next = Math.random() < 0.9 ? 'A1' : 'B'
      }
      setHistory(h => [...h.slice(-19), next])
      return next
    })
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(step, 900)
    return () => clearInterval(id)
  }, [running, step])

  const denForState = (s) => s.startsWith('A') ? 'A' : s

  return (
    <div className="space-y-4">
      <BunnyDiagram bunnyDen={denForState(state)} />

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setRunning(r => !r)}
          className="btn-primary text-sm"
        >
          {running ? 'Pause' : 'Simulate'}
        </button>
        <button
          onClick={() => { step() }}
          className="btn-secondary text-sm"
          disabled={running}
        >
          Step
        </button>
        <button
          onClick={() => { setRunning(false); setState('A1'); setHistory(['A1']) }}
          className="btn-secondary text-sm"
        >
          Reset
        </button>
      </div>

      <div className="text-center">
        <span className="text-slate-400 text-sm mr-2">Current expanded state:</span>
        <span className="font-mono text-indigo-400 font-bold">{state}</span>
        <span className="text-slate-500 text-sm ml-2">(den {denForState(state)})</span>
      </div>

      {/* history ribbon */}
      <div className="flex flex-wrap gap-1 justify-center">
        {history.map((s, i) => (
          <span
            key={i}
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              s.startsWith('A') ? 'bg-emerald-500/20 text-emerald-400'
                : s === 'B' ? 'bg-orange-500/20 text-orange-400'
                : 'bg-orange-500/20 text-orange-300'
            }`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function Exercise31({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.1 &mdash; Bunny Rabbit</h3>
        <Stars n={2} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          A bunny rabbit has three dens: <InlineMath math="A" />, <InlineMath math="B" />, and <InlineMath math="C" />,
          and likes den <InlineMath math="A" /> best. From either <InlineMath math="B" /> or <InlineMath math="C" />,
          it goes to <InlineMath math="A" /> with probability <InlineMath math="0.9" /> and to the other den with
          probability <InlineMath math="0.1" />.
        </p>
        <p>
          When it reaches <InlineMath math="A" />, it stays for <strong>2 nights</strong>, then on the
          3rd night goes to <InlineMath math="B" /> or <InlineMath math="C" /> each with
          probability <InlineMath math="1/2" />.
        </p>
        <p>
          Let <InlineMath math="X_n" /> be the den occupied on night <InlineMath math="n" />.
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>What is a suitable state space for <InlineMath math="\{X_n\}" />?</li>
          <li>Is <InlineMath math="\{X_n\}" /> a Markov chain on <InlineMath math="\{A, B, C\}" />?</li>
        </ol>
      </div>

      {/* Interactive diagram */}
      <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-2 text-center">Interactive Simulation</h4>
        <BunnySimulation />
      </div>

      <HintSection
        hints={[
          <span key="h1">Think about what happens at den <InlineMath math="A" /> — does the bunny behave the same way every night it is there?</span>,
          <span key="h2">The process <em>remembers</em> how long the bunny has been at <InlineMath math="A" />. The first night at <InlineMath math="A" /> it always stays; the second night it always leaves. You may need to <strong>expand the state space</strong>.</span>,
          <span key="h3">Try the state space <InlineMath math="\{A_1, A_2, B, C\}" /> where <InlineMath math="A_1" /> = first night at <InlineMath math="A" /> and <InlineMath math="A_2" /> = second night at <InlineMath math="A" />. This removes the memory dependence.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p>
          On the state space <InlineMath math="S = \{A, B, C\}" />, the process
          <InlineMath math="\{X_n\}" /> is <strong className="text-red-400">not</strong> a Markov chain.
        </p>
        <p>
          Why? Suppose <InlineMath math="X_n = A" />. The transition out of <InlineMath math="A" />
          depends on whether this is the bunny's <em>first</em> or <em>second</em> night at <InlineMath math="A" />.
          If it just arrived (first night), it stays with probability 1. If it has been there one night already,
          it leaves with probability 1. This violates the Markov (memoryless) property because the future
          depends on the past beyond just the current state.
        </p>
        <p className="mt-2">
          <strong className="text-emerald-400">Fix:</strong> Expand the state space to
        </p>
        <BlockMath math="S^* = \{A_1,\; A_2,\; B,\; C\}" />
        <p>
          where <InlineMath math="A_1" /> means "first night at <InlineMath math="A" />" and <InlineMath math="A_2" /> means "second night at <InlineMath math="A" />."
          Then the transition matrix is:
        </p>
        <BlockMath math="P = \begin{pmatrix} 0 & 1 & 0 & 0 \\ 0 & 0 & 1/2 & 1/2 \\ 0.9 & 0 & 0 & 0.1 \\ 0.9 & 0 & 0.1 & 0 \end{pmatrix}" />
        <p className="text-slate-400 text-xs mt-1">
          (rows/columns in order <InlineMath math="A_1, A_2, B, C" />)
        </p>
        <p>
          With this expanded state space, <InlineMath math="\{X_n\}" /> <strong className="text-emerald-400">is</strong> a Markov chain
          because each state fully encodes the information needed to determine future transitions.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.2 ═══════════════════ */

function ProofArrowDiagram() {
  const [activeLink, setActiveLink] = useState(null)

  const statements = [
    { id: 'i', label: '(i)', math: 'P(A \\cap B \\mid C) = P(A \\mid C)\\,P(B \\mid C)' },
    { id: 'ii', label: '(ii)', math: 'P(A \\mid B \\cap C) = P(A \\mid C)' },
    { id: 'iii', label: '(iii)', math: 'P(B \\mid A \\cap C) = P(B \\mid C)' },
  ]

  const implications = [
    {
      from: 'i', to: 'ii', key: 'i_ii',
      proof: (
        <span>
          Assume (i). Then <InlineMath math="P(A \mid B \cap C) = \frac{P(A \cap B \mid C)}{P(B \mid C)} = \frac{P(A \mid C)\,P(B \mid C)}{P(B \mid C)} = P(A \mid C)" />.
        </span>
      ),
    },
    {
      from: 'ii', to: 'i', key: 'ii_i',
      proof: (
        <span>
          Assume (ii). Then <InlineMath math="P(A \cap B \mid C) = P(A \mid B \cap C)\,P(B \mid C) = P(A \mid C)\,P(B \mid C)" />.
        </span>
      ),
    },
    {
      from: 'i', to: 'iii', key: 'i_iii',
      proof: (
        <span>
          Assume (i). Then <InlineMath math="P(B \mid A \cap C) = \frac{P(A \cap B \mid C)}{P(A \mid C)} = \frac{P(A \mid C)\,P(B \mid C)}{P(A \mid C)} = P(B \mid C)" />.
        </span>
      ),
    },
    {
      from: 'iii', to: 'i', key: 'iii_i',
      proof: (
        <span>
          Assume (iii). Then <InlineMath math="P(A \cap B \mid C) = P(B \mid A \cap C)\,P(A \mid C) = P(B \mid C)\,P(A \mid C)" />.
        </span>
      ),
    },
  ]

  // Position nodes in a triangle
  const positions = {
    i: { x: 200, y: 40 },
    ii: { x: 60, y: 200 },
    iii: { x: 340, y: 200 },
  }

  const makeImplPath = (from, to, side) => {
    const f = positions[from], t = positions[to]
    const dx = t.x - f.x, dy = t.y - f.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux = dx / len, uy = dy / len
    const px = -uy, py = ux
    const off = side * 10
    const r = 36
    const sx = f.x + ux * r + px * off, sy = f.y + uy * r + py * off
    const ex = t.x - ux * r + px * off, ey = t.y - uy * r + py * off
    const cx = (sx + ex) / 2 + px * 15, cy = (sy + ey) / 2 + py * 15
    return { path: `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`, cx, cy }
  }

  const arrowData = [
    { ...implications[0], ...makeImplPath('i', 'ii', 1) },
    { ...implications[1], ...makeImplPath('ii', 'i', 1) },
    { ...implications[2], ...makeImplPath('i', 'iii', -1) },
    { ...implications[3], ...makeImplPath('iii', 'i', -1) },
  ]

  return (
    <div>
      <svg viewBox="0 0 400 250" className="w-full max-w-md mx-auto">
        <defs>
          <marker id="arrowhead2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#818cf8" />
          </marker>
          <marker id="arrowhead2-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#fbbf24" />
          </marker>
        </defs>

        {arrowData.map(a => (
          <path
            key={a.key}
            d={a.path}
            fill="none"
            stroke={activeLink === a.key ? '#fbbf24' : '#6366f1'}
            strokeWidth={activeLink === a.key ? 2.5 : 1.5}
            markerEnd={activeLink === a.key ? 'url(#arrowhead2-active)' : 'url(#arrowhead2)'}
            className="cursor-pointer transition-colors"
            onClick={() => setActiveLink(activeLink === a.key ? null : a.key)}
          />
        ))}

        {/* invisible wider click targets */}
        {arrowData.map(a => (
          <path
            key={a.key + '-hit'}
            d={a.path}
            fill="none"
            stroke="transparent"
            strokeWidth="16"
            className="cursor-pointer"
            onClick={() => setActiveLink(activeLink === a.key ? null : a.key)}
          />
        ))}

        {/* nodes */}
        {statements.map(s => {
          const p = positions[s.id]
          return (
            <g key={s.id}>
              <circle cx={p.x} cy={p.y} r="30" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
              <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#c7d2fe" fontSize="16" fontWeight="bold">
                {s.label}
              </text>
            </g>
          )
        })}

        <text x="200" y="245" textAnchor="middle" fill="#64748b" fontSize="10">
          Click an arrow to see the proof of that implication
        </text>
      </svg>

      {/* statement legend */}
      <div className="space-y-2 mt-4 text-sm">
        {statements.map(s => (
          <div key={s.id} className="flex items-start gap-2">
            <span className="text-indigo-400 font-bold shrink-0 w-8">{s.label}</span>
            <InlineMath math={s.math} />
          </div>
        ))}
      </div>

      {/* proof display */}
      <AnimatePresence>
        {activeLink && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-sm text-slate-300"
          >
            <p className="font-semibold text-indigo-400 mb-2">
              ({arrowData.find(a => a.key === activeLink)?.from}) implies ({arrowData.find(a => a.key === activeLink)?.to}):
            </p>
            {arrowData.find(a => a.key === activeLink)?.proof}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Exercise32({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.2 &mdash; Conditional Independence</h3>
        <Stars n={2} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          Let <InlineMath math="A" />, <InlineMath math="B" />, <InlineMath math="C" /> be events
          with <InlineMath math="P(A \cap C) > 0" /> and <InlineMath math="P(B \cap C) > 0" />.
          Show that the following three statements are equivalent:
        </p>
        <div className="space-y-1 ml-2">
          <p>(i) <InlineMath math="P(A \cap B \mid C) = P(A \mid C)\,P(B \mid C)" /></p>
          <p>(ii) <InlineMath math="P(A \mid B \cap C) = P(A \mid C)" /></p>
          <p>(iii) <InlineMath math="P(B \mid A \cap C) = P(B \mid C)" /></p>
        </div>
      </div>

      {/* Interactive proof diagram */}
      <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-2 text-center">Interactive Proof Builder</h4>
        <ProofArrowDiagram />
      </div>

      <HintSection
        hints={[
          <span key="h1">
            For (i) implies (ii): divide both sides of (i) by <InlineMath math="P(B \mid C)" /> and use the definition of conditional probability.
          </span>,
          <span key="h2">
            For (ii) implies (i): write <InlineMath math="P(A \cap B \mid C) = P(A \mid B \cap C)\,P(B \mid C)" /> and substitute.
          </span>,
          <span key="h3">
            (i) is symmetric in <InlineMath math="A" /> and <InlineMath math="B" />, so (i) iff (iii) follows by the same argument as (i) iff (ii) with <InlineMath math="A" /> and <InlineMath math="B" /> swapped.
          </span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p className="font-semibold text-emerald-400">We show (i) iff (ii) iff (iii).</p>

        <div className="mt-3 space-y-4">
          <div>
            <p className="font-semibold text-indigo-300">(i) implies (ii):</p>
            <p>Assume (i). By the definition of conditional probability:</p>
            <BlockMath math="P(A \mid B \cap C) = \frac{P(A \cap B \mid C)}{P(B \mid C)} = \frac{P(A \mid C)\,P(B \mid C)}{P(B \mid C)} = P(A \mid C). \quad \checkmark" />
          </div>

          <div>
            <p className="font-semibold text-indigo-300">(ii) implies (i):</p>
            <p>Assume (ii). By the multiplication rule for conditional probability:</p>
            <BlockMath math="P(A \cap B \mid C) = P(A \mid B \cap C)\,P(B \mid C) = P(A \mid C)\,P(B \mid C). \quad \checkmark" />
          </div>

          <div>
            <p className="font-semibold text-indigo-300">(i) iff (iii):</p>
            <p>
              Since (i) is symmetric in <InlineMath math="A" /> and <InlineMath math="B" />,
              the proof of (i) iff (iii) is identical to (i) iff (ii) with the roles
              of <InlineMath math="A" /> and <InlineMath math="B" /> swapped.
            </p>
          </div>

          <p>Therefore (i), (ii), and (iii) are all equivalent.</p>
        </div>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.3 ═══════════════════ */

function Exercise33({ onAttempt, onSolve }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const correct = 'yes'

  const handleSubmit = () => {
    if (selected) {
      setSubmitted(true)
      onAttempt?.()
      if (selected === correct) onSolve?.()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.3 &mdash; Subsequence of a MC</h3>
        <Stars n={3} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          Suppose <InlineMath math="\{X_n : n \ge 0\}" /> is a Markov chain. Let <InlineMath math="0 \le n_0 < n_1 < n_2 < \cdots" /> be
          a <strong>deterministic</strong> increasing sequence of times, and define <InlineMath math="Y_k = X_{n_k}" />.
        </p>
        <p>
          Is <InlineMath math="\{Y_k : k \ge 0\}" /> necessarily a Markov chain?
        </p>
      </div>

      {/* Multiple choice */}
      <div className="mt-6 space-y-2">
        {[
          { value: 'yes', label: 'Yes, always' },
          { value: 'no', label: 'No, never' },
          { value: 'depends', label: 'It depends on the subsequence' },
        ].map(opt => {
          let style = 'bg-slate-800/60 border-slate-700 hover:border-purple-500/50'
          if (submitted && opt.value === correct) style = 'bg-emerald-500/15 border-emerald-500'
          else if (submitted && opt.value === selected && opt.value !== correct) style = 'bg-red-500/15 border-red-500'
          else if (!submitted && opt.value === selected) style = 'bg-purple-500/15 border-purple-500'

          return (
            <button
              key={opt.value}
              onClick={() => { if (!submitted) setSelected(opt.value) }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} ${submitted ? '' : 'cursor-pointer'}`}
            >
              <span className="text-slate-300">{opt.label}</span>
              {submitted && opt.value === correct && <span className="ml-2 text-emerald-400">-- Correct</span>}
              {submitted && opt.value === selected && opt.value !== correct && <span className="ml-2 text-red-400">-- Incorrect</span>}
            </button>
          )
        })}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!selected} className="btn-primary text-sm mt-2 disabled:opacity-40">
            Submit Answer
          </button>
        )}
      </div>

      <HintSection
        hints={[
          <span key="h1">
            Use the Markov property repeatedly. Recall that the Markov property says the future is independent of the past given the present.
          </span>,
          <span key="h2">
            By the Markov property, <InlineMath math="P(X_{n_{k+1}} = j \mid X_{n_k} = i, X_{n_{k-1}}, \ldots) = P(X_{n_{k+1}} = j \mid X_{n_k} = i)" />.
            The key insight is that <InlineMath math="X_{n_0}, \ldots, X_{n_{k-1}}" /> all lie in the "past" relative to time <InlineMath math="n_k" />.
          </span>,
          <span key="h3">
            Proceed by induction on <InlineMath math="k" />. The Markov property for the original chain implies
            that knowing <InlineMath math="X_{n_k}" /> is sufficient — all earlier sub-sampled observations
            add no extra information about <InlineMath math="X_{n_{k+1}}" />.
          </span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); if (!submitted) onSolve?.() }}>
        <p>
          <strong className="text-emerald-400">Answer: Yes</strong> — a deterministic subsequence of a Markov chain is
          always a Markov chain (though generally with different, time-inhomogeneous transition probabilities).
        </p>

        <p className="mt-3 font-semibold text-indigo-300">Proof sketch:</p>
        <p>
          We need to show that for every <InlineMath math="k \ge 0" />,
        </p>
        <BlockMath math="P(Y_{k+1} = j \mid Y_k = i_k, \ldots, Y_0 = i_0) = P(Y_{k+1} = j \mid Y_k = i_k)." />
        <p>
          Since <InlineMath math="Y_m = X_{n_m}" />, the left side equals
        </p>
        <BlockMath math="P(X_{n_{k+1}} = j \mid X_{n_k} = i_k, X_{n_{k-1}} = i_{k-1}, \ldots, X_{n_0} = i_0)." />
        <p>
          By the Markov property of <InlineMath math="\{X_n\}" />, conditioning on
          <InlineMath math="X_{n_k}" /> alone is sufficient to determine the distribution of
          all future values <InlineMath math="X_m" /> for <InlineMath math="m > n_k" />.
          In particular, since <InlineMath math="n_0 < \cdots < n_{k-1} < n_k < n_{k+1}" />,
          the values <InlineMath math="X_{n_0}, \ldots, X_{n_{k-1}}" /> are all "past"
          relative to time <InlineMath math="n_k" />, so
        </p>
        <BlockMath math="= P(X_{n_{k+1}} = j \mid X_{n_k} = i_k) = P(Y_{k+1} = j \mid Y_k = i_k)." />
        <p>
          The transition probabilities of <InlineMath math="\{Y_k\}" /> are
          <InlineMath math="P^{(n_{k+1} - n_k)}" />, the <InlineMath math="(n_{k+1} - n_k)" />-step
          transition matrix of the original chain.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.4 ═══════════════════ */

function Exercise34({ onAttempt, onSolve }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const correct = 'depends'

  const handleSubmit = () => {
    if (selected) {
      setSubmitted(true)
      onAttempt?.()
      if (selected === correct) onSolve?.()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.4 &mdash; Time-reversed MC</h3>
        <Stars n={3} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          Suppose <InlineMath math="\{X_n : n = \ldots, -2, -1, 0, 1, 2, \ldots\}" /> is a Markov chain
          (indexed over <strong>all integers</strong>). Define the <em>time-reversed</em> process
        </p>
        <BlockMath math="Y_n = X_{-n}." />
        <p>
          Is <InlineMath math="\{Y_n\}" /> necessarily a Markov chain?
        </p>
      </div>

      {/* Multiple choice */}
      <div className="mt-6 space-y-2">
        {[
          { value: 'yes', label: 'Yes, always' },
          { value: 'no', label: 'No, never' },
          { value: 'depends', label: 'Not necessarily (requires additional conditions)' },
        ].map(opt => {
          let style = 'bg-slate-800/60 border-slate-700 hover:border-purple-500/50'
          if (submitted && opt.value === correct) style = 'bg-emerald-500/15 border-emerald-500'
          else if (submitted && opt.value === selected && opt.value !== correct) style = 'bg-red-500/15 border-red-500'
          else if (!submitted && opt.value === selected) style = 'bg-purple-500/15 border-purple-500'

          return (
            <button
              key={opt.value}
              onClick={() => { if (!submitted) setSelected(opt.value) }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} ${submitted ? '' : 'cursor-pointer'}`}
            >
              <span className="text-slate-300">{opt.label}</span>
              {submitted && opt.value === correct && <span className="ml-2 text-emerald-400">-- Correct</span>}
              {submitted && opt.value === selected && opt.value !== correct && <span className="ml-2 text-red-400">-- Incorrect</span>}
            </button>
          )
        })}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!selected} className="btn-primary text-sm mt-2 disabled:opacity-40">
            Submit Answer
          </button>
        )}
      </div>

      <HintSection
        hints={[
          <span key="h1">
            Contrast this with Exercise 3.3. There, the subsequence went <em>forward</em> in time.
            Here, time is reversed. Does the Markov property guarantee anything about the "backward" direction?
          </span>,
          <span key="h2">
            Consider a simple two-state chain where the forward transition matrix is not doubly stochastic.
            The backward transitions may not satisfy the Markov property without a compatible stationary distribution.
          </span>,
          <span key="h3">
            The time-reversed process <em>can</em> be Markov if the chain has a stationary distribution
            <InlineMath math="\pi" /> and the chain is run in stationarity. In that case, the reversed
            transition probabilities are <InlineMath math="\hat{p}_{ij} = \pi_j p_{ji} / \pi_i" />.
          </span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); if (!submitted) onSolve?.() }}>
        <p>
          <strong className="text-amber-400">Answer: Not necessarily.</strong> Without additional conditions, the
          time-reversed process need not be Markov.
        </p>

        <p className="mt-3 font-semibold text-indigo-300">Explanation:</p>
        <p>
          The Markov property is <em>not</em> symmetric in time. The statement
          "the future is independent of the past given the present" refers specifically to the
          <em>forward</em> direction. Reversing time swaps the roles of past and future, and
          the resulting process is not guaranteed to satisfy the Markov property.
        </p>

        <p className="mt-2">
          <strong className="text-emerald-400">When does it work?</strong> If the chain is
          <em>stationary</em> — meaning it is run with its stationary distribution <InlineMath math="\pi" /> —
          then <InlineMath math="\{Y_n\}" /> is also a Markov chain, with transition probabilities
        </p>
        <BlockMath math="\hat{p}_{ij} = \frac{\pi_j \, p_{ji}}{\pi_i}." />
        <p>
          This is the <strong>time-reversed chain</strong>. If additionally <InlineMath math="\pi_i p_{ij} = \pi_j p_{ji}" /> for
          all <InlineMath math="i,j" /> (the <em>detailed balance</em> condition), then the reversed chain has the
          same transition matrix as the original, and the chain is called <strong>reversible</strong>.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.5 ═══════════════════ */

function Exercise35({ onAttempt, onSolve }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const correct = 'b'

  const handleSubmit = () => {
    if (selected) {
      setSubmitted(true)
      onAttempt?.()
      if (selected === correct) onSolve?.()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.5 &mdash; Two-Step Transition</h3>
        <Stars n={1} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          A weather model has three states: <InlineMath math="S" /> (Sunny), <InlineMath math="C" /> (Cloudy),
          and <InlineMath math="R" /> (Rainy), with transition matrix
        </p>
        <BlockMath math="P = \begin{pmatrix} 0.6 & 0.3 & 0.1 \\ 0.2 & 0.5 & 0.3 \\ 0.3 & 0.3 & 0.4 \end{pmatrix}" />
        <p className="text-slate-400 text-xs">(rows/columns in order <InlineMath math="S, C, R" />)</p>
        <p>
          Compute <InlineMath math="P_{SR}^{(2)}" />, the probability that starting from Sunny, the weather is Rainy after exactly 2 days.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {[
          { value: 'a', label: '0.13' },
          { value: 'b', label: '0.19' },
          { value: 'c', label: '0.25' },
          { value: 'd', label: '0.31' },
        ].map(opt => {
          let style = 'bg-slate-800/60 border-slate-700 hover:border-purple-500/50'
          if (submitted && opt.value === correct) style = 'bg-emerald-500/15 border-emerald-500'
          else if (submitted && opt.value === selected && opt.value !== correct) style = 'bg-red-500/15 border-red-500'
          else if (!submitted && opt.value === selected) style = 'bg-purple-500/15 border-purple-500'

          return (
            <button
              key={opt.value}
              onClick={() => { if (!submitted) setSelected(opt.value) }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} ${submitted ? '' : 'cursor-pointer'}`}
            >
              <span className="text-slate-300">{opt.label}</span>
              {submitted && opt.value === correct && <span className="ml-2 text-emerald-400">-- Correct</span>}
              {submitted && opt.value === selected && opt.value !== correct && <span className="ml-2 text-red-400">-- Incorrect</span>}
            </button>
          )
        })}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!selected} className="btn-primary text-sm mt-2 disabled:opacity-40">
            Submit Answer
          </button>
        )}
      </div>

      <HintSection
        hints={[
          <span key="h1">The 2-step transition probability is the <InlineMath math="(S,R)" /> entry of <InlineMath math="P^2 = P \cdot P" />.</span>,
          <span key="h2">Compute the dot product of row <InlineMath math="S" /> with column <InlineMath math="R" />: <InlineMath math="P_{SR}^{(2)} = \sum_k P_{Sk} \cdot P_{kR}" />.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); if (!submitted) onSolve?.() }}>
        <p>We compute <InlineMath math="P_{SR}^{(2)} = (P^2)_{SR}" /> using the Chapman-Kolmogorov equation:</p>
        <BlockMath math="P_{SR}^{(2)} = P_{SS}\,P_{SR} + P_{SC}\,P_{CR} + P_{SR}\,P_{RR}" />
        <BlockMath math="= (0.6)(0.1) + (0.3)(0.3) + (0.1)(0.4)" />
        <BlockMath math="= 0.06 + 0.09 + 0.04 = 0.19" />
        <p>
          So the probability of going from Sunny to Rainy in exactly 2 steps is <strong className="text-emerald-400">0.19</strong>.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.6 ═══════════════════ */

function Exercise36({ onAttempt, onSolve }) {
  const statements = [
    {
      text: <span>If <InlineMath math="\{X_n\}" /> is a Markov chain, then <InlineMath math="X_{n+1}" /> is independent of <InlineMath math="X_{n-1}" />.</span>,
      answer: false,
      explanation: <span>False. <InlineMath math="X_{n+1}" /> is <em>conditionally</em> independent of <InlineMath math="X_{n-1}" /> <strong>given</strong> <InlineMath math="X_n" />, but they are generally not (unconditionally) independent. For example, if <InlineMath math="X_{n-1} = i" /> makes <InlineMath math="X_n = j" /> very likely, and <InlineMath math="X_n = j" /> makes <InlineMath math="X_{n+1} = k" /> very likely, then knowing <InlineMath math="X_{n-1} = i" /> gives information about <InlineMath math="X_{n+1}" />.</span>,
    },
    {
      text: <span>The rows of a transition matrix must each sum to 1.</span>,
      answer: true,
      explanation: <span>True. Each row <InlineMath math="i" /> represents a probability distribution over the next state: <InlineMath math="\sum_j p_{ij} = 1" /> for all <InlineMath math="i" />. This is the definition of a stochastic matrix.</span>,
    },
    {
      text: <span>If a Markov chain has transition matrix <InlineMath math="P" />, then <InlineMath math="P^n_{ij}" /> gives the probability of going from state <InlineMath math="i" /> to state <InlineMath math="j" /> in exactly <InlineMath math="n" /> steps.</span>,
      answer: true,
      explanation: <span>True. This is exactly the Chapman-Kolmogorov equation: <InlineMath math="P^{(n)}_{ij} = (P^n)_{ij}" />.</span>,
    },
    {
      text: <span>The Markov property means that the future and past are independent.</span>,
      answer: false,
      explanation: <span>False. The Markov property says the future and past are <em>conditionally independent given the present</em>. Without conditioning on the present state, the future and past are generally dependent.</span>,
    },
  ]

  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)

  const handleSelect = (idx, val) => {
    if (!showResults) setAnswers(prev => ({ ...prev, [idx]: val }))
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length === statements.length) {
      setShowResults(true)
      onAttempt?.()
      const allCorrect = statements.every((s, i) => answers[i] === s.answer)
      if (allCorrect) onSolve?.()
    }
  }

  const score = showResults ? statements.filter((s, i) => answers[i] === s.answer).length : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.6 &mdash; True or False</h3>
        <Stars n={1} />
      </div>

      <div className="mt-4 text-slate-300 text-sm leading-relaxed">
        <p>Determine whether each statement is true or false.</p>
      </div>

      <div className="mt-6 space-y-4">
        {statements.map((s, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-2">
            <p className="text-slate-300 text-sm">{idx + 1}. {s.text}</p>
            <div className="flex gap-3">
              {[true, false].map(val => {
                let btnStyle = 'bg-slate-700/60 border-slate-600 hover:border-purple-500/50'
                if (showResults && val === s.answer) btnStyle = 'bg-emerald-500/15 border-emerald-500'
                else if (showResults && answers[idx] === val && val !== s.answer) btnStyle = 'bg-red-500/15 border-red-500'
                else if (!showResults && answers[idx] === val) btnStyle = 'bg-purple-500/15 border-purple-500'

                return (
                  <button
                    key={String(val)}
                    onClick={() => handleSelect(idx, val)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${btnStyle} ${showResults ? '' : 'cursor-pointer'}`}
                  >
                    {val ? 'True' : 'False'}
                  </button>
                )
              })}
            </div>
            {showResults && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-400 mt-1">
                {s.explanation}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {!showResults && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < statements.length}
          className="btn-primary text-sm mt-4 disabled:opacity-40"
        >
          Submit All
        </button>
      )}
      {showResults && (
        <p className="mt-4 text-sm font-semibold text-slate-300">
          Score: <span className={score === statements.length ? 'text-emerald-400' : 'text-amber-400'}>{score}/{statements.length}</span>
        </p>
      )}
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.7 ═══════════════════ */

function Exercise37({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.7 &mdash; Weather Modeling</h3>
        <Stars n={2} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          A meteorologist observes that tomorrow's weather depends only on today's weather (not on earlier days).
          The weather can be <InlineMath math="\text{Dry (D)}" /> or <InlineMath math="\text{Wet (W)}" />.
          Historical data shows:
        </p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>If today is Dry, tomorrow is Dry with probability 0.8 and Wet with probability 0.2.</li>
          <li>If today is Wet, tomorrow is Dry with probability 0.4 and Wet with probability 0.6.</li>
        </ul>
        <ol className="list-decimal list-inside space-y-1 ml-2 mt-3">
          <li>Identify the state space and explain why this is a Markov chain.</li>
          <li>Write down the transition matrix <InlineMath math="P" />.</li>
          <li>If today is Wet, what is the probability that it will be Dry two days from now?</li>
        </ol>
      </div>

      <HintSection
        hints={[
          <span key="h1">The state space is simply the set of possible weather outcomes: <InlineMath math="S = \{D, W\}" />.</span>,
          <span key="h2">For part (c), compute <InlineMath math="P^{(2)}_{WD}" /> using <InlineMath math="P^2" /> or the Chapman-Kolmogorov equation.</span>,
          <span key="h3"><InlineMath math="P^{(2)}_{WD} = P_{WD} \cdot P_{DD} + P_{WW} \cdot P_{WD}" />.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p><strong className="text-indigo-300">(a)</strong> The state space is <InlineMath math="S = \{D, W\}" />. The process is Markov because the problem states that tomorrow's weather depends <em>only</em> on today's weather.</p>

        <p className="mt-3"><strong className="text-indigo-300">(b)</strong> The transition matrix is:</p>
        <BlockMath math="P = \begin{pmatrix} 0.8 & 0.2 \\ 0.4 & 0.6 \end{pmatrix}" />
        <p className="text-slate-400 text-xs">(rows/columns in order <InlineMath math="D, W" />)</p>

        <p className="mt-3"><strong className="text-indigo-300">(c)</strong> We compute <InlineMath math="P^{(2)}_{WD}" />:</p>
        <BlockMath math="P^{(2)}_{WD} = P_{WD}\cdot P_{DD} + P_{WW}\cdot P_{WD} = (0.4)(0.8) + (0.6)(0.4) = 0.32 + 0.24 = 0.56" />
        <p>So there is a <strong className="text-emerald-400">56%</strong> chance of Dry weather two days from now, given that today is Wet.</p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.8 ═══════════════════ */

function Exercise38({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.8 &mdash; Stationary Distribution</h3>
        <Stars n={2} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          Consider the Markov chain with transition matrix
        </p>
        <BlockMath math="P = \begin{pmatrix} 0.7 & 0.3 \\ 0.4 & 0.6 \end{pmatrix}" />
        <p>
          Find the stationary distribution <InlineMath math="\boldsymbol{\pi} = (\pi_1, \pi_2)" />.
        </p>
      </div>

      <HintSection
        hints={[
          <span key="h1">The stationary distribution satisfies <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" /> and <InlineMath math="\pi_1 + \pi_2 = 1" />.</span>,
          <span key="h2">Write out <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" />: this gives <InlineMath math="0.7\pi_1 + 0.4\pi_2 = \pi_1" /> and <InlineMath math="0.3\pi_1 + 0.6\pi_2 = \pi_2" />. Both simplify to the same equation.</span>,
          <span key="h3">From the first equation: <InlineMath math="-0.3\pi_1 + 0.4\pi_2 = 0" />, so <InlineMath math="\pi_2 = \frac{3}{4}\pi_1" />. Now use <InlineMath math="\pi_1 + \pi_2 = 1" />.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p>We solve <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" /> with <InlineMath math="\pi_1 + \pi_2 = 1" />.</p>
        <p className="mt-2">Writing out the first equation:</p>
        <BlockMath math="0.7\pi_1 + 0.4\pi_2 = \pi_1 \quad \Longrightarrow \quad -0.3\pi_1 + 0.4\pi_2 = 0 \quad \Longrightarrow \quad \pi_2 = \tfrac{3}{4}\pi_1" />
        <p>Substituting into the normalization condition:</p>
        <BlockMath math="\pi_1 + \tfrac{3}{4}\pi_1 = 1 \quad \Longrightarrow \quad \tfrac{7}{4}\pi_1 = 1 \quad \Longrightarrow \quad \pi_1 = \tfrac{4}{7}" />
        <BlockMath math="\pi_2 = 1 - \tfrac{4}{7} = \tfrac{3}{7}" />
        <p>The stationary distribution is:</p>
        <BlockMath math="\boldsymbol{\pi} = \left(\frac{4}{7},\; \frac{3}{7}\right) \approx (0.571,\; 0.429)" />
        <p className="mt-2 text-slate-400 text-xs">
          <strong>Verification:</strong> <InlineMath math="\boldsymbol{\pi} P = (0.7 \cdot \frac{4}{7} + 0.4 \cdot \frac{3}{7},\; 0.3 \cdot \frac{4}{7} + 0.6 \cdot \frac{3}{7}) = (\frac{4}{7}, \frac{3}{7}) = \boldsymbol{\pi}" />.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.9 ═══════════════════ */

function Exercise39({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.9 &mdash; Gambler's Ruin</h3>
        <Stars n={2} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          A gambler starts with <InlineMath math="\$2" />. Each round, they win <InlineMath math="\$1" /> with
          probability <InlineMath math="p = 1/2" /> or lose <InlineMath math="\$1" /> with probability <InlineMath math="1/2" />.
          The game ends when the gambler reaches <InlineMath math="\$4" /> (wins) or <InlineMath math="\$0" /> (ruin).
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>What is the state space and what are the absorbing states?</li>
          <li>What is the probability of ruin (reaching <InlineMath math="\$0" />) starting from <InlineMath math="\$2" />?</li>
        </ol>
      </div>

      <HintSection
        hints={[
          <span key="h1">The state space is <InlineMath math="S = \{0, 1, 2, 3, 4\}" />, with absorbing states <InlineMath math="0" /> and <InlineMath math="4" />.</span>,
          <span key="h2">Let <InlineMath math="r_i" /> be the probability of ruin starting from state <InlineMath math="i" />. Use first-step analysis: <InlineMath math="r_i = \frac{1}{2}r_{i-1} + \frac{1}{2}r_{i+1}" /> for <InlineMath math="i = 1, 2, 3" />, with <InlineMath math="r_0 = 1" /> and <InlineMath math="r_4 = 0" />.</span>,
          <span key="h3">For the symmetric case <InlineMath math="p = 1/2" />, the ruin probability from state <InlineMath math="i" /> with target <InlineMath math="N" /> is <InlineMath math="r_i = 1 - i/N" />.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p><strong className="text-indigo-300">(a)</strong> State space: <InlineMath math="S = \{0, 1, 2, 3, 4\}" />. Absorbing states: <InlineMath math="0" /> (ruin) and <InlineMath math="4" /> (win).</p>

        <p className="mt-3"><strong className="text-indigo-300">(b)</strong> Let <InlineMath math="r_i = P(\text{ruin} \mid X_0 = i)" />. Boundary conditions: <InlineMath math="r_0 = 1" />, <InlineMath math="r_4 = 0" />.</p>
        <p>First-step analysis gives:</p>
        <BlockMath math="r_i = \tfrac{1}{2} r_{i-1} + \tfrac{1}{2} r_{i+1}, \quad i = 1, 2, 3" />
        <p>This is a second-order linear recurrence. For the symmetric random walk (<InlineMath math="p = 1/2" />), the general solution is <InlineMath math="r_i = A + Bi" />.</p>
        <p>Applying boundary conditions:</p>
        <BlockMath math="r_0 = A = 1, \quad r_4 = 1 + 4B = 0 \implies B = -\tfrac{1}{4}" />
        <BlockMath math="r_i = 1 - \frac{i}{4}" />
        <p>Therefore:</p>
        <BlockMath math="r_2 = 1 - \frac{2}{4} = \frac{1}{2}" />
        <p>The probability of ruin starting from <InlineMath math="\$2" /> is <strong className="text-emerald-400">1/2</strong>.</p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.10 ═══════════════════ */

function Exercise310({ onAttempt, onSolve }) {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const correct = 'c'

  const handleSubmit = () => {
    if (selected) {
      setSubmitted(true)
      onAttempt?.()
      if (selected === correct) onSolve?.()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.10 &mdash; Branching Process Extinction</h3>
        <Stars n={3} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          In a branching process, each individual independently produces offspring according to the distribution:
        </p>
        <BlockMath math="P(X = 0) = 0.5, \quad P(X = 1) = 0.3, \quad P(X = 2) = 0.2" />
        <p>
          Starting from a single individual (<InlineMath math="Z_0 = 1" />), find the extinction probability.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {[
          { value: 'a', label: '0.5' },
          { value: 'b', label: '0.7' },
          { value: 'c', label: '1' },
          { value: 'd', label: '5/4' },
        ].map(opt => {
          let style = 'bg-slate-800/60 border-slate-700 hover:border-purple-500/50'
          if (submitted && opt.value === correct) style = 'bg-emerald-500/15 border-emerald-500'
          else if (submitted && opt.value === selected && opt.value !== correct) style = 'bg-red-500/15 border-red-500'
          else if (!submitted && opt.value === selected) style = 'bg-purple-500/15 border-purple-500'

          return (
            <button
              key={opt.value}
              onClick={() => { if (!submitted) setSelected(opt.value) }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} ${submitted ? '' : 'cursor-pointer'}`}
            >
              <span className="text-slate-300">{opt.label}</span>
              {submitted && opt.value === correct && <span className="ml-2 text-emerald-400">-- Correct</span>}
              {submitted && opt.value === selected && opt.value !== correct && <span className="ml-2 text-red-400">-- Incorrect</span>}
            </button>
          )
        })}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!selected} className="btn-primary text-sm mt-2 disabled:opacity-40">
            Submit Answer
          </button>
        )}
      </div>

      <HintSection
        hints={[
          <span key="h1">First compute the mean offspring: <InlineMath math="\mu = E[X] = 0 \cdot 0.5 + 1 \cdot 0.3 + 2 \cdot 0.2" />.</span>,
          <span key="h2">The PGF is <InlineMath math="G(s) = 0.5 + 0.3s + 0.2s^2" />. The extinction probability is the smallest non-negative root of <InlineMath math="s = G(s)" />.</span>,
          <span key="h3">Since <InlineMath math="\mu = 0.7 \le 1" />, recall the theorem: if <InlineMath math="\mu \le 1" />, the extinction probability is <InlineMath math="1" /> (unless <InlineMath math="P(X=1) = 1" />).</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); if (!submitted) onSolve?.() }}>
        <p><strong className="text-indigo-300">Step 1: Compute the mean.</strong></p>
        <BlockMath math="\mu = E[X] = 0(0.5) + 1(0.3) + 2(0.2) = 0.7" />

        <p className="mt-2"><strong className="text-indigo-300">Step 2: Since <InlineMath math="\mu = 0.7 < 1" />, the extinction probability is 1.</strong></p>
        <p>By the fundamental theorem of branching processes, if <InlineMath math="\mu \le 1" /> and <InlineMath math="P(X = 1) < 1" />, then extinction is certain.</p>

        <p className="mt-2"><strong className="text-indigo-300">Verification via PGF:</strong></p>
        <p>The probability generating function is <InlineMath math="G(s) = 0.5 + 0.3s + 0.2s^2" />. We solve <InlineMath math="s = G(s)" />:</p>
        <BlockMath math="s = 0.5 + 0.3s + 0.2s^2 \quad \Longrightarrow \quad 0.2s^2 - 0.7s + 0.5 = 0" />
        <BlockMath math="s = \frac{0.7 \pm \sqrt{0.49 - 0.40}}{0.4} = \frac{0.7 \pm 0.3}{0.4}" />
        <p>The two roots are <InlineMath math="s = 1" /> and <InlineMath math="s = 5/4" />. The smallest non-negative root is <InlineMath math="s = 1" />.</p>
        <p className="mt-1">The extinction probability is <strong className="text-emerald-400">1</strong> (certain extinction).</p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.11 ═══════════════════ */

function Exercise311({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.11 &mdash; State Classification</h3>
        <Stars n={3} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          Consider the Markov chain on <InlineMath math="S = \{1, 2, 3, 4\}" /> with transition matrix
        </p>
        <BlockMath math="P = \begin{pmatrix} 0 & 1 & 0 & 0 \\ 1/2 & 0 & 1/2 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 1 & 0 \end{pmatrix}" />
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Identify all communicating classes.</li>
          <li>Classify each class as recurrent or transient.</li>
          <li>Find the period of each recurrent class.</li>
        </ol>
      </div>

      <HintSection
        hints={[
          <span key="h1">State <InlineMath math="i" /> communicates with state <InlineMath math="j" /> (written <InlineMath math="i \leftrightarrow j" />) if <InlineMath math="i" /> can reach <InlineMath math="j" /> and <InlineMath math="j" /> can reach <InlineMath math="i" />. Check which states can reach each other.</span>,
          <span key="h2">From state 1: <InlineMath math="1 \to 2 \to 1" /> (so 1 and 2 communicate). From state 2: <InlineMath math="2 \to 3 \to 4 \to 3" />, but can 3 reach 1? Check if <InlineMath math="3 \to 4 \to 3 \to \cdots" /> ever leaves <InlineMath math="\{3,4\}" />.</span>,
          <span key="h3">Class <InlineMath math="\{3, 4\}" /> is closed (no transitions out), hence recurrent. Class <InlineMath math="\{1, 2\}" /> can reach <InlineMath math="\{3, 4\}" /> but not return, hence transient.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p><strong className="text-indigo-300">(a) Communicating classes:</strong></p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li><InlineMath math="\{1, 2\}" />: State 1 goes to 2, and state 2 goes to 1 (with probability 1/2).</li>
          <li><InlineMath math="\{3, 4\}" />: State 3 goes to 4, and state 4 goes to 3.</li>
        </ul>
        <p className="mt-1">Note: State 2 can reach state 3 (probability 1/2), but state 3 cannot reach state 1 or 2.</p>

        <p className="mt-3"><strong className="text-indigo-300">(b) Classification:</strong></p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li><InlineMath math="\{1, 2\}" /> is <strong className="text-red-400">transient</strong>: from state 2, the chain can leave to state 3 and never return.</li>
          <li><InlineMath math="\{3, 4\}" /> is <strong className="text-emerald-400">recurrent</strong>: this class is closed (no transitions lead out).</li>
        </ul>

        <p className="mt-3"><strong className="text-indigo-300">(c) Period of <InlineMath math="\{3, 4\}" />:</strong></p>
        <p>
          State 3 returns to itself at times <InlineMath math="2, 4, 6, \ldots" /> (since <InlineMath math="3 \to 4 \to 3" />).
          The GCD of <InlineMath math="\{2, 4, 6, \ldots\}" /> is <strong className="text-emerald-400">2</strong>,
          so the class has period 2.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ EXERCISE 3.12 ═══════════════════ */

function Exercise312({ onAttempt, onSolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="exercise-box"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-xl font-bold text-purple-300">Exercise 3.12 &mdash; Ehrenfest Model</h3>
        <Stars n={3} />
      </div>

      <div className="mt-4 text-slate-300 space-y-2 text-sm leading-relaxed">
        <p>
          In the Ehrenfest model with <InlineMath math="N = 2" /> particles, each particle is independently in
          box A or box B. At each step, one particle is chosen uniformly at random and moved to the other box.
          Let <InlineMath math="X_n" /> be the number of particles in box A at time <InlineMath math="n" />.
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Write down the transition matrix <InlineMath math="P" /> on state space <InlineMath math="S = \{0, 1, 2\}" />.</li>
          <li>Find the stationary distribution <InlineMath math="\boldsymbol{\pi}" />.</li>
          <li>Verify that <InlineMath math="\boldsymbol{\pi}" /> is the <InlineMath math="\text{Binomial}(2, 1/2)" /> distribution.</li>
        </ol>
      </div>

      <HintSection
        hints={[
          <span key="h1">When <InlineMath math="X_n = k" />, there are <InlineMath math="k" /> particles in box A. A random particle is chosen: with probability <InlineMath math="k/N" /> it is from box A (and moves to B, so <InlineMath math="X_{n+1} = k-1" />), and with probability <InlineMath math="(N-k)/N" /> it is from box B (so <InlineMath math="X_{n+1} = k+1" />).</span>,
          <span key="h2">For <InlineMath math="N = 2" />: from state 0, go to 1 with prob 1. From state 1, go to 0 or 2 each with prob 1/2. From state 2, go to 1 with prob 1.</span>,
          <span key="h3">Solve <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" />. You should get <InlineMath math="\pi_0 = 1/4, \pi_1 = 1/2, \pi_2 = 1/4" />, which matches <InlineMath math="\binom{2}{k}(1/2)^2" />.</span>,
        ]}
      />

      <SolutionToggle onReveal={() => { onAttempt?.(); onSolve?.() }}>
        <p><strong className="text-indigo-300">(a)</strong> With <InlineMath math="N = 2" />, the transition probabilities are:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>From state 0: both particles are in B, so the chosen particle moves to A. <InlineMath math="P(0 \to 1) = 1" />.</li>
          <li>From state 1: with prob 1/2 the A-particle is chosen (goes to B), with prob 1/2 the B-particle is chosen (goes to A).</li>
          <li>From state 2: both particles are in A, so the chosen particle moves to B. <InlineMath math="P(2 \to 1) = 1" />.</li>
        </ul>
        <BlockMath math="P = \begin{pmatrix} 0 & 1 & 0 \\ 1/2 & 0 & 1/2 \\ 0 & 1 & 0 \end{pmatrix}" />

        <p className="mt-3"><strong className="text-indigo-300">(b)</strong> Solve <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" />:</p>
        <BlockMath math="\tfrac{1}{2}\pi_1 = \pi_0, \quad \pi_0 + \pi_2 = \pi_1, \quad \tfrac{1}{2}\pi_1 = \pi_2" />
        <p>From the first and third equations: <InlineMath math="\pi_0 = \pi_2 = \frac{1}{2}\pi_1" />. Using <InlineMath math="\pi_0 + \pi_1 + \pi_2 = 1" />:</p>
        <BlockMath math="\tfrac{1}{2}\pi_1 + \pi_1 + \tfrac{1}{2}\pi_1 = 1 \implies 2\pi_1 = 1 \implies \pi_1 = \tfrac{1}{2}" />
        <BlockMath math="\boldsymbol{\pi} = \left(\tfrac{1}{4},\; \tfrac{1}{2},\; \tfrac{1}{4}\right)" />

        <p className="mt-3"><strong className="text-indigo-300">(c)</strong> The <InlineMath math="\text{Binomial}(2, 1/2)" /> distribution gives:</p>
        <BlockMath math="P(X = k) = \binom{2}{k}\left(\tfrac{1}{2}\right)^2 = \begin{cases} 1/4 & k = 0 \\ 1/2 & k = 1 \\ 1/4 & k = 2 \end{cases}" />
        <p>
          This matches <InlineMath math="\boldsymbol{\pi}" /> exactly, confirming that the stationary distribution
          of the Ehrenfest model with <InlineMath math="N = 2" /> is <strong className="text-emerald-400"><InlineMath math="\text{Binomial}(2, 1/2)" /></strong>.
        </p>
      </SolutionToggle>
    </motion.div>
  )
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function Exercises() {
  const [attempted, setAttempted] = useState(new Set())
  const [solved, setSolved] = useState(new Set())

  const markAttempted = (id) => setAttempted(prev => new Set(prev).add(id))
  const markSolved = (id) => setSolved(prev => new Set(prev).add(id))

  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Exercises
        </h1>
        <p className="text-slate-400 mt-2">Practice problems on Markov chain fundamentals.</p>
      </motion.div>

      {/* Score tracker */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="section-card flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 text-sm">Attempted</span>
            <p className="text-2xl font-bold text-purple-400">{attempted.size}<span className="text-slate-500 text-lg">/12</span></p>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <div>
            <span className="text-slate-400 text-sm">Solved</span>
            <p className="text-2xl font-bold text-emerald-400">{solved.size}<span className="text-slate-500 text-lg">/12</span></p>
          </div>
        </div>

        {/* progress bar */}
        <div className="flex-1 min-w-[120px] max-w-xs">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(solved.size / 12) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-right">{Math.round((solved.size / 12) * 100)}% complete</p>
        </div>
      </motion.div>

      {/* Exercises */}
      <Exercise31
        onAttempt={() => markAttempted('3.1')}
        onSolve={() => markSolved('3.1')}
      />
      <Exercise32
        onAttempt={() => markAttempted('3.2')}
        onSolve={() => markSolved('3.2')}
      />
      <Exercise33
        onAttempt={() => markAttempted('3.3')}
        onSolve={() => markSolved('3.3')}
      />
      <Exercise34
        onAttempt={() => markAttempted('3.4')}
        onSolve={() => markSolved('3.4')}
      />
      <Exercise35
        onAttempt={() => markAttempted('3.5')}
        onSolve={() => markSolved('3.5')}
      />
      <Exercise36
        onAttempt={() => markAttempted('3.6')}
        onSolve={() => markSolved('3.6')}
      />
      <Exercise37
        onAttempt={() => markAttempted('3.7')}
        onSolve={() => markSolved('3.7')}
      />
      <Exercise38
        onAttempt={() => markAttempted('3.8')}
        onSolve={() => markSolved('3.8')}
      />
      <Exercise39
        onAttempt={() => markAttempted('3.9')}
        onSolve={() => markSolved('3.9')}
      />
      <Exercise310
        onAttempt={() => markAttempted('3.10')}
        onSolve={() => markSolved('3.10')}
      />
      <Exercise311
        onAttempt={() => markAttempted('3.11')}
        onSolve={() => markSolved('3.11')}
      />
      <Exercise312
        onAttempt={() => markAttempted('3.12')}
        onSolve={() => markSolved('3.12')}
      />

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center py-6 space-y-2"
      >
        <p className="text-slate-500 text-sm">
          These exercises cover key ideas from Chapter 3: state spaces, the Markov property, transition probabilities, stationary distributions, and state classification.
        </p>
        <p className="text-slate-400 text-sm italic">
          For more practice, see the <strong>First Step Analysis</strong> and <strong>Branching Processes</strong> chapters.
        </p>
      </motion.div>
    </div>
  )
}
