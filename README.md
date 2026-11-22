# ArthSathi

AI-powered financial companion for Indian users. React + Vite + Tailwind, Supabase (Auth, Postgres, Edge Functions), Gemini API.

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

## Status
| Module | State |
|---|---|
| Auth, dashboard, budgeting, scam detector | Built |
| Investment guide, tax assistant, business calculators | Built (calculators + AI Q&A) |
| Market insights | Watchlist + glossary only. No price data feed, no paper portfolio yet |
| Business tracking (persistent revenue/expense) | Not built |
| Savings goals UI | Table exists, UI not built |

Not yet run end-to-end against a live Supabase project. Test checklist: sign up → add transactions → set budget → run scam check → compare tax.
