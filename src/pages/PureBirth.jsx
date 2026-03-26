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

/* ═══════════════════════════════════════════════════════
   1. POD PEOPLE INVASION SIMULATOR
   ═══════════════════════════════════════════════════════ */
function PodPeopleSimulator() {
  const [N, setN] = useState(200)
  const [alpha, setAlpha] = useState(1.0)
  const [running, setRunning] = useState(false)
  const [pathData, setPathData] = useState(null)
  const canvasRef = useRef(null)
  const rateCanvasRef = useRef(null)
  const animRef = useRef(null)
  const simRef = useRef(null)

  const lambdaK = useCallback((k) => {
    if (k <= 0 || k >= N) return 0
    return (N - k) * k * alpha / (N - 1)
  }, [N, alpha])

  const reset = useCallback(() => {
    setRunning(false)
    setPathData(null)
    simRef.current = null
    cancelAnimationFrame(animRef.current)
  }, [])

  // Run simulation
  useEffect(() => {
    if (!running) { cancelAnimationFrame(animRef.current); return }

    if (!simRef.current) {
      simRef.current = { t: 0, k: 1, points: [{ t: 0, k: 1 }] }
    }

    const tick = () => {
      const sim = simRef.current
      const batchSize = 5
      for (let b = 0; b < batchSize; b++) {
        if (sim.k >= N) { setRunning(false); return }
        const rate = lambdaK(sim.k)
        if (rate <= 0) { setRunning(false); return }
        // Generate exponential waiting time
        const u = Math.random()
        const dt = -Math.log(u) / rate
        sim.t += dt
        sim.k += 1
        sim.points.push({ t: sim.t, k: sim.k })
      }
      setPathData({ points: [...sim.points], maxT: sim.t })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [running, lambdaK, N])

  // Draw population path
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

    const padL = 55, padR = 20, padT = 25, padB = 40
    const plotW = W - padL - padR, plotH = H - padT - padB

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= 4; y++) {
      const val = Math.round(N * y / 4)
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText(`${val}`, padL - 6, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Population X(t)', padL - 30, padT - 10)

    if (!pathData || pathData.points.length < 2) {
      ctx.fillStyle = '#64748b'; ctx.font = '14px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Press Play to start the invasion!', W / 2, H / 2)
      return
    }

    const maxT = pathData.maxT || 1
    // X-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'
    for (let x = 0; x <= 4; x++) {
      const tVal = (maxT * x / 4).toFixed(1)
      const px = padL + (x / 4) * plotW
      ctx.fillText(tVal, px, padT + plotH + 18)
    }
    ctx.fillText('Time t', padL + plotW / 2, padT + plotH + 35)

    // Draw path (step function)
    ctx.strokeStyle = '#34d399'
    ctx.lineWidth = 2
    ctx.beginPath()
    const pts = pathData.points
    for (let i = 0; i < pts.length; i++) {
      const px = padL + (pts[i].t / maxT) * plotW
      const py = padT + plotH * (1 - pts[i].k / N)
      if (i === 0) ctx.moveTo(px, py)
      else {
        // Horizontal line then vertical step
        const prevPy = padT + plotH * (1 - pts[i - 1].k / N)
        ctx.lineTo(px, prevPy)
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()

    // N/2 line
    const halfY = padT + plotH * 0.5
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = 'rgba(251,191,36,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, halfY); ctx.lineTo(padL + plotW, halfY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'left'; ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.fillText(`N/2 = ${Math.floor(N / 2)}`, padL + plotW + 4, halfY + 3)

    // Current count
    const last = pts[pts.length - 1]
    ctx.fillStyle = '#34d399'; ctx.font = 'bold 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(`X(t) = ${last.k}`, padL + plotW - 5, padT + 15)

    // Title
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Pod People Population Over Time', W / 2, 15)
  }, [pathData, N])

  // Draw rate curve
  useEffect(() => {
    const canvas = rateCanvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 55, padR = 20, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB

    // Find max rate
    const maxRate = lambdaK(Math.floor(N / 2))

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= 4; y++) {
      const val = (maxRate * y / 4).toFixed(0)
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText(val, padL - 6, py + 3)
    }

    // X labels
    ctx.textAlign = 'center'
    for (let x = 0; x <= 4; x++) {
      const val = Math.round(N * x / 4)
      const px = padL + (x / 4) * plotW
      ctx.fillText(`${val}`, px, padT + plotH + 18)
    }
    ctx.fillText('k (current population)', padL + plotW / 2, padT + plotH + 32)

    // Draw curve
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let k = 0; k <= N; k++) {
      const rate = lambdaK(k)
      const px = padL + (k / N) * plotW
      const py = padT + plotH * (1 - rate / maxRate)
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Mark peak
    const peakK = Math.floor(N / 2)
    const peakPx = padL + (peakK / N) * plotW
    const peakPy = padT + plotH * (1 - 1)
    ctx.fillStyle = '#a78bfa'
    ctx.beginPath(); ctx.arc(peakPx, peakPy, 4, 0, 2 * Math.PI); ctx.fill()
    ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`Peak at k=${peakK}`, peakPx, peakPy - 10)

    // Title
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Birth Rate \u03BB_k = (N-k)k\u03B1/(N-1)', W / 2, 15)
  }, [N, alpha, lambdaK])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-3">Pod People Invasion Simulator (Example 6.1)</h3>
      <p className="text-slate-300 mb-4">
        Watch the pod people take over! Starting with 1 pod person in a population of{' '}
        <InlineMath math="N" />, the birth rate is{' '}
        <InlineMath math={String.raw`\lambda_k = \frac{(N-k)k\alpha}{N-1}`} />.
        Notice the characteristic <strong className="text-emerald-300">S-curve</strong>: slow start,
        explosive middle, slow finish.
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-24">N (pop):</span>
          <input type="range" min={50} max={1000} step={50} value={N}
            onChange={e => { setN(+e.target.value); reset() }}
            className="flex-1 accent-emerald-500" />
          <span className="text-sm font-mono text-emerald-400 w-12">{N}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-24">{'\u03B1'} (contact):</span>
          <input type="range" min={0.1} max={5} step={0.1} value={alpha}
            onChange={e => { setAlpha(+e.target.value); reset() }}
            className="flex-1 accent-emerald-500" />
          <span className="text-sm font-mono text-emerald-400 w-12">{alpha.toFixed(1)}</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setRunning(!running)} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 300 }} />
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={rateCanvasRef} className="w-full" style={{ height: 300 }} />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1 text-center">
        Left: population trajectory (S-curve). Right: birth rate peaks at <InlineMath math="k = N/2" />.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   2. EXPLOSION CRITERION EXPLORER
   ═══════════════════════════════════════════════════════ */
function ExplosionExplorer() {
  const [p, setP] = useState(1.0)
  const [a, setA] = useState(1.0)
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

    const padL = 55, padR = 20, padT = 30, padB = 40
    const plotW = W - padL - padR, plotH = H - padT - padB

    // Compute partial sums
    const maxN = 200
    const sums = [0]
    for (let i = 1; i <= maxN; i++) {
      const lam = a * Math.pow(i, p)
      sums.push(sums[i - 1] + 1 / lam)
    }
    const maxSum = sums[maxN]

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    const yMax = Math.min(maxSum, 100)
    for (let y = 0; y <= 4; y++) {
      const val = (yMax * y / 4).toFixed(1)
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText(val, padL - 6, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }

    // X-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'
    for (let x = 0; x <= 4; x++) {
      const val = Math.round(maxN * x / 4)
      const px = padL + (x / 4) * plotW
      ctx.fillText(`${val}`, px, padT + plotH + 18)
    }
    ctx.fillText('n', padL + plotW / 2, padT + plotH + 35)

    // Draw partial sum curve
    const explodes = p > 1
    ctx.strokeStyle = explodes ? '#ef4444' : '#34d399'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i <= maxN; i++) {
      const px = padL + (i / maxN) * plotW
      const py = padT + plotH * (1 - Math.min(sums[i], yMax) / yMax)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Draw asymptote if converges
    if (explodes) {
      // Compute limit more precisely (more terms)
      let limit = 0
      for (let i = 1; i <= 10000; i++) {
        limit += 1 / (a * Math.pow(i, p))
      }
      if (limit < yMax) {
        const limY = padT + plotH * (1 - limit / yMax)
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = 'rgba(239,68,68,0.6)'
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(padL, limY); ctx.lineTo(padL + plotW, limY); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#ef4444'; ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
        ctx.fillText(`Limit \u2248 ${limit.toFixed(2)} (EXPLOSION!)`, padL + 10, limY - 8)
      }
    }

    // Status label
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    if (Math.abs(p - 1) < 0.01) {
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('p = 1: CRITICAL (harmonic series, diverges \u2192 no explosion)', W / 2, padT - 10)
    } else if (explodes) {
      ctx.fillStyle = '#ef4444'
      ctx.fillText(`p = ${p.toFixed(1)} > 1: Sum CONVERGES \u2192 EXPLOSION!`, W / 2, padT - 10)
    } else {
      ctx.fillStyle = '#34d399'
      ctx.fillText(`p = ${p.toFixed(1)} \u2264 1: Sum DIVERGES \u2192 No explosion`, W / 2, padT - 10)
    }

    // Y-axis label
    ctx.save()
    ctx.translate(12, padT + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('\u2211 1/\u03BB_i', 0, 0)
    ctx.restore()
  }, [p, a])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-red-400 mb-3">Explosion Criterion Explorer</h3>
      <p className="text-slate-300 mb-4">
        Set <InlineMath math={String.raw`\lambda_k = a \cdot k^p`} /> and watch the partial sums{' '}
        <InlineMath math={String.raw`\sum_{i=1}^{n} 1/\lambda_i`} />.
        When <InlineMath math="p > 1" /> the sum converges and the process <strong className="text-red-400">explodes</strong>.
        When <InlineMath math={String.raw`p \leq 1`} /> the sum diverges and <strong className="text-emerald-400">no explosion</strong> occurs.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-16">p:</span>
          <input type="range" min={0.5} max={3} step={0.1} value={p}
            onChange={e => setP(+e.target.value)}
            className="flex-1 accent-red-500" />
          <span className={`text-sm font-mono w-12 font-bold ${Math.abs(p - 1) < 0.01 ? 'text-amber-400' : p > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{p.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-16">a:</span>
          <input type="range" min={0.1} max={5} step={0.1} value={a}
            onChange={e => setA(+e.target.value)}
            className="flex-1 accent-red-500" />
          <span className="text-sm font-mono text-slate-300 w-12">{a.toFixed(1)}</span>
        </label>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className={`p-2 rounded-lg border ${p < 1 ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700'}`}>
          <span className="text-emerald-400 font-bold">p &lt; 1</span>
          <p className="text-slate-400 text-xs mt-1">Sum diverges. No explosion.</p>
        </div>
        <div className={`p-2 rounded-lg border ${Math.abs(p - 1) < 0.01 ? 'border-amber-500 bg-amber-900/20' : 'border-slate-700'}`}>
          <span className="text-amber-400 font-bold">p = 1</span>
          <p className="text-slate-400 text-xs mt-1">Harmonic series. Diverges (barely!).</p>
        </div>
        <div className={`p-2 rounded-lg border ${p > 1 ? 'border-red-500 bg-red-900/20' : 'border-slate-700'}`}>
          <span className="text-red-400 font-bold">p &gt; 1</span>
          <p className="text-slate-400 text-xs mt-1">Sum converges. EXPLOSION!</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   3. YULE PROCESS (VAMPIRE) SIMULATOR
   ═══════════════════════════════════════════════════════ */
function YuleSimulator() {
  const [beta, setBeta] = useState(0.5)
  const [running, setRunning] = useState(false)
  const [numPaths, setNumPaths] = useState(5)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const simRef = useRef(null)

  const maxTime = 8

  const reset = useCallback(() => {
    setRunning(false)
    simRef.current = null
    cancelAnimationFrame(animRef.current)
    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, rect.width, rect.height)
    }
  }, [])

  // Run simulation
  useEffect(() => {
    if (!running) { cancelAnimationFrame(animRef.current); return }

    if (!simRef.current) {
      // Initialize multiple paths
      const paths = []
      for (let p = 0; p < numPaths; p++) {
        paths.push({ t: 0, k: 1, points: [{ t: 0, k: 1 }], done: false })
      }
      simRef.current = { paths }
    }

    const tick = () => {
      const sim = simRef.current
      let anyActive = false

      for (let p = 0; p < sim.paths.length; p++) {
        const path = sim.paths[p]
        if (path.done) continue

        const batchSize = 3
        for (let b = 0; b < batchSize; b++) {
          if (path.t >= maxTime || path.k > 500) { path.done = true; break }
          const rate = beta * path.k
          const u = Math.random()
          const dt = -Math.log(u) / rate
          path.t += dt
          if (path.t >= maxTime) { path.done = true; break }
          path.k += 1
          path.points.push({ t: path.t, k: path.k })
        }
        if (!path.done) anyActive = true
      }

      // Draw
      drawYulePaths(sim.paths)

      if (anyActive) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setRunning(false)
      }
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [running, beta, numPaths, maxTime])

  const drawYulePaths = useCallback((paths) => {
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

    const padL = 55, padR = 60, padT = 25, padB = 40
    const plotW = W - padL - padR, plotH = H - padT - padB

    // Find max population across all paths
    let maxK = 10
    for (const path of paths) {
      for (const pt of path.points) {
        if (pt.k > maxK) maxK = pt.k
      }
    }
    // Round up to next nice number
    const expectedMax = Math.exp(beta * maxTime)
    maxK = Math.max(maxK, Math.ceil(expectedMax * 1.2), 20)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= 4; y++) {
      const val = Math.round(maxK * y / 4)
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText(`${val}`, padL - 6, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }

    // X-axis labels
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'
    for (let x = 0; x <= 4; x++) {
      const tVal = (maxTime * x / 4).toFixed(1)
      const px = padL + (x / 4) * plotW
      ctx.fillText(tVal, px, padT + plotH + 18)
    }
    ctx.fillText('Time t', padL + plotW / 2, padT + plotH + 35)

    // Draw E[X(t)] = e^{beta*t}
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2.5
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * maxTime
      const val = Math.exp(beta * t)
      const px = padL + (t / maxTime) * plotW
      const py = padT + plotH * (1 - Math.min(val, maxK) / maxK)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Label for expected value
    const labelT = maxTime * 0.7
    const labelVal = Math.exp(beta * labelT)
    if (labelVal < maxK) {
      const lx = padL + plotW + 5
      const ly = padT + plotH * (1 - labelVal / maxK)
      ctx.fillStyle = '#fbbf24'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
      ctx.fillText('E[X(t)]', lx, ly + 3)
    }

    // Draw sample paths
    for (let p = 0; p < paths.length; p++) {
      const path = paths[p]
      const color = LINE_COLORS[p % LINE_COLORS.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < path.points.length; i++) {
        const pt = path.points[i]
        const px = padL + (pt.t / maxTime) * plotW
        const py = padT + plotH * (1 - Math.min(pt.k, maxK) / maxK)
        if (i === 0) ctx.moveTo(px, py)
        else {
          const prevPt = path.points[i - 1]
          const prevPy = padT + plotH * (1 - Math.min(prevPt.k, maxK) / maxK)
          ctx.lineTo(px, prevPy)
          ctx.lineTo(px, py)
        }
      }
      ctx.stroke()

      // End label
      const last = path.points[path.points.length - 1]
      const endPx = padL + plotW + 5
      const endPy = padT + plotH * (1 - Math.min(last.k, maxK) / maxK)
      ctx.fillStyle = color; ctx.font = '9px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(`${last.k}`, endPx, endPy + 3 + p * 11)
    }

    // Title
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Yule Process Sample Paths', W / 2, 15)
  }, [beta, maxTime])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-purple-400 mb-3">Yule Process (Vampire) Simulator</h3>
      <p className="text-slate-300 mb-4">
        Each vampire independently bites a normal person at rate <InlineMath math="\beta" />.
        With <InlineMath math="k" /> vampires, the total bite rate is{' '}
        <InlineMath math={String.raw`\lambda_k = \beta k`} />.
        The dashed gold curve shows <InlineMath math={String.raw`E[X(t)] = e^{\beta t}`} />.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-20">{'\u03B2'} (bite rate):</span>
          <input type="range" min={0.1} max={2.0} step={0.1} value={beta}
            onChange={e => { setBeta(+e.target.value); reset() }}
            className="flex-1 accent-purple-500" />
          <span className="text-sm font-mono text-purple-400 w-10">{beta.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-slate-400 w-20">Paths:</span>
          <input type="range" min={1} max={8} step={1} value={numPaths}
            onChange={e => { setNumPaths(+e.target.value); reset() }}
            className="flex-1 accent-purple-500" />
          <span className="text-sm font-mono text-purple-400 w-10">{numPaths}</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => { if (!running) { simRef.current = null }; setRunning(!running) }}
          className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 340 }} />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-center">
        Colored lines = sample paths. Dashed gold = expected value <InlineMath math={String.raw`e^{\beta t}`} />.
        Individual paths exhibit huge variance around the mean.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function PureBirth() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            6.1 Pure Birth Processes
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          Generalizing the Poisson process: what happens when birth rates depend on the current population?
          From alien invasions to vampire plagues to electron avalanches.
        </p>
      </motion.div>

      {/* ─── Section 6.1.1: Poisson Process Review ─── */}
      <Section title="6.1.1 Poisson Process Postulates (Review)" id="poisson-review" color="from-blue-400 to-cyan-400">
        <p className="text-slate-300 mb-4">
          The Poisson process is a special case of pure birth processes. Recall the three equivalent
          ways to define <InlineMath math={String.raw`\{X(t) : t \in [0,\infty)\}`} /> as a Poisson process
          with rate <InlineMath math="\lambda" />:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="theorem-box">
            <h4 className="text-sm font-bold text-amber-400 mb-2">Postulate 1: Infinitesimal</h4>
            <p className="text-slate-300 text-sm mb-2">
              (i) <InlineMath math={String.raw`P(X(t+h) - X(t) = 1 | X(t) = k) = \lambda h + o(h)`} />
            </p>
            <p className="text-slate-300 text-sm mb-2">
              (ii) <InlineMath math={String.raw`P(X(t+h) - X(t) = 0 | X(t) = k) = 1 - \lambda h + o(h)`} />
            </p>
            <p className="text-slate-300 text-sm">
              (iii) <InlineMath math="X(0) = 0" />
            </p>
          </div>
          <div className="theorem-box">
            <h4 className="text-sm font-bold text-amber-400 mb-2">Postulate 2: Marginal Distribution</h4>
            <p className="text-slate-300 text-sm mb-2">
              (i) Independent increments
            </p>
            <p className="text-slate-300 text-sm mb-2">
              (ii) <InlineMath math={String.raw`X(t+s) - X(s) \sim \mathcal{P}(\lambda t)`} />
            </p>
            <p className="text-slate-300 text-sm">
              (iii) <InlineMath math="X(0) = 0" />
            </p>
          </div>
          <div className="theorem-box">
            <h4 className="text-sm font-bold text-amber-400 mb-2">Postulate 3: Sojourn Times</h4>
            <p className="text-slate-300 text-sm mb-2">
              (i) Sojourn times <InlineMath math={String.raw`S_0, S_1, S_2, \ldots`} /> are independent
            </p>
            <p className="text-slate-300 text-sm mb-2">
              (ii) <InlineMath math={String.raw`S_k \sim \text{Exp}(\lambda)`} /> for all <InlineMath math="k" />
            </p>
            <p className="text-slate-300 text-sm">
              (iii) <InlineMath math="X(0) = 0" />
            </p>
          </div>
        </div>

        <p className="text-slate-400 text-sm">
          The key feature of the Poisson process is that the rate <InlineMath math="\lambda" /> is <strong className="text-slate-200">constant</strong>,
          regardless of the current state. The pure birth process generalizes this by allowing{' '}
          <strong className="text-emerald-300">state-dependent rates</strong>.
        </p>
      </Section>

      {/* ─── Section 6.1.2: Pure Birth Process Definition ─── */}
      <Section title="6.1.2 Pure Birth Process" id="pure-birth-def" color="from-emerald-400 to-green-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Pure Birth Process)</h4>
          <p className="text-slate-300 mb-3">
            <InlineMath math={String.raw`\{X(t) : t \in [0,\infty)\}`} /> is called a <strong className="text-indigo-300">pure birth process</strong> with
            parameters (birth rates) <InlineMath math={String.raw`\lambda_0, \lambda_1, \ldots`} /> if it is a nondecreasing
            nonneg integer-valued continuous time MC with nondecreasing path satisfying one of the following postulates:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="theorem-box">
            <h4 className="text-sm font-bold text-amber-400 mb-2">Postulate 1: Infinitesimal</h4>
            <p className="text-slate-300 text-sm mb-2">
              (i) <InlineMath math={String.raw`P(X(t+h) - X(t) = 1 | X(t) = k) = \lambda_k h + o(h)`} />
            </p>
            <p className="text-slate-300 text-sm mb-2">
              (ii) <InlineMath math={String.raw`P(X(t+h) - X(t) = 0 | X(t) = k) = 1 - \lambda_k h + o(h)`} />
            </p>
            <p className="text-slate-300 text-sm">
              (iii) <InlineMath math="X(0) = 0" />
            </p>
          </div>
          <div className="theorem-box">
            <h4 className="text-sm font-bold text-amber-400 mb-2">Postulate 2: Marginal (incomplete)</h4>
            <p className="text-slate-300 text-sm mb-2">
              With <InlineMath math={String.raw`P_n(t) = P(X(t) = n | X(0) = 0)`} />:
            </p>
            <div className="text-sm">
              <BlockMath math={String.raw`P_n(t) = \lambda_{n-1} e^{-\lambda_n t} \int_0^t e^{\lambda_n s} P_{n-1}(s)\,ds`} />
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Note: Postulate 2 is incomplete for general pure birth processes.
            </p>
          </div>
          <div className="theorem-box">
            <h4 className="text-sm font-bold text-amber-400 mb-2">Postulate 3: Sojourn Times</h4>
            <p className="text-slate-300 text-sm mb-2">
              (i) Sojourn times <InlineMath math={String.raw`S_0, S_1, \ldots`} /> are independent
            </p>
            <p className="text-slate-300 text-sm mb-2">
              (ii) <InlineMath math={String.raw`S_k \sim \text{Exp}(\lambda_k)`} />, i.e., <InlineMath math={String.raw`f_{S_k}(t) = \lambda_k e^{-\lambda_k t}`} />
            </p>
            <p className="text-slate-300 text-sm">
              (iii) <InlineMath math="X(0) = 0" />
            </p>
          </div>
        </div>

        <p className="text-slate-300 mb-6">
          The key difference from Poisson: the rate <InlineMath math={String.raw`\lambda_k`} />{' '}
          <strong className="text-emerald-300">depends on the current state</strong> <InlineMath math="k" />.
          In state <InlineMath math="k" />, the process waits an{' '}
          <InlineMath math={String.raw`\text{Exp}(\lambda_k)`} /> time before jumping to state <InlineMath math="k+1" />.
        </p>

        {/* Example 6.1 */}
        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Example 6.1: The Invasion (Pod People)</h4>
          <p className="text-slate-300 mb-3">
            From the 2007 movie <em>Invasion</em>: an alien life form transforms humans into emotionless pod people (PP).
            Every PP, at any time <InlineMath math="(t, t + \Delta t)" />, has chance{' '}
            <InlineMath math={String.raw`\alpha \Delta t`} /> to make a "lethal" contact with one random person and transform them into PP.
          </p>
          <p className="text-slate-300 mb-3">
            Let <InlineMath math="N" /> be the total population and <InlineMath math="X(t)" /> be the number of PP by time{' '}
            <InlineMath math="t" />. With <InlineMath math="X(0) = 1" />:
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`P(X(t + \Delta t) - X(t) = 1 | X(t) = k) = (N-k) \cdot \frac{k\alpha}{N-1} \cdot \Delta t + o(\Delta t)`} />
          </div>
          <p className="text-slate-300 mb-2">
            This is a pure birth process with rates:
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`\lambda_k = \frac{(N-k)k\alpha}{N-1}, \quad k = 1, \ldots, N`} />
          </div>
          <p className="text-slate-300 mb-3">
            The rate <InlineMath math={String.raw`\lambda_k`} /> is maximized at <InlineMath math="k = N/2" /> (half infected).
            The growth follows an <strong className="text-emerald-300">S-shaped curve</strong>: slow at the
            beginning (few PP to spread), fastest in the middle, then slowing as few normal people remain.
          </p>
          <p className="text-slate-300">
            The expected time for the entire population to turn PP is{' '}
            <InlineMath math={String.raw`\sum_{k=1}^{N-1} 1/\lambda_k = \frac{2(N-1)}{N\alpha} \sum_{k=1}^{N-1} 1/k`} />.
            For <InlineMath math={String.raw`N = 6.76 \times 10^9`} /> and <InlineMath math={String.raw`\alpha = 1`} />,
            this is about 46.4 days.
          </p>
        </div>

        <PodPeopleSimulator />
      </Section>

      {/* ─── Section 6.1.3: Differential Equations ─── */}
      <Section title="6.1.3 Differential Equations" id="diff-eq" color="from-amber-400 to-yellow-400">
        <p className="text-slate-300 mb-4">
          Setting <InlineMath math={String.raw`P_n(t) = P(X(t) = n)`} />, we can derive a system of ODEs
          governing the state probabilities.
        </p>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Theorem: Kolmogorov Forward Equations</h4>
          <p className="text-slate-300 mb-3">
            With <InlineMath math={String.raw`P_0(0) = 1`} /> and <InlineMath math={String.raw`P_n(0) = 0`} /> for{' '}
            <InlineMath math={String.raw`n \geq 1`} />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`\begin{cases} P_0'(t) = -\lambda_0 P_0(t) \\ P_n'(t) = -\lambda_n P_n(t) + \lambda_{n-1} P_{n-1}(t) & n \geq 1 \end{cases}`} />
          </div>
          <p className="text-slate-400 text-sm mt-3">
            The first equation says: the probability of still being in state 0 decreases at rate{' '}
            <InlineMath math={String.raw`\lambda_0`} />. The second says: probability flows{' '}
            <em>into</em> state <InlineMath math="n" /> from state <InlineMath math="n-1" /> (at rate{' '}
            <InlineMath math={String.raw`\lambda_{n-1}`} />) and flows <em>out</em> to state{' '}
            <InlineMath math="n+1" /> (at rate <InlineMath math={String.raw`\lambda_n`} />).
          </p>
        </div>

        <Collapsible title="Proof (click to expand)">
          <div className="text-slate-300 space-y-3 text-sm">
            <p>
              <strong className="text-slate-200">For <InlineMath math={String.raw`n \geq 1`} /> and small <InlineMath math="h > 0" />:</strong>
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`P_n(t+h) = P(X(t+h) = n) = \sum_{k=0}^{\infty} P(X(t+h) = n | X(t) = k) P(X(t) = k)`} />
            </div>
            <p>Only terms <InlineMath math="k = n" /> and <InlineMath math="k = n-1" /> contribute significantly:</p>
            <div className="math-block">
              <BlockMath math={String.raw`P_n(t+h) = o(h) + P_n(t)(1 - \lambda_n h) + P_{n-1}(t) \lambda_{n-1} h`} />
            </div>
            <p>Rearranging and taking the limit as <InlineMath math={String.raw`h \downarrow 0`} />:</p>
            <div className="math-block">
              <BlockMath math={String.raw`P_n'(t) = \lim_{h \downarrow 0} \frac{P_n(t+h) - P_n(t)}{h} = -\lambda_n P_n(t) + \lambda_{n-1} P_{n-1}(t)`} />
            </div>
            <p>
              The first equation <InlineMath math={String.raw`P_0'(t) = -\lambda_0 P_0(t)`} /> can be derived similarly
              (DIY!), giving <InlineMath math={String.raw`P_0(t) = e^{-\lambda_0 t}`} />.
            </p>
          </div>
        </Collapsible>

        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <h4 className="text-sm font-bold text-slate-200 mb-2">Explicit Solution (when all rates are distinct)</h4>
          <p className="text-slate-300 text-sm mb-3">
            If <InlineMath math={String.raw`\lambda_0, \ldots, \lambda_n`} /> are all distinct, the solution is:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_n(t) = \lambda_0 \cdots \lambda_{n-1} \Big[ B_{0,n} e^{-\lambda_0 t} + \cdots + B_{n,n} e^{-\lambda_n t} \Big]`} />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            where <InlineMath math={String.raw`B_{i,n} = \prod_{j \neq i} \frac{1}{\lambda_j - \lambda_i}`} />.
            In particular, <InlineMath math={String.raw`P_0(t) = e^{-\lambda_0 t}`} />.
          </p>
        </div>
      </Section>

      {/* ─── Section 6.1.4: Explosion ─── */}
      <Section title='6.1.4 "Explosion" of a Pure Process' id="explosion" color="from-red-400 to-orange-400">
        <p className="text-slate-300 mb-4">
          A startling possibility: if the birth rates <InlineMath math={String.raw`\lambda_k`} /> grow fast enough,
          the population can reach <strong className="text-red-400">infinity in finite time</strong>!
          This is called <em>explosion</em>.
        </p>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-orange-400 mb-2">Example 6.2: The Electron Avalanche</h4>
          <p className="text-slate-300 mb-3">
            Free electrons in a strong electric field collide, releasing new electrons. Starting with{' '}
            <InlineMath math={String.raw`X(0) = m \geq 2`} /> electrons, any pair of electrons can collide
            and produce a new electron with rate <InlineMath math="\alpha" />.
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`\lambda_k = \binom{k}{2}\alpha = \frac{k(k-1)}{2}\alpha`} />
          </div>
          <p className="text-slate-300">
            Since <InlineMath math={String.raw`\lambda_k`} /> grows like <InlineMath math={String.raw`k^2`} />, the rates grow
            fast enough to cause explosion -- the electron count reaches infinity in finite time, causing an avalanche.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Theorem: Explosion Criterion</h4>
          <p className="text-slate-300 mb-3">
            Define <InlineMath math={String.raw`T = \min\{t : X(s) \uparrow \infty \text{ as } s \uparrow t\}`} /> (the explosion time).
            Then:
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`\sum_{i=0}^{\infty} \frac{1}{\lambda_i} < \infty \iff P(T < \infty) = 1 \iff E(T) < \infty \iff \textbf{Explosion}`} />
          </div>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`\sum_{i=0}^{\infty} \frac{1}{\lambda_i} = \infty \iff P(X(t) < \infty) = 1 \text{ for all finite } t \iff \textbf{No Explosion}`} />
          </div>
          <p className="text-slate-400 text-sm mt-3">
            <strong className="text-slate-200">Intuition:</strong> Since <InlineMath math={String.raw`T = \sum_{i=0}^{\infty} S_i`} /> and{' '}
            <InlineMath math={String.raw`E(S_i) = 1/\lambda_i`} />, the expected explosion time is{' '}
            <InlineMath math={String.raw`E(T) = \sum 1/\lambda_i`} />. If this sum is finite, explosion happens in finite expected time.
          </p>
        </div>

        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-6">
          <h4 className="text-sm font-bold text-slate-200 mb-2">
            Key Example: <InlineMath math={String.raw`\lambda_k = a \cdot k^p`} />
          </h4>
          <p className="text-slate-300 text-sm mb-2">
            The sum <InlineMath math={String.raw`\sum 1/\lambda_i = (1/a) \sum 1/k^p`} /> is a <em>p-series</em>:
          </p>
          <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside ml-2">
            <li><InlineMath math={String.raw`p \leq 1`} />: Sum diverges (harmonic series or slower) -- <strong className="text-emerald-400">no explosion</strong></li>
            <li><InlineMath math="p > 1" />: Sum converges -- <strong className="text-red-400">explosion!</strong></li>
            <li>The <strong className="text-amber-400">critical case</strong> is <InlineMath math="p = 1" /> (Yule process: <InlineMath math={String.raw`\lambda_k = \beta k`} />), which does <em>not</em> explode</li>
          </ul>
        </div>

        <ExplosionExplorer />
      </Section>

      {/* ─── Section 6.1.5: The Yule Process ─── */}
      <Section title="6.1.5 The Yule Process (Linear Pure Birth)" id="yule" color="from-purple-400 to-pink-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Yule Process)</h4>
          <p className="text-slate-300 mb-3">
            A pure birth process with <strong className="text-indigo-300">linear rates</strong>{' '}
            <InlineMath math={String.raw`\lambda_k = \beta k`} /> for <InlineMath math={String.raw`k \geq 1`} /> is called
            the <strong className="text-indigo-300">Yule process</strong> (or linear pure birth process).
            By convention, <InlineMath math="X(0) = 1" />.
          </p>
          <p className="text-slate-300">
            <strong className="text-slate-200">Interpretation:</strong> Each individual independently "reproduces"
            at rate <InlineMath math="\beta" />. With <InlineMath math="k" /> individuals, the total reproduction rate is{' '}
            <InlineMath math={String.raw`\beta k`} />. This models cell division, species branching, and -- of course -- vampire biting.
          </p>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-purple-400 mb-2">Example 6.3: Interview with Vampire</h4>
          <p className="text-slate-300 mb-3">
            From the 1994 movie based on Anne Rice's novel: assume the world population of normal people is infinite.
            Every vampire, being immortal, independently bites a normal person and turns them into a vampire at rate{' '}
            <InlineMath math="\beta" />.
            Let <InlineMath math="X(t)" /> be the number of vampires at time <InlineMath math="t" /> with{' '}
            <InlineMath math="X(0) = 1" />.
          </p>
          <p className="text-slate-300 mb-3">
            Then <InlineMath math={String.raw`\{X(t)\}`} /> is a Yule process. If{' '}
            <InlineMath math={String.raw`\beta = 1`} /> (one bite per month on average):
          </p>
          <ul className="text-slate-300 space-y-1 list-disc list-inside ml-2 mb-3">
            <li>After 1 year: <InlineMath math={String.raw`E[X(12)] = e^{12} = 162{,}754`} /> vampires</li>
            <li>After 2 years: <InlineMath math={String.raw`E[X(24)] = e^{24} \approx 26.5`} /> billion -- about 4 times the current world population!</li>
          </ul>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Theorem: Marginal Distribution of Yule Process</h4>
          <p className="text-slate-300 mb-3">
            For the Yule process with <InlineMath math={String.raw`\lambda_k = \beta k`} /> and{' '}
            <InlineMath math="X(0) = 1" />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_n(t) = P(X(t) = n) = e^{-\beta t}(1 - e^{-\beta t})^{n-1}, \quad n \geq 1`} />
          </div>
          <p className="text-slate-400 text-sm mt-3">
            This is a <strong className="text-slate-200">Geometric distribution</strong> with success
            probability <InlineMath math={String.raw`e^{-\beta t}`} />! As <InlineMath math={String.raw`t \to \infty`} />,
            the probability shifts to ever larger values of <InlineMath math="n" />.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-amber-400 mb-3">Theorem: Expected Population</h4>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`E[X(t)] = \sum_{n=1}^{\infty} n P_n(t) = e^{\beta t}`} />
          </div>
          <p className="text-slate-300 text-sm">
            The expected population grows <strong className="text-amber-300">exponentially</strong>.
            Despite this explosive growth in expectation, the Yule process does{' '}
            <strong className="text-emerald-400">not</strong> explode (since{' '}
            <InlineMath math={String.raw`\sum 1/\lambda_k = (1/\beta)\sum 1/k = \infty`} />).
            Population reaches infinity only as <InlineMath math={String.raw`t \to \infty`} />, not in finite time.
          </p>
        </div>

        <Collapsible title="Why the Yule process does not explode (click to expand)">
          <div className="text-slate-300 space-y-3 text-sm">
            <p>
              Even though <InlineMath math={String.raw`E[X(t)] = e^{\beta t} \to \infty`} />, this does not mean
              explosion. Explosion requires{' '}
              <InlineMath math={String.raw`P(X(t) = \infty) > 0`} /> for some finite <InlineMath math="t" />.
            </p>
            <p>
              The explosion criterion gives us: <InlineMath math={String.raw`\sum_{k=1}^{\infty} \frac{1}{\lambda_k} = \frac{1}{\beta} \sum_{k=1}^{\infty} \frac{1}{k} = \infty`} /> (harmonic series diverges).
            </p>
            <p>
              Therefore <InlineMath math={String.raw`P(T = \infty) = 1`} /> -- explosion never happens.
              The population grows without bound, but it takes infinitely long to actually reach infinity.
            </p>
          </div>
        </Collapsible>

        <div className="mt-6">
          <YuleSimulator />
        </div>
      </Section>

      {/* ─── Key Takeaways ─── */}
      <Section title="Key Takeaways" id="takeaways" color="from-cyan-400 to-blue-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
            <h4 className="text-emerald-400 font-bold mb-2">Pure Birth = Generalized Poisson</h4>
            <p className="text-slate-300 text-sm">
              A pure birth process is a Poisson process with <strong className="text-slate-200">state-dependent rates</strong>{' '}
              <InlineMath math={String.raw`\lambda_k`} />. The process can only move up by 1 (births only, no deaths).
              The sojourn time in state <InlineMath math="k" /> is <InlineMath math={String.raw`\text{Exp}(\lambda_k)`} />.
            </p>
          </div>
          <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/50">
            <h4 className="text-amber-400 font-bold mb-2">Differential Equations</h4>
            <p className="text-slate-300 text-sm">
              The state probabilities satisfy <InlineMath math={String.raw`P_n'(t) = -\lambda_n P_n(t) + \lambda_{n-1} P_{n-1}(t)`} />.
              This recursive structure allows computing <InlineMath math={String.raw`P_n(t)`} /> sequentially.
            </p>
          </div>
          <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/50">
            <h4 className="text-red-400 font-bold mb-2">Explosion Criterion</h4>
            <p className="text-slate-300 text-sm">
              <InlineMath math={String.raw`\sum 1/\lambda_i < \infty`} /> if and only if explosion occurs.
              For <InlineMath math={String.raw`\lambda_k = ak^p`} />, the critical threshold is{' '}
              <InlineMath math="p = 1" />: explosion when <InlineMath math="p > 1" />, no explosion when{' '}
              <InlineMath math={String.raw`p \leq 1`} />.
            </p>
          </div>
          <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
            <h4 className="text-purple-400 font-bold mb-2">Yule Process</h4>
            <p className="text-slate-300 text-sm">
              The linear pure birth process <InlineMath math={String.raw`\lambda_k = \beta k`} /> sits exactly at the
              critical boundary. It has geometric marginals{' '}
              <InlineMath math={String.raw`P_n(t) = e^{-\beta t}(1-e^{-\beta t})^{n-1}`} /> and exponential mean{' '}
              <InlineMath math={String.raw`E[X(t)] = e^{\beta t}`} />, but does not explode.
            </p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-6 p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
          <h4 className="text-cyan-400 font-bold mb-3">Looking Ahead</h4>
          <p className="text-slate-300 text-sm">
            Pure birth processes only allow the population to increase. In the next section, we will introduce{' '}
            <strong className="text-slate-200">birth-and-death processes</strong>, where the population can both
            increase and decrease -- modeling queues, population dynamics with mortality, and much more.
          </p>
        </motion.div>
      </Section>
    </div>
  )
}
