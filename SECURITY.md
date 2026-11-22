# Security practices

- **Secrets**: Gemini key lives only in Supabase Edge Function secrets. Frontend holds only the Supabase URL + anon key (safe by design; access is limited by RLS). `.env*` is gitignored; `.env.example` has no values. Never use the `service_role` key in this app.
- **Auth**: Supabase Auth email+password; sessions managed by supabase-js; all app routes are protected; the AI function rejects requests without a valid user JWT.
- **RLS**: enabled on every table; policies restrict rows to `user_id = auth.uid()`. DB CHECK constraints enforce categories, positive amounts and lengths.
- **Validation**: Zod on login and transaction forms; the Edge Function validates action, length limits and the AI's JSON output. SQL injection is avoided by using the Supabase client (parameterised queries).
- **XSS**: React escapes output; no `dangerouslySetInnerHTML`; suspicious links are shown as plain text, never as clickable anchors. CSP headers in `vercel.json`.
- **AI safety**: user text is wrapped as untrusted data with injection-resistant instructions; angle brackets in user text are neutralised so it cannot close the data tag; output is schema-checked; per-user limit of 20 AI requests/hour; graceful fallback if AI fails; scam verdict is never lower than the rule-based verdict.
- **CORS**: Edge Function allows only `ALLOWED_ORIGIN` (default localhost:5173). Set it to your deployed URL.
- **Errors**: generic messages to users; details only in server logs.
- **No sensitive data**: the app never asks for or stores PINs, OTPs, card data, Aadhaar or PAN.
- **Known limits**: rate limit is per-user (no per-IP); enable "Confirm email" and Supabase's built-in auth rate limits/CAPTCHA before production; run `npm audit` periodically.
- **CSV export**: cells beginning with `=`, `+`, `-` or `@` are prefixed with an apostrophe so spreadsheets cannot execute them as formulas.
- **Recurring rules**: protected by RLS like every table; generation is idempotent (unique `recurring_id, date`) and runs with the user's own session, never a service key.
