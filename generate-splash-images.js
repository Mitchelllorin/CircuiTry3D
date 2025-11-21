#!/usr/bin/env node

/**
 * Automated splash screen generator for CircuiTry3D
 * This script uses Playwright to open the generate-splash.html file,
 * render the SVG at different resolutions, and save the PNG files
 * directly to the Android resource directories.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Splash screen configurations
const configs = [
  // Portrait orientations
  { orientation: 'port', width: 480, height: 800, density: 'mdpi', dir: 'drawable-port-mdpi' },
  { orientation: 'port', width: 720, height: 1280, density: 'hdpi', dir: 'drawable-port-hdpi' },
  { orientation: 'port', width: 1080, height: 1920, density: 'xhdpi', dir: 'drawable-port-xhdpi' },
  { orientation: 'port', width: 1440, height: 2560, density: 'xxhdpi', dir: 'drawable-port-xxhdpi' },
  { orientation: 'port', width: 1800, height: 3200, density: 'xxxhdpi', dir: 'drawable-port-xxxhdpi' },
  // Landscape orientations
  { orientation: 'land', width: 800, height: 480, density: 'mdpi', dir: 'drawable-land-mdpi' },
  { orientation: 'land', width: 1280, height: 720, density: 'hdpi', dir: 'drawable-land-hdpi' },
  { orientation: 'land', width: 1920, height: 1080, density: 'xhdpi', dir: 'drawable-land-xhdpi' },
  { orientation: 'land', width: 2560, height: 1440, density: 'xxhdpi', dir: 'drawable-land-xxhdpi' },
  { orientation: 'land', width: 3200, height: 1800, density: 'xxxhdpi', dir: 'drawable-land-xxxhdpi' },
  // Default (square)
  { orientation: 'default', width: 2732, height: 2732, density: 'default', dir: 'drawable' },
];

async function generateSplashScreens() {
  console.log('🎨 CircuiTry3D Splash Screen Generator');
  console.log('======================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Load the HTML generator
  const htmlPath = join(__dirname, 'generate-splash.html');
  await page.goto(`file://${htmlPath}`);

  console.log('✓ Loaded splash screen generator\n');

  for (const config of configs) {
    const { orientation, width, height, density, dir } = config;

    console.log(`Generating ${orientation} ${density} (${width}x${height})...`);

    try {
      // Call the createSplashSVG function from the page
      const svgContent = await page.evaluate(({ w, h }) => {
        return window.createSplashSVG(w, h);
      }, { w: width, h: height });

      // Create a new page with exact dimensions
      const splashPage = await context.newPage();
      await splashPage.setViewportSize({ width, height });
      await splashPage.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; }
            svg { display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
        </html>
      `);

      // Wait for rendering
      await splashPage.waitForTimeout(500);

      // Take screenshot
      const screenshot = await splashPage.screenshot({
        type: 'png',
        fullPage: true
      });

      // Save to Android resource directory
      const outputDir = join(__dirname, 'android', 'app', 'src', 'main', 'res', dir);
      const outputPath = join(outputDir, 'splash.png');

      // Ensure directory exists
      await mkdir(outputDir, { recursive: true });

      // Write file
      await writeFile(outputPath, screenshot);

      console.log(`  ✓ Saved to ${dir}/splash.png`);

      await splashPage.close();
    } catch (error) {
      console.error(`  ✗ Error generating ${orientation} ${density}:`, error.message);
    }
  }

  await browser.close();

  console.log('\n======================================');
  console.log('✅ All splash screens generated successfully!');
  console.log('\nThe splash screens have been updated in:');
  console.log('  android/app/src/main/res/drawable-*/splash.png');
  console.log('\nYou can now rebuild your Android app to see the changes.');
}

// Run the generator
generateSplashScreens().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
