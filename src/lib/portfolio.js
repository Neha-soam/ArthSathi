// Paper-trading maths. Holdings, cash and P&L are DERIVED from the immutable trade log (average-cost method, no fees or taxes).
export const STARTING_CASH = 1000000
const r2 = (x) => Math.round(x * 100) / 100
export function computePortfolio(trades, priceOf, startingCash = STARTING_CASH) {
  let cash = startingCash, realized = 0; const pos = {}
  for (const t of [...trades].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))) {
    const q = Number(t.quantity), p = Number(t.price), amt = q * p
    if (t.side === 'buy') { const x = pos[t.symbol] || { qty: 0, avg: 0 }; x.avg = (x.avg * x.qty + amt) / (x.qty + q); x.qty += q; pos[t.symbol] = x; cash -= amt }
    else { const x = pos[t.symbol]; if (!x || x.qty < q) continue; realized += (p - x.avg) * q; x.qty -= q; cash += amt; if (x.qty === 0) delete pos[t.symbol] }
  }
  const holdings = Object.entries(pos).map(([symbol, x]) => {
    const price = priceOf(symbol), cost = x.qty * x.avg, value = price == null ? null : x.qty * price
    return { symbol, qty: x.qty, avgCost: r2(x.avg), price, value: value == null ? null : r2(value), cost: r2(cost), pnl: value == null ? null : r2(value - cost), pnlPct: value == null || cost === 0 ? null : r2(((value - cost) / cost) * 100) }
  }).sort((a, b) => a.symbol.localeCompare(b.symbol))
  const holdingsValue = holdings.reduce((s, h) => s + (h.value ?? h.cost), 0), total = cash + holdingsValue
  return { cash: r2(cash), realized: r2(realized), holdings, holdingsValue: r2(holdingsValue), totalValue: r2(total), totalPnl: r2(total - startingCash), startingCash }
}
export function validateTrade(trades, { symbol, side, quantity }, price, startingCash = STARTING_CASH) {
  const q = Number(quantity)
  if (!symbol) return 'Choose an instrument.'
  if (!Number.isInteger(q) || q < 1 || q > 1000000) return 'Quantity must be a whole number from 1 to 10,00,000.'
  if (!(price > 0)) return 'No price is available for this instrument.'
  const pf = computePortfolio(trades, () => null, startingCash)
  if (side === 'buy' && q * price > pf.cash + 1e-9) return `Not enough virtual cash. Available: ₹${pf.cash.toLocaleString('en-IN')}.`
  if (side === 'sell') { const held = pf.holdings.find((h) => h.symbol === symbol)?.qty ?? 0; if (q > held) return `You only hold ${held} of ${symbol}.` }
  return null
}
