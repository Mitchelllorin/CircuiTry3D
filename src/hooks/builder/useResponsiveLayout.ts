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
  const [isLeftMenuOpen, setLeftMenuOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth >= 1024;
  });

  const [isRightMenuOpen, setRightMenuOpen] = useState(false);
  const [isBottomMenuOpen, setBottomMenuOpen] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const largeScreenQuery = window.matchMedia("(min-width: 1024px)");
    const compactScreenQuery = window.matchMedia("(max-width: 900px)");
    const phoneLandscapeQuery = window.matchMedia(
      "(orientation: landscape) and (max-height: 600px)",
    );

    const handleLargeScreen = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setLeftMenuOpen(true);
      }
    };

    const handleCompactScreen = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setLeftMenuOpen(false);
      }
    };

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
    } else if (compactScreenQuery.matches) {
      setLeftMenuOpen(false);
    } else if (largeScreenQuery.matches) {
      setLeftMenuOpen(true);
    }

    const detachLargeScreen = subscribeToMediaQuery(
      largeScreenQuery,
      handleLargeScreen,
    );
    const detachCompactScreen = subscribeToMediaQuery(
      compactScreenQuery,
      handleCompactScreen,
    );
    const detachPhoneLandscape = subscribeToMediaQuery(
      phoneLandscapeQuery,
      handlePhoneLandscape,
    );

    return () => {
      detachLargeScreen();
      detachCompactScreen();
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
