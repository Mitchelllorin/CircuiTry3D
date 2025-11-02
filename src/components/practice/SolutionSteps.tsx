import type { PracticeStepPresentation } from "../../model/practice";

type SolutionStepsProps = {
  steps: PracticeStepPresentation[];
  visible: boolean;
};

export default function SolutionSteps({ steps, visible }: SolutionStepsProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="practice-steps" aria-live="polite">
      <h3>Solution Steps</h3>
      <ol>
        {steps.map((step, index) => (
          <li key={index}>
            <div className="step-title">{step.title}</div>
            <p className="step-detail">{step.detail}</p>
            {step.formula && <code className="step-formula">{step.formula}</code>}
          </li>
        ))}
      </ol>
    </div>
  );
}

