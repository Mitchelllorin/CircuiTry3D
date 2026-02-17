import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  WIRE_INSULATION_CLASSES,
  WIRE_LIBRARY,
  WIRE_LIBRARY_SUMMARY,
  WIRE_MATERIALS,
  WIRE_MANUFACTURERS,
  getManufacturerForWire,
  filterWireLibrary,
  type WireInsulationId,
  type WireMaterialId,
  type WireMaterialSpec,
  type WireSpec,
} from "../../data/wireLibrary";
import { formatNumber } from "../../utils/electrical";
import { WireResourceBrand } from "./WireResourceBrand";

type MaterialOption = WireMaterialId | "any";
type InsulationOption = WireInsulationId | "any";
type CategoryOption = "conductor" | "resistance" | "specialty" | "any";
type WireLibraryLiveMetrics = {
  voltage: number;
  current: number;
  resistance: number | null;
  power: number;
  wireCount: number;
};

type WireLibraryProps = {
  activeWireId?: string | null;
  onApplyWire?: (wire: WireSpec) => void;
  onClearAppliedWire?: () => void;
  liveMetrics?: WireLibraryLiveMetrics | null;
};

const formatResistance = (value: number): string => {
  const digits = value < 1 ? 3 : 2;
  return `${formatNumber(value, digits)} Ω/km`;
};

const formatAmpacity = (freeAir: number, bundle: number): string =>
  `${formatNumber(freeAir, 1)} A / ${formatNumber(bundle, 1)} A`;

const formatThermal = (insulationLabel: string, maxTemperatureC: number): string =>
  `${insulationLabel} · ${maxTemperatureC} °C`;

const formatConductivity = (value: number): string => `${formatNumber(value, 1)} MS/m`;
const formatResistancePerMeter = (value: number): string =>
  `${formatNumber(value, value < 0.1 ? 4 : 3)} Ω/m`;

const filterIsDirty = (
  material: MaterialOption,
  insulation: InsulationOption,
  category: CategoryOption,
  minAmpacity: number,
  search: string,
): boolean =>
  material !== "any" || insulation !== "any" || category !== "any" || minAmpacity > 0 || Boolean(search.trim());

const getMaterialsByCategory = (category: CategoryOption): WireMaterialSpec[] => {
  if (category === "any") {
    return Object.values(WIRE_MATERIALS);
  }
  return Object.values(WIRE_MATERIALS).filter((m) => m.category === category);
};

const getCategoryLabel = (category: WireMaterialSpec["category"]): string => {
  switch (category) {
    case "conductor":
      return "Conductor";
    case "resistance":
      return "Resistance";
    case "specialty":
      return "Specialty";
    default:
      return category;
  }
};

const getCategoryDescription = (category: WireMaterialSpec["category"]): string => {
  switch (category) {
    case "conductor":
      return "Standard conductors optimized for low resistance and high current capacity";
    case "resistance":
      return "High-resistance alloys for heating elements and precision resistors";
    case "specialty":
      return "Special-purpose materials for demanding environments";
    default:
      return "";
  }
};

export default function WireLibrary({
  activeWireId = null,
  onApplyWire,
  onClearAppliedWire,
  liveMetrics = null,
}: WireLibraryProps = {}) {
  const [material, setMaterial] = useState<MaterialOption>("any");
  const [insulation, setInsulation] = useState<InsulationOption>("any");
  const [category, setCategory] = useState<CategoryOption>("any");
  const [minAmpacity, setMinAmpacity] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedWireId, setSelectedWireId] = useState<string | null>(activeWireId);

  // Filter materials based on selected category
  const availableMaterials = useMemo(() => getMaterialsByCategory(category), [category]);

  // Reset material selection if it's no longer valid for the category
  useEffect(() => {
    if (material !== "any") {
      const materialSpec = WIRE_MATERIALS[material];
      if (category !== "any" && materialSpec.category !== category) {
        setMaterial("any");
      }
    }
  }, [category, material]);

  useEffect(() => {
    if (activeWireId) {
      setSelectedWireId(activeWireId);
    }
  }, [activeWireId]);

  const filtered = useMemo(() => {
    // First filter by category at the material level
    let categoryFilteredWires = WIRE_LIBRARY;
    if (category !== "any") {
      const categoryMaterialIds = getMaterialsByCategory(category).map((m) => m.id);
      categoryFilteredWires = WIRE_LIBRARY.filter((w) =>
        categoryMaterialIds.includes(w.material as WireMaterialId)
      );
    }

    return filterWireLibrary(
      {
        material,
        insulationClass: insulation,
        minAmpacity,
        search,
      },
      categoryFilteredWires,
    );
  }, [material, insulation, category, minAmpacity, search]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedWireId !== null) {
        setSelectedWireId(null);
      }
      return;
    }

    if (!selectedWireId || !filtered.some((spec) => spec.id === selectedWireId)) {
      setSelectedWireId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedWireId]);

  const lowestResistance = useMemo(() => {
    if (!filtered.length) {
      return null;
    }
    return filtered.reduce((min, spec) => Math.min(min, spec.resistanceOhmPerKm), filtered[0].resistanceOhmPerKm);
  }, [filtered]);

  const highestAmpacity = useMemo(() => {
    if (!filtered.length) {
      return null;
    }
    return filtered.reduce((max, spec) => Math.max(max, spec.ampacityChassisA), filtered[0].ampacityChassisA);
  }, [filtered]);

  const resetFilters = () => {
    setMaterial("any");
    setInsulation("any");
    setCategory("any");
    setMinAmpacity(0);
    setSearch("");
  };

  const handleAmpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMinAmpacity(Number(event.target.value));
  };

  const sliderMax = Math.ceil(WIRE_LIBRARY_SUMMARY.maxAmpacity);
  const filtersActive = filterIsDirty(material, insulation, category, minAmpacity, search);
  const isBuilderWireIntegrationEnabled = typeof onApplyWire === "function";

  const activeWireSpec = useMemo(
    () => (activeWireId ? WIRE_LIBRARY.find((spec) => spec.id === activeWireId) ?? null : null),
    [activeWireId],
  );
  const selectedWire = useMemo(
    () => (selectedWireId ? WIRE_LIBRARY.find((spec) => spec.id === selectedWireId) ?? null : null),
    [selectedWireId],
  );
  const activeWireResistance = activeWireSpec?.resistanceOhmPerMeter ?? 0.01;
  const wireCount = Math.max(0, liveMetrics?.wireCount ?? 0);
  const selectedWirePreview = useMemo(() => {
    if (!selectedWire || !liveMetrics) {
      return null;
    }

    if (
      !Number.isFinite(liveMetrics.voltage) ||
      !Number.isFinite(liveMetrics.current) ||
      liveMetrics.resistance === null ||
      !Number.isFinite(liveMetrics.resistance)
    ) {
      return null;
    }

    const modelResistanceWithoutWire = Math.max(
      0,
      liveMetrics.resistance - wireCount * activeWireResistance,
    );
    const nextTotalResistance =
      modelResistanceWithoutWire + wireCount * selectedWire.resistanceOhmPerMeter;
    if (nextTotalResistance <= 0) {
      return null;
    }

    const nextCurrent = liveMetrics.voltage / nextTotalResistance;
    const nextPower = liveMetrics.voltage * nextCurrent;
    return {
      totalResistance: nextTotalResistance,
      current: nextCurrent,
      power: nextPower,
      wirePathResistance: wireCount * selectedWire.resistanceOhmPerMeter,
      deltaResistance: nextTotalResistance - liveMetrics.resistance,
      deltaCurrent: nextCurrent - liveMetrics.current,
      deltaPower: nextPower - liveMetrics.power,
    };
  }, [activeWireResistance, liveMetrics, selectedWire, wireCount]);
  const selectedWireAlreadyApplied =
    Boolean(selectedWire && activeWireSpec && selectedWire.id === activeWireSpec.id);
  const canApplySelectedWire =
    isBuilderWireIntegrationEnabled &&
    Boolean(selectedWire) &&
    !selectedWireAlreadyApplied;
  const selectionStatusCopy = useMemo(() => {
    if (!selectedWire) {
      return "Step 2: Select a wire row below to preview how it affects your circuit.";
    }
    if (selectedWireAlreadyApplied) {
      return `${selectedWire.gaugeLabel} is already active in the builder model.`;
    }
    return `${selectedWire.gaugeLabel} is selected. Review the preview, then apply it to the circuit.`;
  }, [selectedWire, selectedWireAlreadyApplied]);

  // Count wires by category for display
  const categoryCounts = useMemo(() => {
    const counts = { conductor: 0, resistance: 0, specialty: 0 };
    for (const wire of WIRE_LIBRARY) {
      const mat = WIRE_MATERIALS[wire.material as WireMaterialId];
      if (mat) {
        counts[mat.category]++;
      }
    }
    return counts;
  }, []);

  return (
    <section className="practice-wire-library" aria-labelledby="wire-library-title">
      <header className="wire-library-header">
        <div className="wire-library-brand-section">
          <WireResourceBrand size="md" />
        </div>
        <div>
          <h3 id="wire-library-title">Wire Gauge Library</h3>
          <p>
            Browse {WIRE_LIBRARY.length} conductor options across {Object.keys(WIRE_MATERIALS).length} materials
            with their conductivity, resistance, ampacity, and thermal envelopes.
            Use the filters to zero in on the leads that match your prototype or installation.
          </p>
        </div>
        <div className="wire-library-summary">
          <div>
            <span className="summary-label">Matches</span>
            <strong className="summary-value">{filtered.length}</strong>
          </div>
          <div>
            <span className="summary-label">Lowest Ω/km</span>
            <strong className="summary-value">
              {typeof lowestResistance === "number" ? formatResistance(lowestResistance) : "—"}
            </strong>
          </div>
          <div>
            <span className="summary-label">Peak free-air amps</span>
            <strong className="summary-value">
              {typeof highestAmpacity === "number" ? `${formatNumber(highestAmpacity, 0)} A` : "—"}
            </strong>
          </div>
        </div>
      </header>

      <section className="wire-library-quickstart" aria-label="Wire guide quick start">
        <h4>Quick start</h4>
        <ol>
          <li>Filter by category, material, insulation, or use-case search.</li>
          <li>Select a wire row to preview expected W.I.R.E. changes.</li>
          <li>Apply the selected wire to update the live circuit model.</li>
        </ol>
        <p className="wire-library-quickstart-status">{selectionStatusCopy}</p>
      </section>

      {isBuilderWireIntegrationEnabled && (
        <section className="wire-library-integration" aria-live="polite">
          <header className="wire-library-integration-header">
            <div>
              <strong>Step 3: Apply to live circuit</strong>
              <p>
                After you select a row, apply it here to update live W.I.R.E.
                values with that wire&apos;s resistance and ampacity profile.
              </p>
            </div>
            <span
              className={`wire-library-profile-chip${activeWireSpec ? " active" : ""}`}
            >
              {activeWireSpec ? "Applied to circuit" : "Default model active"}
            </span>
          </header>

          <div className="wire-library-integration-grid">
            <div>
              <span className="summary-label">Current wire model</span>
              <strong className="summary-value">
                {activeWireSpec ? activeWireSpec.gaugeLabel : "Default builder wire"}
              </strong>
              <p className="wire-library-integration-meta">
                Segment resistance: {formatResistancePerMeter(activeWireResistance)}
              </p>
            </div>
            <div>
              <span className="summary-label">Wired segments</span>
              <strong className="summary-value">{wireCount}</strong>
              <p className="wire-library-integration-meta">
                Estimated wire path:{" "}
                {`${formatNumber(activeWireResistance * wireCount, 4)} Ω`}
              </p>
            </div>
            <div>
              <span className="summary-label">Selected wire row</span>
              <strong className="summary-value">
                {selectedWire ? selectedWire.gaugeLabel : "Choose a wire"}
              </strong>
              <p className="wire-library-integration-meta">
                {selectedWire
                  ? `Resistance: ${formatResistancePerMeter(selectedWire.resistanceOhmPerMeter)}`
                  : "Select any row below to preview and apply"}
              </p>
            </div>
          </div>

          {selectedWirePreview && (
            <div className="wire-library-preview-card" role="status">
              <strong>Estimated change after apply</strong>
              <div className="wire-library-preview-grid">
                <span>
                  R: {formatNumber(selectedWirePreview.totalResistance, 4)} Ω (delta{" "}
                  {selectedWirePreview.deltaResistance >= 0 ? "+" : ""}
                  {formatNumber(selectedWirePreview.deltaResistance, 4)} Ω)
                </span>
                <span>
                  I: {formatNumber(selectedWirePreview.current, 4)} A (delta{" "}
                  {selectedWirePreview.deltaCurrent >= 0 ? "+" : ""}
                  {formatNumber(selectedWirePreview.deltaCurrent, 4)} A)
                </span>
                <span>
                  W: {formatNumber(selectedWirePreview.power, 4)} W (delta{" "}
                  {selectedWirePreview.deltaPower >= 0 ? "+" : ""}
                  {formatNumber(selectedWirePreview.deltaPower, 4)} W)
                </span>
              </div>
            </div>
          )}

          <div className="wire-library-integration-actions">
            <button
              type="button"
              className="wire-library-apply-btn"
              onClick={() => {
                if (selectedWire && onApplyWire) {
                  onApplyWire(selectedWire);
                }
              }}
              disabled={!canApplySelectedWire}
            >
              {selectedWireAlreadyApplied
                ? "Selected wire is already active"
                : "Apply selected wire to circuit"}
            </button>
            <button
              type="button"
              className="wire-library-default-btn"
              onClick={() => onClearAppliedWire?.()}
              disabled={!activeWireSpec || !onClearAppliedWire}
            >
              Revert to default wire model
            </button>
          </div>
        </section>
      )}

      <div className="wire-library-controls">
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as CategoryOption)}>
            <option value="any">All categories ({WIRE_LIBRARY.length})</option>
            <option value="conductor">Conductors ({categoryCounts.conductor})</option>
            <option value="resistance">Resistance wire ({categoryCounts.resistance})</option>
            <option value="specialty">Specialty ({categoryCounts.specialty})</option>
          </select>
        </label>

        <label>
          <span>Material</span>
          <select value={material} onChange={(event) => setMaterial(event.target.value as MaterialOption)}>
            <option value="any">All materials</option>
            {availableMaterials.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Insulation class</span>
          <select value={insulation} onChange={(event) => setInsulation(event.target.value as InsulationOption)}>
            <option value="any">All jackets</option>
            {Object.values(WIRE_INSULATION_CLASSES).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ampacity-filter">
          <span>Min ampacity (bundled)</span>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={1}
            value={minAmpacity}
            onChange={handleAmpacityChange}
            aria-valuemin={0}
            aria-valuemax={sliderMax}
            aria-valuenow={minAmpacity}
          />
          <span className="ampacity-value">{`${minAmpacity} A+`}</span>
        </label>

        <label className="wire-library-search">
          <span>Search gauges or use cases</span>
          <input
            type="search"
            placeholder="Try: battery lead, sensor wire, marine, high-temp"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <button type="button" onClick={resetFilters} disabled={!filtersActive} className="wire-library-reset">
          Reset filters
        </button>
      </div>

      {category !== "any" && (
        <div className="wire-category-info">
          <strong>{getCategoryLabel(category)}:</strong> {getCategoryDescription(category)}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="wire-library-empty">
          <p>No wires match those filters. Lower the ampacity floor or clear the search term.</p>
        </div>
      ) : (
        <div className="wire-library-table-wrapper">
          <table className="wire-library-table">
            <caption className="wire-library-table-caption">
              Select a wire profile to preview and apply it to the active circuit.
            </caption>
            <thead>
              <tr>
                <th scope="col">Gauge · Area</th>
                <th scope="col">Material · Conductivity</th>
                <th scope="col">Resistance @20 °C</th>
                <th scope="col">Ampacity (free / bundled)</th>
                <th scope="col">Thermal · Voltage</th>
                <th scope="col">Use cases</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((spec) => {
                const manufacturer = getManufacturerForWire(spec.id);
                const materialSpec = WIRE_MATERIALS[spec.material as WireMaterialId];
                const isSelected = selectedWireId === spec.id;
                const isActiveProfile = activeWireSpec?.id === spec.id;
                return (
                  <tr
                    key={spec.id}
                    data-category={materialSpec?.category}
                    data-selected={isSelected ? "true" : undefined}
                    data-active-profile={isActiveProfile ? "true" : undefined}
                  >
                    <th scope="row">
                      <div className="wire-row-actions">
                        <button
                          type="button"
                          className={`wire-row-select-btn${isSelected ? " selected" : ""}`}
                          onClick={() => setSelectedWireId(spec.id)}
                          aria-pressed={isSelected}
                          title={
                            isSelected
                              ? `${spec.gaugeLabel} selected`
                              : `Select ${spec.gaugeLabel}`
                          }
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                        {isActiveProfile && (
                          <span className="wire-row-active-chip">Active</span>
                        )}
                      </div>
                      <div className="wire-gauge-label">{spec.gaugeLabel}</div>
                      <div className="wire-gauge-meta">
                        {`${formatNumber(spec.metricAreaMm2, 2)} mm² · ${formatNumber(spec.diameterMm, 2)} mm Ø`}
                      </div>
                      {manufacturer && manufacturer.partnershipTier !== "none" && (
                        <div className="wire-manufacturer-badge">
                          {manufacturer.shortName}
                        </div>
                      )}
                    </th>
                    <td>
                      <div className="wire-material-label">{spec.materialLabel}</div>
                      <div className="wire-material-meta">{formatConductivity(spec.conductivityMsPerM)}</div>
                      {materialSpec && (
                        <div className="wire-material-category">
                          {getCategoryLabel(materialSpec.category)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{formatResistance(spec.resistanceOhmPerKm)}</div>
                      <div className="wire-material-meta">
                        {`${formatNumber(spec.resistanceOhmPerMeter, 5)} Ω/m`}
                      </div>
                    </td>
                    <td>
                      <div>{formatAmpacity(spec.ampacityChassisA, spec.ampacityBundleA)}</div>
                      <div className="wire-material-meta">Free air / in conduit</div>
                    </td>
                    <td>
                      <div>{formatThermal(spec.insulationLabel, spec.maxTemperatureC)}</div>
                      <div className="wire-material-meta">{`${spec.maxVoltageV} V rating`}</div>
                    </td>
                    <td>
                      <ul className="wire-uses">
                        {spec.recommendedUses.map((use) => (
                          <li key={use}>{use}</li>
                        ))}
                      </ul>
                      {spec.notes ? <p className="wire-notes">{spec.notes}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="wire-library-footer">
        <p className="wire-library-disclaimer">
          Wire specifications are for educational reference. Always consult manufacturer datasheets
          and local electrical codes for actual installations.
        </p>
        <div className="wire-library-stats">
          <span>{Object.keys(WIRE_MATERIALS).length} materials</span>
          <span>{Object.keys(WIRE_INSULATION_CLASSES).length} insulation types</span>
          <span>{Object.keys(WIRE_MANUFACTURERS).length - 1} manufacturers</span>
        </div>
      </div>
    </section>
  );
}
