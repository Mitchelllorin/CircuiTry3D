import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  WIRE_INSULATION_CLASSES,
  WIRE_LIBRARY,
  WIRE_LIBRARY_SUMMARY,
  WIRE_MATERIALS,
  filterWireLibrary,
  type WireInsulationId,
  type WireMaterialId,
} from "../../data/wireLibrary";
import { formatNumber } from "../../utils/electrical";

type MaterialOption = WireMaterialId | "any";
type InsulationOption = WireInsulationId | "any";

const formatResistance = (value: number): string => {
  const digits = value < 1 ? 3 : 2;
  return `${formatNumber(value, digits)} Ω/km`;
};

const formatAmpacity = (freeAir: number, bundle: number): string =>
  `${formatNumber(freeAir, 1)} A / ${formatNumber(bundle, 1)} A`;

const formatThermal = (insulationLabel: string, maxTemperatureC: number): string =>
  `${insulationLabel} · ${maxTemperatureC} °C`;

const formatConductivity = (value: number): string => `${formatNumber(value, 1)} MS/m`;

const filterIsDirty = (
  material: MaterialOption,
  insulation: InsulationOption,
  minAmpacity: number,
  search: string,
): boolean =>
  material !== "any" || insulation !== "any" || minAmpacity > 0 || Boolean(search.trim());

export default function WireLibrary() {
  const [material, setMaterial] = useState<MaterialOption>("any");
  const [insulation, setInsulation] = useState<InsulationOption>("any");
  const [minAmpacity, setMinAmpacity] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      filterWireLibrary(
        {
          material,
          insulationClass: insulation,
          minAmpacity,
          search,
        },
        WIRE_LIBRARY,
      ),
    [material, insulation, minAmpacity, search],
  );

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
    setMinAmpacity(0);
    setSearch("");
  };

  const handleAmpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMinAmpacity(Number(event.target.value));
  };

  const sliderMax = Math.ceil(WIRE_LIBRARY_SUMMARY.maxAmpacity);
  const filtersActive = filterIsDirty(material, insulation, minAmpacity, search);

  return (
    <section className="practice-wire-library" aria-labelledby="wire-library-title">
      <header className="wire-library-header">
        <div>
          <h3 id="wire-library-title">Wire Gauge Library</h3>
          <p>
            Browse conductor options with their conductivity, resistance, ampacity, and thermal envelopes.
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
          <span>Material</span>
          <select value={material} onChange={(event) => setMaterial(event.target.value as MaterialOption)}>
            <option value="any">All materials</option>
            {Object.values(WIRE_MATERIALS).map((option) => (
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
            placeholder="ex: battery, solar, sensor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <button type="button" onClick={resetFilters} disabled={!filtersActive} className="wire-library-reset">
          Reset
        </button>
      </div>

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
                <th scope="col">Resistance @20 °C</th>
                <th scope="col">Ampacity (free / bundled)</th>
                <th scope="col">Thermal · Voltage</th>
                <th scope="col">Use cases</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((spec) => (
                <tr key={spec.id}>
                  <th scope="row">
                    <div className="wire-gauge-label">{spec.gaugeLabel}</div>
                    <div className="wire-gauge-meta">
                      {`${formatNumber(spec.metricAreaMm2, 2)} mm² · ${formatNumber(spec.diameterMm, 2)} mm Ø`}
                    </div>
                  </th>
                  <td>
                    <div className="wire-material-label">{spec.materialLabel}</div>
                    <div className="wire-material-meta">{formatConductivity(spec.conductivityMsPerM)}</div>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
