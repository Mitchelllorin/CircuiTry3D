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
      </defs>

      <g stroke="url(#wireGradient)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Wire from battery to corner */}
        <line x1="55" y1="115" x2="55" y2="95" stroke="url(#wireGradient)" strokeWidth="3.5" />

        {/* Battery symbol - per style guide: longer plate = positive */}
        <g transform="translate(55, 80)">
          <line x1="-5" y1="-8" x2="5" y2="-8" stroke="url(#componentGradient)" strokeWidth="2.5" />
          <line x1="-8" y1="4" x2="8" y2="4" stroke="url(#componentGradient)" strokeWidth="3.5" />
          <text x="0" y="-18" fontSize="9" fill={LOGO_COLORS.labelPrimary} fontWeight="bold" textAnchor="middle">+</text>
          <text x="-3" y="20" fontSize="9" fill="#888" fontWeight="bold" textAnchor="middle">-</text>
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
    </svg>
  );
};

export default CircuitLogo;
