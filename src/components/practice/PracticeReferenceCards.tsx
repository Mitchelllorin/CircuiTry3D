import OhmsLawWheel from "./OhmsLawWheel";
import TriangleDeck from "./TriangleDeck";

const OHMS_LAW_FORMULAS = [
  { formula: "E = I × R", description: "Voltage equals Current times Resistance" },
  { formula: "I = E / R", description: "Current equals Voltage divided by Resistance" },
  { formula: "R = E / I", description: "Resistance equals Voltage divided by Current" },
];

const KIRCHHOFFS_LAWS = [
  {
    id: "kcl",
    title: "Kirchhoff's Current Law (KCL)",
    subtitle: "Junction Rule",
    principle: "The sum of currents entering a junction equals the sum of currents leaving.",
    formula: "ΣI_in = ΣI_out",
    example: "At any node: I₁ + I₂ = I₃ + I₄",
  },
  {
    id: "kvl",
    title: "Kirchhoff's Voltage Law (KVL)",
    subtitle: "Loop Rule",
    principle: "The sum of all voltage drops around any closed loop equals zero.",
    formula: "ΣV = 0",
    example: "Around a loop: V₁ + V₂ + V₃ = V_source",
  },
];

export function OhmsLawCard() {
  return (
    <div className="reference-card ohms-law-card">
      <h3>Ohm&apos;s Law</h3>
      <p className="reference-subtitle">The Foundation of Circuit Analysis</p>
      <div className="reference-formula-primary">E = I × R</div>
      <ul className="reference-formula-list">
        {OHMS_LAW_FORMULAS.map((item) => (
          <li key={item.formula}>
            <span className="formula-text">{item.formula}</span>
            <span className="formula-desc">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KirchhoffsLawsCard() {
  return (
    <div className="reference-card kirchhoffs-card">
      <h3>Kirchhoff&apos;s Laws</h3>
      <p className="reference-subtitle">Conservation Principles for Circuits</p>
      <div className="kirchhoffs-laws-grid">
        {KIRCHHOFFS_LAWS.map((law) => (
          <div key={law.id} className="kirchhoffs-law-item">
            <h4>{law.title}</h4>
            <span className="law-subtitle">{law.subtitle}</span>
            <p className="law-principle">{law.principle}</p>
            <div className="law-formula">{law.formula}</div>
            <p className="law-example">{law.example}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompactTriangleDeck() {
  return (
    <div className="reference-card compact-triangle-deck">
      <h3>Formula Triangles</h3>
      <TriangleDeck />
    </div>
  );
}

export function CompactOhmsWheel() {
  return (
    <div className="reference-card compact-ohms-wheel">
      <OhmsLawWheel />
    </div>
  );
}

export default function PracticeReferenceCards() {
  return (
    <div className="practice-reference-cards">
      <OhmsLawCard />
      <KirchhoffsLawsCard />
      <CompactTriangleDeck />
      <CompactOhmsWheel />
    </div>
  );
}
