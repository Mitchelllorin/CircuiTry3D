import type { SymbolStandard } from "../../../schematic/standards";
import { SYMBOL_STANDARD_OPTIONS } from "../../../schematic/standards";
import { BuilderModeView } from "../../../pages/SchematicMode";
import BrandMark from "../../BrandMark";

interface SchematicPanelProps {
  isOpen: boolean;
  onClose: () => void;
  schematicStandard: SymbolStandard;
  onSchematicStandardChange: (standard: SymbolStandard) => void;
}

export function SchematicPanel({
  isOpen,
  onClose,
  schematicStandard,
  onSchematicStandardChange,
}: SchematicPanelProps) {
  const schematicStandardLabel =
    SYMBOL_STANDARD_OPTIONS.find((option) => option.key === schematicStandard)
      ?.label ?? "ANSI/IEEE";

  const handleOverlayClick = () => {
    onClose();
  };

  const handleShellClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`builder-panel-overlay builder-panel-overlay--schematic${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={handleOverlayClick}
    >
      <div
        className="builder-panel-shell builder-panel-shell--schematic"
        onClick={handleShellClick}
      >
        <div className="builder-panel-brand" aria-hidden="true">
          <BrandMark size="sm" decorative />
        </div>
        <button
          type="button"
          className="builder-panel-close"
          onClick={onClose}
          aria-label="Close schematic builder"
        >
          X
        </button>
        <div className="builder-panel-body builder-panel-body--schematic">
          <div className="schematic-overlay-header">
            <div>
              <h2>3D Schematic Builder</h2>
              <p>
                Using {schematicStandardLabel} symbol profiles. Toggle standards
                to match your textbook layout.
              </p>
            </div>
            <div
              className="schematic-standard-control"
              role="group"
              aria-label="Schematic symbol standard"
            >
              <span className="schematic-standard-label">Symbol Standard</span>
              <div className="schematic-standard-buttons">
                {SYMBOL_STANDARD_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={
                      schematicStandard === option.key
                        ? "schematic-standard-button is-active"
                        : "schematic-standard-button"
                    }
                    onClick={() => onSchematicStandardChange(option.key)}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <BuilderModeView symbolStandard={schematicStandard} />
        </div>
      </div>
    </div>
  );
}
