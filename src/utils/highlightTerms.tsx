import type { ReactNode } from "react";

// Colour-codes the four W.I.R.E. properties (and their units/symbols) wherever
// they appear in user-facing copy, so the eye can latch onto them as they're
// named. Colours match the app's metric colours (--wire-* in layout.css):
// Voltage = red, Current = yellow-orange, Resistance = green, Power = blue.
type Category = "voltage" | "current" | "resistance" | "power";

const CATEGORY_BY_TERM: Record<string, Category> = {
  "source voltage": "voltage",
  voltage: "voltage",
  volts: "voltage",
  volt: "voltage",
  e: "voltage",
  current: "current",
  amps: "current",
  amp: "current",
  i: "current",
  resistance: "resistance",
  resistor: "resistance",
  resistors: "resistance",
  ohms: "resistance",
  ohm: "resistance",
  "ω": "resistance", // Ω lower-cases to ω
  r: "resistance",
  power: "power",
  watts: "power",
  watt: "power",
  w: "power",
};

// The safe, unambiguous matches — full words, units and Ω. Matched
// case-INSENSITIVELY so "current"/"Current"/"CURRENT" all light up. These never
// collide with ordinary prose (word boundaries), so they're on everywhere.
const WORD_PATTERN =
  "\\bSource Voltage\\b|\\bVoltage\\b|\\bVolts\\b|\\bVolt\\b|" +
  "\\bResistance\\b|\\bResistors\\b|\\bResistor\\b|\\bOhms\\b|\\bOhm\\b|" +
  "\\bCurrent\\b|\\bAmps\\b|\\bAmp\\b|" +
  "\\bPower\\b|\\bWatts\\b|\\bWatt\\b|Ω";

// Lone symbol letters (E/I/R/W) — matched case-SENSITIVELY (uppercase only) and
// only when NOT part of a word or a dotted acronym, so "W.I.R.E." / "F.U.S.E."
// stay untouched while "(E)", "E × I" and "I = E ÷ R" light up. Opt-in only: a
// bare "I" is also the English pronoun, so this is unsafe for arbitrary prose and
// is enabled only where the copy is controlled (e.g. the guided tour's formulas).
const SYMBOL_PATTERN = "(?<![.\\w])[EIRW](?![.\\w])";

type Span = { start: number; end: number; raw: string };

// Collect every match of `pattern` (with `flags`) into the spans array.
function collect(spans: Span[], text: string, pattern: string, flags: string) {
  const re = new RegExp(pattern, flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length, raw: m[0] });
    if (m[0].length === 0) {
      re.lastIndex++; // guard against zero-length matches looping forever
    }
  }
}

type HighlightOptions = {
  // Also colour lone symbol letters E/I/R/W (formulas). Off by default — see the
  // note on SYMBOL_PATTERN. Only pass true for controlled, pronoun-free copy.
  symbols?: boolean;
};

// Turns a plain string into React nodes with the key electrical terms wrapped in
// coloured, bold spans. Non-matching text is passed through unchanged.
export function highlightTerms(text: string, options?: HighlightOptions): ReactNode[] {
  const spans: Span[] = [];
  collect(spans, text, WORD_PATTERN, "gi");
  if (options?.symbols) {
    collect(spans, text, SYMBOL_PATTERN, "g");
  }
  // Left-to-right; on a tie the longer span wins (words beat lone symbols).
  spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const span of spans) {
    if (span.start < last) {
      continue; // overlaps an already-emitted span
    }
    if (span.start > last) {
      nodes.push(text.slice(last, span.start));
    }
    const category = CATEGORY_BY_TERM[span.raw.toLowerCase()];
    if (category) {
      nodes.push(
        <span key={key++} className={`ct-term ct-term-${category}`}>
          {span.raw}
        </span>,
      );
    } else {
      nodes.push(span.raw);
    }
    last = span.end;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}
