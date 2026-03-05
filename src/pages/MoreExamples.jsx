import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ──────────────────────────────────────────────
   Section 3.4 — More Examples
   1. Inventory Model  (Example 3.4)
   2. Ehrenfest Model  (Example 3.5)
   ────────────────────────────────────────────── */

// ─── Inventory Model ────────────────────────────

const SALES_DIST = [
  { demand: 0, prob: 0.5 },
  { demand: 1, prob: 0.4 },
  { demand: 2, prob: 0.1 },
]

function sampleSales() {
  const r = Math.random()
  if (r < 0.5) return 0
  if (r < 0.9) return 1
  return 2
}

function nextInventory(xn, sales) {
  // If stock <= 0 at end of day, restock to 2 overnight
  // X_{n+1} = X_n - xi if X_n in {1,2}; X_{n+1} = 2 - xi if X_n in {-1,0}
  if (xn >= 1) {
    return xn - sales
  } else {
    return 2 - sales
  }
}

const INV_TRANSITION = [
  // states: -1, 0, 1, 2  (row = from, col = to)
  [0, 0.1, 0.4, 0.5],   // from -1 (restock to 2, then sell)
  [0, 0.1, 0.4, 0.5],   // from  0 (restock to 2, then sell)
  [0.1, 0.4, 0.5, 0],   // from  1
  [0, 0.1, 0.4, 0.5],   // from  2
]

const INV_STATES = [-1, 0, 1, 2]

function InventoryModel() {
  const [history, setHistory] = useState([{ day: 0, xn: 2, sales: null, restocked: false }])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(600)
  const timerRef = useRef(null)
  const shelfCanvasRef = useRef(null)
  const chartCanvasRef = useRef(null)

  const current = history[history.length - 1]

  const step = useCallback(() => {
    setHistory(prev => {
      const last = prev[prev.length - 1]
      const sales = sampleSales()
      const restocked = last.xn <= 0
      const xnNew = nextInventory(last.xn, sales)
      return [...prev, {
        day: last.day + 1,
        xn: xnNew,
        sales,
        restocked,
      }]
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
    setHistory([{ day: 0, xn: 2, sales: null, restocked: false }])
  }

  // ── Shelf canvas ──
  useEffect(() => {
    const canvas = shelfCanvasRef.current
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

    const xn = current.xn

    // Background: store shelf
    const shelfY = H * 0.65
    const shelfW = W * 0.7
    const shelfX = (W - shelfW) / 2

    // Shelf surface
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(shelfX, shelfY, shelfW, 8)

    // Shelf legs
    ctx.fillStyle = '#334155'
    ctx.fillRect(shelfX + 10, shelfY + 8, 8, 30)
    ctx.fillRect(shelfX + shelfW - 18, shelfY + 8, 8, 30)

    // Label
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('STORE SHELF', W / 2, shelfY + 50)

    // Draw TVs on shelf
    const tvW = 60
    const tvH = 45
    const tvGap = 20
    const totalTvW = Math.max(xn, 0) * tvW + Math.max(Math.max(xn, 0) - 1, 0) * tvGap
    const tvStartX = (W - totalTvW) / 2

    if (xn > 0) {
      for (let i = 0; i < xn; i++) {
        const tx = tvStartX + i * (tvW + tvGap)
        const ty = shelfY - tvH - 4

        // TV body
        ctx.fillStyle = '#334155'
        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(tx, ty, tvW, tvH, 4)
        ctx.fill()
        ctx.stroke()

        // Screen
        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.roundRect(tx + 4, ty + 4, tvW - 8, tvH - 12, 2)
        ctx.fill()

        // Screen glow
        const grad = ctx.createLinearGradient(tx + 4, ty + 4, tx + tvW - 4, ty + tvH - 8)
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.15)')
        grad.addColorStop(1, 'rgba(16, 185, 129, 0.1)')
        ctx.fillStyle = grad
        ctx.fillRect(tx + 4, ty + 4, tvW - 8, tvH - 12)

        // Stand
        ctx.fillStyle = '#475569'
        ctx.fillRect(tx + tvW / 2 - 8, ty + tvH, 16, 4)
      }
    } else if (xn === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Empty shelf', W / 2, shelfY - 20)
    } else {
      // Backorder: xn = -1
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('BACKORDER: 1 TV owed', W / 2, shelfY - 30)

      // Warning icon
      ctx.fillStyle = '#fbbf24'
      ctx.font = '24px serif'
      ctx.fillText('\u26A0', W / 2, shelfY - 50)
    }

    // Day info at top
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 16px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Day ${current.day}`, 16, 28)

    ctx.font = '13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#94a3b8'
    const stateLabel = xn >= 0 ? `${xn} TV${xn !== 1 ? 's' : ''} in stock` : `Backorder: ${Math.abs(xn)}`
    ctx.fillText(stateLabel, 16, 48)

    if (current.sales !== null) {
      ctx.fillText(`Sales today: ${current.sales}`, 16, 66)
    }

    // Restock indicator
    if (current.restocked) {
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('RESTOCKED to 2', W - 16, 28)
    }

    // State indicator badge
    const badgeX = W - 60
    const badgeY = 45
    ctx.beginPath()
    ctx.arc(badgeX, badgeY, 22, 0, Math.PI * 2)
    const badgeColor = xn === 2 ? '#10b981' : xn === 1 ? '#eab308' : xn === 0 ? '#f97316' : '#ef4444'
    ctx.fillStyle = badgeColor + '30'
    ctx.fill()
    ctx.strokeStyle = badgeColor
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = badgeColor
    ctx.font = 'bold 18px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(xn), badgeX, badgeY)
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = '#64748b'
    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.fillText('X_n', badgeX, badgeY + 34)

  }, [current])

  // ── Chart canvas ──
  useEffect(() => {
    const canvas = chartCanvasRef.current
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

    const data = history.map(h => h.xn)
    const n = data.length

    if (n < 2) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Step through days to see the chart', W / 2, H / 2)
      return
    }

    const pad = { top: 24, right: 20, bottom: 36, left: 46 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    const minY = -1
    const maxY = 2
    const rangeY = maxY - minY
    const maxX = n - 1

    const xScale = v => pad.left + (v / Math.max(maxX, 1)) * plotW
    const yScale = v => pad.top + plotH - ((v - minY) / rangeY) * plotH

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
    ctx.fillText('Day n', W / 2, H - 4)
    ctx.save()
    ctx.translate(12, pad.top + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('X_n (inventory)', 0, 0)
    ctx.restore()

    // x ticks
    const xTicks = Math.min(maxX, 8)
    for (let i = 0; i <= xTicks; i++) {
      const val = Math.round((i / xTicks) * maxX)
      const x = xScale(val)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'center'
      ctx.fillText(val, x, pad.top + plotH + 16)
    }

    // y ticks and gridlines
    for (let v = minY; v <= maxY; v++) {
      const y = yScale(v)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'right'
      ctx.fillText(v, pad.left - 8, y + 4)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + plotW, y)
      ctx.stroke()
    }

    // zero line emphasis
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad.left, yScale(0))
    ctx.lineTo(pad.left + plotW, yScale(0))
    ctx.stroke()
    ctx.setLineDash([])

    // data line (step chart)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = xScale(i)
      const y = yScale(data[i])
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        // Step function: horizontal then vertical
        ctx.lineTo(x, yScale(data[i - 1]))
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // dots at each point
    for (let i = 0; i < n; i++) {
      const x = xScale(i)
      const y = yScale(data[i])
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = data[i] < 0 ? '#ef4444' : '#10b981'
      ctx.fill()
    }

    // restock indicators
    for (let i = 1; i < history.length; i++) {
      if (history[i].restocked) {
        const x = xScale(i)
        ctx.fillStyle = '#6366f1'
        ctx.font = '10px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('R', x, pad.top - 4)
      }
    }

    // legend
    ctx.font = '11px Inter, system-ui, sans-serif'
    const lx = pad.left + 8
    const ly = pad.top + 6
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx + 20, ly)
    ctx.stroke()
    ctx.fillStyle = '#10b981'
    ctx.textAlign = 'left'
    ctx.fillText('X_n', lx + 24, ly + 4)
    ctx.fillStyle = '#6366f1'
    ctx.fillText('R = restock', lx, ly + 16)
  }, [history])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="example-box"
    >
      <h3 className="text-xl font-bold text-emerald-400 mb-2">
        Example 3.4 — Inventory Model
      </h3>

      <p className="text-slate-300 mb-4">
        A store stocks TVs. Daily demand <InlineMath math={String.raw`\xi_n`} /> is
        i.i.d. with <InlineMath math={String.raw`P(\xi=0)=0.5`} />,{' '}
        <InlineMath math={String.raw`P(\xi=1)=0.4`} />,{' '}
        <InlineMath math={String.raw`P(\xi=2)=0.1`} />.
        Let <InlineMath math="X_n" /> be the inventory at end of day{' '}
        <InlineMath math="n" />. Starting with <InlineMath math="X_0=2" />.
      </p>

      <div className="math-block">
        <p className="text-slate-300 text-sm mb-2">
          <strong>Restock policy:</strong> if <InlineMath math={String.raw`X_n \le 0`} /> at
          end of day, restock to 2 overnight (filling any backorder).
        </p>
        <BlockMath math={String.raw`X_{n+1} = \begin{cases} X_n - \xi_{n+1} & \text{if } X_n \in \{1, 2\} \\ 2 - \xi_{n+1} & \text{if } X_n \in \{-1, 0\} \end{cases}`} />
        <p className="text-slate-400 text-sm mt-3 mb-2">
          State space <InlineMath math={String.raw`S = \{-1, 0, 1, 2\}`} />. Transition matrix:
        </p>
        <BlockMath math={String.raw`P = \begin{pmatrix} 0 & 0.1 & 0.4 & 0.5 \\ 0 & 0.1 & 0.4 & 0.5 \\ 0.1 & 0.4 & 0.5 & 0 \\ 0 & 0.1 & 0.4 & 0.5 \end{pmatrix}`} />
        <p className="text-slate-500 text-xs mt-1">
          Rows/columns indexed by states <InlineMath math="-1, 0, 1, 2" />.
        </p>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input
            type="range" min="100" max="1200" step="50"
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
      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <motion.div
          key={current.day}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400">Day:</span>{' '}
          <span className="text-white font-semibold">{current.day}</span>
        </motion.div>
        <motion.div
          key={`xn${current.day}`}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400"><InlineMath math="X_n" />:</span>{' '}
          <span className={`font-semibold ${current.xn < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {current.xn}
          </span>
        </motion.div>
        {current.sales !== null && (
          <motion.div
            key={`s${current.day}`}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="bg-slate-800/60 rounded-xl px-4 py-2"
          >
            <span className="text-slate-400">Sales:</span>{' '}
            <span className="text-amber-400 font-semibold">{current.sales}</span>
          </motion.div>
        )}
        {current.restocked && (
          <motion.div
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-indigo-900/40 border border-indigo-600/40 rounded-xl px-4 py-2"
          >
            <span className="text-indigo-300 font-semibold">Restocked</span>
          </motion.div>
        )}
      </div>

      {/* Demand distribution table */}
      <div className="mt-4">
        <p className="text-sm text-slate-400 mb-2">Demand distribution:</p>
        <div className="flex gap-2">
          {SALES_DIST.map(({ demand, prob }) => (
            <div key={demand} className="bg-slate-800/60 rounded-lg px-3 py-2 text-center text-xs">
              <span className="text-slate-400">
                <InlineMath math={String.raw`\xi=${demand}`} />
              </span>
              <br />
              <span className="text-white font-semibold">{prob}</span>
            </div>
          ))}
        </div>
      </div>

      {/* shelf canvas */}
      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas
          ref={shelfCanvasRef}
          className="w-full"
          style={{ height: 180 }}
        />
      </div>

      {/* chart */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas
          ref={chartCanvasRef}
          className="w-full"
          style={{ height: 220 }}
        />
      </div>

      {/* Transition matrix heatmap */}
      <div className="mt-4">
        <p className="text-sm text-slate-400 mb-2">Transition matrix heatmap:</p>
        <div className="overflow-x-auto">
          <table className="text-xs text-center border-collapse mx-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-slate-500"></th>
                {INV_STATES.map(s => (
                  <th key={s} className="px-3 py-1 text-slate-400 font-medium">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INV_TRANSITION.map((row, ri) => (
                <tr key={ri}>
                  <td className="px-2 py-1 text-slate-400 font-medium">{INV_STATES[ri]}</td>
                  {row.map((val, ci) => {
                    const intensity = val
                    return (
                      <td
                        key={ci}
                        className="px-3 py-1 rounded"
                        style={{
                          backgroundColor: val > 0
                            ? `rgba(16, 185, 129, ${intensity * 0.6})`
                            : 'transparent',
                          color: val > 0 ? '#e2e8f0' : '#475569',
                        }}
                      >
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}


// ─── Ehrenfest Model ────────────────────────────

function EhrenfestModel() {
  const [N, setN] = useState(3)               // half-particles: total = 2N
  const totalParticles = 2 * N
  const [inA, setInA] = useState(N)            // Y_n: particles in chamber A
  const [history, setHistory] = useState([N])   // Y_n over time
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(500)
  const [lastMoved, setLastMoved] = useState(null) // index of last moved particle
  const timerRef = useRef(null)
  const chamberCanvasRef = useRef(null)
  const chartCanvasRef = useRef(null)

  // Particle positions for gentle bouncing (fixed random seeds per particle)
  const particlePositions = useRef([])

  // Initialize particle positions when N changes
  useEffect(() => {
    const positions = []
    for (let i = 0; i < totalParticles; i++) {
      positions.push({
        relX: 0.15 + Math.random() * 0.7,
        relY: 0.15 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        hue: Math.floor(Math.random() * 360),
      })
    }
    particlePositions.current = positions
  }, [totalParticles])

  const step = useCallback(() => {
    // Pick a random particle (uniform over all 2N)
    const chosen = Math.floor(Math.random() * totalParticles)
    setLastMoved(chosen)

    setInA(prev => {
      // The first `inA` particles (indices 0..inA-1) are in A
      // Actually we track counts: chosen < inA means it's in A -> moves to B
      // chosen >= inA means it's in B -> moves to A
      // This gives P(A->B) = inA/(2N), P(B->A) = (2N-inA)/(2N) as required
      const newInA = chosen < prev ? prev - 1 : prev + 1
      setHistory(h => [...h, newInA])
      return newInA
    })
  }, [totalParticles])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(step, speed)
    }
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const reset = useCallback(() => {
    setRunning(false)
    clearInterval(timerRef.current)
    setInA(N)
    setHistory([N])
    setLastMoved(null)
  }, [N])

  // Reset when N changes
  useEffect(() => {
    reset()
  }, [N, reset])

  // ── Chamber canvas with bouncing particles ──
  const animFrameRef = useRef(null)

  useEffect(() => {
    const canvas = chamberCanvasRef.current
    if (!canvas) return

    let running = true

    const draw = () => {
      if (!running) return

      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      const W = rect.width
      const H = rect.height

      ctx.clearRect(0, 0, W, H)

      const margin = 20
      const chamberW = (W - margin * 3) / 2
      const chamberH = H - margin * 2 - 40
      const chamberY = margin + 30

      // Labels
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Chamber A', margin + chamberW / 2, margin + 16)
      ctx.fillText('Chamber B', margin * 2 + chamberW + chamberW / 2, margin + 16)

      // Chamber A
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2
      ctx.strokeRect(margin, chamberY, chamberW, chamberH)

      // Chamber B
      ctx.strokeRect(margin * 2 + chamberW, chamberY, chamberW, chamberH)

      // Membrane (dotted line between chambers)
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      const membraneX = margin + chamberW + margin / 2
      ctx.beginPath()
      ctx.moveTo(membraneX, chamberY)
      ctx.lineTo(membraneX, chamberY + chamberH)
      ctx.stroke()
      ctx.setLineDash([])

      // Membrane label
      ctx.fillStyle = '#6366f1'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('membrane', membraneX, chamberY + chamberH + 14)

      // Update and draw particles
      const particles = particlePositions.current
      const particleR = Math.min(12, chamberW * 0.06)

      for (let i = 0; i < Math.min(particles.length, totalParticles); i++) {
        const p = particles[i]

        // Update position (gentle bouncing)
        p.relX += p.vx * 0.01
        p.relY += p.vy * 0.01

        // Bounce off walls
        if (p.relX < 0.1 || p.relX > 0.9) p.vx *= -1
        if (p.relY < 0.1 || p.relY > 0.9) p.vy *= -1
        p.relX = Math.max(0.1, Math.min(0.9, p.relX))
        p.relY = Math.max(0.1, Math.min(0.9, p.relY))

        // Determine chamber: first inA particles in A, rest in B
        const isInA = i < inA
        const baseX = isInA ? margin : margin * 2 + chamberW
        const cx = baseX + p.relX * chamberW
        const cy = chamberY + p.relY * chamberH

        // Draw particle
        const isHighlighted = i === lastMoved
        ctx.beginPath()
        ctx.arc(cx, cy, particleR, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${isHighlighted ? 1 : 0.7})`
        ctx.fill()

        if (isHighlighted) {
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
      }

      // Counts in each chamber
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 16px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${inA}`, margin + chamberW / 2, chamberY + chamberH + 16)
      ctx.fillText(`${totalParticles - inA}`, margin * 2 + chamberW + chamberW / 2, chamberY + chamberH + 16)

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      running = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [inA, totalParticles, lastMoved])

  // ── Chart canvas ──
  useEffect(() => {
    const canvas = chartCanvasRef.current
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

    const data = history
    const n = data.length

    if (n < 2) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Step through to see the chart', W / 2, H / 2)
      return
    }

    const pad = { top: 24, right: 20, bottom: 36, left: 46 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    const minY = 0
    const maxY = totalParticles
    const rangeY = maxY - minY
    const maxX = n - 1

    const xScale = v => pad.left + (v / Math.max(maxX, 1)) * plotW
    const yScale = v => pad.top + plotH - ((v - minY) / rangeY) * plotH

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
    ctx.fillText('Y_n (particles in A)', 0, 0)
    ctx.restore()

    // x ticks
    const xTicks = Math.min(maxX, 8)
    for (let i = 0; i <= xTicks; i++) {
      const val = Math.round((i / xTicks) * maxX)
      const x = xScale(val)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'center'
      ctx.fillText(val, x, pad.top + plotH + 16)
    }

    // y ticks and gridlines
    const yTickCount = Math.min(totalParticles, 6)
    for (let i = 0; i <= yTickCount; i++) {
      const val = Math.round((i / yTickCount) * totalParticles)
      const y = yScale(val)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'right'
      ctx.fillText(val, pad.left - 8, y + 4)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + plotW, y)
      ctx.stroke()
    }

    // Equilibrium line at N
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(pad.left, yScale(N))
    ctx.lineTo(pad.left + plotW, yScale(N))
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
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx + 20, ly)
    ctx.stroke()
    ctx.fillStyle = '#10b981'
    ctx.textAlign = 'left'
    ctx.fillText('Y_n', lx + 24, ly + 4)

    ctx.setLineDash([6, 4])
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(lx, ly + 16)
    ctx.lineTo(lx + 20, ly + 16)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#6366f1'
    ctx.fillText(`Equilibrium (N=${N})`, lx + 24, ly + 20)
  }, [history, N, totalParticles])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="example-box"
    >
      <h3 className="text-xl font-bold text-emerald-400 mb-2">
        Example 3.5 — Ehrenfest Diffusion Model
      </h3>

      <p className="text-slate-300 mb-4">
        A jar is divided by a membrane into chambers A and B, containing{' '}
        <InlineMath math="2N" /> particles total. At each step, one of the{' '}
        <InlineMath math="2N" /> particles is chosen uniformly at random and moves
        to the other chamber. Let <InlineMath math="Y_n" /> be the number of
        particles in chamber A after <InlineMath math="n" /> crossings.
      </p>

      <div className="math-block">
        <p className="text-slate-300 text-sm mb-2">
          State space <InlineMath math={String.raw`S = \{0, 1, \ldots, 2N\}`} />.
          The transition probabilities are:
        </p>
        <BlockMath math={String.raw`P_{ij} = \begin{cases} \dfrac{i}{2N} & \text{if } j = i - 1 \\[6pt] \dfrac{2N - i}{2N} & \text{if } j = i + 1 \\[6pt] 0 & \text{otherwise} \end{cases}`} />
        <p className="text-slate-400 text-sm mt-3">
          The chain tends toward equilibrium at <InlineMath math={String.raw`Y_n = N`} /> (equal
          distribution). If A has many particles, it is more likely one leaves; if A has few, it is
          more likely one enters.
        </p>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-20">N = {N}</span>
          <input
            type="range" min="2" max="6" step="1"
            value={N}
            onChange={e => setN(+e.target.value)}
            className="w-28 accent-emerald-500"
          />
          <span className="text-slate-500 text-xs">({totalParticles} particles)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input
            type="range" min="80" max="1000" step="20"
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
      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <motion.div
          key={history.length}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400">Steps:</span>{' '}
          <span className="text-white font-semibold">{history.length - 1}</span>
        </motion.div>
        <motion.div
          key={`yn${inA}`}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="bg-slate-800/60 rounded-xl px-4 py-2"
        >
          <span className="text-slate-400"><InlineMath math="Y_n" /> (in A):</span>{' '}
          <span className="text-emerald-400 font-semibold">{inA}</span>
        </motion.div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">In B:</span>{' '}
          <span className="text-amber-400 font-semibold">{totalParticles - inA}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Equilibrium:</span>{' '}
          <span className="text-indigo-400 font-semibold">{N}</span>
        </div>
      </div>

      {/* chamber canvas */}
      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas
          ref={chamberCanvasRef}
          className="w-full"
          style={{ height: 260 }}
        />
      </div>

      {/* chart */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas
          ref={chartCanvasRef}
          className="w-full"
          style={{ height: 220 }}
        />
      </div>

      {/* Transition probabilities for current N */}
      <div className="mt-4">
        <p className="text-sm text-slate-400 mb-2">
          Transition probabilities for N={N} (2N={totalParticles}):
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs text-center border-collapse mx-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-slate-500">
                  <InlineMath math="i" />
                </th>
                <th className="px-3 py-1 text-slate-400">
                  <InlineMath math={String.raw`P(i \to i{-}1)`} />
                </th>
                <th className="px-3 py-1 text-slate-400">
                  <InlineMath math={String.raw`P(i \to i{+}1)`} />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalParticles + 1 }, (_, i) => (
                <tr key={i} className={i === inA ? 'bg-emerald-900/20' : ''}>
                  <td className="px-2 py-1 text-slate-300 font-medium">{i}</td>
                  <td className="px-3 py-1 text-slate-300">
                    {i > 0 ? (i / totalParticles).toFixed(3) : '---'}
                  </td>
                  <td className="px-3 py-1 text-slate-300">
                    {i < totalParticles ? ((totalParticles - i) / totalParticles).toFixed(3) : '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}


// ─── Gambler's Ruin ────────────────────────────

function GamblersRuin() {
  const [p, setP] = useState(0.5)
  const [N, setN] = useState(10)
  const [startI, setStartI] = useState(5)
  const [money, setMoney] = useState(5)
  const [trail, setTrail] = useState([5])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(80)
  const [gameOver, setGameOver] = useState(false)
  const [stats, setStats] = useState({ wins: 0, losses: 0 })
  const timerRef = useRef(null)
  const chartRef = useRef(null)

  const step = useCallback(() => {
    setMoney(prev => {
      if (prev <= 0 || prev >= N) return prev
      const next = Math.random() < p ? prev + 1 : prev - 1
      setTrail(t => [...t, next])
      if (next <= 0) {
        setGameOver(true)
        setRunning(false)
        setStats(s => ({ ...s, losses: s.losses + 1 }))
      } else if (next >= N) {
        setGameOver(true)
        setRunning(false)
        setStats(s => ({ ...s, wins: s.wins + 1 }))
      }
      return next
    })
  }, [p, N])

  useEffect(() => {
    if (running) timerRef.current = setInterval(step, speed)
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const resetGame = (i) => {
    setRunning(false)
    clearInterval(timerRef.current)
    setMoney(i)
    setTrail([i])
    setGameOver(false)
    setStats({ wins: 0, losses: 0 })
  }

  const runBatch = () => {
    let w = 0, l = 0
    for (let t = 0; t < 200; t++) {
      let m = startI, s = 0
      while (m > 0 && m < N && s < 100000) { m += Math.random() < p ? 1 : -1; s++ }
      if (m <= 0) l++; else w++
    }
    setStats(prev => ({ wins: prev.wins + w, losses: prev.losses + l }))
  }

  // Theoretical ruin probability
  const q = 1 - p
  let ruinProb
  if (Math.abs(p - 0.5) < 1e-10) {
    ruinProb = 1 - startI / N
  } else {
    const ratio = q / p
    ruinProb = (Math.pow(ratio, N) - Math.pow(ratio, startI)) / (Math.pow(ratio, N) - 1)
  }

  // Chart
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
    const data = trail, n = data.length
    if (n < 2) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Start gambling to see the random walk', W / 2, H / 2)
      return
    }
    const pad = { top: 20, right: 16, bottom: 32, left: 42 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom
    const maxX = n - 1
    const xScale = v => pad.left + (v / Math.max(maxX, 1)) * plotW
    const yScale = v => pad.top + plotH - (v / N) * plotH

    // axes
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH)
    ctx.stroke()

    // y ticks
    const yTicks = Math.min(N, 6)
    ctx.font = '11px Inter, system-ui, sans-serif'
    for (let i = 0; i <= yTicks; i++) {
      const val = Math.round((i / yTicks) * N)
      const y = yScale(val)
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'right'
      ctx.fillText(val, pad.left - 6, y + 4)
      ctx.strokeStyle = '#1e293b'
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + plotW, y)
      ctx.stroke()
    }

    // x axis label
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'center'
    ctx.fillText('Step', W / 2, H - 4)

    // absorbing barrier lines
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(pad.left, yScale(0))
    ctx.lineTo(pad.left + plotW, yScale(0))
    ctx.stroke()
    ctx.strokeStyle = '#10b981'
    ctx.beginPath()
    ctx.moveTo(pad.left, yScale(N))
    ctx.lineTo(pad.left + plotW, yScale(N))
    ctx.stroke()
    ctx.setLineDash([])

    // barrier labels
    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ef4444'
    ctx.fillText('Ruin ($0)', pad.left + plotW, yScale(0) - 4)
    ctx.fillStyle = '#10b981'
    ctx.fillText(`Goal ($${N})`, pad.left + plotW, yScale(N) + 14)

    // random walk line
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = xScale(i), y = yScale(data[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // endpoint dot
    const lx = xScale(n - 1), ly = yScale(data[n - 1])
    ctx.beginPath()
    ctx.arc(lx, ly, 4, 0, Math.PI * 2)
    ctx.fillStyle = data[n - 1] <= 0 ? '#ef4444' : data[n - 1] >= N ? '#10b981' : '#fbbf24'
    ctx.fill()
  }, [trail, N])

  const totalGames = stats.wins + stats.losses
  const empiricalRuin = totalGames > 0 ? stats.losses / totalGames : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="example-box"
    >
      <h3 className="text-xl font-bold text-amber-400 mb-2">
        Bonus — Gambler's Ruin
      </h3>

      <p className="text-slate-300 mb-4">
        A gambler starts with <InlineMath math={`\\$${startI}`} /> and repeatedly bets $1.
        Each bet is won with probability <InlineMath math="p" /> and lost with
        probability <InlineMath math="q = 1-p" />.
        The game ends upon reaching <InlineMath math={`\\$${N}`} /> (goal) or{' '}
        <InlineMath math="\$0" /> (ruin).
      </p>

      <div className="math-block">
        <BlockMath math={String.raw`X_{n+1} = \begin{cases} X_n + 1 & \text{with prob } p \\ X_n - 1 & \text{with prob } 1-p \end{cases}`} />
        <p className="text-slate-400 text-sm mt-2">
          States 0 and <InlineMath math={`${N}`} /> are <strong className="text-slate-200">absorbing</strong>: once reached, the chain stays there forever.
        </p>
        <p className="text-slate-300 text-sm mt-3">The probability of ruin starting from <InlineMath math="i" />:</p>
        <BlockMath math={String.raw`P(\text{ruin} \mid X_0 = i) = \begin{cases} \dfrac{(q/p)^N - (q/p)^i}{(q/p)^N - 1} & \text{if } p \ne \tfrac{1}{2} \\[8pt] 1 - \dfrac{i}{N} & \text{if } p = \tfrac{1}{2} \end{cases}`} />
      </div>

      {/* Controls */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="w-20">p = {p.toFixed(2)}</span>
            <input type="range" min="0.1" max="0.9" step="0.01" value={p}
              onChange={e => { setP(+e.target.value); setStats({ wins: 0, losses: 0 }) }}
              className="w-32 accent-amber-500" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="w-20">Goal N = {N}</span>
            <input type="range" min="4" max="30" step="1" value={N}
              onChange={e => { const v = +e.target.value; setN(v); const ni = Math.min(startI, v - 1); setStartI(ni); resetGame(ni) }}
              className="w-28 accent-amber-500" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="w-20">Start i = {startI}</span>
            <input type="range" min="1" max={N - 1} step="1" value={startI}
              onChange={e => { const v = +e.target.value; setStartI(v); resetGame(v) }}
              className="w-28 accent-amber-500" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input type="range" min="10" max="300" step="10" value={speed}
            onChange={e => setSpeed(+e.target.value)}
            className="w-28 accent-amber-500" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2"
          onClick={() => { if (gameOver) { setMoney(startI); setTrail([startI]); setGameOver(false) } else setRunning(r => !r) }}>
          {gameOver ? 'New Game' : running ? 'Pause' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running || gameOver}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => resetGame(startI)}>Reset</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={runBatch}>Run 200 Trials</button>
      </div>

      {/* Position indicator */}
      <div className="mt-5">
        <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
          <span className="text-red-400 font-semibold">$0</span>
          <div className="flex-1" />
          <span className="text-emerald-400 font-semibold">${N}</span>
        </div>
        <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, #ef4444 0%, #fbbf24 50%, #10b981 100%)' }}
            animate={{ opacity: 0.2 }}
          />
          <motion.div
            className="absolute top-1 w-6 h-6 rounded-full bg-amber-400 shadow-lg shadow-amber-500/30 border-2 border-amber-300"
            animate={{ left: `calc(${(money / N) * 100}% - 12px)` }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Current:</span>{' '}
          <span className={`font-semibold ${money <= 0 ? 'text-red-400' : money >= N ? 'text-emerald-400' : 'text-amber-400'}`}>${money}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Steps:</span>{' '}
          <span className="text-white font-semibold">{trail.length - 1}</span>
        </div>
        {gameOver && (
          <motion.div initial={{ scale: 1.2 }} animate={{ scale: 1 }}
            className={`rounded-xl px-4 py-2 font-semibold ${money <= 0
              ? 'bg-red-900/30 border border-red-600/40 text-red-400'
              : 'bg-emerald-900/30 border border-emerald-600/40 text-emerald-400'}`}>
            {money <= 0 ? 'RUINED!' : 'GOAL REACHED!'}
          </motion.div>
        )}
      </div>

      {/* Chart */}
      <div className="mt-4 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={chartRef} className="w-full" style={{ height: 220 }} />
      </div>

      {/* Theory vs Empirical */}
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Theoretical ruin probability:</p>
          <p className="text-2xl font-bold text-amber-400">{(ruinProb * 100).toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">
            <InlineMath math={`P(\\text{ruin} \\mid X_0=${startI}) = ${ruinProb.toFixed(4)}`} />
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Empirical ruin probability:</p>
          <p className="text-2xl font-bold text-indigo-400">
            {empiricalRuin !== null ? `${(empiricalRuin * 100).toFixed(1)}%` : '---'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {totalGames > 0 ? `${stats.losses} ruins / ${totalGames} games` : 'Run games or click "Run 200 Trials"'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}


// ─── Weather Model ────────────────────────────

const WEATHER_STATES = [
  { id: 0, name: 'Sunny', icon: '\u2600\uFE0F', color: '#fbbf24', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  { id: 1, name: 'Cloudy', icon: '\u2601\uFE0F', color: '#94a3b8', bg: 'bg-slate-500/15', border: 'border-slate-500/30' },
  { id: 2, name: 'Rainy', icon: '\uD83C\uDF27\uFE0F', color: '#60a5fa', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
]

const WEATHER_P = [
  [0.6, 0.3, 0.1],
  [0.2, 0.5, 0.3],
  [0.3, 0.3, 0.4],
]

const WEATHER_STATIONARY = [3 / 8, 3 / 8, 1 / 4]

function sampleWeather(current) {
  const r = Math.random()
  let cum = 0
  for (let j = 0; j < 3; j++) {
    cum += WEATHER_P[current][j]
    if (r < cum) return j
  }
  return 2
}

function WeatherModel() {
  const [weather, setWeather] = useState(0)
  const [history, setHistory] = useState([0])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(500)
  const timerRef = useRef(null)

  const step = useCallback(() => {
    setWeather(prev => {
      const next = sampleWeather(prev)
      setHistory(h => [...h, next])
      return next
    })
  }, [])

  useEffect(() => {
    if (running) timerRef.current = setInterval(step, speed)
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const reset = () => {
    setRunning(false)
    clearInterval(timerRef.current)
    setWeather(0)
    setHistory([0])
  }

  // Empirical frequencies
  const counts = [0, 0, 0]
  history.forEach(w => counts[w]++)
  const total = history.length
  const empirical = counts.map(c => c / total)

  const currentW = WEATHER_STATES[weather]
  const recentHistory = history.slice(-24)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="example-box"
    >
      <h3 className="text-xl font-bold text-blue-400 mb-2">
        Bonus — Weather Model
      </h3>

      <p className="text-slate-300 mb-4">
        A 3-state Markov chain modeling daily weather. Tomorrow's weather depends{' '}
        <em>only</em> on today's weather — the Markov property at work. Run the
        simulation and watch the empirical frequencies converge to the stationary
        distribution <InlineMath math="\pi" />.
      </p>

      <div className="math-block">
        <p className="text-slate-300 text-sm mb-2">
          State space <InlineMath math="S = \{\text{Sunny},\; \text{Cloudy},\; \text{Rainy}\}" />.
          Transition matrix:
        </p>
        <BlockMath math={String.raw`P = \begin{pmatrix} 0.6 & 0.3 & 0.1 \\ 0.2 & 0.5 & 0.3 \\ 0.3 & 0.3 & 0.4 \end{pmatrix}`} />
        <p className="text-slate-400 text-sm mt-2">
          Stationary distribution:{' '}
          <InlineMath math={String.raw`\pi = \left(\tfrac{3}{8},\; \tfrac{3}{8},\; \tfrac{1}{4}\right) = (0.375,\; 0.375,\; 0.25)`} />
        </p>
      </div>

      {/* Current weather display */}
      <div className="mt-6 flex justify-center">
        <motion.div
          key={history.length}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-center px-12 py-6 rounded-2xl ${currentW.bg} border ${currentW.border}`}
        >
          <div className="text-6xl mb-2">{currentW.icon}</div>
          <p className="text-lg font-bold" style={{ color: currentW.color }}>{currentW.name}</p>
          <p className="text-sm text-slate-400">Day {history.length - 1}</p>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => setRunning(r => !r)}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>Speed: {speed}ms</span>
          <input type="range" min="100" max="1000" step="50" value={speed}
            onChange={e => setSpeed(+e.target.value)} className="w-24 accent-blue-500" />
        </label>
      </div>

      {/* Recent weather strip */}
      <div className="mt-5">
        <p className="text-sm text-slate-400 mb-2">Recent weather (last 24 days):</p>
        <div className="flex flex-wrap gap-1 justify-center">
          {recentHistory.map((w, i) => (
            <motion.span
              key={history.length - recentHistory.length + i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${WEATHER_STATES[w].bg} border ${WEATHER_STATES[w].border}`}
              title={WEATHER_STATES[w].name}
            >
              {WEATHER_STATES[w].icon}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Empirical vs Theoretical distribution */}
      <div className="mt-6">
        <p className="text-sm text-slate-400 mb-3">
          Empirical vs Stationary distribution ({history.length} observations):
        </p>
        <div className="space-y-3">
          {WEATHER_STATES.map((ws, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-8 text-center text-lg">{ws.icon}</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: ws.color }}
                      animate={{ width: `${empirical[i] * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-slate-300 w-14 text-right font-mono">
                    {(empirical[i] * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full opacity-50"
                      style={{ backgroundColor: ws.color, width: `${WEATHER_STATIONARY[i] * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-14 text-right font-mono">
                    {(WEATHER_STATIONARY[i] * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 text-xs text-slate-500 justify-center mt-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-slate-400" /> Empirical
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-full bg-slate-400 opacity-50" /> Stationary <InlineMath math="\pi" />
            </span>
          </div>
        </div>
      </div>

      {/* Transition table */}
      <div className="mt-6">
        <p className="text-sm text-slate-400 mb-2">Transition probabilities:</p>
        <div className="overflow-x-auto">
          <table className="text-xs text-center border-collapse mx-auto">
            <thead>
              <tr>
                <th className="px-3 py-1 text-slate-500">From \ To</th>
                {WEATHER_STATES.map(ws => (
                  <th key={ws.id} className="px-3 py-1" style={{ color: ws.color }}>{ws.icon} {ws.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEATHER_P.map((row, ri) => (
                <tr key={ri} className={ri === weather ? 'bg-slate-700/30' : ''}>
                  <td className="px-3 py-1 font-medium" style={{ color: WEATHER_STATES[ri].color }}>
                    {WEATHER_STATES[ri].icon} {WEATHER_STATES[ri].name}
                  </td>
                  {row.map((val, ci) => (
                    <td key={ci} className="px-3 py-1 text-slate-300"
                      style={{ backgroundColor: val > 0 ? `rgba(99,102,241,${val * 0.4})` : 'transparent' }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}


// ─── Main Page ────────────────────────────────

export default function MoreExamples() {
  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            3.4 More Examples
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Classic Markov chain models from operations research, statistical physics,
          probability, and everyday life. The first two are from the textbook; the
          bonus examples illustrate additional applications.
        </p>
        <div className="flex gap-3 flex-wrap mt-4">
          <a href="#inventory" className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-blue-400 transition-colors">Inventory Model</a>
          <a href="#ehrenfest" className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-blue-400 transition-colors">Ehrenfest Model</a>
          <a href="#gamblers-ruin" className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-blue-400 transition-colors">Gambler's Ruin</a>
          <a href="#weather" className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-blue-400 transition-colors">Weather Model</a>
        </div>
      </motion.div>

      <div id="inventory"><InventoryModel /></div>

      {/* Things to Try: Inventory */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 className="text-teal-400 font-bold mb-3 flex items-center gap-2">Things to Try</h4>
        <ul className="text-slate-300 space-y-2 list-disc list-inside">
          <li>Run the simulation for 100 days. How often is the store in backorder (state -1)?</li>
          <li>Watch the transition matrix row for state 2. With 2 TVs in stock, what's the probability of backorder tomorrow?</li>
        </ul>
      </motion.div>

      <div id="ehrenfest"><EhrenfestModel /></div>

      {/* Things to Try: Ehrenfest */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 className="text-teal-400 font-bold mb-3 flex items-center gap-2">Things to Try</h4>
        <ul className="text-slate-300 space-y-2 list-disc list-inside">
          <li>Set N=2 (4 particles). Run until equilibrium. Is the most likely state N=2 (equal split)?</li>
          <li>Try N=10 (20 particles). How does the time to equilibrium compare with N=2?</li>
          <li>The stationary distribution is Binomial(2N, 1/2). Can you see this in the histogram?</li>
        </ul>
      </motion.div>

      <div id="gamblers-ruin"><GamblersRuin /></div>
      <div id="weather"><WeatherModel /></div>

      {/* summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="section-card"
      >
        <h3 className="text-lg font-bold text-amber-400 mb-3">Key Takeaways</h3>
        <ul className="text-slate-300 leading-relaxed space-y-2 list-disc list-inside">
          <li>
            The <strong>inventory model</strong> shows how Markov chains arise in operations
            research. The state encodes just enough information (current stock level) to
            determine future behavior, regardless of past history.
          </li>
          <li>
            The <strong>Ehrenfest model</strong> demonstrates diffusion toward equilibrium.
            Despite being reversible, the chain concentrates near the balanced
            state <InlineMath math="Y_n = N" /> for large <InlineMath math="N" />.
          </li>
          <li>
            The <strong>Gambler's Ruin</strong> problem introduces <strong>absorbing states</strong> and
            shows how a simple random walk between two barriers leads to a classical
            ruin probability formula.
          </li>
          <li>
            The <strong>weather model</strong> illustrates <strong>convergence to a stationary
            distribution</strong> — run the simulation long enough and the empirical
            frequencies approach <InlineMath math="\pi" />, regardless of the starting state.
          </li>
          <li>
            All four models have <strong>finite state spaces</strong> and well-defined transition
            matrices, making them amenable to the theory developed in Sections 3.2 and 3.3.
          </li>
        </ul>
      </motion.div>
    </div>
  )
}
