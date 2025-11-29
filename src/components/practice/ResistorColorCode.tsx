/**
 * ResistorColorCode - Educational component showing the resistor color band chart
 * Helps students decode resistor values using the standard color code system
 */

const COLOR_BANDS = [
  { color: "Black", hex: "#000000", value: 0, multiplier: "1", tolerance: null },
  { color: "Brown", hex: "#8B4513", value: 1, multiplier: "10", tolerance: "1%" },
  { color: "Red", hex: "#FF0000", value: 2, multiplier: "100", tolerance: "2%" },
  { color: "Orange", hex: "#FFA500", value: 3, multiplier: "1K", tolerance: null },
  { color: "Yellow", hex: "#FFD700", value: 4, multiplier: "10K", tolerance: null },
  { color: "Green", hex: "#228B22", value: 5, multiplier: "100K", tolerance: "0.5%" },
  { color: "Blue", hex: "#0000FF", value: 6, multiplier: "1M", tolerance: "0.25%" },
  { color: "Violet", hex: "#9400D3", value: 7, multiplier: "10M", tolerance: "0.1%" },
  { color: "Gray", hex: "#808080", value: 8, multiplier: "100M", tolerance: "0.05%" },
  { color: "White", hex: "#FFFFFF", value: 9, multiplier: "1G", tolerance: null },
  { color: "Gold", hex: "#FFD700", value: null, multiplier: "0.1", tolerance: "5%" },
  { color: "Silver", hex: "#C0C0C0", value: null, multiplier: "0.01", tolerance: "10%" },
];

const MNEMONIC = "Bad Beer Rots Our Young Guts But Vodka Goes Well";

export default function ResistorColorCode() {
  return (
    <div className="resistor-color-code">
      <h3>Resistor Color Code</h3>
      <p className="resistor-color-intro">
        Resistors use colored bands to indicate their value. Read bands from left to right,
        starting from the band closest to one end.
      </p>

      {/* Visual resistor with example bands */}
      <div className="resistor-example">
        <svg viewBox="0 0 300 80" role="img" aria-label="Example resistor showing color bands">
          {/* Resistor body */}
          <rect x="40" y="25" width="220" height="30" rx="4" fill="#D2B48C" stroke="#8B7355" strokeWidth="2" />

          {/* Lead wires */}
          <line x1="0" y1="40" x2="40" y2="40" stroke="#C0C0C0" strokeWidth="3" />
          <line x1="260" y1="40" x2="300" y2="40" stroke="#C0C0C0" strokeWidth="3" />

          {/* Color bands - Example: 470 Ohms (Yellow, Violet, Brown, Gold) */}
          <rect x="60" y="25" width="20" height="30" fill="#FFD700" /> {/* Yellow = 4 */}
          <rect x="95" y="25" width="20" height="30" fill="#9400D3" /> {/* Violet = 7 */}
          <rect x="130" y="25" width="20" height="30" fill="#8B4513" /> {/* Brown = ×10 */}
          <rect x="200" y="25" width="20" height="30" fill="#FFD700" /> {/* Gold = 5% */}

          {/* Band labels */}
          <text x="70" y="70" fontSize="10" fill="#e8f6ff" textAnchor="middle">1st</text>
          <text x="105" y="70" fontSize="10" fill="#e8f6ff" textAnchor="middle">2nd</text>
          <text x="140" y="70" fontSize="10" fill="#e8f6ff" textAnchor="middle">Mult</text>
          <text x="210" y="70" fontSize="10" fill="#e8f6ff" textAnchor="middle">Tol</text>
        </svg>
        <p className="resistor-example-label">
          Example: <strong>470 Ω ± 5%</strong> (Yellow, Violet, Brown, Gold)
        </p>
      </div>

      {/* Color code table */}
      <div className="color-code-table-wrapper">
        <table className="color-code-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Digit</th>
              <th>Multiplier</th>
              <th>Tolerance</th>
            </tr>
          </thead>
          <tbody>
            {COLOR_BANDS.map((band) => (
              <tr key={band.color}>
                <td>
                  <span
                    className="color-swatch"
                    style={{
                      backgroundColor: band.hex,
                      border: band.color === "Black" ? "1px solid #666" :
                              band.color === "White" ? "1px solid #666" : "none"
                    }}
                  />
                  <span className="color-name">{band.color}</span>
                </td>
                <td>{band.value !== null ? band.value : "—"}</td>
                <td>× {band.multiplier}</td>
                <td>{band.tolerance ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mnemonic helper */}
      <div className="color-code-mnemonic">
        <h4>Memory Aid</h4>
        <p className="mnemonic-text">{MNEMONIC}</p>
        <p className="mnemonic-hint">
          First letter of each word = first letter of each color (Black, Brown, Red, Orange, Yellow, Green, Blue, Violet, Gray, White)
        </p>
      </div>

      {/* Quick tips */}
      <div className="color-code-tips">
        <h4>Quick Tips</h4>
        <ul>
          <li>The tolerance band (gold/silver) is usually slightly separated from the others</li>
          <li>Read from the side where bands are grouped closest together</li>
          <li>4-band resistors: 2 digits + multiplier + tolerance</li>
          <li>5-band precision resistors: 3 digits + multiplier + tolerance</li>
        </ul>
      </div>
    </div>
  );
}
