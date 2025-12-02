/**
 * Circuit Load Modal
 * Modal dialog for loading saved circuits with list, delete, import, and export.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { CircuitIndexEntry, StorageResult } from "../../../services/circuitStorage";
import type { SavedCircuit } from "../../../services/circuitSerializer";

interface CircuitLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (id: string) => StorageResult<SavedCircuit>;
  onDelete: (id: string) => StorageResult<void>;
  onDuplicate: (id: string) => StorageResult<SavedCircuit>;
  onRename: (id: string, newName: string) => StorageResult<SavedCircuit>;
  onExport: (format: "circuit3d" | "json") => void;
  onImport: (file: File) => Promise<StorageResult<SavedCircuit>>;
  onNewCircuit: () => void;
  savedCircuits: CircuitIndexEntry[];
  currentCircuitId?: string | null;
  hasUnsavedChanges: boolean;
}

export function CircuitLoadModal({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  onDuplicate,
  onRename,
  onExport,
  onImport,
  onNewCircuit,
  savedCircuits,
  currentCircuitId,
  hasUnsavedChanges,
}: CircuitLoadModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setError(null);
      setConfirmDelete(null);
      setRenameId(null);
      setRenameValue("");
      setIsImporting(false);
    }
  }, [isOpen]);

  const handleLoad = useCallback(() => {
    if (!selectedId) {
      setError("Please select a circuit to load");
      return;
    }

    if (hasUnsavedChanges) {
      const proceed = window.confirm(
        "You have unsaved changes. Loading a new circuit will discard them. Continue?"
      );
      if (!proceed) {
        return;
      }
    }

    const result = onLoad(selectedId);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }, [selectedId, hasUnsavedChanges, onLoad, onClose]);

  const handleDelete = useCallback((id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }

    const result = onDelete(id);
    if (result.ok) {
      setConfirmDelete(null);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } else {
      setError(result.error);
    }
  }, [confirmDelete, selectedId, onDelete]);

  const handleDuplicate = useCallback((id: string) => {
    const result = onDuplicate(id);
    if (!result.ok) {
      setError(result.error);
    }
  }, [onDuplicate]);

  const handleRenameStart = useCallback((id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (!renameId || !renameValue.trim()) {
      setRenameId(null);
      return;
    }

    const result = onRename(renameId, renameValue.trim());
    if (result.ok) {
      setRenameId(null);
      setRenameValue("");
    } else {
      setError(result.error);
    }
  }, [renameId, renameValue, onRename]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (hasUnsavedChanges) {
      const proceed = window.confirm(
        "You have unsaved changes. Importing a circuit will discard them. Continue?"
      );
      if (!proceed) {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
    }

    setIsImporting(true);
    setError(null);

    const result = await onImport(file);

    setIsImporting(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }, [hasUnsavedChanges, onImport, onClose]);

  const handleNewCircuit = useCallback(() => {
    if (hasUnsavedChanges) {
      const proceed = window.confirm(
        "You have unsaved changes. Creating a new circuit will discard them. Continue?"
      );
      if (!proceed) {
        return;
      }
    }

    onNewCircuit();
    onClose();
  }, [hasUnsavedChanges, onNewCircuit, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      if (confirmDelete) {
        setConfirmDelete(null);
      } else if (renameId) {
        setRenameId(null);
      } else {
        onClose();
      }
    }
  }, [confirmDelete, renameId, onClose]);

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="circuit-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-modal-title"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="circuit-modal-content circuit-load-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="circuit-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <h2 id="load-modal-title" className="circuit-modal-title">
          My Circuits
        </h2>

        <div className="circuit-load-toolbar">
          <button
            type="button"
            className="circuit-btn circuit-btn-outline"
            onClick={handleNewCircuit}
          >
            + New Circuit
          </button>
          <button
            type="button"
            className="circuit-btn circuit-btn-outline"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import File"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".circuit3d,.json"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {error && (
          <div className="circuit-modal-error" role="alert">
            {error}
          </div>
        )}

        {savedCircuits.length === 0 ? (
          <div className="circuit-load-empty">
            <div className="empty-icon">&#9889;</div>
            <p>No saved circuits yet</p>
            <p className="empty-hint">Start building and save your first circuit!</p>
          </div>
        ) : (
          <div className="circuit-list" role="listbox" aria-label="Saved circuits">
            {savedCircuits.map((circuit) => (
              <div
                key={circuit.id}
                className={`circuit-list-item ${selectedId === circuit.id ? "selected" : ""} ${
                  currentCircuitId === circuit.id ? "current" : ""
                }`}
                role="option"
                aria-selected={selectedId === circuit.id}
                onClick={() => setSelectedId(circuit.id)}
                onDoubleClick={() => {
                  setSelectedId(circuit.id);
                  handleLoad();
                }}
              >
                <div className="circuit-item-main">
                  {renameId === circuit.id ? (
                    <input
                      type="text"
                      className="circuit-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRenameSubmit();
                        } else if (e.key === "Escape") {
                          setRenameId(null);
                        }
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="circuit-item-name">
                      {circuit.name}
                      {currentCircuitId === circuit.id && (
                        <span className="current-badge">Current</span>
                      )}
                    </span>
                  )}
                  <span className="circuit-item-meta">
                    {circuit.componentCount} components, {circuit.wireCount} wires
                  </span>
                  <span className="circuit-item-date">{formatDate(circuit.updatedAt)}</span>
                </div>

                <div className="circuit-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="circuit-action-btn"
                    onClick={() => handleRenameStart(circuit.id, circuit.name)}
                    title="Rename"
                    aria-label={`Rename ${circuit.name}`}
                  >
                    &#9998;
                  </button>
                  <button
                    type="button"
                    className="circuit-action-btn"
                    onClick={() => handleDuplicate(circuit.id)}
                    title="Duplicate"
                    aria-label={`Duplicate ${circuit.name}`}
                  >
                    &#10697;
                  </button>
                  <button
                    type="button"
                    className={`circuit-action-btn danger ${confirmDelete === circuit.id ? "confirm" : ""}`}
                    onClick={() => handleDelete(circuit.id)}
                    title={confirmDelete === circuit.id ? "Click again to confirm" : "Delete"}
                    aria-label={`Delete ${circuit.name}`}
                  >
                    {confirmDelete === circuit.id ? "?" : "&#10006;"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="circuit-modal-actions">
          <div className="action-group-left">
            {currentCircuitId && (
              <button
                type="button"
                className="circuit-btn circuit-btn-outline"
                onClick={() => onExport("circuit3d")}
                title="Export current circuit"
              >
                Export
              </button>
            )}
          </div>
          <div className="action-group-right">
            <button
              type="button"
              className="circuit-btn circuit-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="circuit-btn circuit-btn-primary"
              onClick={handleLoad}
              disabled={!selectedId}
            >
              Load Circuit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
