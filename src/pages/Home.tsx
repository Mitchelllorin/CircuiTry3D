import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/home.css";

type Photon = {
  el: SVGCircleElement;
  t: number;
};

export default function Home() {
  const pathRef = useRef<SVGPathElement | null>(null);
  const photonHolderRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const path = pathRef.current;
    const holder = photonHolderRef.current;

    if (!path || !holder) {
      return;
    }

    const total = Math.max(8, Math.floor(path.getTotalLength() / 80));
    const photons: Photon[] = [];

    for (let i = 0; i < total; i++) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", "2.6");
      circle.setAttribute("class", "home-photon");
      holder.appendChild(circle);
      photons.push({ el: circle, t: i / total });
    }

    let frameId: number;

    const tick = () => {
      const length = path.getTotalLength();

      photons.forEach((photon, index) => {
        photon.t += 0.004 + ((index % 3) + 1) * 0.0005;
        if (photon.t > 1) {
          photon.t -= 1;
        }

        const point = path.getPointAtLength(photon.t * length);
        photon.el.setAttribute("cx", point.x.toString());
        photon.el.setAttribute("cy", point.y.toString());
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      photons.forEach((photon) => {
        holder.removeChild(photon.el);
      });
    };
  }, []);

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-copy">
          <h1 className="home-logo">
            <span className="home-logo-circui">Circui</span>
            <span className="home-logo-try">Try</span>
            <span className="home-logo-3d">3D</span>
          </h1>
          <p className="home-tagline">Professional Circuit Design</p>
          <p className="home-description">
            Build immersive circuit simulations, teach foundational electrical concepts, and explore advanced analysis tools in a
            single interactive workspace.
          </p>
          <div className="home-actions">
            <Link className="home-action home-action-primary" to="/app">
              Launch Builder
            </Link>
            <Link className="home-action" to="/arena">
              Component Arena
            </Link>
            <Link className="home-action" to="/practice">
              Practice Problems
            </Link>
            <Link className="home-action" to="/pricing">
              Pricing &amp; Plans
            </Link>
          </div>
        </div>
        <div className="home-visual" aria-hidden="true">
          <svg className="home-circuit" viewBox="0 0 380 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="home-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              ref={pathRef}
              className="home-wire"
              filter="url(#home-glow)"
              d="M26,45 L70,45 H320 V155 L70,155 V75 L20,75 V50 L26,50 V75 V45 Z"
            />
            <line x1="20" y1="50" x2="20" y2="75" className="home-element" />
            <line x1="26" y1="45" x2="26" y2="75" className="home-element" />
            <rect x="118" y="32" width="48" height="26" className="home-element" rx="6" />
            <rect x="198" y="32" width="48" height="26" className="home-element" rx="6" />
            <rect x="278" y="32" width="48" height="26" className="home-element" rx="6" />
            <g ref={photonHolderRef} />
          </svg>
        </div>
      </div>
    </div>
  );
}
