import { Link } from "react-router-dom";
import pricingSource from "../data/pricing.json";
import WordMark from "./WordMark";
import "../styles/pricing.css";

type StripeMeta = {
  status: string;
  note?: string;
};

type SubscriptionMeta = {
  stripe?: StripeMeta;
};

type SupportCard = {
  id: string;
  badge: string;
  title: string;
  summary: string;
  bullets: string[];
};

type ImplementationStep = {
  id: string;
  title: string;
  description: string;
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const subscriptionMeta = pricingSource as SubscriptionMeta;

const SUPPORT_CARDS: SupportCard[] = [
  {
    id: "program-planning",
    badge: "Program Planning",
    title: "District & Campus Rollouts",
    summary: "Partner with our team to scope the right subscription footprint for your program.",
    bullets: [
      "Discovery session with admin & lead teachers",
      "Seat provisioning and roster import guidance",
      "Dedicated rollout timeline template",
    ],
  },
  {
    id: "teacher-success",
    badge: "Teacher Enablement",
    title: "Teacher Success Accelerator",
    summary: "Ensure every educator is confident launching CircuiTry3D on day one.",
    bullets: [
      "Live or recorded onboarding workshops",
      "Lesson launch kits with pacing guides",
      "Priority support channel for classroom questions",
    ],
  },
  {
    id: "student-experience",
    badge: "Student Experience",
    title: "Student Engagement Toolkit",
    summary: "Keep learners motivated with ready-to-run activities and analytics.",
    bullets: [
      "Circuit templates aligned to NGSS & CTE standards",
      "Auto-saved progress and classroom monitoring",
      "W.I.R.E. analytics exports for reflections",
    ],
  },
];

const IMPLEMENTATION_STEPS: ImplementationStep[] = [
  {
    id: "discovery",
    title: "Discovery & Goal Setting",
    description: "Share your outcomes, roster counts, and timelines so we can scope the subscription tier that fits best.",
  },
  {
    id: "pilot",
    title: "Pilot With Lead Classrooms",
    description: "Launch a focused pilot with a small teacher cohort and capture quick feedback on access, pacing, and support needs.",
  },
  {
    id: "launch",
    title: "Campus-Wide Launch",
    description: "Provision remaining seats, finalize billing, and host an all-staff enablement session to kick off the program.",
  },
  {
    id: "measure",
    title: "Measure & Expand",
    description: "Review usage analytics, celebrate wins, and plan the next phase—additional campuses, certifications, or advanced bundles.",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "seats",
    question: "How do we purchase educator seats?",
    answer:
      "Start with a discovery call so we can confirm seat counts and billing cadence. Stripe checkout links roll out soon; until then we issue invoices or purchase orders.",
  },
  {
    id: "billing",
    question: "Can we mix monthly and annual billing?",
    answer:
      "Educator plans can mix terms. Many districts choose annual licensing for core staff plus monthly add-ons during summer academies.",
  },
  {
    id: "po-support",
    question: "Do you support purchase orders or vendor onboarding?",
    answer:
      "Yes. We provide W-9, vendor packets, and Net 30 invoicing. Our team coordinates with your procurement office to simplify onboarding.",
  },
  {
    id: "privacy",
    question: "How is student data handled?",
    answer:
      "CircuiTry3D stores minimal student data, encrypts it in transit and at rest, and supports district SSO. Review our privacy policy or request a data-sharing agreement.",
  },
];

export default function SubscriptionSection() {
  const stripe = subscriptionMeta.stripe;

  return (
    <section className="subscription-section" aria-labelledby="subscription-title">
      <div className="subscription-hero">
        <WordMark size="sm" decorative className="subscription-brand" />
        <span className="subscription-kicker">Subscription Success</span>
        <h2 id="subscription-title">Launch CircuiTry3D across your program</h2>
        <p>
          Planning a classroom, campus, or district rollout? This playbook highlights the support included in every
          subscription tier so your team can move from pilot to full adoption with confidence.
        </p>
        {stripe && (
          <div className="subscription-status" data-subscription-status={stripe.status}>
            <span className="subscription-status-label">Billing status</span>
            <span className="subscription-status-value">{stripe.status}</span>
            {stripe.note && <span className="subscription-status-note">{stripe.note}</span>}
          </div>
        )}
      </div>

      <div className="subscription-grid" role="list">
        {SUPPORT_CARDS.map((card) => (
          <article key={card.id} className="subscription-card" role="listitem">
            <span className="subscription-card-badge">{card.badge}</span>
            <h3>{card.title}</h3>
            <p>{card.summary}</p>
            <ul>
              {card.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="subscription-steps">
        <h3>Rollout playbook</h3>
        <ol className="subscription-step-list">
          {IMPLEMENTATION_STEPS.map((step, index) => (
            <li key={step.id} className="subscription-step">
              <span className="subscription-step-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="subscription-step-content">
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="subscription-faq">
        <h3>Common questions</h3>
        <div className="subscription-faq-grid">
          {FAQ_ITEMS.map((faq) => (
            <details key={faq.id} className="subscription-faq-item">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="subscription-cta" role="presentation">
        <div className="subscription-cta-text">
          <h3>Ready to activate your subscription?</h3>
          <p>
            Start in the sandbox today or schedule a planning call to customize your rollout, invoicing, and training
            needs.
          </p>
        </div>
        <div className="subscription-cta-actions">
          <Link className="subscription-cta-button" to="/app" data-cta-type="internal">
            Start free sandbox
          </Link>
          <a
            className="subscription-cta-button"
            href="mailto:hello@circuitry3d.com?subject=CircuiTry3D%20Subscription%20Planning"
            data-cta-type="external"
          >
            Book a planning call
          </a>
        </div>
      </div>
    </section>
  );
}
