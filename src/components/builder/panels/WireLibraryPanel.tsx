import WireLibrary from "../../practice/WireLibrary";

interface WireLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWire?: (wireId: string) => void;
  selectedWireId?: string;
}

export function WireLibraryPanel({
  isOpen,
  onClose,
  onSelectWire,
  selectedWireId,
}: WireLibraryPanelProps) {
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
          X
        </button>
        <div className="builder-panel-body builder-panel-body--wire-library">
          <WireLibrary onSelectWire={onSelectWire} selectedWireId={selectedWireId} />
        </div>
      </div>
    </div>
  );
}
