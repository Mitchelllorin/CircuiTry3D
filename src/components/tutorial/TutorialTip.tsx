import { useEffect, useRef, useState, useCallback } from "react";
import { useTutorial, type TutorialStep, STEP_MENU_REQUIREMENTS, type MenuRequirement } from "../../context/TutorialContext";
import "./TutorialTip.css";

type TipPosition = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
};

/** Tip bubble dimensions (approximate, used for bounds checking) - compact for mobile */
const TIP_WIDTH = 220;
const TIP_HEIGHT = 160;
const SCREEN_PADDING = 10;

/**
 * Checks if an element or any of its ancestors is hidden via CSS.
 * Also checks for menu stage containers that might be mid-transition.
 * Returns true if the element and all ancestors are visible.
 */
function isVisibleInDom(element: Element): boolean {
  let current: Element | null = element;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);

    // Check for explicitly hidden elements
    if (style.visibility === 'hidden' || style.display === 'none') {
      return false;
    }

    // For builder-menu elements inside menu stages, the visibility depends on
    // the parent .builder-menu-stage having the .open class
    // Check for the menu stage in the parent chain
    if (current.classList.contains('builder-menu')) {
      const menuStage = current.closest('.builder-menu-stage');
      if (menuStage && !menuStage.classList.contains('open')) {
        return false;
      }
      // If the menu stage has .open class, skip opacity check for this element
      // since it's still animating but will be visible
      if (menuStage?.classList.contains('open')) {
        current = current.parentElement;
        continue;
      }
    }

    // For menu stage containers, check if they have the .open class
    if (current.classList.contains('builder-menu-stage')) {
      if (!current.classList.contains('open')) {
        return false;
      }
    } else if (parseFloat(style.opacity) < 0.1) {
      // For other elements, check opacity
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

/**
 * Checks if an element is visible and has valid dimensions.
 * Returns true if the element is actually visible on screen (not just in DOM).
 */
function isElementVisible(element: Element | null): boolean {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Check if element has valid dimensions
  if (rect.width < 10 || rect.height < 10) return false;

  // Check that the element and its ancestors aren't hidden
  const isNotHidden = isVisibleInDom(element);
  if (!isNotHidden) return false;

  // For elements inside menu stages with .open class, be lenient about viewport bounds
  // since the CSS transition may still be in progress but the element will be visible
  const menuStage = element.closest('.builder-menu-stage');
  if (menuStage?.classList.contains('open')) {
    // The menu is opening/open, trust that the element will be visible
    // Just check that it's not completely off-screen in the wrong direction
    const isReasonablyOnScreen = (
      rect.right > -viewportWidth &&      // Not too far left
      rect.left < viewportWidth * 2 &&    // Not too far right
      rect.bottom > -viewportHeight &&    // Not too far up
      rect.top < viewportHeight * 2       // Not too far down
    );
    return isReasonablyOnScreen;
  }

  // Check that the element is actually visible on screen
  // The element must have at least part of it within the visible viewport
  // This catches elements that are off-screen due to CSS transforms (like translateX(100%))
  const isActuallyOnScreen = (
    rect.right > 0 &&          // Right edge is past left side of viewport
    rect.left < viewportWidth && // Left edge is before right side of viewport
    rect.bottom > 0 &&         // Bottom edge is past top of viewport
    rect.top < viewportHeight   // Top edge is before bottom of viewport
  );

  return isActuallyOnScreen;
}

/**
 * Waits for a menu to be in the open state (has .open class applied).
 * Returns true when the menu is open, or false after timeout.
 */
async function waitForMenuOpen(
  menuType: string,
  maxAttempts: number = 30,
  delayMs: number = 50
): Promise<boolean> {
  const menuStageSelector = `.builder-menu-stage-${menuType}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const menuStage = document.querySelector(menuStageSelector);
    if (menuStage?.classList.contains('open')) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

/**
 * Waits for an element to become visible with valid dimensions.
 * Returns the element if found within maxAttempts, null otherwise.
 */
async function waitForVisibleElement(
  selector: string,
  maxAttempts: number = 20,
  delayMs: number = 150
): Promise<Element | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return document.querySelector(selector); // Return element even if not visible as fallback
}

/**
 * Calculates the position for the tip bubble based on target element and position preference.
 * Includes bounds checking to prevent off-screen positioning.
 * Falls back to corner positioning when neither preferred direction nor its opposite fits.
 * NEVER positions in center to avoid obscuring the target element.
 */
function calculateTipPosition(
  target: Element | null,
  position: TutorialStep["position"]
): TipPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Get actual tip dimensions (use smaller values on mobile)
  const actualTipWidth = Math.min(TIP_WIDTH, viewportWidth - 20);
  const actualTipHeight = Math.min(TIP_HEIGHT, viewportHeight - 140);

  // Fallback to corner positioning that doesn't obscure the target
  const getFallbackPosition = (targetRect?: DOMRect): TipPosition => {
    if (!targetRect) {
      // Default to bottom-right corner
      return { bottom: `${SCREEN_PADDING + 80}px`, right: `${SCREEN_PADDING}px` };
    }

    // Determine which corner is furthest from the target
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Position in the corner opposite to the target
    if (targetCenterX < viewportWidth / 2) {
      // Target is on left side, put tip on right
      if (targetCenterY < viewportHeight / 2) {
        // Target is top-left, put tip bottom-right
        return { bottom: `${SCREEN_PADDING + 80}px`, right: `${SCREEN_PADDING}px` };
      } else {
        // Target is bottom-left, put tip top-right
        return { top: `${SCREEN_PADDING + 80}px`, right: `${SCREEN_PADDING}px` };
      }
    } else {
      // Target is on right side, put tip on left
      if (targetCenterY < viewportHeight / 2) {
        // Target is top-right, put tip bottom-left
        return { bottom: `${SCREEN_PADDING + 80}px`, left: `${SCREEN_PADDING}px` };
      } else {
        // Target is bottom-right, put tip top-left
        return { top: `${SCREEN_PADDING + 80}px`, left: `${SCREEN_PADDING}px` };
      }
    }
  };

  // Default to corner positioning if no target or explicit center
  if (!target || position === "center") {
    return getFallbackPosition();
  }

  const rect = target.getBoundingClientRect();
  const padding = 12;

  // Helper to clamp a horizontal center position so the tip stays on screen
  const clampHorizontalCenter = (centerX: number): number => {
    return Math.min(
      Math.max(centerX, actualTipWidth / 2 + SCREEN_PADDING),
      viewportWidth - actualTipWidth / 2 - SCREEN_PADDING
    );
  };

  // Helper to clamp a vertical center position so the tip stays on screen
  const clampVerticalCenter = (centerY: number): number => {
    return Math.min(
      Math.max(centerY, actualTipHeight / 2 + SCREEN_PADDING),
      viewportHeight - actualTipHeight / 2 - SCREEN_PADDING
    );
  };

  // Calculate initial positions based on preference
  let result: TipPosition = {};

  switch (position) {
    case "top": {
      const bottomPos = viewportHeight - rect.top + padding;
      const leftPos = rect.left + rect.width / 2;

      // Check if tip would go off the top
      if (rect.top - padding - actualTipHeight < SCREEN_PADDING) {
        // Try bottom instead
        const topPos = rect.bottom + padding;
        if (topPos + actualTipHeight <= viewportHeight - SCREEN_PADDING) {
          result = {
            top: `${topPos}px`,
            left: `${clampHorizontalCenter(leftPos)}px`,
            transform: "translateX(-50%)",
          };
        } else {
          return getFallbackPosition(rect);
        }
      } else {
        result = {
          bottom: `${bottomPos}px`,
          left: `${clampHorizontalCenter(leftPos)}px`,
          transform: "translateX(-50%)",
        };
      }
      break;
    }
    case "bottom": {
      const topPos = rect.bottom + padding;
      const leftPos = rect.left + rect.width / 2;

      // Check if tip would go off the bottom
      if (topPos + actualTipHeight > viewportHeight - SCREEN_PADDING) {
        // Try top instead
        const bottomPos = viewportHeight - rect.top + padding;
        if (rect.top - padding - actualTipHeight >= SCREEN_PADDING) {
          result = {
            bottom: `${bottomPos}px`,
            left: `${clampHorizontalCenter(leftPos)}px`,
            transform: "translateX(-50%)",
          };
        } else {
          return getFallbackPosition(rect);
        }
      } else {
        result = {
          top: `${topPos}px`,
          left: `${clampHorizontalCenter(leftPos)}px`,
          transform: "translateX(-50%)",
        };
      }
      break;
    }
    case "left": {
      const rightPos = viewportWidth - rect.left + padding;
      const topPos = rect.top + rect.height / 2;

      // Check space on left
      const spaceOnLeft = rect.left - padding;
      const spaceOnRight = viewportWidth - rect.right - padding;

      if (spaceOnLeft >= actualTipWidth) {
        result = {
          top: `${clampVerticalCenter(topPos)}px`,
          right: `${rightPos}px`,
          transform: "translateY(-50%)",
        };
      } else if (spaceOnRight >= actualTipWidth) {
        result = {
          top: `${clampVerticalCenter(topPos)}px`,
          left: `${rect.right + padding}px`,
          transform: "translateY(-50%)",
        };
      } else {
        return getFallbackPosition(rect);
      }
      break;
    }
    case "right": {
      const leftPos = rect.right + padding;
      const topPos = rect.top + rect.height / 2;

      // Check space on right and left
      const spaceOnRight = viewportWidth - rect.right - padding;
      const spaceOnLeft = rect.left - padding;

      if (spaceOnRight >= actualTipWidth) {
        result = {
          top: `${clampVerticalCenter(topPos)}px`,
          left: `${leftPos}px`,
          transform: "translateY(-50%)",
        };
      } else if (spaceOnLeft >= actualTipWidth) {
        result = {
          top: `${clampVerticalCenter(topPos)}px`,
          right: `${viewportWidth - rect.left + padding}px`,
          transform: "translateY(-50%)",
        };
      } else {
        return getFallbackPosition(rect);
      }
      break;
    }
    default:
      return getFallbackPosition(rect);
  }

  return result;
}

/**
 * Gets the arrow direction class based on tip position
 */
function getArrowClass(position: TutorialStep["position"]): string {
  switch (position) {
    case "top":
      return "arrow-bottom";
    case "bottom":
      return "arrow-top";
    case "left":
      return "arrow-right";
    case "right":
      return "arrow-left";
    default:
      return "";
  }
}

/**
 * Category icon mapping for visual distinction
 */
const CATEGORY_ICONS: Record<TutorialStep["category"], string> = {
  workspace: "🎯",
  components: "🔌",
  tools: "🔧",
  analysis: "📊",
  navigation: "🧭",
};

export function TutorialTip() {
  const {
    state,
    currentStep,
    totalSteps,
    progress,
    nextStep,
    previousStep,
    skipTutorial,
    dismissTutorial,
  } = useTutorial();

  const tipRef = useRef<HTMLDivElement>(null);
  const [tipPosition, setTipPosition] = useState<TipPosition>({});
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<Element | null>(null);

  /**
   * Opens the required menu for the current step by dispatching a custom event.
   * Returns the menu requirement for this step.
   */
  const openRequiredMenu = useCallback((stepId: string): MenuRequirement => {
    const menuRequirement = STEP_MENU_REQUIREMENTS[stepId] || "none";
    if (menuRequirement !== "none") {
      // Dispatch custom event for the Builder to handle
      window.dispatchEvent(
        new CustomEvent("tutorial:open-menu", {
          detail: { menu: menuRequirement, stepId },
        })
      );
    }
    return menuRequirement;
  }, []);

  /**
   * Closes menus when the next step doesn't need them.
   * Only closes if the next step requires a different menu (or no menu).
   */
  const closeMenusIfNotNeeded = useCallback((currentStepId: string, nextStepId: string | null) => {
    const currentMenu = STEP_MENU_REQUIREMENTS[currentStepId] || "none";
    const nextMenu = nextStepId ? (STEP_MENU_REQUIREMENTS[nextStepId] || "none") : "none";

    // Only close the menu if the next step doesn't need the same menu
    if (currentMenu !== "none" && currentMenu !== nextMenu) {
      window.dispatchEvent(
        new CustomEvent("tutorial:close-menu", {
          detail: { menu: currentMenu, stepId: currentStepId },
        })
      );
    }
  }, []);

  /**
   * Closes all menus when tutorial ends completely.
   */
  const closeAllMenusOnEnd = useCallback(() => {
    // Close all menus that might have been opened
    ['left', 'right', 'bottom'].forEach(menu => {
      window.dispatchEvent(
        new CustomEvent("tutorial:close-menu", {
          detail: { menu, stepId: 'tutorial-end' },
        })
      );
    });
  }, []);

  // Track previous step ID to handle menu transitions
  const previousStepIdRef = useRef<string | null>(null);

  // Find and highlight target element
  useEffect(() => {
    if (!currentStep || !state.isActive) {
      setTargetElement(null);
      setIsVisible(false);
      // Close all menus when tutorial becomes inactive
      if (previousStepIdRef.current) {
        closeAllMenusOnEnd();
        previousStepIdRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let highlightedElement: Element | null = null;

    // Close menus from previous step if needed (only if next step doesn't need same menu)
    if (previousStepIdRef.current && previousStepIdRef.current !== currentStep.id) {
      closeMenusIfNotNeeded(previousStepIdRef.current, currentStep.id);
    }

    // Open required menu first
    const menuRequirement = openRequiredMenu(currentStep.id);
    const initialDelay = currentStep.delay ?? 300;

    const findAndShowTarget = async () => {
      // Wait for the initial transition delay
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      if (cancelled) return;

      // For steps requiring a menu, wait for it to be visible
      let target: Element | null = null;
      if (menuRequirement !== "none") {
        // First, wait for the menu's .open class to be applied
        // This ensures React has processed the state change
        const menuOpened = await waitForMenuOpen(menuRequirement, 40, 50);
        if (cancelled) return;

        if (menuOpened) {
          // Now wait for the CSS transition to complete (320ms transition + buffer)
          await new Promise(resolve => setTimeout(resolve, 400));
          if (cancelled) return;
        }

        // Wait for the element to become visible with extended attempts
        // Poll every 150ms for up to 4.5 seconds total (more reliable on slower devices)
        target = await waitForVisibleElement(currentStep.target, 30, 150);
      } else {
        // Direct lookup for non-menu steps
        target = document.querySelector(currentStep.target);
      }

      if (cancelled) return;

      setTargetElement(target);

      // Add highlight class to the target element
      if (target && currentStep.position !== "center") {
        target.classList.add("tutorial-highlight");
        highlightedElement = target;
      }

      if (target && isElementVisible(target)) {
        // Calculate position
        const position = calculateTipPosition(target, currentStep.position);
        setTipPosition(position);
      } else if (currentStep.position === "center") {
        // Center position doesn't need a target element
        const position = calculateTipPosition(null, currentStep.position);
        setTipPosition(position);
      } else {
        // Fallback: target not visible, use corner positioning
        const position = calculateTipPosition(null, "center");
        setTipPosition(position);
      }

      // Show with animation
      setIsVisible(true);

      // Scroll target into view if needed (gentle scroll)
      if (target && currentStep.position !== "center" && isElementVisible(target)) {
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    findAndShowTarget();

    // Store current step ID for next transition
    previousStepIdRef.current = currentStep.id;

    return () => {
      cancelled = true;
      // Remove highlight class from target element
      if (highlightedElement) {
        highlightedElement.classList.remove("tutorial-highlight");
      }
      // NOTE: Menu closing is handled at the START of the next render, not in cleanup
      // This prevents the menu from closing and reopening when navigating between
      // steps that both require the same menu
    };
  }, [currentStep, state.isActive, openRequiredMenu, closeMenusIfNotNeeded, closeAllMenusOnEnd]);

  // Recalculate position on resize and scroll
  useEffect(() => {
    if (!currentStep || !state.isActive || !targetElement) return;

    const updatePosition = () => {
      const target = document.querySelector(currentStep.target);
      if (target && isElementVisible(target)) {
        const position = calculateTipPosition(target, currentStep.position);
        setTipPosition(position);
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    // Also update position periodically in case menus animate
    const intervalId = setInterval(updatePosition, 500);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      clearInterval(intervalId);
    };
  }, [currentStep, state.isActive, targetElement]);

  // Keyboard navigation
  useEffect(() => {
    if (!state.isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowRight":
        case "Enter":
          event.preventDefault();
          nextStep();
          break;
        case "ArrowLeft":
          event.preventDefault();
          previousStep();
          break;
        case "Escape":
          event.preventDefault();
          skipTutorial();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isActive, nextStep, previousStep, skipTutorial]);

  // Don't render if not active
  if (!state.isActive || !currentStep) {
    return null;
  }

  const arrowClass = getArrowClass(currentStep.position);
  const categoryIcon = CATEGORY_ICONS[currentStep.category];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === totalSteps - 1;
  const showSpotlight = currentStep.position !== "center" && targetElement;

  return (
    <>
      {/* Spotlight overlay - dims background to focus on target */}
      <div className={`tutorial-spotlight ${isVisible && showSpotlight ? "visible" : ""}`} />

      {/* Tip bubble */}
      <div
        ref={tipRef}
        className={`tutorial-tip ${isVisible ? "visible" : ""} ${arrowClass}`}
        style={tipPosition}
        role="tooltip"
        aria-live="polite"
      >
        <div className="tutorial-tip-header">
          <span className="tutorial-tip-category">
            <span className="category-icon">{categoryIcon}</span>
            <span className="category-label">{currentStep.category}</span>
          </span>
          <span className="tutorial-tip-progress">
            {state.currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        <h4 className="tutorial-tip-title">{currentStep.title}</h4>
        <p className="tutorial-tip-content">{currentStep.content}</p>

        {currentStep.hint && (
          <p className="tutorial-tip-hint">
            <span className="hint-icon">💡</span>
            {currentStep.hint}
          </p>
        )}

        <div className="tutorial-tip-progress-bar">
          <div
            className="tutorial-tip-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="tutorial-tip-actions">
          <button
            type="button"
            className="tutorial-tip-btn tutorial-tip-btn-skip"
            onClick={skipTutorial}
            aria-label="Skip tutorial"
          >
            Skip
          </button>

          <div className="tutorial-tip-nav">
            {!isFirstStep && (
              <button
                type="button"
                className="tutorial-tip-btn tutorial-tip-btn-prev"
                onClick={previousStep}
                aria-label="Previous tip"
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="tutorial-tip-btn tutorial-tip-btn-next"
              onClick={nextStep}
              aria-label={isLastStep ? "Finish tutorial" : "Next tip"}
            >
              {isLastStep ? "Got it!" : "Next"}
            </button>
          </div>
        </div>

        {isFirstStep && (
          <button
            type="button"
            className="tutorial-tip-dismiss"
            onClick={dismissTutorial}
            aria-label="Don't show tutorial again"
          >
            Don't show again
          </button>
        )}
      </div>
    </>
  );
}
