import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ──────────────────────────────────────────────
   Section 3.1 — Two Motivating Examples
   1. Coin Tossing  (Example 3.1)
   2. Mickey in Maze (Example 3.2)
   ────────────────────────────────────────────── */

// ─── Coin Tossing ─────────────────────────────

function CoinTossing() {
  const [p, setP] = useState(0.5)
  const [flips, setFlips] = useState([])        // array of 0|1
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(200)        // ms per flip
  const timerRef = useRef(null)
  const chartRef = useRef(null)

  const headCount = flips.reduce((s, v) => s + v, 0)

  // cumulative head counts for the chart
  const cumHeads = useRef([])
  useEffect(() => {
    const arr = [0]
    let s = 0
    for (const f of flips) {
      s += f
      arr.push(s)
    }
    cumHeads.current = arr
  }, [flips])

  const step = useCallback(() => {
    setFlips(prev => [...prev, Math.random() < p ? 1 : 0])
  }, [p])

  // auto-play loop
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(step, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setFlips([])
  }

  // ── chart drawing ──
  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height

    ctx.clearRect(0, 0, W, H)

    const data = cumHeads.current
    const n = data.length
    if (n < 2) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Toss coins to see the chart', W / 2, H / 2)
      return
    }

    const pad = { top: 24, right: 20, bottom: 36, left: 46 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    const maxY = Math.max(data[data.length - 1], 1)
    const maxX = n - 1

    const xScale = v => pad.left + (v / maxX) * plotW
    const yScale = v => pad.top + plotH - (v / maxY) * plotH

    // axes
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH)
    ctx.stroke()

    // axis labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Step n', W / 2, H - 4)
    ctx.save()
    ctx.translate(12, pad.top + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('X_n (head count)', 0, 0)
    ctx.restore()

    // tick marks
    const xTicks = Math.min(maxX, 6)
    for (let i = 0; i <= xTicks; i++) {
      const val = Math.round((i / xTicks) * maxX)
      const x = xScale(val)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'center'
      ctx.fillText(val, x, pad.top + plotH + 16)
    }
    const yTicks = Math.min(maxY, 5)
    for (let i = 0; i <= yTicks; i++) {
      const val = Math.round((i / yTicks) * maxY)
      const y = yScale(val)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'right'
      ctx.fillText(val, pad.left - 8, y + 4)
      // grid line
      ctx.strokeStyle = '#1e293b'
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + plotW, y)
      ctx.stroke()
    }

    // E[X_n] = np reference line
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1
    for (let i = 0; i < n; i++) {
      const ex = i * p
      if (ex > maxY) break
      const x = xScale(i)
      const y = yScale(ex)
      if (i === 0) { ctx.beginPath(); ctx.moveTo(x, y) }
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // data line
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = xScale(i)
      const y = yScale(data[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // legend
    ctx.font = '11px Inter, system-ui, sans-serif'
    const lx = pad.left + 8
    const ly = pad.top + 6
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 20, ly); ctx.stroke()
    ctx.fillStyle = '#10b981'; ctx.textAlign = 'left'; ctx.fillText('X_n', lx + 24, ly + 4)
    ctx.setLineDash([6, 4]); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(lx, ly + 16); ctx.lineTo(lx + 20, ly + 16); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#6366f1'; ctx.fillText('E[X_n]=np', lx + 24, ly + 20)
  }, [flips, p])

  // show last 40 flips
  const visibleFlips = flips.slice(-40)
  const offset = Math.max(0, flips.length - 40)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="example-box"
    >
      <h3 className="text-xl font-bold text-emerald-400 mb-2">
        Example 3.1 — Coin Tossing
      </h3>

      <p className="text-slate-300 mb-4">
        Toss a coin repeatedly. Each toss lands Heads with probability{' '}
        <InlineMath math="p" /> and Tails with probability{' '}
        <InlineMath math="1-p" />.
        Let <InlineMath math="X_n" /> count the total number of heads after{' '}
        <InlineMath math="n" /> tosses.
      </p>

      <div className="math-block">
        <BlockMath math={String.raw`\xi_i = \begin{cases} 1 & \text{(heads, prob } p\text{)} \\ 0 & \text{(tails, prob } 1-p\text{)} \end{cases}`} />
        <BlockMath math={String.raw`X_n = \sum_{i=1}^{n} \xi_i`} />
        <p className="text-slate-400 text-sm mt-3 mb-1">Markov property — the next state depends only on the current state:</p>
        <BlockMath math={String.raw`P(X_{n+1}=j \mid X_n=i) = \begin{cases} p & \text{if } j = i+1 \\ 1-p & \text{if } j = i \\ 0 & \text{otherwise} \end{cases}`} />
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-20">p = {p.toFixed(2)}</span>
          <input
            type="range" min="0.01" max="0.99" step="0.01"
            value={p}
            onChange={e => setP(+e.target.value)}
            className="w-36 accent-emerald-500"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input
            type="range" min="30" max="500" step="10"
            value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className="w-28 accent-emerald-500"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => setRunning(r => !r)}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running}>
          Step
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>
          Reset
        </button>
      </div>

      {/* stats */}
      <div className="mt-5 flex flex-wrap gap-6 text-sm">
        <motion.div
          key={flips.length}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400">Tosses:</span>{' '}
          <span className="text-white font-semibold">{flips.length}</span>
        </motion.div>
        <motion.div
          key={`h${headCount}`}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400">Heads (<InlineMath math="X_n" />):</span>{' '}
          <span className="text-emerald-400 font-semibold">{headCount}</span>
        </motion.div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Proportion:</span>{' '}
          <span className="text-indigo-400 font-semibold">
            {flips.length > 0 ? (headCount / flips.length).toFixed(4) : '—'}
          </span>
        </div>
      </div>

      {/* flip sequence */}
      {flips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-[3px] font-mono text-xs select-none">
          {visibleFlips.map((f, i) => (
            <motion.span
              key={offset + i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-block w-6 h-6 leading-6 text-center rounded ${
                f === 1
                  ? 'bg-emerald-600/40 text-emerald-300'
                  : 'bg-red-600/30 text-red-300'
              }`}
            >
              {f === 1 ? 'H' : 'T'}
            </motion.span>
          ))}
          {flips.length > 40 && (
            <span className="text-slate-500 self-center ml-1">({flips.length - 40} earlier hidden)</span>
          )}
        </div>
      )}

      {/* chart */}
      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas
          ref={chartRef}
          className="w-full"
          style={{ height: 220 }}
        />
      </div>
    </motion.div>
  )
}

// ─── Mickey in Maze ──────────────────────────

/*
  3x3 grid numbered:
    0  1  2
    3  4  5
    6  7  8

  Walls encoded as missing edges:
    present edges (bidirectional):
      0-1, 0-3
      1-2, 1-4
      2-5
      3-4, 3-6
      4-5, 4-7         (4 also connects to 1 and 3 above)
      5-8
      6-7
      7-8
*/

const MAZE_ADJ = [
  [1, 3],           // 0
  [0, 2, 4],        // 1
  [1, 5],           // 2
  [0, 4, 6],        // 3
  [1, 3, 5, 7],     // 4
  [2, 4, 8],        // 5
  [3, 7],           // 6
  [4, 6, 8],        // 7
  [5, 7],           // 8
]

function MickeyMaze() {
  const [pos, setPos] = useState(4)
  const [path, setPath] = useState([4])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(400)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)

  const step = useCallback(() => {
    setPos(prev => {
      const neighbors = MAZE_ADJ[prev]
      const next = neighbors[Math.floor(Math.random() * neighbors.length)]
      setPath(p => [...p, next])
      return next
    })
  }, [])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(step, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setPos(4)
    setPath([4])
  }

  // ── maze canvas ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height

    ctx.clearRect(0, 0, W, H)

    // maze geometry
    const size = Math.min(W, H) - 40
    const cellSize = size / 3
    const ox = (W - size) / 2
    const oy = (H - size) / 2

    const cellCenter = (idx) => {
      const r = Math.floor(idx / 3)
      const c = idx % 3
      return {
        x: ox + c * cellSize + cellSize / 2,
        y: oy + r * cellSize + cellSize / 2,
      }
    }

    // build edge set for quick lookup
    const edgeSet = new Set()
    MAZE_ADJ.forEach((neighbors, i) => {
      neighbors.forEach(j => {
        edgeSet.add(`${Math.min(i, j)}-${Math.max(i, j)}`)
      })
    })

    const hasEdge = (a, b) => edgeSet.has(`${Math.min(a, b)}-${Math.max(a, b)}`)

    // draw outer border
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 3
    ctx.strokeRect(ox, oy, size, size)

    // draw internal walls
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    // For each internal edge of the grid, draw a wall if no passage
    // Horizontal walls: between row r and r+1 at column c
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const top = r * 3 + c
        const bottom = (r + 1) * 3 + c
        if (!hasEdge(top, bottom)) {
          const x1 = ox + c * cellSize
          const x2 = ox + (c + 1) * cellSize
          const y = oy + (r + 1) * cellSize
          ctx.beginPath()
          ctx.moveTo(x1, y)
          ctx.lineTo(x2, y)
          ctx.stroke()
        }
      }
    }
    // Vertical walls: between column c and c+1 at row r
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const left = r * 3 + c
        const right = r * 3 + c + 1
        if (!hasEdge(left, right)) {
          const x = ox + (c + 1) * cellSize
          const y1 = oy + r * cellSize
          const y2 = oy + (r + 1) * cellSize
          ctx.beginPath()
          ctx.moveTo(x, y1)
          ctx.lineTo(x, y2)
          ctx.stroke()
        }
      }
    }

    // draw openings (passages) with a gap indicator
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const top = r * 3 + c
        const bottom = (r + 1) * 3 + c
        if (hasEdge(top, bottom)) {
          const xm = ox + c * cellSize + cellSize / 2
          const y = oy + (r + 1) * cellSize
          ctx.beginPath()
          ctx.moveTo(xm - cellSize * 0.3, y)
          ctx.lineTo(xm + cellSize * 0.3, y)
          ctx.stroke()
        }
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const left = r * 3 + c
        const right = r * 3 + c + 1
        if (hasEdge(left, right)) {
          const x = ox + (c + 1) * cellSize
          const ym = oy + r * cellSize + cellSize / 2
          ctx.beginPath()
          ctx.moveTo(x, ym - cellSize * 0.3)
          ctx.lineTo(x, ym + cellSize * 0.3)
          ctx.stroke()
        }
      }
    }
    ctx.setLineDash([])

    // cell labels
    ctx.fillStyle = '#64748b'
    ctx.font = '13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (let i = 0; i < 9; i++) {
      const { x, y } = cellCenter(i)
      ctx.fillText(i, x - cellSize / 2 + 6, y - cellSize / 2 + 6)
    }

    // draw trail (last 8 positions)
    const trail = path.slice(-8)
    if (trail.length > 1) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      for (let i = 0; i < trail.length; i++) {
        const { x, y } = cellCenter(trail[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // draw Mickey (filled circle)
    const { x: mx, y: my } = cellCenter(pos)
    ctx.beginPath()
    ctx.arc(mx, my, cellSize * 0.22, 0, Math.PI * 2)
    ctx.fillStyle = '#f59e0b'
    ctx.fill()
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.stroke()

    // Mickey ears
    const earR = cellSize * 0.1
    const earDist = cellSize * 0.2
    ctx.beginPath()
    ctx.arc(mx - earDist, my - earDist, earR, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(mx + earDist, my - earDist, earR, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // eyes
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.arc(mx - cellSize * 0.07, my - cellSize * 0.04, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(mx + cellSize * 0.07, my - cellSize * 0.04, 2.5, 0, Math.PI * 2)
    ctx.fill()

    // smile
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(mx, my + cellSize * 0.01, cellSize * 0.08, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  }, [pos, path])

  // visit frequency
  const visitCounts = new Array(9).fill(0)
  path.forEach(c => visitCounts[c]++)
  const totalSteps = path.length

  // path display (last 30)
  const visiblePath = path.slice(-30)
  const pathOffset = Math.max(0, path.length - 30)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="example-box"
    >
      <h3 className="text-xl font-bold text-emerald-400 mb-2">
        Example 3.2 — Mickey in a Maze
      </h3>

      <p className="text-slate-300 mb-4">
        Mickey is trapped in a 3{'\u00D7'}3 maze. At each step he moves to a
        neighboring room (one sharing an open wall) with equal probability.
        The state <InlineMath math="X_n" /> records which room Mickey is in
        after <InlineMath math="n" /> steps.
      </p>

      <div className="math-block">
        <p className="text-slate-300 text-sm mb-2">
          Since Mickey chooses uniformly among accessible neighbors, the transition probabilities are:
        </p>
        <BlockMath math={String.raw`P(X_{n+1} = j \mid X_n = i) = \begin{cases} \frac{1}{d(i)} & \text{if rooms } i \text{ and } j \text{ are adjacent} \\ 0 & \text{otherwise} \end{cases}`} />
        <p className="text-slate-400 text-sm mt-2">
          where <InlineMath math="d(i)" /> is the number of rooms adjacent to room <InlineMath math="i" />.
        </p>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input
            type="range" min="80" max="1000" step="20"
            value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className="w-28 accent-amber-500"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => setRunning(r => !r)}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running}>
          Step
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>
          Reset
        </button>
      </div>

      {/* stats */}
      <div className="mt-5 flex flex-wrap gap-6 text-sm">
        <motion.div
          key={path.length}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400">Steps:</span>{' '}
          <span className="text-white font-semibold">{path.length - 1}</span>
        </motion.div>
        <motion.div
          key={`pos${pos}`}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400">Current room:</span>{' '}
          <span className="text-amber-400 font-semibold">{pos}</span>
        </motion.div>
      </div>

      {/* maze canvas */}
      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden flex justify-center">
        <canvas
          ref={canvasRef}
          className="w-full max-w-md"
          style={{ height: 340 }}
        />
      </div>

      {/* visit frequency */}
      <div className="mt-4">
        <p className="text-sm text-slate-400 mb-2">Visit frequency:</p>
        <div className="grid grid-cols-3 gap-2 max-w-xs">
          {visitCounts.map((cnt, i) => {
            const pct = totalSteps > 0 ? cnt / totalSteps : 0
            return (
              <div
                key={i}
                className="relative bg-slate-800/60 rounded-lg px-3 py-2 text-center text-xs overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-amber-500/20 transition-all duration-300"
                  style={{ width: `${pct * 100}%` }}
                />
                <span className="relative text-slate-300">
                  Room {i}: <span className="font-semibold text-white">{cnt}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* path history */}
      {path.length > 1 && (
        <div className="mt-4">
          <p className="text-sm text-slate-400 mb-2">Path history (recent):</p>
          <div className="flex flex-wrap gap-[3px] font-mono text-xs select-none">
            {visiblePath.map((cell, i) => (
              <motion.span
                key={pathOffset + i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`inline-block w-6 h-6 leading-6 text-center rounded ${
                  cell === pos && i === visiblePath.length - 1
                    ? 'bg-amber-600/50 text-amber-200'
                    : 'bg-slate-700/60 text-slate-300'
                }`}
              >
                {cell}
              </motion.span>
            ))}
            {path.length > 30 && (
              <span className="text-slate-500 self-center ml-1">({path.length - 30} earlier hidden)</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────

export default function Examples() {
  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            3.1 Two Motivating Examples
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Before formal definitions, we explore two concrete scenarios that
          naturally give rise to Markov chains: counting coin flips and a
          random walk through a maze.
        </p>
      </motion.div>

      <CoinTossing />
      <MickeyMaze />

      {/* summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="section-card"
      >
        <h3 className="text-lg font-bold text-slate-200 mb-3">Key Takeaway</h3>
        <p className="text-slate-300 leading-relaxed">
          In both examples the future state depends on the past <em>only</em> through
          the present state. This <strong>memoryless property</strong> — formally, the{' '}
          <em>Markov property</em> — is what makes a stochastic process a{' '}
          <strong>Markov chain</strong>. In Section 3.2 we will give precise definitions.
        </p>
      </motion.div>
    </div>
  )
}
