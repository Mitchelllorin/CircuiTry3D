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

const ALLOWED_ORIGINS = new Set([
  "https://www.circuitry3d.net",
  "https://circuitry3d.net",
]);

function makeCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Allow requests from the production domain (with or without www), any
  // Vercel deployment URL (production like circuitry3d.vercel.app and preview
  // branches), and localhost for local development with `vercel dev`.
  const isVercelUrl =
    requestOrigin !== null &&
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(requestOrigin);
  const isLocalhost =
    requestOrigin !== null &&
    /^http:\/\/localhost(:\d+)?$/.test(requestOrigin);
  const isAllowed =
    (requestOrigin !== null && ALLOWED_ORIGINS.has(requestOrigin)) ||
    isVercelUrl ||
    isLocalhost;
  const allowedOrigin = isAllowed
    ? requestOrigin ?? "https://www.circuitry3d.net"
    : "https://www.circuitry3d.net";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/**
 * Timing-safe string comparison using Web Crypto SHA-256 digests.
 *
 * Both inputs are hashed first so the comparison always operates on two
 * fixed-length 32-byte arrays.  This eliminates both length-based and
 * content-based timing side-channels and uses the native Web Crypto API
 * that is always available in Vercel's Edge Runtime.
 */
async function safeCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  // SHA-256 digests are always 32 bytes — XOR every byte and OR into diff.
  let diff = 0;
  for (let i = 0; i < viewA.length; i++) {
    diff |= viewA[i] ^ viewB[i];
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

  // Trim surrounding whitespace that can sneak in when copying a value into
  // the Vercel dashboard or when environment files include trailing newlines.
  const secret = (process.env.OWNER_SECRET ?? "").trim();
  if (!secret) {
    // OWNER_SECRET is not configured in this Vercel deployment.
    // Return 503 with a flag so the client can show a helpful setup message
    // to the owner (not a generic "wrong password" error).
    return new Response(JSON.stringify({ ok: false, misconfigured: true }), {
      status: 503,
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

  // Trim the submitted password too — it's easy to accidentally include a
  // leading/trailing space when pasting a password.
  const supplied = typeof body?.password === "string" ? body.password.trim() : "";
  const ok = await safeCompare(supplied, secret);

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
