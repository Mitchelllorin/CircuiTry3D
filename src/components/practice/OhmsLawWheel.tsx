const FORMULAS = [
  "E = I · R",
  "I = E / R",
  "R = E / I",
  "P = E · I",
  "P = I² · R",
  "P = E² / R",
  "E = P / I",
  "E = √(P · R)",
  "I = P / E",
  "I = √(P / R)",
  "R = P / I²",
  "R = E² / P",
];

const RADIUS = 120;
const CENTER = 160;

export default function OhmsLawWheel() {
  return (
    <div className="ohms-wheel">
      <h3>Ohm&apos;s Law Wheel · 12 Identities</h3>
      <svg viewBox="0 0 320 320" role="img" aria-label="Ohm's law wheel showing 12 formulas">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="wheel-ring" />
        <circle cx={CENTER} cy={CENTER} r={46} className="wheel-hub" />
        <text x={CENTER} y={CENTER - 4} className="wheel-hub-title" textAnchor="middle">
          W.I.R.E.
        </text>
        <text x={CENTER} y={CENTER + 16} className="wheel-hub-sub" textAnchor="middle">
          12 formulas
        </text>
        {FORMULAS.map((formula, index) => {
          const angle = ((index / FORMULAS.length) * Math.PI * 2) - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * (RADIUS - 12);
          const y = CENTER + Math.sin(angle) * (RADIUS - 12);
          const rotation = (angle * 180) / Math.PI;
          return (
            <g key={formula} transform={`translate(${x}, ${y}) rotate(${rotation})`}>
              <text className="wheel-text" textAnchor="middle" dominantBaseline="middle">
                {formula}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

