/**
 * Upgrade Prompt Modal
 *
 * Shown when a user taps a premium feature in Demo Mode.
 * Displays a message about the feature and an upgrade button.
 */

import { useDemoMode, GATED_FEATURE_LABELS } from "../../../context/DemoModeContext";
import type { GatedFeature } from "../../../context/DemoModeContext";

export function UpgradePromptModal() {
  const { promptedFeature, closeUpgradePrompt, upgradeToPremium } = useDemoMode();

  if (!promptedFeature) return null;

  const featureLabel = GATED_FEATURE_LABELS[promptedFeature] || promptedFeature;

  return (
    <div className="upgrade-modal-overlay" onClick={closeUpgradePrompt}>
      <div
        className="upgrade-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        <button
          type="button"
          className="upgrade-modal-close"
          onClick={closeUpgradePrompt}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="upgrade-modal-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#88ccff" strokeWidth="2" fill="none" />
            <path d="M24 12v16M18 22l6-6 6 6" stroke="#88ccff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="16" y="32" width="16" height="3" rx="1.5" fill="#88ccff" />
          </svg>
        </div>
        <h2 id="upgrade-modal-title" className="upgrade-modal-title">
          Full Version Feature
        </h2>
        <p className="upgrade-modal-message">
          <strong>{featureLabel}</strong> is available in the Full Version of CircuiTry3D.
        </p>
        <p className="upgrade-modal-sub">
          Unlock all components, lessons, save/load, export, and more.
        </p>
        <button
          type="button"
          className="upgrade-modal-btn"
          onClick={upgradeToPremium}
        >
          Upgrade to Full Version
        </button>
        <p className="upgrade-modal-note">
          In-app purchase coming soon. Tap to preview full access.
        </p>
      </div>
    </div>
  );
}

/**
 * Inline upgrade banner for panels and toolbars
 */
export function UpgradeBanner({ feature, compact }: { feature: GatedFeature; compact?: boolean }) {
  const { showUpgradePrompt, isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  const featureLabel = GATED_FEATURE_LABELS[feature] || feature;

  if (compact) {
    return (
      <button
        type="button"
        className="upgrade-banner upgrade-banner--compact"
        onClick={() => showUpgradePrompt(feature)}
        title={`${featureLabel} requires Full Version`}
      >
        <span className="upgrade-banner-lock" aria-hidden="true">&#x1F512;</span>
        <span className="upgrade-banner-text">Upgrade</span>
      </button>
    );
  }

  return (
    <div className="upgrade-banner">
      <span className="upgrade-banner-lock" aria-hidden="true">&#x1F512;</span>
      <span className="upgrade-banner-text">
        {featureLabel} &mdash; <button
          type="button"
          className="upgrade-banner-link"
          onClick={() => showUpgradePrompt(feature)}
        >
          Upgrade to Full Version
        </button>
      </span>
    </div>
  );
}

/**
 * Locked overlay for premium components in the library
 */
export function LockedComponentOverlay({ componentId }: { componentId: string }) {
  const { showUpgradePrompt, isComponentAvailable } = useDemoMode();

  if (isComponentAvailable(componentId)) return null;

  return (
    <div
      className="locked-component-overlay"
      onClick={(e) => {
        e.stopPropagation();
        showUpgradePrompt("advanced-components");
      }}
      title="Available in Full Version"
    >
      <span className="locked-component-icon" aria-hidden="true">&#x1F512;</span>
      <span className="locked-component-label">Full Version</span>
    </div>
  );
}
