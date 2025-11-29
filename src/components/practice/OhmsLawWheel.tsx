/**
 * Enhanced Ohm's Law Wheel with W.I.R.E. inner circle and color-coded formula outer ring
 * The wheel displays all 12 electrical formulas organized by what variable they solve for
 */

const WIRE_SECTIONS = [
  {
    letter: "W",
    variable: "P",
    label: "Power",
    unit: "Watts",
    color: "#12c8ff",
    formulas: ["P = E × I", "P = I² × R", "P = E² / R"],
  },
  {
    letter: "I",
    variable: "I",
    label: "Current",
    unit: "Amps",
    color: "#ffcf6e",
    formulas: ["I = E / R", "I = P / E", "I = √(P / R)"],
  },
  {
    letter: "R",
    variable: "R",
    label: "Resistance",
    unit: "Ohms",
    color: "#a0ff98",
    formulas: ["R = E / I", "R = P / I²", "R = E² / P"],
  },
  {
    letter: "E",
    variable: "E",
    label: "Voltage",
    unit: "Volts",
    color: "#ff867d",
    formulas: ["E = I × R", "E = P / I", "E = √(P × R)"],
  },
];

const CENTER = 180;
const INNER_RADIUS = 50;
const MIDDLE_RADIUS = 90;
const OUTER_RADIUS = 150;
const FORMULA_RADIUS = 168;

export default function OhmsLawWheel() {
  return (
    <div className="ohms-wheel">
      <h3>Ohm&apos;s Law Wheel</h3>
      <p className="ohms-wheel-intro">
        The W.I.R.E. wheel contains all 12 formulas for solving circuit problems.
        Find the variable you need to solve (inner ring), then use a formula from its section that uses values you already know.
      </p>

      <svg viewBox="0 0 360 360" role="img" aria-label="Ohm's law wheel showing W.I.R.E. variables and 12 formulas">
        <defs>
          {/* Gradient backgrounds for each quadrant */}
          {WIRE_SECTIONS.map((section, index) => (
            <linearGradient
              key={`gradient-${section.letter}`}
              id={`wheel-gradient-${section.letter}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={section.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={section.color} stopOpacity="0.08" />
            </linearGradient>
          ))}
        </defs>

        {/* Outer ring background */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_RADIUS}
          fill="rgba(10, 24, 48, 0.8)"
          stroke="rgba(120, 200, 255, 0.3)"
          strokeWidth="2"
        />

        {/* Quadrant dividers and colored sections */}
        {WIRE_SECTIONS.map((section, index) => {
          const startAngle = (index * 90 - 135) * (Math.PI / 180);
          const endAngle = ((index + 1) * 90 - 135) * (Math.PI / 180);

          const x1Inner = CENTER + Math.cos(startAngle) * INNER_RADIUS;
          const y1Inner = CENTER + Math.sin(startAngle) * INNER_RADIUS;
          const x1Outer = CENTER + Math.cos(startAngle) * OUTER_RADIUS;
          const y1Outer = CENTER + Math.sin(startAngle) * OUTER_RADIUS;
          const x2Outer = CENTER + Math.cos(endAngle) * OUTER_RADIUS;
          const y2Outer = CENTER + Math.sin(endAngle) * OUTER_RADIUS;
          const x2Inner = CENTER + Math.cos(endAngle) * INNER_RADIUS;
          const y2Inner = CENTER + Math.sin(endAngle) * INNER_RADIUS;

          // Arc path for the quadrant
          const arcPath = `
            M ${x1Inner} ${y1Inner}
            L ${x1Outer} ${y1Outer}
            A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${x2Outer} ${y2Outer}
            L ${x2Inner} ${y2Inner}
            A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${x1Inner} ${y1Inner}
          `;

          return (
            <g key={section.letter}>
              {/* Quadrant fill */}
              <path
                d={arcPath}
                fill={`url(#wheel-gradient-${section.letter})`}
                stroke={section.color}
                strokeWidth="1"
                strokeOpacity="0.4"
              />
              {/* Divider line */}
              <line
                x1={x1Inner}
                y1={y1Inner}
                x2={x1Outer}
                y2={y1Outer}
                stroke="rgba(120, 200, 255, 0.25)"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Inner hub circle with W.I.R.E. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_RADIUS}
          fill="rgba(8, 18, 36, 0.95)"
          stroke="rgba(180, 220, 255, 0.5)"
          strokeWidth="2"
        />

        {/* W.I.R.E. letters in inner circle - positioned in quadrants */}
        {WIRE_SECTIONS.map((section, index) => {
          const angle = (index * 90 - 90) * (Math.PI / 180);
          const letterRadius = INNER_RADIUS * 0.55;
          const x = CENTER + Math.cos(angle) * letterRadius;
          const y = CENTER + Math.sin(angle) * letterRadius;

          return (
            <text
              key={`inner-${section.letter}`}
              x={x}
              y={y}
              fill={section.color}
              fontSize="18"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="'Fira Code', Monaco, monospace"
            >
              {section.letter}
            </text>
          );
        })}

        {/* Middle ring - Variable labels */}
        {WIRE_SECTIONS.map((section, index) => {
          const angle = (index * 90 - 90) * (Math.PI / 180);
          const x = CENTER + Math.cos(angle) * MIDDLE_RADIUS;
          const y = CENTER + Math.sin(angle) * MIDDLE_RADIUS;

          return (
            <g key={`middle-${section.letter}`}>
              <text
                x={x}
                y={y - 6}
                fill={section.color}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {section.label}
              </text>
              <text
                x={x}
                y={y + 8}
                fill="rgba(200, 228, 255, 0.7)"
                fontSize="9"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ({section.unit})
              </text>
            </g>
          );
        })}

        {/* Outer ring - Formulas (3 per quadrant) */}
        {WIRE_SECTIONS.map((section, sectionIndex) => {
          const baseAngle = sectionIndex * 90 - 135;

          return section.formulas.map((formula, formulaIndex) => {
            const angle = (baseAngle + 15 + formulaIndex * 25) * (Math.PI / 180);
            const x = CENTER + Math.cos(angle) * FORMULA_RADIUS;
            const y = CENTER + Math.sin(angle) * FORMULA_RADIUS;
            const rotation = angle * (180 / Math.PI) + 90;

            // Adjust rotation for readability
            const adjustedRotation = rotation > 90 && rotation < 270
              ? rotation + 180
              : rotation;

            return (
              <text
                key={`formula-${section.letter}-${formulaIndex}`}
                x={x}
                y={y}
                fill={section.color}
                fontSize="9"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="'Fira Code', Monaco, monospace"
                transform={`rotate(${adjustedRotation}, ${x}, ${y})`}
              >
                {formula}
              </text>
            );
          });
        })}

        {/* Center dot */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="4"
          fill="rgba(180, 220, 255, 0.8)"
        />
      </svg>

      {/* Quick reference legend */}
      <div className="ohms-wheel-legend">
        <h4>W.I.R.E. Quick Reference</h4>
        <div className="legend-grid">
          {WIRE_SECTIONS.map((section) => (
            <div key={section.letter} className="legend-item">
              <span className="legend-variable" style={{ color: section.color }}>
                {section.letter}
              </span>
              <span className="legend-label">
                {section.label} ({section.unit})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Formula breakdown by variable */}
      <div className="ohms-wheel-breakdown">
        <h4>To Find Each Variable</h4>
        <div className="breakdown-grid">
          {WIRE_SECTIONS.map((section) => (
            <div key={section.letter} className="breakdown-item">
              <span className="breakdown-header" style={{ borderColor: section.color }}>
                <span className="breakdown-var" style={{ color: section.color }}>
                  {section.letter}
                </span>
                <span className="breakdown-label">{section.label}</span>
              </span>
              <ul className="breakdown-formulas">
                {section.formulas.map((formula) => (
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
