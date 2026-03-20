const WIRE_MODES = [
  {
    id: "free",
    label: "Free",
    description: "Straight lines in any direction from the junction.",
  },
  {
    id: "square",
    label: "Square",
    description: "Routes exit the junction at 90° for a clean grid layout.",
  },
  {
    id: "routing",
    label: "Routing",
    description: "Smart A* pathfinding that avoids obstacles automatically.",
  },
  {
    id: "schematic",
    label: "Schematic",
    description: "Manhattan-style right-angle paths for textbook diagrams.",
  },
];

const HOW_TO_STEPS = [
  {
    number: "1",
    text: "Enable Wire Mode, then hover over any wire — a pulsing \u2b24 + indicator appears.",
  },
  {
    number: "2",
    text: "Click anywhere on the wire to drop a junction (bright yellow dot). A new wire branch starts immediately from that point.",
  },
  {
    number: "3",
    text: "Draw the new branch to any terminal, pin, or another junction to complete the path.",
  },
  {
    number: "4",
    text: "Repeat to add as many branches as your circuit needs. Press J as a quick shortcut.",
  },
];

export default function JunctionGuide() {
  return (
    <div className="junction-guide">
      <h3>Junction Nodes ─●─</h3>
      <p className="junction-guide-intro">
        Junctions are the most versatile building block in circuit construction.
        Drop one anywhere on a wire run to instantly branch a new path — in any
        direction, at any point. They are essential for parallel circuits,
        combination networks, and any layout that isn&apos;t a simple series circuit.
      </p>

      <div className="junction-guide-how-to">
        <h4>How to use a junction</h4>
        <ol className="junction-guide-steps">
          {HOW_TO_STEPS.map((step) => (
            <li key={step.number} className="junction-guide-step">
              <span className="junction-step-number">{step.number}</span>
              <span className="junction-step-text">{step.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="junction-guide-modes">
        <h4>Wiring modes affect routes from junctions</h4>
        <p className="junction-guide-modes-intro">
          The active wiring mode controls how each new wire is routed once it
          leaves the junction — the junction itself is always placed exactly
          where you click.
        </p>
        <div className="junction-mode-grid">
          {WIRE_MODES.map((m) => (
            <div key={m.id} className="junction-mode-card" data-mode={m.id}>
              <span className="junction-mode-label">{m.label}</span>
              <p className="junction-mode-desc">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="junction-guide-why">
        <h4>Why junctions matter</h4>
        <ul className="junction-why-list">
          <li>
            <strong>Parallel circuits</strong> — two junctions (one where
            current splits, one where it recombines) define every parallel
            branch. Kirchhoff&apos;s Current Law (KCL) applies at each junction:{" "}
            <span aria-label="sum of currents in equals sum of currents out">
              Σ I<sub>in</sub> = Σ I<sub>out</sub>
            </span>.
          </li>
          <li>
            <strong>Combination circuits</strong> — junctions let you nest
            parallel groups inside series runs to build any topology.
          </li>
          <li>
            <strong>Flexible layout</strong> — because a junction can be
            dropped anywhere mid-wire, you never need to reroute an existing
            run just to add a new branch.
          </li>
        </ul>
      </div>
    </div>
  );
}
