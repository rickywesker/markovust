import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

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

/* ─── "From Notes" badge — marks examples/stories taken directly from the course notes ─── */
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

/* ─── Sampling helpers ─── */
function sampleExp(lambda) {
  return -Math.log(1 - Math.random()) / lambda
}
function sampleGeom(p) {
  // Support {1, 2, 3, ...} with P(X = k) = p(1-p)^{k-1}
  return Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - p))
}
function sampleUnif(a, b) {
  return a + Math.random() * (b - a)
}

/* Build a renewal path (array of waiting times W_1, W_2, ...) up to T */
function buildPath(sampler, T, maxEvents = 500) {
  const W = [0]
  let t = 0
  while (t < T && W.length < maxEvents) {
    t += sampler()
    if (t > T) break
    W.push(t)
  }
  return W
}

/* ═══════════════════════════════════════════════════════
   1. RENEWAL TIMELINE VISUALIZER
   ═══════════════════════════════════════════════════════ */
function RenewalTimelineVisualizer() {
  const [dist, setDist] = useState('exp')
  const [param, setParam] = useState(1.0)
  const [T, setT] = useState(15)
  const [path, setPath] = useState([0, 1.3, 2.9, 4.1, 5.8, 7.5, 10.1, 12.0])
  const timelineRef = useRef(null)
  const countRef = useRef(null)

  const sampler = useCallback(() => {
    if (dist === 'exp') return sampleExp(param)
    if (dist === 'geom') return sampleGeom(param)
    return sampleUnif(0, 2 * param) // mean = param
  }, [dist, param])

  const regenerate = useCallback(() => {
    setPath(buildPath(sampler, T))
  }, [sampler, T])

  useEffect(() => { regenerate() }, [regenerate])

  const meanInter = dist === 'exp' ? (1 / param) : dist === 'geom' ? (1 / param) : param
  const varInter = dist === 'exp' ? (1 / (param * param)) : dist === 'geom' ? ((1 - param) / (param * param)) : ((4 * param * param) / 12)

  // Draw timeline
  useEffect(() => {
    const canvas = timelineRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 40, padR = 20, padT = 30, padB = 40
    const plotW = W - padL - padR, plotH = H - padT - padB
    const xFor = (t) => padL + (t / T) * plotW

    // Title
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('Events along the timeline', W / 2, 18)

    // Axis line
    const axisY = padT + plotH * 0.7
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, axisY); ctx.lineTo(padL + plotW, axisY); ctx.stroke()

    // Time ticks
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    const tickStep = T / 10
    for (let i = 0; i <= 10; i++) {
      const t = i * tickStep
      const px = xFor(t)
      ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(px, axisY - 4); ctx.lineTo(px, axisY + 4); ctx.stroke()
      ctx.fillText(t.toFixed(1), px, axisY + 18)
    }
    ctx.fillText('t', padL + plotW + 10, axisY + 4)

    // Event markers (skip W_0 = 0)
    for (let i = 1; i < path.length; i++) {
      const px = xFor(path[i])
      // Vertical line
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(px, axisY - 30); ctx.lineTo(px, axisY + 4); ctx.stroke()
      // Dot
      ctx.fillStyle = '#60a5fa'
      ctx.beginPath(); ctx.arc(px, axisY, 4, 0, 2 * Math.PI); ctx.fill()
      // Label W_i
      ctx.fillStyle = '#bfdbfe'; ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.fillText(`W${toSub(i)}`, px, axisY - 34)
    }

    // Inter-occurrence time spans
    for (let i = 1; i < Math.min(path.length, 6); i++) {
      const x0 = xFor(path[i - 1])
      const x1 = xFor(path[i])
      const midX = (x0 + x1) / 2
      const braceY = axisY + 30
      ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x0, braceY - 4); ctx.lineTo(x0, braceY); ctx.lineTo(x1, braceY); ctx.lineTo(x1, braceY - 4); ctx.stroke()
      if (x1 - x0 > 25) {
        ctx.fillStyle = '#fbbf24'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(`X${toSub(i)}`, midX, braceY + 12)
      }
    }

    // Count counter (upper right)
    const Nt = path.length - 1
    ctx.fillStyle = '#34d399'; ctx.font = 'bold 14px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(`N(${T}) = ${Nt}`, padL + plotW, padT + 4)
  }, [path, T])

  // Draw counting process N(t)
  useEffect(() => {
    const canvas = countRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 40, padR = 20, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB
    const Nmax = Math.max(path.length - 1, 5)

    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('Counting process N(t)', W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    const yStep = Math.max(1, Math.ceil(Nmax / 5))
    for (let y = 0; y <= Nmax; y += yStep) {
      const py = padT + plotH * (1 - y / Nmax)
      ctx.fillText(`${y}`, padL - 6, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }

    // Step function
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padL, padT + plotH) // N(0) = 0
    for (let i = 1; i < path.length; i++) {
      const px = padL + (path[i] / T) * plotW
      const py0 = padT + plotH * (1 - (i - 1) / Nmax)
      const py1 = padT + plotH * (1 - i / Nmax)
      ctx.lineTo(px, py0)
      ctx.lineTo(px, py1)
    }
    ctx.lineTo(padL + plotW, padT + plotH * (1 - (path.length - 1) / Nmax))
    ctx.stroke()

    // Dots at jumps
    for (let i = 1; i < path.length; i++) {
      const px = padL + (path[i] / T) * plotW
      const py = padT + plotH * (1 - i / Nmax)
      ctx.fillStyle = '#34d399'
      ctx.beginPath(); ctx.arc(px, py, 3, 0, 2 * Math.PI); ctx.fill()
    }
  }, [path, T])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-cyan-400 mb-3">Renewal Process Timeline</h3>
      <p className="text-slate-300 mb-4">
        Generate iid inter-occurrence times <InlineMath math={String.raw`X_1, X_2, \ldots`} /> from a chosen
        distribution. Events occur at <InlineMath math={String.raw`W_k = X_1 + \cdots + X_k`} />,
        and <InlineMath math="N(t)" /> counts them.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={dist} onChange={e => setDist(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
          <option value="exp">Exponential(λ)</option>
          <option value="geom">Geometric(p)</option>
          <option value="unif">Uniform(0, 2μ)</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>
            {dist === 'exp' && <InlineMath math="\lambda" />}
            {dist === 'geom' && <InlineMath math="p" />}
            {dist === 'unif' && <InlineMath math="\mu" />}
          </span>
          <span className="font-mono text-amber-400 w-12 text-right">{param.toFixed(2)}</span>
          <input type="range"
            min={dist === 'geom' ? 0.05 : 0.1}
            max={dist === 'geom' ? 0.95 : 3}
            step={0.05}
            value={param}
            onChange={e => setParam(+e.target.value)}
            className="w-28 accent-cyan-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>T = <span className="font-mono text-amber-400">{T}</span></span>
          <input type="range" min={5} max={50} step={1} value={T}
            onChange={e => setT(+e.target.value)} className="w-24 accent-cyan-500" />
        </label>
        <button onClick={regenerate} className="btn-primary text-sm !px-4 !py-2">
          New Sample
        </button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden mb-3">
        <canvas ref={timelineRef} className="w-full" style={{ height: 150 }} />
      </div>
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={countRef} className="w-full" style={{ height: 220 }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500">Events</div>
          <div className="text-emerald-400 font-mono font-bold">{path.length - 1}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500"><InlineMath math="\mu = E(X_1)" /></div>
          <div className="text-cyan-400 font-mono font-bold">{meanInter.toFixed(3)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500"><InlineMath math="\sigma^2" /></div>
          <div className="text-cyan-400 font-mono font-bold">{varInter.toFixed(3)}</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
          <div className="text-slate-500"><InlineMath math="t/\mu" /> (theory)</div>
          <div className="text-amber-400 font-mono font-bold">{(T / meanInter).toFixed(2)}</div>
        </div>
      </div>
    </motion.div>
  )
}

/* Unicode subscript digits — used for W_1, W_2, ... in canvas labels */
function toSub(n) {
  const subs = '₀₁₂₃₄₅₆₇₈₉'
  return String(n).split('').map(d => subs[+d]).join('')
}

/* ═══════════════════════════════════════════════════════
   2. LIFE TIMES VISUALIZER (δ_t, γ_t, β_t)
   ═══════════════════════════════════════════════════════ */
function LifeTimesVisualizer() {
  const [lambda, setLambda] = useState(1.0)
  const [t, setT] = useState(5.2)
  const [path, setPath] = useState([0, 0.9, 2.4, 3.7, 5.6, 7.0, 8.3, 9.7, 11.1, 12.4])
  const canvasRef = useRef(null)

  const regenerate = useCallback(() => {
    setPath(buildPath(() => sampleExp(lambda), 15, 60))
  }, [lambda])

  useEffect(() => { regenerate() }, [regenerate])

  // Find the interval containing t
  let Nt = 0
  for (let i = 0; i < path.length; i++) {
    if (path[i] <= t) Nt = i
    else break
  }
  const WN = path[Nt]
  const WNplus1 = path[Nt + 1] ?? t + 0.5 // fallback if path ends
  const delta = t - WN
  const gamma = WNplus1 - t
  const beta = delta + gamma

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

    const padL = 40, padR = 20, padT = 25, padB = 45
    const plotW = W - padL - padR, plotH = H - padT - padB
    const Tmax = 15
    const xFor = (v) => padL + (v / Tmax) * plotW

    // Title
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('Current / Residual / Total life times at fixed inspection time t', W / 2, 16)

    // Axis
    const axisY = padT + plotH * 0.65
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(padL, axisY); ctx.lineTo(padL + plotW, axisY); ctx.stroke()

    // Ticks
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    for (let i = 0; i <= 15; i++) {
      const px = xFor(i)
      ctx.strokeStyle = 'rgba(148,163,184,0.2)'
      ctx.beginPath(); ctx.moveTo(px, axisY - 3); ctx.lineTo(px, axisY + 3); ctx.stroke()
      if (i % 3 === 0) ctx.fillText(`${i}`, px, axisY + 16)
    }

    // Shaded interval [W_N(t), W_N(t)+1]
    const bx0 = xFor(WN), bx1 = xFor(WNplus1)
    ctx.fillStyle = 'rgba(251,191,36,0.15)'
    ctx.fillRect(bx0, axisY - 26, bx1 - bx0, 52)

    // Event markers
    for (let i = 1; i < path.length; i++) {
      const px = xFor(path[i])
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(px, axisY - 15); ctx.lineTo(px, axisY + 4); ctx.stroke()
      ctx.fillStyle = '#60a5fa'
      ctx.beginPath(); ctx.arc(px, axisY, 3, 0, 2 * Math.PI); ctx.fill()
    }

    // Label W_N(t), W_N(t)+1
    ctx.fillStyle = '#93c5fd'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('W' + toSub(Nt), bx0, axisY - 20)
    ctx.fillText('W' + toSub(Nt + 1), bx1, axisY - 20)

    // Inspection line at t
    const tx = xFor(t)
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
    ctx.beginPath(); ctx.moveTo(tx, padT); ctx.lineTo(tx, axisY + 20); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`t = ${t.toFixed(2)}`, tx, padT + 10)

    // δ_t bar (teal, from W_N to t)
    ctx.fillStyle = 'rgba(34,211,238,0.7)'
    ctx.fillRect(bx0, axisY + 6, tx - bx0, 8)
    if (tx - bx0 > 30) {
      ctx.fillStyle = '#22d3ee'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`δₜ = ${delta.toFixed(2)}`, (bx0 + tx) / 2, axisY + 27)
    }

    // γ_t bar (pink, from t to W_{N+1})
    ctx.fillStyle = 'rgba(244,114,182,0.7)'
    ctx.fillRect(tx, axisY + 6, bx1 - tx, 8)
    if (bx1 - tx > 30) {
      ctx.fillStyle = '#f472b6'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`γₜ = ${gamma.toFixed(2)}`, (tx + bx1) / 2, axisY + 27)
    }

    // β_t label (above the interval)
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`βₜ = ${beta.toFixed(2)}  (total life time of "007")`, (bx0 + bx1) / 2, axisY - 34)
  }, [path, t, WN, WNplus1, delta, gamma, beta, Nt])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-amber-400 mb-3">The 007 Light Bulb Inspector</h3>
      <p className="text-slate-300 mb-4">
        Move <InlineMath math="t" /> to pick an inspection time. The bulb active at time <InlineMath math="t" />{' '}
        — call it <em className="text-amber-300">007</em> — has already burned
        for <InlineMath math={String.raw`\delta_t`} /> (teal),
        has <InlineMath math={String.raw`\gamma_t`} /> (pink) remaining,
        and total life <InlineMath math={String.raw`\beta_t = \delta_t + \gamma_t`} /> (gold).
      </p>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="\lambda" />
          <span className="font-mono text-amber-400 w-12 text-right">{lambda.toFixed(2)}</span>
          <input type="range" min={0.3} max={3} step={0.05} value={lambda}
            onChange={e => setLambda(+e.target.value)} className="w-24 accent-amber-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>t</span>
          <span className="font-mono text-red-400 w-14 text-right">{t.toFixed(2)}</span>
          <input type="range" min={0} max={15} step={0.05} value={t}
            onChange={e => setT(+e.target.value)} className="w-40 accent-red-500" />
        </label>
        <button onClick={regenerate} className="btn-primary text-sm !px-4 !py-2">New Sample</button>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 230 }} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-2 text-center">
          <div className="text-cyan-400 font-semibold"><InlineMath math={String.raw`\delta_t`} /> (current)</div>
          <div className="text-slate-200 font-mono font-bold">{delta.toFixed(3)}</div>
        </div>
        <div className="bg-pink-900/20 border border-pink-700/50 rounded-lg p-2 text-center">
          <div className="text-pink-400 font-semibold"><InlineMath math={String.raw`\gamma_t`} /> (residual)</div>
          <div className="text-slate-200 font-mono font-bold">{gamma.toFixed(3)}</div>
        </div>
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-2 text-center">
          <div className="text-amber-400 font-semibold"><InlineMath math={String.raw`\beta_t`} /> (total)</div>
          <div className="text-slate-200 font-mono font-bold">{beta.toFixed(3)}</div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Because longer intervals are more likely to cover a fixed <InlineMath math="t" />,{' '}
        <InlineMath math={String.raw`\beta_t`} /> is on average <em>larger</em> than the ordinary life
        time <InlineMath math={String.raw`1/\lambda`} /> — this is <strong className="text-amber-300">length-biased sampling</strong>.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   3. LENGTH-BIASED DART GAME (Yugong vs Zhishou)
   ═══════════════════════════════════════════════════════ */
function DartGame() {
  const [rounds, setRounds] = useState([])
  const [auto, setAuto] = useState(false)
  const canvasRef = useRef(null)
  const histCanvasRef = useRef(null)
  const timerRef = useRef(null)

  const playOne = useCallback(() => {
    const Z = Math.random()
    const Y = Math.random()
    const payoff = Y < Z ? (2 * Z - 1) : (1 - 2 * Z) // Mr. Z gets this
    setRounds(r => {
      const next = [...r, { Z, Y, payoff }]
      return next.length > 2000 ? next.slice(-2000) : next
    })
  }, [])

  useEffect(() => {
    if (!auto) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(playOne, 30)
    return () => clearInterval(timerRef.current)
  }, [auto, playOne])

  const reset = () => { setAuto(false); setRounds([]) }

  const n = rounds.length
  const avgPayoff = n > 0 ? rounds.reduce((s, r) => s + r.payoff, 0) / n : 0

  // Draw current round
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

    const padL = 30, padR = 30
    const plotW = W - padL - padR
    const midY = H / 2

    // Title
    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('Unit interval [0, 1] — latest round', W / 2, 18)

    // Interval bar
    ctx.fillStyle = 'rgba(148,163,184,0.2)'
    ctx.fillRect(padL, midY - 14, plotW, 28)

    if (n > 0) {
      const last = rounds[n - 1]
      const zx = padL + last.Z * plotW
      const yx = padL + last.Y * plotW

      // I_1 [0, Z] shaded
      ctx.fillStyle = 'rgba(96,165,250,0.3)'
      ctx.fillRect(padL, midY - 14, zx - padL, 28)
      // I_2 [Z, 1] shaded
      ctx.fillStyle = 'rgba(244,114,182,0.3)'
      ctx.fillRect(zx, midY - 14, padL + plotW - zx, 28)

      // Z split line
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(zx, midY - 22); ctx.lineTo(zx, midY + 22); ctx.stroke()
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`Z = ${last.Z.toFixed(3)}`, zx, midY - 28)

      // Y dart (red)
      ctx.fillStyle = '#ef4444'
      ctx.beginPath(); ctx.arc(yx, midY, 7, 0, 2 * Math.PI); ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(yx, midY, 7, 0, 2 * Math.PI); ctx.stroke()
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`Y = ${last.Y.toFixed(3)}`, yx, midY + 36)

      // I_1, I_2 labels
      ctx.fillStyle = '#60a5fa'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      if (zx - padL > 30) ctx.fillText(`I₁  len=${last.Z.toFixed(2)}`, (padL + zx) / 2, midY + 50)
      ctx.fillStyle = '#f472b6'
      if (padL + plotW - zx > 30) ctx.fillText(`I₂  len=${(1 - last.Z).toFixed(2)}`, (zx + padL + plotW) / 2, midY + 50)

      // Payoff callout
      const color = last.payoff > 0 ? '#34d399' : '#f87171'
      ctx.fillStyle = color; ctx.font = 'bold 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`Mr. Z's payoff: ${last.payoff >= 0 ? '+' : ''}${last.payoff.toFixed(3)}`, W / 2, midY + 70)
    } else {
      ctx.fillStyle = '#64748b'; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Click "Throw once" or "Auto-play" to begin', W / 2, midY + 4)
    }

    // 0 and 1 labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('0', padL, H - 6)
    ctx.fillText('1', padL + plotW, H - 6)
  }, [rounds, n])

  // Draw running average
  useEffect(() => {
    const canvas = histCanvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 40, padR = 20, padT = 25, padB = 30
    const plotW = W - padL - padR, plotH = H - padT - padB

    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText("Mr. Z's running average payoff", W / 2, 16)

    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // y axis [-0.2, 0.6]
    const yMin = -0.2, yMax = 0.6
    const yFor = (v) => padT + plotH * (1 - (v - yMin) / (yMax - yMin))

    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (const v of [-0.2, 0, 0.2, 0.333, 0.4, 0.6]) {
      const py = yFor(v)
      ctx.fillText(v.toFixed(2), padL - 4, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }

    // Theoretical limit line at 1/3
    const limitY = yFor(1 / 3)
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
    ctx.beginPath(); ctx.moveTo(padL, limitY); ctx.lineTo(padL + plotW, limitY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'left'
    ctx.fillText('E = 1/3', padL + 4, limitY - 4)

    // Running avg curve
    if (n > 0) {
      let cum = 0
      ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        cum += rounds[i].payoff
        const avg = cum / (i + 1)
        const px = padL + ((i + 1) / Math.max(n, 1)) * plotW
        const py = yFor(avg)
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }

    ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(`avg = ${avgPayoff.toFixed(4)} (n = ${n})`, padL + plotW, padT + 12)
  }, [rounds, n, avgPayoff])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-purple-400 mb-3">Yugong vs Zhishou Dart Game</h3>
      <p className="text-slate-300 mb-4">
        Mr. Z throws first (lands at <InlineMath math="Z \sim U(0,1)" />),
        splitting <InlineMath math="[0,1]" /> into <InlineMath math={String.raw`I_1 = [0, Z)`} /> and
        <InlineMath math={String.raw`I_2 = [Z, 1]`} />. Mr. Y then throws at <InlineMath math="Y \sim U(0,1)" />.
        Mr. Y pays Mr. Z the <strong>signed</strong> length difference: <InlineMath math={String.raw`|I_1| - |I_2|`} /> if{' '}
        <InlineMath math="Y \in I_1" />, else <InlineMath math={String.raw`|I_2| - |I_1|`} />.
        Fair? <em>No!</em> Because when <InlineMath math="Y" /> falls in an interval, that interval is
        more likely to be the <em>larger</em> one.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <button onClick={playOne} className="btn-primary text-sm !px-4 !py-2">Throw once</button>
        <button onClick={() => setAuto(!auto)} className={`text-sm !px-4 !py-2 ${auto ? 'btn-secondary' : 'btn-primary'}`}>
          {auto ? 'Stop auto-play' : 'Auto-play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
        <span className="text-sm text-slate-400 ml-2">
          rounds: <span className="text-amber-400 font-mono">{n}</span>
          <span className="mx-3">|</span>
          avg: <span className="text-emerald-400 font-mono">{avgPayoff.toFixed(4)}</span>
          <span className="mx-3">|</span>
          theory: <span className="text-amber-400 font-mono">0.3333</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 220 }} />
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={histCanvasRef} className="w-full" style={{ height: 220 }} />
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function RenewalBasics() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            7.1-7.2 Renewal Phenomena: Definitions &amp; the 007 Bulb
          </span>
        </h1>
        <p className="text-slate-400 text-lg italic">
          "Renewal is life reborn." — From iid waiting times to length-biased sampling.
        </p>
      </motion.div>

      {/* ─── Section 7.1.1: Definition ─── */}
      <Section title="7.1.1 Definition of a Renewal Process" id="definition" color="from-cyan-400 to-blue-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Renewal Process)</h4>
          <p className="text-slate-300 mb-3">
            Suppose events happen along time, and the time durations between any two consecutive
            events — the <strong className="text-indigo-300">inter-occurrence times</strong> — are
            iid positive random variables. Let <InlineMath math="N(t)" /> be the number of events
            happened before or at time <InlineMath math="t" />. Then <InlineMath math={String.raw`\{N(t) : t \geq 0\}`} /> is
            a <strong className="text-indigo-300">renewal process</strong>.
          </p>
          <p className="text-slate-300 mb-3">Mathematically:</p>
          <BlockMath math={String.raw`N(t) = \max\left\{\,n : \sum_{i=0}^{n} X_i \leq t\,\right\}`} />
          <p className="text-slate-300">
            where <InlineMath math="X_0 = 0" /> and <InlineMath math={String.raw`X_1, X_2, \ldots`} /> are
            iid positive random variables.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Terminology</h4>
          <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
            <li>
              <strong className="text-slate-200">Waiting times</strong>:{' '}
              <InlineMath math={String.raw`W_k = \sum_{i=1}^{k} X_i`} /> for <InlineMath math={String.raw`k \geq 1`} />,
              and <InlineMath math="W_0 = 0" />. <InlineMath math="W_k" /> is the time of the <InlineMath math="k" />-th event.
            </li>
            <li>
              <strong className="text-slate-200">Inter-occurrence times</strong>:{' '}
              <InlineMath math={String.raw`X_1, X_2, \ldots`} />. Also called <em>sojourn times</em> in the
              context of Markov chains.
            </li>
            <li>
              Time horizon can be <strong>discrete</strong> (<InlineMath math={String.raw`\{0, 1, 2, \ldots\}`} />)
              or <strong>continuous</strong> (<InlineMath math="[0, \infty)" />).
            </li>
            <li>
              Sample paths of <InlineMath math="N(\cdot)" /> are <strong>non-decreasing</strong> step functions.
            </li>
          </ul>
          <p className="text-slate-300 mt-3 text-sm">
            <strong className="text-amber-300">The "renewal" interpretation:</strong> at any event
            time <InlineMath math="W_n = t" />, the future outlook starts over. Formally, conditioning
            on <InlineMath math="W_n = t" />, the conditional distribution of{' '}
            <InlineMath math={String.raw`\{W_j - t : j \geq n\}`} /> matches that of{' '}
            <InlineMath math={String.raw`\{W_k : k \geq 1\}`} />.
          </p>
        </div>

        <RenewalTimelineVisualizer />
      </Section>

      {/* ─── Section 7.1.2: Examples ─── */}
      <Section title="7.1.2 Examples" id="examples" color="from-emerald-400 to-teal-400">
        <div className="example-box mb-4">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">
            Example 7.1 (Poisson Process)<FromNotes />
          </h4>
          <p className="text-slate-300">
            Let <InlineMath math={String.raw`X_1, X_2, \ldots \stackrel{iid}{\sim} \text{Exp}(\lambda)`} />.
            Then <InlineMath math={String.raw`\{N(t) : t \in [0, \infty)\}`} /> is a{' '}
            <strong className="text-emerald-300">Poisson process</strong>, which is a renewal process with
            exponential inter-occurrence times.
          </p>
        </div>

        <div className="example-box mb-4">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">
            Example 7.2 (Coin Tossing)<FromNotes />
          </h4>
          <p className="text-slate-300 mb-3">
            Toss a coin with <InlineMath math="P(\text{head}) = p" /> repeatedly.
            Let <InlineMath math={String.raw`\xi_i = 1`} /> if the <InlineMath math="i" />-th toss is a head
            (else <InlineMath math="0" />), with <InlineMath math={String.raw`\xi_0 = 0`} />. Define:
          </p>
          <BlockMath math={String.raw`N(t) = \sum_{i=0}^{t} \xi_i, \qquad t = 0, 1, 2, \ldots`} />
          <p className="text-slate-300 mt-2">
            Then <InlineMath math="N(t)" /> is a <strong>discrete-time</strong> renewal process counting heads.
            The inter-occurrence times <InlineMath math={String.raw`X_k = W_k - W_{k-1}`} /> are iid following
            a geometric distribution: <InlineMath math={String.raw`P(X_1 = j) = p(1-p)^{j-1}`} /> for{' '}
            <InlineMath math={String.raw`j \geq 1`} />.{' '}
            <span className="text-slate-500">(DIY)</span>
          </p>
        </div>

        <div className="example-box">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">
            Example 7.3 (Renewal from a Discrete-Time MC)<FromNotes />
          </h4>
          <p className="text-slate-300 mb-2">
            Let <InlineMath math={String.raw`\{Y_n, n \geq 0\}`} /> be a DTMC on <InlineMath math={String.raw`\{0, 1, \ldots, N\}`} />{' '}
            with <InlineMath math="Y_0 = k" />. Let <InlineMath math="Z_i" /> be the <InlineMath math="i" />-th
            time the chain visits state <InlineMath math="k" /> (<InlineMath math="i \geq 1" />, <InlineMath math="Z_0 = 0" />).
            Define <InlineMath math="N(0) = 0" /> and
          </p>
          <BlockMath math={String.raw`N(t) = \max\{n : Z_n \leq t\}, \qquad t \geq 1.`} />
          <p className="text-slate-300 mt-2">
            Then <InlineMath math={String.raw`\{N(t) : t = 0, 1, 2, \ldots\}`} /> is a renewal process — the
            inter-visit times are iid by the strong Markov property.
          </p>
        </div>
      </Section>

      {/* ─── Section 7.1.3: Distribution of W_n ─── */}
      <Section title="7.1.3 The Distribution of Wₙ" id="wn-distribution" color="from-violet-400 to-indigo-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Convolution Recursion)</h4>
          <p className="text-slate-300 mb-3">
            Suppose <InlineMath math={String.raw`X_1, X_2, \ldots \stackrel{iid}{\sim} F`} />. Let{' '}
            <InlineMath math={String.raw`F_n`} /> denote the cdf of <InlineMath math="W_n" />. Then
          </p>
          <BlockMath math={String.raw`F_n(x) = P(W_n \leq x) = \int_0^\infty F_{n-1}(x - t)\, dF(t).`} />
          <p className="text-slate-300 mt-2 text-sm text-slate-400">
            An iterative convolution — mostly of theoretical value, as nested integrals quickly become
            intractable.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Fundamental Identity</h4>
          <p className="text-slate-300 mb-3">The key duality between <InlineMath math="N(t)" /> and the waiting times:</p>
          <BlockMath math={String.raw`\{N(t) \geq n\} = \{W_n \leq t\} \qquad (7.1)`} />
          <p className="text-slate-300 mt-3">Consequently,</p>
          <BlockMath math={String.raw`P(N(t) = n) = F_n(t) - F_{n+1}(t).`} />
          <p className="text-slate-400 text-sm mt-2">
            "At least <InlineMath math="n" /> events by time <InlineMath math="t" />" is the same event
            as "the <InlineMath math="n" />-th event has occurred by time <InlineMath math="t" />."
          </p>
        </div>
      </Section>

      {/* ─── Section 7.1.4: The Renewal Theorem ─── */}
      <Section title="7.1.4 The Renewal Theorem" id="renewal-theorem" color="from-amber-400 to-yellow-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Renewal Function)</h4>
          <p className="text-slate-300">
            The <strong className="text-indigo-300">renewal function</strong> is
          </p>
          <BlockMath math={String.raw`M(t) \equiv E[N(t)],`} />
          <p className="text-slate-300">the expected number of events by time <InlineMath math="t" />.</p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Renewal Theorem / Wald-type Identity)</h4>
          <p className="text-slate-300 mb-3">
            For any <InlineMath math="t \geq 0" />,
          </p>
          <BlockMath math={String.raw`E[W_{N(t)+1}] = [\,E(N(t)) + 1\,]\,E(X_1) = [M(t) + 1]\,\mu. \qquad (7.2)`} />
          <p className="text-slate-300 mt-3 text-sm">
            <strong className="text-amber-300">Why is this subtle?</strong> For a deterministic or
            independent stopping rule <InlineMath math="T" />, Wald's identity{' '}
            <InlineMath math={String.raw`E(W_T) = E(T)\,E(X_1)`} /> is routine. But <InlineMath math="N(t)" /> depends
            on <InlineMath math={String.raw`X_1, X_2, \ldots`} /> — the naive identity can fail. It does hold
            for <InlineMath math="N(t) + 1" />, which is a <em>stopping time</em>.
          </p>

          <Collapsible title="Proof (indicator + independence trick)">
            <div className="text-slate-300 space-y-3 text-sm">
              <BlockMath math={String.raw`E[W_{N(t)+1}] = E\Big[\sum_{j=1}^{N(t)+1} X_j\Big]`} />
              <p><strong>Trick #1:</strong> rewrite the random upper limit as an indicator:</p>
              <BlockMath math={String.raw`= E\Big[\sum_{j=1}^{\infty} X_j\, \mathbf{1}_{\{j \leq N(t)+1\}}\Big]
                = E\Big[\sum_{j=1}^{\infty} X_j\, \mathbf{1}_{\{N(t) \geq j - 1\}}\Big].`} />
              <p><strong>Trick #2:</strong> by (7.1), <InlineMath math={String.raw`\{N(t) \geq j - 1\} = \{W_{j-1} \leq t\}`} />,
              which depends only on <InlineMath math={String.raw`X_1, \ldots, X_{j-1}`} /> — so it is independent of{' '}
              <InlineMath math="X_j" />:</p>
              <BlockMath math={String.raw`= \sum_{j=1}^{\infty} E(X_j)\, P(W_{j-1} \leq t)
                = E(X_1) \sum_{j=1}^{\infty} P(N(t) \geq j - 1).`} />
              <p>Reversing the manipulations:</p>
              <BlockMath math={String.raw`= E(X_1)\, E\Big[\sum_{j=1}^{N(t)+1} 1\Big] = E(X_1)\, E[N(t) + 1]. \qquad \blacksquare`} />
            </div>
          </Collapsible>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Wald's Identity (Optional Sampling)</h4>
          <p className="text-slate-300 mb-3">
            A positive integer-valued random variable <InlineMath math="T" /> is a <strong>stopping time</strong>{' '}
            if, for every <InlineMath math="n \geq 1" />, the event <InlineMath math={String.raw`\{T = n\}`} />{' '}
            depends only on <InlineMath math={String.raw`X_1, \ldots, X_n`} />. Then
          </p>
          <BlockMath math={String.raw`E\Big[\sum_{i=1}^{T} X_i\Big] = E(T)\, E(X_1). \qquad (7.3)`} />
          <p className="text-slate-400 text-sm mt-2">
            The renewal theorem (7.2) is a special case, with <InlineMath math="T = N(t) + 1" />.
            Observe: <InlineMath math="N(t)" /> is <em>not</em> a stopping time (knowing{' '}
            <InlineMath math="N(t) = n" /> requires <InlineMath math={String.raw`X_{n+1}`} /> to be "large enough"), but{' '}
            <InlineMath math="N(t) + 1" /> is.
          </p>
        </div>
      </Section>

      {/* ─── Section 7.1.5: Life Times ─── */}
      <Section title="7.1.5 Current, Residual and Total Life Times" id="life-times" color="from-amber-400 to-rose-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definitions</h4>
          <ul className="text-slate-300 space-y-3 text-sm list-disc list-inside">
            <li>
              <strong className="text-cyan-300">Current life time</strong>:{' '}
              <InlineMath math={String.raw`\delta_t = t - W_{N(t)}`} /> — time since the last event before{' '}
              <InlineMath math="t" />.
            </li>
            <li>
              <strong className="text-pink-300">Residual life time</strong>:{' '}
              <InlineMath math={String.raw`\gamma_t = W_{N(t)+1} - t`} /> — time until the next event.
            </li>
            <li>
              <strong className="text-amber-300">Total life time</strong>:{' '}
              <InlineMath math={String.raw`\beta_t = \delta_t + \gamma_t = W_{N(t)+1} - W_{N(t)}`} /> —
              total length of the interval covering <InlineMath math="t" />.
            </li>
          </ul>
        </div>

        <div className="example-box mb-4">
          <h4 className="text-lg font-bold text-amber-400 mb-2">
            Story: The Classroom Light Bulb "007"<FromNotes />
          </h4>
          <p className="text-slate-300 mb-3">
            A factory produces light bulbs with iid lifetimes. When a bulb burns out in your classroom,
            it is replaced immediately. An inspector walks in at a <em>fixed</em> (non-random) time{' '}
            <InlineMath math="t" /> and looks at the bulb currently working — call it <strong className="text-amber-300">007</strong>.
          </p>
          <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
            <li><InlineMath math={String.raw`\delta_t`} /> = how long 007 has been on before <InlineMath math="t" />.</li>
            <li><InlineMath math={String.raw`\gamma_t`} /> = how much longer 007 will work after <InlineMath math="t" />.</li>
            <li><InlineMath math={String.raw`\beta_t`} /> = 007's <em>total</em> lifetime.</li>
          </ul>
          <p className="text-slate-300 mt-3">
            Here's the twist: 007 is no ordinary bulb! Longer-lived bulbs are more likely to be covering
            time <InlineMath math="t" />, so on average <InlineMath math={String.raw`E(\beta_t) > E(X_1)`} />.
            Just like in the movies, 007 tends to <em>outlive</em> ordinary bulbs.
          </p>
        </div>

        <LifeTimesVisualizer />
      </Section>

      {/* ─── Section 7.2: Poisson as Renewal + Length Biased Sampling ─── */}
      <Section title="7.2 Poisson Process as Renewal & Length-Biased Sampling" id="poisson-renewal" color="from-rose-400 to-purple-400">
        <p className="text-slate-300 mb-4">
          Let <InlineMath math="N(\cdot)" /> be a Poisson process with rate <InlineMath math="\lambda" />.
          We now compute the exact distributions of <InlineMath math={String.raw`\delta_t`} />,{' '}
          <InlineMath math={String.raw`\gamma_t`} />, and <InlineMath math={String.raw`\beta_t`} />{' '}
          — and see the length-biased effect explicitly.
        </p>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Residual Life Time γₜ</h4>
          <p className="text-slate-300 mb-3">
            Since <InlineMath math="N(t+x) - N(t)" /> is Poisson with mean <InlineMath math={String.raw`\lambda x`} />,
          </p>
          <BlockMath math={String.raw`P(\gamma_t > x) = P(N(t + x) - N(t) = 0) = e^{-\lambda x}.`} />
          <p className="text-slate-300 mt-2">
            So <InlineMath math={String.raw`\gamma_t \sim \text{Exp}(\lambda)`} /> — the <em>same</em> as an
            ordinary inter-occurrence time! This is the memoryless property in disguise.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Current Life Time δₜ (Truncated Exponential)</h4>
          <p className="text-slate-300 mb-3">
            Because no event has occurred before time <InlineMath math="0" />, we have{' '}
            <InlineMath math={String.raw`P(\delta_t > x) = 0`} /> for <InlineMath math="x \geq t" />.
            For <InlineMath math="x < t" />:
          </p>
          <BlockMath math={String.raw`P(\delta_t > x) = P(N(t) - N(t - x) = 0) = e^{-\lambda x}.`} />
          <p className="text-slate-300 mt-2">
            So <InlineMath math={String.raw`\delta_t \stackrel{d}{=} \min(t, \xi)`} /> where <InlineMath math={String.raw`\xi \sim \text{Exp}(\lambda)`} /> —
            a <em>truncated</em> exponential. Furthermore, <InlineMath math={String.raw`\delta_t`} /> and{' '}
            <InlineMath math={String.raw`\gamma_t`} /> are <strong>independent</strong>.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Total Life Time βₜ</h4>
          <p className="text-slate-300 mb-3">By convolution, for all <InlineMath math="x > 0" />,</p>
          <BlockMath math={String.raw`P(\beta_t > x) = e^{-\lambda x}\,(\lambda \min(t, x) + 1).`} />
          <p className="text-slate-300 mt-3">Expected values:</p>
          <BlockMath math={String.raw`E(\gamma_t) = \frac{1}{\lambda}, \qquad
            E(\delta_t) = \frac{1}{\lambda}(1 - e^{-\lambda t}), \qquad
            E(\beta_t) = \frac{1}{\lambda}(2 - e^{-\lambda t}).`} />
          <p className="text-slate-300 mt-3">
            As <InlineMath math="t \to \infty" />, <InlineMath math={String.raw`E(\beta_t) \to 2/\lambda`} /> —{' '}
            <strong className="text-amber-300">twice</strong> an ordinary inter-occurrence time!
            007 really is twice the ordinary spy.
          </p>

          <Collapsible title="Derivation of P(β_t > x) for x < t">
            <div className="text-slate-300 space-y-3 text-sm">
              <BlockMath math={String.raw`P(\beta_t > x) = P(\delta_t + \gamma_t > x)
                = \int_0^x P(\gamma_t > x - s)\, f_{\delta_t}(s)\, ds + P(\delta_t > x).`} />
              <p>For <InlineMath math="x < t" />, <InlineMath math={String.raw`\delta_t`} /> has density{' '}
              <InlineMath math={String.raw`f_{\delta_t}(s) = \lambda e^{-\lambda s}`} /> on{' '}
              <InlineMath math="[0, t)" />, so:</p>
              <BlockMath math={String.raw`= \int_0^x e^{-\lambda(x-s)}\, \lambda e^{-\lambda s}\, ds + e^{-\lambda x}
                = \lambda x\, e^{-\lambda x} + e^{-\lambda x}
                = e^{-\lambda x}(\lambda x + 1).`} />
            </div>
          </Collapsible>
        </div>

        {/* Length biased sampling */}
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Remark: Biased and Length-Biased Sampling</h4>
          <p className="text-slate-300 mb-3">
            <strong>Biased sampling</strong> is common in the social and biomedical sciences — when the
            sampling procedure is not uniform over the target population. A famous example: the{' '}
            <em>Literary Digest</em> poll predicting Landon over Roosevelt in 1936, drawn from magazine
            subscribers who skewed Republican.
          </p>
          <p className="text-slate-300 mb-3">
            <strong>Length-biased (size-biased) sampling</strong> is a particular case. When we pick a fixed
            inspection time <InlineMath math="t" /> and ask about the interval covering it, we do{' '}
            <em>not</em> sample uniformly from <InlineMath math={String.raw`X_1, X_2, \ldots`} />: the{' '}
            <em>longer</em> intervals are proportionally more likely to cover <InlineMath math="t" />.
          </p>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">
            Example 7.3: Length-Biased Sampling on Darts<FromNotes />
          </h4>
          <p className="text-slate-300 mb-3">
            Yugong (<strong>Mr. Y</strong>) and Zhishou (<strong>Mr. Z</strong>) are both lousy darters — their
            darts land uniformly on <InlineMath math="[0, 1]" />. Mr. Z, a little cunning, proposes this
            "fair" game: he throws first at <InlineMath math="Z" />, splitting <InlineMath math="[0,1]" />{' '}
            into <InlineMath math={String.raw`I_1 = [0, Z)`} /> and{' '}
            <InlineMath math={String.raw`I_2 = [Z, 1]`} />.
          </p>
          <p className="text-slate-300 mb-3">
            Mr. Y throws next at <InlineMath math="Y" />. If <InlineMath math={String.raw`Y \in I_1`} />, Mr. Y
            pays Mr. Z the difference <InlineMath math="2Z - 1" /> (length of <InlineMath math="I_1" /> minus
            length of <InlineMath math="I_2" />). If <InlineMath math={String.raw`Y \in I_2`} />, Mr. Y pays{' '}
            <InlineMath math="1 - 2Z" />.
          </p>
          <p className="text-slate-300 mb-3">
            Since <InlineMath math="Y, Z \sim U(0,1)" /> and the payoffs swap sign between the two intervals,
            this <em>looks</em> fair. <strong className="text-red-400">Wrong!</strong> Mr. Z collects on average:
          </p>
          <BlockMath math={String.raw`E\Big[(2Z - 1)\mathbf{1}_{\{Y \in I_1\}} + (1 - 2Z)\mathbf{1}_{\{Y \in I_2\}}\Big]
            = E\big[(2Z-1)(Z - (1 - Z))\big] = E\big[(2Z - 1)^2\big] = \tfrac{1}{3}.`} />
          <p className="text-slate-300 mt-3">
            Why? When <InlineMath math="Y" /> falls into <InlineMath math={String.raw`I_1`} />, that
            interval is more likely to be the <em>larger</em> one (length-biased!); same for{' '}
            <InlineMath math={String.raw`I_2`} />. So Mr. Z always "wins" in expectation.
          </p>
        </div>

        <DartGame />
      </Section>

      {/* ─── Exercises ─── */}
      <Section title="DIY Exercises" id="exercises" color="from-purple-400 to-pink-400">
        <div className="exercise-box mb-3">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.1 ★★</h4>
          <p className="text-slate-300 text-sm">
            Verify that <InlineMath math="N(t) + k" /> is a stopping time for any <InlineMath math={String.raw`k \geq 1`} />,
            but <InlineMath math="N(t)" /> is <em>not</em>.
          </p>
        </div>
        <div className="exercise-box mb-3">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.2 ★★★★</h4>
          <p className="text-slate-300 text-sm">
            Prove Wald's identity (7.3) using the techniques in the proof of the renewal theorem.
          </p>
        </div>
        <div className="exercise-box mb-3">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.3 ★</h4>
          <p className="text-slate-300 text-sm">
            Suppose Mr. Z is a superior darter. For him to win big, how should he shoot his dart?
          </p>
        </div>
        <div className="exercise-box">
          <h4 className="text-purple-300 font-bold mb-1">Exercise 7.4 ★★</h4>
          <p className="text-slate-300 text-sm">
            Prove that <InlineMath math={String.raw`\delta_t`} /> and <InlineMath math={String.raw`\gamma_t`} /> are
            independent for the Poisson process.
          </p>
        </div>
      </Section>

      {/* ─── Key Takeaways ─── */}
      <Section title="Key Takeaways" id="takeaways" color="from-amber-400 to-rose-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-cyan-900/20 border border-cyan-700/50">
            <h4 className="text-cyan-400 font-bold mb-2">Renewal Process</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li>Counting process <InlineMath math="N(t)" /> driven by iid positive inter-occurrence times</li>
              <li>Waiting times <InlineMath math={String.raw`W_k = X_1 + \cdots + X_k`} /></li>
              <li>Key duality: <InlineMath math={String.raw`\{N(t) \geq n\} = \{W_n \leq t\}`} /></li>
              <li>Generalizes Poisson processes — Markov property not needed</li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-amber-900/20 border border-amber-700/50">
            <h4 className="text-amber-400 font-bold mb-2">Renewal Theorem</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`E(W_{N(t)+1}) = [M(t) + 1]\mu`} /></li>
              <li>Wald: <InlineMath math={String.raw`E(\sum_{i=1}^T X_i) = E(T)E(X_1)`} /> for stopping times</li>
              <li><InlineMath math="N(t)" /> is NOT a stopping time; <InlineMath math="N(t) + 1" /> is</li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-rose-900/20 border border-rose-700/50">
            <h4 className="text-rose-400 font-bold mb-2">Life Times (Poisson)</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`\gamma_t \sim \text{Exp}(\lambda)`} />, independent of <InlineMath math={String.raw`\delta_t`} /></li>
              <li><InlineMath math={String.raw`\delta_t \stackrel{d}{=} \min(t, \text{Exp}(\lambda))`} /></li>
              <li><InlineMath math={String.raw`E(\beta_t) \to 2/\lambda = 2\cdot E(X_1)`} /> as <InlineMath math={String.raw`t\to\infty`} /></li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-purple-900/20 border border-purple-700/50">
            <h4 className="text-purple-400 font-bold mb-2">Length-Biased Sampling</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li>Longer intervals cover a fixed <InlineMath math="t" /> more often</li>
              <li>Causes <InlineMath math={String.raw`E(\beta_t) > E(X_1)`} /></li>
              <li>Exploited in the Yugong vs Zhishou dart game — house edge <InlineMath math={String.raw`= 1/3`} /></li>
            </ul>
          </div>
        </div>
      </Section>
    </div>
  )
}
