import { useEffect } from "react";
import WireLibrary from "../../practice/WireLibrary";

interface WireLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WireLibraryPanel({ isOpen, onClose }: WireLibraryPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = () => {
    onClose();
  };

  const handleShellClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`builder-panel-overlay builder-panel-overlay--wire-library${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={handleOverlayClick}
    >
      <div
        className="builder-panel-shell builder-panel-shell--wire-library"
        onClick={handleShellClick}
      >
        <button
          type="button"
          className="builder-panel-close"
          onClick={onClose}
          aria-label="Close wire library"
        >
          ×
        </button>
        <div className="builder-panel-body builder-panel-body--wire-library">
          <WireLibrary />
        </div>
      </div>
    </div>
  );
}
