import { IS_DEMO_MODE } from "../utils/demoMode";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.circuitry3d.app";

/**
 * A fixed banner shown at the top of every page when the app is running in
 * demo mode (i.e. the Vercel web deployment). Informs users that this is a
 * limited preview and directs them to the Play Store for the full release.
 */
export default function DemoBanner() {
  if (!IS_DEMO_MODE) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Demo version notice"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        flexWrap: "wrap",
        padding: "7px 16px",
        background:
          "linear-gradient(90deg, rgba(30,58,120,0.97) 0%, rgba(15,35,90,0.99) 100%)",
        borderBottom: "1px solid rgba(136,204,255,0.22)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        fontSize: "0.78rem",
        fontFamily:
          '"Inter","Poppins","Segoe UI",Roboto,Helvetica,Arial,sans-serif',
        color: "rgba(200,225,255,0.9)",
        letterSpacing: "0.01em",
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          background: "rgba(136,204,255,0.15)",
          border: "1px solid rgba(136,204,255,0.35)",
          borderRadius: "4px",
          padding: "2px 8px",
          fontWeight: 700,
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#88ccff",
          whiteSpace: "nowrap",
        }}
      >
        ⚡ Demo Version
      </span>
      <span style={{ opacity: 0.85 }}>
        Limited component library &mdash; Battery, Resistor, LED, Switch, Ground &amp; Junction
        only.
      </span>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 14px",
          borderRadius: "999px",
          border: "1px solid rgba(136,204,255,0.45)",
          background: "rgba(136,204,255,0.12)",
          color: "#c8e6ff",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.75rem",
          whiteSpace: "nowrap",
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "rgba(136,204,255,0.22)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor =
            "rgba(136,204,255,0.7)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "rgba(136,204,255,0.12)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor =
            "rgba(136,204,255,0.45)";
        }}
      >
        🚀 Get Full Version on Play Store
      </a>
    </div>
  );
}
