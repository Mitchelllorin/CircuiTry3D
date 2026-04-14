import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/educator-pilot.css";

// ── Copy-to-clipboard helper ──────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // Clipboard write denied — silently ignore; user can still select text manually
      },
    );
  };
  return (
    <button type="button" className="pilot-copy-btn" onClick={handleCopy} aria-live="polite">
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

// ── Email template data ───────────────────────────────────────────────────────

const EMAIL_TEMPLATES = [
  {
    id: "teacher-intro",
    label: "Teacher Self-Introduction",
    description:
      "Use this when introducing yourself to the CircuiTry3D team to apply for a pilot seat.",
    subject: "Educator Pilot Application — [Your Name], [School Name]",
    body: `Hi CircuiTry3D team,

I'm [Your Name], a [subject area] teacher at [School Name] in [City, State]. I teach [grade level(s)] and my students currently use [current tools / no dedicated simulation tool].

I'm interested in the CircuiTry3D Educator Pilot Program. Here's a quick overview of my classroom context:

• Subject & grade level: [e.g., Physics 11, CTE Electronics, AP Physics 2]
• Approximate number of students: [class size]
• Curriculum goals I'd like to address: [e.g., Ohm's Law, series/parallel circuits, component failure]
• How I plan to use the tool: [e.g., 3-week lab unit, weekly demos, homework supplement]

I understand that pilot access is provided free of charge with a bundled premium unlock, and that I'll be asked to share structured feedback at the 30-day and 60-day marks. I'm fully on board with that exchange.

Looking forward to hearing from you!

[Your Name]
[Email] | [School] | [Phone (optional)]`,
  },
  {
    id: "dept-head-outreach",
    label: "Dept. Head / Admin Outreach",
    description:
      "Forward to a curriculum director, department head, or CTE coordinator to get institutional buy-in before starting the pilot.",
    subject: "3D Circuit Simulation Tool — Free Pilot Opportunity for Our Department",
    body: `Hi [Department Head / Curriculum Director Name],

I wanted to share an opportunity that could strengthen our [Physics / Electronics / CTE] program at essentially no cost.

CircuiTry3D is a browser-based 3D circuit simulator that lets students build and stress-test real circuits at the atomic level — including component failure physics (short circuits, thermal runaway, etc.) that are impossible to replicate safely in a lab. I've been exploring their Educator Pilot Program and believe it would be an excellent fit for [School Name].

Pilot terms (for reference):
• Completely free teacher access — no individual subscription required
• Includes a bundled one-time premium unlock (full feature set, not a trial)
• In exchange: structured feedback survey at 30 and 60 days, and a brief end-of-pilot interview
• Pilot length: 60 days, renewable if the program is progressing well

The feedback CircuiTry3D collects through the pilot directly shapes their roadmap — so our classroom experience feeds into the product. It's a genuine two-way arrangement.

Would you be open to a brief 15-minute conversation so I can show you what the tool looks like in practice? I'm happy to coordinate a demo for the full department.

[Your Name]
[Title] | [School] | [Email]`,
  },
  {
    id: "student-welcome",
    label: "Student / Class Introduction",
    description:
      "Send to students (or post in your LMS) to introduce the tool at the start of a pilot unit.",
    subject: "New Tool This Unit: 3D Circuit Simulator",
    body: `Hi everyone,

Starting [date/this week], we'll be using CircuiTry3D — a 3D interactive circuit builder — for our [unit name] unit. This is part of an educator pilot program, which means we're among the first classrooms to use the tool, and your feedback genuinely matters.

What you'll be doing:
• Building circuits in a 3D environment (runs in your browser — no install needed)
• Testing component behavior, Ohm's Law scenarios, and failure modes
• Completing [assignment name] using the simulation as your lab environment

Getting access:
1. Go to: https://www.circuitry3d.net/app
2. Use the class join code: [JOIN CODE from your Classroom dashboard]
3. Follow the on-screen prompts — your premium features are already unlocked

Feedback matters:
Because we're part of the pilot program, I'll occasionally ask you to fill out a short survey about your experience with the tool. Your honest responses help shape how the app develops — so you're literally influencing software used by students worldwide.

See you in class!
[Your Name]`,
  },
  {
    id: "feedback-reminder",
    label: "30-Day Feedback Request",
    description:
      "Send to the CircuiTry3D team at the 30-day mark to fulfill your pilot feedback commitment.",
    subject: "Pilot Feedback — 30-Day Check-In | [School Name]",
    body: `Hi CircuiTry3D team,

We're at the 30-day mark of our pilot at [School Name]. Here's my structured feedback:

CLASS CONTEXT
• Subject / grade: [e.g., CTE Electronics, Grade 10]
• Sessions completed using CircuiTry3D: [number]
• Approximate students engaged: [number]

WHAT'S WORKING WELL
• [Specific feature or workflow students responded to positively]
• [Any "aha moment" or unexpected learning outcome]
• [Ease of access / browser reliability]

FRICTION POINTS
• [Anything that slowed the lesson or confused students]
• [Missing features or content you expected to find]
• [Any technical issues encountered]

STUDENT SENTIMENT (rough summary)
• [e.g., "Students found the 3D view engaging but the component library overwhelming at first"]

TOP FEATURE REQUEST
• [The single most requested change from your classroom's perspective]

OVERALL PILOT RATING (1–10): [X]

Happy to jump on a 15-minute call to elaborate on any of this. Just let me know what works.

[Your Name]
[Email] | [School]`,
  },
];

// ── Pilot plan terms ──────────────────────────────────────────────────────────

const PILOT_TERMS = [
  {
    icon: "🎓",
    title: "Free Teacher Access",
    detail:
      "No individual subscription required. Your educator account is fully active for the entire 60-day pilot at no charge.",
  },
  {
    icon: "🔓",
    title: "Bundled One-Time Unlock",
    detail:
      "Your account receives a complimentary one-time premium unlock — full feature access, not a limited trial. If you stay after the pilot, that unlock stays with you.",
  },
  {
    icon: "💬",
    title: "Feedback as Compensation",
    detail:
      "In exchange, we ask for two structured feedback surveys (30-day and 60-day) and a brief 15-minute end-of-pilot conversation. Your classroom experience directly shapes CircuiTry3D's roadmap.",
  },
  {
    icon: "📅",
    title: "60-Day Pilot Window",
    detail:
      "Pilots run for 60 days from your first active session. Renewable by mutual agreement if the program is still actively running at expiry.",
  },
];

const ELIGIBILITY = [
  "Active classroom teacher at an accredited K-12, CTE, community college, or higher-education program",
  "Teaching a subject where circuits are a core or supplemental topic (Physics, Electronics, Engineering, CTE, STEM, Robotics, etc.)",
  "Minimum one class of students who will use the tool during the pilot window",
  "Commitment to both the 30-day and 60-day feedback surveys",
  "Brief end-of-pilot interview or written summary (~15 min)",
];

// ── Page component ────────────────────────────────────────────────────────────

export default function EducatorPilot() {
  const [activeTemplate, setActiveTemplate] = useState(EMAIL_TEMPLATES[0].id);
  const template = EMAIL_TEMPLATES.find((t) => t.id === activeTemplate) ?? EMAIL_TEMPLATES[0];
  const fullText = `Subject: ${template.subject}\n\n${template.body}`;

  return (
    <div className="pilot-page">
      {/* ── Hero ── */}
      <header className="pilot-hero">
        <p className="pilot-eyebrow">Educator Pilot Program</p>
        <h1>Bring 3D Circuit Science into Your Classroom — Free</h1>
        <p className="pilot-subtitle">
          Selected teachers receive full premium access at no cost for 60 days. Your feedback is
          the only thing we ask in return — it directly shapes how CircuiTry3D develops.
        </p>
        <a
          href="mailto:info@circuitry3d.net?subject=Educator%20Pilot%20Application"
          className="pilot-hero-cta"
        >
          Apply for a Pilot Seat →
        </a>
      </header>

      {/* ── Pilot Terms ── */}
      <section className="pilot-section">
        <h2 className="pilot-section-title">What the Pilot Includes</h2>
        <div className="pilot-terms-grid">
          {PILOT_TERMS.map((term) => (
            <div key={term.title} className="pilot-term-card">
              <span className="pilot-term-icon">{term.icon}</span>
              <div>
                <strong>{term.title}</strong>
                <p>{term.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Eligibility ── */}
      <section className="pilot-section pilot-section--narrow">
        <h2 className="pilot-section-title">Who Qualifies</h2>
        <ul className="pilot-eligibility-list">
          {ELIGIBILITY.map((item) => (
            <li key={item}>
              <span className="pilot-check">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Email Templates ── */}
      <section className="pilot-section">
        <h2 className="pilot-section-title">Email Outreach Templates</h2>
        <p className="pilot-section-desc">
          Ready-to-use email templates for every stage of the pilot — from applying, to getting
          departmental approval, to introducing the tool to students and submitting feedback.
        </p>

        <div className="pilot-template-layout">
          {/* Tab list */}
          <nav className="pilot-template-nav" aria-label="Email templates">
            {EMAIL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`pilot-template-tab${activeTemplate === t.id ? " is-active" : ""}`}
                onClick={() => setActiveTemplate(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Template viewer */}
          <div className="pilot-template-viewer">
            <div className="pilot-template-meta">
              <p className="pilot-template-description">{template.description}</p>
              <CopyButton text={fullText} label="Copy Full Email" />
            </div>

            <div className="pilot-template-field">
              <span className="pilot-template-field-label">Subject</span>
              <div className="pilot-template-subject">
                <span>{template.subject}</span>
                <CopyButton text={template.subject} label="Copy" />
              </div>
            </div>

            <div className="pilot-template-field">
              <span className="pilot-template-field-label">Body</span>
              <pre className="pilot-template-body">{template.body}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feedback as Compensation ── */}
      <section className="pilot-section pilot-section--highlight">
        <div className="pilot-feedback-inner">
          <h2 className="pilot-section-title">Why Feedback Is the Compensation</h2>
          <p>
            CircuiTry3D is actively in development. Classroom data from real teachers and students
            is genuinely more valuable to us right now than subscription revenue — it tells us
            what concepts are hardest to teach, where the tool is confusing, and which features
            are worth building next.
          </p>
          <p>
            By committing to two feedback surveys and a brief end-of-pilot conversation, you're
            contributing to a product that will serve hundreds of classrooms. Your input has a
            direct line to the engineering roadmap — not a suggestions box.
          </p>
          <div className="pilot-feedback-asks">
            <div>
              <strong>30-Day Survey</strong>
              <p>What's working, what's broken, first impressions from students. (~10 min)</p>
            </div>
            <div>
              <strong>60-Day Survey</strong>
              <p>Depth feedback on learning outcomes, feature gaps, and curriculum fit. (~15 min)</p>
            </div>
            <div>
              <strong>End-of-Pilot Interview</strong>
              <p>Optional 15-minute call or written summary — your choice of format.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to Apply ── */}
      <section className="pilot-section pilot-section--narrow">
        <h2 className="pilot-section-title">How to Apply</h2>
        <ol className="pilot-steps">
          <li>
            <strong>Copy the "Teacher Self-Introduction" email template</strong> above, fill in
            your details, and send it to{" "}
            <a href="mailto:info@circuitry3d.net" className="pilot-link">
              info@circuitry3d.net
            </a>
            .
          </li>
          <li>
            <strong>We'll confirm eligibility</strong> within 2 business days and activate your
            account with a premium unlock applied.
          </li>
          <li>
            <strong>Use the classroom dashboard</strong> at{" "}
            <Link to="/classroom" className="pilot-link">
              /classroom
            </Link>{" "}
            to create a class, generate a join code for your students, and schedule assignments.
          </li>
          <li>
            <strong>Submit feedback at 30 and 60 days</strong> using the "30-Day Feedback
            Request" template (or fill out the survey link we'll include in your confirmation
            email).
          </li>
        </ol>
        <a
          href="mailto:info@circuitry3d.net?subject=Educator%20Pilot%20Application"
          className="pilot-apply-btn"
        >
          📧 Apply Now — info@circuitry3d.net
        </a>
      </section>

      {/* ── Footer nav ── */}
      <nav className="pilot-footer-nav">
        <Link to="/classroom" className="pilot-footer-link">
          ← Classroom Dashboard
        </Link>
        <Link to="/pricing" className="pilot-footer-link">
          Pricing
        </Link>
        <Link to="/partnerships" className="pilot-footer-link">
          Partnerships
        </Link>
      </nav>
    </div>
  );
}
