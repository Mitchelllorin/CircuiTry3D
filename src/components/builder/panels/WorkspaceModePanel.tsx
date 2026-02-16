import type { ReactNode } from "react";
import WordMark from "../../WordMark";
import "../../../styles/workspace-mode-panel.css";

type WorkspaceModePanelProps = {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function WorkspaceModePanel({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: WorkspaceModePanelProps) {
  return (
    <div className={`workspace-mode-panel${isOpen ? " open" : ""}`}>
      <div className="workspace-mode-panel-header">
        <div className="workspace-mode-panel-brand" aria-hidden="true">
          <WordMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="workspace-mode-panel-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="toggle-icon">{isOpen ? "▼" : "▲"}</span>
          <span className="toggle-label">{title}</span>
        </button>
        {isOpen && <span className="workspace-mode-panel-subtitle">{subtitle}</span>}
      </div>

      {isOpen && (
        <div className="workspace-mode-panel-body">
          <div className="workspace-mode-panel-content">{children}</div>
        </div>
      )}
    </div>
  );
}
