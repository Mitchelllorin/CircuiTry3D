/**
 * Mobile performance utilities for Three.js rendering
 * Optimizes rendering for Android and mobile devices
 */

import { isCapacitor, isAndroid } from '../hooks/capacitor/useAndroidInit';

// ── User graphics settings (from the Settings page) ─────────────────────────
// Read directly from localStorage so these plain utility functions stay
// dependency-free. The Settings store (AppSettingsContext) is the writer; key
// and shape are a shared contract. Read at scene-setup time, not per frame.
const APP_SETTINGS_KEY = 'circuitry:app-settings';

interface UserGraphics {
  quality: number; // 0-100
  pixelRatioCap: number; // 100-300 (÷100 = DPR cap)
  targetFps: number; // 30-120
  antialias: boolean;
  geometryDetail: number; // 0-100
}

const GRAPHICS_DEFAULTS: UserGraphics = {
  quality: 75,
  pixelRatioCap: 200,
  targetFps: 60,
  antialias: true,
  geometryDetail: 70,
};

const clampNum = (v: unknown, def: number, min: number, max: number): number => {
  if (typeof v !== 'number' || Number.isNaN(v)) return def;
  return Math.min(Math.max(v, min), max);
};

export const getUserGraphics = (): UserGraphics => {
  if (typeof window === 'undefined') return GRAPHICS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return GRAPHICS_DEFAULTS;
    const g = (JSON.parse(raw) as { graphics?: Partial<UserGraphics> }).graphics;
    if (!g || typeof g !== 'object') return GRAPHICS_DEFAULTS;
    return {
      quality: clampNum(g.quality, GRAPHICS_DEFAULTS.quality, 0, 100),
      pixelRatioCap: clampNum(g.pixelRatioCap, GRAPHICS_DEFAULTS.pixelRatioCap, 100, 300),
      targetFps: clampNum(g.targetFps, GRAPHICS_DEFAULTS.targetFps, 30, 120),
      antialias: typeof g.antialias === 'boolean' ? g.antialias : GRAPHICS_DEFAULTS.antialias,
      geometryDetail: clampNum(g.geometryDetail, GRAPHICS_DEFAULTS.geometryDetail, 0, 100),
    };
  } catch {
    return GRAPHICS_DEFAULTS;
  }
};

// Detect if device is mobile (touch-based)
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check Capacitor first (most reliable for native apps)
  if (isCapacitor()) return true;

  // Check touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check screen size
  const isSmallScreen = window.innerWidth <= 768;

  // Check user agent for mobile devices
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return hasTouch && (isSmallScreen || mobileUserAgent);
};

// Get device performance tier
// NOTE: This now uses a more balanced approach - modern Android devices (2020+)
// are capable of good rendering, so we don't blanket-classify all Android as "low"
export const getPerformanceTier = (): 'low' | 'medium' | 'high' => {
  if (typeof window === 'undefined') return 'medium';

  // Check available memory (if available)
  const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // Only classify as low-end if hardware is actually constrained
  // Don't blanket-penalize Android - modern Android devices are capable
  if (
    (deviceMemory && deviceMemory < 2) ||  // Only truly low memory devices (was <4)
    hardwareConcurrency <= 2               // Very few CPU cores
  ) {
    return 'low';
  }

  // High-end devices - relaxed requirements
  if (
    (deviceMemory && deviceMemory >= 6 && hardwareConcurrency >= 6) ||
    (!deviceMemory && hardwareConcurrency >= 8) // Unknown memory but many cores
  ) {
    return 'high';
  }

  // Most modern devices fall into medium tier - this is the new default
  return 'medium';
};

// Three.js renderer options optimized for performance tier
export interface MobileRendererOptions {
  antialias: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
  precision: 'highp' | 'mediump' | 'lowp';
  alpha: boolean;
}

export const getMobileRendererOptions = (): MobileRendererOptions => {
  const tier = getPerformanceTier();
  // User toggle wins over the tier default for antialiasing.
  const antialias = getUserGraphics().antialias;

  if (tier === 'low') {
    return {
      antialias,
      powerPreference: 'low-power',
      precision: 'mediump',
      alpha: true
    };
  }

  if (tier === 'medium') {
    return {
      antialias,
      powerPreference: 'default',
      precision: 'highp',
      alpha: true
    };
  }

  // High-end
  return {
    antialias,
    powerPreference: 'high-performance',
    precision: 'highp',
    alpha: true
  };
};

// Get optimal pixel ratio for device
export const getMobilePixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;

  const tier = getPerformanceTier();
  const devicePixelRatio = window.devicePixelRatio || 1;
  const g = getUserGraphics();

  // Device-tier ceiling, then the user's pixel-ratio cap, then a quality scale.
  const tierCap = tier === 'low' ? 2 : 2.5;
  const userCap = g.pixelRatioCap / 100; // 1.0–3.0
  const qualityScale = 0.55 + (g.quality / 100) * 0.45; // 0.55–1.0

  const ratio = Math.min(devicePixelRatio, tierCap, userCap) * qualityScale;
  return Math.max(0.5, ratio);
};

// Shadow quality settings
export interface ShadowSettings {
  enabled: boolean;
  mapSize: number;
  type: 'basic' | 'soft';
}

export const getMobileShadowSettings = (): ShadowSettings => {
  const tier = getPerformanceTier();

  if (tier === 'low') {
    return {
      enabled: true, // Enable shadows even on low-end for visual depth
      mapSize: 512,
      type: 'basic'
    };
  }

  if (tier === 'medium') {
    return {
      enabled: true,
      mapSize: 1024, // Increased from 512 for better quality
      type: 'soft'   // Upgraded from 'basic'
    };
  }

  return {
    enabled: true,
    mapSize: 1024,
    type: 'soft'
  };
};

// Animation frame rate settings
export const getTargetFrameRate = (): number => {
  // The user's explicit frame-rate target wins (clamped to a sane floor on
  // low-end devices so we never exceed what the device can sustain).
  const tier = getPerformanceTier();
  const target = getUserGraphics().targetFps;
  return tier === 'low' ? Math.min(target, 45) : target;
};

// Get geometry detail level (for LOD)
// More generous segment counts to avoid "blocky" appearance
export const getGeometrySegments = (baseSegments: number): number => {
  const tier = getPerformanceTier();
  const g = getUserGraphics();

  // Combine the device-tier multiplier with the user's geometry-detail and
  // overall-quality sliders.
  const tierMul = tier === 'low' ? 0.6 : tier === 'medium' ? 0.85 : 1;
  const detailMul = 0.4 + (g.geometryDetail / 100) * 0.6; // 0.4–1.0
  const qualityMul = 0.7 + (g.quality / 100) * 0.3; // 0.7–1.0

  return Math.max(8, Math.floor(baseSegments * tierMul * detailMul * qualityMul));
};

// Check if device supports WebGL2
export const supportsWebGL2 = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGL2RenderingContext &&
      canvas.getContext('webgl2')
    );
  } catch {
    return false;
  }
};

// Log performance info (for debugging)
export const logPerformanceInfo = (): void => {
  if (typeof window === 'undefined') return;

  const tier = getPerformanceTier();
  const mobile = isMobile();
  const android = isAndroid();
  const capacitor = isCapacitor();
  const webgl2 = supportsWebGL2();

  console.group('[Performance] Device Info');
  console.log('Performance tier:', tier);
  console.log('Is mobile:', mobile);
  console.log('Is Android:', android);
  console.log('Is Capacitor:', capacitor);
  console.log('Supports WebGL2:', webgl2);
  console.log('Device pixel ratio:', window.devicePixelRatio);
  console.log('Optimal pixel ratio:', getMobilePixelRatio());
  console.log('Hardware concurrency:', navigator.hardwareConcurrency);
  console.log('Device memory:', (navigator as unknown as { deviceMemory?: number }).deviceMemory || 'unknown');
  console.log('Renderer options:', getMobileRendererOptions());
  console.groupEnd();
};
