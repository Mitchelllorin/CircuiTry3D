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
export const getPerformanceTier = (): 'low' | 'medium' | 'high' => {
  if (typeof window === 'undefined') return 'medium';

  // Check available memory (if available)
  const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // Low-end devices
  if (
    (deviceMemory && deviceMemory < 4) ||
    hardwareConcurrency <= 2 ||
    isAndroid() // Android WebView tends to be more constrained
  ) {
    return 'low';
  }

  // High-end devices
  if (deviceMemory && deviceMemory >= 8 && hardwareConcurrency >= 8) {
    return 'high';
  }

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
  const mobile = isMobile();

  if (tier === 'low' || (mobile && isAndroid())) {
    return {
      antialias: false, // Disable AA on low-end for performance
      powerPreference: 'low-power', // Prefer battery life
      precision: 'mediump', // Medium precision is fine for mobile
      alpha: true
    };
  }

  if (tier === 'medium' || mobile) {
    return {
      antialias: true, // Keep AA but limit other things
      powerPreference: 'default',
      precision: 'highp',
      alpha: true
    };
  }

  // High-end desktop
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
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Cap pixel ratio based on performance tier
  if (tier === 'low') {
    return Math.min(devicePixelRatio, 1.5); // Cap at 1.5x for low-end
  }

  if (tier === 'medium') {
    return Math.min(devicePixelRatio, 2); // Cap at 2x for medium
  }

  return Math.min(devicePixelRatio, 2); // Always cap at 2x for sanity
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
      enabled: false, // No shadows on low-end
      mapSize: 512,
      type: 'basic'
    };
  }

  if (tier === 'medium') {
    return {
      enabled: true,
      mapSize: 512, // Lower resolution shadows
      type: 'basic'
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
  const tier = getPerformanceTier();

  if (tier === 'low') {
    return 30; // 30fps on low-end
  }

  return 60; // 60fps on medium/high
};

// Get geometry detail level (for LOD)
export const getGeometrySegments = (baseSegments: number): number => {
  const tier = getPerformanceTier();

  if (tier === 'low') {
    return Math.max(8, Math.floor(baseSegments / 2)); // Half detail, min 8
  }

  if (tier === 'medium') {
    return Math.max(16, Math.floor(baseSegments * 0.75)); // 75% detail
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
