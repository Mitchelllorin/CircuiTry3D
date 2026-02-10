import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const splashConfigs = [
  // Portrait orientations
  { orientation: 'port', width: 480, height: 800, density: 'mdpi' },
  { orientation: 'port', width: 720, height: 1280, density: 'hdpi' },
  { orientation: 'port', width: 1080, height: 1920, density: 'xhdpi' },
  { orientation: 'port', width: 1440, height: 2560, density: 'xxhdpi' },
  { orientation: 'port', width: 1800, height: 3200, density: 'xxxhdpi' },
  
  // Landscape orientations
  { orientation: 'land', width: 800, height: 480, density: 'mdpi' },
  { orientation: 'land', width: 1280, height: 720, density: 'hdpi' },
  { orientation: 'land', width: 1920, height: 1080, density: 'xhdpi' },
  { orientation: 'land', width: 2560, height: 1440, density: 'xxhdpi' },
  { orientation: 'land', width: 3200, height: 1800, density: 'xxxhdpi' },
  
  // Default splash
  { orientation: 'default', width: 2732, height: 2732, density: 'default' }
];

function createSplashSVG(width, height) {
  // Calculate scaling and positioning
  const scale = Math.min(width / 2732, height / 2732);
  const circuitWidth = 600 * scale;
  const circuitHeight = 450 * scale;
  const centerX = width / 2;
  const centerY = height / 2;
  const offsetY = -50 * scale;
  
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2dd4bf;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="componentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#2dd4bf;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#5eead4;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="${3 * scale}" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    
    <g transform="translate(${centerX - circuitWidth/2}, ${centerY + offsetY - circuitHeight/2})">
        <g transform="scale(${circuitWidth/240})">
            <g stroke="url(#wireGradient)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                
                <line x1="50" y1="50" x2="80" y2="50" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <g transform="translate(120, 50)" stroke="url(#componentGradient)" stroke-width="3.5" filter="url(#glow)">
                    <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
                </g>
                
                <line x1="150" y1="50" x2="190" y2="50" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <line x1="190" y1="50" x2="190" y2="80" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <g transform="translate(190, 120) rotate(90)" stroke="url(#componentGradient)" stroke-width="3.5" filter="url(#glow)">
                    <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
                </g>
                
                <line x1="190" y1="160" x2="190" y2="130" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <line x1="190" y1="160" x2="150" y2="160" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <g transform="translate(120, 160)" stroke="url(#componentGradient)" stroke-width="3.5" filter="url(#glow)">
                    <polyline points="-30,0 -22,0 -17,-10 -7,10 3,-10 13,10 18,0 30,0" />
                </g>
                
                <line x1="90" y1="160" x2="50" y2="160" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <line x1="50" y1="160" x2="50" y2="126" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <g transform="translate(50, 105)">
                    <line x1="-15" y1="-5" x2="15" y2="-5" stroke="url(#componentGradient)" stroke-width="2.5" />
                    <line x1="-20" y1="6" x2="20" y2="6" stroke="url(#componentGradient)" stroke-width="4" />
                    <text x="-35" y="-2" font-size="14" fill="#2dd4bf" font-weight="bold">+</text>
                    <text x="25" y="10" font-size="14" fill="#2dd4bf" font-weight="bold">−</text>
                </g>
                
                <line x1="50" y1="84" x2="50" y2="50" stroke="url(#wireGradient)" stroke-width="3.5" />
                
                <circle cx="50" cy="50" r="3.5" fill="#2dd4bf" stroke="#0d9488" stroke-width="1.2" />
                <circle cx="190" cy="50" r="3.5" fill="#2dd4bf" stroke="#0d9488" stroke-width="1.2" />
                <circle cx="190" cy="160" r="3.5" fill="#2dd4bf" stroke="#0d9488" stroke-width="1.2" />
                <circle cx="50" cy="160" r="3.5" fill="#2dd4bf" stroke="#0d9488" stroke-width="1.2" />
            </g>
            
            <g font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#2dd4bf" text-anchor="middle">
                <text x="120" y="35">R₁ = 3 kΩ</text>
                <text x="210" y="120">R₂ = 10 kΩ</text>
                <text x="120" y="180">R₃ = 5 kΩ</text>
                <text x="25" y="110" font-size="9">9V</text>
            </g>
            
            <g font-family="system-ui, -apple-system, sans-serif" font-size="8" fill="#5eead4" text-anchor="middle" font-weight="600">
                <text x="50" y="40">1</text>
                <text x="190" y="40">2</text>
                <text x="190" y="175">3</text>
                <text x="50" y="175">4</text>
            </g>
        </g>
    </g>
    
    <text x="${centerX}" y="${centerY - circuitHeight/2 - 80 * scale}" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="${48 * scale}" 
          font-weight="700" 
          fill="#2dd4bf" 
          text-anchor="middle">CircuiTry3D</text>
    
    <text x="${centerX}" y="${centerY + circuitHeight/2 + 60 * scale}" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="${16 * scale}" 
          font-weight="400" 
          fill="#94a3b8" 
          text-anchor="middle" 
          letter-spacing="2">PROFESSIONAL CIRCUIT DESIGN</text>
</svg>`;
}

async function generateSplashScreens() {
  console.log('Starting splash screen generation...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  for (const config of splashConfigs) {
    const { orientation, width, height, density } = config;
    console.log(`Generating ${orientation} ${density} (${width}x${height})...`);
    
    const svg = createSplashSVG(width, height);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; }
          svg { display: block; }
        </style>
      </head>
      <body>${svg}</body>
      </html>
    `;
    
    await page.setViewportSize({ width, height });
    await page.setContent(html);
    
    const outputDir = orientation === 'default' 
      ? join(__dirname, 'android', 'app', 'src', 'main', 'res', 'drawable')
      : join(__dirname, 'android', 'app', 'src', 'main', 'res', `drawable-${orientation}-${density}`);
    
    const screenshot = await page.screenshot({ type: 'png' });
    
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    
    const outputPath = join(outputDir, 'splash.png');
    writeFileSync(outputPath, screenshot);
    console.log(`  ✓ Created ${outputPath}`);
  }
  
  await browser.close();
  console.log('\n✅ All splash screens generated successfully!');
}

generateSplashScreens().catch(console.error);
