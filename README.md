# ArthSathi

AI-powered financial companion for Indian users. React + Vite + Tailwind, Supabase (Auth, Postgres, Edge Functions), Gemini API.

> Deploying to the internet: see DEPLOY.md.

## Setup
1. `npm install`
2. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. Deploy the AI function (needs Supabase CLI: `npm i -g supabase`):
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set GEMINI_API_KEY=<your key> ALLOWED_ORIGIN=http://localhost:5173
   supabase functions deploy ai
   ```
5. `npm run dev` → http://localhost:5173
6. Tax tests: `npm test`

## Auth configuration (Supabase Dashboard)
- **Authentication → URL Configuration**: set *Site URL* to your app URL (dev: `http://localhost:5173`) and add `http://localhost:5173/reset-password` (and your deployed `/reset-password`) to *Redirect URLs*. Without this the reset email link is rejected.
- **Authentication → Providers → Email**: keep "Confirm email" ON for production (it also prevents account enumeration at signup). Turn it OFF only to run `npm run test:e2e`.
- Optionally enable "Secure password change" and leaked-password protection under Auth settings.
- Duplicate emails are blocked by Supabase Auth itself (unique email in `auth.users`), not by frontend checks.

## Tests
- `npm test`: unit tests (tax engine, password rules, DB error messages).
- `SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run test:e2e`: live signup/login/duplicate/password/RLS isolation test against your project.
- `supabase/audit.sql`: lists RLS status and policies.

## Database updates (run once each in the Supabase SQL Editor, in this order)
`supabase/schema.sql` (fresh setup, includes everything below) or, for an existing project: `fix_permissions.sql`, `phase3_recurring.sql`, `phase4_scam_history.sql`, `phase5_paper_trades.sql`. Then `supabase/audit.sql` to confirm RLS and policies.

## Status
| Module | State |
|---|---|
| Auth, dashboard | Built |
| Smart Budgeting | Built: search/filters, budgets, alerts, monthly report, CSV export, recurring, explained insights |
| Scam Detector | Built: Low/Medium/High, highlighted phrases, explainable score, samples, masked history |
| Investment Guide | Built: product guides, comparison, SIP / lump sum / RD calculators (hypothetical), AI Q&A |
| Tax Assistant | Built: old vs new regime with slab breakdown, caps, age, HRA helper (FY 2026-27, educational) |
| Market Insights | **Simulated demo data only** (fictional instruments, labelled). Watchlist, charts, paper trading. No real market feed |
| Business Finance | Built: GST calculator and sample invoice, loan EMI with schedule, profit and cash flow. Not saved to the database |

Real market data would need a provider API key and a server-side proxy (an Edge Function). It is intentionally not included.

Not yet run end-to-end against a live Supabase project. Test checklist: sign up, add transactions, set a budget, run a scam check, compare tax, place a paper trade.
