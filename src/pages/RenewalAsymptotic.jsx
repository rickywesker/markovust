import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

const LINE_COLORS = [
  '#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#22d3ee', '#e879f9', '#4ade80',
]

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

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-300">{title}</span>
        <span className="text-slate-500 text-lg">{open ? '▲' : '▼'}</span>
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

/* ─── Sampling helpers ─── */
function sampleExp(lambda) { return -Math.log(1 - Math.random()) / lambda }
function sampleUnif(a, b) { return a + Math.random() * (b - a) }
// Sample from density f(x) = θ − xθ²/2 on [0, 2/θ]. Inverse of F(x) = θx − θ²x²/4.
function sampleTriDensity(theta) {
  const u = Math.random()
  // F(x) = θx − (θ²/4) x² = u  ⇒  (θ²/4) x² − θx + u = 0
  // x = [θ − √(θ² − θ²u)] / (θ²/2) = (2/θ)(1 − √(1 − u))
  return (2 / theta) * (1 - Math.sqrt(1 - u))
}

/* Simulate one renewal path up to time T; returns array of event times [W_0, W_1, ..., W_n] */
function simulatePath(sampler, T, maxEvents = 2000) {
  const W = [0]
  let t = 0
  while (t < T && W.length < maxEvents) {
    t += sampler()
    if (t > T) break
    W.push(t)
  }
  return W
}

/* Standard normal pdf */
function normalPDF(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) }

/* ─── "From Notes" badge — marks examples taken directly from the course notes ─── */
function FromNotes({ label = 'Notes' }) {
  return (
    <span
      className="inline-flex items-center gap-1 ml-2 align-middle px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold tracking-wide uppercase"
      title="This example appears in the course notes"
    >
      <span aria-hidden="true">📖</span>
      <span>{label}</span>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════
   1. ELEMENTARY RENEWAL THEOREM VISUALIZER
   ═══════════════════════════════════════════════════════ */
function ERTVisualizer() {
  const [dist, setDist] = useState('exp')
  const [lambda, setLambda] = useState(1.0)
  const [Tmax, setTmax] = useState(50)
  const [paths, setPaths] = useState([])
  const canvasRef = useRef(null)

  const { sampler, mu } = useMemo(() => {
    if (dist === 'exp') return { sampler: () => sampleExp(lambda), mu: 1 / lambda }
    return { sampler: () => sampleUnif(0, 2 / lambda), mu: 1 / lambda }
  }, [dist, lambda])

  const regenerate = useCallback(() => {
    const numPaths = 30
    const newPaths = []
    for (let i = 0; i < numPaths; i++) newPaths.push(simulatePath(sampler, Tmax))
    setPaths(newPaths)
  }, [sampler, Tmax])

  useEffect(() => { regenerate() }, [regenerate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || paths.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 20, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB

    // Compute max N over paths for axis
    const maxN = Math.max(...paths.map(p => p.length - 1), 5)
    const yMax = maxN * 1.05
    const xFor = (t) => padL + (t / Tmax) * plotW
    const yFor = (n) => padT + plotH * (1 - n / yMax)

    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText(`Sample paths of N(t) vs theoretical mean t/μ   (μ = ${mu.toFixed(3)})`, W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    const yStep = Math.max(1, Math.ceil(yMax / 6))
    for (let y = 0; y <= yMax; y += yStep) {
      ctx.fillText(`${y}`, padL - 5, yFor(y) + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, yFor(y)); ctx.lineTo(padL + plotW, yFor(y)); ctx.stroke()
    }
    // X labels
    ctx.textAlign = 'center'
    for (let x = 0; x <= Tmax; x += Math.max(1, Math.ceil(Tmax / 6))) {
      ctx.fillText(`${x}`, xFor(x), padT + plotH + 14)
    }
    ctx.fillText('t', padL + plotW / 2, padT + plotH + 28)

    // Draw sample paths as step functions
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
      ctx.strokeStyle = LINE_COLORS[i % LINE_COLORS.length] + '90'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(xFor(0), yFor(0))
      for (let j = 1; j < path.length; j++) {
        ctx.lineTo(xFor(path[j]), yFor(j - 1))
        ctx.lineTo(xFor(path[j]), yFor(j))
      }
      const lastN = path.length - 1
      ctx.lineTo(xFor(Tmax), yFor(lastN))
      ctx.stroke()
    }

    // Theoretical line t/μ
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(xFor(0), yFor(0))
    ctx.lineTo(xFor(Tmax), yFor(Tmax / mu))
    ctx.stroke()

    // Legend
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('E[N(t)] ≈ t/μ', padL + plotW - 90, padT + 12)
  }, [paths, Tmax, mu])

  // Empirical M(t)/t at t = Tmax
  const meanCount = paths.length > 0 ? paths.reduce((s, p) => s + (p.length - 1), 0) / paths.length : 0
  const empiricalRate = Tmax > 0 ? meanCount / Tmax : 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-cyan-400 mb-3">Elementary Renewal Theorem — Visual Check</h3>
      <p className="text-slate-300 mb-4">
        30 sample paths of <InlineMath math="N(t)" /> against the theoretical line{' '}
        <InlineMath math="t / \mu" />. As <InlineMath math="t" /> grows, sample paths bunch around
        the line: <InlineMath math={String.raw`M(t)/t \to 1/\mu`} />.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={dist} onChange={e => setDist(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="exp">Exponential(λ)</option>
          <option value="unif">Uniform(0, 2/λ)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="\lambda" />
          <span className="font-mono text-amber-400 w-12 text-right">{lambda.toFixed(2)}</span>
          <input type="range" min={0.2} max={3} step={0.05} value={lambda}
            onChange={e => setLambda(+e.target.value)} className="w-24 accent-cyan-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>T</span>
          <span className="font-mono text-amber-400 w-12 text-right">{Tmax}</span>
          <input type="range" min={10} max={200} step={5} value={Tmax}
            onChange={e => setTmax(+e.target.value)} className="w-32 accent-cyan-500" />
        </label>
        <button onClick={regenerate} className="btn-primary text-sm !px-4 !py-2">Resample</button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 300 }} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500">Empirical <InlineMath math="M(T)/T" /></div>
          <div className="text-emerald-400 font-mono font-bold">{empiricalRate.toFixed(4)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500">Theoretical <InlineMath math="1/\mu" /></div>
          <div className="text-amber-400 font-mono font-bold">{(1 / mu).toFixed(4)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500">Relative gap</div>
          <div className="text-cyan-400 font-mono font-bold">
            {mu > 0 ? `${((empiricalRate - 1 / mu) / (1 / mu) * 100).toFixed(2)}%` : '—'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   2. CLT HISTOGRAM VISUALIZER
   ═══════════════════════════════════════════════════════ */
function CLTVisualizer() {
  const [dist, setDist] = useState('exp')
  const [T, setT] = useState(40)
  const [numReps, setNumReps] = useState(800)
  const [Zvals, setZvals] = useState([])
  const canvasRef = useRef(null)

  const { sampler, mu, sigma2 } = useMemo(() => {
    if (dist === 'exp') {
      // Exp(1): μ = 1, σ² = 1
      return { sampler: () => sampleExp(1), mu: 1, sigma2: 1 }
    }
    if (dist === 'unif') {
      // Uniform(0, 2): μ = 1, σ² = 1/3
      return { sampler: () => sampleUnif(0, 2), mu: 1, sigma2: 1 / 3 }
    }
    // triangular, θ = 1: density f(x) = 1 − x/2 on [0, 2]; μ = 2/3, σ² = 2/9
    return { sampler: () => sampleTriDensity(1), mu: 2 / 3, sigma2: 2 / 9 }
  }, [dist])

  const regenerate = useCallback(() => {
    const Z = []
    const scale = Math.sqrt(T * sigma2 / (mu * mu * mu))
    for (let r = 0; r < numReps; r++) {
      // simulate one path, count events up to T
      let t = 0, n = 0
      while (true) {
        t += sampler()
        if (t > T) break
        n++
        if (n > 10000) break
      }
      Z.push((n - T / mu) / scale)
    }
    setZvals(Z)
  }, [sampler, T, mu, sigma2, numReps])

  useEffect(() => { regenerate() }, [regenerate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || Zvals.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 20, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB

    // Histogram
    const zMin = -4, zMax = 4
    const numBins = 40
    const binW = (zMax - zMin) / numBins
    const bins = new Array(numBins).fill(0)
    for (const z of Zvals) {
      if (z >= zMin && z < zMax) {
        bins[Math.floor((z - zMin) / binW)]++
      }
    }
    // Normalize to density
    const N = Zvals.length
    const density = bins.map(c => c / (N * binW))
    const maxD = Math.max(...density, 0.45)

    const xFor = (z) => padL + ((z - zMin) / (zMax - zMin)) * plotW
    const yFor = (d) => padT + plotH * (1 - d / maxD)

    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText(`Histogram of  Z = [N(T) − T/μ] / √(Tσ²/μ³)   vs  N(0,1)`, W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y labels (density)
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let yi = 0; yi <= 4; yi++) {
      const d = (yi / 4) * maxD
      ctx.fillText(d.toFixed(2), padL - 4, yFor(d) + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, yFor(d)); ctx.lineTo(padL + plotW, yFor(d)); ctx.stroke()
    }

    // X labels
    ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'
    for (let z = -4; z <= 4; z++) {
      ctx.fillText(`${z}`, xFor(z), padT + plotH + 14)
    }

    // Bars
    for (let b = 0; b < numBins; b++) {
      const zL = zMin + b * binW
      const zR = zL + binW
      const x0 = xFor(zL)
      const x1 = xFor(zR)
      const py = yFor(density[b])
      ctx.fillStyle = 'rgba(96,165,250,0.55)'
      ctx.fillRect(x0, py, x1 - x0 - 1, padT + plotH - py)
    }

    // Standard normal pdf
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const z = zMin + (i / 200) * (zMax - zMin)
      const d = normalPDF(z)
      const px = xFor(z)
      const py = yFor(d)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Legend
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('N(0, 1) pdf', padL + plotW - 95, padT + 14)

    // Sample stats
    const mean = Zvals.reduce((s, z) => s + z, 0) / N
    const variance = Zvals.reduce((s, z) => s + (z - mean) ** 2, 0) / N
    ctx.fillStyle = '#93c5fd'; ctx.textAlign = 'left'; ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillText(`n = ${N}    mean ≈ ${mean.toFixed(3)}    var ≈ ${variance.toFixed(3)}`, padL + 6, padT + 14)
  }, [Zvals])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-blue-400 mb-3">CLT for the Renewal Count N(t)</h3>
      <p className="text-slate-300 mb-4">
        Run many independent renewal processes up to time <InlineMath math="T" />, compute{' '}
        <InlineMath math={String.raw`Z = [N(T) - T/\mu] / \sqrt{T\sigma^2/\mu^3}`} />,
        and compare its empirical histogram to the standard normal pdf.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={dist} onChange={e => setDist(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="exp">Exp(1): μ=1, σ²=1</option>
          <option value="unif">Unif(0,2): μ=1, σ²=1/3</option>
          <option value="tri">Triangular: μ=2/3, σ²=2/9</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>T</span>
          <span className="font-mono text-amber-400 w-12 text-right">{T}</span>
          <input type="range" min={5} max={200} step={5} value={T}
            onChange={e => setT(+e.target.value)} className="w-28 accent-blue-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>reps</span>
          <span className="font-mono text-amber-400 w-14 text-right">{numReps}</span>
          <input type="range" min={100} max={3000} step={100} value={numReps}
            onChange={e => setNumReps(+e.target.value)} className="w-28 accent-blue-500" />
        </label>
        <button onClick={regenerate} className="btn-primary text-sm !px-4 !py-2">Resample</button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Small <InlineMath math="T" /> shows discrepancies (especially with skewed inter-arrivals); increase <InlineMath math="T" /> and
        watch the histogram snap onto the gold normal curve.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   3. MC-BASED RENEWAL (Example 7.5)
   ═══════════════════════════════════════════════════════ */
function MCRenewalVisualizer() {
  const [p00, setP00] = useState(0.4)
  const [p10, setP10] = useState(0.7)
  const [T, setT] = useState(200)
  const [running, setRunning] = useState(false)
  const [chain, setChain] = useState([0])
  const [visits, setVisits] = useState([0]) // N(t) = #visits to state 0 up to time t
  const animRef = useRef(null)
  const stateRef = useRef({ y: 0, t: 0 })
  const canvasRef = useRef(null)

  // Stationary distribution
  const p01 = 1 - p00
  const pi0 = p10 / (p10 + p01)
  const muVisit = 1 / pi0 // mean inter-visit time

  const reset = useCallback(() => {
    setRunning(false)
    stateRef.current = { y: 0, t: 0 }
    setChain([0])
    setVisits([0])
  }, [])

  useEffect(() => { reset() }, [p00, p10, reset])

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }
    animRef.current = setInterval(() => {
      const s = stateRef.current
      if (s.t >= T) { setRunning(false); return }
      // Step forward: if currently at 0, go to 0 with p00 else to 1
      const nextY = s.y === 0
        ? (Math.random() < p00 ? 0 : 1)
        : (Math.random() < p10 ? 0 : 1)
      s.y = nextY
      s.t += 1
      setChain(c => [...c, nextY])
      setVisits(v => {
        const last = v[v.length - 1]
        return [...v, last + (nextY === 0 ? 1 : 0)]
      })
    }, 50)
    return () => clearInterval(animRef.current)
  }, [running, p00, p10, T])

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

    const padL = 50, padR = 20, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB
    const maxT = Math.max(T, chain.length - 1)

    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText(`N(t) = #visits to state 0  vs  t·π₀`, W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    const maxN = Math.max(...visits, 1, Math.ceil(maxT * pi0 * 1.2))
    const xFor = (t) => padL + (t / maxT) * plotW
    const yFor = (n) => padT + plotH * (1 - n / maxN)

    // Y labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    const yStep = Math.max(1, Math.ceil(maxN / 6))
    for (let y = 0; y <= maxN; y += yStep) {
      ctx.fillText(`${y}`, padL - 5, yFor(y) + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, yFor(y)); ctx.lineTo(padL + plotW, yFor(y)); ctx.stroke()
    }

    // Theory line t · π₀
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 3])
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(0)); ctx.lineTo(xFor(maxT), yFor(maxT * pi0)); ctx.stroke()
    ctx.setLineDash([])

    // N(t) step path
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < visits.length; i++) {
      const px = xFor(i)
      const py = yFor(visits[i])
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Legend
    ctx.fillStyle = '#34d399'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(`N(t)`, padL + 5, padT + 14)
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(`slope = π₀ = ${pi0.toFixed(4)}`, padL + plotW - 130, padT + 14)
  }, [chain, visits, T, pi0])

  const n = chain.length - 1
  const empiricalRate = n > 0 ? visits[n] / n : 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-3">MC-Induced Renewal Process (Example 7.5)</h3>
      <p className="text-slate-300 mb-4">
        A 2-state DTMC with transition matrix{' '}
        <InlineMath math={String.raw`\mathbf{P} = \begin{pmatrix} p_{00} & 1-p_{00} \\ p_{10} & 1-p_{10} \end{pmatrix}`} />.
        Let <InlineMath math="N(t)" /> count visits to state 0 up to step <InlineMath math="t" />. The
        inter-visit times are iid (strong Markov), so <InlineMath math="N(t)" /> is a renewal process,
        and <InlineMath math={String.raw`N(t)/t \to \pi_0 = 1/\mu`} />.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="p_{00}" />
          <span className="font-mono text-amber-400 w-12 text-right">{p00.toFixed(2)}</span>
          <input type="range" min={0.05} max={0.95} step={0.05} value={p00}
            onChange={e => setP00(+e.target.value)} className="w-24 accent-emerald-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="p_{10}" />
          <span className="font-mono text-amber-400 w-12 text-right">{p10.toFixed(2)}</span>
          <input type="range" min={0.05} max={0.95} step={0.05} value={p10}
            onChange={e => setP10(+e.target.value)} className="w-24 accent-emerald-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>T</span>
          <span className="font-mono text-amber-400 w-14 text-right">{T}</span>
          <input type="range" min={50} max={1000} step={50} value={T}
            onChange={e => setT(+e.target.value)} className="w-24 accent-emerald-500" />
        </label>
        <button onClick={() => setRunning(!running)}
          className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 260 }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500"><InlineMath math="\pi_0" /> (theory)</div>
          <div className="text-amber-400 font-mono font-bold">{pi0.toFixed(4)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500"><InlineMath math="\mu = 1/\pi_0" /></div>
          <div className="text-amber-400 font-mono font-bold">{muVisit.toFixed(4)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500"><InlineMath math="N(t)/t" /> (empirical)</div>
          <div className="text-emerald-400 font-mono font-bold">{empiricalRate.toFixed(4)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500">step t</div>
          <div className="text-cyan-400 font-mono font-bold">{n}</div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        The default <InlineMath math="p_{00} = 0.4, p_{10} = 0.7" /> gives{' '}
        <InlineMath math={String.raw`\pi_0 = 7/13 \approx 0.5385`} /> and <InlineMath math={String.raw`\mu = 13/7 \approx 1.857`} />.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function RenewalAsymptotic() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            7.3 Asymptotic Behavior of Renewal Processes
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          Laws of large numbers, central limit theorems, and the length-biased limits of life times.
        </p>
      </motion.div>

      <div className="definition-box">
        <h4 className="text-lg font-bold text-indigo-400 mb-3">Setup</h4>
        <p className="text-slate-300 text-sm">
          Throughout this section, <InlineMath math={String.raw`X_1, X_2, \ldots \stackrel{iid}{\sim} F`} />{' '}
          are positive inter-occurrence times with mean <InlineMath math={String.raw`\mu = E(X_1)`} /> and
          variance <InlineMath math={String.raw`\sigma^2 = \mathrm{Var}(X_1)`} />.
          Waiting times are <InlineMath math={String.raw`W_n = \sum_{i=1}^n X_i`} /> (<InlineMath math="W_0 = 0" />),
          and <InlineMath math={String.raw`N(t) = \max\{n : W_n \leq t\}`} /> is the renewal process.
          The renewal function is <InlineMath math="M(t) = E[N(t)]" />.
        </p>
      </div>

      {/* ─── Section 7.3.1: Elementary Renewal Theorem ─── */}
      <Section title="7.3.1 The Elementary Renewal Theorem" id="ert" color="from-cyan-400 to-blue-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Elementary Renewal Theorem)</h4>
          <BlockMath math={String.raw`\lim_{t \to \infty} \frac{M(t)}{t} = \frac{1}{\mu}.`} />
          <p className="text-slate-300 mt-3">
            The average rate of renewals is the reciprocal of the mean inter-occurrence time — a natural LLN.
          </p>

          <Collapsible title="Derivation from the renewal theorem (7.2)" defaultOpen={false}>
            <div className="text-slate-300 space-y-3 text-sm">
              <p>Starting from the renewal theorem:</p>
              <BlockMath math={String.raw`E[W_{N(t)+1}] = [M(t) + 1]\, \mu. \qquad (7.4)`} />
              <p>Now observe <InlineMath math={String.raw`W_{N(t)+1} = t + \gamma_t`} /> where{' '}
              <InlineMath math={String.raw`\gamma_t`} /> is the residual life time. So:</p>
              <BlockMath math={String.raw`t + E(\gamma_t) = M(t)\mu + \mu
                \;\Longrightarrow\; \frac{M(t)}{t} = \frac{1}{\mu} + \frac{E(\gamma_t) - \mu}{t \mu}. \qquad (7.5)`} />
              <p>
                As <InlineMath math="t \to \infty" />, <InlineMath math={String.raw`E(\gamma_t)`} /> stays bounded
                (it has a finite limit, as we'll see in 7.3.4), so the second term vanishes.
              </p>
            </div>
          </Collapsible>
        </div>

        <ERTVisualizer />
      </Section>

      {/* ─── Section 7.3.2: Refined Renewal Theorem ─── */}
      <Section title="7.3.2 Refined Renewal Theorem" id="refined" color="from-violet-400 to-indigo-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Refined Renewal Theorem)</h4>
          <p className="text-slate-300 mb-3">Assume <InlineMath math="F" /> is continuous. Then</p>
          <BlockMath math={String.raw`\lim_{t \to \infty} \left[\, M(t) - \frac{t}{\mu}\,\right] = \frac{\sigma^2 - \mu^2}{2 \mu^2}. \qquad (7.6)`} />
          <p className="text-slate-300 mt-3">
            Equivalently, <InlineMath math={String.raw`M(t) = t/\mu + (\sigma^2 - \mu^2)/(2\mu^2) + o(1)`} />,
            a genuine refinement of (7.4) which only says <InlineMath math={String.raw`M(t) - t/\mu = o(t)`} />.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            A quick check: as <InlineMath math={String.raw`t \to \infty`} />, <InlineMath math="M'(t)" /> should
            tend to <InlineMath math={String.raw`1/\mu`} />. This is Blackwell's theorem in disguise.
          </p>
        </div>
      </Section>

      {/* ─── Section 7.3.3: Asymptotic Behavior of N(t) ─── */}
      <Section title="7.3.3 Law of Large Numbers and CLT for N(t)" id="clt" color="from-blue-400 to-cyan-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Asymptotics for N(t))</h4>
          <p className="text-slate-300 mb-3">As <InlineMath math="t \to \infty" />:</p>
          <BlockMath math={String.raw`\frac{E[N(t)]}{t} \to \frac{1}{\mu}, \qquad
            \frac{\mathrm{Var}(N(t))}{t} \to \frac{\sigma^2}{\mu^3},`} />
          <BlockMath math={String.raw`\frac{N(t) - t/\mu}{\sqrt{t\sigma^2/\mu^3}} \xrightarrow{d} \mathcal{N}(0, 1). \qquad (7.7)`} />
          <p className="text-slate-300 mt-3 text-sm">
            Heuristic: for large <InlineMath math="n" />,{' '}
            <InlineMath math={String.raw`W_n \approx n\mu + \sqrt{n}\,\sigma Z`} />. Inverting{' '}
            <InlineMath math={String.raw`\{N(t) \geq n\} = \{W_n \leq t\}`} /> gives{' '}
            <InlineMath math={String.raw`N(t) \approx t/\mu - \sqrt{t}\,\sigma/\mu^{3/2} Z`} /> — the CLT for counts
            is essentially the CLT for sums, re-indexed.
          </p>
        </div>

        <CLTVisualizer />
      </Section>

      {/* ─── Section 7.3.4: Asymptotic Distributions of δ_t, γ_t ─── */}
      <Section title="7.3.4 Asymptotic Distributions of γₜ, δₜ, βₜ" id="life-time-limits" color="from-rose-400 to-pink-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Limit of γₜ)</h4>
          <p className="text-slate-300 mb-3">Assume <InlineMath math="F" /> is continuous. For all <InlineMath math={String.raw`x \geq 0`} />,</p>
          <BlockMath math={String.raw`P(\gamma_t \leq x) \; \to \; \frac{1}{\mu} \int_0^x \!\!\big(1 - F(s)\big)\,ds. \qquad (7.8)`} />
          <p className="text-slate-300 mt-3 text-sm">
            This is the <em>equilibrium</em> (or <em>length-biased</em>) distribution. Its density
            is <InlineMath math={String.raw`(1 - F(x))/\mu`} />, which weighs longer inter-arrival times more heavily.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Joint limit of (δₜ, γₜ)</h4>
          <p className="text-slate-300 mb-3">Setting <InlineMath math="N(s) = 0" /> for <InlineMath math="s < 0" />,</p>
          <BlockMath math={String.raw`P(\delta_t > y,\, \gamma_t > x)
            = P\big(N(t+x) - N(t-y) = 0\big) = P(\gamma_{t-y} > x + y)
            \;\to\; \frac{1}{\mu}\int_{x+y}^{\infty} (1 - F(s))\,ds.`} />
          <p className="text-slate-300 mt-3">
            Letting <InlineMath math="x = 0" /> gives the marginal of <InlineMath math={String.raw`\delta_t`} />:
          </p>
          <BlockMath math={String.raw`P(\delta_t > y) \to \frac{1}{\mu}\int_y^{\infty} (1 - F(s))\,ds \; = \; P(\gamma_t > y).`} />
          <p className="text-slate-300">
            So <InlineMath math={String.raw`\delta_t`} /> and <InlineMath math={String.raw`\gamma_t`} /> share
            the same asymptotic marginal — the equilibrium distribution.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Expected Lifetimes</h4>
          <p className="text-slate-300 mb-3">By integrating the tail:</p>
          <BlockMath math={String.raw`E(\gamma_t) \;\to\; \int_0^{\infty} \!\!x\, \frac{1 - F(x)}{\mu}\,dx
            = \frac{1}{2\mu}\int_0^\infty x^2\,dF(x) = \frac{\sigma^2 + \mu^2}{2\mu}.`} />
          <p className="text-slate-300 mt-3">Consequently,</p>
          <BlockMath math={String.raw`\lim_{t \to \infty}\Big[E(\beta_t) - \mu\Big] = \frac{\sigma^2}{\mu}, \qquad
            \lim_{t \to \infty}\frac{E(\beta_t) - \mu}{\mu} = \frac{\sigma^2}{\mu^2}. \qquad (7.10')(7.10)`} />
          <p className="text-slate-300 mt-3">
            <strong className="text-amber-300">Key moral:</strong> the larger the variance of the inter-arrival
            times, the larger the upward bias of the total life time <InlineMath math={String.raw`\beta_t`} /> relative
            to an ordinary sojourn. Regularity protects 007 less.
          </p>
        </div>
      </Section>

      {/* ─── Example 7.4 ─── */}
      <Section
        title={<>Example 7.4: Triangular Density<FromNotes /></>}
        id="example-7-4"
        color="from-emerald-400 to-teal-400"
      >
        <div className="example-box mb-4">
          <p className="text-slate-300 mb-3">
            Suppose <InlineMath math={String.raw`X_1, X_2, \ldots \stackrel{iid}{\sim} f`} /> with density
          </p>
          <BlockMath math={String.raw`f(x) = \theta - x\theta^2/2, \qquad 0 \leq x \leq 2/\theta,\; \theta > 0.`} />
          <p className="text-slate-300 mt-3">Then</p>
          <BlockMath math={String.raw`F(x) = \theta x - \theta^2 x^2/4, \qquad
            \mu = \frac{2}{3\theta}, \qquad \sigma^2 = \frac{2}{9\theta^2}.`} />
        </div>

        <div className="theorem-box mb-4">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Applying the asymptotics</h4>
          <ol className="text-slate-300 space-y-3 text-sm list-decimal list-inside">
            <li>
              <strong>Elementary renewal theorem:</strong>{' '}
              <InlineMath math={String.raw`M(t)/t \to 1/\mu = 3\theta/2`} />.
            </li>
            <li>
              <strong>Refined renewal theorem:</strong>
              <BlockMath math={String.raw`M(t) = \frac{3\theta t}{2} + \frac{\sigma^2 - \mu^2}{2\mu^2} + o(1)
                = \frac{3\theta t}{2} + \frac{2/9 - 4/9}{2 \cdot 4/9} + o(1)
                = \frac{3\theta t}{2} - \frac{1}{4} + o(1).`} />
            </li>
            <li>
              <strong>CLT for N(t):</strong>
              <BlockMath math={String.raw`\frac{N(t) - 3\theta t/2}{\sqrt{3t\theta/4}} \xrightarrow{d} \mathcal{N}(0, 1).`} />
            </li>
            <li>
              <strong>Asymptotic distribution of γₜ (and δₜ):</strong>
              <BlockMath math={String.raw`P(\gamma_t < x) \;\to\; \frac{3\theta}{2}\left\{x - \frac{\theta x^2}{2} - \frac{\theta^2 x^3}{12}\right\},
                \quad 0 \leq x \leq 2/\theta.`} />
            </li>
            <li>
              <strong>Total life time bias:</strong>
              <BlockMath math={String.raw`\frac{E(\beta_t)}{\mu} \to 1 + \frac{\sigma^2}{\mu^2}
                = 1 + \frac{2/(9\theta^2)}{4/(9\theta^2)} = \frac{3}{2}.`} />
              <p className="text-slate-300 mt-2 text-sm">
                Independent of <InlineMath math={String.raw`\theta`} /> — a scaling invariance. (Same story
                for <InlineMath math="F \sim U(0, \theta)" />. But for <InlineMath math={String.raw`U(\theta, \theta + 1)`} />,
                larger <InlineMath math={String.raw`\theta`} /> means smaller relative bias.)
              </p>
            </li>
          </ol>
        </div>
      </Section>

      {/* ─── Example 7.5 ─── */}
      <Section
        title={<>Example 7.5: Renewal Processes Induced by a Markov Chain<FromNotes /></>}
        id="example-7-5"
        color="from-teal-400 to-emerald-400"
      >
        <div className="example-box mb-4">
          <p className="text-slate-300 mb-3">
            Let <InlineMath math={String.raw`\{Y_t : t = 0, 1, 2, \ldots\}`} /> be a DTMC on{' '}
            <InlineMath math={String.raw`\{0, 1\}`} /> with transition matrix
          </p>
          <BlockMath math={String.raw`\mathbf{P} = \begin{pmatrix} 0.4 & 0.6 \\ 0.7 & 0.3 \end{pmatrix}, \qquad Y_0 = 0.`} />
          <p className="text-slate-300 mt-3">
            Solving <InlineMath math={String.raw`\pi \mathbf{P} = \pi`} />, <InlineMath math="\pi_0 + \pi_1 = 1" />, we
            get <InlineMath math={String.raw`\pi_0 = 7/13`} />, <InlineMath math={String.raw`\pi_1 = 6/13`} />.
            Thus
          </p>
          <BlockMath math={String.raw`\lim_{t \to \infty} P(Y_t = 0) = 7/13, \qquad
            \lim_{t \to \infty} P(Y_t = 1) = 6/13,`} />
          <p className="text-slate-300">
            and time averages share these limits (ergodic theorem).
          </p>
        </div>

        <div className="theorem-box mb-4">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Case 1: <InlineMath math="N(t)" /> = #visits to state 0</h4>
          <p className="text-slate-300 mb-3">
            Set <InlineMath math={String.raw`W_1 = \min\{t > 0 : Y_t = 0\}`} />,{' '}
            <InlineMath math={String.raw`W_{k+1} = \min\{t > W_k : Y_t = 0\}`} />, and{' '}
            <InlineMath math={String.raw`X_k = W_k - W_{k-1}`} />.
            By the strong Markov property, <InlineMath math={String.raw`X_k`} /> are iid with
          </p>
          <BlockMath math={String.raw`P(X_k = n) = \begin{cases} 0.4 & n = 1 \\ 0.6 \times 0.3^{n-2} \times 0.7 & n \geq 2 \end{cases}.`} />
          <p className="text-slate-300 mt-3">
            So <InlineMath math={String.raw`\mu = E(X_k) = 13/7`} />, and by ERT:
          </p>
          <BlockMath math={String.raw`E[N(t)]/t \;\to\; 1/\mu = 7/13, \qquad
            \frac{N(t)/t - 7/13}{\sqrt{\sigma^2/(t \mu^3)}} \xrightarrow{d} \mathcal{N}(0,1).`} />
        </div>

        <div className="theorem-box mb-4">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Case 2: <InlineMath math="N(t)" /> = #transitions 1 → 0</h4>
          <p className="text-slate-300 mb-3">Now set</p>
          <BlockMath math={String.raw`N(t) = \sum_{i=1}^{t} \mathbf{1}\{Y_i = 0,\, Y_{i-1} = 1\}.`} />
          <p className="text-slate-300 mt-3">
            Inter-arrival-times are again iid; by the renewal/ergodic theorem,
          </p>
          <BlockMath math={String.raw`N(t)/t \to P_{10}\, \pi_1 = 0.7 \cdot \tfrac{6}{13} = \tfrac{21}{65}, \qquad
            \mu = E(X_n) = 65/21.`} />
        </div>

        <MCRenewalVisualizer />
      </Section>

      {/* ─── Exercises ─── */}
      <Section title="DIY Exercises" id="exercises" color="from-purple-400 to-pink-400">
        <div className="exercise-box mb-3">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.5 ★★★★</h4>
          <p className="text-slate-300 text-sm">
            Suppose <InlineMath math={String.raw`X_1, X_2, \ldots \stackrel{iid}{\sim} U(0, 1)`} />. State:
            (1) the elementary renewal theorem, (2) refined renewal theorem, (3) the CLT for <InlineMath math="N(t)" />,
            (4) <InlineMath math={String.raw`\lim_{t\to\infty} P(\gamma_t > x, \delta_t > y)`} /> for{' '}
            <InlineMath math="0 < x, y < 1" />, (5) <InlineMath math={String.raw`\lim_{t\to\infty} P(\beta_t < x)`} /> for{' '}
            <InlineMath math="0 < x < 1" />, and (6) <InlineMath math={String.raw`\lim_{t\to\infty} E(\beta_t)`} />.
          </p>
        </div>
        <div className="exercise-box mb-3">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.6 ★★</h4>
          <p className="text-slate-300 text-sm">
            <InlineMath math={String.raw`X_1, X_2, \ldots \stackrel{iid}{\sim} \text{Unif}\{1, 2, 3, 4, 5\}`} />.
            Find <InlineMath math={String.raw`\lim_{t \to \infty} P(N(t) > t/2 + \sqrt{t})`} />.
          </p>
        </div>
        <div className="exercise-box">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.7 ★★★★</h4>
          <p className="text-slate-300 text-sm">
            <InlineMath math={String.raw`X_1, X_2, \ldots`} /> iid with continuous density <InlineMath math="f" /> on{' '}
            <InlineMath math="[0, \infty)" />. Suppose <InlineMath math={String.raw`\delta_t`} /> and{' '}
            <InlineMath math={String.raw`\gamma_t`} /> are asymptotically independent. Prove the
            process must be a Poisson process.
          </p>
        </div>
      </Section>

      {/* ─── Key Takeaways ─── */}
      <Section title="Key Takeaways" id="takeaways" color="from-amber-400 to-rose-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-cyan-900/20 border border-cyan-700/50">
            <h4 className="text-cyan-400 font-bold mb-2">Law of Large Numbers</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`M(t)/t \to 1/\mu`} /> (Elementary RT)</li>
              <li><InlineMath math={String.raw`N(t)/t \to 1/\mu`} /> almost surely</li>
              <li>Refined: <InlineMath math={String.raw`M(t) - t/\mu \to (\sigma^2 - \mu^2)/(2\mu^2)`} /></li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-blue-900/20 border border-blue-700/50">
            <h4 className="text-blue-400 font-bold mb-2">Central Limit Theorem</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`\mathrm{Var}(N(t))/t \to \sigma^2/\mu^3`} /></li>
              <li><InlineMath math={String.raw`(N(t) - t/\mu)/\sqrt{t\sigma^2/\mu^3} \to \mathcal{N}(0,1)`} /></li>
              <li>Descends from the CLT for <InlineMath math={String.raw`W_n`} /> via the duality with <InlineMath math="N(t)" /></li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-rose-900/20 border border-rose-700/50">
            <h4 className="text-rose-400 font-bold mb-2">Equilibrium Life Times</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`P(\gamma_t \leq x) \to \tfrac{1}{\mu}\int_0^x(1-F(s))\,ds`} /></li>
              <li><InlineMath math={String.raw`\delta_t`} /> and <InlineMath math={String.raw`\gamma_t`} /> share this limit marginally</li>
              <li><InlineMath math={String.raw`E(\gamma_t) \to (\sigma^2 + \mu^2)/(2\mu)`} /></li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-amber-900/20 border border-amber-700/50">
            <h4 className="text-amber-400 font-bold mb-2">Length-Bias Bottom Line</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`E(\beta_t) \to \mu + \sigma^2/\mu`} /></li>
              <li>Relative bias <InlineMath math={String.raw`\sigma^2/\mu^2`} /> grows with variability</li>
              <li>Exercise 7.7: asymptotic independence of <InlineMath math={String.raw`\delta_t, \gamma_t`} /> ⇒ Poisson</li>
            </ul>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-6 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5"
        >
          <h4 className="text-amber-400 font-bold mb-3">The Big Picture</h4>
          <p className="text-slate-300">
            Renewal theory extends the Poisson machinery to <em>any</em> distribution of inter-occurrence times.
            In the long run, renewal processes obey a strong LLN with rate <InlineMath math={String.raw`1/\mu`} /> and a CLT
            with variance <InlineMath math={String.raw`\sigma^2/\mu^3`} />. The current/residual/total life-time
            distributions converge to the <em>equilibrium law</em> with density <InlineMath math={String.raw`(1-F)/\mu`} />,
            providing a clean probabilistic explanation for length-biased sampling — the reason 007 outlives
            the average bulb.
          </p>
        </motion.div>
      </Section>
    </div>
  )
}
