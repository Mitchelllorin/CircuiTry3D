/**
 * PracticeWorksheetModal - Floating semi-transparent modal for the W.I.R.E. worksheet
 * Allows users to see the circuit in the background while solving problems
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type PracticeWorksheetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Whether the modal should be draggable */
  draggable?: boolean;
  /** Initial position from top (percentage) */
  initialTop?: number;
  /** Initial position from left (percentage) */
  initialLeft?: number;
};

export default function PracticeWorksheetModal({
  isOpen,
  onClose,
  title = "W.I.R.E. Worksheet",
  children,
  draggable = true,
  initialTop = 10,
  initialLeft = 50,
}: PracticeWorksheetModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ top: initialTop, left: initialLeft });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusTimer = setTimeout(() => {
      modalRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // Drag handlers
  const handleDragStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!draggable || !modalRef.current) return;

    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
    const rect = modalRef.current.getBoundingClientRect();

    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    setIsDragging(true);
  }, [draggable]);

  const handleDragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;

    const newLeft = ((clientX - dragOffset.x) / window.innerWidth) * 100;
    const newTop = ((clientY - dragOffset.y) / window.innerHeight) * 100;

    setPosition({
      left: Math.max(0, Math.min(80, newLeft)),
      top: Math.max(0, Math.min(80, newTop)),
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={modalRef}
      className={`worksheet-modal ${isMinimized ? "worksheet-modal--minimized" : ""} ${isDragging ? "worksheet-modal--dragging" : ""}`}
      style={{
        top: `${position.top}%`,
        left: `${position.left}%`,
        transform: "translateX(-50%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="worksheet-modal-title"
      tabIndex={-1}
    >
      <header
        className="worksheet-modal-header"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="worksheet-modal-drag-handle" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <h2 id="worksheet-modal-title">{title}</h2>
        <div className="worksheet-modal-actions">
          <button
            type="button"
            className="worksheet-modal-btn worksheet-modal-minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? "Expand worksheet" : "Minimize worksheet"}
          >
            {isMinimized ? "+" : "−"}
          </button>
          <button
            type="button"
            className="worksheet-modal-btn worksheet-modal-close"
            onClick={onClose}
            aria-label="Close worksheet"
          >
            ×
          </button>
        </div>
      </header>

      {!isMinimized && (
        <div className="worksheet-modal-body">
          {children}
        </div>
      )}
    </div>,
    document.body
  );
}
