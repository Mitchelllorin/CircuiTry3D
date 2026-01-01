import { useMemo, useState } from "react";
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
} from "../../data/wireLibrary";
import { formatNumber } from "../../utils/electrical";
import { WireResourceBrand } from "./WireResourceBrand";

type MaterialOption = WireMaterialId | "any";
type InsulationOption = WireInsulationId | "any";
type CategoryOption = "conductor" | "resistance" | "specialty" | "any";

const formatResistance = (value: number): string => {
  const digits = value < 1 ? 3 : 2;
  return `${formatNumber(value, digits)} Ω/km`;
};

const formatAmpacity = (freeAir: number, bundle: number): string =>
  `${formatNumber(freeAir, 1)} A / ${formatNumber(bundle, 1)} A`;

const formatThermal = (insulationLabel: string, maxTemperatureC: number): string =>
  `${insulationLabel} · ${maxTemperatureC} °C`;

const formatConductivity = (value: number): string => `${formatNumber(value, 1)} MS/m`;

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

export default function WireLibrary() {
  const [material, setMaterial] = useState<MaterialOption>("any");
  const [insulation, setInsulation] = useState<InsulationOption>("any");
  const [category, setCategory] = useState<CategoryOption>("any");
  const [minAmpacity, setMinAmpacity] = useState(0);
  const [search, setSearch] = useState("");

  // Filter materials based on selected category
  const availableMaterials = useMemo(() => getMaterialsByCategory(category), [category]);

  // Reset material selection if it's no longer valid for the category
  useMemo(() => {
    if (material !== "any") {
      const materialSpec = WIRE_MATERIALS[material];
      if (category !== "any" && materialSpec.category !== category) {
        setMaterial("any");
      }
    }
  }, [category, material]);

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
            placeholder="ex: battery, solar, sensor, marine"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <button type="button" onClick={resetFilters} disabled={!filtersActive} className="wire-library-reset">
          Reset
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
                return (
                  <tr key={spec.id} data-category={materialSpec?.category}>
                    <th scope="row">
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
