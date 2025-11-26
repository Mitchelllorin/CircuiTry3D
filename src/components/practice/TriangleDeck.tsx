const TRIANGLES = [
  {
    id: "eir",
    title: "Ohm's Law Triangle",
    caption: "E over I and R",
    description: "Cover the variable you want to find. The remaining two show the formula.",
    labels: [
      { text: "E", x: 160, y: 42, color: "#ff867d" },
      { text: "I", x: 100, y: 180, color: "#ffcf6e" },
      { text: "R", x: 220, y: 180, color: "#a0ff98" },
    ],
    formulae: [
      { solve: "E", formula: "E = I × R", desc: "Voltage = Current × Resistance" },
      { solve: "I", formula: "I = E / R", desc: "Current = Voltage ÷ Resistance" },
      { solve: "R", formula: "R = E / I", desc: "Resistance = Voltage ÷ Current" },
    ],
    variables: {
      E: "Voltage (Volts)",
      I: "Current (Amps)",
      R: "Resistance (Ohms)",
    },
  },
  {
    id: "piv",
    title: "Power Triangle",
    caption: "P over I and E",
    description: "Power is always on top. Cover what you need to find.",
    labels: [
      { text: "P", x: 160, y: 42, color: "#12c8ff" },
      { text: "I", x: 100, y: 180, color: "#ffcf6e" },
      { text: "E", x: 220, y: 180, color: "#ff867d" },
    ],
    formulae: [
      { solve: "P", formula: "P = E × I", desc: "Power = Voltage × Current" },
      { solve: "E", formula: "E = P / I", desc: "Voltage = Power ÷ Current" },
      { solve: "I", formula: "I = P / E", desc: "Current = Power ÷ Voltage" },
    ],
    variables: {
      P: "Power (Watts)",
      I: "Current (Amps)",
      E: "Voltage (Volts)",
    },
  },
  {
    id: "pir",
    title: "Power-Current Triangle",
    caption: "P over I² and R",
    description: "For power calculations using current and resistance.",
    labels: [
      { text: "P", x: 160, y: 42, color: "#12c8ff" },
      { text: "I²", x: 96, y: 180, color: "#ffcf6e" },
      { text: "R", x: 220, y: 180, color: "#a0ff98" },
    ],
    formulae: [
      { solve: "P", formula: "P = I² × R", desc: "Power = Current² × Resistance" },
      { solve: "I", formula: "I = √(P/R)", desc: "Current = Square root of Power/Resistance" },
      { solve: "R", formula: "R = P / I²", desc: "Resistance = Power ÷ Current²" },
    ],
    variables: {
      P: "Power (Watts)",
      I: "Current (Amps)",
      R: "Resistance (Ohms)",
    },
  },
];

export default function TriangleDeck() {
  return (
    <div className="triangle-deck">
      <h3 className="triangle-deck-title">Formula Triangles</h3>
      <p className="triangle-deck-intro">
        Cover the unknown variable to reveal the formula. The remaining symbols show how to calculate it.
      </p>
      {TRIANGLES.map((triangle) => (
        <div key={triangle.id} className="triangle-card">
          <div className="triangle-card-header">
            <h4>{triangle.title}</h4>
            <span className="triangle-caption">{triangle.caption}</span>
          </div>
          <p className="triangle-description">{triangle.description}</p>
          <svg viewBox="0 0 320 220" role="img" aria-label={triangle.title}>
            {/* Main triangle outline */}
            <polygon points="160,30 70,200 250,200" className="triangle-outline" />

            {/* Horizontal divider line */}
            <line x1="95" y1="115" x2="225" y2="115" className="triangle-divider" />

            {/* Labels with colors */}
            {triangle.labels.map((label) => (
              <text
                key={label.text}
                x={label.x}
                y={label.y}
                className="triangle-label"
                textAnchor="middle"
                fill={label.color}
              >
                {label.text}
              </text>
            ))}

            {/* Edge lines */}
            <line x1="160" y1="30" x2="70" y2="200" className="triangle-edge" />
            <line x1="160" y1="30" x2="250" y2="200" className="triangle-edge" />
            <line x1="70" y1="200" x2="250" y2="200" className="triangle-edge" />
          </svg>
          <ul className="triangle-formulae">
            {triangle.formulae.map((item) => (
              <li key={item.formula}>
                <span className="formula-solve">Find {item.solve}:</span>
                <span className="formula-expr">{item.formula}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
