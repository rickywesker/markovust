import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { InlineMath, BlockMath } from '../utils/MathRenderer'
import { matMul, matPow } from '../utils/matrix'
import MarkovDiagram from '../components/MarkovDiagram'

/* ──────────────────────────────────────────────
   Sections 4.3–4.4: Sophisticated Examples &
   State Classification
   ────────────────────────────────────────────── */

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }

// ─── Chelsea Reliability Simulator ──────────
function ChelseaSimulator() {
  const [p, setP] = useState(0.2)
  const [history, setHistory] = useState([])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(200)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)

  // State: [ready, suspendedButBackNext]
  // (2,0)=0, (1,1)=1, (1,0)=2, (0,1)=3
  const stateLabels = ['(2,0)', '(1,1)', '(1,0)', '(0,1)']
  const stateColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444']

  const step = useCallback(() => {
    setHistory(prev => {
      const last = prev.length > 0 ? prev[prev.length - 1] : { state: 0, dReady: true, aReady: true, dSusp: 0, aSusp: 0 }
      const s = last.state
      const r = Math.random()
      let next
      if (s === 0) next = r < (1 - p) ? 0 : 2      // (2,0) -> (2,0) or (1,0)
      else if (s === 2) next = r < (1 - p) ? 1 : 3  // (1,0) -> (1,1) or (0,1)
      else if (s === 1) next = r < (1 - p) ? 0 : 2  // (1,1) -> (2,0) or (1,0)
      else next = 2                                   // (0,1) -> (1,0) always

      return [...prev, { state: next, nightmare: next === 3 }]
    })
  }, [p])

  useEffect(() => {
    if (running) timerRef.current = setInterval(step, speed)
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const reset = () => { setRunning(false); clearInterval(timerRef.current); setHistory([]) }

  // Count states for empirical distribution
  const counts = [0, 0, 0, 0]
  history.forEach(h => counts[h.state]++)
  const total = history.length || 1
  const empirical = counts.map(c => c / total)

  const denom = 1 + p + p * p
  const theoretical = [(1 - p) / denom, p / denom, p / denom, (p * p) / denom]
  const nightmareCount = counts[3]
  const nightmareTheory = (p * p) / denom

  // Canvas: bar chart comparison
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const pad = { top: 30, right: 20, bottom: 50, left: 50 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    // axes
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH)
    ctx.stroke()

    const barGroupW = plotW / 4
    const barW = barGroupW * 0.3
    const maxVal = Math.max(0.5, ...empirical, ...theoretical)

    for (let i = 0; i < 4; i++) {
      const cx = pad.left + barGroupW * (i + 0.5)
      // empirical bar
      const eh = (empirical[i] / maxVal) * plotH
      ctx.fillStyle = stateColors[i] + '99'
      ctx.fillRect(cx - barW - 2, pad.top + plotH - eh, barW, eh)
      // theoretical bar
      const th = (theoretical[i] / maxVal) * plotH
      ctx.fillStyle = stateColors[i]
      ctx.fillRect(cx + 2, pad.top + plotH - th, barW, th)
      // label
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stateLabels[i], cx, pad.top + plotH + 16)
      // values
      ctx.fillStyle = stateColors[i] + '99'
      ctx.fillText(empirical[i].toFixed(3), cx - barW / 2 - 2, pad.top + plotH - eh - 4)
      ctx.fillStyle = stateColors[i]
      ctx.fillText(theoretical[i].toFixed(3), cx + barW / 2 + 2, pad.top + plotH - th - 4)
    }

    // legend
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#94a3b899'; ctx.fillRect(W - 150, 8, 12, 12)
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left'; ctx.fillText('Empirical', W - 134, 18)
    ctx.fillStyle = '#6366f1'; ctx.fillRect(W - 150, 24, 12, 12)
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Theoretical', W - 134, 34)

    // y-axis label
    ctx.fillStyle = '#94a3b8'
    ctx.save(); ctx.translate(12, pad.top + plotH / 2); ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'; ctx.fillText('Probability', 0, 0)
    ctx.restore()
  }, [history, p])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="example-box">
      <h3 className="text-xl font-bold text-emerald-400 mb-2">Example 4.5 -- Chelsea Reliability Simulator</h3>
      <p className="text-slate-300 mb-3">
        Coach Scolari uses two strikers: Drogba (D) and Anelka (A). Each match a playing striker underperforms with probability <InlineMath math="p" />,
        getting suspended for the next 2 matches. We track <InlineMath math="(X_n, Y_n)" /> where <InlineMath math="X_n" /> = ready players
        and <InlineMath math="Y_n" /> = players suspended but returning next match.
      </p>
      <div className="math-block">
        <BlockMath math={String.raw`P = \begin{pmatrix} 1{-}p & 0 & p & 0 \\ 1{-}p & 0 & p & 0 \\ 0 & 1{-}p & 0 & p \\ 0 & 0 & 1 & 0 \end{pmatrix} \quad \text{States: } (2,0),\,(1,1),\,(1,0),\,(0,1)`} />
      </div>
      <div className="my-4">
        <MarkovDiagram
          states={[
            { id: '(2,0)', label: '(2,0)', color: '#10b981', x: 100, y: 60 },
            { id: '(1,1)', label: '(1,1)', color: '#6366f1', x: 320, y: 60 },
            { id: '(1,0)', label: '(1,0)', color: '#f59e0b', x: 320, y: 220 },
            { id: '(0,1)', label: '(0,1)', color: '#ef4444', x: 100, y: 220 },
          ]}
          transitions={[
            { from: '(2,0)', to: '(2,0)', prob: 0.8, label: '1-p' },
            { from: '(2,0)', to: '(1,0)', prob: 0.2, label: 'p' },
            { from: '(1,1)', to: '(2,0)', prob: 0.8, label: '1-p' },
            { from: '(1,1)', to: '(1,0)', prob: 0.2, label: 'p' },
            { from: '(1,0)', to: '(1,1)', prob: 0.8, label: '1-p' },
            { from: '(1,0)', to: '(0,1)', prob: 0.2, label: 'p' },
            { from: '(0,1)', to: '(1,0)', prob: 1, label: '1' },
          ]}
          layout="custom"
          width={420}
          height={280}
        />
      </div>
      <div className="math-block">
        <BlockMath math={String.raw`\pi = \left(\frac{1-p}{1+p+p^2},\;\frac{p}{1+p+p^2},\;\frac{p}{1+p+p^2},\;\frac{p^2}{1+p+p^2}\right)`} />
        <p className="text-slate-400 text-sm mt-1">Nightmare probability (both suspended): <InlineMath math={String.raw`\pi_3 = \frac{p^2}{1+p+p^2}`} /></p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-20">p = {p.toFixed(2)}</span>
          <input type="range" min="0.01" max="0.99" step="0.01" value={p} onChange={e => setP(+e.target.value)} className="w-36 accent-emerald-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28">Speed: {speed}ms</span>
          <input type="range" min="30" max="500" step="10" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-28 accent-emerald-500" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Play'}</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => { for (let i = 0; i < 200; i++) step() }}>+200 Steps</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Matches:</span> <span className="text-white font-semibold">{history.length}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Nightmares:</span>{' '}
          <span className="text-red-400 font-semibold">{nightmareCount}</span>
          <span className="text-slate-500 ml-1">({(nightmareCount / total * 100).toFixed(1)}%)</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Theory:</span> <span className="text-emerald-400 font-semibold">{(nightmareTheory * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* State timeline */}
      <div className="mt-4 flex flex-wrap gap-1">
        {history.slice(-80).map((h, i) => (
          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="w-3 h-3 rounded-sm" style={{ backgroundColor: stateColors[h.state] }}
            title={`Match ${history.length - 80 + i + 1}: state ${stateLabels[h.state]}`} />
        ))}
      </div>
      <div className="flex gap-3 mt-2 text-xs text-slate-400">
        {stateLabels.map((l, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: stateColors[i] }} /> {l}
          </span>
        ))}
      </div>

      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 280 }} />
      </div>
    </motion.div>
  )
}

// ─── Stock Price MC Simulator ───────────────
function StockSimulator() {
  const [probs, setProbs] = useState({ UU: 0.8, DU: 0.6, UD: 0.4, DD: 0.1 })
  const [history, setHistory] = useState([]) // array of 'U' or 'D'
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(150)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)

  const step = useCallback(() => {
    setHistory(prev => {
      if (prev.length < 2) {
        return [...prev, Math.random() < 0.5 ? 'U' : 'D']
      }
      const prev1 = prev[prev.length - 2]
      const prev2 = prev[prev.length - 1]
      const key = prev1 + prev2
      const pUp = probs[key] || 0.5
      return [...prev, Math.random() < pUp ? 'U' : 'D']
    })
  }, [probs])

  useEffect(() => {
    if (running) timerRef.current = setInterval(step, speed)
    return () => clearInterval(timerRef.current)
  }, [running, speed, step])

  const reset = () => { setRunning(false); clearInterval(timerRef.current); setHistory([]) }

  // Compute long-run up fraction
  const upCount = history.filter(h => h === 'U').length
  const upFraction = history.length > 0 ? upCount / history.length : 0

  // Canvas: stock price path
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    if (history.length < 2) {
      ctx.fillStyle = '#94a3b8'; ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText('Run simulation to see stock price path', W / 2, H / 2)
      return
    }

    const pad = { top: 24, right: 20, bottom: 36, left: 50 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    // Compute cumulative price
    const prices = [100]
    for (let i = 0; i < history.length; i++) {
      prices.push(prices[prices.length - 1] + (history[i] === 'U' ? 2 : -2))
    }

    const minP = Math.min(...prices), maxP = Math.max(...prices)
    const range = Math.max(maxP - minP, 10)
    const n = prices.length

    const xScale = i => pad.left + (i / (n - 1)) * plotW
    const yScale = v => pad.top + plotH - ((v - minP) / range) * plotH

    // axes
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke()

    // grid
    const yTicks = 5
    for (let i = 0; i <= yTicks; i++) {
      const val = minP + (i / yTicks) * range
      const y = yScale(val)
      ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke()
      ctx.fillStyle = '#64748b'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(val.toFixed(0), pad.left - 6, y + 3)
    }

    // price line
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = xScale(i), y = yScale(prices[i])
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.stroke()

    // Color segments by up/down
    for (let i = 1; i < n; i++) {
      ctx.beginPath()
      ctx.moveTo(xScale(i - 1), yScale(prices[i - 1]))
      ctx.lineTo(xScale(i), yScale(prices[i]))
      ctx.strokeStyle = history[i - 1] === 'U' ? '#10b981' : '#ef4444'
      ctx.lineWidth = 2; ctx.stroke()
    }

    // reference line at 100
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, yScale(100)); ctx.lineTo(pad.left + plotW, yScale(100)); ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.fillText('Day', W / 2, H - 4)
  }, [history])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="example-box">
      <h3 className="text-xl font-bold text-amber-400 mb-2">Example 4.6 -- Stock Price Movement (HSBC)</h3>
      <p className="text-slate-300 mb-3">
        Today's movement depends on the <em>previous two</em> days. The raw sequence <InlineMath math="\{Y_n\}" /> is NOT a Markov chain.
        Fix: let <InlineMath math="X_n = (Y_{n-1}, Y_n)" />, state space <InlineMath math="\{(U,U),(D,U),(U,D),(D,D)\}" />.
      </p>
      <div className="math-block">
        <BlockMath math={String.raw`P = \begin{pmatrix} 0.8 & 0 & 0.2 & 0 \\ 0.6 & 0 & 0.4 & 0 \\ 0 & 0.4 & 0 & 0.6 \\ 0 & 0.1 & 0 & 0.9 \end{pmatrix}`} />
        <BlockMath math={String.raw`\pi = \left(\tfrac{3}{11},\;\tfrac{1}{11},\;\tfrac{1}{11},\;\tfrac{6}{11}\right)`} />
        <p className="text-slate-400 text-sm mt-1">Long-run fraction of UP days: <InlineMath math={String.raw`\pi_0+\pi_2 = \frac{4}{11}\approx 36.4\%`} /></p>
      </div>
      <div className="my-4">
        <MarkovDiagram
          states={[
            { id: '(U,U)', label: '(U,U)', color: '#10b981', x: 100, y: 60 },
            { id: '(D,U)', label: '(D,U)', color: '#6366f1', x: 320, y: 60 },
            { id: '(U,D)', label: '(U,D)', color: '#f59e0b', x: 100, y: 220 },
            { id: '(D,D)', label: '(D,D)', color: '#ef4444', x: 320, y: 220 },
          ]}
          transitions={[
            { from: '(U,U)', to: '(U,U)', prob: 0.8, label: '0.8' },
            { from: '(U,U)', to: '(U,D)', prob: 0.2, label: '0.2' },
            { from: '(D,U)', to: '(U,U)', prob: 0.6, label: '0.6' },
            { from: '(D,U)', to: '(U,D)', prob: 0.4, label: '0.4' },
            { from: '(U,D)', to: '(D,U)', prob: 0.4, label: '0.4' },
            { from: '(U,D)', to: '(D,D)', prob: 0.6, label: '0.6' },
            { from: '(D,D)', to: '(D,U)', prob: 0.1, label: '0.1' },
            { from: '(D,D)', to: '(D,D)', prob: 0.9, label: '0.9' },
          ]}
          layout="custom"
          width={420}
          height={280}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        {['UU', 'DU', 'UD', 'DD'].map(key => (
          <label key={key} className="flex items-center gap-1 text-slate-300">
            <span className="w-20">P(U|{key[0]},{key[1]})={probs[key].toFixed(1)}</span>
            <input type="range" min="0" max="1" step="0.1" value={probs[key]}
              onChange={e => setProbs(prev => ({ ...prev, [key]: +e.target.value }))}
              className="w-20 accent-amber-500" />
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Play'}</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={step} disabled={running}>Step</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => { for (let i = 0; i < 500; i++) step() }}>+500 Steps</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Days:</span> <span className="text-white font-semibold">{history.length}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Up fraction:</span>{' '}
          <span className="text-emerald-400 font-semibold">{(upFraction * 100).toFixed(1)}%</span>
          <span className="text-slate-500 ml-1">(theory: 36.4%)</span>
        </div>
      </div>

      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 260 }} />
      </div>
    </motion.div>
  )
}

// ─── Age Replacement Policy ─────────────────
function AgeReplacementPolicy() {
  const [N, setN] = useState(5)
  const [failRate, setFailRate] = useState(0.15)
  const [history, setHistory] = useState([])
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)

  // p_k = failRate * (k+1) / N capped at 1 (increasing hazard)
  const getFailProb = useCallback((k) => Math.min(1, failRate * (k + 1)), [failRate])

  const step = useCallback(() => {
    setHistory(prev => {
      const lastAge = prev.length > 0 ? prev[prev.length - 1] : 0
      if (lastAge >= N - 1) return [...prev, 0] // forced replacement
      const pk = getFailProb(lastAge)
      return [...prev, Math.random() < pk ? 0 : lastAge + 1]
    })
  }, [N, getFailProb])

  useEffect(() => {
    if (running) timerRef.current = setInterval(step, 100)
    return () => clearInterval(timerRef.current)
  }, [running, step])

  const reset = () => { setRunning(false); clearInterval(timerRef.current); setHistory([]) }

  // Canvas: age over time
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    if (history.length < 2) {
      ctx.fillStyle = '#94a3b8'; ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText('Run simulation to see airplane age over time', W / 2, H / 2)
      return
    }

    const pad = { top: 20, right: 20, bottom: 36, left: 46 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom
    const visible = history.slice(-200)
    const n = visible.length

    const xScale = i => pad.left + (i / (n - 1)) * plotW
    const yScale = v => pad.top + plotH - (v / N) * plotH

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke()

    // Draw age path as step function
    for (let i = 1; i < n; i++) {
      const x0 = xScale(i - 1), x1 = xScale(i)
      const y0 = yScale(visible[i - 1]), y1 = yScale(visible[i])
      ctx.strokeStyle = visible[i] === 0 ? '#ef4444' : '#10b981'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
      if (visible[i] === 0) {
        ctx.fillStyle = '#ef444466'
        ctx.beginPath(); ctx.arc(x1, y1, 4, 0, Math.PI * 2); ctx.fill()
      }
    }

    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.fillText('Year', W / 2, H - 4)
    ctx.save(); ctx.translate(12, pad.top + plotH / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillText('Aircraft age', 0, 0); ctx.restore()
  }, [history, N])

  const replacements = history.filter(h => h === 0).length
  const replaceFrac = history.length > 0 ? replacements / history.length : 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="example-box">
      <h3 className="text-xl font-bold text-purple-400 mb-2">Example 4.7 -- Age Replacement Policy (Boeing 777)</h3>
      <p className="text-slate-300 mb-3">
        An airplane is replaced if it fails or after <InlineMath math="N" /> years. <InlineMath math="X_n" /> = age at year <InlineMath math="n" />.
        The hazard rate <InlineMath math="p_k" /> increases with age. The long-run replacement fraction equals <InlineMath math="\pi_0 = 1/E[\min(Y,N)]" />.
      </p>
      <div className="math-block">
        <BlockMath math={String.raw`P_{k,0} = p_k, \quad P_{k,k+1} = 1-p_k \;\;(k \le N{-}2), \quad P_{N-1,0} = 1`} />
        <BlockMath math={String.raw`\pi_k = (1-p_{k-1})(1-p_{k-2})\cdots(1-p_0)\,\pi_0`} />
      </div>
      <div className="my-4">
        <p className="text-slate-400 text-xs mb-1 text-center">State transition diagram for N = 5</p>
        <MarkovDiagram
          states={[
            { id: '0', label: '0', color: '#10b981', x: 60, y: 180 },
            { id: '1', label: '1', color: '#6366f1', x: 140, y: 80 },
            { id: '2', label: '2', color: '#f59e0b', x: 240, y: 50 },
            { id: '3', label: '3', color: '#ec4899', x: 340, y: 80 },
            { id: '4', label: '4', color: '#ef4444', x: 420, y: 180 },
          ]}
          transitions={[
            { from: '0', to: '0', prob: 0, label: 'p\u2080' },
            { from: '0', to: '1', prob: 0, label: '1-p\u2080' },
            { from: '1', to: '0', prob: 0, label: 'p\u2081' },
            { from: '1', to: '2', prob: 0, label: '1-p\u2081' },
            { from: '2', to: '0', prob: 0, label: 'p\u2082' },
            { from: '2', to: '3', prob: 0, label: '1-p\u2082' },
            { from: '3', to: '0', prob: 0, label: 'p\u2083' },
            { from: '3', to: '4', prob: 0, label: '1-p\u2083' },
            { from: '4', to: '0', prob: 1, label: '1' },
          ]}
          layout="custom"
          width={480}
          height={280}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>N = {N}</span>
          <input type="range" min="3" max="15" step="1" value={N} onChange={e => { setN(+e.target.value); reset() }} className="w-28 accent-purple-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>Base fail rate = {failRate.toFixed(2)}</span>
          <input type="range" min="0.02" max="0.5" step="0.01" value={failRate} onChange={e => { setFailRate(+e.target.value); reset() }} className="w-28 accent-purple-500" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary text-sm !px-4 !py-2" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Play'}</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={reset}>Reset</button>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => { for (let i = 0; i < 500; i++) step() }}>+500 Steps</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Years:</span> <span className="text-white font-semibold">{history.length}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Replacements:</span> <span className="text-red-400 font-semibold">{replacements}</span>
          <span className="text-slate-500 ml-1">({(replaceFrac * 100).toFixed(1)}%)</span>
        </div>
      </div>

      <div className="mt-5 bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 220 }} />
      </div>
    </motion.div>
  )
}

// ─── State Classification Tool ──────────────
const PRESET_MATRICES = {
  'Example 4.8': {
    matrix: [[0.5, 0.5, 0, 0], [0.5, 0, 0.5, 0], [0, 0, 0.25, 0.75], [0, 0, 1/3, 2/3]],
    labels: ['0', '1', '2', '3']
  },
  'Periodic (d=4)': {
    matrix: [[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 0, 0, 0]],
    labels: ['0', '1', '2', '3']
  },
  'Irreducible aperiodic': {
    matrix: [[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1/3, 0, 2/3, 0]],
    labels: ['0', '1', '2', '3']
  },
  'Two classes': {
    matrix: [[0.7, 0.3, 0], [0.4, 0.6, 0], [0.2, 0, 0.8]],
    labels: ['0', '1', '2']
  },
  'Absorbing states': {
    matrix: [[1, 0, 0, 0], [0.3, 0, 0.5, 0.2], [0, 0.4, 0, 0.6], [0, 0, 0, 1]],
    labels: ['0', '1', '2', '3']
  }
}

function StateClassificationTool() {
  const [preset, setPreset] = useState('Example 4.8')
  const [matrixData, setMatrixData] = useState(PRESET_MATRICES['Example 4.8'].matrix)
  const [labels, setLabels] = useState(PRESET_MATRICES['Example 4.8'].labels)
  const canvasRef = useRef(null)

  const n = matrixData.length

  // Compute accessibility: can i reach j?
  const computeAccessibility = useCallback(() => {
    const reach = Array.from({ length: n }, () => Array(n).fill(false))
    // Use matrix powers up to n^2
    let P = matrixData.map(r => [...r])
    let Pk = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0))
    for (let k = 1; k <= n * n + 2; k++) {
      Pk = matMul(Pk, P)
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          if (Pk[i][j] > 1e-10) reach[i][j] = true
    }
    // Self-accessibility
    for (let i = 0; i < n; i++) reach[i][i] = true
    return reach
  }, [matrixData, n])

  // Compute communicating classes
  const computeClasses = useCallback(() => {
    const reach = computeAccessibility()
    const visited = Array(n).fill(false)
    const classes = []
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue
      const cls = [i]
      visited[i] = true
      for (let j = i + 1; j < n; j++) {
        if (!visited[j] && reach[i][j] && reach[j][i]) {
          cls.push(j)
          visited[j] = true
        }
      }
      classes.push(cls)
    }
    return { classes, reach }
  }, [computeAccessibility, n])

  // Compute period of state i
  const computePeriod = useCallback((i) => {
    const returnTimes = []
    let Pk = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0))
    const P = matrixData.map(r => [...r])
    for (let k = 1; k <= n * n + 5; k++) {
      Pk = matMul(Pk, P)
      if (Pk[i][i] > 1e-10) returnTimes.push(k)
    }
    if (returnTimes.length === 0) return 0
    let d = returnTimes[0]
    for (let t = 1; t < returnTimes.length; t++) d = gcd(d, returnTimes[t])
    return d
  }, [matrixData, n])

  // Determine recurrent/transient for each class
  const computeRecurrence = useCallback((classes, reach) => {
    return classes.map(cls => {
      // A class is recurrent if no state in it can reach a state outside the class
      const classSet = new Set(cls)
      for (const i of cls) {
        for (let j = 0; j < n; j++) {
          if (!classSet.has(j) && reach[i][j]) return 'transient'
        }
      }
      return 'recurrent'
    })
  }, [n])

  const { classes, reach } = computeClasses()
  const recurrence = computeRecurrence(classes, reach)
  const periods = Array.from({ length: n }, (_, i) => computePeriod(i))

  const classColors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4']
  const stateClassIndex = Array(n).fill(0)
  classes.forEach((cls, ci) => cls.forEach(s => { stateClassIndex[s] = ci }))

  // Canvas: state transition diagram
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2, cy = H / 2
    const radius = Math.min(W, H) * 0.35
    const nodeR = 22

    // Position states in a circle
    const positions = []
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      positions.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) })
    }

    // Draw edges
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrixData[i][j] > 1e-10 && i !== j) {
          const dx = positions[j].x - positions[i].x
          const dy = positions[j].y - positions[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const ux = dx / dist, uy = dy / dist

          const x1 = positions[i].x + ux * nodeR
          const y1 = positions[i].y + uy * nodeR
          const x2 = positions[j].x - ux * (nodeR + 8)
          const y2 = positions[j].y - uy * (nodeR + 8)

          // Check if reverse edge exists for curving
          const hasBoth = matrixData[j][i] > 1e-10
          const offset = hasBoth ? 12 : 0
          const nx = -uy * offset, ny = ux * offset

          ctx.strokeStyle = classColors[stateClassIndex[i]] + '88'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(x1 + nx, y1 + ny)
          const midX = (x1 + x2) / 2 + nx * 2, midY = (y1 + y2) / 2 + ny * 2
          ctx.quadraticCurveTo(midX, midY, x2 + nx, y2 + ny)
          ctx.stroke()

          // arrowhead
          const arrowLen = 8
          const angle = Math.atan2(y2 + ny - midY, x2 + nx - midX)
          ctx.fillStyle = classColors[stateClassIndex[i]] + '88'
          ctx.beginPath()
          ctx.moveTo(x2 + nx, y2 + ny)
          ctx.lineTo(x2 + nx - arrowLen * Math.cos(angle - 0.3), y2 + ny - arrowLen * Math.sin(angle - 0.3))
          ctx.lineTo(x2 + nx - arrowLen * Math.cos(angle + 0.3), y2 + ny - arrowLen * Math.sin(angle + 0.3))
          ctx.closePath(); ctx.fill()

          // edge label
          ctx.fillStyle = '#94a3b8'
          ctx.font = '10px Inter, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(matrixData[i][j].toFixed(2), midX, midY - 6)
        }
      }
    }

    // Self-loops
    for (let i = 0; i < n; i++) {
      if (matrixData[i][i] > 1e-10) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
        const loopCx = positions[i].x + Math.cos(angle) * (nodeR + 18)
        const loopCy = positions[i].y + Math.sin(angle) * (nodeR + 18)
        ctx.strokeStyle = classColors[stateClassIndex[i]] + '88'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(loopCx, loopCy, 12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(matrixData[i][i].toFixed(2), loopCx, loopCy - 16)
      }
    }

    // Draw nodes
    for (let i = 0; i < n; i++) {
      const color = classColors[stateClassIndex[i]]
      ctx.beginPath()
      ctx.arc(positions[i].x, positions[i].y, nodeR, 0, Math.PI * 2)
      ctx.fillStyle = color + '33'
      ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()

      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(labels[i], positions[i].x, positions[i].y)
    }
  }, [matrixData, n, labels, classes])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="example-box">
      <h3 className="text-xl font-bold text-indigo-400 mb-2">Interactive State Classification Tool</h3>
      <p className="text-slate-300 mb-3">
        Select a preset transition matrix or modify entries. The tool automatically identifies communicating classes,
        periodicity, and recurrence/transience of each state.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PRESET_MATRICES).map(name => (
          <button key={name}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${preset === name ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
            onClick={() => { setPreset(name); setMatrixData(PRESET_MATRICES[name].matrix); setLabels(PRESET_MATRICES[name].labels) }}>
            {name}
          </button>
        ))}
      </div>

      {/* Matrix display */}
      <div className="overflow-x-auto mb-4">
        <table className="text-sm text-center">
          <thead>
            <tr>
              <th className="px-2 py-1 text-slate-400">P</th>
              {labels.map((l, j) => <th key={j} className="px-2 py-1 text-slate-400">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, i) => (
              <tr key={i}>
                <td className="px-2 py-1 font-bold" style={{ color: classColors[stateClassIndex[i]] }}>{labels[i]}</td>
                {row.map((val, j) => (
                  <td key={j} className="px-1 py-1">
                    <input type="number" min="0" max="1" step="0.1"
                      value={val.toFixed(2)}
                      onChange={e => {
                        const newM = matrixData.map(r => [...r])
                        newM[i][j] = Math.max(0, +e.target.value)
                        setMatrixData(newM)
                      }}
                      className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center text-slate-200 text-xs"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Graph */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 320 }} />
      </div>

      {/* Classification results */}
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold text-slate-200">Communicating Classes:</h4>
        {classes.map((cls, ci) => (
          <div key={ci} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: classColors[ci] }} />
            <span className="text-slate-300">
              {'{'}{cls.map(s => labels[s]).join(', ')}{'}'} --{' '}
              <span className={recurrence[ci] === 'recurrent' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {recurrence[ci]}
              </span>
              {', period d = '}{periods[cls[0]]}
              {periods[cls[0]] === 1 ? ' (aperiodic)' : periods[cls[0]] > 1 ? ' (periodic)' : ' (no return)'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-semibold text-slate-200 mb-1">State details:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {labels.map((l, i) => (
            <div key={i} className="bg-slate-800/60 rounded-lg px-3 py-2" style={{ borderLeft: `3px solid ${classColors[stateClassIndex[i]]}` }}>
              <div className="font-semibold text-slate-200">State {l}</div>
              <div className="text-slate-400">Period: {periods[i]}</div>
              <div className="text-slate-400">{recurrence[stateClassIndex[i]] === 'recurrent' ? 'Recurrent' : 'Transient'}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Period Calculator Visualization ─────────
function PeriodCalculator() {
  const [selectedPreset, setSelectedPreset] = useState('periodic4')
  const presets = {
    periodic4: { matrix: [[0,1,0,0],[0,0,1,0],[0,0,0,1],[1,0,0,0]], labels: ['0','1','2','3'], name: 'Cyclic (d=4)' },
    aperiodic: { matrix: [[0,1,0,0],[0,0,1,0],[0,0,0,1],[1/3,0,2/3,0]], labels: ['0','1','2','3'], name: 'Aperiodic' },
    mixed: { matrix: [[0,1,0],[0,0,1],[0.5,0.5,0]], labels: ['0','1','2'], name: 'd=1 (self-shortcut)' }
  }
  const { matrix, labels, name } = presets[selectedPreset]
  const n = matrix.length
  const canvasRef = useRef(null)
  const [selectedState, setSelectedState] = useState(0)

  // Compute P_{ii}^{(k)} for selected state
  const maxK = 20
  const returnProbs = []
  useEffect(() => { /* recompute on change */ }, [matrix, selectedState])

  const computeReturnProbs = () => {
    const probs = []
    let Pk = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0))
    for (let k = 1; k <= maxK; k++) {
      Pk = matMul(Pk, matrix)
      probs.push({ k, prob: Pk[selectedState][selectedState] })
    }
    return probs
  }

  const probs = computeReturnProbs()
  const nonZeroK = probs.filter(p => p.prob > 1e-10).map(p => p.k)
  const period = nonZeroK.length > 0 ? nonZeroK.reduce((a, b) => gcd(a, b)) : 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    const pad = { top: 30, right: 20, bottom: 40, left: 50 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom

    const barW = plotW / maxK - 2
    const maxP = Math.max(0.1, ...probs.map(p => p.prob))

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke()

    for (let i = 0; i < maxK; i++) {
      const x = pad.left + (i / maxK) * plotW + 1
      const h = (probs[i].prob / maxP) * plotH
      const isNonZero = probs[i].prob > 1e-10
      const isMultiple = period > 0 && (i + 1) % period === 0

      ctx.fillStyle = isNonZero ? (isMultiple ? '#10b981' : '#6366f1') : '#334155'
      ctx.fillRect(x, pad.top + plotH - h, barW, h)

      // k label
      ctx.fillStyle = isNonZero ? '#e2e8f0' : '#475569'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(i + 1, x + barW / 2, pad.top + plotH + 14)

      if (isNonZero) {
        ctx.fillStyle = '#10b981'
        ctx.fillText(probs[i].prob.toFixed(3), x + barW / 2, pad.top + plotH - h - 4)
      }
    }

    // Title
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`P_{${selectedState}${selectedState}}^{(k)} for k = 1..${maxK}`, pad.left, pad.top - 10)
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.fillText(`d(${selectedState}) = gcd{${nonZeroK.join(',')}} = ${period}`, pad.left + 200, pad.top - 10)

    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'
    ctx.fillText('Step k', W / 2, H - 4)
  }, [probs, selectedState, period])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="example-box">
      <h3 className="text-xl font-bold text-cyan-400 mb-2">Period Calculator</h3>
      <p className="text-slate-300 mb-3">
        The period of state <InlineMath math="i" /> is <InlineMath math={String.raw`d(i) = \gcd\{n \ge 1 : P_{ii}^{(n)} > 0\}`} />.
        Green bars show <InlineMath math={String.raw`P_{ii}^{(k)} > 0`} /> at multiples of the period.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(presets).map(([key, val]) => (
          <button key={key}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selectedPreset === key ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
            onClick={() => { setSelectedPreset(key); setSelectedState(0) }}>
            {val.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {labels.map((l, i) => (
          <button key={i}
            className={`text-xs px-3 py-1.5 rounded-lg border ${selectedState === i ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
            onClick={() => setSelectedState(i)}>
            State {l}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 250 }} />
      </div>

      <div className="mt-3 text-sm text-slate-300">
        <InlineMath math={`d(${selectedState}) = ${period}`} /> {period === 1 ? '(aperiodic)' : period === 0 ? '(state not accessible from itself)' : `(periodic with period ${period})`}
      </div>
    </motion.div>
  )
}

// ─── Recurrence / Transience Demo ────────────
function RecurrenceDemo() {
  const [fii, setFii] = useState(0.8)
  const [trials, setTrials] = useState([])
  const canvasRef = useRef(null)

  const simulate = useCallback(() => {
    // Simulate geometric: how many visits before escaping?
    const results = []
    for (let trial = 0; trial < 200; trial++) {
      let visits = 0
      while (Math.random() < fii) visits++
      results.push(visits)
    }
    setTrials(results)
  }, [fii])

  const expectedVisits = fii / (1 - fii)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || trials.length === 0) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)

    // Histogram of visit counts
    const maxVisits = Math.max(20, ...trials)
    const bins = Array(Math.min(maxVisits + 1, 30)).fill(0)
    trials.forEach(v => { if (v < bins.length) bins[v]++ })
    const maxBin = Math.max(1, ...bins)

    const pad = { top: 24, right: 20, bottom: 36, left: 46 }
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom
    const barW = plotW / bins.length - 1

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH)
    ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke()

    for (let i = 0; i < bins.length; i++) {
      const x = pad.left + (i / bins.length) * plotW
      const h = (bins[i] / maxBin) * plotH
      ctx.fillStyle = i === 0 ? '#ef4444' : '#6366f1'
      ctx.fillRect(x, pad.top + plotH - h, barW, h)
    }

    // Theoretical geometric distribution overlay
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < bins.length; i++) {
      const theorProb = Math.pow(fii, i) * (1 - fii) * 200
      const x = pad.left + (i / bins.length) * plotW + barW / 2
      const y = pad.top + plotH - (theorProb / maxBin) * plotH
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.fillText('Number of return visits M', W / 2, H - 4)
    ctx.textAlign = 'left'
    ctx.fillText(`E[M] = f/(1-f) = ${expectedVisits.toFixed(2)}`, pad.left + 4, pad.top + 14)
    ctx.fillText(`Empirical mean = ${(trials.reduce((a,b)=>a+b,0)/trials.length).toFixed(2)}`, pad.left + 4, pad.top + 28)
  }, [trials, fii])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="example-box">
      <h3 className="text-xl font-bold text-rose-400 mb-2">Recurrence vs Transience: Return Visits</h3>
      <p className="text-slate-300 mb-3">
        For a transient state with return probability <InlineMath math="f_{ii} < 1" />, the total visits <InlineMath math="M" /> follows a geometric distribution:
        <InlineMath math={String.raw`\;P(M \ge k) = f_{ii}^k`} /> and <InlineMath math={String.raw`E[M] = \frac{f_{ii}}{1-f_{ii}}`} />.
        When <InlineMath math="f_{ii} = 1" /> (recurrent), <InlineMath math="M = \infty" /> a.s.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="w-28"><InlineMath math={`f_{ii}`} /> = {fii.toFixed(2)}</span>
          <input type="range" min="0.1" max="0.99" step="0.01" value={fii} onChange={e => setFii(+e.target.value)} className="w-36 accent-rose-500" />
        </label>
        <button className="btn-primary text-sm !px-4 !py-2" onClick={simulate}>Simulate 200 trials</button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">E[M] =</span> <span className="text-emerald-400 font-semibold">{expectedVisits.toFixed(2)}</span>
        </div>
        <div className="bg-slate-800/60 rounded-xl px-4 py-2">
          <span className="text-slate-400">Status:</span>{' '}
          <span className={fii < 1 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
            {fii < 1 ? 'Transient' : 'Recurrent'}
          </span>
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: 220 }} />
      </div>
    </motion.div>
  )
}

// ─── Exercises ──────────────────────────────
function Exercises() {
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="exercise-box">
        <h3 className="text-xl font-bold text-amber-400 mb-2">Exercise 1: Chelsea Nightmare Bound</h3>
        <p className="text-slate-300 mb-3">
          In Example 4.5, show that the nightmare probability <InlineMath math={String.raw`\pi_3 = \frac{p^2}{1+p+p^2}`} /> is always less than <InlineMath math={String.raw`\frac{1}{3}`} /> for <InlineMath math="0 < p < 1" />.
          For what value of <InlineMath math="p" /> does the nightmare probability exceed 5%?
        </p>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setShow1(s => !s)}>
          {show1 ? 'Hide Solution' : 'Show Solution'}
        </button>
        {show1 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 bg-slate-800/60 rounded-xl p-4">
            <p className="text-slate-300 mb-2">
              We need <InlineMath math={String.raw`\frac{p^2}{1+p+p^2} < \frac{1}{3}`} />. Cross-multiplying: <InlineMath math="3p^2 < 1+p+p^2" />,
              so <InlineMath math="2p^2 - p - 1 < 0" />, i.e., <InlineMath math="(2p+1)(p-1) < 0" />. Since <InlineMath math="2p+1 > 0" /> for <InlineMath math="p > 0" />,
              we need <InlineMath math="p < 1" />, which is always true. So <InlineMath math={String.raw`\pi_3 < 1/3`} />.
            </p>
            <p className="text-slate-300 mb-2">
              For <InlineMath math={String.raw`\pi_3 \ge 0.05`} />: solve <InlineMath math={String.raw`\frac{p^2}{1+p+p^2} = 0.05`} />.
            </p>
            <div className="math-block">
              <BlockMath math={String.raw`p^2 = 0.05(1+p+p^2) \implies 0.95p^2 - 0.05p - 0.05 = 0`} />
              <BlockMath math={String.raw`p = \frac{0.05 + \sqrt{0.0025 + 0.19}}{1.9} \approx 0.257`} />
            </div>
            <p className="text-slate-300">So the nightmare probability exceeds 5% when <InlineMath math="p \gtrsim 0.257" />.</p>
          </motion.div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="exercise-box">
        <h3 className="text-xl font-bold text-amber-400 mb-2">Exercise 2: Identifying Communicating Classes</h3>
        <p className="text-slate-300 mb-3">
          Consider the transition matrix on states <InlineMath math="\{0,1,2,3,4\}" />:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`P = \begin{pmatrix} 0 & 1 & 0 & 0 & 0 \\ 0.5 & 0 & 0.5 & 0 & 0 \\ 0 & 0 & 0 & 0.5 & 0.5 \\ 0 & 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 0 & 1 \end{pmatrix}`} />
        </div>
        <p className="text-slate-300 mb-3">
          (a) Find all communicating classes. (b) Classify each class as recurrent or transient.
          (c) Determine the period of each state. (d) Is this chain irreducible?
        </p>
        <button className="btn-secondary text-sm !px-4 !py-2" onClick={() => setShow2(s => !s)}>
          {show2 ? 'Hide Solution' : 'Show Solution'}
        </button>
        {show2 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 bg-slate-800/60 rounded-xl p-4">
            <p className="text-slate-300 mb-2">
              <strong>(a)</strong> Classes: <InlineMath math="\{0,1\}" />, <InlineMath math="\{2\}" />, <InlineMath math="\{3\}" />, <InlineMath math="\{4\}" />.
              State 0 and 1 communicate (0 goes to 1 with prob 1, 1 goes to 0 with prob 0.5).
              State 2 can reach 3 and 4 but neither can reach 2. States 3 and 4 are absorbing.
            </p>
            <p className="text-slate-300 mb-2">
              <strong>(b)</strong> <InlineMath math="\{0,1\}" /> is transient (can escape to state 2 via 1).
              <InlineMath math="\{2\}" /> is transient (goes to 3 or 4, never returns).
              <InlineMath math="\{3\}" /> and <InlineMath math="\{4\}" /> are recurrent (absorbing states).
            </p>
            <p className="text-slate-300 mb-2">
              <strong>(c)</strong> <InlineMath math="d(0) = d(1) = 2" /> (returns to 0 only at even steps: 0 to 1 to 0).
              <InlineMath math="d(2) = 0" /> (never returns). <InlineMath math="d(3) = d(4) = 1" /> (self-loops).
            </p>
            <p className="text-slate-300">
              <strong>(d)</strong> Not irreducible -- there are multiple communicating classes.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Main Page Component ────────────────────
export default function Classification() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            4.3--4.4 Sophisticated Examples & State Classification
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          When a process is not Markov, we enlarge the state space. Then we classify states by communication, periodicity, and recurrence.
        </p>
      </motion.div>

      {/* 4.3 Introduction */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="section-card">
        <h2 className="text-2xl font-bold text-indigo-400 mb-3">4.3 More Sophisticated Examples</h2>
        <p className="text-slate-300 mb-3">
          A common situation: a random sequence <InlineMath math="\{Y_n\}" /> depends on <em>more than one</em> previous value,
          so it is <strong>not</strong> a Markov chain. The fix: enlarge the state to include enough history.
        </p>
        <div className="definition-box">
          <h4 className="text-lg font-semibold text-blue-400 mb-2">Key Technique: Enlarging the State Space</h4>
          <p className="text-slate-300">
            If <InlineMath math="Y_{n+1}" /> depends on <InlineMath math="(Y_n, Y_{n-1})" />, define <InlineMath math="X_n = (Y_{n-1}, Y_n)" />.
            Then <InlineMath math="\{X_n\}" /> is a Markov chain on the product state space.
            This trick converts a process with "memory" into a memoryless Markov chain on a larger space.
          </p>
        </div>
      </motion.div>

      {/* Example 4.5 */}
      <ChelseaSimulator />

      {/* Why it's not Markov */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="section-card">
        <h3 className="text-lg font-bold text-rose-400 mb-2">Why is <InlineMath math="\{X_n\}" /> (ready players) NOT a Markov chain?</h3>
        <p className="text-slate-300 mb-2">
          Knowing only <InlineMath math="X_n = 1" /> (one player ready) is not enough: we need to know if the other player
          has been suspended for one match (returning next) or two (still away). The conditional probabilities differ:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`P(X_{n+1}=1 \mid X_n=1,\, X_{n-1}=2) = 1-p`} />
          <BlockMath math={String.raw`P(X_{n+1}=1 \mid X_n=1,\, X_{n-1}=1,\, X_{n-2}=2) = p`} />
        </div>
        <p className="text-slate-300">
          The future depends on more than just the current state -- the Markov property fails.
          By tracking <InlineMath math="(X_n, Y_n)" /> we restore the Markov property.
        </p>
      </motion.div>

      {/* Example 4.6 */}
      <StockSimulator />

      {/* Stock insight */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="section-card">
        <h3 className="text-lg font-bold text-amber-400 mb-2">Surprising Insight from Example 4.6</h3>
        <p className="text-slate-300 mb-2">
          Even though up-up trends persist (80% chance of continuing), the long-run fraction of UP days
          is only <InlineMath math="4/11 \approx 36.4\%" />! Down days are almost twice as common because
          down-down trends persist even more strongly (90%).
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`P(Y_n = U) = \pi_{(U,U)} + \pi_{(U,D)} = \frac{3}{11} + \frac{1}{11} = \frac{4}{11}`} />
          <BlockMath math={String.raw`P(Y_n = D) = \pi_{(D,U)} + \pi_{(D,D)} = \frac{1}{11} + \frac{6}{11} = \frac{7}{11}`} />
        </div>
      </motion.div>

      {/* Example 4.7 */}
      <AgeReplacementPolicy />

      {/* Section 4.4 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="section-card">
        <h2 className="text-2xl font-bold text-purple-400 mb-3">4.4 Classification of States</h2>
        <p className="text-slate-300 mb-3">
          We now develop the fundamental concepts for analyzing the structure of a Markov chain:
          which states can reach which, how states group together, and whether the chain returns to a state.
        </p>
      </motion.div>

      {/* Accessibility */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="definition-box">
        <h3 className="text-xl font-bold text-blue-400 mb-3">Accessibility and Communication</h3>
        <p className="text-slate-300 mb-2">
          State <InlineMath math="j" /> is <strong>accessible</strong> from state <InlineMath math="i" />,
          written <InlineMath math="i \to j" />, if <InlineMath math="P_{ij}^{(k)} > 0" /> for some <InlineMath math="k > 0" />.
        </p>
        <p className="text-slate-300 mb-3">
          States <InlineMath math="i" /> and <InlineMath math="j" /> <strong>communicate</strong>, written <InlineMath math="i \leftrightarrow j" />,
          if <InlineMath math="i \to j" /> AND <InlineMath math="j \to i" />.
        </p>

        <div className="math-block">
          <p className="text-slate-400 text-sm mb-2">Communication is an equivalence relation:</p>
          <BlockMath math={String.raw`\text{Reflexive: } i \leftrightarrow i \qquad \text{Symmetric: } i \leftrightarrow j \implies j \leftrightarrow i`} />
          <BlockMath math={String.raw`\text{Transitive: } i \leftrightarrow j \text{ and } j \leftrightarrow k \implies i \leftrightarrow k`} />
        </div>
        <p className="text-slate-300">
          This partitions the state space into <strong>communicating classes</strong>.
        </p>
      </motion.div>

      {/* Example 4.8 detail */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="example-box">
        <h3 className="text-xl font-bold text-emerald-400 mb-2">Example 4.8 -- Accessibility Analysis</h3>
        <div className="math-block">
          <BlockMath math={String.raw`P = \begin{pmatrix} 1/2 & 1/2 & 0 & 0 \\ 1/2 & 0 & 1/2 & 0 \\ 0 & 0 & 1/4 & 3/4 \\ 0 & 0 & 1/3 & 2/3 \end{pmatrix}`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-emerald-400 font-semibold text-sm mb-1">Accessibility:</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li><InlineMath math="0 \to 1" />: <InlineMath math="P_{01} = 1/2 > 0" /></li>
              <li><InlineMath math="0 \to 2" />: <InlineMath math="P_{01}P_{12} = 1/4 > 0" /> (via 1)</li>
              <li><InlineMath math="1 \to 0" />: <InlineMath math="P_{10} = 1/2 > 0" /></li>
              <li><InlineMath math="2 \not\to 0" />: no path from 2 to 0</li>
            </ul>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-indigo-400 font-semibold text-sm mb-1">Classes:</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li><InlineMath math="\{0, 1\}" /> communicate -- <span className="text-red-400">transient</span></li>
              <li><InlineMath math="\{2, 3\}" /> communicate -- <span className="text-emerald-400">recurrent</span></li>
              <li>Chain is NOT irreducible</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Irreducibility */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="definition-box">
        <h3 className="text-xl font-bold text-blue-400 mb-2">Irreducible Markov Chains</h3>
        <p className="text-slate-300 mb-2">
          A Markov chain is <strong>irreducible</strong> if all states communicate with each other -- there is only one communicating class
          (the entire state space).
        </p>
        <p className="text-slate-300">
          Every regular MC is irreducible, but an irreducible MC need not be regular (it could be periodic).
        </p>
      </motion.div>

      {/* Periodicity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="definition-box">
        <h3 className="text-xl font-bold text-blue-400 mb-3">Periodicity</h3>
        <p className="text-slate-300 mb-2">
          The <strong>period</strong> of state <InlineMath math="i" /> is:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`d(i) = \gcd\{n \ge 1 : P_{ii}^{(n)} > 0\}`} />
        </div>
        <p className="text-slate-300 mb-2">
          If <InlineMath math="d(i) = 1" />, the state is <strong>aperiodic</strong>. If <InlineMath math="d(i) > 1" />, the state is
          <strong> periodic</strong> with period <InlineMath math="d(i)" />.
        </p>
        <p className="text-slate-300">
          Example: If <InlineMath math="P_{01}=P_{12}=P_{23}=P_{30}=1" /> (deterministic cycle), then all states have period 4.
          But adding <InlineMath math="P_{32}=2/3, P_{30}=1/3" /> makes all states aperiodic.
        </p>
      </motion.div>

      {/* Proposition 4.1 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="theorem-box">
        <h3 className="text-xl font-bold text-yellow-400 mb-3">Proposition 4.1</h3>
        <p className="text-slate-300 mb-2">Let <InlineMath math="d(i)" /> be the period of state <InlineMath math="i" />. Then:</p>
        <ol className="text-slate-300 space-y-2 list-decimal list-inside">
          <li>
            If <InlineMath math="k" /> is not a multiple of <InlineMath math="d(i)" />, then <InlineMath math="P_{ii}^{(k)} = 0" />.
          </li>
          <li>
            <InlineMath math="P_{ii}^{(n)} > 0" /> for all sufficiently large <InlineMath math="n" /> that are multiples of <InlineMath math="d(i)" />.
          </li>
          <li>
            If <InlineMath math="i \leftrightarrow j" />, then <InlineMath math="d(i) = d(j)" />. Communicating states share the same period.
          </li>
        </ol>
      </motion.div>

      {/* Period Calculator */}
      <PeriodCalculator />

      {/* Things to Try: Classification */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-5 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 className="text-teal-400 font-bold mb-3">Things to Try</h4>
        <ul className="text-slate-300 space-y-2 list-disc list-inside">
          <li>In the Chelsea simulator, run 200 steps. Which state is visited most often? Is it the one with the highest stationary probability?</li>
          <li>In the Period Calculator, enter a 3-state cycle (states 0&#8594;1&#8594;2&#8594;0). Verify the period is 3.</li>
          <li>Modify the cycle by adding a self-loop at one state. Does the period change to 1?</li>
          <li>Use the Classification Tool to build a chain with both recurrent and transient classes.</li>
        </ul>
      </motion.div>

      {/* Interactive Classification Tool */}
      <StateClassificationTool />

      {/* Recurrence and Transience */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="definition-box">
        <h3 className="text-xl font-bold text-blue-400 mb-3">Recurrence and Transience</h3>
        <p className="text-slate-300 mb-2">
          Let <InlineMath math="T = \min\{n \ge 1 : X_n = i\}" /> be the <strong>first return time</strong> to state <InlineMath math="i" />.
          Define:
        </p>
        <div className="math-block">
          <BlockMath math={String.raw`f_{ii}^{(n)} = P(T = n \mid X_0 = i), \qquad f_{ii} = P(T < \infty \mid X_0 = i) = \sum_{n=1}^{\infty} f_{ii}^{(n)}`} />
        </div>
        <ul className="text-slate-300 space-y-2 mt-3">
          <li>
            State <InlineMath math="i" /> is <strong className="text-emerald-400">recurrent</strong> if <InlineMath math="f_{ii} = 1" /> (certain to return).
          </li>
          <li>
            State <InlineMath math="i" /> is <strong className="text-red-400">transient</strong> if <InlineMath math="f_{ii} < 1" /> (may never return).
          </li>
        </ul>
        <p className="text-slate-300 mt-3">
          Let <InlineMath math="M" /> = total number of visits to state <InlineMath math="i" />. Then <InlineMath math="P(M \ge k \mid X_0 = i) = f_{ii}^k" />.
        </p>
      </motion.div>

      {/* Theorem 4.2 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="theorem-box">
        <h3 className="text-xl font-bold text-yellow-400 mb-3">Theorem 4.2 (Equivalence of Recurrence)</h3>
        <p className="text-slate-300 mb-2">The following are equivalent:</p>
        <ol className="text-slate-300 space-y-2 list-[lower-alpha] list-inside mb-3">
          <li>State <InlineMath math="i" /> is recurrent (i.e., <InlineMath math="f_{ii} = 1" />).</li>
          <li><InlineMath math="P(M = \infty \mid X_0 = i) = 1" /> (the chain visits <InlineMath math="i" /> infinitely often).</li>
          <li><InlineMath math={String.raw`\sum_{n=1}^{\infty} P_{ii}^{(n)} = \infty`} /> (the expected number of visits is infinite).</li>
        </ol>
        <p className="text-slate-300 mb-2">For transient states:</p>
        <div className="math-block">
          <BlockMath math={String.raw`E[M \mid X_0 = i] = \frac{f_{ii}}{1 - f_{ii}}`} />
        </div>
        <p className="text-slate-300 mt-2">
          <strong>Corollary:</strong> If <InlineMath math="i \leftrightarrow j" />, then <InlineMath math="i" /> and <InlineMath math="j" /> are
          either both recurrent or both transient. Recurrence/transience is a class property.
        </p>
      </motion.div>

      {/* Recurrence demo */}
      <RecurrenceDemo />

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="section-card">
        <h2 className="text-2xl font-bold text-emerald-400 mb-3">Summary of State Classification</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-2 px-3 text-slate-400">Concept</th>
                <th className="py-2 px-3 text-slate-400">Definition</th>
                <th className="py-2 px-3 text-slate-400">Class property?</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 font-semibold text-indigo-400">Accessible</td>
                <td className="py-2 px-3"><InlineMath math="i \to j" /> iff <InlineMath math="P_{ij}^{(k)} > 0" /> some <InlineMath math="k" /></td>
                <td className="py-2 px-3">--</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 font-semibold text-indigo-400">Communicate</td>
                <td className="py-2 px-3"><InlineMath math="i \leftrightarrow j" /> iff <InlineMath math="i \to j" /> and <InlineMath math="j \to i" /></td>
                <td className="py-2 px-3">Defines classes</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 font-semibold text-indigo-400">Irreducible</td>
                <td className="py-2 px-3">All states communicate (single class)</td>
                <td className="py-2 px-3">Whole chain</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 font-semibold text-indigo-400">Period</td>
                <td className="py-2 px-3"><InlineMath math={String.raw`d(i) = \gcd\{n : P_{ii}^{(n)} > 0\}`} /></td>
                <td className="py-2 px-3">Yes (Prop 4.1c)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 font-semibold text-emerald-400">Recurrent</td>
                <td className="py-2 px-3"><InlineMath math="f_{ii} = 1" /> or <InlineMath math={String.raw`\sum P_{ii}^{(n)} = \infty`} /></td>
                <td className="py-2 px-3">Yes (Corollary)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-red-400">Transient</td>
                <td className="py-2 px-3"><InlineMath math="f_{ii} < 1" /> or <InlineMath math={String.raw`\sum P_{ii}^{(n)} < \infty`} /></td>
                <td className="py-2 px-3">Yes (Corollary)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Key Takeaway */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5"
      >
        <h4 className="text-amber-400 font-bold mb-3">Key Takeaway</h4>
        <p className="text-slate-300 leading-relaxed">
          State classification provides the structural foundation for understanding any Markov chain.
          <strong className="text-amber-300"> Communication classes</strong> partition states into groups that talk to each other.
          <strong className="text-amber-300"> Periodicity</strong> determines whether the chain can settle down or must cycle.
          <strong className="text-amber-300"> Recurrence vs. transience</strong> tells us whether the chain revisits a state infinitely often or eventually leaves forever.
          Together, these concepts explain why the limit theorem works for regular chains and what can go wrong otherwise.
        </p>
      </motion.div>

      {/* Exercises */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Practice Exercises</h2>
        <Exercises />
      </motion.div>
    </div>
  )
}
