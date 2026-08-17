# CircuiTry3D — AI Brain proxy (Cloudflare Worker → Gemini)

A tiny serverless proxy so the app can use Gemini **without ever shipping the API
key**. The key lives as a Cloudflare server secret; the app just calls this
worker's URL. A per-user daily cap protects your Gemini quota. If the worker is
down or the cap is hit, the app falls back to its offline spec-card answers.

```
app  ──POST {question, context}──►  this worker  ──►  Gemini
                                     (holds key,
                                      daily cap)
```

## Deploy (~15 min, free tier, no credit card)

All commands run from this `ai-proxy/` folder.

1. **Log in to Cloudflare** (opens a browser once):
   ```
   npx wrangler login
   ```

2. **Create the daily-cap store** (a KV namespace):
   ```
   npx wrangler kv namespace create RATE
   ```
   It prints an `id = "…"`. Paste that id into `wrangler.toml` (replace
   `PASTE_YOUR_KV_NAMESPACE_ID_HERE`).

3. **Add your Gemini key as a secret** (never committed, never in the app):
   ```
   npx wrangler secret put GEMINI_API_KEY
   ```
   Paste your Google AI Studio key when prompted.

4. **Deploy:**
   ```
   npx wrangler deploy
   ```
   It prints your worker URL, e.g. `https://circuitry3d-ai.<you>.workers.dev`.

5. **Give me that URL.** I point the app's `askBrain` at it (Step 3) via a
   `VITE_AI_PROXY_URL` build var — that's the only app-side change, and the key
   is nowhere near it.

## Tune it later
- Free questions/day → `DAILY_FREE_LIMIT` in `wrangler.toml`, then `wrangler deploy`.
- Model → `GEMINI_MODEL` (set it to the exact model you use in ThePrints3D).
- Rotate the key → re-run `wrangler secret put GEMINI_API_KEY`.

## Quick test (after deploy)
```
curl -X POST https://circuitry3d-ai.<you>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"question":"Why does my LED need a resistor?"}'
```
You should get back `{"answer":"…","remaining":19,"source":"ai"}`.
