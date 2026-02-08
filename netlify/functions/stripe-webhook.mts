import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

/**
 * Stripe Webhook handler.
 *
 * Listens for checkout.session.completed and customer.subscription.deleted events
 * to verify payments and handle subscription lifecycle.
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY         — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET     — Webhook signing secret from Stripe dashboard
 */

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secretKey || !webhookSecret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout completed:", {
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        sku: session.metadata?.sku,
        subscriptionId: session.subscription,
      });
      // Future: store subscription status in a database or Netlify Blobs
      // to enable server-side premium verification
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription cancelled:", {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
      });
      // Future: revoke premium access in database
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("Subscription updated:", {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
      break;
    }

    default:
      console.log("Unhandled event type:", event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/stripe-webhook",
};
