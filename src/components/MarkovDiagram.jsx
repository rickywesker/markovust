import { useState, useMemo } from 'react'

/**
 * Reusable Markov Chain state transition diagram (SVG).
 *
 * Props:
 *   states:      [{ id, label, color? }]
 *   transitions: [{ from, to, prob, label? }]
 *   width / height (default 420×280)
 *   layout: 'circle' | 'custom'  (if 'custom', states need x,y)
 *   nodeRadius (default 24)
 *   className
 */
export default function MarkovDiagram({
  states,
  transitions,
  width = 420,
  height = 280,
  layout = 'circle',
  nodeRadius = 24,
  className = '',
}) {
  const [hovered, setHovered] = useState(null)

  // Compute positions
  const positions = useMemo(() => {
    if (layout === 'custom') {
      return Object.fromEntries(states.map(s => [s.id, { x: s.x, y: s.y }]))
    }
    // Circle layout
    const cx = width / 2
    const cy = height / 2
    const r = Math.min(width, height) * 0.34
    const n = states.length
    return Object.fromEntries(
      states.map((s, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
        return [s.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }]
      })
    )
  }, [states, width, height, layout])

  // Index transitions by (from, to)
  const transMap = useMemo(() => {
    const m = {}
    for (const t of transitions) {
      m[`${t.from}->${t.to}`] = t
    }
    return m
  }, [transitions])

  // Check if reverse edge exists (for curving)
  const hasBidirectional = (from, to) =>
    !!transMap[`${to}->${from}`] && from !== to

  const defaultColor = '#6366f1'
  const stateColor = id => states.find(s => s.id === id)?.color || defaultColor

  // Dimmed when hovering something else
  const isActive = (from, to) => {
    if (hovered === null) return true
    return from === hovered || to === hovered
  }

  const isNodeActive = id => {
    if (hovered === null) return true
    if (id === hovered) return true
    return transitions.some(
      t => (t.from === id && t.to === hovered) || (t.to === id && t.from === hovered)
    )
  }

  // Render self-loop
  const renderSelfLoop = (stateId, prob, label) => {
    const pos = positions[stateId]
    if (!pos) return null
    const color = stateColor(stateId)
    const active = isActive(stateId, stateId)
    const opacity = active ? 1 : 0.15

    // Find angle away from center
    const cx = width / 2, cy = height / 2
    const dx = pos.x - cx, dy = pos.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dist, uy = dy / dist

    const loopCx = pos.x + ux * (nodeRadius + 16)
    const loopCy = pos.y + uy * (nodeRadius + 16)
    const loopR = 13

    const displayLabel = label || prob.toFixed(2).replace(/\.?0+$/, '') || ''

    return (
      <g key={`self-${stateId}`} opacity={opacity} style={{ transition: 'opacity 0.2s' }}>
        <circle cx={loopCx} cy={loopCy} r={loopR} fill="none" stroke={color} strokeWidth={1.8} />
        {/* Small arrow at reconnection point */}
        <circle cx={loopCx + loopR * 0.7} cy={loopCy - loopR * 0.7} r={2.2} fill={color} />
        <text
          x={loopCx + ux * (loopR + 10)}
          y={loopCy + uy * (loopR + 10)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#94a3b8"
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {displayLabel}
        </text>
      </g>
    )
  }

  // Render directed edge
  const renderEdge = (t) => {
    const { from, to, prob, label } = t
    if (from === to) return null

    const p1 = positions[from]
    const p2 = positions[to]
    if (!p1 || !p2) return null

    const color = stateColor(from)
    const active = isActive(from, to)
    const opacity = active ? 1 : 0.15

    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dist, uy = dy / dist

    // Offset for bidirectional edges
    const bidir = hasBidirectional(from, to)
    const offset = bidir ? 10 : 0
    const nx = -uy * offset, ny = ux * offset

    const x1 = p1.x + ux * nodeRadius + nx
    const y1 = p1.y + uy * nodeRadius + ny
    const x2 = p2.x - ux * (nodeRadius + 7) + nx
    const y2 = p2.y - uy * (nodeRadius + 7) + ny

    // Quadratic control point
    const midX = (x1 + x2) / 2 + nx * 1.5
    const midY = (y1 + y2) / 2 + ny * 1.5

    // Arrowhead
    const angle = Math.atan2(y2 - midY, x2 - midX)
    const arrowLen = 8
    const a1x = x2 - arrowLen * Math.cos(angle - 0.35)
    const a1y = y2 - arrowLen * Math.sin(angle - 0.35)
    const a2x = x2 - arrowLen * Math.cos(angle + 0.35)
    const a2y = y2 - arrowLen * Math.sin(angle + 0.35)

    const displayLabel = label || prob.toFixed(2).replace(/\.?0+$/, '') || ''

    // Label offset perpendicular to the edge
    const labelX = midX + nx * 0.5
    const labelY = midY + ny * 0.5 - 6

    return (
      <g key={`${from}->${to}`} opacity={opacity} style={{ transition: 'opacity 0.2s' }}>
        <path
          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          opacity={0.7}
        />
        <polygon points={`${x2},${y2} ${a1x},${a1y} ${a2x},${a2y}`} fill={color} opacity={0.7} />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="auto"
          fill="#94a3b8"
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {displayLabel}
        </text>
      </g>
    )
  }

  // Render node
  const renderNode = (s) => {
    const pos = positions[s.id]
    if (!pos) return null
    const color = s.color || defaultColor
    const active = isNodeActive(s.id)
    const opacity = active ? 1 : 0.2

    return (
      <g
        key={`node-${s.id}`}
        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
        opacity={opacity}
        onMouseEnter={() => setHovered(s.id)}
        onMouseLeave={() => setHovered(null)}
      >
        <circle
          cx={pos.x} cy={pos.y} r={nodeRadius}
          fill={color + '22'}
          stroke={color}
          strokeWidth={2.2}
        />
        <text
          x={pos.x} y={pos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e2e8f0"
          fontSize={13}
          fontWeight="bold"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {s.label}
        </text>
      </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      style={{ maxHeight: height }}
      onMouseLeave={() => setHovered(null)}
    >
      {/* Edges first (behind nodes) */}
      {transitions.filter(t => t.from === t.to).map(t =>
        renderSelfLoop(t.from, t.prob, t.label)
      )}
      {transitions.filter(t => t.from !== t.to).map(renderEdge)}
      {/* Nodes on top */}
      {states.map(renderNode)}
    </svg>
  )
}
