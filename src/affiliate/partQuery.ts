/**
 * Turning a component into something a shop can actually find.
 *
 * This is the part of affiliate linking that decides whether it earns
 * anything, and it is not a formatting detail. A link to a search that returns
 * nothing — or returns the wrong class of part — converts at zero however
 * correctly it is tagged. Two rules do most of the work:
 *
 *   - a manufacturer part number is worth more than any description. "2N3904"
 *     finds the transistor; "NPN transistor" finds a bag of assorted ones.
 *   - a reference designator is NOT a part number. R1, C12, Q3 identify a
 *     position in a schematic, not a thing you can buy, and searching for them
 *     returns junk. Telling the two apart is the whole of `looksLikePartNumber`.
 *
 * Deliberately app-neutral: it takes a plain shape, not an Arena agent or a
 * catalog entry, so the Builder, the Arena and the catalog can all use it
 * without any of them importing each other.
 */

/** What a shop is asked to find. */
export type PartQuery = {
  /** The search phrase. */
  terms: string;
  /** Physics family, kept for per-merchant category hints. */
  family: string;
  /** Human name of the part this came from, for the click log and titles. */
  label: string;
};

/** The minimum a part has to tell us to be searchable. */
export type PartQueryInput = {
  name: string;
  family: string;
  /** Schematic designator OR a real MPN — we work out which. */
  componentNumber?: string | null;
  /** Manufacturer, when the part is a real branded one. */
  manufacturer?: string | null;
  properties?: Record<string, unknown> | null;
  ratings?: {
    powerRating?: number | null;
    maxVoltage?: number | null;
    maxCurrent?: number | null;
  } | null;
};

/** The word a human would type for each family. */
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
  transistor: "transistor",
  switch: "switch",
  relay: "relay",
  potentiometer: "potentiometer",
  generic: "electronic component",
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatResistance(ohms: number): string {
  if (ohms >= 1e6) return `${+(ohms / 1e6).toFixed(2)}M ohm`;
  if (ohms >= 1e3) return `${+(ohms / 1e3).toFixed(2)}k ohm`;
  return `${+ohms.toFixed(2)} ohm`;
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
 * Is this string a real manufacturer part number, or a schematic position?
 *
 * A designator is a letter or three followed by a small number — R1, C12, U3,
 * Q104. A part number mixes letters and digits in a way that does not fit that
 * shape: 2N3904, IRF540N, 1N4148, LM358N, CRCW0805.
 *
 * The ambiguous cases resolve in favour of "designator", i.e. we throw the
 * string away and search by spec instead. That is the safe direction: a spec
 * search finds a usable part, whereas searching a shop for "R1" finds nothing
 * of the kind and reads as a broken link.
 */
export function looksLikePartNumber(value: string | null | undefined): value is string {
  if (!value) return false;
  const candidate = value.trim();
  if (candidate.length < 3) return false;
  if (/^[A-Za-z]{1,3}\d{1,3}$/.test(candidate)) return false;
  return /\d/.test(candidate) && /[A-Za-z]/.test(candidate);
}

/** The spec fragment that makes a generic part findable. */
export function specFragment(input: PartQueryInput): string {
  const properties = input.properties ?? {};
  const ratings = input.ratings ?? {};

  switch (input.family) {
    case "resistor": {
      const ohms = num(properties.resistance);
      const watts = num(properties.powerRating) ?? num(ratings.powerRating);
      return [
        ohms != null ? formatResistance(ohms) : "",
        watts != null ? `${+watts.toFixed(2)}W` : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "capacitor": {
      const farads = num(properties.capacitance);
      const volts = num(properties.maxVoltage) ?? num(ratings.maxVoltage);
      return [
        farads != null ? formatCapacitance(farads) : "",
        volts != null ? `${Math.round(volts)}V` : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "inductor": {
      const henries = num(properties.inductance);
      return henries != null ? formatInductance(henries) : "";
    }
    case "led":
    case "diode": {
      const forward = num(properties.forwardVoltage);
      return forward != null ? `${+forward.toFixed(1)}V` : "";
    }
    case "battery": {
      const volts = num(properties.voltage) ?? num(ratings.maxVoltage);
      return volts != null ? `${+volts.toFixed(1)}V` : "";
    }
    case "fuse": {
      const amps = num(properties.maxCurrent) ?? num(ratings.maxCurrent);
      return amps != null ? `${+amps.toFixed(2)}A` : "";
    }
    default:
      return "";
  }
}

/** The word a shop search needs for this family. */
export function familyWord(family: string): string {
  return FAMILY_SEARCH_WORD[family] ?? FAMILY_SEARCH_WORD.generic;
}

/**
 * Build the search for a part.
 *
 * Order of preference: manufacturer + part number (an exact product), then
 * part number alone, then spec + family word (a valid, useful shop search that
 * always resolves to something buyable).
 */
export function buildPartQuery(input: PartQueryInput): PartQuery {
  const word = familyWord(input.family);
  const manufacturer = input.manufacturer?.trim() ?? "";

  if (looksLikePartNumber(input.componentNumber)) {
    const partNumber = input.componentNumber.trim();
    return {
      terms: [manufacturer, partNumber, word].filter(Boolean).join(" "),
      family: input.family,
      label: input.name,
    };
  }

  // A branded part's NAME is often the part number ("MN1604 9V", "LM358N"), so
  // it is worth the same test before falling back to specs.
  const nameHead = input.name.trim().split(/\s+/)[0] ?? "";
  if (manufacturer && looksLikePartNumber(nameHead)) {
    return {
      terms: [manufacturer, nameHead, word].filter(Boolean).join(" "),
      family: input.family,
      label: input.name,
    };
  }

  const spec = specFragment(input);
  return {
    terms: (spec ? `${spec} ${word}` : word).trim(),
    family: input.family,
    label: input.name,
  };
}
