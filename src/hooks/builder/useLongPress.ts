import { useCallback, useRef } from 'react';

export interface LongPressOptions {
  /**
   * Duration in milliseconds before long press is triggered
   * @default 500
   */
  threshold?: number;

  /**
   * Maximum movement in pixels before cancelling the long press
   * @default 10
   */
  movementThreshold?: number;

  /**
   * Callback when long press is triggered
   */
  onLongPress: (event: PointerEvent, clientX: number, clientY: number) => void;

  /**
   * Optional callback when long press starts (touch down)
   */
  onPressStart?: () => void;

  /**
   * Optional callback when long press is cancelled (moved too far or released early)
   */
  onPressCancel?: () => void;
}

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
}

/**
 * Custom hook for handling long press interactions
 *
 * This hook provides a cross-platform long press detection that works on both
 * touch and mouse devices. It's used for triggering context menus and component
 * editing in CircuiTry3D.
 *
 * Usage:
 * ```tsx
 * const longPressHandlers = useLongPress({
 *   threshold: 500,
 *   onLongPress: (event, x, y) => {
 *     showContextMenu(x, y);
 *   }
 * });
 *
 * // Attach to element
 * element.addEventListener('pointerdown', longPressHandlers.onPointerDown);
 * element.addEventListener('pointermove', longPressHandlers.onPointerMove);
 * element.addEventListener('pointerup', longPressHandlers.onPointerUp);
 * ```
 */
export function useLongPress(options: LongPressOptions): LongPressHandlers {
  const {
    threshold = 500,
    movementThreshold = 10,
    onLongPress,
    onPressStart,
    onPressCancel
  } = options;

  // Refs to track press state
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressActiveRef = useRef(false);
  const startEventRef = useRef<PointerEvent | null>(null);

  const cancelLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isLongPressActiveRef.current) {
      onPressCancel?.();
    }
    startPosRef.current = null;
    isLongPressActiveRef.current = false;
    startEventRef.current = null;
  }, [onPressCancel]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    // Only handle primary button (left click / single touch)
    if (event.button !== 0) return;

    // Store start position
    startPosRef.current = { x: event.clientX, y: event.clientY };
    startEventRef.current = event;
    isLongPressActiveRef.current = true;

    onPressStart?.();

    // Start the long press timer
    timerRef.current = setTimeout(() => {
      if (isLongPressActiveRef.current && startPosRef.current && startEventRef.current) {
        onLongPress(startEventRef.current, startPosRef.current.x, startPosRef.current.y);
        isLongPressActiveRef.current = false;
      }
    }, threshold);
  }, [threshold, onLongPress, onPressStart]);

  const handlePointerUp = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!startPosRef.current || !isLongPressActiveRef.current) return;

    // Check if moved too far
    const deltaX = Math.abs(event.clientX - startPosRef.current.x);
    const deltaY = Math.abs(event.clientY - startPosRef.current.y);

    if (deltaX > movementThreshold || deltaY > movementThreshold) {
      cancelLongPress();
    }
  }, [movementThreshold, cancelLongPress]);

  const handlePointerCancel = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const handlePointerLeave = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerMove: handlePointerMove,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave
  };
}

/**
 * Detects if the current device primarily uses touch input
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Default long press duration for different contexts
 */
export const LONG_PRESS_DEFAULTS = {
  /** Standard long press for context menus */
  CONTEXT_MENU: 500,

  /** Faster response for mobile devices */
  MOBILE: 400,

  /** Longer delay for drag operations to avoid false triggers */
  DRAG_DELAY: 600,

  /** Movement threshold to cancel long press (pixels) */
  MOVEMENT_THRESHOLD: 10,

  /** Stricter movement threshold for precision operations */
  PRECISION_THRESHOLD: 5
} as const;
