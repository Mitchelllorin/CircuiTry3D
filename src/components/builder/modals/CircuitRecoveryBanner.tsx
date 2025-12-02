/**
 * Circuit Recovery Banner
 * Banner that appears when unsaved work is detected from a previous session.
 */

import type { RecoveryData } from "../../../services/circuitStorage";

interface CircuitRecoveryBannerProps {
  recoveryData: RecoveryData;
  onRecover: () => void;
  onDismiss: () => void;
}

export function CircuitRecoveryBanner({
  recoveryData,
  onRecover,
  onDismiss,
}: CircuitRecoveryBannerProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) {
      return "just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const componentCount = recoveryData.state.components?.length || 0;
  const wireCount = recoveryData.state.wires?.length || 0;

  return (
    <div className="circuit-recovery-banner" role="alert">
      <div className="recovery-icon">&#128268;</div>
      <div className="recovery-content">
        <div className="recovery-title">Unsaved work found</div>
        <div className="recovery-details">
          {recoveryData.name && <span className="recovery-name">{recoveryData.name}</span>}
          <span className="recovery-meta">
            {componentCount} components, {wireCount} wires
          </span>
          <span className="recovery-time">From {formatTime(recoveryData.timestamp)}</span>
        </div>
      </div>
      <div className="recovery-actions">
        <button
          type="button"
          className="circuit-btn circuit-btn-outline recovery-dismiss"
          onClick={onDismiss}
        >
          Dismiss
        </button>
        <button
          type="button"
          className="circuit-btn circuit-btn-primary recovery-restore"
          onClick={onRecover}
        >
          Restore
        </button>
      </div>
    </div>
  );
}
