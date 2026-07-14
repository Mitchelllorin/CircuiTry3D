import { Link } from "react-router-dom";
import "../styles/about.css";

const founderHighlights = [
  {
    title: "Lab Roots",
    detail: "Mentored 300+ students transitioning from schematics to prototyping.",
  },
  {
    title: "Design Standard",
    detail: "Prioritizes explainable simulations that mirror bench-top intuition.",
  },
];

const devStoryPoints = [
  {
    title: "Sketchpad",
    detail: "Started in WebGPU to mirror real-world wire routing and field flow.",
  },
  {
    title: "Simulation Layer",
    detail: "Kirchhoff solvers, field visualizers, and narrative debuggers merged into one canvas.",
  },
  {
    title: "Today",
    detail: "Shared workspaces, adaptive practice, and export-ready schematics for every cohort.",
  },
];

const contactMethods = [
  {
    label: "Email",
    value: "hello@circuitry3d.com",
    href: "mailto:hello@circuitry3d.com",
  },
  {
    label: "Signal / SMS",
    value: "+1 (415) 555-2343",
    href: "tel:+14155552343",
  },
  {
    label: "Office Hours",
    value: "Tues & Thurs · 10a-2p PT",
  },
  {
    label: "HQ",
    value: "Oakland, California",
  },
];

const heroSignals = [
  {
    label: "Cohorts Supported",
    value: "86",
    detail: "Universities, labs, and makerspaces running CircuiTry3D every term.",
  },
  {
    label: "Prototypes Reviewed",
    value: "420+",
    detail: "Circuit walkthroughs delivered through shared 3D canvases and replayable logs.",
  },
  {
    label: "Feedback Loops",
    value: "Weekly",
    detail: "Open founder hours for educators, researchers, and lab techs.",
  },
];

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <div className="about-wordmark" aria-hidden="true">
            <span className="brand-blue">Circui</span>
            <span className="brand-orange">Try</span>
            <span className="brand-green">3D</span>
          </div>
          <p className="about-hero-eyebrow">Founding Story & Dev Journey</p>
          <h1>Built for tactile thinkers who want to reason about electrons together.</h1>
          <p className="about-hero-lede">
            CircuiTry3D began as a weekend prototype meant to feel like a physical lab bench.
            It now powers remote classrooms, aerospace R&D sprints, and maker clubs that need
            collaborative circuit rehearsal without losing the intuition of real components.
          </p>
          <div className="about-hero-actions">
            <Link to="/app" className="about-cta primary">
              Launch Workspace
            </Link>
            <Link to="/community" className="about-cta secondary">
              Join the Community
            </Link>
          </div>
        </div>
        <div className="about-hero-metrics" aria-label="CircuiTry3D impact highlights">
          {heroSignals.map((signal) => (
            <article className="about-metric-card" key={signal.label}>
              <p className="about-metric-label">{signal.label}</p>
              <p className="about-metric-value">{signal.value}</p>
              <p className="about-metric-detail">{signal.detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-section" id="about">
        <p className="section-eyebrow">Founding Story</p>
        <h2>Meet the founder and the Circuitry Dev journey</h2>
        <p className="section-lede">
          CircuiTry3D began as a weekend prototype meant to feel like a physical lab bench. Today it serves classrooms,
          makerspaces, and remote hardware teams who need a tactile space to reason about electrons together.
        </p>
        <div className="about-grid">
          <article className="info-card founder-card">
            <div className="founder-meta">
              <div className="founder-avatar">MK</div>
              <div>
                <p className="eyebrow">Founder · Principal Engineer</p>
                <h3>Morgan Kline</h3>
              </div>
            </div>
            <p>
              Morgan mapped out CircuiTry3D after twelve years of guiding students through analog labs and designing
              mixed-signal silicon for aerospace research. Every pixel is influenced by late-night tutoring logs and lab
              notebooks.
            </p>
            <ul className="story-list">
              {founderHighlights.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="info-card dev-story">
            <h3>Circuitry Dev Story</h3>
            <p>
              The dev team builds in tight loops with educators, electrical engineers, and accessibility specialists to keep
              the tooling approachable without sacrificing fidelity.
            </p>
            <ul className="story-list">
              {devStoryPoints.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="info-card contact-card">
            <h3>Contact & Collaboration</h3>
            <p>
              Whether you are piloting CircuiTry3D in your curriculum or want to co-build new instrumentation, the founder team
              holds weekly open sessions for feedback and pairing.
            </p>
            <div className="contact-badge">Let's build together</div>
            <ul className="contact-list">
              {contactMethods.map((method) => (
                <li className="contact-item" key={method.label}>
                  <span className="contact-label">{method.label}</span>
                  {method.href ? (
                    <span className="contact-value">
                      <a href={method.href}>{method.value}</a>
                    </span>
                  ) : (
                    <span className="contact-value">{method.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
