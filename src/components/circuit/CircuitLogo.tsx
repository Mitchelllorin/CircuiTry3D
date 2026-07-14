import type { FC, SVGProps } from "react";
import { LOGO_COLORS, RESISTOR_SPECS, LABEL_SPECS } from "../../schematic/visualConstants";

type CircuitLogoProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  className?: string;
};

export const CircuitLogo: FC<CircuitLogoProps> = ({
  size = 240,
  className = "",
  ...props
}) => {
  const width = typeof size === 'number' ? `${size}px` : size;
  const height = typeof size === 'number' ? `${size * 0.75}px` : size;

  // Brand colors from splash page
  const wireColor = "#41ffc0";
  const nodeColor = "#39ffb7";
  const nodeStroke = "#05141c";
  const labelColor = "#39ffb7";
  const labelMuted = "#9db8ff";

  return (
    <svg
      viewBox="0 0 260 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CircuiTry3D Logo - Three Resistor Circuit"
      width={width}
      height={height}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: wireColor, stopOpacity:1}} />
          <stop offset="100%" style={{stopColor: nodeColor, stopOpacity:1}} />
        </linearGradient>
        <linearGradient id="componentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor: nodeColor, stopOpacity:1}} />
          <stop offset="100%" style={{stopColor: wireColor, stopOpacity:1}} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Photon glow + soft comet tail */}
        <filter id="photonGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.0" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values={`
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 16 -3.5
            `}
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="photonFill" cx="35%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="46%" stopColor="#e8fffb" stopOpacity="1" />
          <stop offset="100%" stopColor="#66ffe1" stopOpacity="1" />
        </radialGradient>

        {/* Circuit flow path including resistor zigzags */}
        <path
          id="photonPath"
          d={`M 55 110
             L 55 20
             L 100 20
             L 110 20
             L 118 20
             L 123 10
             L 133 30
             L 143 10
             L 153 30
             L 158 20
             L 170 20
             L 210 20
             L 210 45
             L 210 53
             L 220 58
             L 200 68
             L 220 78
             L 200 88
             L 210 93
             L 210 95
             L 210 110
             L 180 110
             L 175 110
             L 118 110
             L 123 100
             L 133 120
             L 143 100
             L 153 120
             L 158 110
             L 100 110
             L 55 110`}
        />
      </defs>

      <g stroke="url(#wireGradient)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">

        <line x1="55" y1="115" x2="55" y2="95" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Battery symbol and polarity markers are brand-critical; do not remove without explicit instruction. */}
        <g transform="translate(55, 80)" data-battery="true" data-polarity="true">
          <line x1="-18" y1="-12" x2="18" y2="-12" stroke="url(#componentGradient)" strokeWidth="4" />
          <line x1="-12" y1="12" x2="12" y2="12" stroke="url(#componentGradient)" strokeWidth="2.8" />
          <g stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="2.4" strokeLinecap="round">
            <line x1="-36" y1="-12" x2="-20" y2="-12" />
            <line x1="-28" y1="-20" x2="-28" y2="-4" />
          </g>
          <g stroke={LOGO_COLORS.labelPrimary} strokeWidth="2.4" strokeLinecap="round">
            <line x1="-36" y1="12" x2="-20" y2="12" />
          </g>
        </g>

        <line x1="55" y1="65" x2="55" y2="50" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Top horizontal wire to R1 */}
        <line x1="55" y1="50" x2="100" y2="50" stroke="url(#wireGradient)" strokeWidth="3.5" />

        <g transform="translate(130, 50)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        <line x1="160" y1="50" x2="205" y2="50" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Right vertical wire to R2 */}
        <line x1="205" y1="50" x2="205" y2="75" stroke="url(#wireGradient)" strokeWidth="3.5" />

        <g transform="translate(205, 105) rotate(90)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        <line x1="205" y1="135" x2="205" y2="150" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Bottom horizontal wire to R3 */}
        <line x1="205" y1="150" x2="155" y2="150" stroke="url(#wireGradient)" strokeWidth="3.5" />

        <g transform="translate(125, 150)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        <line x1="95" y1="150" x2="55" y2="150" stroke="url(#wireGradient)" strokeWidth="3.5" />

        <line x1="55" y1="150" x2="55" y2="115" stroke="url(#wireGradient)" strokeWidth="3.5" />

        <g stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.2" opacity="0.9">
          <line x1="55" y1="115" x2="55" y2="95" />
          <line x1="55" y1="65" x2="55" y2="50" />
          <line x1="55" y1="50" x2="100" y2="50" />
          <line x1="160" y1="50" x2="205" y2="50" />
          <line x1="205" y1="50" x2="205" y2="75" />
          <line x1="205" y1="135" x2="205" y2="150" />
          <line x1="205" y1="150" x2="155" y2="150" />
          <line x1="95" y1="150" x2="55" y2="150" />
          <line x1="55" y1="150" x2="55" y2="115" />
        </g>

        {/* Junction nodes at corners per style guide (filled circles at T-junctions) */}
        <circle cx="55" cy="50" r="3.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.5" />
        <circle cx="205" cy="50" r="3.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.5" />
        <circle cx="205" cy="150" r="3.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.5" />
        <circle cx="55" cy="150" r="3.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.5" />

        <text x="35" y="35" fontSize="8" fill={labelMuted} fontWeight="bold">1</text>
        <text x="220" y="35" fontSize="8" fill={labelMuted} fontWeight="bold">2</text>
        <text x="220" y="165" fontSize="8" fill={labelMuted} fontWeight="bold">3</text>
        <text x="35" y="165" fontSize="8" fill={labelMuted} fontWeight="bold">4</text>
      </g>

      <g fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fill={labelColor} textAnchor="middle" fontWeight="600">
        <text x="37" y="98">9V</text>
        <text x="130" y="35">R₁ = 3 kΩ</text>
        <text x="225" y="105">R₂ = 10 kΩ</text>
        <text x="125" y="172">R₃ = 5 kΩ</text>
      </g>
    </svg>
  );
};

export default CircuitLogo;
