/**
 * Mobile performance utilities for Three.js rendering
 * Optimizes rendering for Android and mobile devices
 */

import { isCapacitor, isAndroid } from '../hooks/capacitor/useAndroidInit';

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
  const android = isAndroid();

  if (tier === 'low') {
    return {
      antialias: true, // Keep antialiasing for visual quality - it's 2026!
      powerPreference: 'low-power',
      precision: 'mediump',
      alpha: true
    };
  }

  if (tier === 'medium') {
    return {
      antialias: true,
      powerPreference: android ? 'low-power' : 'default',
      precision: 'highp',
      alpha: true
    };
  }

  // High-end
  return {
    antialias: true,
    powerPreference: 'high-performance',
    precision: 'highp',
    alpha: true
  };
};

// Get optimal pixel ratio for device
export const getMobilePixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;

  const tier = getPerformanceTier();
  const android = isAndroid();
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Android-specific caps to avoid fragment-shader pressure and thermal throttling.
  if (android) {
    if (tier === 'low') {
      return Math.min(devicePixelRatio, 1.35);
    }
    if (tier === 'medium') {
      return Math.min(devicePixelRatio, 1.7);
    }
    return Math.min(devicePixelRatio, 2.0);
  }

  // More generous pixel ratio allowances for better visual clarity
  if (tier === 'low') {
    return Math.min(devicePixelRatio, 2); // Allow up to 2x even on low-end (was 1.5)
  }

  // Medium and high get full pixel ratio up to 2.5x
  return Math.min(devicePixelRatio, 2.5);
};

// Shadow quality settings
export interface ShadowSettings {
  enabled: boolean;
  mapSize: number;
  type: 'basic' | 'soft';
}

export const getMobileShadowSettings = (): ShadowSettings => {
  const tier = getPerformanceTier();
  const android = isAndroid();

  if (tier === 'low') {
    return {
      enabled: true, // Enable shadows even on low-end for visual depth
      mapSize: android ? 384 : 512,
      type: 'basic'
    };
  }

  if (tier === 'medium') {
    return {
      enabled: true,
      mapSize: android ? 768 : 1024, // Slightly reduced on Android to lower GPU load
      type: android ? 'basic' : 'soft'
    };
  }

  return {
    enabled: true,
    mapSize: android ? 768 : 1024,
    type: android ? 'basic' : 'soft'
  };
};

// Animation frame rate settings
export const getTargetFrameRate = (): number => {
  const tier = getPerformanceTier();
  const android = isAndroid();

  if (android) {
    if (tier === 'low') return 36;
    if (tier === 'medium') return 45;
    return 55;
  }

  // All tiers target 60fps - even low-end devices can handle it with other optimizations
  // Only drop to 30fps if absolutely necessary (handled elsewhere based on actual performance)
  if (tier === 'low') {
    return 45; // Compromise between smoothness and battery
  }

  return 60;
};

// Get geometry detail level (for LOD)
// More generous segment counts to avoid "blocky" appearance
export const getGeometrySegments = (baseSegments: number): number => {
  const tier = getPerformanceTier();

  if (tier === 'low') {
    return Math.max(16, Math.floor(baseSegments * 0.6)); // 60% detail, min 16 (was 50%, min 8)
  }

  if (tier === 'medium') {
    return Math.max(20, Math.floor(baseSegments * 0.85)); // 85% detail (was 75%)
  }

  return baseSegments;
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
