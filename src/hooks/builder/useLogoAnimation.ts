import { useEffect, useRef, useState } from "react";
import type {
  BuilderLogoSettings,
  LogoNumericSettingKey,
} from "../../components/builder/types";
import {
  LOGO_SETTINGS_STORAGE_KEY,
  DEFAULT_LOGO_SETTINGS,
} from "../../components/builder/constants";

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

function subscribeToMediaQuery(
  query: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  // eslint-disable-next-line deprecation/deprecation
  query.addListener(listener);
  // eslint-disable-next-line deprecation/deprecation
  return () => query.removeListener(listener);
}

export function useLogoAnimation() {
  const floatingLogoRef = useRef<HTMLDivElement | null>(null);
  const floatingLogoAnimationRef = useRef<number | null>(null);

  const [logoSettings, setLogoSettings] = useState<BuilderLogoSettings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LOGO_SETTINGS;
    }

    try {
      const stored = window.localStorage.getItem(LOGO_SETTINGS_STORAGE_KEY);
      if (!stored) {
        return DEFAULT_LOGO_SETTINGS;
      }

      const parsed = JSON.parse(stored) as Partial<BuilderLogoSettings>;
      return {
        speed: clamp(
          typeof parsed.speed === "number"
            ? parsed.speed
            : DEFAULT_LOGO_SETTINGS.speed,
          6,
          60,
        ),
        travelX: clamp(
          typeof parsed.travelX === "number"
            ? parsed.travelX
            : DEFAULT_LOGO_SETTINGS.travelX,
          10,
          100,
        ),
        travelY: clamp(
          typeof parsed.travelY === "number"
            ? parsed.travelY
            : DEFAULT_LOGO_SETTINGS.travelY,
          10,
          100,
        ),
        bounce: clamp(
          typeof parsed.bounce === "number"
            ? parsed.bounce
            : DEFAULT_LOGO_SETTINGS.bounce,
          0,
          120,
        ),
        opacity: clamp(
          typeof parsed.opacity === "number"
            ? parsed.opacity
            : DEFAULT_LOGO_SETTINGS.opacity,
          0,
          100,
        ),
        isVisible:
          typeof parsed.isVisible === "boolean"
            ? parsed.isVisible
            : DEFAULT_LOGO_SETTINGS.isVisible,
      };
    } catch {
      return DEFAULT_LOGO_SETTINGS;
    }
  });

  const [isLogoSettingsOpen, setLogoSettingsOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      ) {
        return false;
      }

      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(motionQuery.matches);
    return subscribeToMediaQuery(motionQuery, handleMotionChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        LOGO_SETTINGS_STORAGE_KEY,
        JSON.stringify(logoSettings),
      );
    } catch {
      // Ignore
    }
  }, [logoSettings]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setLogoSettingsOpen(false);
    }
  }, [prefersReducedMotion]);

  // Use refs to access current settings without triggering effect re-runs
  const logoSettingsRef = useRef(logoSettings);
  logoSettingsRef.current = logoSettings;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = floatingLogoRef.current;
    if (!element) {
      return;
    }

    if (floatingLogoAnimationRef.current !== null) {
      cancelAnimationFrame(floatingLogoAnimationRef.current);
      floatingLogoAnimationRef.current = null;
    }

    // Check initial visibility - read from ref for current value
    const settings = logoSettingsRef.current;
    const initialOpacity = clamp(settings.opacity, 0, 100) / 100;
    const style = element.style;

    if (!settings.isVisible || initialOpacity <= 0) {
      style.display = "none";
      style.setProperty("--logo-opacity", "0");
      return;
    }

    style.display = "";

    if (prefersReducedMotion) {
      const normalizedOpacity = clamp(settings.opacity, 0, 100) / 100;
      const staticPrimary = 0.38 * normalizedOpacity;
      const staticSecondary = 0.24 * normalizedOpacity;
      style.setProperty("--logo-x", "0px");
      style.setProperty("--logo-y", "0px");
      style.setProperty("--logo-rotate", "0deg");
      style.setProperty("--logo-scale", "1");
      style.setProperty("--logo-opacity", normalizedOpacity + "");
      style.setProperty("--logo-glow-primary", Math.max(0, staticPrimary) + "");
      style.setProperty("--logo-glow-secondary", Math.max(0, staticSecondary) + "");
      return;
    }

    let frameId: number;
    let previousTimestamp: number | null = null;
    let angle = 0;
    // Pre-compute PI constants to avoid repeated calculations
    const TWO_PI = Math.PI * 2;
    const PI_QUARTER = Math.PI / 4;

    // Cache viewport dimensions - only update occasionally, not every frame
    let viewportWidth = window.innerWidth || 1440;
    let viewportHeight = window.innerHeight || 900;
    let lastViewportCheck = 0;
    const VIEWPORT_CHECK_INTERVAL = 500;

    const animate = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;

      // Read current settings from ref (doesn't cause re-render/re-subscribe)
      const currentSettings = logoSettingsRef.current;
      const normalizedOpacity = clamp(currentSettings.opacity, 0, 100) / 100;

      // Handle visibility changes without restarting animation
      if (!currentSettings.isVisible || normalizedOpacity <= 0) {
        style.display = "none";
        frameId = window.requestAnimationFrame(animate);
        floatingLogoAnimationRef.current = frameId;
        return;
      }

      style.display = "";

      const orbitDuration = Math.max(currentSettings.speed, 4);
      angle = (angle + (deltaSeconds * TWO_PI) / orbitDuration) % TWO_PI;

      // Only check viewport dimensions periodically, not every frame
      if (timestamp - lastViewportCheck > VIEWPORT_CHECK_INTERVAL) {
        viewportWidth = window.innerWidth || 1440;
        viewportHeight = window.innerHeight || 900;
        lastViewportCheck = timestamp;
      }

      const horizontalMargin = 160;
      const verticalMargin = 200;

      const maxHorizontal = Math.max(
        0,
        (viewportWidth - horizontalMargin * 2) / 2,
      );
      const maxVertical = Math.max(
        0,
        (viewportHeight - verticalMargin * 2) / 2,
      );

      const amplitudeX =
        maxHorizontal * (clamp(currentSettings.travelX, 10, 100) / 100);
      const amplitudeY =
        maxVertical * (clamp(currentSettings.travelY, 10, 100) / 100);

      // Cache trig calculations - each is used multiple times
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const sin2Angle = Math.sin(angle * 2);

      const orbitX = cosAngle * amplitudeX;
      const orbitY = sinAngle * amplitudeY;

      const bounceStrength = clamp(currentSettings.bounce, 0, 120);
      const bounceOffset = sin2Angle * bounceStrength;
      const tilt = sin2Angle * 5.8;
      const scale = 1 + sin2Angle * (bounceStrength / 360);

      const translateX = orbitX;
      const translateY = orbitY + bounceOffset;

      // Update CSS custom properties - batched by browser for efficient rendering
      // Using setProperty is faster than string concatenation for transform
      style.setProperty("--logo-x", `${translateX | 0}px`);
      style.setProperty("--logo-y", `${translateY | 0}px`);
      style.setProperty("--logo-rotate", `${tilt | 0}deg`);
      style.setProperty("--logo-scale", (scale * 100 | 0) / 100 + "");
      style.setProperty("--logo-opacity", (normalizedOpacity * 100 | 0) / 100 + "");

      // Glow calculation - update less frequently (every other frame effectively)
      const sin1_7Angle = Math.sin(angle * 1.7);
      const sin2_3Angle = Math.sin(angle * 2.3 + PI_QUARTER);

      const glowPrimary = Math.max(0, (0.34 + sin1_7Angle * 0.12) * normalizedOpacity);
      const glowSecondary = Math.max(0, (0.2 + sin2_3Angle * 0.08) * normalizedOpacity);
      style.setProperty("--logo-glow-primary", (glowPrimary * 100 | 0) / 100 + "");
      style.setProperty("--logo-glow-secondary", (glowSecondary * 100 | 0) / 100 + "");

      frameId = window.requestAnimationFrame(animate);
      floatingLogoAnimationRef.current = frameId;
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      floatingLogoAnimationRef.current = null;
    };
    // Only restart animation loop when reduced motion preference changes
    // Settings changes are read via ref inside the animation loop
  }, [prefersReducedMotion]);

  const handleLogoSettingChange = (
    setting: LogoNumericSettingKey,
    value: number,
  ) => {
    setLogoSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const toggleLogoVisibility = () => {
    setLogoSettings((prev) => ({
      ...prev,
      isVisible: !prev.isVisible,
    }));
  };

  return {
    floatingLogoRef,
    logoSettings,
    isLogoSettingsOpen,
    setLogoSettingsOpen,
    prefersReducedMotion,
    handleLogoSettingChange,
    toggleLogoVisibility,
  };
}
