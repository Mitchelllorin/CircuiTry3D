import { getManufacturerCatalogComponents } from "../../data/componentCatalog";

const MANUFACTURER_CATALOGS = ["TE Connectivity", "Littelfuse", "Vishay"].map(
  (manufacturer) => ({
    manufacturer,
    components: getManufacturerCatalogComponents(manufacturer).filter(
      (component) => component.source,
    ),
  }),
);

const SOURCE_BACKED_COMPONENTS = MANUFACTURER_CATALOGS.flatMap(
  (catalog) => catalog.components,
);

/**
 * Facts that belong in the catalog but must not be turned into a pretend circuit
 * model are still visible beside the Arena picker. A reference-only card never
 * reaches the roster or F.U.S.E.; users get its provenance and its limitation.
 */
export function ArenaCatalogReference() {
  return (
    <details className="arena-catalog-reference">
      <summary>
        Manufacturer catalog reference ({SOURCE_BACKED_COMPONENTS.length})
      </summary>
      <p>
        Source-backed product facts. “Modeled” uses CircuiTry3D&apos;s generic
        educational behavior; it is not manufacturer certification or endorsement.
      </p>
      <div className="arena-catalog-reference__list">
        {SOURCE_BACKED_COMPONENTS.map((component) => (
          <article key={component.id} className="arena-catalog-reference__item">
            <div>
              <small>{component.manufacturer}</small>
              <strong>{component.partNumber ?? component.name}</strong>
              <span>{component.name}</span>
              <small>{component.spec}</small>
            </div>
            <div className="arena-catalog-reference__meta">
              <span>
                {component.simulation?.status === "modeled"
                  ? "Modeled behavior"
                  : "Reference only"}
              </span>
              {component.source ? (
                <a href={component.source.url} target="_blank" rel="noreferrer">
                  Official TE source
                </a>
              ) : null}
            </div>
            {component.simulation ? (
              <small className="arena-catalog-reference__note">
                {component.simulation.detail}
              </small>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  );
}
