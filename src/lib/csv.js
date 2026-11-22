// CSV export. Cells starting with = + - @ (or tab/CR) get a leading apostrophe so spreadsheets never run them as formulas.
const risky = /^[=+\-@\t\r]/
export function csvCell(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '' // real numbers (even negative) are never treated as formulas
  let s = v == null ? '' : String(v)
  if (risky.test(s)) s = "'" + s
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
export const csvFromRows = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
export function toCsv(rows) {
  const lines = [['Date', 'Type', 'Category', 'Amount (INR)', 'Note'].join(',')]
  for (const t of rows) lines.push([csvCell(t.date), csvCell(t.type), csvCell(t.category), Number(t.amount).toFixed(2), csvCell(t.note)].join(','))
  return lines.join('\r\n') + '\r\n'
}
export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' })) // BOM so Excel reads UTF-8
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}
