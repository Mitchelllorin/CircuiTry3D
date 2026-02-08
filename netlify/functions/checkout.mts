import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

/**
 * Stripe Checkout Session creator.
 *
 * Accepts POST { sku, billingCycle? } and returns { url } pointing to
 * the Stripe-hosted checkout page.
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY  — Stripe secret key (sk_live_… or sk_test_…)
 *   SITE_URL           — Public URL of the site (e.g. https://circuitry3d.net)
 */

/** Map SKU identifiers to Stripe Price IDs. Add entries once prices are created in the Stripe dashboard. */
type PriceMap = Record<string, Record<string, string>>;

function getPriceMap(): PriceMap {
  // Populate these with actual Stripe Price IDs from the dashboard.
  // Structure: { [sku]: { [billingCycle]: priceId } }
  const raw = Netlify.env.get("STRIPE_PRICE_MAP");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through to defaults
    }
  }

  // Defaults — replace with real Stripe Price IDs once created
  return {
    "student-license": {
      monthly: Netlify.env.get("STRIPE_PRICE_STUDENT_MONTHLY") ?? "",
      annual: Netlify.env.get("STRIPE_PRICE_STUDENT_ANNUAL") ?? "",
    },
    "educator-license": {
      monthly: Netlify.env.get("STRIPE_PRICE_EDUCATOR_MONTHLY") ?? "",
      annual: Netlify.env.get("STRIPE_PRICE_EDUCATOR_ANNUAL") ?? "",
    },
  };
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured yet. Please check back soon." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { sku?: string; billingCycle?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sku = body.sku;
  const billingCycle = body.billingCycle ?? "annual";

  if (!sku) {
    return new Response(JSON.stringify({ error: "Missing sku" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const priceMap = getPriceMap();
  const priceId = priceMap[sku]?.[billingCycle];

  if (!priceId) {
    return new Response(
      JSON.stringify({ error: `No price configured for ${sku} (${billingCycle})` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(secretKey);
  const siteUrl = Netlify.env.get("SITE_URL") ?? Netlify.env.get("URL") ?? "https://circuitry3d.net";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/#/account?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${siteUrl}/#/pricing?cancelled=true`,
      metadata: { sku, billingCycle },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout session failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/checkout",
};
