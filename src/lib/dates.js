// Local-time dates. toISOString() is UTC, which put IST users in the wrong day/month between 00:00 and 05:30.
const p2 = (n) => String(n).padStart(2, '0')
export const localDateString = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const localMonthKey = (d = new Date()) => localDateString(d).slice(0, 7)
