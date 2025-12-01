import { Link } from "react-router-dom";
import pricingSource from "../data/pricing.json";
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
    id: "students-makers",
    badge: "Students & Makers",
    title: "Free to Learn, Free to Build",
    summary: "No barriers to entry. Students and hobbyists get full access to build, learn, and explore circuits.",
    bullets: [
      "Unlimited circuit creation and saving",
      "Full component library access",
      "W.I.R.E. analysis and instant feedback",
      "Community resources and shared circuits",
    ],
  },
  {
    id: "educator-support",
    badge: "Educator Support",
    title: "Tools Built for Teaching",
    summary: "Free tier for getting started, premium tools for classrooms that need more.",
    bullets: [
      "Free tier includes lesson templates & progress tracking",
      "Pro tier adds unlimited circuits & analytics",
      "Curriculum alignment guides for standards",
      "Priority support when you need it",
    ],
  },
  {
    id: "school-rollout",
    badge: "Schools & Districts",
    title: "Campus-Wide Deployment",
    summary: "Partner with our team to deploy CircuiTry3D across your entire program.",
    bullets: [
      "SSO and SIS integration support",
      "Admin dashboard for oversight",
      "Dedicated onboarding and training",
      "Volume pricing for larger deployments",
    ],
  },
];

const IMPLEMENTATION_STEPS: ImplementationStep[] = [
  {
    id: "start-free",
    title: "Start Free",
    description: "Students and educators can jump straight in—no credit card, no trial period. Just create an account and start building circuits.",
  },
  {
    id: "explore",
    title: "Explore the Platform",
    description: "Use the full component library, W.I.R.E. analysis, and save your work. See what CircuiTry3D can do for your learning or teaching.",
  },
  {
    id: "upgrade-if-needed",
    title: "Upgrade When Ready",
    description: "Educators who need advanced analytics, unlimited circuits, or curriculum tools can upgrade to Pro. Schools can request a campus license.",
  },
  {
    id: "grow",
    title: "Grow With Us",
    description: "As your program expands, we scale with you. Add seats, request custom training, or explore certification bundles.",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "truly-free",
    question: "Is CircuiTry3D really free for students?",
    answer:
      "Yes. Students get unlimited circuit building, full component access, and W.I.R.E. analysis at no cost. No credit card required, no trial expiration. We believe learning should be accessible.",
  },
  {
    id: "educator-free-vs-pro",
    question: "What's the difference between Educator Free and Pro?",
    answer:
      "Educator Free includes 5 classroom circuits, basic templates, and student progress viewing. Pro unlocks unlimited circuits, advanced analytics, full lesson library, and priority support.",
  },
  {
    id: "school-license",
    question: "How do school or district licenses work?",
    answer:
      "School licenses cover unlimited educator seats and all student accounts on a campus. We handle SSO integration, provide admin dashboards, and offer dedicated onboarding. Contact us for custom pricing.",
  },
  {
    id: "manufacturer-partnership",
    question: "Can my company partner with CircuiTry3D?",
    answer:
      "Yes! We offer manufacturer partnerships ranging from component listings ($500–$2,000/year) to title sponsorships ($50,000+/year). Partners get their products in front of students, educators, and makers. See the Partnerships section on this page or contact us.",
  },
  {
    id: "payment-methods",
    question: "What payment methods do you accept?",
    answer:
      "We're launching Stripe checkout soon for credit card payments. We also support purchase orders, invoicing (Net 30), and can work with your procurement process.",
  },
  {
    id: "cancel-anytime",
    question: "Can I cancel my subscription?",
    answer:
      "Yes. Educator Pro subscriptions can be cancelled anytime. Your access continues through the end of your billing period. There are no cancellation fees.",
  },
];

export default function SubscriptionSection() {
  const stripe = subscriptionMeta.stripe;

  return (
    <section className="subscription-section" aria-labelledby="subscription-title">
      <div className="subscription-hero">
        <span className="subscription-kicker">How It Works</span>
        <h2 id="subscription-title">Access for Everyone</h2>
        <p>
          CircuiTry3D is designed to be accessible. Students and makers use it free. Educators get free tools to start, with premium options for those who need more power.
        </p>
        {stripe && stripe.status !== "active" && (
          <div className="subscription-status" data-subscription-status={stripe.status}>
            <span className="subscription-status-label">Payments</span>
            <span className="subscription-status-value">Coming Soon</span>
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
        <h3>Getting Started</h3>
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
        <h3>Frequently Asked Questions</h3>
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
          <h3>Ready to get started?</h3>
          <p>
            Jump into the sandbox for free, or reach out if you need help choosing the right plan for your classroom or organization.
          </p>
        </div>
        <div className="subscription-cta-actions">
          <Link className="subscription-cta-button" to="/app" data-cta-type="internal">
            Start Free
          </Link>
          <a
            className="subscription-cta-button"
            href="mailto:info@circuitry3d.net?subject=Pricing%20Question"
            data-cta-type="external"
          >
            Ask a Question
          </a>
          <a
            className="subscription-cta-button subscription-cta-partnership"
            href="#partnerships"
            data-cta-type="internal"
          >
            Manufacturer Partnerships
          </a>
        </div>
      </div>
    </section>
  );
}
