import type { FC, SVGProps } from "react";

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
  
  return (
    <svg 
      viewBox="0 0 240 180" 
      xmlns="http://www.w3.org/2000/svg" 
      role="img" 
      aria-label="CircuiTry3D Logo"
      width={width}
      height={height}
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"rgba(162, 212, 255, 0.95)", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"rgba(148, 208, 255, 0.85)", stopOpacity:1}} />
        </linearGradient>
        <linearGradient id="componentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:"rgba(148, 208, 255, 1)", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"rgba(162, 212, 255, 0.9)", stopOpacity:1}} />
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
        
        <g transform="translate(40, 90)">
          <line x1="-15" y1="-5" x2="15" y2="-5" stroke="url(#componentGradient)" strokeWidth="2.5" />
          <line x1="-20" y1="6" x2="20" y2="6" stroke="url(#componentGradient)" strokeWidth="4" />
        </g>
        
        <line x1="40" y1="84" x2="40" y2="40" stroke="url(#wireGradient)" strokeWidth="3.5" />
        <line x1="40" y1="40" x2="80" y2="40" stroke="url(#wireGradient)" strokeWidth="3.5" />
        
        <g transform="translate(120, 40)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -20,0 -15,-12 -5,12 5,-12 15,12 20,0 30,0" />
        </g>
        
        <line x1="150" y1="40" x2="200" y2="40" stroke="url(#wireGradient)" strokeWidth="3.5" />
        <line x1="200" y1="40" x2="200" y2="90" stroke="url(#wireGradient)" strokeWidth="3.5" />
        
        <g transform="translate(200, 130) rotate(90)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -20,0 -15,-12 -5,12 5,-12 15,12 20,0 30,0" />
        </g>
        
        <line x1="200" y1="140" x2="200" y2="140" stroke="url(#wireGradient)" strokeWidth="3.5" />
        <line x1="200" y1="140" x2="150" y2="140" stroke="url(#wireGradient)" strokeWidth="3.5" />
        
        <g transform="translate(120, 140)" stroke="url(#componentGradient)" strokeWidth="3.5" filter="url(#glow)">
          <polyline points="-30,0 -20,0 -15,-12 -5,12 5,-12 15,12 20,0 30,0" />
        </g>
        
        <line x1="90" y1="140" x2="40" y2="140" stroke="url(#wireGradient)" strokeWidth="3.5" />
        <line x1="40" y1="140" x2="40" y2="96" stroke="url(#wireGradient)" strokeWidth="3.5" />
        
        <circle cx="40" cy="84" r="3.5" fill="rgba(162, 212, 255, 0.95)" stroke="rgba(12, 32, 64, 0.9)" strokeWidth="1.2" />
        <circle cx="40" cy="40" r="3.5" fill="rgba(162, 212, 255, 0.95)" stroke="rgba(12, 32, 64, 0.9)" strokeWidth="1.2" />
        <circle cx="200" cy="40" r="3.5" fill="rgba(162, 212, 255, 0.95)" stroke="rgba(12, 32, 64, 0.9)" strokeWidth="1.2" />
        <circle cx="200" cy="140" r="3.5" fill="rgba(162, 212, 255, 0.95)" stroke="rgba(12, 32, 64, 0.9)" strokeWidth="1.2" />
        <circle cx="40" cy="140" r="3.5" fill="rgba(162, 212, 255, 0.95)" stroke="rgba(12, 32, 64, 0.9)" strokeWidth="1.2" />
        <circle cx="40" cy="96" r="3.5" fill="rgba(162, 212, 255, 0.95)" stroke="rgba(12, 32, 64, 0.9)" strokeWidth="1.2" />
      </g>
    </svg>
  );
};

export default CircuitLogo;
