import "../styles/scenarios.css";

export default function HomeCircuit() {
  return (
    <div className="scenario-page">
      <div className="scenario-hero">
        <div className="scenario-hero__copy">
          <p className="scenario-eyebrow">Real-World Scenarios</p>
          <h1>🏠 Home Electrical Circuits</h1>
          <p>
            Explore residential wiring in an interactive 3D room. Build lighting circuits,
            outlet loops, and breaker panels — see current flow through walls, ceilings, and
            fixtures just like a real home electrical system.
          </p>
        </div>
        <div className="scenario-hero__actions">
          <a
            className="scenario-btn scenario-btn--primary"
            href="/home-circuit.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ Open Full Screen
          </a>
        </div>
      </div>

      <div className="scenario-canvas-wrap">
        <iframe
          src="/home-circuit.html"
          title="Home Electrical Circuit Simulator"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      <div className="scenario-info-strip">
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">⚡</div>
          <p className="scenario-info-card__title">120 V AC Mains</p>
          <p className="scenario-info-card__body">
            Residential circuits run at 120 V (North America) or 230 V (Europe). Each branch
            circuit is protected by a dedicated breaker sized to the load.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🔌</div>
          <p className="scenario-info-card__title">Outlets &amp; Branch Circuits</p>
          <p className="scenario-info-card__body">
            Outlets in a room are wired in parallel so each device receives full mains
            voltage. A 15 A breaker limits the total current on any one branch.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">💡</div>
          <p className="scenario-info-card__title">Lighting Circuits</p>
          <p className="scenario-info-card__body">
            Ceiling fixtures are switched via a loop-at-the-switch or loop-at-the-fitting
            wiring method. Multi-way switching (3-way) lets you control one light from two
            locations.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🛡️</div>
          <p className="scenario-info-card__title">GFCI Protection</p>
          <p className="scenario-info-card__body">
            Bathrooms, kitchens, and outdoor circuits require GFCI outlets that trip within
            milliseconds if even 5 mA leaks to ground — preventing lethal shock.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🔥</div>
          <p className="scenario-info-card__title">Overload &amp; FUSE™</p>
          <p className="scenario-info-card__body">
            Overload a branch circuit and watch the FUSE™ engine trigger a breaker trip in
            3D — heat, arc flash, and a plain-language explanation of what happened in the
            wiring.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">📐</div>
          <p className="scenario-info-card__title">Wire Gauges</p>
          <p className="scenario-info-card__body">
            14 AWG handles 15 A, 12 AWG handles 20 A. The Wire Guide in the main builder
            maps every gauge to its ampacity, voltage drop, and common residential use case.
          </p>
        </div>
      </div>
    </div>
  );
}
