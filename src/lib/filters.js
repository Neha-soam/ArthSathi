export function filterTx(tx, { q = '', cat = '', type = '', from = '', to = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return tx.filter((t) =>
    (!cat || t.category === cat) && (!type || t.type === type) && (!from || t.date >= from) && (!to || t.date <= to) &&
    (!needle || (t.note || '').toLowerCase().includes(needle) || t.category.toLowerCase().includes(needle)))
}
