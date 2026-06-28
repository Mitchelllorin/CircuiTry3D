import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { userHasPremiumAccess, purchasePremiumUnlock, isAndroidApp, openWebPayment, hasWebPaymentCheckout, PLAY_STORE_URL } from "../utils/playStoreBilling";

interface UpgradeModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** Called when the user dismisses the modal. */
  onClose: () => void;
}

/**
 * Modal that gates premium features behind the "pro_unlock" one-time purchase.
 * Shows the Play Store purchase sheet on Android; explains the web-only
 * limitation on other platforms.
 */
export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "purchasing" | "success" | "failed" | "cancelled">("idle");
  const supportsDirectWebCheckout = hasWebPaymentCheckout();

  // Listen for native purchase events dispatched by playStoreBilling
  useEffect(() => {
    const onUnlocked = () => setStatus("success");
    const onFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ cancelled?: boolean }>).detail;
      setStatus(detail?.cancelled ? "cancelled" : "failed");
    };

    window.addEventListener("circuitry3d:premiumUnlocked", onUnlocked);
    window.addEventListener("circuitry3d:purchaseFailed", onFailed);
    return () => {
      window.removeEventListener("circuitry3d:premiumUnlocked", onUnlocked);
      window.removeEventListener("circuitry3d:purchaseFailed", onFailed);
    };
  }, []);

  // Dismiss on Escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Reset status whenever the modal reopens
  useEffect(() => {
    if (open) setStatus("idle");
  }, [open]);

  const handlePurchase = useCallback(async () => {
    if (userHasPremiumAccess()) {
      setStatus("success");
      return;
    }
    // On web with a payment URL configured, open the checkout page.
    if (!isAndroidApp() && supportsDirectWebCheckout) {
      openWebPayment();
      return;
    }
    setStatus("purchasing");
    const launched = await purchasePremiumUnlock();
    if (!launched) {
      // On web without a payment URL, revert to idle so we show the
      // "not available on web" message.
      setStatus("idle");
    }
    // If launched, status will update via the window events above.
  }, [supportsDirectWebCheckout]);

  if (!open) return null;

  const isAndroid = isAndroidApp();
  const alreadyPro = userHasPremiumAccess();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("upgrade.title")}
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={iconStyle}>⚡</span>
          <h2 style={titleStyle}>{t("upgrade.title")}</h2>
          <p style={subtitleStyle}>{t("upgrade.subtitle")}</p>
        </div>

        {/* Feature list */}
        <ul style={featureListStyle}>
          {(["saves", "components", "ai", "export", "textbook", "support"] as const).map((key) => (
            <li key={key} style={featureItemStyle}>
              <span style={checkStyle}>✓</span>
              {t(`upgrade.features.${key}`)}
            </li>
          ))}
        </ul>

        {/* Status / action area */}
        {alreadyPro || status === "success" ? (
          <p style={successStyle}>{alreadyPro ? t("upgrade.alreadyPro") : t("upgrade.thankYou")}</p>
        ) : (
          <>
            {status === "failed" && (
              <p style={errorStyle}>{t("upgrade.purchaseFailed")}</p>
            )}
            {status === "cancelled" && (
              <p style={cancelledStyle}>{t("upgrade.purchaseCancelled")}</p>
            )}
            {isAndroid ? (
              <button
                style={purchaseButtonStyle}
                onClick={handlePurchase}
                disabled={status === "purchasing"}
              >
                {status === "purchasing" ? t("common.loading") : t("upgrade.purchaseButton")}
              </button>
            ) : supportsDirectWebCheckout ? (
              <button
                style={purchaseButtonStyle}
                onClick={handlePurchase}
              >
                {t("upgrade.purchaseButton")}
              </button>
            ) : (
              <a
                style={purchaseButtonStyle}
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("upgrade.getOnPlayStore")}
              </a>
            )}
          </>
        )}

        {/* Dismiss */}
        <button style={closeButtonStyle} onClick={onClose}>
          {alreadyPro || status === "success" ? t("common.close") : t("paywall.maybeLater")}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "16px",
};

const modalStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid rgba(136,204,255,0.15)",
  borderRadius: "16px",
  padding: "24px",
  maxWidth: "380px",
  width: "100%",
  color: "#e2e8f0",
  fontFamily: "inherit",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "20px",
};

const iconStyle: React.CSSProperties = {
  fontSize: "2.5rem",
  display: "block",
  marginBottom: "8px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "1.4rem",
  fontWeight: 700,
  color: "#88ccff",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9rem",
  color: "rgba(226,232,240,0.75)",
};

const featureListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: "0 0 20px",
  padding: 0,
};

const featureItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "6px 0",
  fontSize: "0.9rem",
  borderBottom: "1px solid rgba(136,204,255,0.07)",
};

const checkStyle: React.CSSProperties = {
  color: "#4ade80",
  fontWeight: 700,
  flexShrink: 0,
};

const purchaseButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "14px",
  marginBottom: "10px",
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const closeButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px",
  background: "transparent",
  color: "rgba(226,232,240,0.6)",
  border: "1px solid rgba(226,232,240,0.15)",
  borderRadius: "8px",
  fontSize: "0.875rem",
  cursor: "pointer",
};

const successStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "12px",
  marginBottom: "12px",
  background: "rgba(74,222,128,0.1)",
  border: "1px solid rgba(74,222,128,0.3)",
  borderRadius: "8px",
  color: "#4ade80",
  fontWeight: 600,
};

const errorStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "10px",
  marginBottom: "10px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: "8px",
  color: "#f87171",
  fontSize: "0.875rem",
};

const cancelledStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "10px",
  marginBottom: "10px",
  background: "rgba(234,179,8,0.1)",
  border: "1px solid rgba(234,179,8,0.3)",
  borderRadius: "8px",
  color: "#fbbf24",
  fontSize: "0.875rem",
};

