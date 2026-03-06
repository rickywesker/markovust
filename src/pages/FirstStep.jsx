import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ──────────────────────────────────────────────
   Section 3.5 — First Step Analysis
   1. HH Coin Simulator        (Example 3.6)
   2. Penney-ante Game          (Example 3.7)
   3. Mickey Maze Absorption    (Example 3.8)
   4. First-Step Equation Builder (Interactive Tool)
   5. Exercises 3.5 – 3.9
   ────────────────────────────────────────────── */

// ─── Helper: solve 2x2 linear system ───────────
function solve2x2(a11, a12, b1, a21, a22, b2) {
  const det = a11 * a22 - a12 * a21
  if (Math.abs(det) < 1e-12) return [0, 0]
  return [(b1 * a22 - b2 * a12) / det, (a11 * b2 - a21 * b1) / det]
}

// ─── Helper: solve NxN linear system (Gaussian elimination) ───
function solveLinearSystem(A, b) {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    if (Math.abs(M[col][col]) < 1e-12) continue
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = M[row][col] / M[col][col]
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j]
    }
  }
  return M.map((row, i) => Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i])
}


// ═══════════════════════════════════════════════
// 1. HH COIN SIMULATOR (Example 3.6)
// ═══════════════════════════════════════════════

function HHSimulator() {
  const [flips, setFlips] = useState([])
  const [state, setState] = useState(0) // 0=start/tail, 1=one H, 2=HH
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(300)
  const [trials, setTrials] = useState([])
  const [showSolve, setShowSolve] = useState(false)
  const timerRef = useRef(null)
  const chartRef = useRef(null)
  const stateRef = useRef(null)

  const done = state === 2

  const step = useCallback(() => {
    if (state === 2) return
    const coin = Math.random() < 0.5 ? 'H' : 'T'
    setFlips(prev => [...prev, coin])
    setState(prev => {
      if (prev === 0) return coin === 'H' ? 1 : 0
      if (prev === 1) return coin === 'H' ? 2 : 0
      return 2
    })
  }, [state])

  useEffect(() => {
    if (running && !done) {
      timerRef.current = setInterval(step, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [running, speed, step, done])

  useEffect(() => {
    if (done && running) {
      setRunning(false)
      clearInterval(timerRef.current)
      setTrials(prev => [...prev, flips.length])
    }
  }, [done, running, flips.length])

  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setFlips([])
    setState(0)
  }

  const runBatch = () => {
    const results = []
    for (let t = 0; t < 1000; t++) {
      let s = 0, count = 0
      while (s !== 2) {
        count++
        const coin = Math.random() < 0.5 ? 1 : 0
        if (s === 0) s = coin === 1 ? 1 : 0
        else if (s === 1) s = coin === 1 ? 2 : 0
      }
      results.push(count)
    }
    setTrials(prev => [...prev, ...results])
  }

  const avgTrials = trials.length > 0 ? (trials.reduce((a, b) => a + b, 0) / trials.length).toFixed(2) : '—'

  // ── State diagram drawing ──
  useEffect(() => {
    const canvas = stateRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height

    ctx.clearRect(0, 0, W, H)

    const centers = [
      { x: W * 0.2, y: H * 0.5, label: '0', desc: 'Start/T' },
      { x: W * 0.5, y: H * 0.5, label: '1', desc: 'One H' },
      { x: W * 0.8, y: H * 0.5, label: '2', desc: 'HH' },
    ]
    const r = 28
    const active = state

    // draw arrows
    const drawArrow = (x1, y1, x2, y2, label, curved = 0) => {
      ctx.save()
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1.5
      ctx.fillStyle = '#64748b'
      const dx = x2 - x1, dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / len, ny = dy / len

      const sx = x1 + nx * r, sy = y1 + ny * r
      const ex = x2 - nx * r, ey = y2 - ny * r

      if (curved === 0) {
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        // arrowhead
        const angle = Math.atan2(ey - sy, ex - sx)
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - 8 * Math.cos(angle - 0.3), ey - 8 * Math.sin(angle - 0.3))
        ctx.lineTo(ex - 8 * Math.cos(angle + 0.3), ey - 8 * Math.sin(angle + 0.3))
        ctx.closePath()
        ctx.fill()
        // label
        const mx = (sx + ex) / 2, my = (sy + ey) / 2
        ctx.fillStyle = '#a5b4fc'
        ctx.font = '12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(label, mx, my - 8)
      } else {
        const mx = (sx + ex) / 2, my = (sy + ey) / 2 + curved
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, ex, ey)
        ctx.stroke()
        const t = 0.98
        const tx = 2 * (1 - t) * (mx - sx) + 2 * t * (ex - mx)
        const ty = 2 * (1 - t) * (my - sy) + 2 * t * (ey - my)
        const angle = Math.atan2(ty, tx)
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - 8 * Math.cos(angle - 0.3), ey - 8 * Math.sin(angle - 0.3))
        ctx.lineTo(ex - 8 * Math.cos(angle + 0.3), ey - 8 * Math.sin(angle + 0.3))
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#a5b4fc'
        ctx.font = '12px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        const lx = (sx + 2 * mx + ex) / 4, ly = (sy + 2 * my + ey) / 4
        ctx.fillText(label, lx, ly - 4)
      }
      ctx.restore()
    }

    // 0 -> 0 self-loop
    ctx.save()
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    const lx = centers[0].x, ly = centers[0].y - r
    ctx.beginPath()
    ctx.arc(lx, ly - 18, 16, 0.3 * Math.PI, 0.7 * Math.PI, true)
    ctx.stroke()
    ctx.fillStyle = '#64748b'
    const aEnd = 0.7 * Math.PI
    const ax = lx + 16 * Math.cos(aEnd), ay = ly - 18 + 16 * Math.sin(aEnd)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax + 6, ay - 6)
    ctx.lineTo(ax + 8, ay + 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#a5b4fc'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('1/2', lx, ly - 40)
    ctx.restore()

    // 0 -> 1
    drawArrow(centers[0].x, centers[0].y, centers[1].x, centers[1].y, '1/2', -20)
    // 1 -> 0
    drawArrow(centers[1].x, centers[1].y, centers[0].x, centers[0].y, '1/2', 20)
    // 1 -> 2
    drawArrow(centers[1].x, centers[1].y, centers[2].x, centers[2].y, '1/2', -20)

    // 2 -> 2 self-loop
    ctx.save()
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    const lx2 = centers[2].x, ly2 = centers[2].y - r
    ctx.beginPath()
    ctx.arc(lx2, ly2 - 18, 16, 0.3 * Math.PI, 0.7 * Math.PI, true)
    ctx.stroke()
    ctx.fillStyle = '#64748b'
    const ax2 = lx2 + 16 * Math.cos(aEnd), ay2 = ly2 - 18 + 16 * Math.sin(aEnd)
    ctx.beginPath()
    ctx.moveTo(ax2, ay2)
    ctx.lineTo(ax2 + 6, ay2 - 6)
    ctx.lineTo(ax2 + 8, ay2 + 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#a5b4fc'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('1', lx2, ly2 - 40)
    ctx.restore()

    // draw nodes
    centers.forEach((c, i) => {
      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, 2 * Math.PI)
      if (i === active) {
        ctx.fillStyle = i === 2 ? '#059669' : '#4f46e5'
        ctx.fill()
        ctx.strokeStyle = i === 2 ? '#34d399' : '#818cf8'
      } else {
        ctx.fillStyle = i === 2 ? '#064e3b' : '#1e1b4b'
        ctx.fill()
        ctx.strokeStyle = '#475569'
      }
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 16px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(c.label, c.x, c.y)
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(c.desc, c.x, c.y + r + 14)
    })
  }, [state])

  // ── Trial histogram ──
  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height

    ctx.clearRect(0, 0, W, H)

    if (trials.length === 0) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Run trials to see the histogram', W / 2, H / 2)
      return
    }

    const maxVal = Math.max(...trials)
    const bins = new Array(Math.min(maxVal + 1, 30)).fill(0)
    trials.forEach(t => { if (t < bins.length) bins[t]++ })
    const maxBin = Math.max(...bins, 1)

    const pad = { top: 24, right: 20, bottom: 36, left: 46 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom
    const barW = plotW / bins.length

    // bars
    bins.forEach((count, i) => {
      const barH = (count / maxBin) * plotH
      const x = pad.left + i * barW
      const y = pad.top + plotH - barH
      ctx.fillStyle = '#6366f1'
      ctx.fillRect(x + 1, y, barW - 2, barH)
    })

    // axes
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH)
    ctx.stroke()

    // E=6 line
    const e6x = pad.left + (6 / bins.length) * plotW
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.beginPath()
    ctx.moveTo(e6x, pad.top)
    ctx.lineTo(e6x, pad.top + plotH)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#f59e0b'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('E[T]=6', e6x + 4, pad.top + 12)

    // avg line
    const avg = trials.reduce((a, b) => a + b, 0) / trials.length
    const avgX = pad.left + (avg / bins.length) * plotW
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(avgX, pad.top)
    ctx.lineTo(avgX, pad.top + plotH)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#10b981'
    ctx.fillText(`Avg=${avg.toFixed(1)}`, avgX + 4, pad.top + 26)

    // labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Tosses to first HH', W / 2, H - 4)
    for (let i = 0; i < bins.length; i += Math.max(1, Math.floor(bins.length / 8))) {
      ctx.fillText(String(i), pad.left + i * barW + barW / 2, pad.top + plotH + 16)
    }
  }, [trials])

  const visibleFlips = flips.slice(-50)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-2">Example 3.6 — Expected Tosses till First HH</h3>
      <p className="text-slate-300 mb-4">
        Toss a fair coin repeatedly. What is the expected number of tosses until the first two consecutive
        heads (<InlineMath math="HH" />)? We model this with states: <InlineMath math="0" /> = start or tail just occurred,{' '}
        <InlineMath math="1" /> = one head just occurred, <InlineMath math="2" /> = HH (absorbing).
      </p>

      <div className="math-block">
        <BlockMath math={String.raw`P = \begin{pmatrix} \frac{1}{2} & \frac{1}{2} & 0 \\ \frac{1}{2} & 0 & \frac{1}{2} \\ 0 & 0 & 1 \end{pmatrix} \quad \text{states } \{0, 1, 2\}`} />
      </div>

      {/* State diagram */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={stateRef} className="w-full" style={{ height: 180 }} />
      </div>

      {/* Flip display */}
      <div className="mt-4 flex flex-wrap gap-1 min-h-[36px]">
        {visibleFlips.map((f, i) => (
          <motion.span
            key={flips.length - visibleFlips.length + i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              f === 'H' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
            }`}
          >
            {f}
          </motion.span>
        ))}
        {done && <span className="text-emerald-400 font-bold ml-2 self-center">HH found!</span>}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input type="range" min="50" max="600" step="25" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-28 accent-emerald-500" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => { if (done) reset(); setTimeout(() => setRunning(true), 50) }}>
          {done ? 'New Trial' : running ? 'Running...' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running || done}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <button className="btn-primary text-sm !px-4 !py-2 !bg-purple-600 hover:!bg-purple-500" onClick={runBatch}>
          Run 1000 Trials
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setTrials([])}>Clear Trials</button>
      </div>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <motion.div key={flips.length} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Current tosses:</span> <span className="text-white font-semibold">{flips.length}</span>
        </motion.div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">State:</span> <span className="text-indigo-400 font-semibold">{state}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Trials:</span> <span className="text-purple-400 font-semibold">{trials.length}</span>
        </div>
        <motion.div key={avgTrials} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Avg tosses:</span> <span className="text-amber-400 font-semibold">{avgTrials}</span>
          <span className="text-slate-500 ml-1">(theory: 6)</span>
        </motion.div>
      </div>

      {/* Histogram */}
      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={chartRef} className="w-full" style={{ height: 240 }} />
      </div>

      {/* Derivation toggle */}
      <div className="mt-5">
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setShowSolve(!showSolve)}>
          {showSolve ? 'Hide' : 'Show'} First-Step Derivation
        </button>
        {showSolve && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 definition-box">
            <h4 className="text-lg font-bold text-indigo-400 mb-3">First-Step Equations</h4>

            <p className="text-slate-300 mb-2">
              Let <InlineMath math="w_i = E[T \mid X_0 = i]" /> be the expected number of tosses to reach state 2 (HH),
              starting from state <InlineMath math="i" />. Here <InlineMath math="A = \{2\}" /> is the absorbing set.
            </p>

            <p className="text-slate-300 mb-3">
              By the first-step framework, the general formula is:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`w_i = \begin{cases} 0 & i \in A \\ 1 + \displaystyle\sum_{j} P_{ij} \, w_j & i \notin A \end{cases}`} />
            </div>

            <p className="text-slate-300 mt-3 mb-2">
              Since state 2 is absorbing, <InlineMath math="w_2 = 0" />. For the transient states 0 and 1,
              we read the transition probabilities from the matrix above and write one equation per state:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`w_0 = 1 + P_{00}\,w_0 + P_{01}\,w_1 + P_{02}\,w_2 = 1 + \tfrac{1}{2}\,w_0 + \tfrac{1}{2}\,w_1`} />
              <BlockMath math={String.raw`w_1 = 1 + P_{10}\,w_0 + P_{11}\,w_1 + P_{12}\,w_2 = 1 + \tfrac{1}{2}\,w_0`} />
            </div>
            <p className="text-slate-400 text-sm mt-1 mb-3">
              (The <InlineMath math="w_2" /> terms vanish since <InlineMath math="w_2 = 0" />.)
            </p>

            <p className="text-slate-300 mb-2"><strong className="text-indigo-300">Solving the system:</strong></p>
            <p className="text-slate-300 mb-2">From the second equation:</p>
            <div className="math-block">
              <BlockMath math={String.raw`w_1 = 1 + \tfrac{1}{2}\,w_0 \implies w_0 = 2(w_1 - 1)`} />
            </div>
            <p className="text-slate-300 mb-2">Substituting into the first:</p>
            <div className="math-block">
              <BlockMath math={String.raw`w_0 = 1 + \tfrac{1}{2}\,w_0 + \tfrac{1}{2}\,w_1 \implies \tfrac{1}{2}\,w_0 = 1 + \tfrac{1}{2}\,w_1`} />
              <BlockMath math={String.raw`w_0 = 2 + w_1 = 2 + 1 + \tfrac{1}{2}\,w_0 \implies \tfrac{1}{2}\,w_0 = 3 \implies w_0 = 6,\; w_1 = 4`} />
            </div>

            <p className="text-slate-300 mt-3 mb-1"><strong className="text-indigo-300">Final answer:</strong></p>
            <p className="text-slate-300">
              Before any toss, we are not in state 0 or 1 yet — the first coin determines our initial state.
              With probability <InlineMath math="1/2" /> we enter state 1 (if H) or state 0 (if T), so:{' '}
              <InlineMath math="E[T] = 1 + \frac{1}{2}(w_0 + w_1) = 1 + \frac{1}{2}(6 + 4) = 6" />.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}


// ═══════════════════════════════════════════════
// 2. PENNEY-ANTE GAME (Example 3.7)
// ═══════════════════════════════════════════════

const PATTERNS = ['HHH', 'HHT', 'HTH', 'HTT', 'THH', 'THT', 'TTH', 'TTT']
const OPTIMAL_Z = { HHH: 'THH', HHT: 'THH', HTH: 'HHT', HTT: 'HHT', THH: 'TTH', THT: 'TTH', TTH: 'HTT', TTT: 'HTT' }
const Z_WIN_PROB = { HHH: '7/8', HHT: '3/4', HTH: '2/3', HTT: '2/3', THH: '2/3', THT: '2/3', TTH: '3/4', TTT: '7/8' }
const Z_WIN_FRAC = { HHH: 7/8, HHT: 3/4, HTH: 2/3, HTT: 2/3, THH: 2/3, THT: 2/3, TTH: 3/4, TTT: 7/8 }

function PenneyAnteGame() {
  const [yPattern, setYPattern] = useState('HTH')
  const [flips, setFlips] = useState([])
  const [winner, setWinner] = useState(null)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(200)
  const [results, setResults] = useState({ y: 0, z: 0 })
  const [showTable, setShowTable] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const timerRef = useRef(null)
  const loopRef = useRef(null)

  const zPattern = OPTIMAL_Z[yPattern]

  const checkWin = useCallback((seq) => {
    if (seq.length < 3) return null
    const last3 = seq.slice(-3).join('')
    if (last3 === yPattern) return 'Y'
    if (last3 === zPattern) return 'Z'
    return null
  }, [yPattern, zPattern])

  const step = useCallback(() => {
    setFlips(prev => {
      const coin = Math.random() < 0.5 ? 'H' : 'T'
      const next = [...prev, coin]
      const w = checkWin(next)
      if (w) {
        setWinner(w)
        setRunning(false)
        clearInterval(timerRef.current)
        setResults(r => w === 'Y' ? { ...r, y: r.y + 1 } : { ...r, z: r.z + 1 })
      }
      return next
    })
  }, [checkWin])

  useEffect(() => {
    if (running && !winner) {
      timerRef.current = setInterval(step, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [running, speed, step, winner])

  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setFlips([])
    setWinner(null)
  }

  const runBatch = () => {
    let yWins = 0, zWins = 0
    for (let t = 0; t < 1000; t++) {
      const seq = []
      while (true) {
        seq.push(Math.random() < 0.5 ? 'H' : 'T')
        if (seq.length >= 3) {
          const last3 = seq.slice(-3).join('')
          if (last3 === yPattern) { yWins++; break }
          if (last3 === zPattern) { zWins++; break }
        }
      }
    }
    setResults(r => ({ y: r.y + yWins, z: r.z + zWins }))
  }

  // ── Dominance loop diagram ──
  useEffect(() => {
    const canvas = loopRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.33
    const items = ['HTT', 'HHT', 'THH', 'TTH']
    const angles = items.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / 4)
    const positions = angles.map(a => ({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }))

    // arrows between consecutive items
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4
      const p1 = positions[i], p2 = positions[next]
      const dx = p2.x - p1.x, dy = p2.y - p1.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / len, ny = dy / len
      const sx = p1.x + nx * 30, sy = p1.y + ny * 30
      const ex = p2.x - nx * 30, ey = p2.y - ny * 30

      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      const angle = Math.atan2(ey - sy, ex - sx)
      ctx.fillStyle = '#6366f1'
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - 10 * Math.cos(angle - 0.3), ey - 10 * Math.sin(angle - 0.3))
      ctx.lineTo(ex - 10 * Math.cos(angle + 0.3), ey - 10 * Math.sin(angle + 0.3))
      ctx.closePath()
      ctx.fill()

      // "beats" label
      const mx = (sx + ex) / 2, my = (sy + ey) / 2
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('beats', mx + ny * 14, my - nx * 14)
    }

    // draw nodes
    positions.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 26, 0, 2 * Math.PI)
      ctx.fillStyle = '#1e1b4b'
      ctx.fill()
      ctx.strokeStyle = '#818cf8'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(items[i], p.x, p.y)
    })

    // center label
    ctx.fillStyle = '#64748b'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Non-transitive', cx, cy - 6)
    ctx.fillText('dominance loop', cx, cy + 8)
  }, [])

  const totalGames = results.y + results.z
  const visibleFlips = flips.slice(-60)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="example-box">
      <h3 className="text-xl font-bold text-purple-400 mb-2">Example 3.7 — Penney-ante Game</h3>
      <p className="text-slate-300 mb-4">
        Two players each pick a pattern of 3 coin outcomes. Player Y picks first, then player Z picks to counter.
        They flip coins until one pattern appears. Amazingly, Z can <strong className="text-amber-400">always</strong> win
        with probability <InlineMath math="\geq 2/3" />!
      </p>

      <div className="math-block">
        <BlockMath math={String.raw`\text{State space: } \{HH, HT, TH, TT\} \text{ (last two flips)}`} />
        <BlockMath math={String.raw`P = \begin{pmatrix} 1/2 & 1/2 & 0 & 0 \\ 0 & 0 & 1/2 & 1/2 \\ 1/2 & 1/2 & 0 & 0 \\ 0 & 0 & 1/2 & 1/2 \end{pmatrix}`} />
      </div>

      {/* State transition diagram */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-3 text-center">State Transition Diagram (last two flips)</h4>
        <svg viewBox="0 0 480 260" className="w-full max-w-lg mx-auto" style={{ height: 220 }}>
          <defs>
            <marker id="penney-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker id="penney-arrow-indigo" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#818cf8" />
            </marker>
          </defs>
          {/* Nodes: HH(120,60) HT(360,60) TH(120,200) TT(360,200) */}
          {/* HH -> HH self-loop */}
          <path d="M 105,38 A 20,20 0 1,1 135,38" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="120" y="16" textAnchor="middle" fill="#a5b4fc" fontSize="11">½ (H)</text>
          {/* HH -> HT */}
          <line x1="148" y1="60" x2="332" y2="60" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="240" y="52" textAnchor="middle" fill="#a5b4fc" fontSize="11">½ (T)</text>
          {/* HT -> TH */}
          <line x1="348" y1="88" x2="132" y2="172" stroke="#818cf8" strokeWidth="1.5" markerEnd="url(#penney-arrow-indigo)" />
          <text x="252" y="122" textAnchor="middle" fill="#a5b4fc" fontSize="11">½ (H)</text>
          {/* HT -> TT */}
          <line x1="360" y1="88" x2="360" y2="172" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="375" y="135" textAnchor="start" fill="#a5b4fc" fontSize="11">½ (T)</text>
          {/* TH -> HH */}
          <line x1="120" y1="172" x2="120" y2="88" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="105" y="135" textAnchor="end" fill="#a5b4fc" fontSize="11">½ (H)</text>
          {/* TH -> HT */}
          <line x1="132" y1="188" x2="348" y2="72" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="228" y="138" textAnchor="middle" fill="#a5b4fc" fontSize="11">½ (T)</text>
          {/* TT -> TH */}
          <line x1="332" y1="200" x2="148" y2="200" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="240" y="218" textAnchor="middle" fill="#a5b4fc" fontSize="11">½ (H)</text>
          {/* TT -> TT self-loop */}
          <path d="M 345,222 A 20,20 0 1,0 375,222" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#penney-arrow)" />
          <text x="360" y="254" textAnchor="middle" fill="#a5b4fc" fontSize="11">½ (T)</text>
          {/* Node circles */}
          <circle cx="120" cy="60" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="120" y="64" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">HH</text>
          <circle cx="360" cy="60" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="360" y="64" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">HT</text>
          <circle cx="120" cy="200" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="120" y="204" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">TH</text>
          <circle cx="360" cy="200" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="360" y="204" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">TT</text>
        </svg>
      </div>

      {/* Dominance loop */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={loopRef} className="w-full" style={{ height: 220 }} />
      </div>

      {/* Pattern selection */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-300 flex items-center gap-2">
          Y picks:
          <select
            value={yPattern}
            onChange={e => { setYPattern(e.target.value); reset(); setResults({ y: 0, z: 0 }) }}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white"
          >
            {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <div className="text-sm text-slate-300">
          Z counters: <span className="text-emerald-400 font-bold">{zPattern}</span>
        </div>
        <div className="text-sm text-slate-300">
          P(Z wins) = <span className="text-amber-400 font-bold">{Z_WIN_PROB[yPattern]}</span>
        </div>
      </div>

      {/* Flip display */}
      <div className="mt-4 flex flex-wrap gap-1 min-h-[36px]">
        {visibleFlips.map((f, i) => {
          const idx = flips.length - visibleFlips.length + i
          const isPartOfWin = winner && idx >= flips.length - 3
          return (
            <motion.span
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                isPartOfWin
                  ? 'bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400'
                  : f === 'H'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
              }`}
            >
              {f}
            </motion.span>
          )
        })}
        {winner && (
          <span className={`ml-2 self-center font-bold ${winner === 'Z' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {winner === 'Z' ? 'Z wins!' : 'Y wins!'}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => { if (winner) reset(); setTimeout(() => setRunning(true), 50) }}>
          {winner ? 'New Game' : running ? 'Running...' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running || !!winner}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <button className="btn-primary text-sm !px-4 !py-2 !bg-purple-600 hover:!bg-purple-500" onClick={runBatch}>
          Run 1000 Games
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Games:</span> <span className="text-white font-semibold">{totalGames}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-rose-400">Y wins:</span> <span className="text-white font-semibold">{results.y}</span>
          {totalGames > 0 && <span className="text-slate-500 ml-1">({(100 * results.y / totalGames).toFixed(1)}%)</span>}
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-emerald-400">Z wins:</span> <span className="text-white font-semibold">{results.z}</span>
          {totalGames > 0 && <span className="text-slate-500 ml-1">({(100 * results.z / totalGames).toFixed(1)}%)</span>}
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Theory P(Z):</span> <span className="text-amber-400 font-semibold">{Z_WIN_PROB[yPattern]}</span>
          <span className="text-slate-500 ml-1">= {(Z_WIN_FRAC[yPattern] * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Full table */}
      <div className="mt-5">
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setShowTable(!showTable)}>
          {showTable ? 'Hide' : 'Show'} Full Matchup Table
        </button>
        {showTable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-slate-300 border border-slate-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-3 py-2 text-left">Y picks</th>
                  <th className="px-3 py-2 text-left">Z counters</th>
                  <th className="px-3 py-2 text-left">P(Z wins)</th>
                </tr>
              </thead>
              <tbody>
                {PATTERNS.map(p => (
                  <tr key={p} className={`border-t border-slate-700 ${p === yPattern ? 'bg-indigo-950/40' : ''}`}>
                    <td className="px-3 py-2 font-mono">{p}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">{OPTIMAL_Z[p]}</td>
                    <td className="px-3 py-2 text-amber-400">{Z_WIN_PROB[p]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {/* First-Step Analysis */}
      <div className="mt-5">
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setShowAnalysis(!showAnalysis)}>
          {showAnalysis ? 'Hide' : 'Show'} First-Step Analysis (HTH vs HHT)
        </button>
        {showAnalysis && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 definition-box">
            <h4 className="text-lg font-bold text-purple-400 mb-3">Worked Example: Y = HTH vs Z = HHT</h4>

            <p className="text-slate-300 mb-3">
              We want to find <InlineMath math="P(\text{Z wins})" /> using first-step analysis.
              The state is the last two flips. After each flip, we track where we are and whether either pattern has been completed.
            </p>

            <p className="text-slate-300 mb-2">
              <strong className="text-purple-300">States:</strong> The last two flips give us 4 possible states:{' '}
              <InlineMath math="\{HH, HT, TH, TT\}" />, plus a starting state <InlineMath math="S" /> (before two flips are available).
              The game ends when the last 3 flips form HTH (Y wins) or HHT (Z wins).
            </p>

            <p className="text-slate-300 mb-2">
              Let <InlineMath math="p_s" /> = P(Z wins from state <InlineMath math="s" />). We use the absorbing-state framework:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`p_s = \begin{cases} 0 & \text{if Y has just won (HTH completed)} \\ 1 & \text{if Z has just won (HHT completed)} \\ \sum_{j} P_{sj} \, p_j & \text{otherwise} \end{cases}`} />
            </div>

            <p className="text-slate-300 mt-4 mb-2">
              <strong className="text-purple-300">Key transitions from each state:</strong> After the next fair coin flip (H or T each with prob 1/2):
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="text-sm text-slate-300 border border-slate-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-3 py-2 text-left">State (last 2)</th>
                    <th className="px-3 py-2 text-left">Next flip H → </th>
                    <th className="px-3 py-2 text-left">Next flip T → </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono">HH</td>
                    <td className="px-3 py-2">HH (stay)</td>
                    <td className="px-3 py-2 text-emerald-400 font-bold">HHT → Z wins!</td>
                  </tr>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono">HT</td>
                    <td className="px-3 py-2">TH</td>
                    <td className="px-3 py-2">TT</td>
                  </tr>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono">TH</td>
                    <td className="px-3 py-2">HH</td>
                    <td className="px-3 py-2 text-rose-400 font-bold">THT... wait, need HTH</td>
                  </tr>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono">TT</td>
                    <td className="px-3 py-2">TH</td>
                    <td className="px-3 py-2">TT (stay)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-300 mb-2">
              <strong className="text-purple-300">Careful with absorptions:</strong>{' '}
              From state TH, flipping H gives HH (not yet a win — we need H<em>HT</em>, the 3rd flip hasn't formed HHT yet).
              From state TH, flipping T gives TT (the sequence ...THT doesn't end in HTH since the 3rd-to-last was T not H, <em>unless</em> the
              state before TH was H — but we only track the last 2 flips).
            </p>
            <p className="text-slate-300 mb-3">
              Actually, let's be more precise. From state HT, the last two flips are HT. If the next flip is H, the last 3 flips
              are <strong>HTH → Y wins</strong>. So state HT with next flip H is an absorption for Y:
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="text-sm text-slate-300 border border-slate-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-3 py-2 text-left">State</th>
                    <th className="px-3 py-2 text-left">Flip H (prob 1/2)</th>
                    <th className="px-3 py-2 text-left">Flip T (prob 1/2)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono font-bold">HH</td>
                    <td className="px-3 py-2">→ HH</td>
                    <td className="px-3 py-2 text-emerald-400 font-bold">→ HHT: Z wins</td>
                  </tr>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono font-bold">HT</td>
                    <td className="px-3 py-2 text-rose-400 font-bold">→ HTH: Y wins</td>
                    <td className="px-3 py-2">→ TT</td>
                  </tr>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono font-bold">TH</td>
                    <td className="px-3 py-2">→ HH</td>
                    <td className="px-3 py-2">→ HT</td>
                  </tr>
                  <tr className="border-t border-slate-700">
                    <td className="px-3 py-2 font-mono font-bold">TT</td>
                    <td className="px-3 py-2">→ TH</td>
                    <td className="px-3 py-2">→ TT</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-300 mb-2">
              <strong className="text-purple-300">Setting up equations for <InlineMath math="p_s" /> = P(Z wins | last two flips = <InlineMath math="s" />):</strong>
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`p_{HH} = \tfrac{1}{2}\,p_{HH} + \tfrac{1}{2}\cdot 1 \quad\text{(flip H → HH, flip T → Z wins)}`} />
              <BlockMath math={String.raw`p_{HT} = \tfrac{1}{2}\cdot 0 + \tfrac{1}{2}\,p_{TT} \quad\text{(flip H → Y wins, flip T → TT)}`} />
              <BlockMath math={String.raw`p_{TH} = \tfrac{1}{2}\,p_{HH} + \tfrac{1}{2}\,p_{HT}`} />
              <BlockMath math={String.raw`p_{TT} = \tfrac{1}{2}\,p_{TH} + \tfrac{1}{2}\,p_{TT}`} />
            </div>

            <p className="text-slate-300 mt-3 mb-2"><strong className="text-purple-300">Solving:</strong></p>
            <p className="text-slate-300 mb-1">
              From eq. 1: <InlineMath math="\frac{1}{2}\,p_{HH} = \frac{1}{2}" /> → <InlineMath math="p_{HH} = 1" />.
            </p>
            <p className="text-slate-300 mb-1">
              From eq. 4: <InlineMath math="\frac{1}{2}\,p_{TT} = \frac{1}{2}\,p_{TH}" /> → <InlineMath math="p_{TT} = p_{TH}" />.
            </p>
            <p className="text-slate-300 mb-1">
              From eq. 3: <InlineMath math="p_{TH} = \frac{1}{2}(1) + \frac{1}{2}\,p_{HT} = \frac{1}{2} + \frac{1}{2}\,p_{HT}" />.
            </p>
            <p className="text-slate-300 mb-1">
              From eq. 2: <InlineMath math="p_{HT} = \frac{1}{2}\,p_{TT} = \frac{1}{2}\,p_{TH}" />.
            </p>
            <p className="text-slate-300 mb-1">
              Substituting: <InlineMath math="p_{TH} = \frac{1}{2} + \frac{1}{2}\cdot\frac{1}{2}\,p_{TH} = \frac{1}{2} + \frac{1}{4}\,p_{TH}" />.
            </p>
            <p className="text-slate-300 mb-2">
              So <InlineMath math="\frac{3}{4}\,p_{TH} = \frac{1}{2}" /> → <InlineMath math="p_{TH} = \frac{2}{3}" />,{' '}
              <InlineMath math="p_{TT} = \frac{2}{3}" />,{' '}
              <InlineMath math="p_{HT} = \frac{1}{3}" />.
            </p>

            <div className="mt-3 p-3 rounded-lg bg-purple-950/30 border border-purple-800/50">
              <p className="text-slate-300 mb-1"><strong className="text-purple-300">Summary:</strong></p>
              <div className="math-block">
                <BlockMath math={String.raw`p_{HH} = 1, \quad p_{HT} = \frac{1}{3}, \quad p_{TH} = \frac{2}{3}, \quad p_{TT} = \frac{2}{3}`} />
              </div>
              <p className="text-slate-300 mt-2">
                From the start (before any flips), the first two flips land in HH, HT, TH, or TT each with prob 1/4.
                So:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`P(\text{Z wins}) = \tfrac{1}{4}(1 + \tfrac{1}{3} + \tfrac{2}{3} + \tfrac{2}{3}) = \tfrac{1}{4}\cdot\tfrac{8}{3} = \frac{2}{3}`} />
              </div>
              <p className="text-slate-300 mt-2">
                This confirms the simulation: Z (with HHT) beats Y (with HTH) with probability <strong className="text-amber-400">2/3</strong>.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}


// ═══════════════════════════════════════════════
// 3. MICKEY MAZE ABSORPTION (Example 3.8)
// ═══════════════════════════════════════════════

function MickeyMaze() {
  const [mickeyPos, setMickeyPos] = useState(4)
  const [path, setPath] = useState([4])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(400)
  const [done, setDone] = useState(false)
  const [reachedTarget, setReachedTarget] = useState(null) // 2 or 6
  const [trials, setTrials] = useState({ reached2: 0, reached6: 0 })
  const [startCell, setStartCell] = useState(4)
  const [showEqs, setShowEqs] = useState(false)
  const mazeRef = useRef(null)
  const timerRef = useRef(null)

  // Adjacency for 3x3 grid (cells 0-8)
  const neighbors = {
    0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
    3: [0, 4, 6], 4: [1, 3, 5, 7], 5: [2, 4, 8],
    6: [3, 7], 7: [4, 6, 8], 8: [5, 7]
  }

  // Absorption probabilities p_i = P(reach 2 before 6 | start i)
  const absProb = { 0: 0.5, 1: 2/3, 2: 1, 3: 1/3, 4: 0.5, 5: 2/3, 6: 0, 7: 1/3, 8: 0.5 }

  const step = useCallback(() => {
    setMickeyPos(prev => {
      if (prev === 2 || prev === 6) return prev
      const nbrs = neighbors[prev]
      const next = nbrs[Math.floor(Math.random() * nbrs.length)]
      setPath(p => [...p, next])
      if (next === 2 || next === 6) {
        setDone(true)
        setReachedTarget(next)
        setRunning(false)
        clearInterval(timerRef.current)
        setTrials(t => next === 2 ? { ...t, reached2: t.reached2 + 1 } : { ...t, reached6: t.reached6 + 1 })
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (running && !done) {
      timerRef.current = setInterval(step, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [running, speed, step, done])

  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setMickeyPos(startCell)
    setPath([startCell])
    setDone(false)
    setReachedTarget(null)
  }

  const runBatch = () => {
    let r2 = 0, r6 = 0
    for (let t = 0; t < 1000; t++) {
      let pos = startCell
      while (pos !== 2 && pos !== 6) {
        const nbrs = neighbors[pos]
        pos = nbrs[Math.floor(Math.random() * nbrs.length)]
      }
      if (pos === 2) r2++; else r6++
    }
    setTrials(t => ({ reached2: t.reached2 + r2, reached6: t.reached6 + r6 }))
  }

  // ── Maze drawing ──
  useEffect(() => {
    const canvas = mazeRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const cellSize = Math.min((W - 60) / 3, (H - 60) / 3)
    const ox = (W - 3 * cellSize) / 2
    const oy = (H - 3 * cellSize) / 2

    const cellCenter = (i) => {
      const row = Math.floor(i / 3), col = i % 3
      return { x: ox + col * cellSize + cellSize / 2, y: oy + row * cellSize + cellSize / 2 }
    }

    // draw grid edges
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    for (let i = 0; i < 9; i++) {
      const c = cellCenter(i)
      for (const j of neighbors[i]) {
        if (j > i) {
          const c2 = cellCenter(j)
          ctx.beginPath()
          ctx.moveTo(c.x, c.y)
          ctx.lineTo(c2.x, c2.y)
          ctx.stroke()
        }
      }
    }

    // draw path
    if (path.length > 1) {
      ctx.strokeStyle = '#6366f180'
      ctx.lineWidth = 3
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      const p0 = cellCenter(path[0])
      ctx.moveTo(p0.x, p0.y)
      for (let i = 1; i < path.length; i++) {
        const pi = cellCenter(path[i])
        ctx.lineTo(pi.x, pi.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // draw cells
    for (let i = 0; i < 9; i++) {
      const c = cellCenter(i)
      const r = cellSize * 0.32

      // color by absorption probability
      const p = absProb[i]
      const red = Math.round(255 * (1 - p) * 0.6)
      const green = Math.round(255 * p * 0.6)

      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, 2 * Math.PI)

      if (i === 2) {
        ctx.fillStyle = '#065f46'
        ctx.fill()
        ctx.strokeStyle = '#34d399'
      } else if (i === 6) {
        ctx.fillStyle = '#7f1d1d'
        ctx.fill()
        ctx.strokeStyle = '#f87171'
      } else if (i === mickeyPos) {
        ctx.fillStyle = '#3730a3'
        ctx.fill()
        ctx.strokeStyle = '#818cf8'
      } else {
        ctx.fillStyle = `rgb(${red}, ${green}, 40)`
        ctx.fill()
        ctx.strokeStyle = '#475569'
      }
      ctx.lineWidth = 2
      ctx.stroke()

      // cell label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (i === mickeyPos) {
        ctx.fillText('M', c.x, c.y)
      } else if (i === 2) {
        ctx.fillText('2 (G)', c.x, c.y)
      } else if (i === 6) {
        ctx.fillText('6 (R)', c.x, c.y)
      } else {
        ctx.fillText(String(i), c.x, c.y)
      }

      // absorption probability below
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(`p=${(absProb[i]).toFixed(2)}`, c.x, c.y + r + 14)
    }
  }, [mickeyPos, path, startCell])

  const total = trials.reached2 + trials.reached6

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="example-box">
      <h3 className="text-xl font-bold text-amber-400 mb-2">Example 3.8 — Mickey in the Maze</h3>
      <p className="text-slate-300 mb-4">
        Mickey is in a 3x3 maze (cells 0-8). At each step he moves to a uniformly random neighboring cell.
        What is the probability he reaches cell 2 (green) before cell 6 (red)?
      </p>

      {/* Maze */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={mazeRef} className="w-full" style={{ height: 320 }} />
      </div>

      {/* Start cell selector */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-300 flex items-center gap-2">
          Start cell:
          <select
            value={startCell}
            onChange={e => { setStartCell(+e.target.value); reset() }}
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white"
          >
            {[0,1,3,4,5,7,8].map(c => <option key={c} value={c}>Cell {c} (p={absProb[c].toFixed(2)})</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>Speed: {speed}ms</span>
          <input type="range" min="100" max="800" step="50" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-28 accent-amber-500" />
        </label>
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => { if (done) { reset(); setTimeout(() => setRunning(true), 50) } else setRunning(true) }}>
          {done ? 'New Walk' : running ? 'Running...' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running || done}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <button className="btn-primary text-sm !px-4 !py-2 !bg-amber-600 hover:!bg-amber-500" onClick={runBatch}>Run 1000 Trials</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setTrials({ reached2: 0, reached6: 0 })}>Clear</button>
      </div>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Steps:</span> <span className="text-white font-semibold">{path.length - 1}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Path:</span> <span className="text-indigo-400 font-mono text-xs">{path.join(' > ')}</span>
        </div>
        {reachedTarget && (
          <div className={`bg-slate-800/60 rounded-xl px-4 py-2 ${reachedTarget === 2 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Reached cell {reachedTarget}!
          </div>
        )}
        {total > 0 && (
          <>
            <div className="bg-slate-800/60 rounded-xl px-4 py-2">
              <span className="text-emerald-400">Reached 2:</span> <span className="text-white font-semibold">{trials.reached2}</span>
              <span className="text-slate-500 ml-1">({(100 * trials.reached2 / total).toFixed(1)}%)</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 py-2">
              <span className="text-slate-400">Theory:</span> <span className="text-amber-400 font-semibold">{(absProb[startCell] * 100).toFixed(1)}%</span>
            </div>
          </>
        )}
      </div>

      {/* Equations */}
      <div className="mt-5">
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setShowEqs(!showEqs)}>
          {showEqs ? 'Hide' : 'Show'} First-Step Equations
        </button>
        {showEqs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 definition-box">
            <h4 className="text-lg font-bold text-amber-400 mb-3">Absorption Probabilities</h4>
            <p className="text-slate-300 mb-2">
              Let <InlineMath math="p_i = P(\text{reach 2 before 6} \mid X_0 = i)" />. Boundary: <InlineMath math="p_2 = 1, \; p_6 = 0" />.
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`p_i = \frac{1}{|\mathcal{N}(i)|} \sum_{j \in \mathcal{N}(i)} p_j \quad \text{for } i \neq 2, 6`} />
            </div>
            <p className="text-slate-300 mb-2">By symmetry: <InlineMath math="p_0 = p_8, \; p_1 = p_5, \; p_3 = p_7" />.</p>
            <div className="math-block">
              <BlockMath math={String.raw`p_0 = \tfrac{1}{2}(p_1 + p_3)`} />
              <BlockMath math={String.raw`p_1 = \tfrac{1}{3}(p_0 + 1 + p_4)`} />
              <BlockMath math={String.raw`p_3 = \tfrac{1}{3}(p_0 + p_4 + 0)`} />
              <BlockMath math={String.raw`p_4 = \tfrac{1}{4}(p_1 + p_3 + p_5 + p_7) = \tfrac{1}{2}(p_1 + p_3)`} />
            </div>
            <p className="text-slate-300 mt-2 mb-2">Solution:</p>
            <div className="math-block">
              <BlockMath math={String.raw`p_0 = p_8 = \frac{1}{2}, \; p_1 = p_5 = \frac{2}{3}, \; p_3 = p_7 = \frac{1}{3}, \; p_4 = \frac{1}{2}`} />
            </div>

            <h4 className="text-lg font-bold text-amber-400 mt-5 mb-3">Mean Steps to Absorption (from cell 4)</h4>
            <p className="text-slate-300 mb-2">
              Let <InlineMath math="w_i = E[T \mid X_0 = i]" /> where <InlineMath math="T = \min\{n : X_n \in \{2,6\}\}" /> is
              the first time Mickey reaches cell 2 or cell 6. In words, <InlineMath math="w_i" /> is the expected number of
              steps for Mickey to reach either target, starting from cell <InlineMath math="i" />.
            </p>
            <p className="text-slate-300 mb-3">
              By the general first-step framework:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`w_i = \begin{cases} 0 & i \in A = \{2,6\} \\ 1 + \displaystyle\sum_{j} P_{ij} \, w_j & i \notin A \end{cases}`} />
            </div>
            <p className="text-slate-300 mt-3 mb-2">
              Since Mickey moves to each neighbor with equal probability, this becomes:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`w_i = 1 + \frac{1}{|\mathcal{N}(i)|} \sum_{j \in \mathcal{N}(i)} w_j, \quad w_2 = w_6 = 0`} />
            </div>
            <p className="text-slate-300 mt-3 mb-2">
              Writing out each equation explicitly (with boundary <InlineMath math="w_2 = w_6 = 0" />):
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`w_0 = 1 + \tfrac{1}{2}(w_1 + w_3)`} />
              <BlockMath math={String.raw`w_1 = 1 + \tfrac{1}{3}(w_0 + w_4) \quad (\text{since neighbor 2 is absorbing: } w_2=0)`} />
              <BlockMath math={String.raw`w_3 = 1 + \tfrac{1}{3}(w_0 + w_4) \quad (\text{since neighbor 6 is absorbing: } w_6=0)`} />
              <BlockMath math={String.raw`w_4 = 1 + \tfrac{1}{4}(w_1 + w_3 + w_5 + w_7)`} />
              <BlockMath math={String.raw`w_5 = 1 + \tfrac{1}{3}(w_4 + w_8) \quad (w_2=0)`} />
              <BlockMath math={String.raw`w_7 = 1 + \tfrac{1}{3}(w_4 + w_8) \quad (w_6=0)`} />
              <BlockMath math={String.raw`w_8 = 1 + \tfrac{1}{2}(w_5 + w_7)`} />
            </div>
            <p className="text-slate-300 mt-3 mb-1">
              Notice that <InlineMath math="w_1 = w_3" />, <InlineMath math="w_5 = w_7" />, and <InlineMath math="w_0 = w_8" /> by
              symmetry (reflecting the maze along the diagonal). Using this, the system simplifies and solving gives:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`w_0 = w_4 = w_8 = 6, \qquad w_1 = w_3 = w_5 = w_7 = 5`} />
            </div>
            <p className="text-slate-300 mt-2 text-sm">
              So starting from cell 4 (center), Mickey takes on average <strong className="text-amber-300">6 steps</strong> to reach either exit.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}


// ═══════════════════════════════════════════════
// 4. FIRST-STEP EQUATION BUILDER
// ═══════════════════════════════════════════════

function EquationBuilder() {
  const [n, setN] = useState(3)
  const [matrix, setMatrix] = useState([
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0, 1]
  ])
  const [absorbing, setAbsorbing] = useState(new Set([2]))
  const [mode, setMode] = useState('absorption') // 'absorption' or 'expected'
  const [solution, setSolution] = useState(null)

  const updateSize = (newN) => {
    const newMatrix = Array.from({ length: newN }, (_, i) =>
      Array.from({ length: newN }, (_, j) => (matrix[i] && matrix[i][j] !== undefined) ? matrix[i][j] : (i === j ? 1 : 0))
    )
    setN(newN)
    setMatrix(newMatrix)
    setAbsorbing(prev => {
      const next = new Set()
      prev.forEach(s => { if (s < newN) next.add(s) })
      return next
    })
    setSolution(null)
  }

  const updateCell = (i, j, val) => {
    const v = parseFloat(val)
    if (isNaN(v)) return
    const newM = matrix.map(row => [...row])
    newM[i][j] = v
    setMatrix(newM)
    setSolution(null)
  }

  const toggleAbsorbing = (i) => {
    setAbsorbing(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
    setSolution(null)
  }

  const solve = () => {
    const transient = []
    for (let i = 0; i < n; i++) {
      if (!absorbing.has(i)) transient.push(i)
    }

    if (transient.length === 0 || absorbing.size === 0) {
      setSolution({ error: 'Need at least one transient and one absorbing state.' })
      return
    }

    const m = transient.length

    if (mode === 'expected') {
      // w_i = 1 + sum_{j transient} P_ij * w_j
      // => (I - Q) w = 1  where Q_ij = P[transient_i][transient_j]
      const A = Array.from({ length: m }, (_, ii) =>
        Array.from({ length: m }, (_, jj) => (ii === jj ? 1 : 0) - matrix[transient[ii]][transient[jj]])
      )
      const b = new Array(m).fill(1)
      const w = solveLinearSystem(A, b)
      setSolution({ type: 'expected', transient, values: w })
    } else {
      // For each absorbing target t:
      // p_i(t) = P_it + sum_{j transient} P_ij * p_j(t)
      // => (I - Q) p = col_t
      const absArr = [...absorbing]
      const allResults = {}
      for (const t of absArr) {
        const A = Array.from({ length: m }, (_, ii) =>
          Array.from({ length: m }, (_, jj) => (ii === jj ? 1 : 0) - matrix[transient[ii]][transient[jj]])
        )
        const b = transient.map(i => matrix[i][t])
        const p = solveLinearSystem(A, b)
        allResults[t] = p
      }
      setSolution({ type: 'absorption', transient, absorbingStates: absArr, values: allResults })
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="section-card">
      <h3 className="text-xl font-bold text-teal-400 mb-2">First-Step Equation Builder</h3>
      <p className="text-slate-300 mb-4">
        Enter a transition matrix, mark absorbing states, and compute absorption probabilities or expected hitting times.
      </p>

      {/* Size selector */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-sm text-slate-300 flex items-center gap-2">
          States (n):
          <select value={n} onChange={e => updateSize(+e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white">
            {[2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-300 flex items-center gap-2">
          Compute:
          <select value={mode} onChange={e => { setMode(e.target.value); setSolution(null) }} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white">
            <option value="absorption">Absorption Probabilities</option>
            <option value="expected">Expected Hitting Times</option>
          </select>
        </label>
      </div>

      {/* Matrix input */}
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 text-slate-500"></th>
              {Array.from({ length: n }, (_, j) => (
                <th key={j} className="px-2 py-1 text-slate-400 text-center">{j}</th>
              ))}
              <th className="px-2 py-1 text-slate-400 text-center">Absorbing?</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, i) => (
              <tr key={i}>
                <td className="px-2 py-1 text-slate-400 font-bold">{i}</td>
                {Array.from({ length: n }, (_, j) => (
                  <td key={j} className="px-1 py-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={matrix[i][j]}
                      onChange={e => updateCell(i, j, e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center text-xs"
                    />
                  </td>
                ))}
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={absorbing.has(i)}
                    onChange={() => toggleAbsorbing(i)}
                    className="accent-teal-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={solve}>Solve</button>
      </div>

      {/* Solution */}
      {solution && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 definition-box">
          {solution.error ? (
            <p className="text-rose-400">{solution.error}</p>
          ) : solution.type === 'expected' ? (
            <>
              <h4 className="text-lg font-bold text-teal-400 mb-2">Expected Hitting Times</h4>
              <p className="text-slate-300 mb-2">
                <InlineMath math="w_i = E[T \mid X_0 = i]" /> where <InlineMath math="T" /> = first time to reach an absorbing state.
              </p>
              {solution.transient.map((s, idx) => (
                <div key={s} className="text-slate-200 font-mono text-sm mb-1">
                  w_{s} = {solution.values[idx].toFixed(4)}
                </div>
              ))}
            </>
          ) : (
            <>
              <h4 className="text-lg font-bold text-teal-400 mb-2">Absorption Probabilities</h4>
              {solution.absorbingStates.map(t => (
                <div key={t} className="mb-3">
                  <p className="text-slate-300 font-semibold mb-1">Target state {t}:</p>
                  {solution.transient.map((s, idx) => (
                    <div key={s} className="text-slate-200 font-mono text-sm mb-1 ml-4">
                      p_{s}({t}) = {solution.values[t][idx].toFixed(4)}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}


// ═══════════════════════════════════════════════
// 5. FECUNDITY MODEL (Example 3.9)
// ═══════════════════════════════════════════════

function FecundityModel() {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="example-box">
      <h3 className="text-xl font-bold text-rose-400 mb-2">Example 3.9 — Fecundity Model</h3>
      <p className="text-slate-300 mb-4">
        A woman's life is modeled in 5-year periods with 6 states:{' '}
        <InlineMath math="E_0" /> (prepuberty), <InlineMath math="E_1" /> (single),{' '}
        <InlineMath math="E_2" /> (married), <InlineMath math="E_3" /> (divorced),{' '}
        <InlineMath math="E_4" /> (widowed), <InlineMath math="E_5" /> (out-of-population, absorbing).
      </p>

      {/* State transition diagram */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-3 text-center">State Transition Diagram</h4>
        <svg viewBox="0 0 520 300" className="w-full max-w-2xl mx-auto" style={{ height: 260 }}>
          <defs>
            <marker id="fec-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>
          {/* Layout: E0(60,80) E1(180,80) E2(300,80) E3(180,200) E4(300,200) E5(420,150) */}
          {/* E0 -> E1 */}
          <line x1="88" y1="80" x2="152" y2="80" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          {/* E1 -> E2 */}
          <line x1="208" y1="75" x2="272" y2="75" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          {/* E2 -> E1 (divorce route, curved above) */}
          <path d="M 272,68 Q 240,40 208,68" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          <text x="240" y="42" textAnchor="middle" fill="#94a3b8" fontSize="9">divorce</text>
          {/* E2 -> E3 */}
          <line x1="290" y1="108" x2="200" y2="172" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          {/* E2 -> E4 */}
          <line x1="300" y1="108" x2="300" y2="172" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          {/* E3 -> E2 (remarry) */}
          <line x1="200" y1="172" x2="282" y2="108" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          <text x="228" y="134" textAnchor="middle" fill="#94a3b8" fontSize="9">remarry</text>
          {/* E4 -> E2 (remarry) */}
          <path d="M 316,176 Q 340,140 316,108" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          <text x="344" y="140" textAnchor="start" fill="#94a3b8" fontSize="9">remarry</text>
          {/* E1 -> E5 */}
          <line x1="200" y1="108" x2="400" y2="145" stroke="#f87171" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#fec-arrow)" />
          {/* E2 -> E5 */}
          <line x1="320" y1="100" x2="400" y2="140" stroke="#f87171" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#fec-arrow)" />
          {/* E3 -> E5 */}
          <line x1="200" y1="210" x2="400" y2="160" stroke="#f87171" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#fec-arrow)" />
          {/* E4 -> E5 */}
          <line x1="318" y1="205" x2="400" y2="160" stroke="#f87171" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#fec-arrow)" />
          {/* E2 self-loop (stay married) */}
          <path d="M 285,58 A 18,18 0 1,1 315,58" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#fec-arrow)" />
          <text x="300" y="34" textAnchor="middle" fill="#34d399" fontSize="9">stay</text>
          {/* Node circles */}
          <circle cx="60" cy="80" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="60" y="76" textAnchor="middle" fill="#c7d2fe" fontSize="10">E₀</text>
          <text x="60" y="90" textAnchor="middle" fill="#94a3b8" fontSize="8">pre</text>
          <circle cx="180" cy="80" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="180" y="76" textAnchor="middle" fill="#c7d2fe" fontSize="10">E₁</text>
          <text x="180" y="90" textAnchor="middle" fill="#94a3b8" fontSize="8">single</text>
          <circle cx="300" cy="80" r="22" fill="#065f46" stroke="#34d399" strokeWidth="2" />
          <text x="300" y="76" textAnchor="middle" fill="#d1fae5" fontSize="10">E₂</text>
          <text x="300" y="90" textAnchor="middle" fill="#6ee7b7" fontSize="8">married</text>
          <circle cx="180" cy="200" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="180" y="196" textAnchor="middle" fill="#c7d2fe" fontSize="10">E₃</text>
          <text x="180" y="210" textAnchor="middle" fill="#94a3b8" fontSize="8">divorced</text>
          <circle cx="300" cy="200" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <text x="300" y="196" textAnchor="middle" fill="#c7d2fe" fontSize="10">E₄</text>
          <text x="300" y="210" textAnchor="middle" fill="#94a3b8" fontSize="8">widowed</text>
          <circle cx="420" cy="150" r="22" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
          <text x="420" y="146" textAnchor="middle" fill="#fecaca" fontSize="10">E₅</text>
          <text x="420" y="160" textAnchor="middle" fill="#f87171" fontSize="8">absorb</text>
        </svg>
      </div>

      <div className="math-block">
        <BlockMath math={String.raw`\text{Mean number of married periods} = w_2 = 4.5`} />
        <BlockMath math={String.raw`\text{i.e., } 4.5 \times 5 = 22.5 \text{ years in the married state}`} />
      </div>

      <p className="text-slate-300 mt-3">
        Using first-step analysis on the expected number of visits to <InlineMath math="E_2" /> before absorption
        into <InlineMath math="E_5" />, we set up equations for <InlineMath math="w_i" /> = expected visits to the
        married state starting from state <InlineMath math="i" />.
      </p>

      <button className="btn-secondary text-sm !px-4 !py-2 mt-3" onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? 'Hide' : 'Show'} Details
      </button>
      {showDetails && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-slate-300 text-sm">
          <p className="mb-2">
            The first-step analysis gives equations of the form:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`w_i = \delta_{i,2} + \sum_{j \neq 5} P_{ij} \, w_j`} />
          </div>
          <p className="mt-2">
            where <InlineMath math="\delta_{i,2} = 1" /> if <InlineMath math="i=2" /> (we count being in the married state)
            and <InlineMath math="w_5 = 0" /> since state 5 is absorbing. The solution yields{' '}
            <InlineMath math="w_2 = 4.5" />, meaning an expected 22.5 years of marriage across a lifetime.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}


// ═══════════════════════════════════════════════
// 6. EXERCISES
// ═══════════════════════════════════════════════

function ExerciseItem({ number, title, children, hint, solution }) {
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  return (
    <div className="exercise-box">
      <h4 className="text-lg font-bold text-indigo-400 mb-2">Exercise {number}: {title}</h4>
      <div className="text-slate-300 mb-3">{children}</div>
      <div className="flex flex-wrap gap-2">
        {hint && (
          <button className="btn-secondary text-sm !px-3 !py-1" onClick={() => setShowHint(!showHint)}>
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
        )}
        {solution && (
          <button className="btn-secondary text-sm !px-3 !py-1" onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? 'Hide Solution' : 'Show Solution'}
          </button>
        )}
      </div>
      {showHint && hint && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 bg-indigo-950/30 border border-indigo-800/50 rounded-lg text-slate-300 text-sm">
          <strong className="text-indigo-400">Hint:</strong> {hint}
        </motion.div>
      )}
      {showSolution && solution && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-slate-300 text-sm">
          <strong className="text-emerald-400">Solution:</strong> {solution}
        </motion.div>
      )}
    </div>
  )
}

function Exercises() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="space-y-6">
      <h3 className="text-2xl font-bold text-indigo-400">Exercises</h3>

      <ExerciseItem
        number="3.7"
        title="Mean Tosses till First HHH"
        hint={
          <span>
            Model the states as <InlineMath math="\{0, 1, 2, 3\}" /> where state <InlineMath math="k" /> means{' '}
            <InlineMath math="k" /> consecutive heads so far. State 3 is absorbing (HHH achieved).
            Set up equations for <InlineMath math="w_0, w_1, w_2" />.
          </span>
        }
        solution={
          <span>
            <div className="mb-2"><strong>States:</strong> 0 = no recent H, 1 = one H, 2 = two H's, 3 = HHH (absorbing).</div>
            <div className="mb-2"><strong>Transitions:</strong></div>
            <div className="mb-2 text-sm">
              &bull; State 0: flip H &rarr; state 1, flip T &rarr; state 0<br />
              &bull; State 1: flip H &rarr; state 2, flip T &rarr; state 0 (streak broken)<br />
              &bull; State 2: flip H &rarr; state 3 (absorbed!), flip T &rarr; state 0 (streak broken)
            </div>
            <div className="mb-2"><strong>First-step equations</strong> (let <InlineMath math="w_k" /> = expected steps from state <InlineMath math="k" /> to state 3):</div>
            <div className="math-block">
              <BlockMath math={String.raw`w_0 = 1 + \tfrac{1}{2}w_0 + \tfrac{1}{2}w_1`} />
              <BlockMath math={String.raw`w_1 = 1 + \tfrac{1}{2}w_0 + \tfrac{1}{2}w_2`} />
              <BlockMath math={String.raw`w_2 = 1 + \tfrac{1}{2}w_0 + \tfrac{1}{2}\cdot 0`} />
            </div>
            <div className="mt-2"><strong>Solve step by step:</strong></div>
            <div className="text-sm mt-1">
              From eq.3: <InlineMath math="w_2 = 1 + \frac{1}{2}w_0" />
            </div>
            <div className="text-sm mt-1">
              Substitute into eq.2: <InlineMath math="w_1 = 1 + \frac{1}{2}w_0 + \frac{1}{2}(1+\frac{1}{2}w_0) = \frac{3}{2} + \frac{3}{4}w_0" />
            </div>
            <div className="text-sm mt-1">
              Substitute into eq.1: <InlineMath math="w_0 = 1 + \frac{1}{2}w_0 + \frac{1}{2}(\frac{3}{2}+\frac{3}{4}w_0) = \frac{7}{4} + \frac{7}{8}w_0" />
            </div>
            <div className="text-sm mt-1">
              So <InlineMath math="\frac{1}{8}w_0 = \frac{7}{4}" />, giving <InlineMath math="w_0 = 14" />.
            </div>
            <div className="math-block">
              <BlockMath math={String.raw`w_0 = 14, \quad w_1 = 12, \quad w_2 = 8`} />
            </div>
            <div className="mt-2">
              Since we start at state 0 (no heads yet), the <strong>expected number of tosses = 14</strong>.
            </div>
          </span>
        }
      >
        <p>
          Use first-step analysis to find the expected number of fair coin tosses until the first occurrence
          of three consecutive heads (<InlineMath math="HHH" />).
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`\text{States: } \{0, 1, 2, 3\}, \quad 3 = HHH \text{ (absorbing)}`} />
        </div>
        <div className="mt-3 bg-slate-800/40 rounded-xl border border-slate-700 p-3">
          <svg viewBox="0 0 520 120" className="w-full max-w-lg mx-auto" style={{ height: 100 }}>
            <defs>
              <marker id="ex37-arr" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>
            {/* 0 self-loop */}
            <path d="M 55,30 A 18,18 0 1,1 85,30" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="70" y="10" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(T)</text>
            {/* 0 -> 1 */}
            <line x1="98" y1="55" x2="172" y2="55" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="135" y="48" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(H)</text>
            {/* 1 -> 0 */}
            <path d="M 175,75 Q 135,100 95,75" fill="none" stroke="#f87171" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="135" y="98" textAnchor="middle" fill="#fca5a5" fontSize="10">½(T)</text>
            {/* 1 -> 2 */}
            <line x1="228" y1="55" x2="302" y2="55" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="265" y="48" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(H)</text>
            {/* 2 -> 0 */}
            <path d="M 310,75 Q 200,120 85,75" fill="none" stroke="#f87171" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="200" y="115" textAnchor="middle" fill="#fca5a5" fontSize="10">½(T) reset!</text>
            {/* 2 -> 3 */}
            <line x1="358" y1="55" x2="432" y2="55" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="395" y="48" textAnchor="middle" fill="#6ee7b7" fontSize="10">½(H)</text>
            {/* Nodes */}
            <circle cx="70" cy="55" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="70" y="59" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">0</text>
            <circle cx="200" cy="55" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="200" y="59" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">1</text>
            <circle cx="330" cy="55" r="22" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="330" y="59" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">2</text>
            <circle cx="460" cy="55" r="22" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <text x="460" y="59" textAnchor="middle" fill="#d1fae5" fontSize="14" fontWeight="bold">3</text>
            {/* 3 self-loop */}
            <path d="M 445,30 A 18,18 0 1,1 475,30" fill="none" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#ex37-arr)" />
            <text x="460" y="10" textAnchor="middle" fill="#6ee7b7" fontSize="10">1</text>
          </svg>
        </div>
      </ExerciseItem>

      <ExerciseItem
        number="3.8"
        title="Wolf Hunting a Rabbit on a Path"
        hint={
          <span>
            On a path graph <InlineMath math="1 - 2 - 3 - 4 - 5" />, the state is the distance{' '}
            <InlineMath math="d = |W - R|" /> between wolf and rabbit. At each step both move to a random neighbor.
            The distance changes by 0 or &plusmn;2 (at interior nodes) or has boundary effects.
            Set up <InlineMath math="w_d" /> = expected capture time from distance <InlineMath math="d" />.
          </span>
        }
        solution={
          <span>
            <div className="mb-2"><strong>Setup:</strong> Wolf and rabbit on path <InlineMath math="1\text{-}2\text{-}3\text{-}4\text{-}5" />. Wolf starts at 1, rabbit at 5 (distance 4). Both move to a uniformly random neighbor each step.</div>
            <div className="mb-2"><strong>Key insight:</strong> Track the distance <InlineMath math="d = |W - R|" />. When <InlineMath math="d=0" />, wolf catches rabbit. Since both are on a path, at interior nodes each moves left/right with prob 1/2, so the distance changes by &minus;2, 0, or +2.</div>
            <div className="mb-2"><strong>Simplification:</strong> At boundary nodes (1 or 5), movement is deterministic (only one neighbor). Let's work with actual positions <InlineMath math="(W,R)" />.</div>
            <div className="mb-2"><strong>By symmetry</strong>, we only need states where <InlineMath math="W < R" /> (since the problem is symmetric). The relevant states grouped by distance:</div>
            <div className="text-sm mb-2">
              &bull; <InlineMath math="d=2" />: (1,3), (2,4), (3,5)<br />
              &bull; <InlineMath math="d=4" />: (1,5)<br />
              &bull; <InlineMath math="d=0" />: caught (absorbing)
            </div>
            <div className="mb-2"><strong>First-step equations</strong> for <InlineMath math="w_{(W,R)}" /> = expected time to capture:</div>
            <div className="mb-2">Starting from <InlineMath math="(1,5)" />: Wolf must go to 2, rabbit must go to 4:</div>
            <div className="math-block">
              <BlockMath math={String.raw`w_{(1,5)} = 1 + w_{(2,4)}`} />
            </div>
            <div className="mb-2">From <InlineMath math="(2,4)" /> (both interior):</div>
            <div className="math-block">
              <BlockMath math={String.raw`w_{(2,4)} = 1 + \tfrac{1}{4}w_{(1,3)} + \tfrac{1}{4}w_{(1,5)} + \tfrac{1}{4}w_{(3,5)} + \tfrac{1}{4}w_{(3,3)}`} />
            </div>
            <div className="mb-2">where <InlineMath math="w_{(3,3)}=0" /> (caught). By symmetry <InlineMath math="w_{(1,3)} = w_{(3,5)}" />, so:</div>
            <div className="math-block">
              <BlockMath math={String.raw`w_{(2,4)} = 1 + \tfrac{1}{2}w_{(1,3)} + \tfrac{1}{4}w_{(1,5)}`} />
            </div>
            <div className="mb-2">From <InlineMath math="(1,3)" />: Wolf goes to 2 (forced). Rabbit goes to 2 or 4 with prob 1/2 each:</div>
            <div className="math-block">
              <BlockMath math={String.raw`w_{(1,3)} = 1 + \tfrac{1}{2}w_{(2,2)} + \tfrac{1}{2}w_{(2,4)} = 1 + \tfrac{1}{2}w_{(2,4)}`} />
            </div>
            <div className="mb-2"><strong>Solve:</strong></div>
            <div className="text-sm">
              Let <InlineMath math="a = w_{(1,3)}" />, <InlineMath math="b = w_{(2,4)}" />. Then <InlineMath math="a = 1 + \frac{1}{2}b" /> and <InlineMath math="b = 1 + \frac{1}{2}a + \frac{1}{4}(1+b)" />.
            </div>
            <div className="text-sm mt-1">
              From eq.2: <InlineMath math="b = \frac{5}{4} + \frac{1}{2}a + \frac{1}{4}b" />, so <InlineMath math="\frac{3}{4}b = \frac{5}{4} + \frac{1}{2}a" />, i.e., <InlineMath math="b = \frac{5}{3} + \frac{2}{3}a" />.
            </div>
            <div className="text-sm mt-1">
              Substitute <InlineMath math="a = 1 + \frac{1}{2}b = 1 + \frac{1}{2}(\frac{5}{3}+\frac{2}{3}a) = \frac{11}{6} + \frac{1}{3}a" />.
            </div>
            <div className="text-sm mt-1">
              So <InlineMath math="\frac{2}{3}a = \frac{11}{6}" />, giving <InlineMath math="a = \frac{11}{4}" /> and <InlineMath math="b = \frac{5}{3}+\frac{11}{6} = \frac{21}{6} = \frac{7}{2}" />.
            </div>
            <div className="math-block">
              <BlockMath math={String.raw`w_{(1,5)} = 1 + w_{(2,4)} = 1 + \frac{7}{2} = \boxed{\frac{9}{2}}`} />
            </div>
            <div className="mt-2">
              The expected capture time starting from (wolf=1, rabbit=5) is <strong>4.5 steps</strong>.
            </div>
          </span>
        }
      >
        <p>
          A wolf (at node 1) and a rabbit (at node 5) live on a path graph <InlineMath math="1\text{-}2\text{-}3\text{-}4\text{-}5" />.
          At each step, both move independently to a uniformly random neighbor. Find the expected number of steps until
          the wolf catches the rabbit (they occupy the same node).
        </p>
        <div className="mt-3 bg-slate-800/40 rounded-xl border border-slate-700 p-3">
          <h5 className="text-xs font-semibold text-slate-500 mb-2 text-center">Path Graph</h5>
          <svg viewBox="0 0 500 70" className="w-full max-w-md mx-auto" style={{ height: 55 }}>
            {/* Edges: 1-2, 2-3, 3-4, 4-5 */}
            <line x1="68" y1="30" x2="142" y2="30" stroke="#475569" strokeWidth="2" />
            <line x1="178" y1="30" x2="252" y2="30" stroke="#475569" strokeWidth="2" />
            <line x1="288" y1="30" x2="362" y2="30" stroke="#475569" strokeWidth="2" />
            <line x1="398" y1="30" x2="432" y2="30" stroke="#475569" strokeWidth="2" />
            {/* Nodes */}
            <circle cx="50" cy="30" r="18" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
            <text x="50" y="34" textAnchor="middle" fill="#fecaca" fontSize="12" fontWeight="bold">1</text>
            <text x="50" y="58" textAnchor="middle" fill="#f87171" fontSize="9">Wolf</text>
            <circle cx="160" cy="30" r="18" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="160" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">2</text>
            <circle cx="270" cy="30" r="18" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="270" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">3</text>
            <circle cx="380" cy="30" r="18" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="380" y="34" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">4</text>
            <circle cx="450" cy="30" r="18" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <text x="450" y="34" textAnchor="middle" fill="#d1fae5" fontSize="12" fontWeight="bold">5</text>
            <text x="450" y="58" textAnchor="middle" fill="#34d399" fontSize="9">Rabbit</text>
          </svg>
          <h5 className="text-xs font-semibold text-slate-500 mt-3 mb-2 text-center">Reduced State Space (W,R) with W &lt; R</h5>
          <svg viewBox="0 0 520 200" className="w-full max-w-lg mx-auto" style={{ height: 170 }}>
            <defs>
              <marker id="ex38-arr" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
              <marker id="ex38-arr-g" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
              </marker>
            </defs>
            {/* Layout: (1,5)@(70,50)  (2,4)@(220,50)  caught@(450,100)  (1,3)@(140,160)  (3,5)@(330,160) */}
            {/* (1,5) -> (2,4): prob 1 */}
            <line x1="98" y1="50" x2="192" y2="50" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex38-arr)" />
            <text x="145" y="42" textAnchor="middle" fill="#a5b4fc" fontSize="10">1</text>
            {/* (2,4) -> (1,5): ¼ */}
            <path d="M 200,65 Q 140,85 90,65" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex38-arr)" />
            <text x="140" y="82" textAnchor="middle" fill="#a5b4fc" fontSize="10">¼</text>
            {/* (2,4) -> (1,3): ¼ */}
            <line x1="205" y1="72" x2="155" y2="135" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex38-arr)" />
            <text x="168" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="10">¼</text>
            {/* (2,4) -> (3,5): ¼ */}
            <line x1="238" y1="72" x2="315" y2="135" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex38-arr)" />
            <text x="288" y="100" textAnchor="middle" fill="#a5b4fc" fontSize="10">¼</text>
            {/* (2,4) -> caught: ¼ */}
            <line x1="248" y1="55" x2="422" y2="95" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#ex38-arr-g)" />
            <text x="340" y="65" textAnchor="middle" fill="#6ee7b7" fontSize="10">¼</text>
            {/* (1,3) -> (2,4): ½ */}
            <line x1="155" y1="138" x2="208" y2="72" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex38-arr)" />
            <text x="195" y="112" textAnchor="middle" fill="#a5b4fc" fontSize="10">½</text>
            {/* (1,3) -> caught: ½ */}
            <line x1="165" y1="165" x2="425" y2="110" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#ex38-arr-g)" />
            <text x="310" y="148" textAnchor="middle" fill="#6ee7b7" fontSize="10">½</text>
            {/* (3,5) -> (2,4): ½ */}
            <line x1="318" y1="140" x2="235" y2="72" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex38-arr)" />
            <text x="265" y="112" textAnchor="middle" fill="#a5b4fc" fontSize="10">½</text>
            {/* (3,5) -> caught: ½ */}
            <line x1="352" y1="155" x2="430" y2="118" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#ex38-arr-g)" />
            <text x="405" y="145" textAnchor="middle" fill="#6ee7b7" fontSize="10">½</text>
            {/* Symmetry annotation */}
            <line x1="140" y1="180" x2="330" y2="180" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
            <text x="235" y="195" textAnchor="middle" fill="#f59e0b" fontSize="9">symmetric: w = w</text>
            {/* Nodes */}
            <circle cx="70" cy="50" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="70" y="48" textAnchor="middle" fill="#c7d2fe" fontSize="10">(1,5)</text>
            <text x="70" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">d=4</text>
            <circle cx="220" cy="50" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="220" y="48" textAnchor="middle" fill="#c7d2fe" fontSize="10">(2,4)</text>
            <text x="220" y="60" textAnchor="middle" fill="#94a3b8" fontSize="8">d=2</text>
            <circle cx="140" cy="160" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="140" y="158" textAnchor="middle" fill="#c7d2fe" fontSize="10">(1,3)</text>
            <text x="140" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8">d=2</text>
            <circle cx="330" cy="160" r="24" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="330" y="158" textAnchor="middle" fill="#c7d2fe" fontSize="10">(3,5)</text>
            <text x="330" y="170" textAnchor="middle" fill="#94a3b8" fontSize="8">d=2</text>
            <circle cx="450" cy="100" r="24" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <text x="450" y="98" textAnchor="middle" fill="#d1fae5" fontSize="10">d=0</text>
            <text x="450" y="110" textAnchor="middle" fill="#6ee7b7" fontSize="8">caught</text>
          </svg>
        </div>
      </ExerciseItem>

      <ExerciseItem
        number="3.9"
        title="Mickey Maze with Exit at Cell 2 Only"
        hint={
          <span>
            This is similar to Example 3.8 but now cell 2 is the <strong>only</strong> absorbing state (exit). All other cells are transient.
            Use the 3&times;3 grid adjacency from Example 3.8. Set up <InlineMath math="w_i = 1 + \frac{1}{|\mathcal{N}(i)|}\sum_{j \in \mathcal{N}(i)} w_j" /> for all <InlineMath math="i \neq 2" />, with <InlineMath math="w_2 = 0" />.
            Look for symmetry to reduce the number of unknowns.
          </span>
        }
        solution={
          <span>
            <div className="mb-2"><strong>Grid layout</strong> (cells 0&ndash;8, exit at cell 2):</div>
            <div className="font-mono text-sm mb-3 text-center">
              0 &mdash; 1 &mdash; <span className="text-emerald-400">[2]</span><br />
              |&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br />
              3 &mdash; 4 &mdash; 5<br />
              |&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br />
              6 &mdash; 7 &mdash; 8
            </div>
            <div className="mb-2"><strong>Adjacency</strong> (same as Example 3.8):</div>
            <div className="text-sm mb-3">
              0: &#123;1,3&#125;, 1: &#123;0,2,4&#125;, 3: &#123;0,4,6&#125;, 4: &#123;1,3,5,7&#125;, 5: &#123;2,4,8&#125;, 6: &#123;3,7&#125;, 7: &#123;4,6,8&#125;, 8: &#123;5,7&#125;
            </div>
            <div className="mb-2"><strong>First-step equations</strong> (<InlineMath math="w_2=0" />):</div>
            <div className="math-block text-sm">
              <BlockMath math={String.raw`w_0 = 1 + \tfrac{1}{2}(w_1 + w_3)`} />
              <BlockMath math={String.raw`w_1 = 1 + \tfrac{1}{3}(w_0 + 0 + w_4) = 1 + \tfrac{1}{3}(w_0 + w_4)`} />
              <BlockMath math={String.raw`w_3 = 1 + \tfrac{1}{3}(w_0 + w_4 + w_6)`} />
              <BlockMath math={String.raw`w_4 = 1 + \tfrac{1}{4}(w_1 + w_3 + w_5 + w_7)`} />
              <BlockMath math={String.raw`w_5 = 1 + \tfrac{1}{3}(0 + w_4 + w_8) = 1 + \tfrac{1}{3}(w_4 + w_8)`} />
              <BlockMath math={String.raw`w_6 = 1 + \tfrac{1}{2}(w_3 + w_7)`} />
              <BlockMath math={String.raw`w_7 = 1 + \tfrac{1}{3}(w_4 + w_6 + w_8)`} />
              <BlockMath math={String.raw`w_8 = 1 + \tfrac{1}{2}(w_5 + w_7)`} />
            </div>
            <div className="mb-2"><strong>Solve</strong> (8 equations, 8 unknowns). We can use substitution or Gaussian elimination. Solving the linear system:</div>
            <div className="math-block">
              <BlockMath math={String.raw`w_1 = \frac{46}{3}, \quad w_5 = \frac{56}{3}, \quad w_0 = \frac{68}{3}, \quad w_8 = \frac{76}{3}`} />
              <BlockMath math={String.raw`w_4 = \frac{72}{3} = 24, \quad w_3 = \frac{86}{3}, \quad w_7 = \frac{82}{3}, \quad w_6 = \frac{100}{3}`} />
            </div>
            <div className="mt-2">
              Mickey starts at cell 4, so the expected number of steps is:
            </div>
            <div className="math-block">
              <BlockMath math={String.raw`w_4 = \boxed{24}`} />
            </div>
            <div className="mt-2 text-sm text-slate-400">
              <strong>Sanity check:</strong> Cells closer to exit 2 have smaller expected times
              (<InlineMath math="w_1 \approx 15.3 < w_4 = 24 < w_6 \approx 33.3" />), which makes sense.
            </div>
          </span>
        }
      >
        <p>
          In the 3&times;3 maze from Example 3.8 (cells 0&ndash;8), suppose cell 2 is the <strong>only</strong> exit.
          Mickey starts at cell 4 and at each step moves to a uniformly random neighbor.
          Find the expected number of steps for Mickey to reach the exit.
        </p>
        <div className="mt-3 bg-slate-800/40 rounded-xl border border-slate-700 p-3">
          <svg viewBox="0 0 280 280" className="w-full max-w-[240px] mx-auto" style={{ height: 220 }}>
            {/* Grid edges */}
            {[[40,40,140,40],[140,40,240,40],[40,140,140,140],[140,140,240,140],[40,240,140,240],[140,240,240,240],
              [40,40,40,140],[140,40,140,140],[240,40,240,140],[40,140,40,240],[140,140,140,240],[240,140,240,240]].map(([x1,y1,x2,y2],i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1.5" />
            ))}
            {/* Cell nodes */}
            {[{x:40,y:40,l:'0'},{x:140,y:40,l:'1'},{x:240,y:40,l:'2',exit:true},{x:40,y:140,l:'3'},{x:140,y:140,l:'4',start:true},{x:240,y:140,l:'5'},{x:40,y:240,l:'6'},{x:140,y:240,l:'7'},{x:240,y:240,l:'8'}].map(n => (
              <g key={n.l}>
                <circle cx={n.x} cy={n.y} r="20" fill={n.exit ? '#065f46' : n.start ? '#3730a3' : '#1e1b4b'} stroke={n.exit ? '#34d399' : n.start ? '#818cf8' : '#475569'} strokeWidth="2" />
                <text x={n.x} y={n.y+4} textAnchor="middle" fill={n.exit ? '#d1fae5' : '#e2e8f0'} fontSize="13" fontWeight="bold">{n.l}</text>
                {n.exit && <text x={n.x} y={n.y+18} textAnchor="middle" fill="#34d399" fontSize="8">exit</text>}
                {n.start && <text x={n.x} y={n.y+18} textAnchor="middle" fill="#818cf8" fontSize="8">start</text>}
              </g>
            ))}
          </svg>
        </div>
      </ExerciseItem>

      <ExerciseItem
        number="3.5"
        title="Penney-ante with Length-2 Patterns"
        hint={
          <span>
            With length-2 patterns (<InlineMath math="HH, HT, TH, TT" />), the state after each flip is just the last flip
            (H or T), plus a start state. For each Y choice, try all Z choices and compute P(Z wins) using first-step analysis.
            For example, Y=HH vs Z=TH: the only way Y wins is if the first two flips are both H.
          </span>
        }
        solution={
          <span>
            <div className="mb-2"><strong>Setup:</strong> 4 possible patterns of length 2: HH, HT, TH, TT.</div>
            <div className="mb-3"><strong>Example: Y=HH vs Z=TH</strong></div>
            <div className="text-sm mb-2">
              States: Start, last flip = H, last flip = T. Absorbing: HH (Y wins) and TH (Z wins).
            </div>
            <div className="text-sm mb-2">
              &bull; From Start: flip H &rarr; state H, flip T &rarr; state T<br />
              &bull; From state H: flip H &rarr; <strong>HH, Y wins</strong>; flip T &rarr; state T<br />
              &bull; From state T: flip H &rarr; <strong>TH, Z wins</strong>; flip T &rarr; state T
            </div>
            <div className="text-sm mb-2">
              Let <InlineMath math="p_s" /> = P(Z wins | state <InlineMath math="s" />):
            </div>
            <div className="math-block text-sm">
              <BlockMath math={String.raw`p_H = \tfrac{1}{2}(0) + \tfrac{1}{2}p_T = \tfrac{1}{2}p_T`} />
              <BlockMath math={String.raw`p_T = \tfrac{1}{2}(1) + \tfrac{1}{2}p_T \implies p_T = 1`} />
            </div>
            <div className="text-sm mb-2">
              So <InlineMath math="p_T = 1" /> (from T, Z always wins &mdash; flip H gives TH immediately, flip T stays in T).
              And <InlineMath math="p_H = 1/2" />.
            </div>
            <div className="text-sm mb-3">
              <InlineMath math="P(\text{Z wins}) = \frac{1}{2}p_H + \frac{1}{2}p_T = \frac{1}{2}\cdot\frac{1}{2} + \frac{1}{2}\cdot 1 = \frac{3}{4}" />
            </div>
            <div className="mb-2"><strong>Full matchup table</strong> (P(row beats column)):</div>
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse mx-auto">
                <thead>
                  <tr>
                    <th className="border border-slate-700 px-3 py-1 bg-slate-800/50"></th>
                    <th className="border border-slate-700 px-3 py-1 bg-slate-800/50">HH</th>
                    <th className="border border-slate-700 px-3 py-1 bg-slate-800/50">HT</th>
                    <th className="border border-slate-700 px-3 py-1 bg-slate-800/50">TH</th>
                    <th className="border border-slate-700 px-3 py-1 bg-slate-800/50">TT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-700 px-3 py-1 font-bold bg-slate-800/50">HH</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">&mdash;</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                    <td className="border border-slate-700 px-3 py-1 text-center text-red-400">1/4</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-700 px-3 py-1 font-bold bg-slate-800/50">HT</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">&mdash;</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                    <td className="border border-slate-700 px-3 py-1 text-center text-red-400">1/4</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-700 px-3 py-1 font-bold bg-slate-800/50">TH</td>
                    <td className="border border-slate-700 px-3 py-1 text-center text-emerald-400">3/4</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">&mdash;</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-700 px-3 py-1 font-bold bg-slate-800/50">TT</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                    <td className="border border-slate-700 px-3 py-1 text-center text-emerald-400">3/4</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">1/2</td>
                    <td className="border border-slate-700 px-3 py-1 text-center">&mdash;</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm">
              <strong>Conclusion:</strong> Non-transitivity occurs! TH beats HH with prob 3/4, and TT beats HT with prob 3/4.
              The pattern is: the second player can always find a counter when the first player picks a "double" (HH or TT)
              by choosing the pattern that starts with the opposite. However, the advantage is weaker (3/4) than with length-3
              patterns (where advantages up to 7/8 are possible).
            </div>
          </span>
        }
      >
        <p>
          Consider the Penney-ante game but with patterns of length 2 instead of 3. Does the same
          non-transitive dominance phenomenon occur? Compute P(row beats column) for all 4&times;4 matchups.
        </p>
        <div className="mt-3 bg-slate-800/40 rounded-xl border border-slate-700 p-3">
          <h5 className="text-xs font-semibold text-slate-500 mb-2 text-center">Example: Y=HH vs Z=TH</h5>
          <svg viewBox="0 0 400 160" className="w-full max-w-sm mx-auto" style={{ height: 130 }}>
            <defs>
              <marker id="ex35-arr" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
              <marker id="ex35-arr-r" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
              </marker>
              <marker id="ex35-arr-g" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
              </marker>
            </defs>
            {/* S -> H */}
            <line x1="68" y1="75" x2="132" y2="75" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex35-arr)" />
            <text x="100" y="67" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(H)</text>
            {/* S -> T */}
            <line x1="55" y1="98" x2="145" y2="138" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex35-arr)" />
            <text x="88" y="128" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(T)</text>
            {/* H -> HH (Y wins) */}
            <line x1="188" y1="70" x2="292" y2="50" stroke="#f87171" strokeWidth="1.5" markerEnd="url(#ex35-arr-r)" />
            <text x="240" y="52" textAnchor="middle" fill="#fca5a5" fontSize="10">½(H)</text>
            {/* H -> T */}
            <line x1="165" y1="98" x2="165" y2="125" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#ex35-arr)" />
            <text x="180" y="115" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(T)</text>
            {/* T -> TH (Z wins) */}
            <line x1="188" y1="140" x2="292" y2="140" stroke="#34d399" strokeWidth="1.5" markerEnd="url(#ex35-arr-g)" />
            <text x="240" y="133" textAnchor="middle" fill="#6ee7b7" fontSize="10">½(H)</text>
            {/* T self-loop */}
            <path d="M 148,152 A 16,16 0 1,0 148,155" fill="none" stroke="#64748b" strokeWidth="1.5" />
            <text x="120" y="152" textAnchor="middle" fill="#a5b4fc" fontSize="10">½(T)</text>
            {/* Nodes */}
            <circle cx="50" cy="80" r="20" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="50" y="84" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">S</text>
            <circle cx="165" cy="75" r="20" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="165" y="79" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">H</text>
            <circle cx="165" cy="140" r="20" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
            <text x="165" y="144" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">T</text>
            <circle cx="320" cy="45" r="24" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
            <text x="320" y="43" textAnchor="middle" fill="#fecaca" fontSize="11" fontWeight="bold">HH</text>
            <text x="320" y="55" textAnchor="middle" fill="#f87171" fontSize="8">Y wins</text>
            <circle cx="320" cy="140" r="24" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <text x="320" y="138" textAnchor="middle" fill="#d1fae5" fontSize="11" fontWeight="bold">TH</text>
            <text x="320" y="150" textAnchor="middle" fill="#34d399" fontSize="8">Z wins</text>
          </svg>
        </div>
      </ExerciseItem>
    </motion.div>
  )
}


// ═══════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════

export default function FirstStep() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            3.5 First Step Analysis
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          A powerful technique for computing absorption probabilities and expected hitting times in Markov chains.
          Condition on the very first transition to derive a system of linear equations.
        </p>
      </motion.div>

      {/* Motivation */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 p-5 rounded-xl border border-purple-500/30 bg-purple-500/5">
        <p className="text-slate-300 leading-relaxed">
          Now that we have transition matrices as our main tool, a natural question arises:
          <strong className="text-purple-400"> starting from state i, how many steps on average until we first reach state j?</strong>{' '}
          This leads to <em>first step analysis</em> -- a powerful technique that sets up equations by conditioning on what happens in the very first step.
          The idea is beautifully simple: wherever you are, look one step ahead, and use the Markov property.
        </p>
      </motion.div>

      {/* Theory overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="theorem-box">
        <h3 className="text-xl font-bold text-amber-400 mb-3">First-Step Analysis — The Idea</h3>
        <p className="text-slate-300 mb-3">
          Suppose we want to compute some quantity <InlineMath math="w_i" /> (e.g., an absorption probability or
          expected hitting time) for a Markov chain starting in state <InlineMath math="i" />. The key idea is
          to <strong className="text-amber-300">condition on the first step</strong>:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`w_i = \sum_{j} P_{ij} \cdot (\text{contribution from starting at } j)`} />
        </div>

        <h4 className="text-lg font-semibold text-amber-300 mt-4 mb-2">Absorption Probabilities</h4>
        <p className="text-slate-300 mb-2">
          Let <InlineMath math="A" /> be a set of absorbing (target) states. Define <InlineMath math="p_i = P(\text{reach } A \mid X_0 = i)" />,
          the probability that the chain, starting from state <InlineMath math="i" />, will eventually be absorbed into <InlineMath math="A" />.
        </p>
        <p className="text-slate-300 mb-2">
          If <InlineMath math="i" /> is already in <InlineMath math="A" />, then <InlineMath math="p_i = 1" /> trivially.
          Otherwise, we condition on the first step: the chain moves to some state <InlineMath math="j" /> with probability <InlineMath math="P_{ij}" />,
          and from there, the remaining probability of reaching <InlineMath math="A" /> is <InlineMath math="p_j" />.
          This gives us:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`p_i = \begin{cases} 1 & i \in A \\ \sum_{j} P_{ij} \, p_j & i \notin A \end{cases}`} />
        </div>

        <h4 className="text-lg font-semibold text-amber-300 mt-4 mb-2">Expected Hitting Times</h4>
        <p className="text-slate-300 mb-2">
          Define <InlineMath math="w_i = E[T_A \mid X_0 = i]" /> where <InlineMath math="T_A = \min\{n \geq 0 : X_n \in A\}" /> is the
          first time the chain enters <InlineMath math="A" />. In words, <InlineMath math="w_i" /> is the expected number of steps
          to reach the target set <InlineMath math="A" />, starting from state <InlineMath math="i" />.
        </p>
        <p className="text-slate-300 mb-2">
          If <InlineMath math="i \in A" />, we are already there, so <InlineMath math="w_i = 0" />.
          Otherwise, the chain takes one step (costing 1 unit of time) and lands in state <InlineMath math="j" /> with probability <InlineMath math="P_{ij}" />,
          after which the expected remaining time is <InlineMath math="w_j" />:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`w_i = \begin{cases} 0 & i \in A \\ 1 + \sum_{j} P_{ij} \, w_j & i \notin A \end{cases}`} />
        </div>
        <p className="text-slate-300 mt-3 text-sm">
          In both cases, the first-step conditioning converts a probabilistic question into a <strong className="text-amber-300">system of linear equations</strong>.
          Once we identify the boundary conditions (absorbing states) and write down one equation per transient state, we can solve for all unknowns.
        </p>
      </motion.div>

      {/* Interactive examples */}
      <HHSimulator />

      {/* Things to Try: HH */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 className="text-teal-400 font-bold mb-3">Things to Try</h4>
        <ul className="text-slate-300 space-y-2 list-disc list-inside">
          <li>Run 50 trials. Is the average number of flips close to 6 (the theoretical answer)?</li>
          <li>Compare HH vs HT. Which pattern takes longer to appear on average? Why?</li>
        </ul>
      </motion.div>

      <PenneyAnteGame />

      {/* Things to Try: Penney */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 className="text-teal-400 font-bold mb-3">Things to Try</h4>
        <ul className="text-slate-300 space-y-2 list-disc list-inside">
          <li>Pit THH against HHH. Run 100 games. Who wins more often? (It should not be 50-50!)</li>
          <li>Can you find a pattern that beats THH? This is the non-transitive nature of Penney's game.</li>
        </ul>
      </motion.div>

      <MickeyMaze />

      {/* Things to Try: Mickey Maze */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 className="text-teal-400 font-bold mb-3">Things to Try</h4>
        <ul className="text-slate-300 space-y-2 list-disc list-inside">
          <li>Run the maze simulation from each starting state. Which state has the longest expected absorption time?</li>
          <li>Compare the simulated average to the exact answer from the first-step equations.</li>
        </ul>
      </motion.div>

      <FecundityModel />
      <EquationBuilder />
      <Exercises />
    </div>
  )
}
