import { useId, useState } from "react";
import type { CatalogEntry } from "../../schematic/types";

export type ComponentDrawerProps = {
  entries: CatalogEntry[];
  selectedId?: string | null;
  onSelect?: (entry: CatalogEntry) => void;
  placement?: "left" | "right";
  title?: string;
  description?: string;
  defaultOpen?: boolean;
  autoCloseOnSelect?: boolean;
};

export function ComponentDrawer({
  entries,
  selectedId = null,
  onSelect,
  placement = "left",
  title = "Component Catalog",
  description,
  defaultOpen = false,
  autoCloseOnSelect = false,
}: ComponentDrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  const toggleDrawer = () => {
    setIsOpen((previous) => !previous);
  };

  const handleSelect = (entry: CatalogEntry) => {
    onSelect?.(entry);
    if (autoCloseOnSelect) {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={`schematic-component-drawer ${placement} ${isOpen ? "is-open" : ""}`}
      data-open={isOpen ? "true" : undefined}
    >
      <button
        type="button"
        className="component-drawer-toggle"
        onClick={toggleDrawer}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="toggle-label">Components</span>
        <span className="toggle-icon" aria-hidden="true">
          {isOpen ? "×" : "≡"}
        </span>
      </button>
      <div
        id={panelId}
        className="component-drawer-panel"
        role="region"
        aria-hidden={!isOpen}
      >
        <header className="component-drawer-header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            type="button"
            className="component-drawer-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close component catalog"
          >
            ×
          </button>
        </header>

        <div className="component-drawer-content" role="list">
          {entries.map((entry) => {
            const active = entry.id === selectedId;
            return (
              <button
                key={entry.id}
                type="button"
                role="listitem"
                className={active ? "component-drawer-entry is-selected" : "component-drawer-entry"}
                onClick={() => handleSelect(entry)}
                aria-pressed={active}
              >
                <span className="entry-icon" aria-hidden="true">
                  {entry.icon}
                </span>
                <span className="entry-body">
                  <span className="entry-name">{entry.name}</span>
                  <span className="entry-description">{entry.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ComponentDrawer;
