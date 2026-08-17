/**
 * CircuiTry3D — AI Brain proxy (Cloudflare Worker, Gemini)
 *
 * The app NEVER holds the Gemini key. It POSTs a question (+ optional live
 * circuit context) to this worker; the worker holds the key as a server secret,
 * enforces a free-questions-per-day cap per user, calls Gemini, and returns the
 * answer. If this worker is down or the cap is hit, the app falls back to its
 * offline rule-based spec-card answers — so the assistant never hard-fails.
 *
 * Secrets / vars (set at deploy time, see README):
 *   GEMINI_API_KEY   (secret)  — your Google AI Studio key. Server-only.
 *   GEMINI_MODEL     (var)     — e.g. "gemini-2.5-flash". Match ThePrints3D.
 *   DAILY_FREE_LIMIT (var)     — free questions per user per day (default 20).
 *   RATE             (KV)      — KV namespace binding for the daily counter.
 */

const SYSTEM_PROMPT = `You are the built-in circuit tutor inside CircuiTry3D, a 3D circuit-building app for students and hobbyists.
Answer questions about electronics and about using the app.
Style: clear, encouraging, and SHORT — this renders on a phone. Prefer 2–4 sentences. Use plain text (no markdown headers or tables). Show a formula inline only when it genuinely helps.
When the user's message includes a "Circuit context:" block, ground your answer in those actual numbers and components. If a value looks unsafe (a part over its rating, wire over ampacity), say so plainly.
Never invent app features. If you are unsure how the app does something, say so briefly.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── Debug: GET ?debug=models lists the models this key can actually call ──
    // Temporary diagnostic so we can pick a valid GEMINI_MODEL without ever
    // exposing the key. Safe to remove once the model id is confirmed.
    const dbgUrl = new URL(request.url);
    if (request.method === "GET" && dbgUrl.searchParams.get("debug") === "models") {
      if (!env.GEMINI_API_KEY) return json({ error: "no key set" }, 503);
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}&pageSize=100`,
      );
      const listData = await listRes.json();
      const usable = (listData?.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => m.name);
      return json({ status: listRes.status, configuredModel: env.GEMINI_MODEL || "gemini-2.5-flash", usable });
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }

    // ── Parse ────────────────────────────────────────────────────────────────
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }
    const question = String(payload?.question ?? "").trim();
    const context = String(payload?.context ?? "").trim().slice(0, 4000);
    if (!question) return json({ error: "Missing 'question'" }, 400);
    if (question.length > 2000) return json({ error: "Question too long" }, 400);

    if (!env.GEMINI_API_KEY) {
      // Misconfigured deploy — tell the app so it can fall back cleanly.
      return json({ error: "Proxy not configured", fallback: true }, 503);
    }

    // ── Per-user daily cap ───────────────────────────────────────────────────
    // Keyed by caller IP + UTC date. KV entries self-expire after a day, so the
    // counter resets without any cleanup job. If KV isn't bound we fail OPEN
    // (allow the call) rather than block the whole feature on a config slip.
    const cap = Number(env.DAILY_FREE_LIMIT ?? 20);
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const day = new Date().toISOString().slice(0, 10);
    const rateKey = `q:${ip}:${day}`;
    let used = 0;
    if (env.RATE) {
      used = Number((await env.RATE.get(rateKey)) ?? 0);
      if (used >= cap) {
        return json(
          {
            error: "daily_limit",
            fallback: true,
            remaining: 0,
            message: `You've used your ${cap} free AI questions for today. They reset tomorrow — meanwhile the offline spec answers still work.`,
          },
          429,
        );
      }
    }

    // ── Call Gemini ──────────────────────────────────────────────────────────
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const userText = context
      ? `Circuit context:\n${context}\n\nQuestion: ${question}`
      : question;

    let geminiRes;
    try {
      geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return json({ error: "upstream_unreachable", fallback: true }, 502);
    }

    if (!geminiRes.ok) {
      // Surface a fallback flag so the app quietly drops to offline answers.
      return json({ error: "upstream_error", status: geminiRes.status, fallback: true }, 502);
    }

    const data = await geminiRes.json();
    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text ?? "")
      .join("")
      .trim();

    if (!answer) {
      // Blocked by safety filter or empty completion → let the app fall back.
      return json({ error: "empty_completion", fallback: true }, 502);
    }

    // Only charge a question against the cap once we actually have an answer.
    let remaining = null;
    if (env.RATE) {
      await env.RATE.put(rateKey, String(used + 1), { expirationTtl: 90_000 });
      remaining = Math.max(0, cap - (used + 1));
    }

    return json({ answer, remaining, source: "ai" });
  },
};
