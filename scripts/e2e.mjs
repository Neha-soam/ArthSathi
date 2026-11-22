// Live integration test against YOUR Supabase project. Uses only the public anon key (same power as the browser).
// Prereq: schema.sql applied, Auth -> "Confirm email" OFF (so signups return a session).
// Run: SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run test:e2e
import { createClient } from '@supabase/supabase-js'
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = process.env
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY'); process.exit(2) }
const mk = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
let failed = 0
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); if (!ok) failed++ }
const rnd = Math.random().toString(36).slice(2, 8)
const emailA = `as.test.a.${rnd}@example.com`, emailB = `as.test.b.${rnd}@example.com`
const pw1 = 'OldPassw0rd!', pw2 = 'NewPassw0rd!'

const A = mk(), B = mk()
// 1. Register
const r1 = await A.auth.signUp({ email: emailA, password: pw1 })
check('1 register new account', !r1.error && r1.data.session, r1.error?.message || 'no session (is Confirm email ON?)')
const idA = r1.data.user?.id
// 2. Duplicate registration
const r2 = await mk().auth.signUp({ email: emailA, password: 'Other1234!x' })
check('2 duplicate signup creates NO usable session/new user', !!r2.error || r2.data.user?.identities?.length === 0 || r2.data.user?.id === idA && !r2.data.session, JSON.stringify(r2.data?.user?.id))
// 3/4. Login correct / wrong
const L = mk()
const ok = await L.auth.signInWithPassword({ email: emailA, password: pw1 })
check('3 login with correct password', !ok.error && !!ok.data.session, ok.error?.message)
const bad = await mk().auth.signInWithPassword({ email: emailA, password: 'WrongPassw0rd' })
check('4 login with wrong password fails', !!bad.error && !bad.data.session)
// 5. Reset request: same response for registered and unknown email
const rs1 = await mk().auth.resetPasswordForEmail(emailA), rs2 = await mk().auth.resetPasswordForEmail(`nobody.${rnd}@example.com`)
check('5 reset request accepted, identical for unknown email', !rs1.error && !rs2.error, (rs1.error || rs2.error)?.message)
console.log('MANUAL  5b clicking the emailed link and the /reset-password page must be tested in the browser')
// 6/7. Password change (same Supabase call the reset page uses) then old/new password
const up = await L.auth.updateUser({ password: pw2 })
check('6 password update succeeds', !up.error, up.error?.message)
const oldTry = await mk().auth.signInWithPassword({ email: emailA, password: pw1 })
check('7a old password no longer works', !!oldTry.error)
const newTry = await mk().auth.signInWithPassword({ email: emailA, password: pw2 })
check('7b new password works', !newTry.error && !!newTry.data.session, newTry.error?.message)
// 8. Add expense, read it back
const ins = await A.from('transactions').insert({ type: 'expense', amount: 123.45, category: 'Food', note: 'e2e' }).select().single()
check('8a expense inserted with server-assigned user_id', !ins.error && ins.data.user_id === idA, ins.error?.message)
const list = await A.from('transactions').select('*')
check('8b expense visible to owner', !list.error && list.data.some((t) => t.id === ins.data?.id), list.error?.message)
await A.from('budgets').upsert({ category: 'Food', monthly_limit: 1000 }, { onConflict: 'user_id,category' })
// 10. Cross-user isolation
const rb = await B.auth.signUp({ email: emailB, password: pw1 })
check('10 user B created', !rb.error && rb.data.session, rb.error?.message)
const seen = await B.from('transactions').select('*').eq('id', ins.data.id)
check('10a B cannot read A transaction by id', !seen.error && seen.data.length === 0, JSON.stringify(seen))
const all = await B.from('transactions').select('*')
check('10b B sees none of A rows in full list', !all.error && !all.data.some((t) => t.user_id === idA))
const upd = await B.from('transactions').update({ amount: 1 }).eq('id', ins.data.id).select()
check('10c B cannot update A row', !upd.error && upd.data.length === 0, JSON.stringify(upd))
const del = await B.from('transactions').delete().eq('id', ins.data.id).select()
check('10d B cannot delete A row', !del.error && del.data.length === 0, JSON.stringify(del))
const spoof = await B.from('transactions').insert({ user_id: idA, type: 'expense', amount: 5, category: 'Food' })
check('10e B cannot insert a row owned by A', !!spoof.error)
const bud = await B.from('budgets').select('*')
check('10f B cannot read A budgets', !bud.error && bud.data.length === 0)
const still = await A.from('transactions').select('amount').eq('id', ins.data.id).single()
check('10g A row unchanged', Number(still.data?.amount) === 123.45)
// 9. Logout => no access
await A.auth.signOut()
const after = await A.auth.getSession()
check('9a session cleared after logout', !after.data.session)
const anon = await A.from('transactions').select('*')
check('9b logged-out client gets no financial rows', !!anon.error || anon.data.length === 0, JSON.stringify(anon.data))
// cleanup own rows
await L.from('transactions').delete().eq('id', ins.data.id); await L.from('budgets').delete().eq('category', 'Food')
console.log(`\n${failed ? failed + ' FAILED' : 'ALL PASSED'}. Delete test users (as.test.*@example.com) in Supabase -> Authentication -> Users.`)
process.exit(failed ? 1 : 0)
