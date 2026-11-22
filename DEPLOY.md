# Deploying ArthSathi (Vercel + Supabase)

Architecture: React app on **Vercel** -> **Supabase** (Auth, Postgres, Edge Function `ai`) -> Gemini. The Gemini key lives only in Supabase.

## 0. Pre-flight (on your laptop)
```
npm install
npm test            # unit tests should pass
npm run build       # must finish without errors; fix any before deploying
git status          # .env.local must NOT be listed (it is gitignored)
```

## 1. Database (Supabase -> SQL Editor)
Already done if the app works locally: `supabase/schema.sql` + `supabase/fix_permissions.sql`. Check with `supabase/audit.sql`.

## 2. Deploy the AI function (PowerShell, inside the project folder)
```
npx supabase login
npx supabase link --project-ref <ref>        # ref = the xxxx in https://xxxx.supabase.co
npx supabase secrets set GEMINI_API_KEY=<your key> ALLOWED_ORIGIN=http://localhost:5173
npx supabase functions deploy ai
```
The function defaults to `gemini-3.5-flash` and falls back to `gemini-3.6-flash` if Google retires a model. To pick another, run `npx supabase secrets set GEMINI_MODEL=<model name from Google AI Studio>`. Secrets are read by the function at runtime, so redeploy it after changing them. (You will update ALLOWED_ORIGIN in step 5.) If you ever pasted your Gemini key in a chat or repo, create a new one in Google AI Studio and use that.

### Test the deployed AI function
```
$env:SUPABASE_URL="https://<ref>.supabase.co"; $env:SUPABASE_ANON_KEY="<anon key>"; $env:TEST_EMAIL="<your test user>"; $env:TEST_PASSWORD="<its password>"
npm run test:smoke
```
It checks: unauthenticated calls are rejected, scam message -> High Risk, normal message not High Risk, prompt-injection cannot lower the verdict, insights use your saved data, Q&A works. If it prints a WARN about the Gemini explanation, run `npx supabase functions logs ai` and look for the error kind (`auth` = bad key, `quota` = limit, `not_found` = model retired, `blocked`, `truncated`).

## 3. Push to GitHub
```
git init
git add .
git commit -m "ArthSathi"
git branch -M main
git remote add origin https://github.com/<you>/arthsathi.git
git push -u origin main
```
Run `git status` first: no `.env` or `.env.local` files should be committed.

## 4. Deploy on Vercel
1. vercel.com -> **Add New -> Project** -> import the GitHub repo. Framework preset: **Vite** (auto-detected).
2. **Environment Variables** (Production): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as `.env.local`). Never add the service_role key or the Gemini key here.
3. Click **Deploy**. Note your URL, e.g. `https://arthsathi.vercel.app`. If you change env vars later, **redeploy** (Vite bakes them in at build time).

## 5. Connect the live URL (required)
- **Supabase -> Authentication -> URL Configuration**: Site URL = your Vercel URL. Add to Redirect URLs: `https://<your-app>.vercel.app/reset-password` (keep the localhost one for development).
- Allow the live site to call the AI function (comma-separated list):
  ```
  npx supabase secrets set ALLOWED_ORIGIN=http://localhost:5173,https://<your-app>.vercel.app
  ```
  Then redeploy the function once so it picks up the new value: `npx supabase functions deploy ai`.
- **Authentication -> Providers -> Email**: turn "Confirm email" ON for production. The built-in email sender allows only a few emails per hour, so for a demo with many sign-ups or resets, set a custom SMTP provider (Authentication -> SMTP Settings).

## 6. Smoke test on the live URL
1. Sign up, confirm email, log in.
2. Sign up again with the same email: no second account is created.
3. Wrong password fails.
4. Forgot password -> email -> link opens "Choose a new password" (no current-password box) -> log in with the new password.
5. Add an expense; it appears on the Dashboard.
6. Scam Detector returns a result.
7. Log out; opening /budgeting redirects to login.
8. A second account cannot see the first account's data.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Blank page / "Missing VITE_SUPABASE_URL" | Add env vars in Vercel, then redeploy |
| Refreshing a page gives 404 | The `vercel.json` rewrite must be deployed (it is in the repo) |
| Scam/AI says unavailable | `npx supabase functions logs ai`; check the GEMINI_API_KEY secret and that ALLOWED_ORIGIN includes your Vercel URL |
| Reset link goes to wrong page / error | Redirect URL not whitelisted (step 5) |
| "We couldn't load your data" | Expand "Technical details"; if it says `permission denied`, run `supabase/fix_permissions.sql` |
| No reset email arrives | Check spam; built-in email rate limit; configure SMTP |
