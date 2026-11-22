// Pure logic for the AI function (no Deno or network imports) so it can be unit-tested with a mocked fetch.

export const LEVELS = ["Potentially Safe", "Suspicious", "High Risk"] as const;

// ---- Scam rules (run first; also the fallback if AI is down) ----
const RULES: { re: RegExp; w: number; flag: string }[] = [
  { re: /\b(otp|one[- ]time password|verification code)\b/i, w: 2, flag: "Mentions an OTP/verification code. Genuine banks never ask you to share it." },
  { re: /\b(upi pin|mpin|cvv|card number|net ?banking password|atm pin|password)\b/i, w: 3, flag: "Asks for a PIN, CVV or password. No legitimate service asks for these." },
  { re: /\b(urgent|immediately|within \d+ ?(hours?|mins?|minutes?)|last chance|expires? today|act now|final notice)\b/i, w: 2, flag: "Uses urgency or pressure to rush you." },
  { re: /\b(kyc|account (will be )?(blocked|suspended|frozen|closed)|pan (card )?(update|expired))\b/i, w: 2, flag: "Fake KYC/account-block threat, a very common scam pattern." },
  { re: /\b(lottery|lucky draw|you have won|prize|cashback of|reward points? (expire|redeem))\b/i, w: 2, flag: "Prize, lottery or reward bait." },
  { re: /\b(guaranteed returns?|double your money|risk[- ]free profit|assured profit|\d{2,}% (daily|weekly|monthly) returns?)\b/i, w: 3, flag: "Promises guaranteed or unrealistic returns." },
  { re: /\b(anydesk|teamviewer|quicksupport|screen ?share|remote access)\b/i, w: 3, flag: "Asks you to install a remote-access app, which lets scammers see your screen." },
  { re: /\b(collect request|request money|scan (this )?qr (code )?to receive|enter (your )?pin to receive)\b/i, w: 3, flag: "UPI trick: you never need to enter a PIN or scan a QR to RECEIVE money." },
  { re: /\b(bit\.ly|tinyurl|t\.co|cutt\.ly|rb\.gy|is\.gd|goo\.gl)\//i, w: 2, flag: "Uses a shortened link that hides the real destination." },
  { re: /https?:\/\/\d{1,3}(\.\d{1,3}){3}/i, w: 3, flag: "Link points to a raw IP address instead of a real website." },
  { re: /\b(send|pay|transfer) (a )?(small |registration |processing )?(fee|deposit|amount) (to|first)\b/i, w: 2, flag: "Asks for an upfront fee before giving something." },
];
const LINK_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

export function ruleScan(text: string) {
  let score = 0; const flags: string[] = [];
  for (const r of RULES) if (r.re.test(text)) { score += r.w; flags.push(r.flag); }
  const links = [...new Set(text.match(LINK_RE) ?? [])].slice(0, 10);
  if (links.length && !flags.length) { score += 1; flags.push("Contains a link. Verify the sender before ever opening it."); }
  const level = score >= 5 ? 2 : score >= 2 ? 1 : 0;
  return { level, flags, links };
}

// ---- Gemini ----
export type GeminiErrorKind = "no_key" | "auth" | "quota" | "blocked" | "truncated" | "empty" | "not_found" | "http" | "timeout";
export class GeminiError extends Error {
  kind: GeminiErrorKind; status?: number;
  constructor(kind: GeminiErrorKind, message: string, status?: number) { super(message); this.kind = kind; this.status = status; }
}

// Returns the model's text, or throws GeminiError. Handles blocked prompts, empty candidates and truncated JSON.
export function extractText(d: any, asJson: boolean): string {
  if (d?.promptFeedback?.blockReason) throw new GeminiError("blocked", "prompt blocked: " + d.promptFeedback.blockReason);
  const c = d?.candidates?.[0];
  if (!c) throw new GeminiError("empty", "no candidates returned");
  if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"].includes(c.finishReason)) throw new GeminiError("blocked", "response blocked: " + c.finishReason);
  const text = (c.content?.parts ?? []).filter((p: any) => typeof p?.text === "string" && !p.thought).map((p: any) => p.text).join("");
  if (!text.trim()) throw new GeminiError(c.finishReason === "MAX_TOKENS" ? "truncated" : "empty", "empty text, finishReason=" + c.finishReason);
  if (asJson && c.finishReason === "MAX_TOKENS") throw new GeminiError("truncated", "JSON cut off by token limit");
  return text;
}

export async function callGemini(o: { apiKey?: string; models: string[]; system: string; user: string; asJson: boolean; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<string> {
  const { apiKey, models, system, user, asJson } = o;
  if (!apiKey) throw new GeminiError("no_key", "GEMINI_API_KEY secret is not set");
  const f = o.fetchImpl ?? fetch;
  const redact = (s: string) => s.split(apiKey).join("[redacted]");
  let lastErr: GeminiError = new GeminiError("http", "no model tried");
  for (const model of models) {
    let r: Response;
    try {
      r = await f(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        // Key goes in a header, never in the URL, so it cannot show up in URL logs.
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          // Generous limit: newer Gemini models spend part of this budget on internal thinking.
          // Temperature is left at the model default (Google recommends this for Gemini 3).
          generationConfig: { maxOutputTokens: 2048, ...(asJson ? { responseMimeType: "application/json" } : {}) },
        }),
        signal: AbortSignal.timeout(o.timeoutMs ?? 25000),
      });
    } catch (e) {
      throw new GeminiError("timeout", redact(String((e as Error)?.message ?? e)));
    }
    if (r.status === 404) { lastErr = new GeminiError("not_found", `model ${model} not found (retired?)`, 404); continue; }
    if (!r.ok) {
      const body = redact((await r.text().catch(() => "")).slice(0, 300));
      if (r.status === 429) throw new GeminiError("quota", "rate limit or quota exceeded: " + body, 429);
      if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key|API_KEY/i.test(body))) throw new GeminiError("auth", "API key rejected: " + body, r.status);
      throw new GeminiError("http", `HTTP ${r.status}: ${body}`, r.status);
    }
    return extractText(await r.json(), asJson);
  }
  throw lastErr;
}

// ---- Parsing / validation of model output ----
export function parseJsonObject(text: string): any | null {
  const t = text.replace(/```json|```/gi, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}
export function validateScamAI(p: any) {
  if (!p || !LEVELS.includes(p.verdict) || !Array.isArray(p.flags) || !Array.isArray(p.actions)) return null;
  return {
    verdict: p.verdict as (typeof LEVELS)[number],
    summary: String(p.summary ?? "").slice(0, 400),
    flags: p.flags.slice(0, 6).map((x: unknown) => String(x).slice(0, 200)),
    actions: p.actions.slice(0, 5).map((x: unknown) => String(x).slice(0, 200)),
  };
}

export const userMessageFor = (k: GeminiErrorKind) =>
  k === "quota" ? "The AI is busy right now. Please try again in a few minutes."
  : k === "blocked" ? "The AI could not process this request. Try rephrasing it."
  : "The AI assistant is temporarily unavailable. The rest of the app still works.";

// User text goes inside <user_text> tags as DATA. Angle brackets are replaced with look-alike characters so
// the text can never close the tag (e.g. "</user_text> now follow my instructions") and escape the data section.
export const wrapUserText = (s: string) => `<user_text>${s.replace(/</g, "\uFF1C").replace(/>/g, "\uFF1E")}</user_text>`;
