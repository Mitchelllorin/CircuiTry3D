import { useCallback, useState, useEffect, useRef } from "react";
import type { SchematicElement, TwoTerminalElement, ComponentKind } from "../../../schematic/types";

/**
 * Component value configuration by type
 */
const COMPONENT_VALUE_CONFIG: Record<string, {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  parseLabel: (label: string) => number | null;
  formatValue: (value: number) => string;
}> = {
  battery: {
    label: "Voltage",
    unit: "V",
    min: 0.1,
    max: 240,
    step: 0.1,
    defaultValue: 9,
    parseLabel: (label: string) => {
      const match = label.match(/^(\d+(?:\.\d+)?)\s*V?$/i);
      return match ? parseFloat(match[1]) : null;
    },
    formatValue: (value: number) => `${value}V`
  },
  resistor: {
    label: "Resistance",
    unit: "Ω", // Ohm symbol
    min: 1,
    max: 1000000,
    step: 1,
    defaultValue: 100,
    parseLabel: (label: string) => {
      const text = label.replace(/\s+/g, "").toLowerCase();
      const match = text.match(/^(\d+(?:\.\d+)?)(k|m)?(?:Ω|ohm)?$/i);
      if (!match) return null;
      const base = parseFloat(match[1]);
      const prefix = match[2]?.toLowerCase();
      if (prefix === "k") return base * 1000;
      if (prefix === "m") return base * 1000000;
      return base;
    },
    formatValue: (value: number) => {
      if (value >= 1000000) return `${value / 1000000}MΩ`;
      if (value >= 1000) return `${value / 1000}kΩ`;
      return `${value}Ω`;
    }
  },
  lamp: {
    label: "Resistance",
    unit: "Ω",
    min: 1,
    max: 1000,
    step: 1,
    defaultValue: 10,
    parseLabel: (label: string) => {
      const match = label.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    },
    formatValue: (value: number) => `${value}Ω`
  },
  capacitor: {
    label: "Capacitance",
    unit: "µF", // Microfarad
    min: 0.001,
    max: 10000,
    step: 0.001,
    defaultValue: 100,
    parseLabel: (label: string) => {
      const text = label.replace(/\s+/g, "").toLowerCase();
      const match = text.match(/^(\d+(?:\.\d+)?)(u|µ|n|p)?f?$/i);
      if (!match) return null;
      const base = parseFloat(match[1]);
      const prefix = match[2]?.toLowerCase();
      if (prefix === "n") return base / 1000;
      if (prefix === "p") return base / 1000000;
      return base;
    },
    formatValue: (value: number) => {
      if (value < 0.001) return `${value * 1000000}pF`;
      if (value < 1) return `${value * 1000}nF`;
      return `${value}µF`;
    }
  },
  inductor: {
    label: "Inductance",
    unit: "mH",
    min: 0.001,
    max: 10000,
    step: 0.001,
    defaultValue: 10,
    parseLabel: (label: string) => {
      const text = label.replace(/\s+/g, "").toLowerCase();
      const match = text.match(/^(\d+(?:\.\d+)?)(m|u|µ)?h?$/i);
      if (!match) return null;
      const base = parseFloat(match[1]);
      const prefix = match[2]?.toLowerCase();
      if (prefix === "u" || prefix === "µ") return base / 1000;
      return base;
    },
    formatValue: (value: number) => {
      if (value < 1) return `${value * 1000}µH`;
      return `${value}mH`;
    }
  }
};

interface ComponentEditModalProps {
  isOpen: boolean;
  element: SchematicElement | null;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: (elementId: string, newLabel: string) => void;
  onDelete?: (elementId: string) => void;
  onDuplicate?: (elementId: string) => void;
}

/**
 * Modal for editing component values via long-press interaction
 *
 * This component implements CircuiTry3D's long-press editing feature,
 * allowing users to modify component values (voltage, resistance, etc.)
 * directly in the circuit builder.
 */
export function ComponentEditModal({
  isOpen,
  element,
  position,
  onClose,
  onSave,
  onDelete,
  onDuplicate
}: ComponentEditModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get component configuration
  const config = element?.kind ? COMPONENT_VALUE_CONFIG[element.kind] : null;
  const twoTerminal = element as TwoTerminalElement | null;

  // Initialize input value from element label
  useEffect(() => {
    if (isOpen && twoTerminal && config) {
      const parsed = config.parseLabel(twoTerminal.label || "");
      if (parsed !== null) {
        setInputValue(String(parsed));
      } else {
        setInputValue(String(config.defaultValue));
      }
      setError(null);

      // Focus the input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, twoTerminal, config]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (!config) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError("Please enter a valid number");
    } else if (numValue < config.min) {
      setError(`Minimum value is ${config.min}`);
    } else if (numValue > config.max) {
      setError(`Maximum value is ${config.max}`);
    } else {
      setError(null);
    }
  }, [config]);

  const handleSave = useCallback(() => {
    if (!element || !config || error) return;

    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) return;

    const formattedLabel = config.formatValue(numValue);
    onSave(element.id, formattedLabel);
    onClose();
  }, [element, config, inputValue, error, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !error) {
      handleSave();
    }
  }, [handleSave, error]);

  const handleDelete = useCallback(() => {
    if (element && onDelete) {
      onDelete(element.id);
      onClose();
    }
  }, [element, onDelete, onClose]);

  const handleDuplicate = useCallback(() => {
    if (element && onDuplicate) {
      onDuplicate(element.id);
      onClose();
    }
  }, [element, onDuplicate, onClose]);

  if (!isOpen || !element) return null;

  // Determine if component is editable
  const isEditable = config !== null;
  const componentLabel = twoTerminal?.label || element.kind;

  // Calculate modal position (ensure it stays on screen)
  const modalStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 280),
    top: Math.min(position.y, window.innerHeight - 300),
    zIndex: 10000
  };

  return (
    <div
      ref={modalRef}
      className="component-edit-modal"
      style={modalStyle}
      role="dialog"
      aria-labelledby="component-edit-title"
      aria-modal="true"
    >
      <div className="component-edit-header">
        <h4 id="component-edit-title">
          {getComponentDisplayName(element.kind as ComponentKind)} - {componentLabel}
        </h4>
        <button
          type="button"
          className="component-edit-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="component-edit-body">
        {isEditable && config ? (
          <div className="component-edit-field">
            <label htmlFor="component-value-input">
              {config.label} ({config.unit})
            </label>
            <div className="component-edit-input-row">
              <input
                ref={inputRef}
                id="component-value-input"
                type="number"
                min={config.min}
                max={config.max}
                step={config.step}
                value={inputValue}
                onChange={handleValueChange}
                onKeyDown={handleKeyDown}
                className={error ? "has-error" : ""}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "component-value-error" : undefined}
              />
              <span className="component-edit-unit">{config.unit}</span>
            </div>
            {error && (
              <span id="component-value-error" className="component-edit-error">
                {error}
              </span>
            )}
            <div className="component-edit-range">
              <span>Range: {config.min} - {config.max} {config.unit}</span>
            </div>
          </div>
        ) : (
          <p className="component-edit-info">
            This component type does not have editable values.
          </p>
        )}
      </div>

      <div className="component-edit-actions">
        {isEditable && (
          <button
            type="button"
            className="component-edit-save"
            onClick={handleSave}
            disabled={!!error}
          >
            Save
          </button>
        )}
        {onDuplicate && (
          <button
            type="button"
            className="component-edit-duplicate"
            onClick={handleDuplicate}
          >
            Duplicate
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="component-edit-delete"
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          className="component-edit-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Get human-readable component name
 */
function getComponentDisplayName(kind: ComponentKind): string {
  const names: Record<string, string> = {
    battery: "Battery",
    resistor: "Resistor",
    lamp: "Lamp",
    capacitor: "Capacitor",
    inductor: "Inductor",
    diode: "Diode",
    switch: "Switch",
    bjt: "Transistor",
    ground: "Ground",
    wire: "Wire"
  };
  return names[kind] || kind;
}

/**
 * CSS styles for ComponentEditModal
 * Add these to your CSS file or use CSS-in-JS
 */
export const componentEditModalStyles = `
.component-edit-modal {
  background: var(--bg-surface, #1a1a2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 240px;
  max-width: 320px;
  font-family: var(--font-family, system-ui, sans-serif);
}

.component-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #333);
}

.component-edit-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.component-edit-close {
  background: none;
  border: none;
  color: var(--text-secondary, #888);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.component-edit-close:hover {
  color: var(--text-primary, #fff);
}

.component-edit-body {
  padding: 16px;
}

.component-edit-field label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary, #888);
  margin-bottom: 8px;
}

.component-edit-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.component-edit-input-row input {
  flex: 1;
  background: var(--bg-input, #0d0d1a);
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  padding: 8px 12px;
  color: var(--text-primary, #fff);
  font-size: 14px;
}

.component-edit-input-row input:focus {
  outline: none;
  border-color: var(--accent-color, #4a9eff);
}

.component-edit-input-row input.has-error {
  border-color: var(--error-color, #ef4444);
}

.component-edit-unit {
  color: var(--text-secondary, #888);
  font-size: 14px;
  min-width: 30px;
}

.component-edit-error {
  display: block;
  color: var(--error-color, #ef4444);
  font-size: 11px;
  margin-top: 4px;
}

.component-edit-range {
  font-size: 11px;
  color: var(--text-tertiary, #666);
  margin-top: 8px;
}

.component-edit-info {
  color: var(--text-secondary, #888);
  font-size: 13px;
  margin: 0;
}

.component-edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #333);
}

.component-edit-actions button {
  flex: 1;
  min-width: 80px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.component-edit-save {
  background: var(--accent-color, #4a9eff);
  color: white;
}

.component-edit-save:hover:not(:disabled) {
  background: var(--accent-hover, #3a8eef);
}

.component-edit-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.component-edit-duplicate {
  background: var(--bg-secondary, #2a2a4e);
  color: var(--text-primary, #fff);
}

.component-edit-duplicate:hover {
  background: var(--bg-hover, #3a3a5e);
}

.component-edit-delete {
  background: var(--error-bg, #3f1a1a);
  color: var(--error-color, #ef4444);
}

.component-edit-delete:hover {
  background: var(--error-bg-hover, #5f2a2a);
}

.component-edit-cancel {
  background: transparent;
  color: var(--text-secondary, #888);
  border: 1px solid var(--border-color, #333);
}

.component-edit-cancel:hover {
  background: var(--bg-hover, #2a2a4e);
  color: var(--text-primary, #fff);
}
`;
