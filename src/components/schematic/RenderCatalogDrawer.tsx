import { useEffect } from "react";

import type { PracticeProblem, PracticeTopology } from "../../model/practice";

export type RenderCatalogEntry = {
  id: string;
  title: string;
  topologyLabel: string;
  difficultyLabel: string;
  tags: string[];
  summary: string;
  target: string;
};

export type RenderCatalogSection = {
  key: PracticeTopology;
  label: string;
  items: RenderCatalogEntry[];
};

type RenderCatalogDrawerProps = {
  open: boolean;
  isDesktop: boolean;
  sections: RenderCatalogSection[];
  selectedProblemId: PracticeProblem["id"] | null;
  onSelect: (problemId: PracticeProblem["id"]) => void;
  onClose: () => void;
};

export function RenderCatalogDrawer({
  open,
  isDesktop,
  sections,
  selectedProblemId,
  onSelect,
  onClose,
}: RenderCatalogDrawerProps) {
  useEffect(() => {
    if (isDesktop || typeof document === "undefined") {
      return;
    }

    if (!open) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open, isDesktop]);

  if (!sections.length) {
    return null;
  }

  return (
    <aside
      className="schematic-sidebar render-catalog"
      data-open={open || isDesktop ? "true" : undefined}
      aria-hidden={!isDesktop && !open ? "true" : undefined}
    >
      <div className="render-catalog-header">
        <div>
          <h2>3D Render Catalog</h2>
          <p className="render-catalog-support">
            Browse every interactive schematic render. Select one to load the 3D scene in the viewport.
          </p>
        </div>
        {!isDesktop && (
          <button
            type="button"
            className="render-catalog-close"
            onClick={onClose}
            aria-label="Close render catalog"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="render-catalog-scroll" role="list">
        {sections.map((section) => (
          <section key={section.key} className="render-catalog-group" aria-labelledby={`render-group-${section.key}`}>
            <div className="render-catalog-group-header">
              <h3 id={`render-group-${section.key}`}>{section.label}</h3>
              <span className="render-catalog-count">{section.items.length}</span>
            </div>
            <div className="render-catalog-list" role="group" aria-label={`${section.label} renders`}>
              {section.items.map((item) => {
                const isActive = item.id === selectedProblemId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={isActive ? "render-catalog-item is-selected" : "render-catalog-item"}
                    data-active={isActive ? "true" : undefined}
                    onClick={() => onSelect(item.id)}
                  >
                    <div className="render-catalog-item-header">
                      <strong>{item.title}</strong>
                      <span className="render-catalog-pill">{item.difficultyLabel}</span>
                    </div>
                    <p className="render-catalog-summary">{item.summary}</p>
                    <div className="render-catalog-tags" aria-hidden="true">
                      <span className="render-catalog-badge">{item.topologyLabel}</span>
                      {item.tags.map((tag) => (
                        <span key={tag} className="render-catalog-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="render-catalog-target">{item.target}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

export default RenderCatalogDrawer;
