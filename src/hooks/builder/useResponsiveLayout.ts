import { useEffect, useState } from "react";

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

export function useResponsiveLayout() {
  // Always start closed — maximum workspace on every device/screen size.
  // User opens panels manually via the edge toggle tabs.
  const [isLeftMenuOpen, setLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setRightMenuOpen] = useState(false);
  const [isBottomMenuOpen, setBottomMenuOpen] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const phoneLandscapeQuery = window.matchMedia(
      "(orientation: landscape) and (max-height: 600px)",
    );

    const handlePhoneLandscape = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setLeftMenuOpen(false);
        setRightMenuOpen(false);
        setBottomMenuOpen(false);
      }
    };

    if (phoneLandscapeQuery.matches) {
      setLeftMenuOpen(false);
      setRightMenuOpen(false);
      setBottomMenuOpen(false);
    }

    const detachPhoneLandscape = subscribeToMediaQuery(
      phoneLandscapeQuery,
      handlePhoneLandscape,
    );

    return () => {
      detachPhoneLandscape();
    };
  }, []);

  return {
    isLeftMenuOpen,
    setLeftMenuOpen,
    isRightMenuOpen,
    setRightMenuOpen,
    isBottomMenuOpen,
    setBottomMenuOpen,
  };
}
