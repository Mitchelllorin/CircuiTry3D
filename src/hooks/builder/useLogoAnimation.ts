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

    const normalizedOpacity = clamp(logoSettings.opacity, 0, 100) / 100;

    if (!logoSettings.isVisible || normalizedOpacity <= 0) {
      element.style.display = "none";
      element.style.opacity = "0";
      element.style.textShadow = "none";
      element.style.transform = "translateX(-50%) translateY(-50%)";
      return;
    }

    element.style.display = "";
    element.style.opacity = normalizedOpacity.toFixed(2);

    if (prefersReducedMotion) {
      const staticPrimary = 0.38 * normalizedOpacity;
      const staticSecondary = 0.24 * normalizedOpacity;
      element.style.transform = "translateX(-50%) translateY(-50%)";
      element.style.textShadow = `0 0 44px rgba(0, 255, 136, ${Math.max(0, staticPrimary).toFixed(2)}), 0 0 68px rgba(136, 204, 255, ${Math.max(
        0,
        staticSecondary,
      ).toFixed(2)})`;
      return;
    }

    let frameId: number;
    let previousTimestamp: number | null = null;
    let angle = 0;
    // Pre-compute PI constants to avoid repeated calculations
    const TWO_PI = Math.PI * 2;

    const animate = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;

      const orbitDuration = Math.max(logoSettings.speed, 4);
      angle =
        (angle + (deltaSeconds * TWO_PI) / orbitDuration) %
        TWO_PI;

      const viewportWidth = window.innerWidth || 1440;
      const viewportHeight = window.innerHeight || 900;

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
        maxHorizontal * (clamp(logoSettings.travelX, 10, 100) / 100);
      const amplitudeY =
        maxVertical * (clamp(logoSettings.travelY, 10, 100) / 100);

      // Cache trig calculations - each is used multiple times
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const sin2Angle = Math.sin(angle * 2);

      const orbitX = cosAngle * amplitudeX;
      const orbitY = sinAngle * amplitudeY;

      const bounceStrength = clamp(logoSettings.bounce, 0, 120);
      const bounceOffset = sin2Angle * bounceStrength;
      const tilt = sin2Angle * 5.8;
      const scale = 1 + sin2Angle * (bounceStrength / 360);

      const translateX = orbitX;
      const translateY = orbitY + bounceOffset;

      // Use Math.round for pixel values (no decimals needed), reduce toFixed precision
      element.style.transform = `translateX(calc(-50% + ${Math.round(translateX)}px)) translateY(calc(-50% + ${Math.round(translateY)}px)) rotate(${tilt.toFixed(1)}deg) scale(${scale.toFixed(2)})`;

      // Cache trig calculations for glow
      const sin1_7Angle = Math.sin(angle * 1.7);
      const sin2_3Angle = Math.sin(angle * 2.3 + Math.PI / 4);

      const glowPrimary =
        (0.34 + sin1_7Angle * 0.12) * normalizedOpacity;
      const glowSecondary =
        (0.2 + sin2_3Angle * 0.08) * normalizedOpacity;
      element.style.textShadow = `0 0 44px rgba(0, 255, 136, ${Math.max(0, glowPrimary).toFixed(2)}), 0 0 68px rgba(136, 204, 255, ${Math.max(
        0,
        glowSecondary,
      ).toFixed(2)})`;

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
  }, [logoSettings, prefersReducedMotion]);

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
