// Rule-based scam scanner. Pure (no network). Every signal carries a weight, a plain-language reason, a safety action and the
// exact text spans to highlight, so the result is explainable. It reports WARNING SIGNS; it can never prove a message is genuine or fraudulent.

export const LEVELS = ["Low", "Medium", "High"] as const;
export type Level = (typeof LEVELS)[number];
export const THRESHOLDS = { medium: 2, high: 5 };
export type Match = { start: number; end: number; text: string };
export type Signal = { id: string; label: string; points: number; why: string; action: string; matches: Match[] };
export type LinkInfo = { url: string; flags: string[] };

type Def = { id: string; label: string; weight: number; re: RegExp; why: string; action: string; advisoryAware?: boolean };
const SECRET = "otp|one[- ]time password|verification code|security code";
const CRED = "upi pin|(atm|card|debit card|credit card|secret|m) ?pin|mpin|cvv|cvc|card number|card expiry|net ?banking (password|id)|password|passcode";
const DEFS: Def[] = [
  { id: "otp_request", label: "Asks you to share an OTP", weight: 2, advisoryAware: true,
    re: new RegExp(`\\b(share|send|tell|give|provide|read out|forward|reply with|enter|confirm|verify)\\b[^.\\n]{0,35}\\b(${SECRET})\\b|\\b(${SECRET})\\b[^.\\n]{0,20}\\b(to us|to me|to the agent|on call|immediately)\\b`, "gi"),
    why: "Genuine banks and apps never ask you to share an OTP. Anyone who has it can approve payments from your account.", action: "Never share an OTP, even with someone who says they are from your bank." },
  { id: "credentials", label: "Asks for a PIN, CVV or password", weight: 3, advisoryAware: true,
    re: new RegExp(`\\b(share|send|enter|provide|give|tell|submit|reply with|confirm|update|verify)\\b[^.\\n]{0,35}\\b(${CRED})\\b`, "gi"),
    why: "No bank or payment app will ask for your PIN, CVV or password by message or call.", action: "Never enter your UPI PIN to receive money, and never share card details or passwords." },
  { id: "sensitive_id", label: "Asks for Aadhaar, PAN or account details", weight: 2, advisoryAware: true,
    re: /\b(share|send|provide|enter|submit|update|verify|confirm|reply with)\b[^.\n]{0,40}\b(aadhaar|aadhar|pan (number|card)|\bpan\b|account number|date of birth|dob)\b/gi,
    why: "Scammers collect identity and account details to take over accounts or commit fraud in your name.", action: "Do not send identity or account details by message. Use only the official app or a branch." },
  { id: "urgency", label: "Pressure to act fast", weight: 1,
    re: /\b(urgent(ly)?|immediately|right now|asap|within \d+ ?(hours?|hrs?|mins?|minutes?)|last chance|expires? (today|soon)|act now|final notice|today only|limited (time|seats))\b/gi,
    why: "Scammers rush you so you do not stop to check. Real organisations give you time and official channels.", action: "Pause. A genuine issue can wait while you verify it." },
  { id: "threat", label: "Threat of blocking, arrest or legal action", weight: 2,
    re: /\b(kyc|account (will be |has been |is )?(blocked|suspended|frozen|closed|deactivated)|pan (card )?(update|expired|block(ed)?)|arrest(ed)?|legal action|case (has been )?(filed|registered)|\bfir\b)\b/gi,
    why: "Fear is a common scam tactic. Fake KYC and 'account blocked' messages are among the most reported frauds.", action: "Check your account status only in your bank's official app or branch." },
  { id: "reward", label: "Prize, lottery or reward bait", weight: 2,
    re: /\b(lottery|lucky draw|you(?:'ve| have)? won|prize|cashback of|reward points? (expire|redeem))\b/gi,
    why: "Unexpected prizes are used to lure you into sharing details or paying a fee.", action: "Ignore unexpected prize or cashback messages." },
  { id: "returns", label: "Guaranteed or unrealistic returns", weight: 3,
    re: /\b(guaranteed returns?|double your money|risk[- ]free profit|assured (profit|returns?)|\d{2,}% (daily|weekly|monthly) returns?)\b/gi,
    why: "No genuine investment can guarantee returns. Promises like this are a hallmark of investment fraud.", action: "Check any investment adviser or platform on the SEBI website before sending money." },
  { id: "remote_access", label: "Asks you to install a remote-access app", weight: 3,
    re: /\b(anydesk|teamviewer|quicksupport|rustdesk|screen ?shar(e|ing)|remote access)\b/gi,
    why: "These apps let a stranger see and control your phone, including your banking apps.", action: "Never install a screen-sharing or remote-access app at a stranger's request." },
  { id: "upi_trick", label: "UPI collect or QR trick", weight: 3,
    re: /\b(collect request|request money|enter (your )?(upi )?pin to receive|scan (this |the )?qr( code)?[^.\n]{0,40}(receive|get|credit|refund))\b/gi,
    why: "You never need to enter a PIN or scan a QR code to RECEIVE money. Those steps only send money out.", action: "Decline unknown collect requests and never scan a QR code to get paid." },
  { id: "upfront_fee", label: "Asks for an upfront fee", weight: 2,
    re: /\b((registration|processing|joining|security|refundable|advance|activation) (fee|deposit|charges?)|(pay|send|transfer)\b[^.\n]{0,25}\b(fee|deposit|charges?))\b/gi,
    why: "Genuine jobs, loans and refunds do not require you to pay first.", action: "Do not pay a fee to receive a job, loan, prize or refund." },
  { id: "payment_pressure", label: "Pressure to pay or transfer money", weight: 2,
    re: /\b(pay|send|transfer|deposit|remit)\b[^.\n]{0,30}\b(now|immediately|today|asap|within \d+ ?(hours?|mins?|minutes?))\b/gi,
    why: "Being told to send money quickly is a classic sign of fraud.", action: "Do not send money because of a message. Verify the request in person or through official contacts." },
  { id: "unrealistic_income", label: "Unrealistic earnings offer", weight: 2,
    re: /\b(earn|income|make)\b[^.\n]{0,15}(rs\.?|₹|inr)\s?\d[\d,]*\s?(per day|daily|a day|\/day|per hour|hourly)/gi,
    why: "Easy daily earnings for simple tasks are commonly used to recruit people into job scams.", action: "Treat 'earn daily from home' offers with suspicion and never pay to join." },
];

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "is.gd", "goo.gl"];
const ODD_TLDS = ["xyz", "top", "club", "online", "site", "info", "icu", "buzz", "live", "vip", "work", "click", "link", "shop", "cfd", "sbs", "rest", "monster", "cyou", "fit"];
const BRANDS = ["sbi", "hdfc", "icici", "axis", "kotak", "paytm", "phonepe", "npci", "rbi", "uidai", "incometax", "epfo", "amazon", "flipkart", "gpay", "googlepay"];
const ORGS = /\b(sbi|state bank|hdfc|icici|axis bank|kotak|pnb|bank of baroda|paytm|phonepe|google pay|gpay|npci|rbi|reserve bank|uidai|income tax( department)?|epfo|india post|fedex|dhl|amazon|flipkart|trai|customs|cbi|police|cyber ?crime)\b/gi;
const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|goo\.gl)\/[^\s<>"']+/gi;
const ADVISORY = /\b(do not|don't|dont|never|not to|should not|shouldn't|no one)\s+(ever\s+|to\s+)?(share|give|tell|disclose|reveal|provide|send|enter)\b|\bnever\s+(ask|asks|request|requests)\b/i;

// A warning like "Never share your OTP" must not count as a request. Only the SAME sentence is considered,
// so "Do not share this. Share your OTP now" is still flagged.
function isAdvisory(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start), after = text.slice(end);
  const s = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf("\n")) + 1;
  const e = after.search(/[.!?\n]/);
  return ADVISORY.test(text.slice(s, e < 0 ? text.length : end + e));
}

function analyseLink(raw: string, start: number): { info: LinkInfo; ids: string[]; match: Match } {
  const url = raw.replace(/[.,;:!?)\]]+$/, "");
  const flags: string[] = [], ids: string[] = [];
  let host = "";
  try { const u = new URL(url.includes("://") ? url : "http://" + url); host = u.hostname.toLowerCase(); if (u.username) { flags.push("Contains a hidden '@' part that disguises the real address"); ids.push("odd_link"); } } catch { /* unparseable */ }
  const tld = host.split(".").pop() ?? "";
  const brand = BRANDS.find((b) => host.includes(b));
  if (SHORTENERS.includes(host)) { flags.push("Shortened link: the real destination is hidden"); ids.push("short_link"); }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { flags.push("Points to a raw IP address, not a normal website"); ids.push("ip_link"); }
  if (brand && (host.includes("-") || ODD_TLDS.includes(tld))) { flags.push(`Contains "${brand}" but has hyphens or an unusual ending, a common imitation trick`); ids.push("lookalike_link"); }
  else if (host.includes("xn--") || ODD_TLDS.includes(tld)) { flags.push("Uses an unusual or disguised web address ending"); ids.push("odd_link"); }
  return { info: { url, flags }, ids, match: { start, end: start + url.length, text: url } };
}
const LINK_DEFS: Record<string, { label: string; weight: number; why: string; action: string }> = {
  short_link: { label: "Shortened link", weight: 2, why: "Short links hide where you will really land.", action: "Do not open shortened links from unknown senders." },
  ip_link: { label: "Link to a raw IP address", weight: 3, why: "Real organisations use named websites, not numeric addresses.", action: "Do not open links that show a number address." },
  lookalike_link: { label: "Link that imitates a known name", weight: 3, why: "Scam sites copy a bank's name with extra words or hyphens. Real banks use their own simple web address.", action: "Type your bank's web address yourself or use its official app." },
  odd_link: { label: "Unusual or disguised link", weight: 1, why: "Odd web address endings and tricks are frequently used by scam sites.", action: "Avoid opening links you did not expect." },
  link: { label: "Contains a link", weight: 1, why: "Links in unexpected messages are a common way to reach fake sites.", action: "Verify the sender before opening any link." },
};

export const BASELINE_ACTIONS = [
  "Do not click links or call numbers in the message.",
  "Check with the organisation using its official app, website or the number printed on your card.",
  "If you already shared an OTP, PIN or password, call your bank right away to block your card or UPI.",
  "Report fraud at cybercrime.gov.in or call 1930.",
];

export function scanMessage(text: string) {
  const signals: Signal[] = [], info: string[] = [];
  let advisoryCount = 0;
  const add = (id: string, label: string, points: number, why: string, action: string, m: Match) => {
    const ex = signals.find((s) => s.id === id);
    if (ex) ex.matches.push(m); else signals.push({ id, label, points, why, action, matches: [m] });
  };
  for (const d of DEFS) {
    for (const m of text.matchAll(d.re)) {
      const start = m.index ?? 0, end = start + m[0].length;
      if (end <= start) continue;
      if (d.advisoryAware && isAdvisory(text, start, end)) { advisoryCount++; continue; }
      add(d.id, d.label, d.weight, d.why, d.action, { start, end, text: m[0] });
    }
  }
  if (advisoryCount) info.push("Warnings such as 'never share your OTP' are normal in genuine messages, so they were not counted.");
  if (!advisoryCount && !signals.some((s) => s.id === "otp_request") && new RegExp(`\\b(${SECRET})\\b`, "i").test(text)) info.push("This message mentions an OTP but does not ask you to share it. Genuine OTP messages look like this. Still, never share the code with anyone.");

  const links: LinkInfo[] = [], linkMatches: Match[] = []; let anyLinkFlag = false;
  for (const m of text.matchAll(LINK_RE)) {
    const { info: li, ids, match } = analyseLink(m[0], m.index ?? 0);
    if (links.some((l) => l.url === li.url)) continue;
    links.push(li); linkMatches.push(match);
    for (const id of ids) { anyLinkFlag = true; const d = LINK_DEFS[id]; add(id, d.label, d.weight, d.why, d.action, match); }
  }
  if (links.length && !anyLinkFlag && signals.length === 0) { const d = LINK_DEFS.link; linkMatches.forEach((m) => add("link", d.label, d.weight, d.why, d.action, m)); }

  // Impersonation: only when a known institution name appears together with another pressure signal and a call to act.
  const pressure = ["otp_request", "credentials", "sensitive_id", "threat", "payment_pressure", "upfront_fee", "reward", "upi_trick", "urgency"];
  const acts = links.length > 0 || /\b(call|click|tap|login|log in|verify|update|download|install|reply|enter)\b/i.test(text);
  if (acts && signals.some((s) => pressure.includes(s.id))) {
    for (const m of text.matchAll(ORGS)) {
      add("impersonation", "Claims to be a bank, government body or brand while pressuring you", 2,
        "Scammers pose as banks, government offices and delivery firms. A message that names one and pressures you to act deserves extra doubt.",
        "Contact the organisation yourself through its official website or the number on your card, not through this message.",
        { start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, text: m[0] });
    }
  }
  signals.sort((a, b) => b.points - a.points);
  const score = signals.reduce((a, s) => a + s.points, 0);
  const level = score >= THRESHOLDS.high ? 2 : score >= THRESHOLDS.medium ? 1 : 0;
  return { level, score, signals, info, links };
}

export function buildActions(level: number, signals: Signal[], aiActions: string[] = []): string[] {
  const out: string[] = [];
  const push = (a: string) => { if (a && !out.includes(a)) out.push(a); };
  if (level === 0) {
    push("If you were not expecting this message, verify it through the official app or website before acting.");
    push("Never share an OTP, PIN or password with anyone.");
  } else {
    signals.slice(0, 4).forEach((s) => push(s.action));
    BASELINE_ACTIONS.forEach(push);
  }
  aiActions.slice(0, 2).forEach((a) => { if (!out.some((o) => o.toLowerCase() === a.toLowerCase())) push(a); });
  return out.slice(0, 8);
}
