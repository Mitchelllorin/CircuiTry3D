import "../styles/scenarios.css";

export default function CarCircuit() {
  return (
    <div className="scenario-page">
      <div className="scenario-hero">
        <div className="scenario-hero__copy">
          <p className="scenario-eyebrow">Real-World Scenarios</p>
          <h1>🚗 Automotive Circuits</h1>
          <p>
            Explore vehicle electrical systems in an interactive 3D chassis view. Wire up
            headlights, horn, starter motor, and more — powered by a 12 V battery and
            protected by a fuse box, just like a real car.
          </p>
        </div>
        <div className="scenario-hero__actions">
          <a
            className="scenario-btn scenario-btn--primary"
            href="/car-circuit.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ Open Full Screen
          </a>
        </div>
      </div>

      <div className="scenario-canvas-wrap">
        <iframe
          src="/car-circuit.html"
          title="Automotive Circuit Simulator"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      <div className="scenario-info-strip">
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🔋</div>
          <p className="scenario-info-card__title">12 V Lead-Acid Battery</p>
          <p className="scenario-info-card__body">
            A car battery supplies ~12.6 V at rest and up to 14.4 V while the alternator
            is charging. Cold-cranking amperes (CCA) determine how well it starts the
            engine in cold weather.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">⚡</div>
          <p className="scenario-info-card__title">Chassis Ground Plane</p>
          <p className="scenario-info-card__body">
            Automotive circuits use the metal body as the return path (negative ground).
            A poor ground strap causes voltage drop, flickering lights, and intermittent
            faults — a critical concept taught by the simulator.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🛡️</div>
          <p className="scenario-info-card__title">Fuse Box Protection</p>
          <p className="scenario-info-card__body">
            Each automotive circuit is fuse-protected. Blow a fuse in the simulator and
            FUSE™ explains the failure — wire insulation melt, heat buildup, and which
            AMP rating to use as a replacement.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">💡</div>
          <p className="scenario-info-card__title">Headlights &amp; Signals</p>
          <p className="scenario-info-card__body">
            Headlights draw 4–8 A per side. Turn signals use a flasher relay to pulse
            current on and off. Wire both and watch how the relay's coil and contacts
            interact in the 3D circuit view.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🔑</div>
          <p className="scenario-info-card__title">Ignition &amp; Starter</p>
          <p className="scenario-info-card__body">
            The ignition switch enables the starter solenoid, which closes a high-current
            relay sending 150–200 A to the starter motor. Simulate a no-start fault and
            trace the fault back to a blown fuse or bad relay.
          </p>
        </div>
        <div className="scenario-info-card">
          <div className="scenario-info-card__icon">🔄</div>
          <p className="scenario-info-card__title">Alternator &amp; Charging</p>
          <p className="scenario-info-card__body">
            The alternator generates AC which a rectifier converts to ~14 V DC to charge
            the battery. A voltage regulator keeps the output stable — overcharging at
            16 V+ damages battery cells and electronics.
          </p>
        </div>
      </div>
    </div>
  );
}
