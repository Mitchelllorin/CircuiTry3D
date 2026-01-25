import type { FC, SVGProps } from "react";
import { LOGO_COLORS, RESISTOR_SPECS, LABEL_SPECS } from "../../schematic/visualConstants";

type CircuitLogoProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  className?: string;
};

/**
 * CircuitLogo component renders the CircuiTry3D brand logo
 * following the centralized visual standards for circuit diagrams.
 *
 * Visual style follows the schematic style guidelines:
 * - Zigzag resistors (4-6 peaks per style guide)
 * - Battery with correct polarity (long = +, short = -)
 * - Junction nodes at corners
 * - Orthogonal wire routing (90° angles)
 */
export const CircuitLogo: FC<CircuitLogoProps> = ({
  size = 240,
  className = "",
  ...props
}) => {
  const width = typeof size === 'number' ? `${size}px` : size;
  const height = typeof size === 'number' ? `${size * 0.75}px` : size;

  return (
    <svg
      viewBox="0 0 260 200"
      xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label="CircuiTry3D Logo - Three Resistor Circuit"
      width={width}
      height={height}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: LOGO_COLORS.wireGradientStart, stopOpacity:1}} />
          <stop offset="100%" style={{stopColor: LOGO_COLORS.wireGradientEnd, stopOpacity:1}} />
        </linearGradient>
        <linearGradient id="componentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor: LOGO_COLORS.componentGradientStart, stopOpacity:1}} />
          <stop offset="100%" style={{stopColor: LOGO_COLORS.componentGradientEnd, stopOpacity:1}} />
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
          d={`M 55 150
             L 55 50
             L 90 50
             L 100 50
             L 108 50
             L 113 40
             L 123 60
             L 133 40
             L 143 60
             L 148 50
             L 160 50
             L 205 50
             L 205 75
             L 205 83
             L 215 88
             L 195 98
             L 215 108
             L 195 118
             L 205 123
             L 205 135
             L 205 150
             L 160 150
             L 155 150
             L 103 150
             L 108 140
             L 118 160
             L 128 140
             L 138 160
             L 143 150
             L 95 150
             L 55 150`}
        />
      </defs>

      <g stroke="url(#wireGradient)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Wire from battery to corner */}
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
        <line x1="55" y1="50" x2="90" y2="50" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* R1 - Horizontal resistor using zigzag pattern (4-6 peaks per style guide) */}
        <g transform="translate(130, 50)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        <line x1="160" y1="50" x2="205" y2="50" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Right vertical wire to R2 */}
        <line x1="205" y1="50" x2="205" y2="70" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* R2 - Vertical resistor (rotated 90°) */}
        <g transform="translate(205, 105) rotate(90)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        <line x1="205" y1="135" x2="205" y2="150" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Bottom horizontal wire to R3 */}
        <line x1="205" y1="150" x2="160" y2="150" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* R3 - Horizontal resistor on bottom */}
        <g transform="translate(125, 150)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        <line x1="95" y1="150" x2="55" y2="150" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Return wire to battery */}
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

        {/* Node number labels */}
        <text x="35" y="35" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">1</text>
        <text x="220" y="35" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">2</text>
        <text x="220" y="165" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">3</text>
        <text x="35" y="165" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">4</text>
      </g>

      {/* Component labels using subscript notation per style guide */}
      <g fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fill={LOGO_COLORS.labelPrimary} textAnchor="middle" fontWeight="600">
        <text x="37" y="98">9V</text>
        <text x="130" y="35">R₁ = 3 kΩ</text>
        <text x="225" y="105">R₂ = 10 kΩ</text>
        <text x="125" y="172">R₃ = 5 kΩ</text>
      </g>

      {/* Animated photons (two bright particles with comet tails) */}
      <g aria-hidden="true" filter="url(#photonGlow)">
        {/* Photon A */}
        <g>
          <circle r="5.05" fill="url(#photonFill)" opacity="1">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="4.05" fill="url(#photonFill)" opacity="0.55">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.14s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="3.25" fill="url(#photonFill)" opacity="0.32">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.28s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.6" fill="url(#photonFill)" opacity="0.2">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.42s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.1" fill="url(#photonFill)" opacity="0.12">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.56s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.7" fill="url(#photonFill)" opacity="0.08">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.70s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.3" fill="url(#photonFill)" opacity="0.06">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.84s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
        </g>

        {/* Photon B (phase offset) */}
        <g>
          <circle r="5.05" fill="url(#photonFill)" opacity="1">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.7s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="4.05" fill="url(#photonFill)" opacity="0.55">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.84s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="3.25" fill="url(#photonFill)" opacity="0.32">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.98s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.6" fill="url(#photonFill)" opacity="0.2">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.12s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.1" fill="url(#photonFill)" opacity="0.12">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.26s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.7" fill="url(#photonFill)" opacity="0.08">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.40s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.3" fill="url(#photonFill)" opacity="0.06">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.54s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
        </g>
      </g>
    </svg>
  );
};

export default CircuitLogo;
