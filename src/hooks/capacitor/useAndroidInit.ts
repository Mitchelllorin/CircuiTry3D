/**
 * Android-specific initialization for Capacitor
 * Handles back button, app lifecycle, status bar, and splash screen
 */

import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

// Detect if running in Capacitor
export const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' &&
         window.Capacitor !== undefined &&
         window.Capacitor.isNativePlatform();
};

// Detect Android specifically
export const isAndroid = (): boolean => {
  return isCapacitor() && window.Capacitor?.getPlatform() === 'android';
};

/**
 * Initialize Android-specific features
 * Call this once when the app starts
 */
export async function initializeAndroid(options?: {
  onBackButton?: () => boolean; // Return true to prevent default back behavior
  onResume?: () => void;
  onPause?: () => void;
}): Promise<void> {
  if (!isCapacitor()) {
    console.log('[Android] Not running in Capacitor, skipping native initialization');
    return;
  }

  console.log('[Android] Initializing Capacitor features...');

  try {
    // Configure status bar for Android
    if (isAndroid()) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      console.log('[Android] Status bar configured');
    }
  } catch (error) {
    console.warn('[Android] Status bar configuration failed:', error);
  }

  try {
    // Hide splash screen when app is ready
    await SplashScreen.hide({
      fadeOutDuration: 300
    });
    console.log('[Android] Splash screen hidden');
  } catch (error) {
    console.warn('[Android] Splash screen hide failed:', error);
  }

  // Handle hardware back button
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    console.log('[Android] Back button pressed, canGoBack:', canGoBack);

    // Let custom handler decide if we should prevent default
    if (options?.onBackButton?.()) {
      return; // Custom handler handled it
    }

    // Default behavior: navigate back or exit
    if (canGoBack) {
      window.history.back();
    } else {
      // At root of app, minimize instead of exit
      CapacitorApp.minimizeApp();
    }
  });
  console.log('[Android] Back button handler registered');

  // Handle app lifecycle events
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    console.log('[Android] App state changed, isActive:', isActive);

    if (isActive) {
      options?.onResume?.();
    } else {
      options?.onPause?.();
    }
  });
  console.log('[Android] App lifecycle handlers registered');

  // Handle app URL open (for deep links)
  CapacitorApp.addListener('appUrlOpen', (data) => {
    console.log('[Android] App URL opened:', data.url);
    // Handle deep links if needed in the future
  });

  console.log('[Android] Capacitor initialization complete');
}

/**
 * Clean up Capacitor listeners
 * Call this when the app unmounts
 */
export async function cleanupAndroid(): Promise<void> {
  if (!isCapacitor()) return;

  try {
    await CapacitorApp.removeAllListeners();
    console.log('[Android] Capacitor listeners cleaned up');
  } catch (error) {
    console.warn('[Android] Failed to cleanup listeners:', error);
  }
}

/**
 * Exit the app (Android only)
 */
export async function exitApp(): Promise<void> {
  if (isAndroid()) {
    await CapacitorApp.exitApp();
  }
}

/**
 * Minimize the app (Android only)
 */
export async function minimizeApp(): Promise<void> {
  if (isAndroid()) {
    await CapacitorApp.minimizeApp();
  }
}

// Register service worker for PWA
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && !isCapacitor()) {
    // Only register service worker for web, not native app
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('[SW] Service worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New content available, refresh to update');
              }
            });
          }
        });
      } catch (error) {
        console.warn('[SW] Service worker registration failed:', error);
      }
    });
  }
}

// Declare Capacitor types for TypeScript
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}
