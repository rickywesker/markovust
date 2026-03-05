/* ─── Shared matrix utilities ─── */

export function matMul(A, B) {
  const n = A.length, m = B[0].length, p = B.length
  const C = Array.from({ length: n }, () => Array(m).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      for (let l = 0; l < p; l++)
        C[i][j] += A[i][l] * B[l][j]
  return C
}

export function identity(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )
}

export function matPow(M, exp) {
  const n = M.length
  let result = identity(n)
  let base = M.map(r => [...r])
  let e = exp
  while (e > 0) {
    if (e % 2 === 1) result = matMul(result, base)
    base = matMul(base, base)
    e = Math.floor(e / 2)
  }
  return result
}

export function heatColor(v, max = 1) {
  if (Math.abs(v) < 1e-12) return 'rgba(99,102,241,0.05)'
  const t = Math.min(Math.abs(v) / max, 1)
  const r = Math.round(99 + 80 * t)
  const g = Math.round(102 + 50 * t)
  const b = 241
  const a = 0.15 + 0.85 * t
  return `rgba(${r},${g},${b},${a})`
}
