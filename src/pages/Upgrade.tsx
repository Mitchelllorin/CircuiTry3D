import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { userHasPro, purchaseProUnlock, restoreProPurchases, isAndroidApp } from "../utils/playStoreBilling";
import i18n from "../i18n";

type PurchaseStatus = "idle" | "purchasing" | "restoring" | "success" | "failed" | "cancelled";

/**
 * Upgrade screen — lets users purchase the "pro_unlock" one-time product or
 * restore a previous purchase.  Also exposes a language switcher as a simple
 * demonstration of the i18n system.
 */
export default function Upgrade() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [hasPro, setHasPro] = useState(userHasPro);
  const isAndroid = isAndroidApp();

  // Keep hasPro in sync with native purchase events
  useEffect(() => {
    const onUnlocked = () => {
      setHasPro(true);
      setStatus("success");
    };
    const onFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ cancelled?: boolean }>).detail;
      setStatus(detail?.cancelled ? "cancelled" : "failed");
    };

    window.addEventListener("circuitry3d:proUnlocked", onUnlocked);
    window.addEventListener("circuitry3d:purchaseFailed", onFailed);
    return () => {
      window.removeEventListener("circuitry3d:proUnlocked", onUnlocked);
      window.removeEventListener("circuitry3d:purchaseFailed", onFailed);
    };
  }, []);

  const handlePurchase = useCallback(async () => {
    if (hasPro) return;
    setStatus("purchasing");
    const launched = await purchaseProUnlock();
    if (!launched) {
      // Not on Android — can't launch native flow
      setStatus("idle");
    }
  }, [hasPro]);

  const handleRestore = useCallback(async () => {
    setStatus("restoring");
    const restored = await restoreProPurchases();
    if (restored) {
      setHasPro(true);
      setStatus("success");
    } else {
      setStatus("idle");
    }
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    void i18n.changeLanguage(lang);
  }, []);

  const featureKeys = ["saves", "components", "ai", "export", "textbook", "support"] as const;

  return (
    <div style={pageStyle}>
      {/* Hero */}
      <div style={heroStyle}>
        <span style={heroIconStyle}>⚡</span>
        <h1 style={heroTitleStyle}>{t("upgrade.title")}</h1>
        <p style={heroSubtitleStyle}>{t("upgrade.subtitle")}</p>
        <p style={heroDescStyle}>{t("upgrade.description")}</p>
      </div>

      {/* Feature list */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{t("upgrade.features.title")}</h2>
        <ul style={featureListStyle}>
          {featureKeys.map((key) => (
            <li key={key} style={featureItemStyle}>
              <span style={checkStyle}>✓</span>
              <span>{t(`upgrade.features.${key}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Purchase / status area */}
      <section style={sectionStyle}>
        {hasPro || status === "success" ? (
          <div style={successBannerStyle}>
            <span>🎉</span> {hasPro && status !== "success" ? t("upgrade.alreadyPro") : t("upgrade.thankYou")}
          </div>
        ) : (
          <>
            {status === "failed" && (
              <p style={errorStyle}>{t("upgrade.purchaseFailed")}</p>
            )}
            {status === "cancelled" && (
              <p style={warnStyle}>{t("upgrade.purchaseCancelled")}</p>
            )}

            {!isAndroid ? (
              <p style={infoStyle}>{t("upgrade.notAvailableOnWeb")}</p>
            ) : (
              <>
                <button
                  style={primaryButtonStyle}
                  onClick={handlePurchase}
                  disabled={status === "purchasing" || status === "restoring"}
                >
                  {status === "purchasing" ? t("common.loading") : t("upgrade.purchaseButton")}
                </button>
                <button
                  style={secondaryButtonStyle}
                  onClick={handleRestore}
                  disabled={status === "purchasing" || status === "restoring"}
                >
                  {status === "restoring" ? t("common.loading") : t("upgrade.restoreButton")}
                </button>
              </>
            )}
          </>
        )}
      </section>

      {/* Language switcher */}
      <section style={langSectionStyle}>
        <span style={langLabelStyle}>{t("language.switcherLabel")}:</span>
        {(["en", "fr", "es"] as const).map((lang) => (
          <button
            key={lang}
            style={{
              ...langButtonStyle,
              ...(i18n.language.startsWith(lang) ? langButtonActiveStyle : {}),
            }}
            onClick={() => handleLanguageChange(lang)}
          >
            {t(`language.${lang}`)}
          </button>
        ))}
      </section>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0f172a",
  color: "#e2e8f0",
  padding: "24px 16px 48px",
  fontFamily: "inherit",
  maxWidth: "480px",
  margin: "0 auto",
};

const heroStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "32px 0 24px",
};

const heroIconStyle: React.CSSProperties = {
  fontSize: "3rem",
  display: "block",
  marginBottom: "12px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "2rem",
  fontWeight: 800,
  color: "#88ccff",
};

const heroSubtitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "1.1rem",
  color: "rgba(226,232,240,0.85)",
};

const heroDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9rem",
  color: "rgba(226,232,240,0.6)",
  lineHeight: 1.6,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "28px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "1rem",
  fontWeight: 600,
  color: "rgba(136,204,255,0.9)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const featureListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(136,204,255,0.08)",
  borderRadius: "12px",
  overflow: "hidden",
};

const featureItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  borderBottom: "1px solid rgba(136,204,255,0.06)",
  fontSize: "0.9rem",
};

const checkStyle: React.CSSProperties = {
  color: "#4ade80",
  fontWeight: 700,
  fontSize: "1rem",
  flexShrink: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "16px",
  marginBottom: "12px",
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "1.05rem",
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.02em",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px",
  background: "transparent",
  color: "rgba(136,204,255,0.7)",
  border: "1px solid rgba(136,204,255,0.2)",
  borderRadius: "10px",
  fontSize: "0.9rem",
  cursor: "pointer",
};

const successBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "16px",
  background: "rgba(74,222,128,0.1)",
  border: "1px solid rgba(74,222,128,0.3)",
  borderRadius: "12px",
  color: "#4ade80",
  fontWeight: 600,
  fontSize: "1rem",
};

const errorStyle: React.CSSProperties = {
  padding: "12px",
  marginBottom: "12px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: "8px",
  color: "#f87171",
  fontSize: "0.875rem",
  textAlign: "center",
};

const warnStyle: React.CSSProperties = {
  padding: "12px",
  marginBottom: "12px",
  background: "rgba(234,179,8,0.1)",
  border: "1px solid rgba(234,179,8,0.3)",
  borderRadius: "8px",
  color: "#fbbf24",
  fontSize: "0.875rem",
  textAlign: "center",
};

const infoStyle: React.CSSProperties = {
  padding: "14px",
  background: "rgba(136,204,255,0.05)",
  border: "1px solid rgba(136,204,255,0.15)",
  borderRadius: "10px",
  color: "rgba(226,232,240,0.7)",
  fontSize: "0.875rem",
  lineHeight: 1.6,
  textAlign: "center",
};

const langSectionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  paddingTop: "20px",
  borderTop: "1px solid rgba(136,204,255,0.08)",
};

const langLabelStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "rgba(226,232,240,0.5)",
};

const langButtonStyle: React.CSSProperties = {
  padding: "6px 14px",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(226,232,240,0.7)",
  border: "1px solid rgba(136,204,255,0.15)",
  borderRadius: "20px",
  fontSize: "0.85rem",
  cursor: "pointer",
};

const langButtonActiveStyle: React.CSSProperties = {
  background: "rgba(59,130,246,0.2)",
  color: "#88ccff",
  borderColor: "rgba(59,130,246,0.5)",
};
