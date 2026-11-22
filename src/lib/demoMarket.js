// SIMULATED market data for learning. These are FICTIONAL instruments and the prices are NOT real: they come from a seeded
// random walk, so every user sees the same repeatable series. No live feed is connected. Weekdays only; no holidays.
export const DEMO_SOURCE = { name: 'ArthSathi simulated demo data (seeded random walk)', real: false }
export const INSTRUMENTS = [
  { symbol: 'DEMO-IDX', name: 'Demo Broad Index', type: 'Index', start: 1000, drift: 0.11, vol: 0.14, seed: 11 },
  { symbol: 'DEMO-TECH', name: 'Demo Tech Co.', type: 'Stock', start: 500, drift: 0.15, vol: 0.30, seed: 23 },
  { symbol: 'DEMO-BANK', name: 'Demo Bank Ltd.', type: 'Stock', start: 800, drift: 0.10, vol: 0.22, seed: 37 },
  { symbol: 'DEMO-PHARMA', name: 'Demo Pharma Ltd.', type: 'Stock', start: 300, drift: 0.08, vol: 0.20, seed: 41 },
  { symbol: 'DEMO-GOLD', name: 'Demo Gold Fund', type: 'Fund', start: 60, drift: 0.07, vol: 0.12, seed: 53 },
  { symbol: 'DEMO-BOND', name: 'Demo Bond Fund', type: 'Fund', start: 100, drift: 0.06, vol: 0.03, seed: 67 },
]
const p2 = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// Walks forward from a fixed start date, so extending `endDate` never changes earlier prices.
export function generateSeries(inst, endDate) {
  const rng = mulberry32(inst.seed), out = [], end = new Date(endDate + 'T00:00:00')
  let price = inst.start
  for (const d = new Date(2024, 0, 1); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const u1 = rng() || 1e-9, u2 = rng(), z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    price *= Math.exp((inst.drift - 0.5 * inst.vol ** 2) / 252 + inst.vol * Math.sqrt(1 / 252) * z)
    out.push({ date: ymd(d), close: Math.round(price * 100) / 100 })
  }
  return out
}
export const buildMarket = (endDate) => Object.fromEntries(INSTRUMENTS.map((i) => [i.symbol, { ...i, series: generateSeries(i, endDate) }]))
export const RANGES = { '1M': 21, '3M': 63, '6M': 126, '1Y': 252, All: Infinity }
export const sliceRange = (series, key) => (RANGES[key] === Infinity ? series : series.slice(-RANGES[key]))

export function rangeStats(series) {
  if (series.length < 2) return null
  let peak = series[0].close, maxDD = 0, hi = -Infinity, lo = Infinity; const rets = []
  series.forEach((p, i) => { peak = Math.max(peak, p.close); maxDD = Math.min(maxDD, (p.close - peak) / peak); hi = Math.max(hi, p.close); lo = Math.min(lo, p.close); if (i) rets.push(Math.log(p.close / series[i - 1].close)) })
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length, sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1))
  const first = series[0].close, last = series[series.length - 1].close
  return { first, last, changePct: (last / first - 1) * 100, high: hi, low: lo, maxDrawdownPct: maxDD * 100, volatilityPct: sd * Math.sqrt(252) * 100 }
}
export const dayChangePct = (series) => (series.length < 2 ? null : (series[series.length - 1].close / series[series.length - 2].close - 1) * 100)
