const TRIANGLES = [
  {
    id: "eir",
    title: "Ohm's Law Triangle",
    caption: "E over I and R",
    labels: [
      { text: "E", x: 160, y: 42 },
      { text: "I", x: 100, y: 180 },
      { text: "R", x: 220, y: 180 },
    ],
    formulae: ["E = I · R", "I = E / R", "R = E / I"],
  },
  {
    id: "piv",
    title: "Power Triangle",
    caption: "P over I and E",
    labels: [
      { text: "P", x: 160, y: 42 },
      { text: "I", x: 100, y: 180 },
      { text: "E", x: 220, y: 180 },
    ],
    formulae: ["P = E · I", "E = P / I", "I = P / E"],
  },
];

export default function TriangleDeck() {
  return (
    <div className="triangle-deck">
      {TRIANGLES.map((triangle) => (
        <div key={triangle.id} className="triangle-card">
          <h3>{triangle.title}</h3>
          <p className="triangle-caption">{triangle.caption}</p>
          <svg viewBox="0 0 320 220" role="img" aria-label={triangle.title}>
            <polygon points="160,30 70,200 250,200" className="triangle-outline" />
            {triangle.labels.map((label) => (
              <text key={label.text} x={label.x} y={label.y} className="triangle-label" textAnchor="middle">
                {label.text}
              </text>
            ))}
            <line x1="160" y1="30" x2="70" y2="200" className="triangle-edge" />
            <line x1="160" y1="30" x2="250" y2="200" className="triangle-edge" />
            <line x1="70" y1="200" x2="250" y2="200" className="triangle-edge" />
          </svg>
          <ul>
            {triangle.formulae.map((formula) => (
              <li key={formula}>{formula}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

