import "../styles/section-workflow-strip.css";

export type SectionWorkflowStep = {
  id: string;
  title: string;
  detail: string;
};

type SectionWorkflowStripProps = {
  sectionLabel: string;
  steps: SectionWorkflowStep[];
  syncCopy?: string;
};

export default function SectionWorkflowStrip({
  sectionLabel,
  steps,
  syncCopy = "Use the navigation bar to switch sections. This flow mirrors the guided Practice and Troubleshoot model.",
}: SectionWorkflowStripProps) {
  return (
    <section className="section-workflow-strip" aria-label={`${sectionLabel} workflow`}>
      <div className="section-workflow-strip__header">
        <div>
          <p className="section-workflow-strip__eyebrow">{sectionLabel} section</p>
          <h2>{sectionLabel} Workflow</h2>
        </div>
        <span className="section-workflow-strip__count">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
      </div>

      <ol className="section-workflow-strip__steps">
        {steps.map((step, index) => (
          <li key={step.id} className="section-workflow-strip__step">
            <span className="section-workflow-strip__step-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="section-workflow-strip__step-copy">
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="section-workflow-strip__sync" role="status" aria-live="polite">
        <strong>Synced to navigation bar</strong>
        <span>{syncCopy}</span>
      </div>
    </section>
  );
}
