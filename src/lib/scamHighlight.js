// Splits text into segments, each tagged with the signal ids whose matches cover it (overlaps allowed).
export function segmentText(text, signals) {
  const n = text.length, ids = Array.from({ length: n }, () => [])
  for (const s of signals) for (const m of s.matches) for (let i = Math.max(0, m.start); i < Math.min(n, m.end); i++) if (!ids[i].includes(s.id)) ids[i].push(s.id)
  const segs = []
  for (let i = 0; i < n;) {
    const key = ids[i].join('|'); let j = i + 1
    while (j < n && ids[j].join('|') === key) j++
    segs.push({ text: text.slice(i, j), ids: ids[i] }); i = j
  }
  return segs
}
// Privacy: history keeps only a short masked excerpt. UPI IDs/emails and any run of 4+ digits (OTPs, card and phone numbers) are hidden.
export const maskForStorage = (s) => String(s).replace(/[\w.+-]+@[\w-]+(\.[\w-]+)*/g, '•••@•••').replace(/\d{4,}/g, '••••').replace(/\s+/g, ' ').trim().slice(0, 200)
