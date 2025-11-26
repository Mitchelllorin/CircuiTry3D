const FORMULA_GROUPS = [
  {
    variable: "E",
    label: "Voltage",
    color: "#ff867d",
    formulas: ["E = I × R", "E = P / I", "E = √(P × R)"],
  },
  {
    variable: "I",
    label: "Current",
    color: "#ffcf6e",
    formulas: ["I = E / R", "I = P / E", "I = √(P / R)"],
  },
  {
    variable: "R",
    label: "Resistance",
    color: "#a0ff98",
    formulas: ["R = E / I", "R = P / I²", "R = E² / P"],
  },
  {
    variable: "P",
    label: "Power",
    color: "#12c8ff",
    formulas: ["P = E × I", "P = I² × R", "P = E² / R"],
  },
];

const ALL_FORMULAS = FORMULA_GROUPS.flatMap((group) =>
  group.formulas.map((formula) => ({ formula, color: group.color }))
);

const RADIUS = 120;
const CENTER = 160;

export default function OhmsLawWheel() {
  return (
    <div className="ohms-wheel">
      <h3>Ohm&apos;s Law Wheel</h3>
      <p className="ohms-wheel-intro">
        The W.I.R.E. wheel contains all 12 formulas for solving circuit problems.
        Find what you need to solve, then look for a formula that uses values you already know.
      </p>

      <svg viewBox="0 0 320 320" role="img" aria-label="Ohm's law wheel showing 12 formulas">
        {/* Outer ring */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="wheel-ring" />

        {/* Inner hub */}
        <circle cx={CENTER} cy={CENTER} r={46} className="wheel-hub" />
        <text x={CENTER} y={CENTER - 4} className="wheel-hub-title" textAnchor="middle">
          W.I.R.E.
        </text>
        <text x={CENTER} y={CENTER + 16} className="wheel-hub-sub" textAnchor="middle">
          12 formulas
        </text>

        {/* Formula labels around the wheel */}
        {ALL_FORMULAS.map((item, index) => {
          const angle = ((index / ALL_FORMULAS.length) * Math.PI * 2) - Math.PI / 2;
          const x = CENTER + Math.cos(angle) * (RADIUS - 12);
          const y = CENTER + Math.sin(angle) * (RADIUS - 12);
          const rotation = (angle * 180) / Math.PI;
          return (
            <g key={item.formula} transform={`translate(${x}, ${y}) rotate(${rotation})`}>
              <text
                className="wheel-text"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={item.color}
              >
                {item.formula}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Quick reference legend */}
      <div className="ohms-wheel-legend">
        <h4>Quick Reference</h4>
        <div className="legend-grid">
          {FORMULA_GROUPS.map((group) => (
            <div key={group.variable} className="legend-item">
              <span className="legend-variable" style={{ color: group.color }}>
                {group.variable}
              </span>
              <span className="legend-label">{group.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formula breakdown by variable */}
      <div className="ohms-wheel-breakdown">
        <h4>To Find Each Variable</h4>
        <div className="breakdown-grid">
          {FORMULA_GROUPS.map((group) => (
            <div key={group.variable} className="breakdown-item">
              <span className="breakdown-header" style={{ borderColor: group.color }}>
                <span className="breakdown-var" style={{ color: group.color }}>
                  {group.variable}
                </span>
                <span className="breakdown-label">{group.label}</span>
              </span>
              <ul className="breakdown-formulas">
                {group.formulas.map((formula) => (
                  <li key={formula}>{formula}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
