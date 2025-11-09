import { Fragment } from "react";
import type { HelpModalView, HelpSection, HelpLegendItem } from "../types";
import { WIRE_LEGEND } from "../constants";

interface HelpModalProps {
  isOpen: boolean;
  helpView: HelpModalView;
  helpSectionRefs: React.MutableRefObject<Record<string, HTMLDivElement>>;
  onClose: () => void;
  onOpenHelpCenter: (view: HelpModalView, sectionTitle?: string) => void;
  helpViewContent: Record<
    HelpModalView,
    {
      title: string;
      description?: string;
      sections: HelpSection[];
      showLegend?: boolean;
    }
  >;
  helpSections: HelpSection[];
}

export function HelpModal({
  isOpen,
  helpView,
  helpSectionRefs,
  onClose,
  onOpenHelpCenter,
  helpViewContent,
  helpSections,
}: HelpModalProps) {
  const renderHelpParagraph = (paragraph: string, key: string) => {
    const trimmed = paragraph.trim();
    if (
      trimmed.startsWith("```") &&
      trimmed.endsWith("```") &&
      trimmed.length >= 6
    ) {
      const content = trimmed.slice(3, -3).trimEnd();
      return (
        <pre key={key} className="help-code">
          {content}
        </pre>
      );
    }

    const lines = paragraph.split("\n");
    return (
      <p key={key}>
        {lines.map((line, lineIndex) => (
          <Fragment key={`${key}-line-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
    );
  };

  const activeHelpContent = helpViewContent[helpView];

  return (
    <div
      className={`builder-help-modal ${isOpen ? "open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div
        className="builder-help-content"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="help-close"
          onClick={onClose}
          aria-label="Close help"
        >
          X
        </button>
        {helpView !== "overview" && (
          <button
            type="button"
            className="help-back"
            onClick={() => onOpenHelpCenter("overview")}
            aria-label="Back to CircuiTry3D help overview"
          >
            {"< Back"}
          </button>
        )}
        <h2 className="help-title">{activeHelpContent.title}</h2>
        {activeHelpContent.description && (
          <p className="help-description">{activeHelpContent.description}</p>
        )}
        {helpView === "overview" && (
          <div
            className="help-nav"
            role="navigation"
            aria-label="Help section shortcuts"
          >
            {helpSections.map((section) => (
              <button
                key={section.title}
                type="button"
                className="help-nav-btn"
                onClick={() => onOpenHelpCenter("overview", section.title)}
              >
                {section.title}
              </button>
            ))}
          </div>
        )}
        {activeHelpContent.sections.map((section) => (
          <div
            key={`${helpView}-${section.title}`}
            className="help-section"
            ref={
              helpView === "overview"
                ? (element) => {
                    if (element) {
                      helpSectionRefs.current[section.title] = element;
                    } else {
                      delete helpSectionRefs.current[section.title];
                    }
                  }
                : undefined
            }
          >
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph, paragraphIndex) =>
              renderHelpParagraph(
                paragraph,
                `${section.title}-p-${paragraphIndex}`,
              ),
            )}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={`${section.title}-b-${bulletIndex}`}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {activeHelpContent.showLegend && (
          <div className="wire-legend">
            {WIRE_LEGEND.map((legend) => (
              <div
                key={legend.id}
                className={`legend-item ${legend.letter.toLowerCase()}`}
              >
                <div className="legend-letter">{legend.letter}</div>
                <div className="legend-label">{legend.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
