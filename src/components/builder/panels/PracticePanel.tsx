import type { PracticeProblem } from "../../../model/practice";
import type { PracticeWorksheetStatus } from "../types";
import Practice from "../../../pages/Practice";

interface PracticePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activePracticeProblemId: string | null;
  onProblemChange: (problem: PracticeProblem) => void;
  onWorksheetStatusChange: (update: {
    problem: PracticeProblem;
    complete: boolean;
  }) => void;
}

export function PracticePanel({
  isOpen,
  onClose,
  activePracticeProblemId,
  onProblemChange,
  onWorksheetStatusChange,
}: PracticePanelProps) {
  const handleOverlayClick = () => {
    onClose();
  };

  const handleShellClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`builder-panel-overlay${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={handleOverlayClick}
    >
      <div
        className="builder-panel-shell builder-panel-shell--practice"
        onClick={handleShellClick}
      >
        <button
          type="button"
          className="builder-panel-close"
          onClick={onClose}
          aria-label="Close practice worksheets"
        >
          X
        </button>
        <div className="builder-panel-body builder-panel-body--practice">
          <Practice
            selectedProblemId={activePracticeProblemId}
            onProblemChange={onProblemChange}
            onWorksheetStatusChange={onWorksheetStatusChange}
          />
        </div>
      </div>
    </div>
  );
}
