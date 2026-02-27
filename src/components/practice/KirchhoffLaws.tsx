const LAWS = [
  {
    id: "kcl",
    title: "Kirchhoff's Current Law (KCL)",
    subtitle: "Junction Rule",
    statement: "The sum of currents entering a junction equals the sum of currents leaving.",
    formula: "Σ I_in = Σ I_out",
    examples: [
      "At any node: I₁ + I₂ = I₃ + I₄",
      "In parallel circuits: I_T = I₁ + I₂ + I₃",
      "Current is conserved at every junction",
    ],
    tip: "Current flowing into a junction must equal current flowing out - no charge is created or destroyed.",
  },
  {
    id: "kvl",
    title: "Kirchhoff's Voltage Law (KVL)",
    subtitle: "Voltage Rule",
    statement: "The sum of all voltage drops around any closed path equals zero.",
    formula: "Σ V = 0 (around closed path)",
    examples: [
      "E_source = V_R1 + V_R2 + V_R3",
      "Voltage rises equal voltage drops",
      "In series: E_T = V₁ + V₂ + V₃",
    ],
    tip: "Walk around any closed path - voltage gains equal voltage drops, summing to zero.",
  },
];

export default function KirchhoffLaws() {
  return (
    <div className="kirchhoff-laws">
      <h3>Kirchhoff&apos;s Laws</h3>
      <p className="kirchhoff-intro">
        Two fundamental laws for analyzing any electrical circuit.
      </p>
      <div className="kirchhoff-cards">
        {LAWS.map((law) => (
          <div key={law.id} className="kirchhoff-card" data-law={law.id}>
            <div className="kirchhoff-header">
              <span className="kirchhoff-badge">{law.id.toUpperCase()}</span>
              <div>
                <h4>{law.title}</h4>
                <span className="kirchhoff-subtitle">{law.subtitle}</span>
              </div>
            </div>
            <p className="kirchhoff-statement">{law.statement}</p>
            <div className="kirchhoff-formula">{law.formula}</div>
            <ul className="kirchhoff-examples">
              {law.examples.map((example, idx) => (
                <li key={idx}>{example}</li>
              ))}
            </ul>
            <p className="kirchhoff-tip">
              <strong>Tip:</strong> {law.tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
