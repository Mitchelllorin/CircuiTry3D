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
  const height = typeof size === 'number' ? `${size * 0.54}px` : size;

  return (
    <svg
      viewBox="0 0 240 130"
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

      <g stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Left vertical wire (full height from node 1 to node 4) */}
        <line x1="55" y1="20" x2="55" y2="110" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* Top horizontal wire from node 1 to R1 */}
        <line x1="55" y1="20" x2="110" y2="20" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* R1 - Top horizontal resistor */}
        <g transform="translate(140, 20)" stroke="url(#componentGradient)" strokeWidth="2.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        {/* Wire from R1 to node 2 */}
        <line x1="170" y1="20" x2="210" y2="20" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* Right vertical wire from node 2 to R2 */}
        <line x1="210" y1="20" x2="210" y2="45" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* R2 - Right vertical resistor */}
        <g transform="translate(210, 75) rotate(90)" stroke="url(#componentGradient)" strokeWidth="2.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        {/* Wire from R2 to node 3 */}
        <line x1="210" y1="105" x2="210" y2="110" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* Bottom horizontal wire from node 3 to R3 */}
        <line x1="210" y1="110" x2="170" y2="110" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* R3 - Bottom horizontal resistor */}
        <g transform="translate(140, 110)" stroke="url(#componentGradient)" strokeWidth="2.5" filter="url(#glow)">
          <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
        </g>

        {/* Wire from R3 to node 4 */}
        <line x1="110" y1="110" x2="55" y2="110" stroke={LOGO_COLORS.wireGradientEnd} strokeWidth="1.75" />

        {/* Junction nodes at corners */}
        <circle cx="55" cy="20" r="3" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.2" />
        <circle cx="210" cy="20" r="3" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.2" />
        <circle cx="210" cy="110" r="3" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.2" />
        <circle cx="55" cy="110" r="3" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1.2" />

        {/* Junction nodes at component connections */}
        <circle cx="110" cy="20" r="2.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1" />
        <circle cx="170" cy="20" r="2.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1" />
        <circle cx="210" cy="45" r="2.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1" />
        <circle cx="210" cy="105" r="2.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1" />
        <circle cx="170" cy="110" r="2.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1" />
        <circle cx="110" cy="110" r="2.5" fill={LOGO_COLORS.nodeFill} stroke={LOGO_COLORS.nodeStroke} strokeWidth="1" />

        {/* Node number labels */}
        <text x="42" y="14" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">1</text>
        <text x="218" y="14" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">2</text>
        <text x="218" y="122" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">3</text>
        <text x="42" y="122" fontSize="8" fill={LOGO_COLORS.labelSecondary} fontWeight="bold">4</text>
      </g>

      {/* Battery schematic symbol and 9V label - OUTSIDE circuit, centered vertically */}
      <g transform="translate(25, 65)">
        {/* Battery symbol (horizontal orientation) */}
        {/* Positive plate (longer line, top) */}
        <line x1="-12" y1="-8" x2="12" y2="-8" stroke="url(#componentGradient)" strokeWidth="4" />
        {/* Negative plate (shorter line, bottom) */}
        <line x1="-7" y1="8" x2="7" y2="8" stroke="url(#componentGradient)" strokeWidth="2.5" />
        {/* Polarity markers */}
        <text x="0" y="-16" fontSize="12" fill={LOGO_COLORS.nodeFill} fontWeight="bold" textAnchor="middle">+</text>
        <text x="0" y="24" fontSize="12" fill={LOGO_COLORS.labelSecondary} fontWeight="bold" textAnchor="middle">−</text>
      </g>
      {/* 9V label centered vertically on circuit side */}
      <text x="25" y="69" fontSize="13" fill={LOGO_COLORS.labelPrimary} fontWeight="bold" textAnchor="middle">9V</text>

      {/* Component labels */}
      <g fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fill={LOGO_COLORS.labelPrimary} textAnchor="middle" fontWeight="600">
        <text x="140" y="10">R₁ = 3 kΩ</text>
        <text x="232" y="75">R₂</text>
        <text x="140" y="125">R₃ = 5 kΩ</text>
      </g>

      {/* Animated photons (two bright particles with comet tails) */}
      <g aria-hidden="true" filter="url(#photonGlow)">
        {/* Photon A */}
        <g>
          <circle r="4.5" fill="url(#photonFill)" opacity="1">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="3.6" fill="url(#photonFill)" opacity="0.55">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.14s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.9" fill="url(#photonFill)" opacity="0.32">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.28s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.3" fill="url(#photonFill)" opacity="0.2">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.42s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.9" fill="url(#photonFill)" opacity="0.12">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.56s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.5" fill="url(#photonFill)" opacity="0.08">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.70s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.2" fill="url(#photonFill)" opacity="0.06">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-0.84s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
        </g>

        {/* Photon B (phase offset) */}
        <g>
          <circle r="4.5" fill="url(#photonFill)" opacity="1">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.7s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="3.6" fill="url(#photonFill)" opacity="0.55">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.84s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.9" fill="url(#photonFill)" opacity="0.32">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-1.98s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="2.3" fill="url(#photonFill)" opacity="0.2">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.12s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.9" fill="url(#photonFill)" opacity="0.12">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.26s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.5" fill="url(#photonFill)" opacity="0.08">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto" begin="-2.40s">
              <mpath href="#photonPath" xlinkHref="#photonPath" />
            </animateMotion>
          </circle>
          <circle r="1.2" fill="url(#photonFill)" opacity="0.06">
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
