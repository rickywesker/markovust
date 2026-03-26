import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

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

/* ─── Helper: Poisson PMF ─── */
function poissonPMF(k, mu) {
  // log-space computation to avoid overflow
  let logP = k * Math.log(mu) - mu
  for (let i = 2; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

/* ─── Helper: Binomial PMF ─── */
function binomialPMF(k, n, p) {
  if (k > n || k < 0) return 0
  // log-space computation
  let logP = 0
  for (let i = 0; i < k; i++) logP += Math.log(n - i) - Math.log(i + 1)
  logP += k * Math.log(p) + (n - k) * Math.log(1 - p)
  return Math.exp(logP)
}

/* ─── Helper: Gamma density ─── */
function gammaDensity(t, n, lambda) {
  if (t <= 0 || n < 1) return 0
  // f(t) = lambda^n * t^{n-1} * e^{-lambda*t} / (n-1)!
  let logF = n * Math.log(lambda) + (n - 1) * Math.log(t) - lambda * t
  for (let i = 2; i < n; i++) logF -= Math.log(i)
  return Math.exp(logF)
}

/* ═══════════════════════════════════════════════════════
   1. POISSON PMF VISUALIZER
   ═══════════════════════════════════════════════════════ */
function PoissonPMFVisualizer() {
  const [mu, setMu] = useState(5)
  const canvasRef = useRef(null)

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

    const padL = 50, padR = 20, padT = 30, padB = 45
    const plotW = W - padL - padR
    const plotH = H - padT - padB
    const maxK = 25

    // Compute PMF values
    const pmf = []
    let maxP = 0
    for (let k = 0; k <= maxK; k++) {
      const p = poissonPMF(k, mu)
      pmf.push(p)
      if (p > maxP) maxP = p
    }
    maxP = Math.max(maxP, 0.05)
    const yScale = plotH / (maxP * 1.1)

    // Grid lines
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    const nTicks = 5
    for (let i = 0; i <= nTicks; i++) {
      const val = (maxP * 1.1 * i) / nTicks
      const py = padT + plotH - val * yScale
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(3), padL - 6, py + 3)
    }

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(padL, padT)
    ctx.lineTo(padL, padT + plotH)
    ctx.lineTo(padL + plotW, padT + plotH)
    ctx.stroke()

    // Draw bars
    const barW = plotW / (maxK + 1) - 2
    for (let k = 0; k <= maxK; k++) {
      const px = padL + (k / (maxK + 1)) * plotW + 1
      const barH = pmf[k] * yScale
      const py = padT + plotH - barH

      const gradient = ctx.createLinearGradient(px, py, px, padT + plotH)
      gradient.addColorStop(0, '#818cf8')
      gradient.addColorStop(1, '#4f46e5')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(px, py, barW, barH, [3, 3, 0, 0])
      ctx.fill()

      // k labels
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      if (k % (maxK > 15 ? 2 : 1) === 0) {
        ctx.fillText(`${k}`, px + barW / 2, padT + plotH + 14)
      }
    }

    // x-axis label
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('k', padL + plotW / 2, padT + plotH + 35)

    // Title
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Poisson(\u03BC = ${mu.toFixed(1)}) PMF`, padL + plotW / 2, 16)

    // Mean line
    const meanX = padL + (mu / (maxK + 1)) * plotW + barW / 2
    ctx.strokeStyle = 'rgba(251,191,36,0.7)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath(); ctx.moveTo(meanX, padT); ctx.lineTo(meanX, padT + plotH); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 11px Inter, system-ui, sans-serif'
    ctx.fillText(`\u03BC = ${mu.toFixed(1)}`, meanX, padT - 5)
  }, [mu])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-3">Poisson PMF Visualizer</h3>
      <p className="text-slate-300 mb-4">
        Adjust <InlineMath math="\mu" /> to see how the shape of the Poisson distribution changes.
        Notice that both the mean and variance equal <InlineMath math="\mu" />.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400"><InlineMath math="\mu" /> =</span>
          <input
            type="range" min={0.5} max={15} step={0.5} value={mu}
            onChange={e => setMu(parseFloat(e.target.value))}
            className="w-48 accent-indigo-500"
          />
          <span className="text-sm font-mono text-amber-400 w-10">{mu.toFixed(1)}</span>
        </div>
        <div className="text-sm text-slate-400">
          E(X) = Var(X) = <span className="text-emerald-400 font-mono">{mu.toFixed(1)}</span>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-center">
        The dashed yellow line marks the mean <InlineMath math="\mu" />. As <InlineMath math="\mu" /> increases,
        the distribution shifts right and spreads out.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   2. BINOMIAL → POISSON APPROXIMATION
   ═══════════════════════════════════════════════════════ */
function BinomialPoissonApprox() {
  const [lambda, setLambda] = useState(5)
  const [n, setN] = useState(50)
  const canvasRef = useRef(null)

  const p = lambda / n

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

    const padL = 50, padR = 20, padT = 30, padB = 45
    const plotW = W - padL - padR
    const plotH = H - padT - padB
    const maxK = Math.min(25, n)

    // Compute both PMFs
    const binPMF = [], poisPMF = []
    let maxP = 0
    for (let k = 0; k <= maxK; k++) {
      const bv = binomialPMF(k, n, p)
      const pv = poissonPMF(k, lambda)
      binPMF.push(bv)
      poisPMF.push(pv)
      maxP = Math.max(maxP, bv, pv)
    }
    maxP = Math.max(maxP, 0.05)
    const yScale = plotH / (maxP * 1.15)

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const val = (maxP * 1.15 * i) / 5
      const py = padT + plotH - val * yScale
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(3), padL - 6, py + 3)
    }

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(padL, padT)
    ctx.lineTo(padL, padT + plotH)
    ctx.lineTo(padL + plotW, padT + plotH)
    ctx.stroke()

    // Draw bars side by side
    const groupW = plotW / (maxK + 1)
    const barW = (groupW - 4) / 2
    for (let k = 0; k <= maxK; k++) {
      const gx = padL + k * groupW + 2

      // Binomial bar
      const binH = binPMF[k] * yScale
      ctx.fillStyle = 'rgba(244,114,182,0.7)'
      ctx.beginPath()
      ctx.roundRect(gx, padT + plotH - binH, barW, binH, [2, 2, 0, 0])
      ctx.fill()

      // Poisson bar
      const poisH = poisPMF[k] * yScale
      ctx.fillStyle = 'rgba(96,165,250,0.7)'
      ctx.beginPath()
      ctx.roundRect(gx + barW, padT + plotH - poisH, barW, poisH, [2, 2, 0, 0])
      ctx.fill()

      // k labels
      if (k % (maxK > 15 ? 2 : 1) === 0) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '10px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${k}`, gx + groupW / 2 - 1, padT + plotH + 14)
      }
    }

    // x-axis label
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('k', padL + plotW / 2, padT + plotH + 35)

    // Title and legend
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Bin(${n}, ${p.toFixed(4)}) vs Poisson(${lambda})`, padL + plotW / 2, 16)

    // Legend
    const lx = padL + plotW - 160
    ctx.fillStyle = 'rgba(244,114,182,0.7)'
    ctx.fillRect(lx, padT + 6, 12, 10)
    ctx.fillStyle = '#f472b6'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Bin(${n}, ${p.toFixed(4)})`, lx + 16, padT + 15)

    ctx.fillStyle = 'rgba(96,165,250,0.7)'
    ctx.fillRect(lx, padT + 22, 12, 10)
    ctx.fillStyle = '#60a5fa'
    ctx.fillText(`Poisson(${lambda})`, lx + 16, padT + 31)
  }, [lambda, n, p])

  // Compute total variation distance
  let tvDist = 0
  for (let k = 0; k <= Math.min(50, n); k++) {
    tvDist += Math.abs(binomialPMF(k, n, p) - poissonPMF(k, lambda))
  }
  tvDist /= 2

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-pink-400 mb-3">Binomial to Poisson Approximation</h3>
      <p className="text-slate-300 mb-4">
        As <InlineMath math="n \to \infty" /> with <InlineMath math="p = \lambda/n" />,
        the <InlineMath math={String.raw`\text{Bin}(n, p)`} /> distribution converges to{' '}
        <InlineMath math={String.raw`\mathcal{P}(\lambda)`} />. Increase <InlineMath math="n" /> to see them overlap.
      </p>

      <div className="flex flex-wrap items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400"><InlineMath math="\lambda" /> =</span>
          <input
            type="range" min={1} max={12} step={0.5} value={lambda}
            onChange={e => setLambda(parseFloat(e.target.value))}
            className="w-36 accent-blue-500"
          />
          <span className="text-sm font-mono text-amber-400 w-8">{lambda}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">n =</span>
          <input
            type="range" min={10} max={500} step={5} value={n}
            onChange={e => setN(parseInt(e.target.value))}
            className="w-36 accent-pink-500"
          />
          <span className="text-sm font-mono text-amber-400 w-10">{n}</span>
        </div>
        <div className="text-sm text-slate-400">
          p = <InlineMath math="\lambda/n" /> = <span className="text-emerald-400 font-mono">{p.toFixed(5)}</span>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>

      <div className="mt-2 text-center">
        <span className="text-sm text-slate-400">Total variation distance: </span>
        <span className={`text-sm font-mono font-bold ${tvDist < 0.01 ? 'text-emerald-400' : tvDist < 0.05 ? 'text-amber-400' : 'text-red-400'}`}>
          {tvDist.toFixed(5)}
        </span>
        {tvDist < 0.01 && <span className="text-emerald-400 text-sm ml-2">-- Excellent approximation!</span>}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   3. POISSON PROCESS SIMULATOR
   ═══════════════════════════════════════════════════════ */
function PoissonProcessSimulator() {
  const [lambda, setLambda] = useState(3)
  const [running, setRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [events, setEvents] = useState([])
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef({ time: 0, events: [] })

  const maxTime = 10

  const reset = useCallback(() => {
    setRunning(false)
    setTime(0)
    setEvents([])
    stateRef.current = { time: 0, events: [] }
    clearInterval(animRef.current)
  }, [])

  const step = useCallback(() => {
    const s = stateRef.current
    if (s.time >= maxTime) return
    // Generate next inter-arrival time ~ Exp(lambda)
    const u = Math.random()
    const interarrival = -Math.log(u) / lambda
    const nextTime = s.time + interarrival
    if (nextTime <= maxTime) {
      s.events = [...s.events, nextTime]
      s.time = nextTime
    } else {
      s.time = maxTime
    }
    setTime(s.time)
    setEvents([...s.events])
  }, [lambda])

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }
    animRef.current = setInterval(() => {
      const s = stateRef.current
      if (s.time >= maxTime) {
        setRunning(false)
        clearInterval(animRef.current)
        return
      }
      step()
    }, 200)
    return () => clearInterval(animRef.current)
  }, [running, step])

  // Draw
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

    const padL = 50, padR = 30, padT = 30, padB = 40
    const plotW = W - padL - padR
    const plotH = H - padT - padB
    const maxCount = Math.max(events.length + 3, 10)

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (let y = 0; y <= maxCount; y += Math.max(1, Math.floor(maxCount / 5))) {
      const py = padT + plotH * (1 - y / maxCount)
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${y}`, padL - 6, py + 3)
    }
    for (let x = 0; x <= maxTime; x++) {
      const px = padL + (x / maxTime) * plotW
      ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + plotH); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${x}`, px, padT + plotH + 14)
    }

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(padL, padT)
    ctx.lineTo(padL, padT + plotH)
    ctx.lineTo(padL + plotW, padT + plotH)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('t', padL + plotW / 2, padT + plotH + 32)
    ctx.save()
    ctx.translate(14, padT + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('X(t)', 0, 0)
    ctx.restore()

    // Draw step function X(t)
    const allTimes = [0, ...events]
    ctx.strokeStyle = '#818cf8'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < allTimes.length; i++) {
      const t1 = allTimes[i]
      const t2 = i < allTimes.length - 1 ? allTimes[i + 1] : Math.min(time, maxTime)
      const count = i
      const px1 = padL + (t1 / maxTime) * plotW
      const px2 = padL + (t2 / maxTime) * plotW
      const py = padT + plotH * (1 - count / maxCount)
      if (i === 0) ctx.moveTo(px1, py)
      else ctx.lineTo(px1, py)
      ctx.lineTo(px2, py)
    }
    // Final segment at current count
    if (events.length > 0) {
      const lastPy = padT + plotH * (1 - events.length / maxCount)
      const lastPx = padL + (Math.min(time, maxTime) / maxTime) * plotW
      ctx.lineTo(lastPx, lastPy)
    }
    ctx.stroke()

    // Draw event markers
    for (let i = 0; i < events.length; i++) {
      const px = padL + (events[i] / maxTime) * plotW
      const py = padT + plotH * (1 - (i + 1) / maxCount)
      ctx.beginPath()
      ctx.arc(px, py, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#fbbf24'
      ctx.fill()
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Title
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Poisson Process X(t),  \u03BB = ${lambda}`, padL + plotW / 2, 16)
  }, [events, time, lambda])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-purple-400 mb-3">Poisson Process Simulator</h3>
      <p className="text-slate-300 mb-4">
        Watch a Poisson process unfold in real time. Events arrive randomly at rate{' '}
        <InlineMath math="\lambda" />, and <InlineMath math="X(t)" /> counts the number of events up to time{' '}
        <InlineMath math="t" />.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400"><InlineMath math="\lambda" /> =</span>
          <input
            type="range" min={0.5} max={10} step={0.5} value={lambda}
            onChange={e => { setLambda(parseFloat(e.target.value)); reset() }}
            className="w-36 accent-purple-500"
          />
          <span className="text-sm font-mono text-amber-400 w-8">{lambda}</span>
        </div>
        <button onClick={() => setRunning(!running)} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={step} className="btn-secondary text-sm !px-4 !py-2" disabled={running}>
          Step
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">
          Reset
        </button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-slate-400">Current Time</div>
          <div className="text-lg font-mono text-amber-400">{time.toFixed(3)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Events (X(t))</div>
          <div className="text-lg font-mono text-indigo-400">{events.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Expected E[X(t)]</div>
          <div className="text-lg font-mono text-emerald-400">{(lambda * time).toFixed(2)}</div>
        </div>
      </div>

      {events.length >= 2 && (
        <div className="mt-3 text-sm text-slate-400">
          <span className="text-slate-300 font-semibold">Inter-arrival times (sojourn times): </span>
          {events.map((e, i) => {
            const prev = i === 0 ? 0 : events[i - 1]
            return (
              <span key={i} className="font-mono text-cyan-400">
                {(e - prev).toFixed(3)}{i < events.length - 1 ? ', ' : ''}
              </span>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   4. WAITING TIMES VISUALIZER
   ═══════════════════════════════════════════════════════ */
function WaitingTimesVisualizer() {
  const [lambda, setLambda] = useState(3)
  const [targetN, setTargetN] = useState(3)
  const [numSims, setNumSims] = useState(2000)
  const [simData, setSimData] = useState(null)
  const canvasRef = useRef(null)

  const runSimulation = useCallback(() => {
    const waitingTimes = []
    const sojournTimes = []

    for (let sim = 0; sim < numSims; sim++) {
      let t = 0
      for (let k = 0; k < targetN; k++) {
        const u = Math.random()
        const s = -Math.log(u) / lambda
        sojournTimes.push(s)
        t += s
      }
      waitingTimes.push(t)
    }

    setSimData({ waitingTimes, sojournTimes })
  }, [lambda, targetN, numSims])

  // Draw histogram + density overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !simData) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 20, padT = 30, padB = 45
    const plotW = W - padL - padR
    const plotH = H - padT - padB

    const data = simData.waitingTimes
    const maxVal = Math.max(...data) * 1.05
    const numBins = 40
    const binWidth = maxVal / numBins
    const bins = Array(numBins).fill(0)
    for (const v of data) {
      const idx = Math.min(Math.floor(v / binWidth), numBins - 1)
      bins[idx]++
    }

    // Normalize to density
    const densityBins = bins.map(c => c / (data.length * binWidth))
    let maxDensity = Math.max(...densityBins)

    // Also compute theoretical Gamma density max
    const dt = maxVal / 200
    let gammaMax = 0
    for (let i = 0; i <= 200; i++) {
      const t = i * dt
      gammaMax = Math.max(gammaMax, gammaDensity(t, targetN, lambda))
    }
    maxDensity = Math.max(maxDensity, gammaMax) * 1.1

    const yScale = plotH / maxDensity

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const val = (maxDensity * i) / 4
      const py = padT + plotH - val * yScale
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(2), padL - 6, py + 3)
    }

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(padL, padT)
    ctx.lineTo(padL, padT + plotH)
    ctx.lineTo(padL + plotW, padT + plotH)
    ctx.stroke()

    // x-axis labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    const xStep = Math.max(0.5, Math.ceil(maxVal / 8 * 2) / 2)
    for (let x = 0; x <= maxVal; x += xStep) {
      const px = padL + (x / maxVal) * plotW
      ctx.fillText(x.toFixed(1), px, padT + plotH + 14)
    }
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillText('t', padL + plotW / 2, padT + plotH + 35)

    // Draw histogram bars
    for (let i = 0; i < numBins; i++) {
      const px = padL + (i * binWidth / maxVal) * plotW
      const bw = (binWidth / maxVal) * plotW
      const barH = densityBins[i] * yScale
      ctx.fillStyle = 'rgba(96,165,250,0.4)'
      ctx.strokeStyle = 'rgba(96,165,250,0.6)'
      ctx.lineWidth = 1
      ctx.fillRect(px, padT + plotH - barH, bw, barH)
      ctx.strokeRect(px, padT + plotH - barH, bw, barH)
    }

    // Overlay theoretical Gamma density
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const t = i * dt
      const fv = gammaDensity(t, targetN, lambda)
      const px = padL + (t / maxVal) * plotW
      const py = padT + plotH - fv * yScale
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Title
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`W_${targetN} histogram vs Gamma(${targetN}, ${lambda}) density`, padL + plotW / 2, 16)

    // Legend
    const lx = padL + plotW - 180
    ctx.fillStyle = 'rgba(96,165,250,0.4)'
    ctx.fillRect(lx, padT + 6, 14, 10)
    ctx.fillStyle = '#60a5fa'
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Simulated histogram', lx + 18, padT + 15)

    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(lx, padT + 27); ctx.lineTo(lx + 14, padT + 27); ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(`Gamma(${targetN}, ${lambda}) density`, lx + 18, padT + 31)
  }, [simData, targetN, lambda])

  // Stats
  const mean = simData ? simData.waitingTimes.reduce((a, b) => a + b, 0) / simData.waitingTimes.length : 0
  const theoreticalMean = targetN / lambda
  const sojMean = simData ? simData.sojournTimes.reduce((a, b) => a + b, 0) / simData.sojournTimes.length : 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-cyan-400 mb-3">Waiting Times Visualizer</h3>
      <p className="text-slate-300 mb-4">
        Simulate many Poisson processes and plot the distribution of the waiting time{' '}
        <InlineMath math="W_n" /> (time until the <InlineMath math="n" />-th event).
        The theoretical distribution is <InlineMath math={String.raw`\text{Gamma}(n, \lambda)`} />.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400"><InlineMath math="\lambda" /> =</span>
          <input
            type="range" min={0.5} max={8} step={0.5} value={lambda}
            onChange={e => setLambda(parseFloat(e.target.value))}
            className="w-28 accent-cyan-500"
          />
          <span className="text-sm font-mono text-amber-400 w-8">{lambda}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">n =</span>
          <input
            type="range" min={1} max={10} step={1} value={targetN}
            onChange={e => setTargetN(parseInt(e.target.value))}
            className="w-28 accent-emerald-500"
          />
          <span className="text-sm font-mono text-amber-400 w-6">{targetN}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Sims:</span>
          <select
            value={numSims}
            onChange={e => setNumSims(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
          >
            <option value={500}>500</option>
            <option value={2000}>2000</option>
            <option value={5000}>5000</option>
            <option value={10000}>10000</option>
          </select>
        </div>
        <button onClick={runSimulation} className="btn-primary text-sm !px-6 !py-2">
          Run Simulation
        </button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>

      {simData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-400">Sample Mean of W_n</div>
            <div className="text-lg font-mono text-blue-400">{mean.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Theoretical E[W_n] = n/lambda</div>
            <div className="text-lg font-mono text-amber-400">{theoreticalMean.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Mean Sojourn Time (should be 1/lambda)</div>
            <div className="text-lg font-mono text-emerald-400">{sojMean.toFixed(4)} (vs {(1/lambda).toFixed(4)})</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function PoissonProcess() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Chapter 5: Poisson Processes
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          The law of rare events: how micro-rare occurrences aggregate into macro-common phenomena,
          modeled by the Poisson distribution and Poisson process.
        </p>
        <p className="text-slate-500 text-sm mt-1 italic">-- Patience Pays.</p>
      </motion.div>

      {/* ─── Section 5.1: Poisson Distribution ─── */}
      <Section title="5.1 The Poisson Distribution" id="poisson-dist" color="from-indigo-400 to-purple-400">
        <p className="text-slate-300 mb-4">
          The Poisson distribution is often referred to as the <em className="text-indigo-300">law of rare events</em>.
          Rareness in micro scales can aggregate to become common in a macro scale.
          In short, <strong className="text-slate-200">macro-common is aggregated micro-rareness</strong>.
        </p>

        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition: Poisson Distribution</h4>
          <p className="text-slate-300 mb-2">
            A random variable <InlineMath math="X" /> follows the <strong className="text-indigo-300">Poisson distribution</strong> with
            mean <InlineMath math="\mu" />, denoted <InlineMath math={String.raw`X \sim \mathcal{P}(\mu)`} />, if:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(X = k) = \frac{\mu^k e^{-\mu}}{k!}, \qquad k = 0, 1, 2, \ldots`} />
          </div>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Properties of the Poisson Distribution</h4>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(a) Mean and Variance:</strong>{' '}
            <InlineMath math={String.raw`E(X) = \text{Var}(X) = \mu`} />
          </p>
          <Collapsible title="Proof that E(X) = mu">
            <div className="text-slate-300 text-sm space-y-2">
              <div className="math-block">
                <BlockMath math={String.raw`E(X) = \sum_{k=0}^{\infty} k P(X=k) = \sum_{k=0}^{\infty} \frac{k \mu^k e^{-\mu}}{k!} = \mu \sum_{k=1}^{\infty} \frac{\mu^{k-1} e^{-\mu}}{(k-1)!} = \mu`} />
              </div>
              <p className="text-slate-400 text-xs">
                The last step uses the fact that <InlineMath math={String.raw`\sum_{j=0}^{\infty} \frac{\mu^j}{j!} = e^{\mu}`} />.
                Showing Var(X) = <InlineMath math="\mu" /> is left as an exercise (DIY!).
              </p>
            </div>
          </Collapsible>
          <p className="text-slate-300 mt-4 mb-2">
            <strong className="text-slate-200">(b) Moment Generating Function:</strong>
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`E(e^{tX}) = \sum_{k=0}^{\infty} e^{tk} \frac{\mu^k e^{-\mu}}{k!} = \sum_{k=0}^{\infty} \frac{(e^t \mu)^k e^{-\mu}}{k!} = e^{-\mu + e^t \mu}`} />
          </div>
        </div>

        <PoissonPMFVisualizer />

        <div className="theorem-box mt-6 mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Proposition 5.1: Binomial Approximation of Poisson</h4>
          <p className="text-slate-300 mb-2">
            Suppose <InlineMath math={String.raw`X_n \sim \text{Bin}(n, p_n)`} /> where{' '}
            <InlineMath math={String.raw`n \to \infty`} />, <InlineMath math={String.raw`p_n \to 0`} />,
            and <InlineMath math={String.raw`n p_n \to \lambda > 0`} />. Then, for <InlineMath math="k = 0, 1, 2, \ldots" />,
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`X_n \to \mathcal{P}(\lambda) \quad \text{in distribution, i.e., } \; P(X_n = k) \to \frac{\lambda^k e^{-\lambda}}{k!}`} />
          </div>
          <Collapsible title="Proof">
            <div className="text-slate-300 text-sm space-y-2">
              <p>For <InlineMath math="k = 0, 1, 2, \ldots" />, as <InlineMath math="n \to \infty" />:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P(X_n = k) = \binom{n}{k} p_n^k (1 - p_n)^{n-k} = \frac{n!}{k!(n-k)!} \cdot \frac{(np_n)^k}{n^k} \cdot \frac{(1-p_n)^n}{(1-p_n)^k}`} />
              </div>
              <p>As <InlineMath math="n \to \infty" />:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><InlineMath math={String.raw`\frac{n!}{(n-k)! \cdot n^k} \to 1`} /> (since <InlineMath math="k" /> is fixed)</li>
                <li><InlineMath math={String.raw`(np_n)^k \to \lambda^k`} /></li>
                <li><InlineMath math={String.raw`(1-p_n)^n \to e^{-\lambda}`} /> (since <InlineMath math={String.raw`p_n \approx \lambda/n`} />)</li>
                <li><InlineMath math={String.raw`(1-p_n)^k \to 1`} /></li>
              </ul>
              <p>Therefore:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P(X_n = k) \to \frac{\lambda^k e^{-\lambda}}{k!}`} />
              </div>
            </div>
          </Collapsible>
          <div className="mt-3 p-3 bg-amber-900/20 rounded-lg border border-amber-700/40">
            <p className="text-amber-300 text-sm">
              <strong>In plain English:</strong> Consider a large number <InlineMath math="n" /> of scenarios where
              (1) event occurrence in any one scenario is rare (small <InlineMath math="p" />),
              and (2) occurrences across scenarios are independent. Then the total count follows approximately{' '}
              <InlineMath math={String.raw`\mathcal{P}(np)`} />.
            </p>
          </div>
        </div>

        <BinomialPoissonApprox />

        <div className="example-box mt-6 mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Example 5.1: Traffic Accidents</h4>
          <p className="text-slate-300 mb-2">
            Suppose (1) the chance of one traffic accident on the Clear Water Bay road on any one day is very small,
            so small that more than one accident per day is ignorable; (2) over different days, accident occurrences are independent;
            and (3) on average, there are 3 accidents per year.
          </p>
          <p className="text-slate-300 mb-2">
            Then <InlineMath math="X" />, the number of traffic accidents over one year, follows{' '}
            <InlineMath math={String.raw`\text{Bin}(365, p)`} /> with <InlineMath math={String.raw`p = 3/365`} />.
            By the Poisson approximation:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`X \sim \mathcal{P}(3), \quad \text{approximately.}`} />
          </div>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Example 5.2: Chelsea vs Tottenham</h4>
          <p className="text-slate-300 mb-2">
            For Chelsea's match against Tottenham Hotspur, suppose (1) the chance for Chelsea to score a goal within
            any given one minute is very small; (2) scoring 2 or more goals within one minute is so rare it is
            ignorable; (3) over different minutes, scoring of goals are independent.
          </p>
          <p className="text-slate-300">
            Then the number of Chelsea goals in the match is a <strong className="text-emerald-300">Poisson random variable</strong>,
            following a Poisson distribution.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Property: Sum of Independent Poissons</h4>
          <p className="text-slate-300 mb-2">
            If <InlineMath math={String.raw`X \sim \mathcal{P}(\mu)`} /> and <InlineMath math={String.raw`Y \sim \mathcal{P}(\nu)`} /> are
            independent, then:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`X + Y \sim \mathcal{P}(\mu + \nu)`} />
          </div>
          <Collapsible title="Proof">
            <div className="text-slate-300 text-sm space-y-2">
              <p>For any nonnegative integer <InlineMath math="k" />:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P(X+Y=k) = \sum_{j=0}^{k} P(X=j) P(Y=k-j) = \sum_{j=0}^{k} \frac{\mu^j e^{-\mu}}{j!} \cdot \frac{\nu^{k-j} e^{-\nu}}{(k-j)!}`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= \frac{e^{-\mu-\nu}}{k!} (\mu+\nu)^k \sum_{j=0}^{k} \frac{k!}{j!(k-j)!} \left(\frac{\mu}{\mu+\nu}\right)^j \left(\frac{\nu}{\mu+\nu}\right)^{k-j} = \frac{e^{-(\mu+\nu)}(\mu+\nu)^k}{k!}`} />
              </div>
              <p>
                The inner sum equals 1 by the binomial theorem, so{' '}
                <InlineMath math={String.raw`X+Y \sim \mathcal{P}(\mu+\nu)`} />.
              </p>
            </div>
          </Collapsible>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Property: Conditional Binomial Thinning</h4>
          <p className="text-slate-300 mb-2">
            If <InlineMath math={String.raw`X \sim \mathcal{P}(\mu)`} /> and{' '}
            <InlineMath math={String.raw`Y \mid \{X = k\} \sim \text{Bin}(k, p)`} /> for all{' '}
            <InlineMath math={String.raw`k \geq 0`} />, then:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`Y \sim \mathcal{P}(\mu p)`} />
          </div>
          <Collapsible title="Proof">
            <div className="text-slate-300 text-sm space-y-2">
              <p>For any nonnegative integer <InlineMath math="j" />:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P(Y=j) = \sum_{k=j}^{\infty} P(Y=j \mid X=k) P(X=k) = \sum_{k=j}^{\infty} \binom{k}{j} p^j (1-p)^{k-j} \frac{\mu^k e^{-\mu}}{k!}`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= \frac{e^{-\mu} p^j \mu^j}{j!} \sum_{i=0}^{\infty} \frac{(1-p)^i \mu^i}{i!} = \frac{e^{-\mu} p^j \mu^j}{j!} \cdot e^{\mu(1-p)} = \frac{e^{-p\mu} (p\mu)^j}{j!}`} />
              </div>
              <p>
                This is exactly the PMF of <InlineMath math={String.raw`\mathcal{P}(\mu p)`} />.
              </p>
            </div>
          </Collapsible>
          <div className="mt-3 p-3 bg-amber-900/20 rounded-lg border border-amber-700/40">
            <p className="text-amber-300 text-sm">
              <strong>Intuition:</strong> Think of tossing two coins. Coin A is tossed <InlineMath math="n" /> times
              (<InlineMath math="n" /> large, <InlineMath math="q" /> small, so <InlineMath math={String.raw`X \sim \mathcal{P}(\mu)`} />).
              For each head of A, coin B is tossed (with probability <InlineMath math="p" /> of heads).
              Then <InlineMath math={String.raw`Y \sim \text{Bin}(n, qp) \approx \mathcal{P}(\mu p)`} />.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── Section 5.2: The Poisson Process ─── */}
      <Section title="5.2 The Poisson Process" id="poisson-process" color="from-cyan-400 to-blue-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition: Poisson Process</h4>
          <p className="text-slate-300 mb-2">
            Suppose <InlineMath math={String.raw`\{X(t) : t \in [0, \infty)\}`} /> is a non-negative integer-valued
            non-decreasing process in continuous time, satisfying:
          </p>
          <ol className="text-slate-300 list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong className="text-cyan-300">Independent increments:</strong> For any{' '}
              <InlineMath math={String.raw`0 \leq t_0 < t_1 < \cdots < t_k < \infty`} />,
              <div className="math-block mt-2">
                <BlockMath math={String.raw`X(t_1) - X(t_0),\; X(t_2) - X(t_1),\; \ldots,\; X(t_k) - X(t_{k-1})`} />
              </div>
              are independent random variables.
            </li>
            <li>
              <strong className="text-cyan-300">Poisson marginal distribution:</strong>
              <div className="math-block mt-2">
                <BlockMath math={String.raw`X(t+s) - X(s) \sim \mathcal{P}(\lambda t) \quad \text{for any } t > 0,\; s \geq 0`} />
              </div>
            </li>
            <li>
              <strong className="text-cyan-300">Initial value:</strong>{' '}
              <InlineMath math="X(0) = 0" />
            </li>
          </ol>
          <p className="text-slate-300 mt-3">
            Then <InlineMath math={String.raw`\{X(t)\}`} /> is called a <strong className="text-cyan-300">Poisson process</strong> with
            rate (or intensity) <InlineMath math="\lambda" />.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Remark: Infinitesimal Probability Version</h4>
          <p className="text-slate-300 mb-2">
            Condition (b) can be equivalently replaced by the infinitesimal formulation:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P\bigl(X(t + \Delta t) - X(t) = 1\bigr) = \lambda \Delta t + o(\Delta t), \qquad \text{for all } t \geq 0 \text{ and } \Delta t \downarrow 0`} />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            This says: in a tiny time window <InlineMath math="\Delta t" />, the probability of exactly one event is
            approximately <InlineMath math={String.raw`\lambda \Delta t`} />, and the probability of two or more events is negligible.
          </p>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Example 5.5: Chelsea Match as Poisson Process</h4>
          <p className="text-slate-300 mb-2">
            In addition to the assumptions of Example 5.2, suppose the chance <InlineMath math="p" /> for Chelsea to
            score a goal within any given one minute is equal (constant rate).
            Let <InlineMath math="X(t)" /> be the number of Chelsea goals from the beginning of the match till time{' '}
            <InlineMath math="t" />, with the unit of time being minutes.
          </p>
          <p className="text-slate-300">
            Then <InlineMath math={String.raw`\{X(t) : t \in [0, 90]\}`} /> is <strong className="text-emerald-300">approximately a Poisson
            process</strong> with rate <InlineMath math="p" />, the mean number of goals per minute.
          </p>
        </div>

        <PoissonProcessSimulator />

        <div className="mt-6 p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
          <h4 className="text-cyan-400 font-bold mb-3">Understanding through Binomial Approximation</h4>
          <p className="text-slate-300 text-sm mb-3">
            Cut the time axis <InlineMath math={String.raw`(0, \infty)`} /> into tiny intervals of length{' '}
            <InlineMath math="\Delta t" />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`(0, \Delta t],\; (\Delta t, 2\Delta t],\; (2\Delta t, 3\Delta t],\; \ldots`} />
          </div>
          <p className="text-slate-300 text-sm mb-3">
            Define indicator variables:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`\xi_i = \begin{cases} 1 & \text{with probability } \lambda \Delta t, \text{ if an event occurs in } ((i-1)\Delta t, i\Delta t] \\ 0 & \text{otherwise} \end{cases}`} />
          </div>
          <p className="text-slate-300 text-sm mb-2">
            The <InlineMath math={String.raw`\xi_i`} /> are independent. For fixed <InlineMath math="t > 0" />,
            with <InlineMath math={String.raw`n = t / \Delta t`} /> intervals:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`X(t) \approx \sum_{i=1}^{n} \xi_i \sim \text{Bin}(n, \lambda \Delta t) \approx \mathcal{P}(n \lambda \Delta t) = \mathcal{P}(\lambda t)`} />
          </div>
          <p className="text-slate-300 text-sm">
            This heuristic argument shows why the Poisson process naturally arises as a limit of
            many independent rare events accumulating over time.
          </p>
        </div>
      </Section>

      {/* ─── Section 5.3: Waiting Times and Sojourn Times ─── */}
      <Section title="5.3 Waiting Times and Sojourn Times" id="waiting-times" color="from-amber-400 to-orange-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition: Waiting and Sojourn Times</h4>
          <p className="text-slate-300 mb-2">
            Let <InlineMath math={String.raw`X(\cdot)`} /> be a Poisson process with rate <InlineMath math="\lambda" />. Define:
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`W_0 = 0, \qquad W_n = \inf\{t : X(t) = n\}, \quad n \geq 1`} />
          </div>
          <p className="text-slate-300 mb-2">
            <InlineMath math={String.raw`\{W_n\}`} /> are called <strong className="text-indigo-300">waiting times</strong>.{' '}
            <InlineMath math="W_n" /> is the time to the <InlineMath math="n" />-th event.
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`S_n = W_{n+1} - W_n, \qquad n \geq 0`} />
          </div>
          <p className="text-slate-300">
            <InlineMath math={String.raw`\{S_n\}`} /> are called <strong className="text-indigo-300">sojourn times</strong> (inter-arrival times).{' '}
            <InlineMath math="S_n" /> is the length of time that the process stays at state <InlineMath math="n" />.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Key Identity</h4>
          <p className="text-slate-300 mb-2">
            A fundamental link between waiting times and the counting process:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`\{W_n \leq t\} = \{X(t) \geq n\}`} />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            The left side says "the <InlineMath math="n" />-th event happens before or at time <InlineMath math="t" />."
            The right side says "at least <InlineMath math="n" /> events happen before or at time <InlineMath math="t" />."
            These are clearly the same event.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Proposition 5.3: Distribution of W_n</h4>
          <p className="text-slate-300 mb-2">
            <InlineMath math="W_n" /> follows the <strong className="text-amber-300">Gamma distribution</strong>{' '}
            <InlineMath math={String.raw`G(n, \lambda)`} /> with density:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`f(t) = \frac{\lambda^n t^{n-1} e^{-\lambda t}}{(n-1)!}, \qquad t \geq 0`} />
          </div>
          <Collapsible title="Full Proof">
            <div className="text-slate-300 text-sm space-y-3">
              <p><strong className="text-slate-200">Step 1:</strong> Use the key identity to find the CDF:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P(W_n \leq t) = P(X(t) \geq n) = \sum_{k=n}^{\infty} \frac{(\lambda t)^k e^{-\lambda t}}{k!} = 1 - \sum_{k=0}^{n-1} \frac{(\lambda t)^k e^{-\lambda t}}{k!}`} />
              </div>
              <p><strong className="text-slate-200">Step 2:</strong> Differentiate to get the density:</p>
              <div className="math-block">
                <BlockMath math={String.raw`f(t) = \frac{d}{dt} P(W_n \leq t) = -\sum_{k=0}^{n-1} \frac{d}{dt} \left(\frac{(\lambda t)^k e^{-\lambda t}}{k!}\right)`} />
              </div>
              <p><strong className="text-slate-200">Step 3:</strong> Computing the derivative of each term:</p>
              <div className="math-block">
                <BlockMath math={String.raw`\frac{d}{dt}\frac{(\lambda t)^k e^{-\lambda t}}{k!} = \frac{k\lambda^k t^{k-1} e^{-\lambda t}}{k!} + \frac{(\lambda t)^k (-\lambda) e^{-\lambda t}}{k!}`} />
              </div>
              <p>
                Summing from <InlineMath math="k = 0" /> to <InlineMath math="n-1" />, this is a telescoping sum
                that collapses to:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`f(t) = \frac{\lambda^n t^{n-1} e^{-\lambda t}}{(n-1)!}`} />
              </div>
              <p className="text-slate-400">
                This is exactly the Gamma(<InlineMath math="n" />, <InlineMath math="\lambda" />) density.
                Note that <InlineMath math={String.raw`W_n = S_0 + S_1 + \cdots + S_{n-1}`} />, the sum of{' '}
                <InlineMath math="n" /> iid Exp(<InlineMath math="\lambda" />) random variables.
              </p>
            </div>
          </Collapsible>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Proposition 5.4: Sojourn Times are iid Exponential</h4>
          <p className="text-slate-300 mb-2">
            The sojourn times <InlineMath math={String.raw`S_0, S_1, S_2, \ldots`} /> are{' '}
            <strong className="text-amber-300">independent and identically distributed</strong> exponential random variables
            with parameter <InlineMath math="\lambda" />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`S_k \overset{\text{iid}}{\sim} \text{Exp}(\lambda), \quad \text{i.e., } P(S_k > t) = e^{-\lambda t} \text{ for } t \geq 0`} />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            This provides a very neat property: the Poisson process can be equivalently defined/constructed
            using iid exponential sojourn times. Since <InlineMath math={String.raw`W_n = S_0 + S_1 + \cdots + S_{n-1}`} />,
            it is not surprising that <InlineMath math={String.raw`W_n \sim G(n, \lambda)`} />.
          </p>
        </div>

        <WaitingTimesVisualizer />

        {/* Things to try */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 p-5 rounded-xl border border-orange-500/30 bg-orange-500/5">
          <h4 className="text-orange-400 font-bold mb-3">Things to Try</h4>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>
              Set <InlineMath math="n = 1" /> and observe: the histogram should look like an exponential
              distribution (Gamma(1, <InlineMath math="\lambda" />) = Exp(<InlineMath math="\lambda" />)).
            </li>
            <li>
              Increase <InlineMath math="n" /> and notice how the distribution shifts right and becomes more
              symmetric -- the Gamma distribution approaches a normal for large <InlineMath math="n" />.
            </li>
            <li>
              Change <InlineMath math="\lambda" /> and observe: higher rate means shorter waiting times.
            </li>
            <li>
              Check that the sample mean of <InlineMath math="W_n" /> is close to the theoretical value{' '}
              <InlineMath math="n / \lambda" />.
            </li>
          </ul>
        </motion.div>
      </Section>

      {/* ─── Key Takeaways ─── */}
      <Section title="Key Takeaways" id="takeaways" color="from-slate-300 to-slate-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <h4 className="text-indigo-400 font-bold mb-2">Poisson Distribution</h4>
            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
              <li><InlineMath math={String.raw`P(X=k) = \mu^k e^{-\mu}/k!`} /></li>
              <li>Mean = Variance = <InlineMath math="\mu" /></li>
              <li>Arises as limit of Bin(<InlineMath math="n" />, <InlineMath math="p" />) with <InlineMath math="n" /> large, <InlineMath math="p" /> small</li>
              <li>Sum of independent Poissons is Poisson</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <h4 className="text-cyan-400 font-bold mb-2">Poisson Process</h4>
            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
              <li>Independent increments + Poisson marginals + <InlineMath math="X(0) = 0" /></li>
              <li>Rate <InlineMath math="\lambda" /> = expected events per unit time</li>
              <li><InlineMath math={String.raw`X(t+s) - X(s) \sim \mathcal{P}(\lambda t)`} /></li>
              <li>Models counts of rare events over continuous time</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <h4 className="text-amber-400 font-bold mb-2">Waiting Times</h4>
            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
              <li><InlineMath math={String.raw`W_n = \inf\{t : X(t) = n\}`} /> = time to <InlineMath math="n" />-th event</li>
              <li>Key identity: <InlineMath math={String.raw`\{W_n \leq t\} = \{X(t) \geq n\}`} /></li>
              <li><InlineMath math={String.raw`W_n \sim \text{Gamma}(n, \lambda)`} /></li>
              <li><InlineMath math={String.raw`E[W_n] = n/\lambda`} /></li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <h4 className="text-emerald-400 font-bold mb-2">Sojourn Times</h4>
            <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
              <li><InlineMath math={String.raw`S_n = W_{n+1} - W_n`} /> = inter-arrival time</li>
              <li><InlineMath math={String.raw`S_k \overset{\text{iid}}{\sim} \text{Exp}(\lambda)`} /></li>
              <li><InlineMath math={String.raw`W_n = S_0 + S_1 + \cdots + S_{n-1}`} /></li>
              <li>Memoryless property of exponential enables independence</li>
            </ul>
          </div>
        </div>
      </Section>
    </div>
  )
}
