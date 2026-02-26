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
            <p className="text-2xl font-bold text-purple-400">{attempted.size}<span className="text-slate-500 text-lg">/4</span></p>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <div>
            <span className="text-slate-400 text-sm">Solved</span>
            <p className="text-2xl font-bold text-emerald-400">{solved.size}<span className="text-slate-500 text-lg">/4</span></p>
          </div>
        </div>

        {/* progress bar */}
        <div className="flex-1 min-w-[120px] max-w-xs">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(solved.size / 4) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-right">{Math.round((solved.size / 4) * 100)}% complete</p>
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

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center py-6"
      >
        <p className="text-slate-500 text-sm">
          These exercises cover key ideas from Chapter 3: state spaces, the Markov property, and its implications.
        </p>
      </motion.div>
    </div>
  )
}
