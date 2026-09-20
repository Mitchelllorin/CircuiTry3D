import {
  CATALOG_COMPONENTS,
  CATALOG_DISCLAIMER,
  provenanceFor,
} from "../../data/componentCatalog";

/**
 * Every branded part in the catalog, each one saying where its figures came from.
 *
 * This listed three hard-coded manufacturers and only their source-backed
 * entries — 24 of 75 — so two thirds of the branded parts in the app had no
 * provenance surface anywhere, and the twenty-four other manufacturers were
 * absent from their own catalog. The blanket disclaimer rode on the optional
 * per-entry `simulation` field, so the entries that carried least also
 * disclaimed least.
 *
 * Both are unconditional now: the catalog is shown whole, and the disclaimer is
 * stated once for all of it. Source-backed entries sort first, so the strongest
 * evidence is what opens.
 */
const ENTRIES = CATALOG_COMPONENTS.map((component) => ({
  component,
  provenance: provenanceFor(component),
})).sort(
  (a, b) =>
    Number(b.provenance.sourceBacked) - Number(a.provenance.sourceBacked) ||
    a.component.manufacturer.localeCompare(b.component.manufacturer) ||
    a.component.name.localeCompare(b.component.name),
);

const SOURCE_BACKED = ENTRIES.filter((e) => e.provenance.sourceBacked).length;

export function ArenaCatalogReference() {
  return (
    <details className="arena-catalog-reference">
      <summary>Manufacturer catalog reference ({ENTRIES.length})</summary>
      <p>{CATALOG_DISCLAIMER}</p>
      <p className="arena-catalog-reference__count">
        {SOURCE_BACKED} of {ENTRIES.length} entries are entered from the
        manufacturer&apos;s own product page. The rest carry typical published
        figures and say so.
      </p>
      <div className="arena-catalog-reference__list">
        {ENTRIES.map(({ component, provenance }) => {
          /* Most unsourced entries keep their ordering code in `name`
             ("2N3904"), so printing both would print it twice. */
          const mpn = component.partNumber ?? component.name;
          return (
            <article key={component.id} className="arena-catalog-reference__item">
              <div>
                <small>{component.manufacturer}</small>
                <strong>{mpn}</strong>
                {component.name === mpn ? null : <span>{component.name}</span>}
                <small>{component.spec}</small>
              </div>
              <div className="arena-catalog-reference__meta">
                <span>
                  {provenance.status === "modeled"
                    ? "Modeled behavior"
                    : "Reference only"}
                </span>
                {component.source ? (
                  /* Was hard-coded "Official TE source" on every row, which
                     labelled Vishay and Littelfuse datasheets as TE's. The
                     publisher has always been on the source; use it. */
                  <a href={component.source.url} target="_blank" rel="noreferrer">
                    {component.source.publisher} source
                  </a>
                ) : (
                  <span className="arena-catalog-reference__unverified">
                    Unverified figures
                  </span>
                )}
              </div>
              <small className="arena-catalog-reference__note">
                {provenance.detail}
              </small>
            </article>
          );
        })}
      </div>
    </details>
  );
}
