// Sign-aware rupee formatting: -₹5,000 (not ₹-5,000), Indian digit grouping, paise only when present.
export function inr(v) {
  const n = Number(v) || 0
  const abs = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  return (n < 0 && abs !== '0' ? '-' : '') + '₹' + abs
}
