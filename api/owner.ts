/**
 * Owner authentication endpoint.
 *
 * POST /api/owner
 * Body: { "password": "<secret>" }
 *
 * Returns { "ok": true } when the supplied password matches the server-side
 * OWNER_SECRET environment variable, { "ok": false } otherwise.
 *
 * The OWNER_SECRET must be set in the Vercel project dashboard under
 * Settings → Environment Variables. It is never embedded in the client bundle.
 */

export const config = {
  runtime: "edge",
};

const ALLOWED_ORIGIN = "https://www.circuitry3d.net";

function makeCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Allow requests from the production domain and from Vercel preview URLs.
  const isVercelPreview =
    requestOrigin !== null &&
    /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/.test(requestOrigin);
  const allowedOrigin =
    requestOrigin === ALLOWED_ORIGIN || isVercelPreview
      ? requestOrigin
      : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/** Constant-time string comparison to prevent timing attacks. */
async function safeCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  // Record length mismatch BEFORE padding so the check is meaningful.
  let diff = aBytes.length ^ bBytes.length;
  const maxLen = Math.max(aBytes.length, bBytes.length);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);

  for (let i = 0; i < maxLen; i++) {
    diff |= aPadded[i] ^ bPadded[i];
  }
  return diff === 0;
}

const AUTH_FAILURE = JSON.stringify({ ok: false });

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const corsHeaders = makeCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const secret = process.env.OWNER_SECRET;
  if (!secret) {
    // OWNER_SECRET not configured — return a generic auth failure so we don't
    // disclose implementation details to potential attackers.
    return new Response(AUTH_FAILURE, {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { password?: string } | null = null;
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return new Response(AUTH_FAILURE, {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supplied = typeof body?.password === "string" ? body.password : "";
  const ok = await safeCompare(supplied, secret);

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
