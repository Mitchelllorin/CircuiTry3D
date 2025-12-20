import { useTutorial } from "../../context/TutorialContext";
import "./TutorialControls.css";

/**
 * Floating button to restart the tutorial.
 * Only shows when the tutorial is not active.
 */
export function TutorialControls() {
  const { state, startTutorial } = useTutorial();

  // Don't show if tutorial is currently active
  if (state.isActive) {
    return null;
  }

  return (
    <button
      type="button"
      className="tutorial-restart-btn"
      onClick={startTutorial}
      aria-label="Start tutorial"
      title="Start guided tutorial"
    >
      <span className="tutorial-restart-icon">?</span>
      <span className="tutorial-restart-label">Tutorial</span>
    </button>
  );
}
