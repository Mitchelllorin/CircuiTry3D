import { Link } from "react-router-dom";

const CONTACT = {
  schoolBoard: "hello@circuitry3d.com?subject=School%20Board%20%2F%20District%20Partnership%20Inquiry",
  manufacturer: "hello@circuitry3d.com?subject=Component%20Arena%20Manufacturer%20Partnership",
  general: "hello@circuitry3d.com?subject=CircuiTry3D%20Partnership",
};

export default function Partnerships() {
  return (
    <div style={styles.page}>
      <div style={styles.heroSection}>
        <h1 style={styles.heroTitle}>Partner with CircuiTry3D</h1>
        <p style={styles.heroSub}>
          Reach electronics educators, CTE programs, and students actively learning circuit design —
          exactly when they're engaging with the subject matter.
        </p>
      </div>

      {/* ── Two main tracks ── */}
      <div style={styles.trackGrid}>
        {/* School Board / District Track */}
        <div style={styles.trackCard}>
          <div style={styles.trackIcon}>🏫</div>
          <h2 style={styles.trackTitle}>Schools &amp; Districts</h2>
          <p style={styles.trackDesc}>
            Bring CircuiTry3D into your CTE, electronics, or physics curriculum. Our Institutional
            License gives every educator and student access to the full platform — including the
            FUSE™ Component Arena — at a single site price.
          </p>
          <h3 style={styles.subHeading}>What we offer districts</h3>
          <ul style={styles.list}>
            <li>Unlimited educator + student seats under one license</li>
            <li>SSO / SIS integration so students log in with existing credentials <em>(planned)</em></li>
            <li>Curriculum-aligned lesson templates mapped to NGSS / CTE frameworks</li>
            <li>Admin dashboard for usage analytics and school board reporting</li>
            <li>Dedicated onboarding and professional development sessions</li>
            <li>Custom FUSE™ component profiles tuned to your lab inventory <em>(planned)</em></li>
          </ul>
          <h3 style={styles.subHeading}>How to start the conversation</h3>
          <ol style={styles.list}>
            <li>
              <strong>Email us directly</strong> — introduce your school or district, describe
              your program (CTE, AP Physics, vocational, etc.), and share rough seat counts.
            </li>
            <li>
              <strong>Request a demo</strong> — we'll schedule a 30-minute live walkthrough of
              the 3D Builder + FUSE™ Arena tailored to your curriculum.
            </li>
            <li>
              <strong>Pilot program</strong> — we offer free 60-day institutional pilots for
              qualifying programs so your team can evaluate fit before committing.
            </li>
            <li>
              <strong>Formal proposal</strong> — once fit is confirmed we'll generate a formal
              quote suitable for procurement / school board approval.
            </li>
          </ol>
          <a href={`mailto:${CONTACT.schoolBoard}`} style={styles.ctaButton}>
            Contact Us — Schools &amp; Districts →
          </a>
          <p style={styles.ctaNote}>
            Prefer a phone call? Include your number in the email and we'll reach out within
            one business day.
          </p>
        </div>

        {/* Manufacturer / Product Placement Track */}
        <div style={styles.trackCard}>
          <div style={styles.trackIcon}>🔩</div>
          <h2 style={styles.trackTitle}>Component Manufacturers</h2>
          <p style={styles.trackDesc}>
            Put your real component datasheets in the hands of students and educators actively
            running stress tests in the FUSE™ Component Arena. Featured components appear as
            pre-loaded test specimens — students see your part number, package, and specs every
            time they run a failure simulation.
          </p>
          <h3 style={styles.subHeading}>Featured Component placement</h3>
          <p style={styles.paraText}>
            The Component Arena's <strong>Featured Components</strong> panel displays a curated
            set of real-world parts that students can load into FUSE™ with a single click. Each
            card shows your manufacturer name, part number, and key specifications. When a student
            selects your component, FUSE™ runs the full physics-based failure simulation against
            your actual datasheet values — making your part the subject of the lesson.
          </p>
          <h3 style={styles.subHeading}>What placement includes</h3>
          <ul style={styles.list}>
            <li>Branded component card in the Featured Components panel</li>
            <li>Manufacturer name, part number, and spec line displayed to all Arena users</li>
            <li>Datasheet-accurate electrical and thermal properties used in FUSE™ simulation</li>
            <li>Direct link from the Arena to your product page or distributor</li>
            <li>Mention in CircuiTry3D partner documentation and marketing materials</li>
          </ul>
          <h3 style={styles.subHeading}>How product placement works technically</h3>
          <ol style={styles.list}>
            <li>
              <strong>Submit your datasheet</strong> — provide the part number and the key
              electrical parameters (resistance / capacitance / voltage ratings / thermal
              resistance / current limits / etc.).
            </li>
            <li>
              <strong>We map it to FUSE™</strong> — our team translates your datasheet values
              into a FUSE™ component profile so the physics simulation uses your exact specs.
            </li>
            <li>
              <strong>Card goes live</strong> — your component appears in the Featured Components
              panel for all Arena users.
            </li>
          </ol>
          <h3 style={styles.subHeading}>Component families we can feature</h3>
          <p style={styles.paraText}>
            Resistors · Capacitors · Inductors · LEDs · Diodes · Zener Diodes · MOSFETs · BJTs ·
            Op-Amps · Voltage Regulators · ICs · Batteries · Relays · Fuses · Lamps · Motors ·
            Transformers · Crystal Oscillators · Thermistors — and any custom component type
            via the FUSE™ extensibility API.
          </p>
          <a href={`mailto:${CONTACT.manufacturer}`} style={styles.ctaButton}>
            Contact Us — Component Manufacturers →
          </a>
          <p style={styles.ctaNote}>
            Please include your company name, the component families you'd like featured, and
            a link to the relevant datasheets.
          </p>
        </div>
      </div>

      {/* ── Why partner ── */}
      <div style={styles.whySection}>
        <h2 style={styles.sectionTitle}>Why partner with CircuiTry3D?</h2>
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNum}>FUSE™</div>
            <div style={styles.statLabel}>
              The only circuit simulator with real-time component failure visualization — your
              parts are at the center of the most memorable moment in the lesson.
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>CTE</div>
            <div style={styles.statLabel}>
              Positioned directly in the Career &amp; Technical Education market — students who
              will use your components in their first jobs are learning on them here first.
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>3D</div>
            <div style={styles.statLabel}>
              Immersive, memorable learning experience. Students remember the Vishay resistor that
              charred in their 3D simulation — that brand impression carries into their careers.
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>EDU</div>
            <div style={styles.statLabel}>
              Purpose-built for educators. Product placement is contextually appropriate — you're
              helping students learn, not advertising to a general audience.
            </div>
          </div>
        </div>
      </div>

      {/* ── General contact ── */}
      <div style={styles.generalContact}>
        <h2 style={styles.sectionTitle}>General partnership inquiry</h2>
        <p style={styles.paraText}>
          Not sure which track fits? Have a different kind of partnership in mind — content
          licensing, API integration, white-label, research collaboration? Send us a note and
          we'll figure out the best path forward.
        </p>
        <a href={`mailto:${CONTACT.general}`} style={styles.ctaButtonSecondary}>
          hello@circuitry3d.com →
        </a>
      </div>

      <div style={styles.footer}>
        <Link to="/pricing" style={styles.footerLink}>Pricing</Link>
        <span style={styles.sep}>·</span>
        <Link to="/arena" style={styles.footerLink}>Component Arena</Link>
        <span style={styles.sep}>·</span>
        <Link to="/" style={styles.footerLink}>Home</Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px 24px 64px",
    color: "var(--text-primary, #e2e8f0)",
    fontFamily: "inherit",
  },
  heroSection: {
    textAlign: "center",
    marginBottom: 56,
  },
  heroTitle: {
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: 900,
    letterSpacing: "-0.03em",
    margin: "20px 0 14px",
    color: "#f0f9ff",
  },
  heroSub: {
    fontSize: "clamp(15px, 2vw, 18px)",
    color: "rgba(148, 163, 184, 0.85)",
    maxWidth: 640,
    margin: "0 auto",
    lineHeight: 1.65,
  },
  trackGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 28,
    marginBottom: 56,
  },
  trackCard: {
    background: "rgba(8, 15, 30, 0.85)",
    border: "1px solid rgba(136, 204, 255, 0.16)",
    borderRadius: 18,
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  trackIcon: {
    fontSize: 36,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
    color: "#f0f9ff",
    letterSpacing: "-0.02em",
  },
  trackDesc: {
    fontSize: 14,
    color: "rgba(148, 163, 184, 0.9)",
    lineHeight: 1.65,
    margin: 0,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(148, 163, 184, 0.65)",
    margin: "4px 0 0",
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 13,
    color: "rgba(203, 213, 225, 0.9)",
    lineHeight: 1.75,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  paraText: {
    fontSize: 13,
    color: "rgba(148, 163, 184, 0.85)",
    lineHeight: 1.65,
    margin: 0,
  },
  ctaButton: {
    display: "inline-block",
    marginTop: 8,
    padding: "13px 22px",
    borderRadius: 12,
    background: "rgba(57, 255, 183, 0.12)",
    border: "1px solid rgba(57, 255, 183, 0.4)",
    color: "#39ffb7",
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    letterSpacing: "0.02em",
    transition: "background 0.18s",
  },
  ctaButtonSecondary: {
    display: "inline-block",
    padding: "13px 22px",
    borderRadius: 12,
    background: "rgba(99, 102, 241, 0.12)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    color: "#a5b4fc",
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    letterSpacing: "0.02em",
  },
  ctaNote: {
    fontSize: 11,
    color: "rgba(148, 163, 184, 0.55)",
    margin: 0,
    lineHeight: 1.6,
  },
  whySection: {
    marginBottom: 56,
  },
  sectionTitle: {
    fontSize: "clamp(20px, 3.5vw, 28px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: "0 0 24px",
    color: "#f0f9ff",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  statCard: {
    background: "rgba(8, 15, 30, 0.7)",
    border: "1px solid rgba(136, 204, 255, 0.12)",
    borderRadius: 14,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  statNum: {
    fontSize: 26,
    fontWeight: 900,
    letterSpacing: "0.08em",
    color: "#39ffb7",
    textShadow: "0 0 10px rgba(57,255,183,0.4)",
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(148, 163, 184, 0.85)",
    lineHeight: 1.6,
  },
  generalContact: {
    maxWidth: 560,
    margin: "0 auto 56px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "center",
  },
  footer: {
    textAlign: "center",
    display: "flex",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 32,
    borderTop: "1px solid rgba(136, 204, 255, 0.1)",
  },
  footerLink: {
    color: "rgba(148, 163, 184, 0.7)",
    textDecoration: "none",
    fontSize: 13,
  },
  sep: {
    color: "rgba(148, 163, 184, 0.35)",
    fontSize: 13,
  },
};
