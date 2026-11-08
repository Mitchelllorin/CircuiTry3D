import { useEffect } from "react";
import type { ThermalReport } from "./thermalModel";

function fmtW(watts: number): string {
  if (!Number.isFinite(watts)) return "—";
  if (watts >= 1) return `${watts.toFixed(2)} W`;
  if (watts >= 0.01) return `${watts.toFixed(3)} W`;
  return `${(watts * 1000).toFixed(0)} mW`;
}

function fmtC(celsius: number): string {
  return Number.isFinite(celsius) ? `${Math.round(celsius)} °C` : "—";
}

function fmtOhms(ohms: number): string {
  if (!Number.isFinite(ohms)) return "—";
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(2)} MΩ`;
  if (ohms >= 1000) return `${(ohms / 1000).toFixed(2)} kΩ`;
  return `${ohms.toFixed(ohms < 10 ? 2 : 0)} Ω`;
}

/**
 * The arithmetic behind the console's margin strip.
 *
 * A transient sheet the user opens, so it may be as solid as legibility wants —
 * and it is the one place in the arena where a formula gets written down with
 * live numbers in it. "Derating" and "temperature coefficient" are words on a
 * datasheet that most people have never had resolved into an actual sum; here
 * they resolve against the part in front of you.
 *
 * Three equations, in the order they matter:
 *
 *   P(Ta) = P(25 °C) × (Tjmax − Ta) / (Tjmax − 25)   what the rating becomes
 *   R(T)  = R₀ × (1 + α·(T − 25))                   what the part becomes
 *   T     = Ta + P × θ                               how hot it ends up
 *
 * Only the first is on the console strip, because it is the one that answers
 * "how much margin is left". The other two explain the answer.
 */
export function ArenaThermalSheet({
  report,
  onClose,
}: {
  report: ThermalReport;
  onClose: () => void;
}) {
  // Escape and a tap anywhere else both put it away. A sheet you can only close
  // with its own tiny X is a sheet that stays on the screen.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.(".arena-thermal, .arena-dash")) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  const steadyTempC = report.ambientC + report.riseC;
  const headroom = report.limitC - report.ambientC;
  const stateWord =
    report.state === "over" ? "Past the limit" : report.state === "warn" ? "Closing on the limit" : "Inside the limit";

  return (
    <aside
      className="arena-thermal"
      role="dialog"
      aria-label={`Thermal margin for ${report.name}`}
    >
      <header className="arena-thermal__head">
        <div>
          <p className="arena-thermal__eyebrow">Thermal margin</p>
          <h3 className="arena-thermal__name">{report.name}</h3>
        </div>
        <button
          type="button"
          className="arena-thermal__close"
          onClick={onClose}
          aria-label="Close thermal detail"
        >
          ✕
        </button>
      </header>

      <p className={`arena-thermal__verdict arena-thermal__verdict--${report.state}`}>
        {stateWord} — {report.utilisationPct.toFixed(0)}% of the rating it still has
        at {fmtC(report.ambientC)}.
      </p>

      <section className="arena-thermal__block">
        <h4 className="arena-thermal__title">Derating</h4>
        <p className="arena-thermal__eq">
          P<sub>Ta</sub> = P<sub>rated</sub> × (T<sub>max</sub> − T<sub>a</sub>) / (T
          <sub>max</sub> − T<sub>knee</sub>)
        </p>
        <p className="arena-thermal__eq">
          {fmtW(report.ratedW)} × ({fmtC(report.deratingCeilingC)} −{" "}
          {fmtC(report.ambientC)}) / ({fmtC(report.deratingCeilingC)} −{" "}
          {fmtC(report.deratingKneeC)}) = <b>{fmtW(report.deratedW)}</b>
        </p>
        <p className="arena-thermal__note">
          T<sub>max</sub> is {fmtC(report.deratingCeilingC)} —{" "}
          {report.deratingBasis === "ambient"
            ? "the part's own rated maximum ambient."
            : `the ${report.family} family's junction limit, because this part declares no maximum ambient.`}
        </p>
        <p className="arena-thermal__note">
          {report.deratingKneeC > 25
            ? "The knee is the maker's own: this part holds its nameplate rating to "
            : "The nameplate rating only holds at "}
          {fmtC(report.deratingKneeC)}. Here it is allowed{" "}
          {fmtW(report.deratedW)} of its {fmtW(report.ratedW)} —{" "}
          {headroom > 0
            ? `${Math.round((1 - report.deratedW / Math.max(report.ratedW, 1e-9)) * 100)}% of it is gone before the run starts.`
            : "at this ambient it has no continuous rating at all."}
        </p>
      </section>

      {report.tempcoPpm != null ? (
        <section className="arena-thermal__block">
          <h4 className="arena-thermal__title">Temperature coefficient</h4>
          <p className="arena-thermal__eq">
            R<sub>T</sub> = R<sub>0</sub> × (1 + α × (T − 25 °C))
          </p>
          <p className="arena-thermal__eq">
            {fmtOhms(report.ohmsNominal)} × (1 + {(report.tempcoPpm / 1e6).toFixed(6)}{" "}
            /°C × ({fmtC(report.tempC)} − 25 °C)) = <b>{fmtOhms(report.ohmsHot)}</b>
          </p>
          <p className="arena-thermal__note">
            α is {report.tempcoPpm.toFixed(0)} ppm/°C for this family. At{" "}
            {fmtC(report.tempC)} the part is{" "}
            {report.ohmsHot >= report.ohmsNominal ? "higher" : "lower"} in resistance
            than its nameplate by{" "}
            {fmtOhms(Math.abs(report.ohmsHot - report.ohmsNominal))} (
            {(
              Math.abs(report.ohmsHot - report.ohmsNominal) /
              Math.max(report.ohmsNominal, 1e-9) *
              100
            ).toFixed(1)}
            %). On a resistive part that moves the current it draws; on a winding it
            is why a hot motor pulls less than a cold one.
          </p>
        </section>
      ) : null}

      <section className="arena-thermal__block">
        <h4 className="arena-thermal__title">Self-heating</h4>
        <p className="arena-thermal__eq">
          T<sub>j</sub> = T<sub>a</sub> + P × θ
        </p>
        <p className="arena-thermal__eq">
          {fmtC(report.ambientC)} + {fmtW(report.actualW)} ×{" "}
          {report.thetaCPerW.toFixed(0)} °C/W = <b>{fmtC(steadyTempC)}</b>
        </p>
        <p className="arena-thermal__note">
          θ is the part's own thermal resistance, already multiplied by this
          scenario's cooling. Steady state is {fmtC(steadyTempC)}; the part is at{" "}
          {fmtC(report.tempC)} now, {fmtC(report.riseC)} above ambient, and its limit
          is {fmtC(report.limitC)} —{" "}
          <b>
            {report.marginC >= 0
              ? `${fmtC(report.marginC)} of margin left`
              : `${fmtC(Math.abs(report.marginC))} over`}
          </b>
          .
        </p>
        <p className="arena-thermal__note">
          Dissipating {fmtW(report.actualW)} at {report.powerFactor.toFixed(2)}× rated
          load.
        </p>
      </section>

      {report.state === "over" ? (
        <p className="arena-thermal__advice">
          Either drop the load until the wattage is back under{" "}
          {fmtW(report.deratedW)}, or fit a part rated higher for{" "}
          {fmtC(report.ambientC)} — a bigger package has a lower θ and derates later.
        </p>
      ) : null}
    </aside>
  );
}
