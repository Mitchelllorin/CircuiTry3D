/**
 * Amazon Associates affiliate links for the Arena.
 *
 * The Arena is a real-component performance bench, so the moment a part wins (or
 * fails interestingly) is peak purchase intent: the user just watched it prove
 * itself. We turn that into a compliant Amazon search link — by manufacturer part
 * number when we have a real one, otherwise by component type + key spec (e.g.
 * "470Ω 0.25W resistor"), which always resolves to a valid Amazon search.
 *
 * ── Before this earns anything ──────────────────────────────────────────────
 *  1. Get approved for Amazon Associates (per marketplace).
 *  2. Drop your real tracking id into AMAZON_ASSOCIATE_TAG below.
 *  3. Set AMAZON_MARKETPLACE_DOMAIN to your marketplace.
 * Until then the links still open a normal Amazon search (an unknown tag is
 * simply ignored by Amazon) — nothing breaks, it just doesn't track. Flip
 * AMAZON_AFFILIATE_ENABLED to false to hide the buy links entirely.
 *
 * Compliance: links must render with the required disclosure (see
 * AMAZON_DISCLOSURE) and use rel="sponsored". Both are wired into the UI.
 */
import type { ArenaBattleAgent } from "./types";

/** Your Amazon Associates tracking id. Placeholder until you're approved. */
export const AMAZON_ASSOCIATE_TAG = "circuitry3d-20";

/** Marketplace host — change to your approved marketplace (e.g. www.amazon.co.uk). */
export const AMAZON_MARKETPLACE_DOMAIN = "www.amazon.com";

/** Master switch for the buy links. */
export const AMAZON_AFFILIATE_ENABLED = true;

/** Required FTC / Amazon Operating Agreement disclosure. */
export const AMAZON_DISCLOSURE =
  "As an Amazon Associate, CircuiTry3D earns from qualifying purchases.";

/** rel value for paid/affiliate outbound links. */
export const AMAZON_LINK_REL = "sponsored noopener noreferrer";

/** Human search word per physics family. */
const FAMILY_SEARCH_WORD: Record<string, string> = {
  resistor: "resistor",
  capacitor: "capacitor",
  led: "LED",
  diode: "diode",
  inductor: "inductor",
  battery: "battery",
  fuse: "fuse",
  lamp: "bulb",
  mosfet: "MOSFET",
  bjt: "transistor",
  switch: "switch",
  relay: "relay",
  generic: "electronic component",
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatResistance(ohms: number): string {
  if (ohms >= 1e6) return `${+(ohms / 1e6).toFixed(2)}MΩ`;
  if (ohms >= 1e3) return `${+(ohms / 1e3).toFixed(2)}kΩ`;
  return `${+ohms.toFixed(2)}Ω`;
}

function formatCapacitance(farads: number): string {
  if (farads >= 1e-6) return `${+(farads * 1e6).toFixed(2)}uF`;
  if (farads >= 1e-9) return `${+(farads * 1e9).toFixed(2)}nF`;
  return `${+(farads * 1e12).toFixed(2)}pF`;
}

function formatInductance(henries: number): string {
  if (henries >= 1) return `${+henries.toFixed(2)}H`;
  if (henries >= 1e-3) return `${+(henries * 1e3).toFixed(2)}mH`;
  return `${+(henries * 1e6).toFixed(2)}uH`;
}

/**
 * A reference designator (R1, C12, U3, Q1) is NOT a buyable part — only treat a
 * code as a real manufacturer part number when it isn't a bare designator and
 * mixes letters with digits (2N3904, IRF540N, 1N4148, LM358).
 */
function isRealPartNumber(value: string | null | undefined): value is string {
  if (!value) return false;
  const pn = value.trim();
  if (/^[A-Za-z]{1,3}\d{1,3}$/.test(pn)) return false; // schematic ref designator
  return pn.length >= 3 && /\d/.test(pn) && /[A-Za-z0-9]/.test(pn);
}

/** Build the spec fragment that makes a generic part actually searchable. */
function specFragment(agent: ArenaBattleAgent): string {
  const p = agent.properties ?? {};
  switch (agent.family) {
    case "resistor": {
      const r = num(p.resistance) ?? num(agent.metrics.resistance);
      const w = num(p.powerRating) ?? num(agent.ratings.powerRating);
      return [r != null ? formatResistance(r) : "", w != null ? `${+w.toFixed(2)}W` : ""]
        .filter(Boolean)
        .join(" ");
    }
    case "capacitor": {
      const c = num(p.capacitance);
      const v = num(p.maxVoltage) ?? num(agent.ratings.maxVoltage);
      return [c != null ? formatCapacitance(c) : "", v != null && Number.isFinite(v) ? `${+v.toFixed(0)}V` : ""]
        .filter(Boolean)
        .join(" ");
    }
    case "inductor": {
      const l = num(p.inductance);
      return l != null ? formatInductance(l) : "";
    }
    case "led":
    case "diode": {
      const v = num(p.forwardVoltage);
      return v != null ? `${+v.toFixed(1)}V` : "";
    }
    default:
      return "";
  }
}

/** The Amazon search phrase for a component. */
export function buildComponentSearchQuery(agent: ArenaBattleAgent): string {
  const word = FAMILY_SEARCH_WORD[agent.family] ?? FAMILY_SEARCH_WORD.generic;
  const partNumber = agent.componentNumber;
  if (isRealPartNumber(partNumber)) {
    return `${partNumber.trim()} ${word}`.trim();
  }
  const spec = specFragment(agent);
  return (spec ? `${spec} ${word}` : word).trim();
}

/** The full, tagged Amazon search URL for a component. */
export function buildAmazonSearchUrl(agent: ArenaBattleAgent): string {
  const query = buildComponentSearchQuery(agent);
  const params = new URLSearchParams({ k: query, tag: AMAZON_ASSOCIATE_TAG });
  return `https://${AMAZON_MARKETPLACE_DOMAIN}/s?${params.toString()}`;
}
