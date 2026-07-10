/**
 * The branded catalog moved to `src/data/componentCatalog.ts` so that the
 * Builder library and the Arena can share one definition of a real-world part
 * without either owning it. This file stays as a re-export for the Arena's
 * existing import paths — add nothing here; edit the catalog instead.
 */
export {
  CATALOG_COMPONENTS,
  getCatalogCategories,
  searchCatalog,
  findCatalogComponent,
  builderTypeFor,
  toWorkspaceProperties,
} from "../../data/componentCatalog";
export type { CatalogComponent } from "../../data/componentCatalog";
