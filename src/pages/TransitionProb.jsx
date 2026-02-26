import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ─── Mickey-in-Maze 9x9 transition matrix ─── */
const MICKEY_P = [
  [0, 1/2, 0, 1/2, 0, 0, 0, 0, 0],
  [1/3, 0, 1/3, 0, 1/3, 0, 0, 0, 0],
  [0, 1/2, 0, 0, 0, 1/2, 0, 0, 0],
  [1/3, 0, 0, 0, 1/3, 0, 1/3, 0, 0],
  [0, 1/4, 0, 1/4, 0, 1/4, 0, 1/4, 0],
  [0, 0, 1/3, 0, 1/3, 0, 0, 0, 1/3],
  [0, 0, 0, 1/2, 0, 0, 0, 1/2, 0],
  [0, 0, 0, 0, 1/3, 0, 1/3, 0, 1/3],
  [0, 0, 0, 0, 0, 1/2, 0, 1/2, 0],
]

/* ─── Matrix utilities ─── */
function matMul(A, B) {
  const n = A.length
  const C = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let l = 0; l < n; l++)
        C[i][j] += A[i][l] * B[l][j]
  return C
}

function identity(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )
}

function matPow(M, k) {
  if (k === 0) return identity(M.length)
  let result = M
  for (let i = 1; i < k; i++) result = matMul(result, M)
  return result
}

/* ─── Unicode superscript helper ─── */
const SUPERSCRIPT_DIGITS = {
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
  '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
  '8': '\u2078', '9': '\u2079',
}
function toSuperscript(n) {
  return String(n).split('').map(d => SUPERSCRIPT_DIGITS[d] || d).join('')
}

/* ─── Colour helpers ─── */
function heatColor(v) {
  if (v === 0) return 'rgba(99,102,241,0.05)'
  const t = Math.min(Math.abs(v), 1)
  const r = Math.round(99 + 66 * t)
  const g = Math.round(102 + 39 * t)
  const b = 241
  const a = 0.15 + 0.85 * t
  return `rgba(${r},${g},${b},${a})`
}

/* ─── Fraction display for table cells ─── */
function fracDisplay(v) {
  if (v === 0) return '0'
  if (v === 1) return '1'
  if (Math.abs(v - 0.5) < 1e-10) return '\u00BD'
  if (Math.abs(v - 1 / 3) < 1e-10) return '\u2153'
  if (Math.abs(v - 2 / 3) < 1e-10) return '\u2154'
  if (Math.abs(v - 0.25) < 1e-10) return '\u00BC'
  if (Math.abs(v - 0.75) < 1e-10) return '\u00BE'
  return v.toFixed(4)
}

/* ─── Section wrapper with scroll animation ─── */
function Section({ title, id, children }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className="section-card mb-8"
    >
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

/* ═══════════════════════════════════════════
   STATE DIAGRAM (Canvas)
   ═══════════════════════════════════════════ */
function StateDiagram({ matrix, highlightRow, size = 420 }) {
  const canvasRef = useRef(null)
  const n = matrix.length
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)

  const getPos = useCallback((idx) => {
    const pad = 56
    const r = Math.floor(idx / cols)
    const c = idx % cols
    return {
      x: pad + c * ((size - 2 * pad) / Math.max(cols - 1, 1)),
      y: pad + r * ((size - 2 * pad) / Math.max(rows - 1, 1)),
    }
  }, [cols, rows, size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const nodeR = 22

    // Draw edges
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 0 || i === j) continue
        const from = getPos(i)
        const to = getPos(j)
        const active = highlightRow === i

        const dx = to.x - from.x
        const dy = to.y - from.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / dist
        const uy = dy / dist

        const sx = from.x + ux * nodeR
        const sy = from.y + uy * nodeR
        const ex = to.x - ux * nodeR
        const ey = to.y - uy * nodeR

        // Curve offset for bidirectional edges
        const bidir = matrix[j][i] > 0
        const curveOff = bidir ? 12 : 0
        const perpX = -uy * curveOff
        const perpY = ux * curveOff
        const mx = (sx + ex) / 2 + perpX
        const my = (sy + ey) / 2 + perpY

        // Draw arc
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, ex, ey)
        ctx.strokeStyle = active ? '#818cf8' : 'rgba(148,163,184,0.3)'
        ctx.lineWidth = active ? 2.5 : 1.2
        ctx.stroke()

        // Arrowhead
        const angle = Math.atan2(ey - my, ex - mx)
        const aLen = 8
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - aLen * Math.cos(angle - 0.35), ey - aLen * Math.sin(angle - 0.35))
        ctx.lineTo(ex - aLen * Math.cos(angle + 0.35), ey - aLen * Math.sin(angle + 0.35))
        ctx.closePath()
        ctx.fillStyle = active ? '#818cf8' : 'rgba(148,163,184,0.45)'
        ctx.fill()

        // Edge label
        const lx = mx + perpX * 0.5
        const ly = my + perpY * 0.5
        ctx.font = `${active ? 'bold ' : ''}11px Inter, system-ui, sans-serif`
        ctx.fillStyle = active ? '#c7d2fe' : 'rgba(203,213,225,0.6)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const v = matrix[i][j]
        const label = Math.abs(v - 0.5) < 1e-10 ? '1/2'
          : Math.abs(v - 1 / 3) < 1e-10 ? '1/3'
          : Math.abs(v - 0.25) < 1e-10 ? '1/4'
          : v === 1 ? '1' : v.toFixed(2)
        ctx.fillText(label, lx, ly - 6)
      }
    }

    // Draw nodes
    for (let i = 0; i < n; i++) {
      const p = getPos(i)
      const hl = highlightRow === i
      ctx.beginPath()
      ctx.arc(p.x, p.y, nodeR, 0, 2 * Math.PI)
      ctx.fillStyle = hl ? '#4f46e5' : '#1e293b'
      ctx.fill()
      ctx.lineWidth = hl ? 3 : 1.5
      ctx.strokeStyle = hl ? '#818cf8' : '#475569'
      ctx.stroke()
      ctx.font = 'bold 14px Inter, system-ui, sans-serif'
      ctx.fillStyle = hl ? '#e0e7ff' : '#e2e8f0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${i + 1}`, p.x, p.y)
    }
  }, [matrix, highlightRow, size, n, getPos])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl border border-slate-700 bg-slate-800/40 mx-auto block"
      style={{ maxWidth: '100%' }}
    />
  )
}

/* ═══════════════════════════════════════════
   HEATMAP MATRIX DISPLAY
   ═══════════════════════════════════════════ */
function MatrixHeatmap({ matrix, highlightRow, onHoverRow, label, showRowSums }) {
  const n = matrix.length
  return (
    <div className="overflow-x-auto">
      {label && (
        <div className="text-center text-sm text-slate-400 mb-2 font-mono">{label}</div>
      )}
      <table className="mx-auto border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-xs text-slate-500" />
            {Array.from({ length: n }, (_, j) => (
              <th key={j} className="p-1 text-xs text-slate-400 font-mono w-12 text-center">{j + 1}</th>
            ))}
            {showRowSums && <th className="p-1 text-xs text-amber-400 font-mono pl-3">Sum</th>}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const rowSum = row.reduce((a, b) => a + b, 0)
            return (
              <tr
                key={i}
                onMouseEnter={() => onHoverRow?.(i)}
                onMouseLeave={() => onHoverRow?.(null)}
                className={`transition-colors ${highlightRow === i ? 'ring-1 ring-indigo-500 rounded' : ''}`}
              >
                <td className="p-1 text-xs text-slate-400 font-mono pr-2 text-right">{i + 1}</td>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className="w-12 h-10 text-center text-xs font-mono border border-slate-700/50 transition-all"
                    style={{
                      backgroundColor: heatColor(v),
                      color: Math.abs(v) > 0.3 ? '#e0e7ff' : '#94a3b8',
                    }}
                  >
                    {fracDisplay(v)}
                  </td>
                ))}
                {showRowSums && (
                  <td className={`p-1 text-xs font-mono pl-3 text-center ${Math.abs(rowSum - 1) < 1e-6 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {rowSum.toFixed(2)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function TransitionProb() {
  const [highlightRow, setHighlightRow] = useState(null)
  const [power, setPower] = useState(1)
  const [poweredMatrix, setPoweredMatrix] = useState(MICKEY_P)
  const [animating, setAnimating] = useState(false)
  const [showExample, setShowExample] = useState(false)

  useEffect(() => {
    setAnimating(true)
    const timer = setTimeout(() => {
      setPoweredMatrix(matPow(MICKEY_P, power))
      setAnimating(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [power])

  const powerLabel = power === 0 ? 'P\u2070 = I' : `P${toSuperscript(power)}`

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          3.3 Transition Probabilities
        </h1>
        <p className="text-slate-400 text-lg">
          How Markov chains move between states, captured by transition matrices and the Chapman-Kolmogorov equation.
        </p>
      </motion.div>

      {/* ── 1. One-Step Transition Probability ── */}
      <Section title="One-Step Transition Probability" id="one-step">
        <div className="definition-box mb-6">
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">Definition -- Transition Probability</h3>
          <p className="text-slate-300 mb-3">
            For a Markov chain <InlineMath math="\{X_n, n \ge 0\}" />, the{' '}
            <strong className="text-indigo-300">one-step transition probability</strong> from
            state <InlineMath math="i" /> to state <InlineMath math="j" /> is:
          </p>
          <BlockMath math="P_{ij} = P(X_{n+1} = j \mid X_n = i)" />
        </div>

        <div className="definition-box mb-6">
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">Stationary (Time-Homogeneous) Transitions</h3>
          <p className="text-slate-300 mb-3">
            A Markov chain has <strong className="text-indigo-300">stationary transition probabilities</strong> if{' '}
            <InlineMath math="P_{ij}" /> does not depend on the time index <InlineMath math="n" />:
          </p>
          <BlockMath math="P(X_{n+1} = j \mid X_n = i) = P_{ij} \quad \text{for all } n \ge 0" />
          <p className="text-slate-400 text-sm mt-3">
            Throughout this chapter we assume stationary transition probabilities. The rules of movement are the same at every time step.
          </p>
        </div>

        <p className="text-slate-300 mb-4">
          Transition probabilities must satisfy two conditions for each state <InlineMath math="i" />:
        </p>
        <div className="math-block">
          <BlockMath math="P_{ij} \ge 0 \;\; \text{for all } j, \qquad \sum_{j} P_{ij} = 1" />
        </div>
        <p className="text-slate-400 text-sm mt-3">
          Non-negativity and the requirement that probabilities of leaving any state sum to 1.
        </p>
      </Section>

      {/* ── 2. Transition Matrix Visualizer ── */}
      <Section title="Interactive Transition Matrix -- Mickey in Maze" id="matrix-viz">
        <p className="text-slate-300 mb-4">
          The transition probabilities are arranged into a{' '}
          <strong className="text-indigo-300">transition matrix</strong>{' '}
          <InlineMath math="P = (P_{ij})" />. Below is the 9-state matrix for Mickey navigating a 3x3 maze.
          Hover over any row to highlight that state's outgoing transitions on the diagram.
        </p>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Heatmap */}
          <div>
            <MatrixHeatmap
              matrix={MICKEY_P}
              highlightRow={highlightRow}
              onHoverRow={setHighlightRow}
              label="P (one-step)"
              showRowSums
            />
            <p className="text-center text-xs text-slate-500 mt-2">
              Hover a row to highlight outgoing edges on the diagram
            </p>
            <div className="flex items-center gap-4 justify-center mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: heatColor(0) }} /> 0
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: heatColor(0.25) }} /> 1/4
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: heatColor(0.5) }} /> 1/2
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: heatColor(1) }} /> 1
              </span>
            </div>
          </div>

          {/* State diagram */}
          <div>
            <StateDiagram matrix={MICKEY_P} highlightRow={highlightRow} size={380} />
            <p className="text-center text-xs text-slate-500 mt-2">
              3x3 maze: states 1--9 in grid layout
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300">
          <strong>Row sums = 1:</strong> Every row sums to exactly 1, confirming that the probability of
          transitioning somewhere (including staying) from each state totals 1.
        </div>
      </Section>

      {/* ── 3. k-Step Transition Probability ── */}
      <Section title="k-Step Transition Probability" id="k-step">
        <div className="definition-box mb-6">
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">Definition</h3>
          <p className="text-slate-300 mb-3">
            The <strong className="text-indigo-300"><InlineMath math="k" />-step transition probability</strong> is
            the probability of moving from state <InlineMath math="i" /> to state <InlineMath math="j" /> in
            exactly <InlineMath math="k" /> steps:
          </p>
          <BlockMath math="P_{ij}^{(k)} = P(X_{n+k} = j \mid X_n = i)" />
        </div>

        <p className="text-slate-300 mb-4">
          The <InlineMath math="k" />-step transition matrix{' '}
          <InlineMath math="P^{(k)} = \bigl(P_{ij}^{(k)}\bigr)" /> collects all these probabilities. By convention:
        </p>
        <div className="math-block">
          <BlockMath math="P^{(1)} = P \qquad \text{and} \qquad P^{(0)} = I \;\text{(identity matrix)}" />
        </div>
      </Section>

      {/* ── 4. Chapman-Kolmogorov ── */}
      <Section title="Chapman-Kolmogorov Theorem" id="ck">
        <div className="theorem-box mb-6">
          <h3 className="text-lg font-semibold text-amber-300 mb-3">Theorem 3.1 -- Chapman-Kolmogorov Equations</h3>
          <p className="text-slate-300 mb-3">
            For all states <InlineMath math="i, j" /> and non-negative integers{' '}
            <InlineMath math="0 \le m \le n" />:
          </p>
          <BlockMath math="P_{ij}^{(n)} = \sum_{l} P_{il}^{(m)} \cdot P_{lj}^{(n-m)}" />
          <p className="text-slate-300 mt-4">In matrix form:</p>
          <BlockMath math="P^{(n)} = P^{(m)} \cdot P^{(n-m)} = P^n" />
          <p className="text-slate-400 text-sm mt-3">
            The <InlineMath math="n" />-step transition matrix is simply the <InlineMath math="n" />-th power
            of <InlineMath math="P" />. To travel from <InlineMath math="i" /> to <InlineMath math="j" /> in{' '}
            <InlineMath math="n" /> steps, sum over all intermediate states <InlineMath math="l" /> reachable
            after <InlineMath math="m" /> steps.
          </p>
        </div>

        {/* Interactive Matrix Power Calculator */}
        <h3 className="text-xl font-semibold text-slate-200 mb-4">Interactive Matrix Power Calculator</h3>
        <p className="text-slate-400 mb-4">
          Compute <InlineMath math="P^k" /> for the Mickey maze. By Chapman-Kolmogorov,{' '}
          <InlineMath math="P^{(k)} = \underbrace{P \cdot P \cdots P}_{k}" />.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-slate-400 text-sm mr-1">Compute:</span>
          {[0, 1, 2, 3, 4, 5, 6, 8, 10, 20, 50].map(k => (
            <button
              key={k}
              onClick={() => setPower(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all cursor-pointer
                ${power === k
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
            >
              P{toSuperscript(k)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={power}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            {animating ? (
              <div className="text-center py-8 text-slate-400">
                Computing <InlineMath math={`P^{${power}}`} /> ...
              </div>
            ) : (
              <div>
                <MatrixHeatmap
                  matrix={poweredMatrix}
                  label={powerLabel}
                  showRowSums
                />
                {power >= 20 && (
                  <p className="text-center text-sm text-amber-300 mt-3">
                    Notice how all rows converge to the same distribution -- the <strong>stationary distribution</strong>.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Section>

      {/* ── 5. Example 3.3 Walkthrough ── */}
      <Section title="Example 3.3 -- Computing k-Step Probabilities" id="example-33">
        <p className="text-slate-300 mb-4">
          Using the Mickey maze matrix, we compute two 3-step transition probabilities by hand
          via the Chapman-Kolmogorov equations.
        </p>

        <button
          onClick={() => setShowExample(!showExample)}
          className="btn-primary mb-6"
        >
          {showExample ? 'Hide' : 'Show'} Detailed Computation
        </button>

        <AnimatePresence>
          {showExample && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              {/* Part (a): P_{48}^{(3)} */}
              <div className="example-box mb-6">
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">
                  Part (a): Compute <InlineMath math="P_{48}^{(3)}" />
                </h3>
                <p className="text-slate-300 mb-3">
                  Probability of going from state 4 to state 8 in exactly 3 steps.
                  Apply Chapman-Kolmogorov with <InlineMath math="m = 1" />:
                </p>
                <BlockMath math="P_{48}^{(3)} = \sum_{l=1}^{9} P_{4l} \cdot P_{l8}^{(2)}" />

                <p className="text-slate-300 mb-3">
                  Row 4 of <InlineMath math="P" /> has non-zero entries only at states 1, 5, and 7:
                </p>
                <BlockMath math="P_{41} = \tfrac{1}{3}, \quad P_{45} = \tfrac{1}{3}, \quad P_{47} = \tfrac{1}{3}" />

                <p className="text-slate-300 mb-3">So the sum reduces to three terms:</p>
                <BlockMath math="P_{48}^{(3)} = \tfrac{1}{3}\, P_{18}^{(2)} + \tfrac{1}{3}\, P_{58}^{(2)} + \tfrac{1}{3}\, P_{78}^{(2)}" />

                <p className="text-slate-300 mb-2">
                  Compute each 2-step probability <InlineMath math="P_{l8}^{(2)} = \sum_k P_{lk}\,P_{k8}" />:
                </p>
                <div className="ml-4 space-y-3 text-slate-300 text-sm">
                  <div>
                    <InlineMath math="P_{18}^{(2)} = P_{12}\,P_{28} + P_{14}\,P_{48} = \tfrac{1}{2}(0) + \tfrac{1}{2}(0) = 0" />
                  </div>
                  <div>
                    <InlineMath math="P_{58}^{(2)} = P_{52}\,P_{28} + P_{54}\,P_{48} + P_{56}\,P_{68} + P_{58}\,P_{88}" />
                    <div className="ml-6 mt-1">
                      <InlineMath math="= \tfrac{1}{4}(0) + \tfrac{1}{4}(0) + \tfrac{1}{4}(0) + \tfrac{1}{4}(0) = 0" />
                    </div>
                  </div>
                  <div>
                    <InlineMath math="P_{78}^{(2)} = P_{74}\,P_{48} + P_{78}\,P_{88} = \tfrac{1}{2}(0) + \tfrac{1}{2}(0) = 0" />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <BlockMath math="P_{48}^{(3)} = \tfrac{1}{3}(0) + \tfrac{1}{3}(0) + \tfrac{1}{3}(0) = 0" />
                  <p className="text-sm text-emerald-300 text-center">
                    State 4 cannot reach state 8 in exactly 3 steps.
                  </p>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                  Verification: entry (4,8) of <InlineMath math="P^3" /> computed above ={' '}
                  {matPow(MICKEY_P, 3)[3][7].toFixed(4)}.
                </p>
              </div>

              {/* Part (b): P_{18}^{(3)} */}
              <div className="example-box">
                <h3 className="text-lg font-semibold text-emerald-300 mb-3">
                  Part (b): Compute <InlineMath math="P_{18}^{(3)}" />
                </h3>
                <p className="text-slate-300 mb-3">
                  Probability of going from state 1 to state 8 in 3 steps. Again with <InlineMath math="m = 1" />:
                </p>
                <BlockMath math="P_{18}^{(3)} = \sum_{l=1}^{9} P_{1l} \cdot P_{l8}^{(2)}" />

                <p className="text-slate-300 mb-3">
                  Row 1 has <InlineMath math="P_{12} = \tfrac{1}{2}" /> and <InlineMath math="P_{14} = \tfrac{1}{2}" />, so:
                </p>
                <BlockMath math="P_{18}^{(3)} = \tfrac{1}{2}\, P_{28}^{(2)} + \tfrac{1}{2}\, P_{48}^{(2)}" />

                <p className="text-slate-300 mb-2">
                  Compute each 2-step probability:
                </p>
                <div className="ml-4 space-y-3 text-slate-300 text-sm">
                  <div>
                    <strong className="text-slate-200">
                      <InlineMath math="P_{28}^{(2)}" />:
                    </strong>{' '}
                    Row 2 has <InlineMath math="P_{21}=\tfrac{1}{3},\; P_{23}=\tfrac{1}{3},\; P_{25}=\tfrac{1}{3}" />.
                    <div className="ml-6 mt-1">
                      <InlineMath math="P_{28}^{(2)} = \tfrac{1}{3}\,P_{18} + \tfrac{1}{3}\,P_{38} + \tfrac{1}{3}\,P_{58}" />
                    </div>
                    <div className="ml-6 mt-1">
                      <InlineMath math="= \tfrac{1}{3}(0) + \tfrac{1}{3}(0) + \tfrac{1}{3}\!\left(\tfrac{1}{4}\right) = \tfrac{1}{12}" />
                    </div>
                    <div className="ml-6 text-xs text-slate-500 mt-1">
                      Note: <InlineMath math="P_{58} = \tfrac{1}{4}" /> (row 5, column 8 of <InlineMath math="P" />).
                    </div>
                  </div>

                  <div>
                    <strong className="text-slate-200">
                      <InlineMath math="P_{48}^{(2)}" />:
                    </strong>{' '}
                    Row 4 has <InlineMath math="P_{41}=\tfrac{1}{3},\; P_{45}=\tfrac{1}{3},\; P_{47}=\tfrac{1}{3}" />.
                    <div className="ml-6 mt-1">
                      <InlineMath math="P_{48}^{(2)} = \tfrac{1}{3}\,P_{18} + \tfrac{1}{3}\,P_{58} + \tfrac{1}{3}\,P_{78}" />
                    </div>
                    <div className="ml-6 mt-1">
                      <InlineMath math="= \tfrac{1}{3}(0) + \tfrac{1}{3}\!\left(\tfrac{1}{4}\right) + \tfrac{1}{3}\!\left(\tfrac{1}{2}\right) = \tfrac{1}{12} + \tfrac{1}{6} = \tfrac{1}{4}" />
                    </div>
                    <div className="ml-6 text-xs text-slate-500 mt-1">
                      Note: <InlineMath math="P_{78} = \tfrac{1}{2}" /> (row 7, column 8 of <InlineMath math="P" />).
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <BlockMath math="P_{18}^{(3)} = \tfrac{1}{2} \cdot \tfrac{1}{12} + \tfrac{1}{2} \cdot \tfrac{1}{4} = \tfrac{1}{24} + \tfrac{3}{24} = \tfrac{4}{24} = \tfrac{1}{6}" />
                  <p className="text-sm text-emerald-300 text-center mt-1">
                    <InlineMath math="P_{18}^{(3)} = \dfrac{1}{6} \approx 0.1667" />
                  </p>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                  Verification: entry (1,8) of <InlineMath math="P^3" /> ={' '}
                  {matPow(MICKEY_P, 3)[0][7].toFixed(4)}, and{' '}
                  <InlineMath math="\tfrac{1}{6}" /> = {(1 / 6).toFixed(4)}.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* ── Key Takeaways ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="section-card bg-gradient-to-br from-indigo-950/50 to-purple-950/50"
      >
        <h2 className="text-xl font-bold mb-4 text-slate-200">Key Takeaways</h2>
        <ul className="space-y-2 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-1">--</span>
            The transition matrix <InlineMath math="P" /> encodes all one-step movement probabilities; each row sums to 1.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-1">--</span>
            The <InlineMath math="k" />-step transition matrix equals the <InlineMath math="k" />-th matrix power: <InlineMath math="P^{(k)} = P^k" />.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-1">--</span>
            Chapman-Kolmogorov: break any multi-step path into two sub-paths and sum over intermediate states.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-1">--</span>
            As <InlineMath math="k \to \infty" />, rows of <InlineMath math="P^k" /> often converge to a common stationary distribution.
          </li>
        </ul>
      </motion.div>
    </div>
  )
}
