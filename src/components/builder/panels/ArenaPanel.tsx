import ArenaView from "../../arena/ArenaView";

interface ArenaPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArenaPanel({ isOpen, onClose }: ArenaPanelProps) {
  const handleOverlayClick = () => {
    onClose();
  };

  const handleShellClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`builder-panel-overlay builder-panel-overlay--arena${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={handleOverlayClick}
    >
      <div
        className="builder-panel-shell builder-panel-shell--arena"
        onClick={handleShellClick}
      >
        <div className="builder-panel-body builder-panel-body--arena">
          <ArenaView variant="embedded" />
        </div>
      </div>
    </div>
  );
}
