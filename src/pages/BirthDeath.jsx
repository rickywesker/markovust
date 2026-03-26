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
   1. MIRROR RELATION VISUALIZER
   ═══════════════════════════════════════════════════════ */
function MirrorRelationVisualizer() {
  const [N, setN] = useState(10)
  const [lambda, setLambda] = useState(0.5)
  const [running, setRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [birthPath, setBirthPath] = useState([{ t: 0, v: 0 }])
  const [deathPath, setDeathPath] = useState([{ t: 0, v: 10 }])
  const birthCanvasRef = useRef(null)
  const deathCanvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef({ birthVal: 0, deathVal: 10, t: 0 })

  const reset = useCallback(() => {
    setRunning(false)
    setTime(0)
    setBirthPath([{ t: 0, v: 0 }])
    setDeathPath([{ t: 0, v: N }])
    stateRef.current = { birthVal: 0, deathVal: N, t: 0 }
  }, [N])

  useEffect(() => { reset() }, [N, lambda, reset])

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }
    const dt = 0.05
    animRef.current = setInterval(() => {
      const s = stateRef.current
      if (s.birthVal >= N) { setRunning(false); return }
      const rate = lambda * (N - s.birthVal)
      const prob = rate * dt
      if (Math.random() < prob) {
        s.birthVal += 1
        s.deathVal -= 1
      }
      s.t += dt
      setTime(s.t)
      setBirthPath(p => [...p, { t: s.t, v: s.birthVal }])
      setDeathPath(p => [...p, { t: s.t, v: s.deathVal }])
    }, 30)
    return () => clearInterval(animRef.current)
  }, [running, N, lambda])

  const drawCanvas = useCallback((canvas, path, color, label, isUp) => {
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 45, padR = 15, padT = 30, padB = 30
    const plotW = W - padL - padR, plotH = H - padT - padB
    const maxT = Math.max(path[path.length - 1]?.t || 1, 2)

    // Title
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText(label, W / 2, 18)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= N; y += Math.max(1, Math.floor(N / 5))) {
      const py = padT + plotH * (1 - y / N)
      ctx.fillText(`${y}`, padL - 6, py + 3)
    }

    // Path
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < path.length; i++) {
      const px = padL + (path[i].t / maxT) * plotW
      const py = padT + plotH * (1 - path[i].v / N)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }, [N])

  useEffect(() => {
    drawCanvas(birthCanvasRef.current, birthPath, '#60a5fa', `Y(t) - Pure Birth (Xerxes' count)`, true)
    drawCanvas(deathCanvasRef.current, deathPath, '#f472b6', `X(t) = N - Y(t) - Pure Death (Leonidas' count)`, false)
  }, [birthPath, deathPath, drawCanvas])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-cyan-400 mb-3">Mirror Relation Visualizer</h3>
      <p className="text-slate-300 mb-4">
        The same battle, two perspectives: Xerxes counts kills going <strong className="text-blue-400">up</strong> (pure birth),
        Leonidas counts survivors going <strong className="text-pink-400">down</strong> (pure death).
        Same events, mirrored processes: <InlineMath math={String.raw`X(t) = N - Y(t)`} />.
      </p>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>N = {N}</span>
          <input type="range" min={5} max={30} value={N} onChange={e => setN(+e.target.value)} className="w-28 accent-cyan-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="\lambda" /> = {lambda.toFixed(2)}
          <input type="range" min={0.1} max={2} step={0.05} value={lambda} onChange={e => setLambda(+e.target.value)} className="w-28 accent-cyan-500" />
        </label>
        <button onClick={() => setRunning(!running)} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
        <span className="text-sm text-slate-400">t = <span className="text-amber-400 font-mono">{time.toFixed(2)}</span></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={birthCanvasRef} className="w-full" style={{ height: 220 }} />
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={deathCanvasRef} className="w-full" style={{ height: 220 }} />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Both canvases show the <em>exact same</em> sequence of events. When <InlineMath math="Y(t)" /> jumps up by 1,{' '}
        <InlineMath math="X(t)" /> jumps down by 1.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   2. 300 SPARTANS SIMULATOR
   ═══════════════════════════════════════════════════════ */
function SpartansSimulator() {
  const [N, setN] = useState(50)
  const [alpha, setAlpha] = useState(0.3)
  const [running, setRunning] = useState(false)
  const [numPaths] = useState(5)
  const canvasRef = useRef(null)
  const extinctCanvasRef = useRef(null)
  const animRef = useRef(null)
  const pathsRef = useRef(null)
  const timeRef = useRef(0)
  const [time, setTime] = useState(0)
  const [paths, setPaths] = useState(null)

  const reset = useCallback(() => {
    setRunning(false)
    timeRef.current = 0
    setTime(0)
    pathsRef.current = Array.from({ length: numPaths }, () => [{ t: 0, v: N }])
    setPaths(pathsRef.current.map(p => [...p]))
  }, [N, numPaths])

  useEffect(() => { reset() }, [N, alpha, reset])

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }
    if (!pathsRef.current) {
      pathsRef.current = Array.from({ length: numPaths }, () => [{ t: 0, v: N }])
    }
    const dt = 0.02
    animRef.current = setInterval(() => {
      const t = timeRef.current + dt
      timeRef.current = t
      const allDone = pathsRef.current.every(p => p[p.length - 1].v === 0)
      if (allDone || t > 20) { setRunning(false); return }

      for (let i = 0; i < numPaths; i++) {
        const lastV = pathsRef.current[i][pathsRef.current[i].length - 1].v
        if (lastV <= 0) { pathsRef.current[i].push({ t, v: 0 }); continue }
        const rate = lastV * alpha
        const prob = rate * dt
        const newV = Math.random() < prob ? lastV - 1 : lastV
        pathsRef.current[i].push({ t, v: newV })
      }
      setTime(t)
      setPaths(pathsRef.current.map(p => [...p]))
    }, 20)
    return () => clearInterval(animRef.current)
  }, [running, N, alpha, numPaths])

  // Draw sample paths canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !paths) return
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
    const maxT = Math.max(time, 2)

    // Title
    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'center'
    ctx.fillText('Surviving Soldiers X(t)', W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Y labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    const yStep = Math.max(1, Math.ceil(N / 5))
    for (let y = 0; y <= N; y += yStep) {
      const py = padT + plotH * (1 - y / N)
      ctx.fillText(`${y}`, padL - 6, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + plotW, py); ctx.stroke()
    }

    // X labels
    ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'
    for (let x = 0; x <= maxT; x += Math.max(1, Math.floor(maxT / 5))) {
      const px = padL + (x / maxT) * plotW
      ctx.fillText(`${x.toFixed(1)}`, px, padT + plotH + 18)
    }
    ctx.fillText('t', padL + plotW / 2, padT + plotH + 32)

    // Expected value curve E(X(t)) = N e^{-alpha t}
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * maxT
      const ev = N * Math.exp(-alpha * t)
      const px = padL + (t / maxT) * plotW
      const py = padT + plotH * (1 - ev / N)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Legend for expected value
    ctx.fillStyle = '#fbbf24'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('E[X(t)] = Ne^{-at}', padL + plotW - 100, padT + 14)

    // Sample paths
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
      ctx.strokeStyle = LINE_COLORS[i % LINE_COLORS.length]
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let j = 0; j < path.length; j++) {
        const px = padL + (path[j].t / maxT) * plotW
        const py = padT + plotH * (1 - path[j].v / N)
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
  }, [paths, time, N, alpha])

  // Draw extinction time distribution
  useEffect(() => {
    const canvas = extinctCanvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 50, padR = 15, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB
    const maxT = Math.max(10 / alpha, 5)

    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('P(W_N < t) = (1 - e^{-at})^N', W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    for (let y = 0; y <= 4; y++) {
      const py = padT + plotH * (1 - y / 4)
      ctx.fillText((y * 0.25).toFixed(2), padL - 6, py + 3)
    }

    // CDF curve
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * maxT
      const cdf = Math.pow(1 - Math.exp(-alpha * t), N)
      const px = padL + (t / maxT) * plotW
      const py = padT + plotH * (1 - cdf)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Current time marker
    if (time > 0) {
      const cx = padL + (time / maxT) * plotW
      ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + plotH); ctx.stroke()
      ctx.setLineDash([])
    }
  }, [N, alpha, time])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-red-400 mb-3">300 Spartans Simulator</h3>
      <p className="text-slate-300 mb-4">
        <InlineMath math="N" /> soldiers with iid <InlineMath math={String.raw`\text{Exp}(\alpha)`} /> lifetimes.
        The number of survivors <InlineMath math="X(t)" /> is a linear pure death process with{' '}
        <InlineMath math={String.raw`\mu_k = k\alpha`} />.
        Multiple sample paths are shown along with the expected value{' '}
        <InlineMath math={String.raw`E[X(t)] = Ne^{-\alpha t}`} />.
      </p>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          N = {N}
          <input type="range" min={10} max={300} step={10} value={N} onChange={e => setN(+e.target.value)} className="w-28 accent-red-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="\alpha" /> = {alpha.toFixed(2)}
          <input type="range" min={0.05} max={2} step={0.05} value={alpha} onChange={e => setAlpha(+e.target.value)} className="w-28 accent-red-500" />
        </label>
        <button onClick={() => setRunning(!running)} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
        <span className="text-sm text-slate-400">t = <span className="text-amber-400 font-mono">{time.toFixed(2)}</span></span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 280 }} />
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={extinctCanvasRef} className="w-full" style={{ height: 280 }} />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Left: sample paths (solid) vs expected value (dashed gold). Right: CDF of time to extinction.
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   3. BIRTH-DEATH PROCESS SIMULATOR
   ═══════════════════════════════════════════════════════ */
function BirthDeathSimulator() {
  const [lambdaRate, setLambdaRate] = useState(0.6)
  const [muRate, setMuRate] = useState(0.4)
  const [running, setRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [path, setPath] = useState([{ t: 0, v: 5 }])
  const [histogram, setHistogram] = useState({})
  const canvasRef = useRef(null)
  const histCanvasRef = useRef(null)
  const animRef = useRef(null)
  const stateRef = useRef({ val: 5, t: 0, hist: {} })

  const reset = useCallback(() => {
    setRunning(false)
    setTime(0)
    setPath([{ t: 0, v: 5 }])
    setHistogram({})
    stateRef.current = { val: 5, t: 0, hist: {} }
  }, [])

  useEffect(() => { reset() }, [lambdaRate, muRate, reset])

  useEffect(() => {
    if (!running) { clearInterval(animRef.current); return }
    const dt = 0.03
    animRef.current = setInterval(() => {
      const s = stateRef.current
      s.t += dt
      const totalRate = lambdaRate + (s.val > 0 ? muRate : 0)
      const prob = totalRate * dt

      // Record time in current state for histogram
      const key = s.val
      s.hist[key] = (s.hist[key] || 0) + dt

      if (Math.random() < prob) {
        // Decide birth or death
        const pBirth = lambdaRate / totalRate
        if (Math.random() < pBirth) {
          s.val += 1
        } else if (s.val > 0) {
          s.val -= 1
        }
      }

      setTime(s.t)
      setPath(p => {
        const newP = [...p, { t: s.t, v: s.val }]
        // Keep path from growing too large
        if (newP.length > 3000) return newP.slice(-2500)
        return newP
      })
      setHistogram({ ...s.hist })

      if (s.t > 100) setRunning(false)
    }, 15)
    return () => clearInterval(animRef.current)
  }, [running, lambdaRate, muRate])

  // Draw sample path
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || path.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const padL = 45, padR = 15, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB
    const maxV = Math.max(...path.map(p => p.v), 10)
    const minT = path[0].t, maxT = path[path.length - 1].t
    const tRange = Math.max(maxT - minT, 1)

    ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('Birth-Death Sample Path X(t)', W / 2, 16)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
    const yStep = Math.max(1, Math.ceil(maxV / 5))
    for (let y = 0; y <= maxV; y += yStep) {
      const py = padT + plotH * (1 - y / maxV)
      ctx.fillText(`${y}`, padL - 6, py + 3)
    }

    // Path
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < path.length; i++) {
      const px = padL + ((path[i].t - minT) / tRange) * plotW
      const py = padT + plotH * (1 - path[i].v / maxV)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Current state indicator
    const lastVal = path[path.length - 1].v
    ctx.fillStyle = '#34d399'; ctx.font = 'bold 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(`X(t) = ${lastVal}`, padL + plotW - 70, padT + 14)
  }, [path])

  // Draw histogram
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

    const padL = 45, padR = 15, padT = 25, padB = 35
    const plotW = W - padL - padR, plotH = H - padT - padB

    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'
    ctx.fillText('Time Spent in Each State', W / 2, 16)

    const entries = Object.entries(histogram).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0])
    if (entries.length === 0) return

    const totalTime = entries.reduce((s, [, v]) => s + v, 0)
    const maxState = Math.max(...entries.map(([k]) => k), 10)
    const fracs = entries.map(([k, v]) => [k, v / totalTime])
    const maxFrac = Math.max(...fracs.map(([, f]) => f), 0.1)

    // Axes
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke()

    // Bars
    const barW = Math.max(2, plotW / (maxState + 2) - 1)
    for (const [k, frac] of fracs) {
      const px = padL + (k / (maxState + 1)) * plotW
      const barH = (frac / maxFrac) * plotH
      const py = padT + plotH - barH
      ctx.fillStyle = '#a78bfa'
      ctx.fillRect(px, py, barW, barH)

      if (frac > 0.02) {
        ctx.fillStyle = '#e2e8f0'; ctx.font = '9px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(`${(frac * 100).toFixed(1)}%`, px + barW / 2, py - 4)
      }
    }

    // X labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
    for (const [k] of fracs) {
      const px = padL + (k / (maxState + 1)) * plotW + barW / 2
      ctx.fillText(`${k}`, px, padT + plotH + 15)
    }
    ctx.fillText('State', padL + plotW / 2, padT + plotH + 30)
  }, [histogram])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-3">Birth-Death Process Simulator</h3>
      <p className="text-slate-300 mb-4">
        A simple birth-death process with constant birth rate <InlineMath math={String.raw`\lambda`} /> and
        constant death rate <InlineMath math={String.raw`\mu`} />.
        The process goes up by 1 (birth) or down by 1 (death), with a reflecting boundary at 0.
      </p>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="\lambda" /> = {lambdaRate.toFixed(2)}
          <input type="range" min={0.1} max={2} step={0.05} value={lambdaRate} onChange={e => setLambdaRate(+e.target.value)} className="w-24 accent-emerald-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <InlineMath math="\mu" /> = {muRate.toFixed(2)}
          <input type="range" min={0.1} max={2} step={0.05} value={muRate} onChange={e => setMuRate(+e.target.value)} className="w-24 accent-emerald-500" />
        </label>
        <button onClick={() => setRunning(!running)} className={`${running ? 'btn-secondary' : 'btn-primary'} text-sm !px-4 !py-2`}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button onClick={reset} className="btn-secondary text-sm !px-4 !py-2">Reset</button>
        <span className="text-sm text-slate-400">t = <span className="text-amber-400 font-mono">{time.toFixed(1)}</span></span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 280 }} />
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={histCanvasRef} className="w-full" style={{ height: 280 }} />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Left: sample path. Right: fraction of total time spent in each state.
        {lambdaRate > muRate && <span> Since <InlineMath math={String.raw`\lambda > \mu`} />, the process drifts upward.</span>}
        {lambdaRate < muRate && <span> Since <InlineMath math={String.raw`\lambda < \mu`} />, the process drifts toward 0.</span>}
        {lambdaRate === muRate && <span> Since <InlineMath math={String.raw`\lambda = \mu`} />, the process is a null-recurrent random walk.</span>}
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function BirthDeath() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
            6.2-6.3 Pure Death &amp; Birth-Death Processes
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          From counting fallen warriors to modeling population dynamics -- when processes can decrease (or both increase and decrease) over continuous time.
        </p>
      </motion.div>

      {/* ─── Section 6.2.1: Pure Death Postulates ─── */}
      <Section title="6.2.1 Pure Death Processes: Postulates" id="pure-death-postulates" color="from-rose-400 to-pink-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Pure Death Process)</h4>
          <p className="text-slate-300 mb-3">
            <InlineMath math={String.raw`\{X(t) : t \in [0, \infty)\}`} /> is a <strong className="text-indigo-300">pure death process</strong> with
            death rates <InlineMath math={String.raw`\mu_0 = 0, \mu_1, \ldots, \mu_N`} /> and state
            space <InlineMath math={String.raw`\{0, 1, \ldots, N\}`} /> if it is a continuous-time Markov chain
            with <strong className="text-slate-200">non-increasing</strong> sample paths satisfying one of the following
            equivalent postulates:
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Postulate 1 (Infinitesimal Probabilities)</h4>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(i)</strong> Probability of one death in a small interval:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(X(t+h) - X(t) = -1 \mid X(t) = k) = \mu_k h + o(h)`} />
          </div>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(ii)</strong> Probability of no death:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(X(t+h) - X(t) = 0 \mid X(t) = k) = 1 - \mu_k h + o(h)`} />
          </div>
          <p className="text-slate-300">
            <strong className="text-slate-200">(iii)</strong> Initial condition: <InlineMath math={String.raw`X(0) = N`} />.
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Postulate 2 (Marginal Distribution)</h4>
          <p className="text-slate-300 mb-2">
            With <InlineMath math={String.raw`P_n(t) \equiv P(X(t) = n \mid X(0) = N)`} />, if all
            death rates <InlineMath math={String.raw`\mu_1, \ldots, \mu_N > 0`} /> are distinct:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_n(t) = \mu_{n+1} \cdots \mu_N \Big[A_{n,n}\, e^{-\mu_n t} + \cdots + A_{N,n}\, e^{-\mu_N t}\Big], \qquad n < N`} />
          </div>
          <p className="text-slate-300 mb-2">
            In particular, <InlineMath math={String.raw`P_N(t) = e^{-\mu_N t}`} />.
          </p>
          <p className="text-slate-400 text-sm">
            <strong>Note:</strong> Postulate 2 is <em>incomplete</em> as a definition -- it cannot stand alone.
          </p>
        </div>

        <div className="theorem-box mb-4">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Postulate 3 (Sojourn Times)</h4>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(i)</strong> The sojourn times <InlineMath math={String.raw`S_1, S_2, \ldots, S_N`} /> are independent.
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(ii)</strong> The sojourn time <InlineMath math={String.raw`S_k`} /> at
            state <InlineMath math="k" /> follows <InlineMath math={String.raw`\text{Exp}(\mu_k)`} /> (mean <InlineMath math={String.raw`1/\mu_k`} />):
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`f_{S_k}(t) = \mu_k e^{-\mu_k t}, \qquad t \geq 0`} />
          </div>
          <p className="text-slate-300">
            <strong className="text-slate-200">(iii)</strong> <InlineMath math={String.raw`X(0) = N`} />.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            Postulates 1 and 3 are equivalent and each is a complete definition. Postulate 2 is incomplete.
          </p>
        </div>
      </Section>

      {/* ─── Section 6.2.2: Mirror Relation ─── */}
      <Section title="6.2.2 The Mirror Relation: Pure Birth and Pure Death" id="mirror-relation" color="from-cyan-400 to-blue-400">
        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Example 6.4: The 300 Spartans</h4>
          <p className="text-slate-300 mb-3">
            In a partly fictitious portrayal of the Battle of Thermopylae (480 BC),
            300 Greek Spartans led by King Leonidas blocked a vast Persian army for three days.
          </p>
          <p className="text-slate-300 mb-3">
            Suppose Leonidas counts the number of <strong className="text-pink-400">surviving soldiers</strong> at time <InlineMath math="t" />,
            calling this <InlineMath math="X(t)" />, with <InlineMath math="X(0) = 300" />.
            Meanwhile, the ever-optimistic Xerxes counts the number of <strong className="text-blue-400">kills</strong>,
            calling this <InlineMath math="Y(t)" />, with <InlineMath math="Y(0) = 0" />.
          </p>
          <p className="text-slate-300">
            Clearly <InlineMath math={String.raw`X(t) = 300 - Y(t)`} />. Same battle, two counting perspectives!
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Mirror Relation)</h4>
          <p className="text-slate-300 mb-3">
            If <InlineMath math={String.raw`\{Y(t)\}`} /> is a <strong className="text-blue-300">pure birth process</strong> with
            state space <InlineMath math={String.raw`\{0, 1, \ldots, N\}`} /> and birth rates{' '}
            <InlineMath math={String.raw`\lambda_0, \lambda_1, \ldots, \lambda_{N-1}`} />,
            then <InlineMath math={String.raw`X(t) = N - Y(t)`} /> is a <strong className="text-pink-300">pure death process</strong> with
            death rates:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`\mu_k = \lambda_{N-k}, \qquad k = 1, 2, \ldots, N`} />
          </div>
          <p className="text-slate-300 mt-3">
            Conversely, if <InlineMath math={String.raw`\{X(t)\}`} /> is a pure death process beginning
            at <InlineMath math="N" /> with death rates <InlineMath math={String.raw`\mu_N, \ldots, \mu_1`} />,
            then <InlineMath math={String.raw`Y(t) = N - X(t)`} /> is a pure birth process with birth rates{' '}
            <InlineMath math={String.raw`\lambda_k = \mu_{N-k}`} />.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            The sojourn time <InlineMath math={String.raw`S_k`} /> for the death process at state <InlineMath math="k" /> is
            exactly <InlineMath math={String.raw`S_{N-k}`} /> for the corresponding birth process.
          </p>
        </div>

        <MirrorRelationVisualizer />
      </Section>

      {/* ─── Section 6.2.3: Linear Pure Death ─── */}
      <Section title="6.2.3 Linear Pure Death Process" id="linear-death" color="from-red-400 to-rose-400">
        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Linear Pure Death Process)</h4>
          <p className="text-slate-300 mb-3">
            A pure death process with <strong className="text-indigo-300">linear death rates</strong>:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`\mu_k = k\alpha, \qquad k = 0, 1, \ldots, N`} />
          </div>
          <p className="text-slate-300">
            That is, <InlineMath math={String.raw`\mu_N = N\alpha`} />, <InlineMath math={String.raw`\mu_{N-1} = (N-1)\alpha`} />,{' '}
            ..., <InlineMath math={String.raw`\mu_1 = \alpha`} />.
            Each individual dies independently at rate <InlineMath math={String.raw`\alpha`} />,
            so the total death rate when <InlineMath math="k" /> individuals remain is <InlineMath math={String.raw`k\alpha`} />.
          </p>
        </div>

        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-red-400 mb-2">Example 6.4 (continued): 300 Spartans with iid Lifetimes</h4>
          <p className="text-slate-300 mb-3">
            Assume the <InlineMath math="N = 300" /> Spartan soldiers have iid lifetimes following a common{' '}
            <InlineMath math={String.raw`\text{Exp}(\alpha)`} /> distribution. Let{' '}
            <InlineMath math={String.raw`\xi_i`} />, <InlineMath math="i = 1, \ldots, N" />,
            be these lifetimes. Then <InlineMath math={String.raw`X(t)`} />, the number of surviving soldiers at
            time <InlineMath math="t" />, is a linear pure death process with <InlineMath math={String.raw`\mu_k = k\alpha`} />.
          </p>

          <Collapsible title="Proof that P(X(t+h) - X(t) = -1 | X(t) = k) = k*alpha*h + o(h)">
            <div className="text-slate-300 space-y-3 text-sm">
              <p>We need to show the death rate when <InlineMath math="k" /> soldiers survive is <InlineMath math={String.raw`k\alpha`} />.</p>
              <div className="math-block">
                <BlockMath math={String.raw`P(X(t+h) - X(t) = -1 \mid X(t) = k)`} />
              </div>
              <p>= P(exactly one of the <InlineMath math="k" /> surviving soldiers dies in <InlineMath math="(t, t+h]" />)</p>
              <div className="math-block">
                <BlockMath math={String.raw`= k \cdot P(\xi_1 \in (t, t+h] \mid \xi_1 \geq t) \cdot \prod_{j=2}^{k} P(\xi_j \geq t+h \mid \xi_j \geq t)`} />
              </div>
              <p>By the memoryless property of the exponential distribution:</p>
              <div className="math-block">
                <BlockMath math={String.raw`= k \cdot \frac{e^{-\alpha t} - e^{-\alpha(t+h)}}{e^{-\alpha t}} \cdot \prod_{j=2}^{k} \frac{e^{-\alpha(t+h)}}{e^{-\alpha t}}`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= k \cdot [1 - e^{-\alpha h}] \cdot e^{-(k-1)\alpha h} = k\alpha h + o(h)`} />
              </div>
            </div>
          </Collapsible>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Marginal Distribution -- Binomial!)</h4>
          <p className="text-slate-300 mb-3">
            For the linear pure death process with <InlineMath math={String.raw`\mu_k = k\alpha`} /> and <InlineMath math={String.raw`X(0) = N`} />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(X(t) = k) = \binom{N}{k} e^{-\alpha t k} (1 - e^{-\alpha t})^{N-k}, \qquad k = 0, 1, \ldots, N`} />
          </div>
          <p className="text-slate-300 mt-3">
            This is a <strong className="text-yellow-300">Binomial</strong><InlineMath math={String.raw`(N, e^{-\alpha t})`} /> distribution!
            Each of the <InlineMath math="N" /> soldiers independently survives past time <InlineMath math="t" /> with
            probability <InlineMath math={String.raw`e^{-\alpha t}`} />.
          </p>

          <Collapsible title="Derivation">
            <div className="text-slate-300 space-y-3 text-sm">
              <p>
                Since lifetimes <InlineMath math={String.raw`\xi_1, \ldots, \xi_N`} /> are iid <InlineMath math={String.raw`\text{Exp}(\alpha)`} />:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`P(X(t) = k) = P\big(k \text{ of the } \xi_i \text{ are } \geq t \text{ and } N-k \text{ are } < t\big)`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= \binom{N}{k} P(\xi_i > t)^k \cdot P(\xi_i \leq t)^{N-k} = \binom{N}{k} e^{-\alpha t k}(1 - e^{-\alpha t})^{N-k}`} />
              </div>
            </div>
          </Collapsible>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Time to Extinction)</h4>
          <p className="text-slate-300 mb-3">
            Let <InlineMath math={String.raw`W_N`} /> be the time to extinction (when all <InlineMath math="N" /> individuals have died).
            Then:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(W_N < t) = (1 - e^{-\alpha t})^N`} />
          </div>
          <p className="text-slate-300 mt-3">
            This follows because extinction occurs when <InlineMath math={String.raw`X(t) = 0`} />, which means all <InlineMath math="N" /> lifetimes
            are less than <InlineMath math="t" />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P(W_N < t) = P(\xi_1 < t, \ldots, \xi_N < t) = (1 - e^{-\alpha t})^N`} />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            The expected value is <InlineMath math={String.raw`E[X(t)] = N e^{-\alpha t}`} />, decaying exponentially.
          </p>
        </div>

        <SpartansSimulator />
      </Section>

      {/* ─── Section 6.3: Birth and Death Processes ─── */}
      <Section title="6.3 Birth and Death Processes" id="birth-death" color="from-emerald-400 to-teal-400">
        <div className="example-box mb-6">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Example 6.5: The Australian Rabbits</h4>
          <p className="text-slate-300 mb-3">
            Australian rabbits, introduced by Europeans in the 18th century, experienced explosive population growth,
            causing about <strong className="text-red-400">70%</strong> loss of plant species and devastating land erosion.
          </p>
          <p className="text-slate-300 mb-3">
            With few natural predators, <em className="text-amber-300">the deciding factor for population growth/decrease is
            the population size itself</em>: small (large) population implies abundant (scarce) food supply per rabbit.
            Such a process is properly modeled by a <strong className="text-emerald-300">birth and death process</strong>.
          </p>
        </div>

        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Definition (Birth-Death Process)</h4>
          <p className="text-slate-300 mb-3">
            <InlineMath math={String.raw`\{X(t) : t \in [0, \infty)\}`} /> is a <strong className="text-indigo-300">birth-death process</strong> with
            birth rates <InlineMath math={String.raw`\lambda_0, \lambda_1, \ldots`} /> and
            death rates <InlineMath math={String.raw`\mu_0 = 0, \mu_1, \mu_2, \ldots`} /> if it is a
            continuous-time Markov chain with state space <InlineMath math={String.raw`\{0, 1, 2, \ldots\}`} /> satisfying:
          </p>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Postulate 1 (Infinitesimal Probabilities)</h4>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(i)</strong> Probability of a birth:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_{k,k+1}(h) \equiv P(X(t+h) = k+1 \mid X(t) = k) = \lambda_k h + o(h)`} />
          </div>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(ii)</strong> Probability of a death:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_{k,k-1}(h) \equiv P(X(t+h) = k-1 \mid X(t) = k) = \mu_k h + o(h)`} />
          </div>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(iii)</strong> Probability of no change:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_{k,k}(h) \equiv P(X(t+h) = k \mid X(t) = k) = 1 - \lambda_k h - \mu_k h + o(h)`} />
          </div>
          <p className="text-slate-300">
            <strong className="text-slate-200">(iv)</strong> <InlineMath math={String.raw`P_{i,j}(0) = 1`} /> if <InlineMath math="i = j" />,
            and 0 if <InlineMath math={String.raw`i \neq j`} />.
          </p>
        </div>

        <div className="definition-box mb-6">
          <h4 className="text-lg font-bold text-indigo-400 mb-3">Postulate 3 (Sojourn Times)</h4>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(i)</strong> The sojourn times are all independent.
          </p>
          <p className="text-slate-300 mb-2">
            <strong className="text-slate-200">(ii)</strong> The sojourn time at state <InlineMath math="k" /> follows{' '}
            <InlineMath math={String.raw`\text{Exp}(\lambda_k + \mu_k)`} />:
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`f_{S_{i,k}}(t) = (\lambda_k + \mu_k)\, e^{-(\lambda_k + \mu_k)t}, \qquad t \geq 0`} />
          </div>
          <p className="text-slate-300">
            Upon leaving state <InlineMath math="k" />, the process goes up to <InlineMath math="k+1" /> with
            probability <InlineMath math={String.raw`\frac{\lambda_k}{\lambda_k + \mu_k}`} /> and
            down to <InlineMath math="k-1" /> with
            probability <InlineMath math={String.raw`\frac{\mu_k}{\lambda_k + \mu_k}`} />.
          </p>
        </div>
      </Section>

      {/* ─── Section 6.3.2: Chapman-Kolmogorov ─── */}
      <Section title="6.3.2 Chapman-Kolmogorov Equations" id="chapman-kolmogorov" color="from-amber-400 to-yellow-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Chapman-Kolmogorov Equations)</h4>
          <p className="text-slate-300 mb-3">
            For a birth-death process (and more generally any continuous-time Markov chain):
          </p>
          <div className="math-block">
            <BlockMath math={String.raw`P_{i,j}(t + s) = \sum_{k=0}^{\infty} P_{i,k}(t) \cdot P_{k,j}(s)`} />
          </div>
          <p className="text-slate-300 mt-3">
            This is the continuous-time analogue of the discrete-time Chapman-Kolmogorov equations{' '}
            <InlineMath math={String.raw`P^{(n)}_{i,j} = \sum_k P^{(m)}_{i,k} P^{(n-m)}_{k,j}`} />.
          </p>

          <Collapsible title="Proof">
            <div className="text-slate-300 space-y-3 text-sm">
              <div className="math-block">
                <BlockMath math={String.raw`P_{i,j}(t+s) = P(X(t+s) = j \mid X(0) = i)`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= \sum_{k=0}^{\infty} P(X(t+s) = j,\, X(t) = k \mid X(0) = i)`} />
              </div>
              <p>By the Markov property, conditioning on <InlineMath math="X(t) = k" />:</p>
              <div className="math-block">
                <BlockMath math={String.raw`= \sum_{k=0}^{\infty} P(X(t+s) = j \mid X(t) = k)\, P(X(t) = k \mid X(0) = i)`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= \sum_{k=0}^{\infty} P_{k,j}(s) \cdot P_{i,k}(t)`} />
              </div>
            </div>
          </Collapsible>
        </div>
      </Section>

      {/* ─── Section 6.3.3: Differential Equations ─── */}
      <Section title="6.3.3 Kolmogorov Differential Equations" id="diff-equations" color="from-purple-400 to-indigo-400">
        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Kolmogorov Backward Equations)</h4>
          <p className="text-slate-300 mb-3">
            Recall <InlineMath math={String.raw`P_{i,j}(t) \equiv P(X(s+t) = j \mid X(s) = i)`} />. The backward equations are:
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`\begin{cases} P'_{0,j}(t) = -\lambda_0\, P_{0,j}(t) + \lambda_0\, P_{1,j}(t) & j \geq 0 \\ P'_{i,j}(t) = \mu_i\, P_{i-1,j}(t) - (\lambda_i + \mu_i)\, P_{i,j}(t) + \lambda_i\, P_{i+1,j}(t) & i \geq 1,\; j \geq 0 \end{cases}`} />
          </div>
          <p className="text-slate-300">
            with initial condition <InlineMath math={String.raw`P_{i,j}(0) = 1`} /> if <InlineMath math="i = j" />,
            and 0 otherwise.
          </p>

          <Collapsible title="Proof">
            <div className="text-slate-300 space-y-3 text-sm">
              <p>By the Chapman-Kolmogorov equations:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P_{i,j}(t+h) = \sum_{k=0}^{\infty} P_{i,k}(h)\, P_{k,j}(t)`} />
              </div>
              <p>Expanding the sum and keeping only the dominant terms:</p>
              <div className="math-block">
                <BlockMath math={String.raw`= P_{i,i}(h)\, P_{i,j}(t) + P_{i,i+1}(h)\, P_{i+1,j}(t) + P_{i,i-1}(h)\, P_{i-1,j}(t) + o(h)`} />
              </div>
              <p>Substituting the infinitesimal probabilities (for <InlineMath math={String.raw`i \geq 1`} />):</p>
              <div className="math-block">
                <BlockMath math={String.raw`= [1 - (\lambda_i + \mu_i)h]\, P_{i,j}(t) + \lambda_i h\, P_{i+1,j}(t) + \mu_i h\, P_{i-1,j}(t) + o(h)`} />
              </div>
              <p>Rearranging and dividing by <InlineMath math="h" />, then taking <InlineMath math={String.raw`h \to 0`} />:</p>
              <div className="math-block">
                <BlockMath math={String.raw`P'_{i,j}(t) = \mu_i\, P_{i-1,j}(t) - (\lambda_i + \mu_i)\, P_{i,j}(t) + \lambda_i\, P_{i+1,j}(t)`} />
              </div>
              <p>The case <InlineMath math="i = 0" /> is identical but with <InlineMath math={String.raw`\mu_0 = 0`} />.</p>
            </div>
          </Collapsible>
        </div>

        <div className="theorem-box mb-6">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">Theorem (Kolmogorov Forward Equations)</h4>
          <p className="text-slate-300 mb-3">
            The forward equations differentiate with respect to the <em>second</em> time argument:
          </p>
          <div className="math-block mb-3">
            <BlockMath math={String.raw`\begin{cases} P'_{i,0}(t) = -\lambda_0\, P_{i,0}(t) + \mu_1\, P_{i,1}(t) & i \geq 0 \\ P'_{i,j}(t) = \lambda_{j-1}\, P_{i,j-1}(t) - (\lambda_j + \mu_j)\, P_{i,j}(t) + \mu_{j+1}\, P_{i,j+1}(t) & i \geq 0,\; j \geq 1 \end{cases}`} />
          </div>
          <p className="text-slate-300">
            with <InlineMath math={String.raw`P_{i,j}(0) = \delta_{ij}`} />.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            Proof: Uses <InlineMath math={String.raw`P_{i,j}(t+h) = \sum_k P_{i,k}(t)\, P_{k,j}(h)`} /> (DIY exercise).
          </p>
        </div>

        <BirthDeathSimulator />
      </Section>

      {/* ─── Key Takeaways ─── */}
      <Section title="Key Takeaways" id="takeaways" color="from-amber-400 to-rose-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-rose-900/20 border border-rose-700/50">
            <h4 className="text-rose-400 font-bold mb-2">Pure Death Process</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li>State space <InlineMath math={String.raw`\{0, 1, \ldots, N\}`} />, paths can only decrease</li>
              <li>Death rate <InlineMath math={String.raw`\mu_k`} /> when in state <InlineMath math="k" /></li>
              <li>Sojourn time at state <InlineMath math="k" /> is <InlineMath math={String.raw`\text{Exp}(\mu_k)`} /></li>
              <li>Three equivalent postulates (infinitesimal, marginal, sojourn)</li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-cyan-900/20 border border-cyan-700/50">
            <h4 className="text-cyan-400 font-bold mb-2">Mirror Relation</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li><InlineMath math={String.raw`X(t) = N - Y(t)`} /> converts birth to death and vice versa</li>
              <li>Birth rates <InlineMath math={String.raw`\lambda_k`} /> map to death rates <InlineMath math={String.raw`\mu_{N-k}`} /></li>
              <li>Same underlying events, different counting perspectives</li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-red-900/20 border border-red-700/50">
            <h4 className="text-red-400 font-bold mb-2">Linear Pure Death</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li>Death rates <InlineMath math={String.raw`\mu_k = k\alpha`} /> (iid exponential lifetimes)</li>
              <li>Marginal distribution: <InlineMath math={String.raw`\text{Bin}(N, e^{-\alpha t})`} /></li>
              <li>Expected value: <InlineMath math={String.raw`E[X(t)] = Ne^{-\alpha t}`} /></li>
              <li>Time to extinction: <InlineMath math={String.raw`P(W_N < t) = (1 - e^{-\alpha t})^N`} /></li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-emerald-900/20 border border-emerald-700/50">
            <h4 className="text-emerald-400 font-bold mb-2">Birth-Death Process</h4>
            <ul className="text-slate-300 space-y-2 text-sm list-disc list-inside">
              <li>Can go up (birth, rate <InlineMath math={String.raw`\lambda_k`} />) or down (death, rate <InlineMath math={String.raw`\mu_k`} />)</li>
              <li>Sojourn at state <InlineMath math="k" />: <InlineMath math={String.raw`\text{Exp}(\lambda_k + \mu_k)`} /></li>
              <li>Chapman-Kolmogorov: <InlineMath math={String.raw`P_{i,j}(t+s) = \sum_k P_{i,k}(t) P_{k,j}(s)`} /></li>
              <li>Kolmogorov backward and forward differential equations</li>
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
            Pure death processes are the mirror image of the pure birth processes from Section 6.1.
            Together, they are the building blocks for <strong className="text-amber-300">birth-death processes</strong>,
            which are the most general "one-step-at-a-time" continuous-time Markov chains.
            The Kolmogorov differential equations give us a systematic tool for analyzing these processes,
            connecting the infinitesimal transition probabilities to the global behavior of{' '}
            <InlineMath math={String.raw`P_{i,j}(t)`} />.
          </p>
        </motion.div>
      </Section>
    </div>
  )
}
