/**
 * Circuit Save Modal
 * Modal dialog for saving the current circuit.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { CircuitState, SavedCircuit } from "../../../services/circuitSerializer";
import type { StorageResult } from "../../../services/circuitStorage";
import BrandMark from "../../BrandMark";

interface CircuitSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string, tags?: string[]) => StorageResult<SavedCircuit>;
  currentCircuit?: SavedCircuit | null;
  circuitState: CircuitState | null;
}

export function CircuitSaveModal({
  isOpen,
  onClose,
  onSave,
  currentCircuit,
  circuitState,
}: CircuitSaveModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(currentCircuit?.metadata.name || "");
      setDescription(currentCircuit?.metadata.description || "");
      setTagsInput(currentCircuit?.metadata.tags?.join(", ") || "");
      setError(null);
      setIsSaving(false);
      // Focus the input after a short delay
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentCircuit]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Please enter a circuit name");
      return;
    }

    if (!circuitState) {
      setError("No circuit state to save");
      return;
    }

    setIsSaving(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const result = onSave(
      name.trim(),
      description.trim() || undefined,
      tags.length > 0 ? tags : undefined
    );

    setIsSaving(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }, [name, description, tagsInput, circuitState, onSave, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  const isUpdate = Boolean(currentCircuit);
  const componentCount = circuitState?.components.length || 0;
  const wireCount = circuitState?.wires.length || 0;

  return (
    <div
      className="circuit-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="circuit-modal-content circuit-save-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="circuit-modal-brand" aria-hidden="true">
          <BrandMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="circuit-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <h2 id="save-modal-title" className="circuit-modal-title">
          {isUpdate ? "Update Circuit" : "Save Circuit"}
        </h2>

        <div className="circuit-save-summary">
          <span className="summary-item">
            <span className="summary-icon">&#9889;</span>
            {componentCount} components
          </span>
          <span className="summary-item">
            <span className="summary-icon">&#9866;</span>
            {wireCount} wires
          </span>
        </div>

        <form onSubmit={handleSubmit} className="circuit-save-form">
          <div className="form-field">
            <label htmlFor="circuit-name">Circuit Name *</label>
            <input
              ref={inputRef}
              id="circuit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Circuit"
              maxLength={100}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="circuit-description">Description</label>
            <textarea
              id="circuit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your circuit (optional)"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="form-field">
            <label htmlFor="circuit-tags">Tags</label>
            <input
              id="circuit-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="series, homework, led (comma-separated)"
              maxLength={200}
            />
          </div>

          {error && (
            <div className="circuit-modal-error" role="alert">
              {error}
            </div>
          )}

          <div className="circuit-modal-actions">
            <button
              type="button"
              className="circuit-btn circuit-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="circuit-btn circuit-btn-primary"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? "Saving..." : isUpdate ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
