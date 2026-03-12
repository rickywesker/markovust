import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'
import { matMul, matPow, identity, heatColor } from '../utils/matrix'
import MarkovDiagram from '../components/MarkovDiagram'

function allPositive(M) {
  for (let i = 0; i < M.length; i++)
    for (let j = 0; j < M[i].length; j++)
      if (M[i][j] <= 1e-12) return false
  return true
}

const LINE_COLORS = [
  '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#22d3ee', '#e879f9', '#4ade80',
]

/* ─── Section wrapper ─── */
function Section({ title, id, children, color = 'from-indigo-400 to-purple-400' }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className="section-card mb-8"
    >
      <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

/* ─── Collapsible panel ─── */
function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-300">{title}</span>
        <span className="text-slate-500 text-lg">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Editable matrix input ─── */
function MatrixInput({ matrix, setMatrix, labels }) {
  const n = matrix.length
  const handleChange = (i, j, val) => {
    const v = parseFloat(val)
    if (isNaN(v)) return
    const next = matrix.map(r => [...r])
    next[i][j] = v
    setMatrix(next)
  }
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-xs text-slate-500" />
            {Array.from({ length: n }, (_, j) => (
              <th key={j} className="p-1 text-xs text-slate-400 font-mono w-16 text-center">
                {labels ? labels[j] : j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="p-1 text-xs text-slate-400 font-mono pr-2 text-right">
                {labels ? labels[i] : i}
              </td>
              {row.map((v, j) => (
                <td key={j} className="p-0.5">
                  <input
                    type="number"
                    step="0.01"
                    value={v}
                    onChange={e => handleChange(i, j, e.target.value)}
                    className="w-16 h-9 text-center text-xs font-mono bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
              ))}
              <td className="pl-2 text-xs font-mono">
                <span className={Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 0.01 ? 'text-emerald-400' : 'text-red-400'}>
                  {row.reduce((a, b) => a + b, 0).toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Display matrix (non-editable heatmap) ─── */
function MatrixDisplay({ matrix, label, precision = 4 }) {
  const n = matrix.length
  return (
    <div className="overflow-x-auto">
      {label && <div className="text-center text-sm text-slate-400 mb-2 font-mono">{label}</div>}
      <table className="mx-auto border-collapse">
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td
                  key={j}
                  className="w-16 h-9 text-center text-xs font-mono border border-slate-700/50 transition-all"
                  style={{
                    backgroundColor: heatColor(v),
                    color: Math.abs(v) > 0.2 ? '#e0e7ff' : '#94a3b8',
                  }}
                >
                  {v.toFixed(precision)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   1. MATRIX POWER CONVERGENCE VISUALIZER
   ═══════════════════════════════════════════════════════ */
function MatrixPowerVisualizer() {
  const PRESETS = {
    'Example 4.1 (Converges)': [[0.33, 0.67], [0.75, 0.25]],
    'Example 4.2 (Periodic)': [[0, 1], [1, 0]],
    '3-State Regular': [[0, 0.5, 0.5], [0.25, 0, 0.75], [2/3, 1/6, 1/6]],
    '3-State Cyclic (Not Regular)': [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    'Mr. C (Home/Office/Gym)': [[0, 0.9, 0.1], [0.1, 0, 0.9], [0.8, 0.2, 0]],
  }

  const [matrix, setMatrix] = useState(PRESETS['Example 4.1 (Converges)'])
  const [power, setPower] = useState(1)
  const [playing, setPlaying] = useState(false)
  const canvasRef = useRef(null)
  const playRef = useRef(null)

  const n = matrix.length
  const powered = useMemo(() => matPow(matrix, power), [matrix, power])

  // Compute history for the convergence plot
  const history = useMemo(() => {
    const maxK = 50
    const hist = []
    for (let k = 0; k <= maxK; k++) {
      hist.push(matPow(matrix, k))
    }
    return hist
  }, [matrix])

  // Auto-play animation
  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setPower(prev => {
          if (prev >= 50) { setPlaying(false); return 50 }
          return prev + 1
        })
      }, 300)
    }
    return () => clearInterval(playRef.current)
  }, [playing])

  // Draw convergence plot
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 20, padT = 20, padB = 35
    const plotW = W - padL - padR
    const plotH = H - padT - padB
    const maxK = 50

    // Grid and axes
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (let y = 0; y <= 4; y++) {
      const py = padT + plotH * (1 - y / 4)
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText((y * 0.25).toFixed(2), padL - 6, py + 3)
    }
    // x-axis labels
    ctx.textAlign = 'center'
    for (let x = 0; x <= 50; x += 10) {
      const px = padL + (x / maxK) * plotW
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(`${x}`, px, padT + plotH + 18)
    }
    ctx.fillText('n', padL + plotW / 2, padT + plotH + 32)

    // Axis lines
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Plot each entry P_{ij}^{(k)}
    let colorIdx = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const color = LINE_COLORS[colorIdx % LINE_COLORS.length]
        colorIdx++
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let k = 0; k <= maxK; k++) {
          const val = history[k][i][j]
          const px = padL + (k / maxK) * plotW
          const py = padT + plotH * (1 - val)
          if (k === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Label at end
        const endVal = history[maxK][i][j]
        const px = padL + plotW + 4
        const py = padT + plotH * (1 - endVal)
        ctx.fillStyle = color
        ctx.font = '9px Inter, system-ui, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`P${i}${j}`, px, py + 3)
      }
    }

    // Vertical line at current power
    const cx = padL + (power / maxK) * plotW
    ctx.strokeStyle = 'rgba(251,191,36,0.6)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + plotH); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`n=${power}`, cx, padT - 5)
  }, [history, power, n])

  const loadPreset = (name) => {
    setMatrix(PRESETS[name])
    setPower(1)
    setPlaying(false)
  }

  const rowsEqual = (() => {
    for (let i = 1; i < n; i++)
      for (let j = 0; j < n; j++)
        if (Math.abs(powered[0][j] - powered[i][j]) > 0.005) return false
    return power > 1
  })()

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-3">Matrix Power Convergence Visualizer</h3>
      <p className="text-slate-300 mb-4">
        Enter a transition matrix and watch <InlineMath math="P^n" /> converge as <InlineMath math="n \to \infty" />.
        For regular chains, all rows converge to the same stationary distribution.
      </p>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PRESETS).map(name => (
          <button key={name} onClick={() => loadPreset(name)} className="btn-secondary text-xs !px-3 !py-1.5">
            {name}
          </button>
        ))}
      </div>

      {/* Matrix input */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => { setMatrix([[0.5, 0.5], [0.5, 0.5]]); setPower(1) }}
          className="btn-secondary text-xs !px-3 !py-1">2x2</button>
        <button onClick={() => { setMatrix([[1/3,1/3,1/3],[1/3,1/3,1/3],[1/3,1/3,1/3]]); setPower(1) }}
          className="btn-secondary text-xs !px-3 !py-1">3x3</button>
      </div>
      <MatrixInput matrix={matrix} setMatrix={setMatrix} />

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">n =</span>
          <input
            type="range" min={0} max={50} value={power}
            onChange={e => setPower(parseInt(e.target.value))}
            className="w-48 accent-indigo-500"
          />
          <span className="text-sm font-mono text-amber-400 w-8">{power}</span>
        </div>
        <button onClick={() => { setPower(1); setPlaying(true) }} className="btn-primary text-sm !px-4 !py-2">
          Animate
        </button>
        <button onClick={() => setPlaying(false)} className="btn-secondary text-sm !px-4 !py-2">
          Stop
        </button>
      </div>

      {/* Current P^n display */}
      <div className="mt-4">
        <MatrixDisplay matrix={powered} label={`P^${power}`} />
        {rowsEqual && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 text-center text-emerald-400 text-sm font-semibold"
          >
            All rows have converged to the same vector!
          </motion.div>
        )}
      </div>

      {/* Convergence plot */}
      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 300 }} />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-center">
        Each colored line tracks one entry <InlineMath math="P_{ij}^{(n)}" /> over time.
        For regular chains, entries in the same column converge to the same value.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   2. REGULARITY CHECKER
   ═══════════════════════════════════════════════════════ */
function RegularityChecker() {
  const PRESETS = {
    'Regular (3-state)': [[0, 0.5, 0.5], [0.25, 0, 0.75], [2/3, 1/6, 1/6]],
    'Cyclic (period 3)': [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    'Absorbing state': [[0.5, 0.4, 0.1], [0.2, 0.8, 0], [0, 0, 1]],
    'Periodic (2-state)': [[0, 1], [1, 0]],
    'Example 4.1': [[0.33, 0.67], [0.75, 0.25]],
  }

  const [matrix, setMatrix] = useState(PRESETS['Regular (3-state)'])
  const [result, setResult] = useState(null)

  const check = useCallback(() => {
    const n = matrix.length
    let Pk = identity(n)
    let foundK = -1
    const powers = []
    for (let k = 1; k <= 30; k++) {
      Pk = matMul(Pk, matrix)
      const isPos = allPositive(Pk)
      powers.push({ k, matrix: Pk.map(r => [...r]), allPositive: isPos })
      if (isPos && foundK === -1) foundK = k
    }
    // Check sufficient condition: all states communicate + self-loop exists
    let hasSelfLoop = false
    for (let i = 0; i < n; i++) if (matrix[i][i] > 1e-12) hasSelfLoop = true
    setResult({ foundK, powers, hasSelfLoop })
  }, [matrix])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-purple-400 mb-3">Regularity Checker</h3>
      <p className="text-slate-300 mb-4">
        A matrix <InlineMath math="P" /> is <strong className="text-amber-400">regular</strong> if
        some power <InlineMath math="P^k" /> has <em>all positive</em> entries.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PRESETS).map(name => (
          <button key={name} onClick={() => { setMatrix(PRESETS[name]); setResult(null) }}
            className="btn-secondary text-xs !px-3 !py-1.5">{name}</button>
        ))}
      </div>

      <MatrixInput matrix={matrix} setMatrix={setMatrix} />

      <div className="mt-4">
        <button onClick={check} className="btn-primary text-sm !px-6 !py-2">Check Regularity</button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          {result.foundK > 0 ? (
            <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700">
              <p className="text-emerald-400 font-bold text-lg">Regular (P^{result.foundK} has all positive entries)</p>
              <MatrixDisplay matrix={result.powers[result.foundK - 1].matrix} label={`P^${result.foundK}`} />
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-red-900/30 border border-red-700">
              <p className="text-red-400 font-bold text-lg">Not regular (tested up to P^30, no power has all positive entries)</p>
              {!result.hasSelfLoop && (
                <p className="text-red-300 text-sm mt-1">
                  Note: no diagonal entry is positive -- lacking a self-loop is a common reason for non-regularity (periodicity).
                </p>
              )}
            </div>
          )}

          <Collapsible title="Show powers P^1 through P^10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {result.powers.slice(0, 10).map(({ k, matrix: M, allPositive: ap }) => (
                <div key={k} className={`p-2 rounded border ${ap ? 'border-emerald-600 bg-emerald-900/10' : 'border-slate-700'}`}>
                  <MatrixDisplay matrix={M} label={`P^${k}${ap ? ' (all positive)' : ''}`} precision={3} />
                </div>
              ))}
            </div>
          </Collapsible>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   3. STATIONARY DISTRIBUTION CALCULATOR
   ═══════════════════════════════════════════════════════ */
function solveStationary(P) {
  // Solve piP = pi, sum(pi)=1 using Gaussian elimination
  // This means pi_j = sum_k pi_k P_{kj} for all j
  // Rearrange: sum_k pi_k (P_{kj} - delta_{kj}) = 0 for all j
  // Plus sum pi_k = 1
  const n = P.length
  // Build augmented matrix: (P^T - I) rows, then replace last row with [1,1,...,1|1]
  const A = Array.from({ length: n }, () => Array(n + 1).fill(0))
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) {
      A[j][k] = P[k][j] - (k === j ? 1 : 0)
    }
    A[j][n] = 0
  }
  // Replace last equation with sum = 1
  for (let k = 0; k < n; k++) A[n - 1][k] = 1
  A[n - 1][n] = 1

  // Gauss elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]]
    if (Math.abs(A[col][col]) < 1e-12) continue
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = A[row][col] / A[col][col]
      for (let k = col; k <= n; k++) A[row][k] -= factor * A[col][k]
    }
  }
  const pi = Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    pi[i] = Math.abs(A[i][i]) > 1e-12 ? A[i][n] / A[i][i] : 0
  }
  return pi
}

function StationaryCalculator() {
  const [matrix, setMatrix] = useState([[0, 0.9, 0.1], [0.1, 0, 0.9], [0.8, 0.2, 0]])
  const [labels, setLabels] = useState(['H', 'O', 'G'])
  const [pi, setPi] = useState(null)
  const [simData, setSimData] = useState(null)
  const [simRunning, setSimRunning] = useState(false)
  const simRef = useRef(null)
  const canvasRef = useRef(null)

  const n = matrix.length

  const compute = () => {
    const result = solveStationary(matrix)
    setPi(result)
    setSimData(null)
  }

  // Simulation
  const runSimulation = useCallback(() => {
    if (simRunning) { setSimRunning(false); return }
    setSimRunning(true)
    const counts = Array(n).fill(0)
    let state = 0, step = 0
    const maxSteps = 5000
    const snapshots = []

    const tick = () => {
      const batch = 20
      for (let b = 0; b < batch && step < maxSteps; b++, step++) {
        counts[state]++
        // Transition
        const r = Math.random()
        let cum = 0
        for (let j = 0; j < n; j++) {
          cum += matrix[state][j]
          if (r < cum) { state = j; break }
        }
        if (step % 10 === 0) {
          const total = counts.reduce((a, b) => a + b, 0)
          snapshots.push(counts.map(c => c / total))
        }
      }
      setSimData({ counts: [...counts], step, snapshots: [...snapshots] })
      if (step < maxSteps) {
        simRef.current = requestAnimationFrame(tick)
      } else {
        setSimRunning(false)
      }
    }
    simRef.current = requestAnimationFrame(tick)
  }, [matrix, n, simRunning])

  useEffect(() => () => cancelAnimationFrame(simRef.current), [])

  // Draw simulation convergence on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !simData || !simData.snapshots.length) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 20, padT = 20, padB = 30
    const plotW = W - padL - padR, plotH = H - padT - padB
    const snaps = simData.snapshots

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // y-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= 4; y++) {
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText((y * 0.25).toFixed(2), padL - 6, py + 3)
    }

    // Plot empirical frequencies
    for (let j = 0; j < n; j++) {
      ctx.strokeStyle = LINE_COLORS[j]
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let s = 0; s < snaps.length; s++) {
        const px = padL + (s / (snaps.length - 1 || 1)) * plotW
        const py = padT + plotH * (1 - snaps[s][j])
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()

      // Theoretical pi as dashed line
      if (pi && pi[j] > 0) {
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = LINE_COLORS[j]
        ctx.lineWidth = 1
        const py = padT + plotH * (1 - pi[j])
        ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = LINE_COLORS[j]
        ctx.textAlign = 'left'
        ctx.fillText(`${labels[j] || j}: ${pi[j].toFixed(3)}`, padL + plotW + 4, py + 3)
      }
    }
  }, [simData, pi, n, labels])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-amber-400 mb-3">Stationary Distribution Calculator</h3>
      <p className="text-slate-300 mb-4">
        Solve <InlineMath math={String.raw`\boldsymbol{\pi} P = \boldsymbol{\pi}`} /> with{' '}
        <InlineMath math={String.raw`\sum_i \pi_i = 1`} />.
        Then run a simulation to see the empirical distribution converge.
      </p>

      <MatrixInput matrix={matrix} setMatrix={setMatrix} labels={labels} />

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={compute} className="btn-primary text-sm !px-6 !py-2">Solve for pi</button>
        <button onClick={runSimulation} className={`${simRunning ? 'btn-secondary' : 'btn-primary'} text-sm !px-6 !py-2`}>
          {simRunning ? 'Stop Simulation' : 'Run Simulation'}
        </button>
      </div>

      {pi && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <div className="definition-box">
            <h4 className="text-lg font-bold text-indigo-400 mb-2">Stationary Distribution</h4>
            <div className="flex flex-wrap gap-4 items-center">
              {pi.map((v, i) => (
                <div key={i} className="text-center">
                  <div className="text-xs text-slate-400">{labels[i] || `State ${i}`}</div>
                  <div className="text-lg font-mono font-bold" style={{ color: LINE_COLORS[i] }}>
                    {v.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <BlockMath math={String.raw`\boldsymbol{\pi} = (${pi.map(v => v.toFixed(4)).join(',\\; ')})`} />
            </div>
          </div>

          {/* Bar chart */}
          <div className="mt-4 flex items-end justify-center gap-4 h-40">
            {pi.map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-xs font-mono text-slate-300 mb-1">{v.toFixed(3)}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${v * 120}px` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="w-12 rounded-t"
                  style={{ backgroundColor: LINE_COLORS[i] }}
                />
                <span className="text-xs text-slate-400 mt-1">{labels[i] || i}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {simData && (
        <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 260 }} />
        </div>
      )}
      {simData && (
        <p className="text-xs text-slate-500 mt-1 text-center">
          Simulation step: {simData.step}. Solid lines = empirical frequencies. Dashed = theoretical pi.
        </p>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   4. MR. C DAILY LIFE SIMULATOR
   ═══════════════════════════════════════════════════════ */
function MrCSimulator() {
  const P = [[0, 0.9, 0.1], [0.1, 0, 0.9], [0.8, 0.2, 0]]
  const labels = ['Home', 'Office', 'Gym']
  const colors = ['#f472b6', '#60a5fa', '#34d399']
  const hours = [12, 10, 2]
  const piTheory = [0.309, 0.347, 0.343]

  const [state, setState] = useState(0)
  const [counts, setCounts] = useState([0, 0, 0])
  const [step, setStep] = useState(0)
  const [trail, setTrail] = useState([0])
  const [running, setRunning] = useState(false)
  const animRef = useRef(null)
  const canvasRef = useRef(null)

  const transition = useCallback(() => {
    const r = Math.random()
    let cum = 0
    let next = 0
    for (let j = 0; j < 3; j++) {
      cum += P[state][j]
      if (r < cum) { next = j; break }
    }
    const newCounts = [...counts]
    newCounts[next]++
    setCounts(newCounts)
    setState(next)
    setStep(s => s + 1)
    setTrail(t => [...t.slice(-99), next])
  }, [state, counts])

  const runAuto = useCallback(() => {
    if (running) { setRunning(false); return }
    setRunning(true)
  }, [running])

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }
    animRef.current = setInterval(() => {
      setState(prev => {
        const r = Math.random()
        let cum = 0, next = 0
        for (let j = 0; j < 3; j++) {
          cum += P[prev][j]
          if (r < cum) { next = j; break }
        }
        setCounts(c => { const nc = [...c]; nc[next]++; return nc })
        setStep(s => s + 1)
        setTrail(t => [...t.slice(-99), next])
        return next
      })
    }, 150)
    return () => clearInterval(animRef.current)
  }, [running])

  const reset = () => {
    setRunning(false)
    setState(0); setCounts([0, 0, 0]); setStep(0); setTrail([0])
  }

  const totalCount = counts.reduce((a, b) => a + b, 0) || 1
  const empirical = counts.map(c => c / totalCount)

  // Weighted time fractions
  const weightedNumerators = empirical.map((p, i) => p * hours[i])
  const weightedDenom = weightedNumerators.reduce((a, b) => a + b, 0) || 1
  const timeFractions = weightedNumerators.map(x => x / weightedDenom)

  // Draw state diagram
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2, cy = H / 2 + 10
    const R = Math.min(W, H) * 0.32
    const positions = [
      { x: cx, y: cy - R },           // Home (top)
      { x: cx + R * 0.87, y: cy + R * 0.5 }, // Office (bottom-right)
      { x: cx - R * 0.87, y: cy + R * 0.5 }, // Gym (bottom-left)
    ]
    const nodeR = 30

    // Draw edges
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (P[i][j] === 0 || i === j) continue
        const from = positions[i], to = positions[j]
        const dx = to.x - from.x, dy = to.y - from.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / dist, uy = dy / dist
        const bidir = P[j][i] > 0
        const off = bidir ? 14 : 0
        const perpX = -uy * off, perpY = ux * off

        const sx = from.x + ux * nodeR + perpX * 0.5
        const sy = from.y + uy * nodeR + perpY * 0.5
        const ex = to.x - ux * nodeR + perpX * 0.5
        const ey = to.y - uy * nodeR + perpY * 0.5
        const mx = (sx + ex) / 2 + perpX, my = (sy + ey) / 2 + perpY

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, ex, ey)
        ctx.strokeStyle = 'rgba(148,163,184,0.4)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Arrowhead
        const angle = Math.atan2(ey - my, ex - mx)
        const aLen = 8
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - aLen * Math.cos(angle - 0.35), ey - aLen * Math.sin(angle - 0.35))
        ctx.lineTo(ex - aLen * Math.cos(angle + 0.35), ey - aLen * Math.sin(angle + 0.35))
        ctx.closePath()
        ctx.fillStyle = 'rgba(148,163,184,0.5)'
        ctx.fill()

        // Label
        ctx.fillStyle = '#94a3b8'
        ctx.font = '11px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(P[i][j].toFixed(1), mx + perpX * 0.6, my + perpY * 0.6 - 4)
      }
    }

    // Draw nodes
    for (let i = 0; i < 3; i++) {
      const p = positions[i]
      const isActive = state === i
      ctx.beginPath()
      ctx.arc(p.x, p.y, nodeR, 0, 2 * Math.PI)

      if (isActive) {
        ctx.fillStyle = colors[i] + '40'
        ctx.fill()
        ctx.lineWidth = 3
        ctx.strokeStyle = colors[i]
        // Glow
        ctx.shadowColor = colors[i]
        ctx.shadowBlur = 15
      } else {
        ctx.fillStyle = '#1e293b'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#475569'
        ctx.shadowBlur = 0
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.font = 'bold 13px Inter, system-ui, sans-serif'
      ctx.fillStyle = isActive ? colors[i] : '#e2e8f0'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(labels[i], p.x, p.y)
    }

    // Title
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'center'
    ctx.fillText("Mr. C's State Diagram", cx, 20)
  }, [state])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-pink-400 mb-3">Mr. C Daily Life Simulator (Example 4.4)</h3>
      <p className="text-slate-300 mb-2">
        Mr. C moves between <span className="text-pink-400 font-semibold">Home (12 hrs)</span>,{' '}
        <span className="text-blue-400 font-semibold">Office (10 hrs)</span>, and{' '}
        <span className="text-emerald-400 font-semibold">Gym (2 hrs)</span>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State diagram */}
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 280 }} />
        </div>

        {/* Stats panel */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={runAuto} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
              {running ? 'Stop' : 'Auto-Run'}
            </button>
            <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
          </div>

          <div className="text-sm text-slate-400 mb-2">Step: <span className="text-amber-400 font-mono">{step}</span></div>
          <div className="text-sm text-slate-400 mb-3">
            Current: <span className="font-bold" style={{ color: colors[state] }}>{labels[state]}</span>
          </div>

          {/* Trail visualization */}
          <div className="flex flex-wrap gap-0.5 mb-4 max-h-16 overflow-hidden">
            {trail.slice(-60).map((s, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[s] }} />
            ))}
          </div>

          {/* Empirical vs Theoretical */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left p-1">State</th>
                <th className="text-center p-1">Empirical</th>
                <th className="text-center p-1">Theoretical</th>
                <th className="text-center p-1">Time Frac</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i}>
                  <td className="p-1 font-semibold" style={{ color: colors[i] }}>{l} ({hours[i]}h)</td>
                  <td className="p-1 text-center font-mono text-slate-300">{empirical[i].toFixed(3)}</td>
                  <td className="p-1 text-center font-mono text-slate-300">{piTheory[i].toFixed(3)}</td>
                  <td className="p-1 text-center font-mono text-slate-300">{(timeFractions[i] * 24).toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   5. SPACE vs TIME AVERAGE DEMO
   ═══════════════════════════════════════════════════════ */
function SpaceTimeDemo() {
  const P = [[0.33, 0.67], [0.75, 0.25]]
  const piTheory = [0.5283, 0.4717]
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(0)
  const [spaceData, setSpaceData] = useState([])
  const [timeData, setTimeData] = useState([])
  const animRef = useRef(null)
  const chainsRef = useRef(null)
  const singleRef = useRef(null)
  const canvasRef = useRef(null)

  const NUM_CHAINS = 200

  const reset = () => {
    setRunning(false)
    setStep(0)
    setSpaceData([])
    setTimeData([])
    chainsRef.current = null
    singleRef.current = null
  }

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }

    if (!chainsRef.current) {
      chainsRef.current = Array(NUM_CHAINS).fill(0)
      singleRef.current = { state: 0, counts: [0, 0] }
    }

    animRef.current = setInterval(() => {
      // Advance all chains one step (space average)
      const chains = chainsRef.current
      for (let c = 0; c < NUM_CHAINS; c++) {
        const r = Math.random()
        chains[c] = r < P[chains[c]][0] ? 0 : 1
      }
      const inState0 = chains.filter(s => s === 0).length
      const spaceFrac = inState0 / NUM_CHAINS

      // Advance single chain (time average)
      const single = singleRef.current
      const r = Math.random()
      single.state = r < P[single.state][0] ? 0 : 1
      single.counts[single.state]++
      const totalSteps = single.counts[0] + single.counts[1]
      const timeFrac = single.counts[0] / totalSteps

      setStep(s => s + 1)
      setSpaceData(d => [...d, spaceFrac])
      setTimeData(d => [...d, timeFrac])
    }, 60)
    return () => clearInterval(animRef.current)
  }, [running])

  // Draw comparison plot
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || spaceData.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 80, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB
    const maxN = spaceData.length

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= 4; y++) {
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText((y * 0.25).toFixed(2), padL - 6, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }
    ctx.textAlign = 'center'
    ctx.fillText('Step n', padL + plotW / 2, padT + plotH + 28)

    // Theoretical pi_0 line
    const piY = padT + plotH * (1 - piTheory[0])
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, piY); ctx.lineTo(padL + plotW, piY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'left'
    ctx.fillText(`pi_0 = ${piTheory[0].toFixed(3)}`, padL + plotW + 6, piY + 3)

    // Space average line
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < maxN; i++) {
      const px = padL + (i / (maxN - 1 || 1)) * plotW
      const py = padT + plotH * (1 - spaceData[i])
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Time average line
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < maxN; i++) {
      const px = padL + (i / (maxN - 1 || 1)) * plotW
      const py = padT + plotH * (1 - timeData[i])
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Legend
    const ly = padT + 10
    ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
    ctx.fillRect(padL + plotW + 6, ly, 12, 3)
    ctx.fillText('Space avg', padL + plotW + 22, ly + 4)
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(padL + plotW + 6, ly + 16, 12, 3)
    ctx.fillText('Time avg', padL + plotW + 22, ly + 20)
  }, [spaceData, timeData])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-cyan-400 mb-3">Space Average vs Time Average</h3>
      <p className="text-slate-300 mb-2">
        <span className="text-blue-400 font-semibold">Space average</span>: At time n, the fraction of
        {' '}{NUM_CHAINS} independent copies in state 0.
      </p>
      <p className="text-slate-300 mb-4">
        <span className="text-pink-400 font-semibold">Time average</span>: For one single chain, the fraction
        of time spent in state 0 up to step n.
      </p>
      <p className="text-slate-300 mb-4">
        Both converge to <InlineMath math={String.raw`\pi_0 \approx 0.528`} /> as <InlineMath math="n \to \infty" />.
      </p>

      <div className="flex gap-3 mb-4">
        <button onClick={() => setRunning(!running)} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
        <span className="text-sm text-slate-400 self-center">Step: <span className="text-amber-400 font-mono">{step}</span></span>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 300 }} />
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function RegularMC() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            4.1-4.2 Regular Markov Chains &amp; The Limit Theorem
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          What happens to a Markov chain in the long run? When does <InlineMath math="P^n" /> converge,
          and what does it converge to?
        </p>
      </motion.div>

      {/* ─── Section 1: Motivation & Convergence ─── */}
      <Section title="Convergence of P^n: A Surprising Phenomenon" id="convergence" color="from-emerald-400 to-teal-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Key Observation</h4>
          <p className="text-slate-300 mb-3">
            For certain transition matrices, as we compute higher and higher powers <InlineMath math="P^n" />,
            something remarkable happens: <strong className="text-emerald-300">all rows converge to the same vector</strong>.
          </p>
          <p className="text-slate-300">
            This means the long-run probability of being in any state is
            <em className="text-amber-300"> independent of where we started</em>.
          </p>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-blue-400 mb-2">Example 4.1: Convergence</h4>
          <p className="text-slate-300 mb-3">
            Consider the 2-state chain with transition matrix:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P = \begin{pmatrix} 0.33 & 0.67 \\ 0.75 & 0.25 \end{pmatrix}`} />
          </div>
          <div className="my-4">
            <MarkovDiagram
              states={[
                { id: '0', label: '0', color: '#10b981', x: 120, y: 100 },
                { id: '1', label: '1', color: '#6366f1', x: 300, y: 100 },
              ]}
              transitions={[
                { from: '0', to: '0', prob: 0.33, label: '1/3' },
                { from: '0', to: '1', prob: 0.67, label: '2/3' },
                { from: '1', to: '0', prob: 0.75, label: '3/4' },
                { from: '1', to: '1', prob: 0.25, label: '1/4' },
              ]}
              layout="custom"
              width={420}
              height={200}
            />
          </div>
          <p className="text-slate-300 mb-2">Computing successive powers:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="math-block">
              <BlockMath math={String.raw`P^2 = \begin{pmatrix} 0.611 & 0.389 \\ 0.438 & 0.562 \end{pmatrix}`} />
            </div>
            <div className="math-block">
              <BlockMath math={String.raw`P^5 = \begin{pmatrix} 0.524 & 0.476 \\ 0.536 & 0.464 \end{pmatrix}`} />
            </div>
            <div className="math-block">
              <BlockMath math={String.raw`P^7 = \begin{pmatrix} 0.528 & 0.472 \\ 0.530 & 0.469 \end{pmatrix}`} />
            </div>
            <div className="math-block">
              <BlockMath math={String.raw`P^{16} = \begin{pmatrix} 0.5294 & 0.4706 \\ 0.5294 & 0.4706 \end{pmatrix}`} />
            </div>
          </div>
          <p className="text-emerald-400 font-semibold mt-3">
            The rows converge to the same vector <InlineMath math="(0.5294, 0.4706)" />! All entries are positive.
          </p>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-red-400 mb-2">Example 4.2: Non-Convergence (Periodic)</h4>
          <p className="text-slate-300 mb-3">
            Now consider the periodic chain:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}`} />
          </div>
          <div className="my-4">
            <MarkovDiagram
              states={[
                { id: '0', label: '0', color: '#ef4444', x: 120, y: 100 },
                { id: '1', label: '1', color: '#f59e0b', x: 300, y: 100 },
              ]}
              transitions={[
                { from: '0', to: '1', prob: 1, label: '1' },
                { from: '1', to: '0', prob: 1, label: '1' },
              ]}
              layout="custom"
              width={420}
              height={200}
            />
          </div>
          <p className="text-slate-300 mb-2">
            We get <InlineMath math="P^k = P" /> for odd <InlineMath math="k" /> and{' '}
            <InlineMath math="P^k = I" /> for even <InlineMath math="k" />.
            The matrix <InlineMath math="P^n" /> <span className="text-red-400 font-bold">does NOT converge</span> -- it oscillates forever.
          </p>
        </div>

        <MatrixPowerVisualizer />

        {/* Things to Try */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
          <h4 className="text-teal-400 font-bold mb-3">Things to Try</h4>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>Enter the 2x2 matrix from Example 4.1 and increase the power. At what power do the rows look identical?</li>
            <li>Try the periodic matrix <InlineMath math={String.raw`\begin{pmatrix}0&1\\1&0\end{pmatrix}`} />. Does it ever converge?</li>
            <li>Add a small self-loop to the periodic matrix (e.g., change 0 to 0.01 on the diagonal). Now does it converge?</li>
          </ul>
        </motion.div>
      </Section>

      {/* ─── Section 2: Regression to the Mean ─── */}
      <Section title="Example 4.3: Wealth Does Not Last (Fu Bu Guo San Dai)" id="regression" color="from-amber-400 to-yellow-400">
        <div className="example-box">
          <h4 className="text-lg font-bold text-amber-400 mb-2">Regression to the Mean</h4>
          <p className="text-slate-300 mb-3">
            Consider <InlineMath math="N+1" /> financial classes (0 = poorest, <InlineMath math="N" /> = richest).
            If family wealth follows a Markov chain where <InlineMath math="P_{ij} > 0" /> for all{' '}
            <InlineMath math="i, j" />, then by the limit theorem:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(X_n = j) \to \pi_j > 0 \quad \text{as } n \to \infty`} />
          </div>
          <div className="my-4">
            <MarkovDiagram
              states={[
                { id: 'L', label: 'L', color: '#ef4444' },
                { id: 'M', label: 'M', color: '#f59e0b' },
                { id: 'U', label: 'U', color: '#10b981' },
              ]}
              transitions={[
                { from: 'L', to: 'L', prob: 0.7, label: '0.7' },
                { from: 'L', to: 'M', prob: 0.2, label: '0.2' },
                { from: 'L', to: 'U', prob: 0.1, label: '0.1' },
                { from: 'M', to: 'L', prob: 0.3, label: '0.3' },
                { from: 'M', to: 'M', prob: 0.5, label: '0.5' },
                { from: 'M', to: 'U', prob: 0.2, label: '0.2' },
                { from: 'U', to: 'L', prob: 0.1, label: '0.1' },
                { from: 'U', to: 'M', prob: 0.3, label: '0.3' },
                { from: 'U', to: 'U', prob: 0.6, label: '0.6' },
              ]}
              layout="circle"
              width={420}
              height={300}
            />
          </div>
          <p className="text-slate-300 mb-3">
            <strong className="text-amber-300">No matter how rich or poor a family starts</strong>, in the long run,
            they most likely end up in the "ordinary" middle class. This is the ancient Chinese wisdom:
          </p>
          <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/50 text-center mb-3">
            <p className="text-amber-300 text-lg font-bold italic">"Fu Bu Guo San Dai" -- Wealth Does Not Last Three Generations</p>
          </div>
          <p className="text-slate-300 mb-2">
            The same principle applies to biological traits:
          </p>
          <ul className="text-slate-300 list-disc list-inside space-y-1 ml-2">
            <li>Height: Extremely tall parents tend to have shorter children (closer to average)</li>
            <li>IQ: The children of geniuses tend to be less exceptional</li>
            <li>
              The analogy: Yao Ming (226 cm) and Pan Changjiang (160 cm) --
              their children's heights regress toward the population mean
            </li>
          </ul>
          <p className="text-slate-400 mt-3 text-sm">
            This is Sir Francis Galton's "regression to mediocrity" -- indeed, the origin of the word "regression" in statistics.
          </p>
        </div>
      </Section>

      {/* ─── Section 3: Definition of Regular MC ─── */}
      <Section title="Definition: Regular Markov Chains" id="definition" color="from-indigo-400 to-purple-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Regular Transition Matrix)</h4>
          <p className="text-slate-300 mb-2">
            <strong>(i)</strong> A transition matrix <InlineMath math="P" /> is called <strong className="text-indigo-300">regular</strong> if
            there exists <InlineMath math="k > 0" /> such that all entries of <InlineMath math="P^k" /> are <em>strictly positive</em>:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`\exists\, k > 0 \text{ such that } P^k_{ij} > 0 \;\;\forall\, i, j`} />
          </div>
          <p className="text-slate-300 mt-3 mb-2">
            <strong>(ii)</strong> A Markov chain is <strong className="text-indigo-300">regular</strong> if its
            transition matrix is regular.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Sufficient Condition for Regularity</h4>
          <p className="text-slate-300 mb-2">
            If <strong>both</strong> of the following hold, then <InlineMath math="P" /> is regular:
          </p>
          <ol className="text-slate-300 list-decimal list-inside space-y-2 ml-2">
            <li>
              <strong className="text-slate-200">All states communicate:</strong> For any <InlineMath math="i, j" />,
              there exists <InlineMath math="k_{ij}" /> such that <InlineMath math="P^{(k_{ij})}_{ij} > 0" />
            </li>
            <li>
              <strong className="text-slate-200">Self-loop exists:</strong> There exists at least one state <InlineMath math="i" /> with{' '}
              <InlineMath math="P_{ii} > 0" />
            </li>
          </ol>
          <p className="text-slate-400 text-sm mt-3">
            The self-loop breaks periodicity. Without it, the chain could cycle with period &gt; 1.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-700/50">
            <p className="text-emerald-400 font-bold mb-1">Regular</p>
            <BlockMath math={String.raw`\begin{pmatrix} 0 & \frac{1}{2} & \frac{1}{2} \\ \frac{1}{4} & 0 & \frac{3}{4} \\ \frac{2}{3} & \frac{1}{6} & \frac{1}{6} \end{pmatrix}`} />
            <p className="text-slate-400 text-xs mt-1">All states communicate, <InlineMath math="P_{22} = 1/6 > 0" /></p>
          </div>
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/50">
            <p className="text-red-400 font-bold mb-1">NOT Regular (Cyclic)</p>
            <BlockMath math={String.raw`\begin{pmatrix} 0 & 1 & 0 \\ 0 & 0 & 1 \\ 1 & 0 & 0 \end{pmatrix}`} />
            <p className="text-slate-400 text-xs mt-1">Period 3: cyclic permutation, no self-loop</p>
          </div>
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/50">
            <p className="text-red-400 font-bold mb-1">NOT Regular (Absorbing)</p>
            <BlockMath math={String.raw`\begin{pmatrix} 0.5 & 0.4 & 0.1 \\ 0.2 & 0.8 & 0 \\ 0 & 0 & 1 \end{pmatrix}`} />
            <p className="text-slate-400 text-xs mt-1">State 2 is absorbing: <InlineMath math="P_{22} = 1" /></p>
          </div>
        </div>

        <RegularityChecker />
      </Section>

      {/* ─── Section 4: The Main Theorem ─── */}
      <Section title="Theorem 4.1: The Limit Theorem for Regular Markov Chains" id="theorem" color="from-yellow-400 to-amber-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem 4.1 (THE Main Result of Chapter 4)</h4>
          <p className="text-slate-300 mb-3">
            Let <InlineMath math="P" /> be a <strong className="text-yellow-300">regular</strong> transition matrix
            with state space <InlineMath math="\{0, 1, \ldots, N\}" />. Then:
          </p>
          <div className="math-block mb-4">
            <BlockMath math={String.raw`P^{(n)}_{ij} \to \pi_j > 0 \quad \text{as } n \to \infty \quad \forall\, i, j`} />
          </div>
          <div className="math-block mb-4">
            <BlockMath math={String.raw`P(X_n = j) \to \pi_j > 0 \quad \text{as } n \to \infty`} />
          </div>
          <p className="text-slate-300 mb-3">
            where <InlineMath math={String.raw`(\pi_0, \pi_1, \ldots, \pi_N)`} /> is the <strong className="text-yellow-300">unique</strong> solution to:
          </p>
          <div className="math-block mb-2">
            <BlockMath math={String.raw`\pi_j = \sum_{k=0}^{N} \pi_k \, P_{kj} \quad \text{for all } j \qquad (\text{i.e., } \boldsymbol{\pi} P = \boldsymbol{\pi})`} />
          </div>
          <div className="math-block mb-4">
            <BlockMath math={String.raw`\sum_{i=0}^{N} \pi_i = 1, \quad \pi_i > 0 \;\; \forall\, i`} />
          </div>

          <div className="mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
            <p className="text-yellow-300 font-bold mb-2">Three-fold Implication:</p>
            <ol className="text-slate-300 list-decimal list-inside space-y-2">
              <li><strong className="text-slate-200">The limit exists</strong> -- <InlineMath math="P^{(n)}_{ij}" /> converges as <InlineMath math="n \to \infty" /></li>
              <li><strong className="text-slate-200">The limit is positive</strong> -- <InlineMath math="\pi_j > 0" /> for every state <InlineMath math="j" /></li>
              <li><strong className="text-slate-200">The limit is independent of starting state</strong> -- <InlineMath math="\pi_j" /> does not depend on <InlineMath math="i" /></li>
            </ol>
          </div>
        </div>

        <Collapsible title="Proof Sketch (click to expand)">
          <div className="text-slate-300 space-y-3 text-sm">
            <p>
              <strong className="text-slate-200">Step 1.</strong> Since <InlineMath math="P" /> is regular, there exists{' '}
              <InlineMath math="k" /> such that <InlineMath math="P^k" /> has all positive entries.
              Let <InlineMath math="\delta = \min_{i,j} P^{(k)}_{ij} > 0" />.
            </p>
            <p>
              <strong className="text-slate-200">Step 2.</strong> Define <InlineMath math="M_j^{(n)} = \max_i P^{(n)}_{ij}" />{' '}
              and <InlineMath math="m_j^{(n)} = \min_i P^{(n)}_{ij}" />. One can show that
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`M_j^{(n+k)} - m_j^{(n+k)} \leq (1 - 2\delta)(M_j^{(n)} - m_j^{(n)})`} />
            </div>
            <p>
              Since <InlineMath math="1 - 2\delta < 1" />, the gap between the max and min entries in each column
              shrinks geometrically to zero. Hence all rows converge to the same vector.
            </p>
            <p>
              <strong className="text-slate-200">Step 3.</strong> The limit vector <InlineMath math="\boldsymbol{\pi}" /> satisfies{' '}
              <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" /> because taking <InlineMath math="n \to \infty" /> in{' '}
              <InlineMath math="P^{n+1} = P^n \cdot P" /> gives <InlineMath math="\Pi = \Pi P" /> where all rows of{' '}
              <InlineMath math="\Pi" /> equal <InlineMath math="\boldsymbol{\pi}" />.
            </p>
            <p>
              <strong className="text-slate-200">Step 4.</strong> Uniqueness follows from the regularity condition:
              if there were two different stationary distributions, the convergence result would give a contradiction.
            </p>
          </div>
        </Collapsible>
      </Section>

      {/* ─── Section 5: Stationary Distribution ─── */}
      <Section title="Computing the Stationary Distribution" id="stationary" color="from-emerald-400 to-green-400">
        <p className="text-slate-300 mb-4">
          To find <InlineMath math="\boldsymbol{\pi}" />, we solve the system of linear equations{' '}
          <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" /> subject to{' '}
          <InlineMath math="\sum \pi_i = 1" />.
        </p>

        {/* Worked Example: Solving for Stationary Distribution */}
        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-purple-400 mb-3">Worked Example: Solving for Stationary Distribution</h4>
          <p className="text-slate-300 mb-3">
            Consider the 2-state chain with transition matrix:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P = \begin{pmatrix} 0.7 & 0.3 \\ 0.4 & 0.6 \end{pmatrix}`} />
          </div>

          <p className="text-slate-300 mt-4 mb-2"><strong className="text-slate-200">Step 1:</strong> Set up <InlineMath math={String.raw`\boldsymbol{\pi}P = \boldsymbol{\pi}`} /> with <InlineMath math={String.raw`\boldsymbol{\pi} = (\pi_1, \pi_2)`} />:</p>
          <div className="math-block">
            <BlockMath math={String.raw`\begin{cases} 0.7\pi_1 + 0.4\pi_2 = \pi_1 \\ 0.3\pi_1 + 0.6\pi_2 = \pi_2 \end{cases}`} />
          </div>

          <p className="text-slate-300 mt-3 mb-2"><strong className="text-slate-200">Step 2:</strong> Simplify the first equation:</p>
          <div className="math-block">
            <BlockMath math={String.raw`0.7\pi_1 + 0.4\pi_2 = \pi_1 \;\Longrightarrow\; -0.3\pi_1 + 0.4\pi_2 = 0 \;\Longrightarrow\; \pi_2 = \tfrac{3}{4}\pi_1`} />
          </div>

          <p className="text-slate-300 mt-3 mb-2"><strong className="text-slate-200">Step 3:</strong> Apply the normalization condition <InlineMath math={String.raw`\pi_1 + \pi_2 = 1`} />:</p>
          <div className="math-block">
            <BlockMath math={String.raw`\pi_1 + \tfrac{3}{4}\pi_1 = 1 \;\Longrightarrow\; \tfrac{7}{4}\pi_1 = 1 \;\Longrightarrow\; \pi_1 = \frac{4}{7}, \quad \pi_2 = \frac{3}{7}`} />
          </div>

          <p className="text-slate-300 mt-3 mb-2"><strong className="text-slate-200">Step 4:</strong> Verify:</p>
          <div className="math-block">
            <BlockMath math={String.raw`\boldsymbol{\pi}P = \left(\frac{4}{7}, \frac{3}{7}\right) \begin{pmatrix} 0.7 & 0.3 \\ 0.4 & 0.6 \end{pmatrix} = \left(\frac{2.8+1.2}{7}, \frac{1.2+1.8}{7}\right) = \left(\frac{4}{7}, \frac{3}{7}\right) = \boldsymbol{\pi} \;\; \checkmark`} />
          </div>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-blue-400 mb-2">Example 4.4: Mr. C (Home / Office / Gym)</h4>
          <p className="text-slate-300 mb-3">
            Mr. C spends time at Home (H), Office (O), and Gym (G), with transition matrix:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P = \begin{pmatrix} 0 & 0.9 & 0.1 \\ 0.1 & 0 & 0.9 \\ 0.8 & 0.2 & 0 \end{pmatrix} \quad \text{(H, O, G)}`} />
          </div>
          <div className="my-4">
            <MarkovDiagram
              states={[
                { id: 'H', label: 'H', color: '#6366f1' },
                { id: 'O', label: 'O', color: '#f59e0b' },
                { id: 'G', label: 'G', color: '#10b981' },
              ]}
              transitions={[
                { from: 'H', to: 'O', prob: 0.9, label: '0.9' },
                { from: 'H', to: 'G', prob: 0.1, label: '0.1' },
                { from: 'O', to: 'H', prob: 0.1, label: '0.1' },
                { from: 'O', to: 'G', prob: 0.9, label: '0.9' },
                { from: 'G', to: 'H', prob: 0.8, label: '0.8' },
                { from: 'G', to: 'O', prob: 0.2, label: '0.2' },
              ]}
              layout="circle"
              width={420}
              height={300}
            />
          </div>
          <p className="text-slate-300 mb-2">
            Since <InlineMath math="P^2" /> has all positive entries, <InlineMath math="P" /> is regular.
          </p>

          <Collapsible title="Step-by-step solution of piP = pi" defaultOpen={false}>
            <div className="text-slate-300 text-sm space-y-2">
              <p>The system <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" /> gives:</p>
              <div className="math-block">
                <BlockMath math={String.raw`\begin{cases}
\pi_H = 0.1\pi_O + 0.8\pi_G \\
\pi_O = 0.9\pi_H + 0.2\pi_G \\
\pi_G = 0.1\pi_H + 0.9\pi_O \\
\pi_H + \pi_O + \pi_G = 1
\end{cases}`} />
              </div>
              <p>
                From the first equation: <InlineMath math="\pi_H = 0.1\pi_O + 0.8\pi_G" />.
              </p>
              <p>
                From the second: <InlineMath math="\pi_O = 0.9\pi_H + 0.2\pi_G" />.
              </p>
              <p>
                Substituting and using <InlineMath math="\sum \pi = 1" />, we solve to get:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`\pi_H \approx 0.309, \quad \pi_O \approx 0.347, \quad \pi_G \approx 0.343`} />
              </div>
            </div>
          </Collapsible>

          <div className="mt-4 p-4 bg-slate-800/60 rounded-lg">
            <h5 className="text-sm font-bold text-amber-400 mb-2">Long-run Time Fractions (Weighted by Hours Spent)</h5>
            <p className="text-slate-300 text-sm mb-2">
              Each visit: H = 12 hrs, O = 10 hrs, G = 2 hrs.
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`\text{Time at O} = \frac{10 \cdot \pi_O}{12\pi_H + 10\pi_O + 2\pi_G} = \frac{10(0.347)}{12(0.309) + 10(0.347) + 2(0.343)} \approx 0.441`} />
            </div>
            <p className="text-slate-300 text-sm mt-2">
              Converting to hours per day (24 hrs):
            </p>
            <ul className="text-slate-300 text-sm list-disc list-inside ml-2 mt-1 space-y-1">
              <li>Office: <InlineMath math="0.441 \times 24 \approx 10.58" /> hrs/day</li>
              <li>Home: <InlineMath math="0.472 \times 24 \approx 11.32" /> hrs/day</li>
              <li>Gym: <InlineMath math="0.087 \times 24 \approx 2.09" /> hrs/day</li>
            </ul>
          </div>
        </div>

        <StationaryCalculator />
      </Section>

      {/* ─── Section 6: Mr. C Simulator ─── */}
      <Section title="Mr. C: Interactive Simulation" id="mrc-sim" color="from-pink-400 to-rose-400">
        <p className="text-slate-300 mb-4">
          Watch Mr. C move between locations and see the empirical time fractions converge to the
          theoretical values predicted by <InlineMath math="\boldsymbol{\pi}" />.
        </p>
        <MrCSimulator />
      </Section>

      {/* ─── Section 7: Space vs Time Average ─── */}
      <Section title="Space Average vs Time Average" id="space-time" color="from-cyan-400 to-blue-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-cyan-400 mb-2">Two Interpretations of the Limit Theorem</h4>
          <p className="text-slate-300 mb-3">
            The stationary distribution <InlineMath math="\boldsymbol{\pi}" /> can be understood in two complementary ways:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
              <p className="text-blue-400 font-bold mb-1">Space Average</p>
              <p className="text-slate-300 text-sm">
                At any fixed large time <InlineMath math="n" />, the probability{' '}
                <InlineMath math="P(X_n = j) \approx \pi_j" /> regardless of the starting state{' '}
                <InlineMath math="X_0" />.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Think: many independent copies of the chain, snapshot at time n.
              </p>
            </div>
            <div className="p-3 bg-pink-900/20 rounded-lg border border-pink-700/50">
              <p className="text-pink-400 font-bold mb-1">Time Average</p>
              <p className="text-slate-300 text-sm">
                Over a long period, the fraction of time spent in state <InlineMath math="j" /> converges to{' '}
                <InlineMath math="\pi_j" />.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Think: one chain running for a very long time.
              </p>
            </div>
          </div>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-2">Long-run Average Payoff</h4>
          <p className="text-slate-300 mb-2">
            If state <InlineMath math="j" /> pays reward <InlineMath math="c_j" />, then the long-run average payoff per step is:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`A_n = \frac{1}{n}\sum_{i=1}^{n} c_{X_i} \;\;\to\;\; \sum_{j=0}^{N} c_j \, \pi_j \quad \text{as } n \to \infty`} />
          </div>
        </div>

        <SpaceTimeDemo />
      </Section>

      {/* ─── Section 8: Exercises ─── */}
      <Section title="Exercises" id="exercises" color="from-orange-400 to-red-400">
        <div className="exercise-box mb-6">
          <h4 className="text-lg font-bold text-orange-400 mb-2">Exercise 4.1</h4>
          <p className="text-slate-300 mb-3">
            In the Mr. C example (Example 4.4), compute the average number of times per day that Mr. C goes from
            <strong className="text-emerald-400"> Gym</strong> to <strong className="text-pink-400"> Home</strong>.
          </p>
          <Collapsible title="Hint">
            <p className="text-slate-300 text-sm">
              First compute the long-run rate of visits to the Gym. Each visit lasts 2 hours.
              When at Gym, the probability of going to Home next is <InlineMath math="P_{GH} = 0.8" />.
              Think about how many transitions per day originate from the Gym.
            </p>
          </Collapsible>
          <Collapsible title="Solution">
            <div className="text-slate-300 text-sm space-y-2">
              <p>
                The long-run fraction of <em>transitions</em> that start from Gym is <InlineMath math="\pi_G \approx 0.343" />.
              </p>
              <p>
                The average time per transition (weighted) is:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`\bar{t} = 12\pi_H + 10\pi_O + 2\pi_G = 12(0.309) + 10(0.347) + 2(0.343) \approx 7.864 \text{ hrs}`} />
              </div>
              <p>
                So the number of transitions per day is approximately <InlineMath math="24 / 7.864 \approx 3.052" />.
              </p>
              <p>
                The fraction of transitions that are Gym-to-Home is <InlineMath math="\pi_G \cdot P_{GH} = 0.343 \times 0.8 = 0.2744" />.
              </p>
              <p>
                Therefore, the average number of Gym-to-Home transitions per day is:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`3.052 \times 0.2744 \approx 0.838 \text{ times/day}`} />
              </div>
            </div>
          </Collapsible>
        </div>

        <div className="exercise-box mb-6">
          <h4 className="text-lg font-bold text-orange-400 mb-2">Exercise: Is This Matrix Regular?</h4>
          <p className="text-slate-300 mb-3">
            Determine whether the following matrix is regular. If so, find the smallest <InlineMath math="k" /> such that{' '}
            <InlineMath math="P^k" /> has all positive entries.
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P = \begin{pmatrix} 0.5 & 0.5 & 0 \\ 0 & 0.5 & 0.5 \\ 0.5 & 0 & 0.5 \end{pmatrix}`} />
          </div>
          <Collapsible title="Hint">
            <p className="text-slate-300 text-sm">
              Check that all states communicate (can you get from any state to any other?).
              Notice that <InlineMath math="P_{00} = P_{11} = P_{22} = 0.5 > 0" />, so self-loops exist.
              Try computing <InlineMath math="P^2" />.
            </p>
          </Collapsible>
          <Collapsible title="Solution">
            <div className="text-slate-300 text-sm space-y-2">
              <p>Yes, this matrix is regular.</p>
              <div className="math-block">
                <BlockMath math={String.raw`P^2 = \begin{pmatrix} 0.25 & 0.5 & 0.25 \\ 0.25 & 0.25 & 0.5 \\ 0.5 & 0.25 & 0.25 \end{pmatrix}`} />
              </div>
              <p>
                All entries of <InlineMath math="P^2" /> are positive, so <InlineMath math="P" /> is regular
                with <InlineMath math="k = 2" />.
              </p>
              <p>
                The stationary distribution is <InlineMath math="\boldsymbol{\pi} = (1/3, 1/3, 1/3)" /> by symmetry
                (each row of <InlineMath math="P" /> sums to 1, and the matrix is "rotationally symmetric").
              </p>
            </div>
          </Collapsible>
        </div>

        <div className="exercise-box">
          <h4 className="text-lg font-bold text-orange-400 mb-2">Exercise: Average Payoff</h4>
          <p className="text-slate-300 mb-3">
            A gambler plays a game with 3 states. In state 0 she earns $0, in state 1 she earns $5, in state 2 she earns $10.
            The transition matrix is:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P = \begin{pmatrix} 0.2 & 0.5 & 0.3 \\ 0.4 & 0.1 & 0.5 \\ 0.3 & 0.3 & 0.4 \end{pmatrix}`} />
          </div>
          <p className="text-slate-300 mb-3">
            Find the long-run average earnings per round.
          </p>
          <Collapsible title="Solution">
            <div className="text-slate-300 text-sm space-y-2">
              <p>
                First solve <InlineMath math="\boldsymbol{\pi} P = \boldsymbol{\pi}" /> with{' '}
                <InlineMath math="\sum \pi = 1" />. The system gives (after calculation):
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`\pi_0 \approx 0.3061, \quad \pi_1 \approx 0.3061, \quad \pi_2 \approx 0.3878`} />
              </div>
              <p>Long-run average payoff per round:</p>
              <div className="math-block">
                <BlockMath math={String.raw`\sum c_j \pi_j = 0(0.3061) + 5(0.3061) + 10(0.3878) = 1.5306 + 3.8776 = \$5.41`} />
              </div>
            </div>
          </Collapsible>
        </div>
      </Section>

      {/* ─── Summary ─── */}
      <Section title="Chapter Summary" id="summary" color="from-slate-300 to-slate-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <h4 className="text-emerald-400 font-bold mb-2">Key Concepts</h4>
            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
              <li>Regular matrix: some <InlineMath math="P^k" /> has all positive entries</li>
              <li>Stationary distribution: <InlineMath math="\boldsymbol{\pi}P = \boldsymbol{\pi}" /></li>
              <li>Convergence: <InlineMath math="P^n \to" /> matrix with identical rows</li>
              <li>Long-run behavior is independent of starting state</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <h4 className="text-amber-400 font-bold mb-2">Sufficient Condition</h4>
            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
              <li>All states communicate (irreducible) AND</li>
              <li>At least one self-loop (<InlineMath math="P_{ii} > 0" />) implies regularity</li>
              <li>Periodicity (no self-loop + cyclic structure) breaks regularity</li>
              <li>Absorbing states also prevent regularity</li>
            </ul>
          </div>
        </div>
      </Section>
    </div>
  )
}
