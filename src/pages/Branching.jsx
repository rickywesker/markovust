import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'

/* ================================================================== */
/*  Reusable scroll-triggered fade-in wrapper                          */
/* ================================================================== */
function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ================================================================== */
/*  Section wrapper                                                    */
/* ================================================================== */
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
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

/* ================================================================== */
/*  Collapsible panel for hints / solutions                            */
/* ================================================================== */
function Collapsible({ label, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary text-sm !px-4 !py-2"
      >
        {open ? 'Hide' : 'Show'} {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================================================================== */
/*  Helper: sample from discrete distribution                          */
/* ================================================================== */
function sampleDiscrete(probs) {
  const u = Math.random()
  let cum = 0
  for (let k = 0; k < probs.length; k++) {
    cum += probs[k]
    if (u < cum) return k
  }
  return probs.length - 1
}

/* ================================================================== */
/*  Helper: PGF evaluation phi(s) = sum p_k s^k                       */
/* ================================================================== */
function pgf(probs, s) {
  let val = 0
  for (let k = 0; k < probs.length; k++) {
    val += probs[k] * Math.pow(s, k)
  }
  return val
}

/* ================================================================== */
/*  Helper: compute mean of offspring distribution                     */
/* ================================================================== */
function offspringMean(probs) {
  let mu = 0
  for (let k = 0; k < probs.length; k++) mu += k * probs[k]
  return mu
}

/* ================================================================== */
/*  Helper: compute variance of offspring distribution                 */
/* ================================================================== */
function offspringVar(probs) {
  const mu = offspringMean(probs)
  let e2 = 0
  for (let k = 0; k < probs.length; k++) e2 += k * k * probs[k]
  return e2 - mu * mu
}

/* ================================================================== */
/*  1. FAMILY TREE VISUALIZER (Canvas)                                 */
/* ================================================================== */
function FamilyTreeVisualizer() {
  const canvasRef = useRef(null)
  const [probs, setProbs] = useState([0.17, 0.50, 0.25, 0.05, 0.02, 0.01])
  const [tree, setTree] = useState([[1]]) // each generation is array of node counts (children per parent)
  const [populationHistory, setPopulationHistory] = useState([1])
  const [animating, setAnimating] = useState(false)

  const mu = offspringMean(probs)

  const growOneGeneration = useCallback(() => {
    if (animating) return
    setAnimating(true)
    setTree(prev => {
      const lastGen = prev[prev.length - 1]
      const totalPop = lastGen.reduce((a, b) => a + b, 0)
      if (totalPop === 0) { setAnimating(false); return prev }
      const newGen = []
      for (let i = 0; i < totalPop; i++) {
        const nChildren = sampleDiscrete(probs)
        newGen.push(nChildren)
      }
      const newTree = [...prev, newGen]
      const newPop = newGen.reduce((a, b) => a + b, 0)
      setPopulationHistory(h => [...h, newPop])
      setTimeout(() => setAnimating(false), 300)
      return newTree
    })
  }, [probs, animating])

  const reset = useCallback(() => {
    setTree([[1]])
    setPopulationHistory([1])
  }, [])

  // Draw tree on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height
    ctx.clearRect(0, 0, W, H)

    const nGens = tree.length
    const maxDisplay = Math.min(nGens, 8)
    const genHeight = H / (maxDisplay + 1)
    const nodeRadius = Math.max(4, Math.min(10, 120 / (populationHistory[populationHistory.length - 1] || 1)))

    const colors = ['#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22']

    // Build flat positions for each generation
    const positions = []
    for (let g = 0; g < maxDisplay; g++) {
      const genIdx = nGens - maxDisplay + g
      if (genIdx < 0) { positions.push([]); continue }
      const gen = tree[genIdx]
      const pop = gen.reduce((a, b) => a + b, 0)
      const genPositions = []
      const spacing = pop > 0 ? Math.min(W / (pop + 1), 30) : W / 2
      const startX = (W - spacing * (pop - 1)) / 2
      for (let i = 0; i < pop; i++) {
        genPositions.push({ x: startX + i * spacing, y: genHeight * (g + 0.5) })
      }
      positions.push(genPositions)
    }

    // Draw edges
    ctx.lineWidth = 0.8
    for (let g = 0; g < maxDisplay - 1; g++) {
      const genIdx = nGens - maxDisplay + g
      if (genIdx < 0) continue
      const parentPositions = positions[g]
      const childPositions = positions[g + 1]
      if (!parentPositions || !childPositions) continue

      const gen = tree[genIdx]
      const pop = gen.reduce((a, b) => a + b, 0)
      if (pop !== parentPositions.length) continue

      let childIdx = 0
      // For tree[genIdx+1], each entry is the # of children of parent i in genIdx
      // But tree stores children-per-parent for the NEXT gen
      // tree[g] = array of "number of children" for each individual in gen g
      for (let p = 0; p < parentPositions.length; p++) {
        const nC = gen[p]
        for (let c = 0; c < nC && childIdx < childPositions.length; c++) {
          ctx.strokeStyle = 'rgba(100,200,160,0.3)'
          ctx.beginPath()
          ctx.moveTo(parentPositions[p].x, parentPositions[p].y)
          ctx.lineTo(childPositions[childIdx].x, childPositions[childIdx].y)
          ctx.stroke()
          childIdx++
        }
      }
    }

    // Draw nodes
    for (let g = 0; g < maxDisplay; g++) {
      const genIdx = nGens - maxDisplay + g
      if (genIdx < 0) continue
      const gPos = positions[g]
      const color = colors[g % colors.length]
      for (const pos of gPos) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      // generation label
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px sans-serif'
      ctx.fillText(`n=${genIdx}`, 8, genHeight * (g + 0.5) + 4)
    }

    // If population is 0
    if (populationHistory[populationHistory.length - 1] === 0) {
      ctx.fillStyle = '#f87171'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('EXTINCT', W / 2, H / 2)
      ctx.textAlign = 'start'
    }
  }, [tree, populationHistory])

  return (
    <FadeIn>
      <div className="example-box">
        <h3 className="text-xl font-bold text-emerald-400 mb-2">Family Tree Visualizer</h3>
        <p className="text-slate-300 mb-3">
          Set the offspring distribution and grow the branching process one generation at a time.
          Each node represents an individual; edges connect parent to children.
        </p>
        <div className="mb-3 text-sm text-slate-400">
          <InlineMath math={String.raw`\mu = E(\xi) \approx ${mu.toFixed(4)}`} />
          {' '} | Generation: {populationHistory.length - 1} | Population: {populationHistory[populationHistory.length - 1]}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {probs.map((p, k) => (
            <div key={k} className="text-center">
              <label className="text-xs text-slate-400 block">p<sub>{k}</sub></label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={p}
                onChange={e => {
                  const newP = [...probs]
                  newP[k] = parseFloat(e.target.value) || 0
                  setProbs(newP)
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs text-center text-slate-200"
              />
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 mb-3">
          Sum = {probs.reduce((a, b) => a + b, 0).toFixed(4)} (should be 1.00)
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => { setProbs([0.5, 0.3, 0.2]); reset() }} className="px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
            Subcritical (&#956;&#8776;0.7)
          </button>
          <button onClick={() => { setProbs([0.2, 0.6, 0.2]); reset() }} className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/30 transition-colors">
            Critical (&#956;=1.0)
          </button>
          <button onClick={() => { setProbs([0.1, 0.3, 0.6]); reset() }} className="px-3 py-1 rounded bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30 transition-colors">
            Supercritical (&#956;&#8776;1.5)
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button className="btn-primary text-sm !px-4 !py-2" onClick={growOneGeneration}>
            Grow One Generation
          </button>
          <button className="btn-primary text-sm !px-4 !py-2" onClick={() => {
            for (let i = 0; i < 5; i++) setTimeout(growOneGeneration, i * 400)
          }}>
            Grow 5 Generations
          </button>
          <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>
            Reset
          </button>
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
        </div>
        <div className="mt-3 text-sm text-slate-400">
          Population trajectory: [{populationHistory.join(', ')}]
        </div>
      </div>
    </FadeIn>
  )
}

/* ================================================================== */
/*  2. POPULATION GROWTH CHART (Canvas) - Multiple simulation runs     */
/* ================================================================== */
function PopulationGrowthChart() {
  const canvasRef = useRef(null)
  const [probs, setProbs] = useState([0.17, 0.50, 0.25, 0.05, 0.02, 0.01])
  const [nGens, setNGens] = useState(20)
  const [nRuns, setNRuns] = useState(10)
  const [logScale, setLogScale] = useState(false)
  const [runs, setRuns] = useState([])
  const mu = offspringMean(probs)

  const simulate = useCallback(() => {
    const newRuns = []
    for (let r = 0; r < nRuns; r++) {
      const traj = [1]
      for (let g = 0; g < nGens; g++) {
        const pop = traj[traj.length - 1]
        if (pop === 0) { traj.push(0); continue }
        let next = 0
        for (let i = 0; i < pop; i++) next += sampleDiscrete(probs)
        traj.push(Math.min(next, 100000)) // cap for display
      }
      newRuns.push(traj)
    }
    setRuns(newRuns)
  }, [probs, nGens, nRuns])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height
    ctx.clearRect(0, 0, W, H)

    const pad = { left: 55, right: 20, top: 20, bottom: 35 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    // Find max value
    let maxVal = 1
    for (const run of runs) {
      for (const v of run) maxVal = Math.max(maxVal, v)
    }
    // Also include theoretical
    const theoMax = Math.pow(Math.max(mu, 1.001), nGens)
    maxVal = Math.max(maxVal, Math.min(theoMax, 100000))

    const toX = g => pad.left + (g / nGens) * plotW
    const toY = v => {
      if (logScale) {
        const lv = Math.log10(Math.max(v, 0.1))
        const lmax = Math.log10(Math.max(maxVal, 1))
        return pad.top + plotH - (lv / Math.max(lmax, 1)) * plotH
      }
      return pad.top + plotH - (v / maxVal) * plotH
    }

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * plotH
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(W - pad.right, pad.top + plotH)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let g = 0; g <= nGens; g += Math.max(1, Math.floor(nGens / 5))) {
      ctx.fillText(g, toX(g), pad.top + plotH + 18)
    }
    ctx.fillText('Generation n', pad.left + plotW / 2, H - 3)

    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (1 - i / 4) * plotH
      let val
      if (logScale) {
        val = Math.pow(10, (i / 4) * Math.log10(Math.max(maxVal, 1)))
        ctx.fillText(val >= 100 ? Math.round(val) : val.toFixed(1), pad.left - 6, y + 4)
      } else {
        val = (i / 4) * maxVal
        ctx.fillText(val >= 10 ? Math.round(val) : val.toFixed(1), pad.left - 6, y + 4)
      }
    }

    // Theoretical E[X_n] = mu^n
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let g = 0; g <= nGens; g++) {
      const v = Math.pow(mu, g)
      const x = toX(g)
      const y = toY(Math.min(v, maxVal))
      if (g === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Label for theoretical
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('E[X_n] = \u03BC^n', toX(nGens) - 70, toY(Math.min(Math.pow(mu, nGens), maxVal)) - 8)

    // Simulation runs
    const runColors = ['#6ee7b7', '#67e8f9', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#86efac', '#c084fc', '#f9a8d4', '#fdba74']
    for (let r = 0; r < runs.length; r++) {
      const traj = runs[r]
      ctx.strokeStyle = runColors[r % runColors.length]
      ctx.lineWidth = 1.2
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      for (let g = 0; g < traj.length; g++) {
        const x = toX(g)
        const y = toY(traj[g])
        if (g === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0
  }, [runs, nGens, logScale, mu])

  return (
    <FadeIn>
      <div className="example-box">
        <h3 className="text-xl font-bold text-emerald-400 mb-2">Population Growth Simulator</h3>
        <p className="text-slate-300 mb-3">
          Simulate multiple independent branching processes and overlay them.
          The <span className="text-amber-400">dashed yellow line</span> shows the theoretical mean{' '}
          <InlineMath math={String.raw`E[X_n] = \mu^n`} />.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Generations</label>
            <input type="range" min="5" max="50" value={nGens} onChange={e => setNGens(+e.target.value)} className="w-full" />
            <span className="text-xs text-slate-500">{nGens}</span>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Runs</label>
            <input type="range" min="1" max="30" value={nRuns} onChange={e => setNRuns(+e.target.value)} className="w-full" />
            <span className="text-xs text-slate-500">{nRuns}</span>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Mean <InlineMath math="\mu" /></label>
            <span className="text-emerald-400 font-mono text-sm">{mu.toFixed(4)}</span>
          </div>
          <div className="flex items-end">
            <button
              className={logScale ? 'btn-primary text-xs !px-3 !py-1' : 'btn-secondary text-xs !px-3 !py-1'}
              onClick={() => setLogScale(!logScale)}
            >
              {logScale ? 'Log Scale' : 'Linear Scale'}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">Quick presets:</label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => { setProbs([0.17, 0.50, 0.25, 0.05, 0.02, 0.01]); }}>
              Confucius (mu=1.2)
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => { setProbs([0.5, 0.5]); }}>
              p0=p1=1/2 (mu=0.5)
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => { setProbs([0.25, 0, 0.75]); }}>
              p0=1/4, p2=3/4 (mu=1.5)
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => { setProbs([0.3, 0.4, 0.3]); }}>
              mu=1 critical
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button className="btn-primary text-sm !px-4 !py-2" onClick={simulate}>Run Simulations</button>
        </div>
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
        </div>
      </div>
    </FadeIn>
  )
}

/* ================================================================== */
/*  3. EXTINCTION PROBABILITY - PGF + Cobweb (Canvas)                  */
/* ================================================================== */
function ExtinctionProbabilityViz() {
  const canvasRef = useRef(null)
  const [probs, setProbs] = useState([0.25, 0, 0.75])
  const [nIter, setNIter] = useState(20)
  const [showCobweb, setShowCobweb] = useState(true)

  const mu = offspringMean(probs)
  const p0 = probs[0] || 0

  // Compute u_inf numerically via iteration
  const computeExtinction = useCallback(() => {
    let u = 0
    for (let i = 0; i < 200; i++) {
      u = pgf(probs, u)
    }
    return u
  }, [probs])

  const uInf = computeExtinction()

  // Determine case
  let caseLabel = ''
  if (p0 === 0) caseLabel = 'Case 1: p_0 = 0, no extinction possible, u_\\infty = 0'
  else if (mu <= 1) caseLabel = 'Case 2: \\mu \\le 1, certain extinction, u_\\infty = 1'
  else caseLabel = `Case 3: \\mu > 1, u_\\infty = ${uInf.toFixed(6)} < 1`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height
    ctx.clearRect(0, 0, W, H)

    const pad = { left: 50, right: 20, top: 20, bottom: 40 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    const toX = s => pad.left + s * plotW
    const toY = v => pad.top + plotH - v * plotH

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4
      ctx.beginPath(); ctx.moveTo(toX(0), toY(frac)); ctx.lineTo(toX(1), toY(frac)); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(toX(frac), toY(0)); ctx.lineTo(toX(frac), toY(1)); ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(W - pad.right, pad.top + plotH)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 4; i++) {
      const v = i / 4
      ctx.fillText(v.toFixed(2), toX(v), pad.top + plotH + 16)
    }
    ctx.fillText('s', pad.left + plotW / 2, H - 3)
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const v = i / 4
      ctx.fillText(v.toFixed(2), pad.left - 6, toY(v) + 4)
    }

    // Identity line s = s
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(0))
    ctx.lineTo(toX(1), toY(1))
    ctx.stroke()
    ctx.setLineDash([])

    // PGF curve phi(s)
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    const steps = 200
    for (let i = 0; i <= steps; i++) {
      const s = i / steps
      const v = pgf(probs, s)
      const x = toX(s)
      const y = toY(Math.min(v, 1))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Labels
    ctx.fillStyle = '#a78bfa'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('\u03C6(s)', toX(0.05), toY(pgf(probs, 0.05)) - 12)

    ctx.fillStyle = '#64748b'
    ctx.fillText('y = s', toX(0.85), toY(0.85) - 8)

    // Mark fixed points
    // phi(1) = 1 always
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(toX(1), toY(1), 6, 0, Math.PI * 2)
    ctx.fill()

    // Mark u_inf if in (0,1)
    if (uInf > 0.001 && uInf < 0.999) {
      ctx.fillStyle = '#f87171'
      ctx.beginPath()
      ctx.arc(toX(uInf), toY(uInf), 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f87171'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`u\u221E = ${uInf.toFixed(4)}`, toX(uInf) + 10, toY(uInf) - 4)
    }

    // Cobweb diagram
    if (showCobweb) {
      ctx.strokeStyle = '#34d399'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.8
      let u = 0
      ctx.beginPath()
      ctx.moveTo(toX(u), toY(0))
      for (let i = 0; i < nIter; i++) {
        const phi_u = pgf(probs, u)
        // Vertical to phi curve
        ctx.lineTo(toX(u), toY(phi_u))
        // Horizontal to identity line
        ctx.lineTo(toX(phi_u), toY(phi_u))
        u = phi_u
        if (u > 0.9999) break
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [probs, nIter, showCobweb, uInf])

  return (
    <FadeIn>
      <div className="example-box">
        <h3 className="text-xl font-bold text-purple-400 mb-2">Extinction Probability Calculator</h3>
        <p className="text-slate-300 mb-3">
          The <span className="text-purple-400">purple curve</span> is the PGF{' '}
          <InlineMath math={String.raw`\varphi(s) = \sum_k p_k s^k`} />.
          The <span className="text-emerald-400">green cobweb</span> shows iteration{' '}
          <InlineMath math="u_{n} = \varphi(u_{n-1})" /> converging to{' '}
          <InlineMath math="u_\infty" />.
        </p>

        <div className="mb-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
          <div className="text-sm">
            <InlineMath math={caseLabel} />
          </div>
          <div className="text-sm mt-1 text-slate-400">
            <InlineMath math={String.raw`\mu = ${mu.toFixed(4)}`} />{' | '}
            <InlineMath math={String.raw`u_\infty = ${uInf.toFixed(6)}`} />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">Quick presets:</label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => setProbs([0.25, 0, 0.75])}>
              p0=1/4, p2=3/4
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => setProbs([0.5, 0.5])}>
              p0=p1=1/2
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => setProbs([0.17, 0.50, 0.25, 0.05, 0.02, 0.01])}>
              Confucius
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => setProbs([0, 0, 1])}>
              p0=0 (no extinction)
            </button>
            <button className="btn-secondary text-xs !px-3 !py-1" onClick={() => setProbs([0.4, 0.2, 0.4])}>
              mu=1 critical
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div>
            <label className="text-xs text-slate-400 block">Cobweb iterations</label>
            <input type="range" min="1" max="50" value={nIter} onChange={e => setNIter(+e.target.value)} className="w-32" />
            <span className="text-xs text-slate-500 ml-1">{nIter}</span>
          </div>
          <button
            className={showCobweb ? 'btn-primary text-xs !px-3 !py-1' : 'btn-secondary text-xs !px-3 !py-1'}
            onClick={() => setShowCobweb(!showCobweb)}
          >
            {showCobweb ? 'Hide' : 'Show'} Cobweb
          </button>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 380 }} />
        </div>
      </div>
    </FadeIn>
  )
}

/* ================================================================== */
/*  4. CONFUCIUS DESCENDANTS SIMULATOR (Canvas)                        */
/* ================================================================== */
function ConfuciusSimulator() {
  const canvasRef = useRef(null)
  const CONFUCIUS_PROBS = [0.17, 0.50, 0.25, 0.05, 0.02, 0.01]
  const mu = offspringMean(CONFUCIUS_PROBS)
  const [nGens, setNGens] = useState(30)
  const [trajectories, setTrajectories] = useState([])

  const simulate = useCallback(() => {
    const runs = []
    for (let r = 0; r < 5; r++) {
      const traj = [1]
      for (let g = 0; g < nGens; g++) {
        const pop = traj[traj.length - 1]
        if (pop === 0) { traj.push(0); continue }
        let next = 0
        for (let i = 0; i < Math.min(pop, 50000); i++) next += sampleDiscrete(CONFUCIUS_PROBS)
        traj.push(next)
      }
      runs.push(traj)
    }
    setTrajectories(runs)
  }, [nGens])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height
    ctx.clearRect(0, 0, W, H)

    if (trajectories.length === 0) {
      ctx.fillStyle = '#64748b'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Click "Simulate" to run', W / 2, H / 2)
      return
    }

    const pad = { left: 60, right: 20, top: 20, bottom: 35 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    // Use log scale
    let maxVal = 1
    for (const t of trajectories) for (const v of t) maxVal = Math.max(maxVal, v)
    maxVal = Math.max(maxVal, Math.pow(mu, nGens))
    const logMax = Math.log10(Math.max(maxVal, 10))

    const toX = g => pad.left + (g / nGens) * plotW
    const toY = v => {
      const lv = Math.log10(Math.max(v, 0.5))
      return pad.top + plotH - (lv / logMax) * plotH
    }

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'
    ctx.lineWidth = 1
    for (let e = 0; e <= Math.ceil(logMax); e++) {
      const y = pad.top + plotH - (e / logMax) * plotH
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`10^${e}`, pad.left - 6, y + 4)
    }

    // Axes
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(W - pad.right, pad.top + plotH); ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let g = 0; g <= nGens; g += Math.max(1, Math.floor(nGens / 5))) {
      ctx.fillText(g, toX(g), pad.top + plotH + 16)
    }

    // Theoretical mu^n
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let g = 0; g <= nGens; g++) {
      const v = Math.pow(mu, g)
      if (g === 0) ctx.moveTo(toX(g), toY(v))
      else ctx.lineTo(toX(g), toY(v))
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Trajectories
    const colors = ['#6ee7b7', '#67e8f9', '#a78bfa', '#f472b6', '#fb923c']
    for (let r = 0; r < trajectories.length; r++) {
      const traj = trajectories[r]
      ctx.strokeStyle = colors[r % colors.length]
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      for (let g = 0; g < traj.length; g++) {
        const x = toX(g)
        const y = toY(traj[g])
        if (g === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('\u03BC^n (theory)', toX(nGens) - 80, toY(Math.pow(mu, nGens)) - 8)
  }, [trajectories, nGens, mu])

  return (
    <FadeIn>
      <div className="example-box">
        <h3 className="text-xl font-bold text-amber-400 mb-2">Example 3.11/3.12: Confucius Descendants</h3>
        <p className="text-slate-300 mb-3">
          With the Kong family distribution{' '}
          <InlineMath math={String.raw`\{p_0{=}0.17,\; p_1{=}0.50,\; p_2{=}0.25,\; p_3{=}0.05,\; p_4{=}0.02,\; p_5{=}0.01\}`} />,
          we get <InlineMath math={String.raw`\mu \approx 1.2`} /> so the population grows geometrically.
          By generation 80, the real family had about 1,300,000 descendants, yielding{' '}
          <InlineMath math={String.raw`\hat\mu = 1{,}300{,}000^{1/80} \approx 1.1924`} />.
        </p>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div>
            <label className="text-xs text-slate-400 block">Generations</label>
            <input type="range" min="10" max="60" value={nGens} onChange={e => setNGens(+e.target.value)} className="w-32" />
            <span className="text-xs text-slate-500 ml-1">{nGens}</span>
          </div>
          <button className="btn-primary text-sm !px-4 !py-2" onClick={simulate}>Simulate (5 runs)</button>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
          <canvas ref={canvasRef} className="w-full" style={{ height: 300 }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Log scale. Yellow dashed = theoretical mean trajectory.</p>
      </div>
    </FadeIn>
  )
}

/* ================================================================== */
/*  5. SARS SPREAD DIAGRAM (SVG)                                       */
/* ================================================================== */
function SARSDiagram() {
  return (
    <FadeIn>
      <div className="example-box">
        <h3 className="text-xl font-bold text-red-400 mb-2">Example 3.13: 2003 SARS Outbreak</h3>
        <p className="text-slate-300 mb-4">
          Mr. Liu (Generation 0) spread SARS to 19 people (Generation 1) across three locations.
          This is <em>not</em> a true branching process because medical intervention changed the dynamics
          in later generations.
        </p>
        <div className="flex justify-center overflow-x-auto">
          <svg viewBox="0 0 600 280" className="w-full max-w-2xl">
            {/* Gen 0: Mr. Liu */}
            <motion.circle cx="300" cy="30" r="18" fill="#ef4444" fillOpacity="0.3" stroke="#f87171" strokeWidth="2"
              initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', delay: 0.1 }} />
            <text x="300" y="35" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="bold">Mr. Liu</text>
            <text x="300" y="12" textAnchor="middle" fill="#94a3b8" fontSize="10">Gen 0 (X₀=1)</text>

            {/* Edges to Gen 1 groups */}
            {[150, 300, 450].map((x, i) => (
              <motion.line key={i} x1="300" y1="48" x2={x} y2="95"
                stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }} />
            ))}

            {/* Gen 1 groups */}
            {[
              { x: 150, label: 'KW Hospital', n: 4, color: '#f59e0b' },
              { x: 300, label: 'Metropole Hotel', n: 13, color: '#f59e0b' },
              { x: 450, label: 'Relatives', n: 2, color: '#f59e0b' },
            ].map((g, i) => (
              <g key={i}>
                <motion.rect x={g.x - 55} y="95" width="110" height="36" rx="8"
                  fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5"
                  initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                  transition={{ type: 'spring', delay: 0.5 + i * 0.1 }} />
                <text x={g.x} y="111" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">{g.label}</text>
                <text x={g.x} y="125" textAnchor="middle" fill="#fcd34d" fontSize="10">({g.n} infected)</text>
              </g>
            ))}

            <text x="300" y="85" textAnchor="middle" fill="#94a3b8" fontSize="10">Gen 1 (X₁=19)</text>

            {/* Gen 2 spread */}
            {[
              { x: 80, label: 'PW Hospital', parent: 150 },
              { x: 220, label: 'Amoy Garden', parent: 300 },
              { x: 370, label: 'Other HK', parent: 300 },
              { x: 510, label: 'International', parent: 450 },
            ].map((g, i) => (
              <g key={i}>
                <motion.line x1={g.parent} y1="131" x2={g.x} y2="175"
                  stroke="rgba(251,191,36,0.3)" strokeWidth="1.5"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }} />
                <motion.rect x={g.x - 50} y="175" width="100" height="30" rx="6"
                  fill="#6366f1" fillOpacity="0.15" stroke="#818cf8" strokeWidth="1.5"
                  initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                  transition={{ type: 'spring', delay: 0.9 + i * 0.1 }} />
                <text x={g.x} y="194" textAnchor="middle" fill="#a5b4fc" fontSize="10">{g.label}</text>
              </g>
            ))}

            <text x="300" y="168" textAnchor="middle" fill="#94a3b8" fontSize="10">Gen 2</text>

            {/* Note */}
            <motion.text x="300" y="240" textAnchor="middle" fill="#f87171" fontSize="11" fontStyle="italic"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }}>
              Not a true branching process: medical intervention changed offspring distribution
            </motion.text>
            <motion.text x="300" y="260" textAnchor="middle" fill="#94a3b8" fontSize="10"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.3 }}>
              Quarantine reduced effective reproduction number over time
            </motion.text>
          </svg>
        </div>
      </div>
    </FadeIn>
  )
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */
export default function Branching() {
  return (
    <div className="space-y-10">
      {/* ── Title ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            3.6 Branching Processes
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          Modeling populations where each individual reproduces independently
        </p>
      </motion.div>

      {/* ── Motivation ── */}
      <Section title="Motivation: The Descendants of Confucius" id="motivation">
        <p className="text-slate-300 mb-4">
          Branching processes are Markov chains used to model <strong className="text-emerald-400">population dynamics</strong>:
          how many descendants does a single ancestor produce over many generations? The key question is:
          will the family line survive or eventually go extinct?
        </p>
        <ConfuciusSimulator />
      </Section>

      {/* ── SARS Example ── */}
      <Section title="Example: SARS Outbreak" id="sars">
        <SARSDiagram />
      </Section>

      {/* ── Definition ── */}
      <Section title="Definition: Branching Process" id="definition">
        <FadeIn>
          <div className="definition-box">
            <h3 className="text-xl font-bold text-indigo-400 mb-3">Branching Process</h3>
            <p className="text-slate-300 mb-3">
              A <strong>branching process</strong> is a Markov chain{' '}
              <InlineMath math={String.raw`\{X_n\}_{n \ge 0}`} /> where:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li><InlineMath math="X_0 = 1" /> (start with one ancestor)</li>
              <li>Each individual in generation <InlineMath math="n" /> produces offspring independently</li>
              <li>
                The offspring count <InlineMath math="\xi" /> has a common distribution with{' '}
                <InlineMath math={String.raw`p_k = P(\xi = k)`} />
              </li>
              <li>
                <InlineMath math={String.raw`X_{n+1} = \xi_1^{(n)} + \xi_2^{(n)} + \cdots + \xi_{X_n}^{(n)}`} />{' '}
                where all <InlineMath math={String.raw`\xi_i^{(n)}`} /> are i.i.d. copies of <InlineMath math="\xi" />
              </li>
            </ul>
            <div className="math-block">
              <BlockMath math={String.raw`X_{n+1} = \sum_{i=1}^{X_n} \xi_i^{(n)}, \qquad \text{all } \xi_i^{(n)} \overset{\text{i.i.d.}}{\sim} \xi`} />
            </div>
            <p className="text-slate-400 text-sm mt-3">
              If <InlineMath math="X_n = 0" /> for some <InlineMath math="n" />, then{' '}
              <InlineMath math="X_m = 0" /> for all <InlineMath math="m \ge n" /> (extinction is absorbing).
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Mean and Variance ── */}
      <Section title="Proposition 3.1: Mean and Variance" id="mean-var">
        <FadeIn>
          <div className="theorem-box">
            <h3 className="text-xl font-bold text-amber-400 mb-3">Proposition 3.1</h3>
            <p className="text-slate-300 mb-3">
              Let <InlineMath math={String.raw`\mu = E(\xi)`} /> and{' '}
              <InlineMath math={String.raw`\sigma^2 = \text{Var}(\xi)`} />. With{' '}
              <InlineMath math="X_0 = 1" />:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`M_n = E(X_n) = \mu^n`} />
            </div>
            <p className="text-slate-300 mb-2">For the variance:</p>
            <div className="math-block">
              <BlockMath math={String.raw`V_n = \text{Var}(X_n) = \begin{cases} n\sigma^2 & \text{if } \mu = 1 \\[6pt] \sigma^2 \mu^{n-1} \cdot \dfrac{1 - \mu^n}{1 - \mu} & \text{if } \mu \neq 1 \end{cases}`} />
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-lg font-semibold text-slate-200 mb-3">Three Regimes</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-red-900/20 rounded-lg border border-red-800/40">
                <h5 className="text-red-400 font-bold mb-1">Subcritical: <InlineMath math="\mu < 1" /></h5>
                <p className="text-slate-400 text-sm">
                  <InlineMath math="M_n \to 0" /> and <InlineMath math="V_n \to 0" /> geometrically.
                  Population shrinks on average.
                </p>
              </div>
              <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-800/40">
                <h5 className="text-amber-400 font-bold mb-1">Critical: <InlineMath math="\mu = 1" /></h5>
                <p className="text-slate-400 text-sm">
                  <InlineMath math="M_n = 1" /> for all <InlineMath math="n" />, but{' '}
                  <InlineMath math={String.raw`V_n = n\sigma^2 \to \infty`} />. High variance, eventual extinction.
                </p>
              </div>
              <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-800/40">
                <h5 className="text-emerald-400 font-bold mb-1">Supercritical: <InlineMath math="\mu > 1" /></h5>
                <p className="text-slate-400 text-sm">
                  Both <InlineMath math="M_n" /> and <InlineMath math="V_n" /> grow geometrically.
                  Positive probability of survival.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <details className="mt-4 text-slate-300">
            <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold">
              Proof sketch (click to expand)
            </summary>
            <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
              <p>
                For the mean, use the law of total expectation and independence:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`E(X_{n+1}) = E\!\left[\sum_{i=1}^{X_n} \xi_i^{(n)}\right] = E\!\big[X_n \cdot \mu\big] = \mu \cdot E(X_n)`} />
              </div>
              <p>
                By induction, <InlineMath math={String.raw`E(X_n) = \mu^n`} />.
              </p>
              <p>
                For the variance, use the law of total variance:
              </p>
              <div className="math-block">
                <BlockMath math={String.raw`\text{Var}(X_{n+1}) = E[\text{Var}(X_{n+1} \mid X_n)] + \text{Var}(E[X_{n+1} \mid X_n])`} />
              </div>
              <div className="math-block">
                <BlockMath math={String.raw`= E[X_n \sigma^2] + \text{Var}(X_n \mu) = \sigma^2 \mu^n + \mu^2 V_n`} />
              </div>
              <p>
                The recurrence <InlineMath math={String.raw`V_{n+1} = \sigma^2 \mu^n + \mu^2 V_n`} /> with{' '}
                <InlineMath math="V_0 = 0" /> solves to the stated formula.
              </p>
            </div>
          </details>
        </FadeIn>
      </Section>

      {/* ── Interactive: Population Growth ── */}
      <Section title="Interactive: Population Growth Simulator" id="growth-sim">
        <PopulationGrowthChart />
      </Section>

      {/* ── Interactive: Family Tree ── */}
      <Section title="Interactive: Family Tree Builder" id="tree-builder">
        <FamilyTreeVisualizer />

        {/* Things to Try */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
          <h4 className="text-teal-400 font-bold mb-3">Things to Try</h4>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>Click 'Subcritical' and run 10 simulations. How many populations go extinct?</li>
            <li>Now try 'Supercritical'. Notice the difference in extinction probability.</li>
            <li>For Critical (<InlineMath math="\mu = 1" />), the extinction probability is 1 despite positive mean. Surprising?</li>
          </ul>
        </motion.div>
      </Section>

      {/* ── PGF Section ── */}
      <Section title="Probability Generating Function" id="pgf">
        <FadeIn>
          <div className="definition-box">
            <h3 className="text-xl font-bold text-indigo-400 mb-3">Probability Generating Function (PGF)</h3>
            <p className="text-slate-300 mb-3">
              The PGF of the offspring distribution is:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`\varphi(s) = E(s^\xi) = \sum_{k=0}^{\infty} p_k s^k, \qquad s \in [0,1]`} />
            </div>
            <p className="text-slate-300 mb-2 mt-4">Key properties:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><InlineMath math={String.raw`\varphi(0) = p_0`} /></li>
              <li><InlineMath math={String.raw`\varphi(1) = 1`} /></li>
              <li><InlineMath math={String.raw`\varphi'(1) = E(\xi) = \mu`} /></li>
              <li><InlineMath math={String.raw`\varphi''(1) = E(\xi^2) - E(\xi)`} /></li>
              <li><InlineMath math={String.raw`\varphi(s)`} /> is increasing and convex on <InlineMath math="[0,1]" /></li>
            </ul>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-lg font-semibold text-slate-200 mb-2">PGF of the Population</h4>
            <p className="text-slate-300 mb-2">
              The PGF of <InlineMath math="X_n" /> is obtained by <em>iterating</em>{' '}
              <InlineMath math="\varphi" />:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`\varphi_n(s) = E(s^{X_n}) = \underbrace{\varphi(\varphi(\cdots\varphi(s)\cdots))}_{n \text{ times}}`} />
            </div>
            <p className="text-slate-300 mt-2">In particular:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li><InlineMath math={String.raw`\varphi_n'(1) = E(X_n) = \mu^n`} /></li>
              <li><InlineMath math={String.raw`\varphi_n(0) = u_n = P(X_n = 0)`} /> (extinction by generation <InlineMath math="n" />)</li>
            </ul>
          </div>
        </FadeIn>
      </Section>

      {/* ── Extinction ── */}
      <Section title="Extinction Probability" id="extinction">
        <FadeIn>
          <div className="theorem-box">
            <h3 className="text-xl font-bold text-amber-400 mb-3">Extinction Theorem</h3>
            <p className="text-slate-300 mb-3">
              Let <InlineMath math={String.raw`N = \min\{n \ge 0 : X_n = 0\}`} /> be the extinction time.
              Define <InlineMath math={String.raw`u_n = P(N \le n) = P(X_n = 0)`} /> and{' '}
              <InlineMath math={String.raw`u_\infty = P(\text{eventual extinction})`} />.
            </p>

            <p className="text-slate-300 mb-2">The recursion is:</p>
            <div className="math-block">
              <BlockMath math={String.raw`u_0 = 0, \qquad u_1 = p_0, \qquad u_n = \varphi(u_{n-1})`} />
            </div>

            <p className="text-slate-300 mb-2 mt-3">
              In the limit: <InlineMath math={String.raw`u_\infty = \varphi(u_\infty)`} />, so{' '}
              <InlineMath math="u_\infty" /> is a <strong>fixed point</strong> of <InlineMath math="\varphi" />.
              Specifically, <InlineMath math="u_\infty" /> is the <em>smallest</em> solution of{' '}
              <InlineMath math={String.raw`s = \varphi(s)`} /> in <InlineMath math="[0,1]" />.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-lg font-semibold text-slate-200 mb-3">Three Cases</h4>
            <div className="space-y-3">
              <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-800/40">
                <p className="text-emerald-400 font-bold">
                  Case 1: <InlineMath math="p_0 = 0" />
                </p>
                <p className="text-slate-400 text-sm">
                  Every individual has at least one offspring, so extinction is impossible:{' '}
                  <InlineMath math={String.raw`u_\infty = 0`} />.
                </p>
              </div>
              <div className="p-3 bg-red-900/20 rounded-lg border border-red-800/40">
                <p className="text-red-400 font-bold">
                  Case 2: <InlineMath math={String.raw`p_0 > 0`} /> and <InlineMath math={String.raw`\mu \le 1`} />
                </p>
                <p className="text-slate-400 text-sm">
                  The only fixed point in <InlineMath math="[0,1]" /> is <InlineMath math="s = 1" />,
                  so <InlineMath math={String.raw`u_\infty = 1`} /> (certain extinction).
                </p>
              </div>
              <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-800/40">
                <p className="text-amber-400 font-bold">
                  Case 3: <InlineMath math={String.raw`p_0 > 0`} /> and <InlineMath math={String.raw`\mu > 1`} />
                </p>
                <p className="text-slate-400 text-sm">
                  There exists a unique fixed point <InlineMath math={String.raw`u_\infty \in (0,1)`} />.
                  Extinction occurs with probability strictly less than 1.
                </p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-3">
              The graphical argument: since <InlineMath math="\varphi" /> is convex and{' '}
              <InlineMath math={String.raw`\varphi(1) = 1`} />, the slope at <InlineMath math="s=1" /> determines
              whether the curve dips below the identity line. If{' '}
              <InlineMath math={String.raw`\varphi'(1) = \mu > 1`} />, the curve crosses the diagonal at some{' '}
              <InlineMath math={String.raw`s^* < 1`} />.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Interactive: Extinction Probability ── */}
      <Section title="Interactive: Extinction Probability Visualizer" id="extinction-viz">
        <ExtinctionProbabilityViz />
      </Section>

      {/* ── Worked Examples ── */}
      <Section title="Worked Examples" id="worked-examples">
        <FadeIn>
          <div className="example-box">
            <h3 className="text-xl font-bold text-emerald-400 mb-3">Example 3.14: <InlineMath math="p_0 = p_1 = 1/2" /></h3>
            <p className="text-slate-300 mb-2">
              Here <InlineMath math={String.raw`\mu = 0 \cdot \tfrac{1}{2} + 1 \cdot \tfrac{1}{2} = \tfrac{1}{2} < 1`} />, so we expect certain extinction.
            </p>
            <p className="text-slate-300 mb-2">The PGF is:</p>
            <div className="math-block">
              <BlockMath math={String.raw`\varphi(s) = \tfrac{1}{2} + \tfrac{1}{2}s`} />
            </div>
            <p className="text-slate-300 mb-2">
              The recursion gives <InlineMath math={String.raw`u_n = \tfrac{1}{2} + \tfrac{1}{2}u_{n-1}`} />,
              starting from <InlineMath math="u_0 = 0" />:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`u_1 = \tfrac{1}{2}, \quad u_2 = \tfrac{3}{4}, \quad u_3 = \tfrac{7}{8}, \quad \ldots, \quad u_n = 1 - \tfrac{1}{2^n} \to 1`} />
            </div>
            <p className="text-slate-300">
              Extinction is certain: <InlineMath math={String.raw`u_\infty = 1`} />.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="example-box mt-4">
            <h3 className="text-xl font-bold text-emerald-400 mb-3">Example 3.15: <InlineMath math="p_0 = 1/4, \; p_2 = 3/4" /></h3>
            <p className="text-slate-300 mb-2">
              Here <InlineMath math={String.raw`\mu = 0 \cdot \tfrac{1}{4} + 2 \cdot \tfrac{3}{4} = \tfrac{3}{2} > 1`} />.
              The PGF is:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`\varphi(s) = \tfrac{1}{4} + \tfrac{3}{4}s^2`} />
            </div>
            <p className="text-slate-300 mb-2">
              Setting <InlineMath math={String.raw`s = \varphi(s)`} />:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`s = \tfrac{1}{4} + \tfrac{3}{4}s^2 \;\Longrightarrow\; 3s^2 - 4s + 1 = 0 \;\Longrightarrow\; (3s-1)(s-1) = 0`} />
            </div>
            <p className="text-slate-300">
              Solutions: <InlineMath math="s = 1/3" /> and <InlineMath math="s = 1" />.
              The smallest is <InlineMath math={String.raw`u_\infty = 1/3`} />.
              So the family survives with probability <InlineMath math="2/3" />.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="example-box mt-4">
            <h3 className="text-xl font-bold text-emerald-400 mb-3">Example 3.16/3.17: Geometric Offspring</h3>
            <p className="text-slate-300 mb-2">
              If <InlineMath math={String.raw`\xi \sim \text{Geo}(p)`} /> with <InlineMath math={String.raw`P(\xi = k) = p(1-p)^k`} /> for <InlineMath math={String.raw`k = 0, 1, 2, \ldots`} />, then:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`\varphi(s) = \frac{p}{1 - s(1-p)}, \qquad \mu = \frac{1-p}{p}`} />
            </div>
            <p className="text-slate-300 mb-2">
              Solving <InlineMath math={String.raw`s = \frac{p}{1-s(1-p)}`} />:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`u_\infty = \begin{cases} \dfrac{p}{1-p} & \text{if } p < \tfrac{1}{2} \;(\mu > 1) \\[8pt] 1 & \text{if } p \ge \tfrac{1}{2} \;(\mu \le 1) \end{cases}`} />
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="example-box mt-4">
            <h3 className="text-xl font-bold text-emerald-400 mb-3">Example 3.18: Binary Branching</h3>
            <p className="text-slate-300 mb-2">
              If <InlineMath math={String.raw`\xi \in \{0, 1\}`} /> with <InlineMath math={String.raw`P(\xi = 1) = p`} />, <InlineMath math={String.raw`q = 1-p`} />:
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`\varphi(s) = q + ps, \qquad \varphi_n(s) = 1 - p^n + p^n s`} />
            </div>
            <p className="text-slate-300 mb-2">Therefore:</p>
            <div className="math-block">
              <BlockMath math={String.raw`E(X_n) = p^n, \qquad u_n = P(X_n = 0) = 1 - p^n, \qquad u_\infty = 1`} />
            </div>
            <p className="text-slate-300">
              Since <InlineMath math={String.raw`\mu = p \le 1`} />, extinction is always certain (for <InlineMath math="p < 1" />).
              Each individual either dies or produces exactly one child -- the population can only shrink.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Exercises ── */}
      <Section title="Exercises" id="exercises">
        <FadeIn>
          <div className="exercise-box">
            <h3 className="text-xl font-bold text-purple-400 mb-3">Exercise 1</h3>
            <p className="text-slate-300 mb-3">
              Consider a branching process with offspring distribution{' '}
              <InlineMath math={String.raw`P(\xi = 0) = 1/3, \; P(\xi = 1) = 1/3, \; P(\xi = 2) = 1/3`} />.
            </p>
            <p className="text-slate-300 mb-2">(a) Compute <InlineMath math="\mu" /> and <InlineMath math="\sigma^2" />.</p>
            <p className="text-slate-300 mb-2">(b) Find <InlineMath math={String.raw`E(X_5)`} /> and <InlineMath math={String.raw`\text{Var}(X_5)`} />.</p>
            <p className="text-slate-300 mb-2">(c) Find the extinction probability <InlineMath math="u_\infty" />.</p>

            <Collapsible label="Hint">
              <p className="text-slate-300">
                For (c), write down <InlineMath math={String.raw`\varphi(s) = \tfrac{1}{3}(1 + s + s^2)`} /> and
                solve <InlineMath math={String.raw`s = \varphi(s)`} />. Factor the resulting quadratic.
              </p>
            </Collapsible>

            <Collapsible label="Solution">
              <div className="space-y-3">
                <p className="text-slate-300"><strong>(a)</strong></p>
                <div className="math-block">
                  <BlockMath math={String.raw`\mu = \frac{0 + 1 + 2}{3} = 1, \qquad \sigma^2 = \frac{0 + 1 + 4}{3} - 1 = \frac{2}{3}`} />
                </div>
                <p className="text-slate-300"><strong>(b)</strong></p>
                <div className="math-block">
                  <BlockMath math={String.raw`E(X_5) = \mu^5 = 1, \qquad \text{Var}(X_5) = 5\sigma^2 = \frac{10}{3}`} />
                </div>
                <p className="text-slate-300 text-sm">(Using the <InlineMath math="\mu = 1" /> formula for variance.)</p>
                <p className="text-slate-300"><strong>(c)</strong></p>
                <div className="math-block">
                  <BlockMath math={String.raw`s = \tfrac{1}{3}(1 + s + s^2) \;\Longrightarrow\; s^2 - 2s + 1 = 0 \;\Longrightarrow\; (s-1)^2 = 0`} />
                </div>
                <p className="text-slate-300">
                  The only solution is <InlineMath math="s = 1" />, so <InlineMath math="u_\infty = 1" />.
                  This is the critical case (<InlineMath math="\mu = 1" />): extinction is certain.
                </p>
              </div>
            </Collapsible>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="exercise-box mt-6">
            <h3 className="text-xl font-bold text-purple-400 mb-3">Exercise 2</h3>
            <p className="text-slate-300 mb-3">
              A branching process has offspring distribution{' '}
              <InlineMath math={String.raw`P(\xi = 0) = 1/9, \; P(\xi = 3) = 8/9`} />.
            </p>
            <p className="text-slate-300 mb-2">(a) Show that <InlineMath math={String.raw`\mu = 8/3`} /> and find <InlineMath math="\sigma^2" />.</p>
            <p className="text-slate-300 mb-2">(b) Find the extinction probability by solving <InlineMath math={String.raw`s = \varphi(s)`} />.</p>
            <p className="text-slate-300 mb-2">(c) What is the probability the process survives forever?</p>

            <Collapsible label="Hint">
              <p className="text-slate-300">
                <InlineMath math={String.raw`\varphi(s) = \tfrac{1}{9} + \tfrac{8}{9}s^3`} />.
                The equation <InlineMath math={String.raw`s = \tfrac{1}{9} + \tfrac{8}{9}s^3`} /> simplifies to{' '}
                <InlineMath math={String.raw`8s^3 - 9s + 1 = 0`} />. Factor out <InlineMath math="(s-1)" />.
              </p>
            </Collapsible>

            <Collapsible label="Solution">
              <div className="space-y-3">
                <p className="text-slate-300"><strong>(a)</strong></p>
                <div className="math-block">
                  <BlockMath math={String.raw`\mu = 0 \cdot \tfrac{1}{9} + 3 \cdot \tfrac{8}{9} = \tfrac{8}{3} \approx 2.667`} />
                </div>
                <div className="math-block">
                  <BlockMath math={String.raw`\sigma^2 = \left(0 \cdot \tfrac{1}{9} + 9 \cdot \tfrac{8}{9}\right) - \left(\tfrac{8}{3}\right)^2 = 8 - \tfrac{64}{9} = \tfrac{8}{9}`} />
                </div>
                <p className="text-slate-300"><strong>(b)</strong></p>
                <div className="math-block">
                  <BlockMath math={String.raw`8s^3 - 9s + 1 = 0 \;\Longrightarrow\; (s-1)(8s^2 + 8s - 1) = 0`} />
                </div>
                <div className="math-block">
                  <BlockMath math={String.raw`s = \frac{-8 + \sqrt{64 + 32}}{16} = \frac{-8 + 4\sqrt{6}}{16} = \frac{-2 + \sqrt{6}}{4} \approx 0.1124`} />
                </div>
                <p className="text-slate-300"><strong>(c)</strong></p>
                <p className="text-slate-300">
                  Survival probability ={' '}
                  <InlineMath math={String.raw`1 - u_\infty = 1 - \frac{-2+\sqrt{6}}{4} = \frac{6 - \sqrt{6}}{4} \approx 0.8876`} />.
                </p>
              </div>
            </Collapsible>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="exercise-box mt-6">
            <h3 className="text-xl font-bold text-purple-400 mb-3">Exercise 3</h3>
            <p className="text-slate-300 mb-3">
              Prove that if <InlineMath math={String.raw`p_0 + p_1 = 1`} /> (i.e., each individual has either 0 or 1 offspring),
              then extinction is certain regardless of <InlineMath math="p_0 > 0" />.
            </p>

            <Collapsible label="Hint">
              <p className="text-slate-300">
                Compute <InlineMath math={String.raw`\varphi(s) = p_0 + p_1 s`} /> and note <InlineMath math={String.raw`\mu = p_1 \le 1`} />.
                Alternatively, observe that each generation either keeps the same individual or kills it,
                so the population is a sequence of independent coin flips until the first "death."
              </p>
            </Collapsible>

            <Collapsible label="Solution">
              <div className="space-y-3">
                <p className="text-slate-300">
                  We have <InlineMath math={String.raw`\varphi(s) = p_0 + p_1 s`} /> with{' '}
                  <InlineMath math={String.raw`\mu = p_1 < 1`} /> (assuming <InlineMath math="p_0 > 0" />).
                </p>
                <p className="text-slate-300">
                  By iteration: <InlineMath math={String.raw`\varphi_n(s) = 1 - p_1^n + p_1^n s`} />
                  (provable by induction).
                </p>
                <div className="math-block">
                  <BlockMath math={String.raw`u_n = \varphi_n(0) = 1 - p_1^n \;\longrightarrow\; 1 \text{ as } n \to \infty`} />
                </div>
                <p className="text-slate-300">
                  This makes intuitive sense: the process is just a single individual who dies at each step
                  with probability <InlineMath math="p_0" />. By generation <InlineMath math="n" />,
                  it survives with probability <InlineMath math={String.raw`p_1^n \to 0`} />.
                </p>
              </div>
            </Collapsible>
          </div>
        </FadeIn>
      </Section>

      {/* ── Summary ── */}
      <Section title="Summary" id="summary">
        <FadeIn>
          <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700">
            <ul className="space-y-3 text-slate-300">
              <li>
                A branching process models populations where each individual produces i.i.d. offspring.
              </li>
              <li>
                The mean population at generation <InlineMath math="n" /> is{' '}
                <InlineMath math={String.raw`E(X_n) = \mu^n`} />.
              </li>
              <li>
                The PGF <InlineMath math={String.raw`\varphi(s)`} /> encodes the offspring distribution and determines extinction via the fixed-point equation{' '}
                <InlineMath math={String.raw`s = \varphi(s)`} />.
              </li>
              <li>
                <strong className="text-emerald-400">Subcritical/critical</strong>{' '}
                (<InlineMath math={String.raw`\mu \le 1`} />): extinction is certain.
              </li>
              <li>
                <strong className="text-amber-400">Supercritical</strong>{' '}
                (<InlineMath math={String.raw`\mu > 1`} />): extinction probability is the smallest root of{' '}
                <InlineMath math={String.raw`s = \varphi(s)`} /> in <InlineMath math="[0,1)" />.
              </li>
              <li>
                The cobweb diagram provides a visual way to see the iteration{' '}
                <InlineMath math={String.raw`u_n = \varphi(u_{n-1})`} /> converging to{' '}
                <InlineMath math="u_\infty" />.
              </li>
            </ul>
          </div>
        </FadeIn>
      </Section>
    </div>
  )
}
