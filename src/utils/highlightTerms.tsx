import type { ReactNode } from "react";

// Colour-codes key electrical terms wherever they appear in user-facing copy, so
// the eye can latch onto them as they're named. Single quantities match the app's
// metric colours (--wire-* in layout.css); named laws/relationships get their own
// colour. Multi-word phrases (e.g. "Ohm's Law") are matched as ONE unit and take
// priority over any single word inside them, so the phrase never gets chopped up.
type Category = "voltage" | "current" | "resistance" | "power" | "law";

type Rule = { re: string; category: Category };

// Word/phrase rules — matched case-INSENSITIVELY so "current"/"Current" both light
// up. ORDER MATTERS: phrases and longer words come first so they win at a shared
// start position. `\b` keeps them from matching inside other words.
const WORD_RULES: Rule[] = [
  // ── Named laws / relationships (whole-phrase, own colour) ──
  { re: "\\bOhm['’]?s\\s+Law\\b", category: "law" },
  // ── Voltage ──
  { re: "\\bSource Voltage\\b", category: "voltage" },
  { re: "\\bVoltage\\b", category: "voltage" },
  { re: "\\bVolts\\b", category: "voltage" },
  { re: "\\bVolt\\b", category: "voltage" },
  // ── Resistance ──
  { re: "\\bResistance\\b", category: "resistance" },
  { re: "\\bResistors\\b", category: "resistance" },
  { re: "\\bResistor\\b", category: "resistance" },
  { re: "\\bOhms\\b", category: "resistance" },
  { re: "\\bOhm\\b", category: "resistance" },
  { re: "Ω", category: "resistance" },
  // ── Current ──
  { re: "\\bCurrent\\b", category: "current" },
  { re: "\\bAmps\\b", category: "current" },
  { re: "\\bAmp\\b", category: "current" },
  // ── Power ──
  { re: "\\bPower\\b", category: "power" },
  { re: "\\bWatts\\b", category: "power" },
  { re: "\\bWatt\\b", category: "power" },
];

// Lone symbol letters — matched case-SENSITIVELY (uppercase only) and only when
// NOT part of a word or a dotted acronym, so "W.I.R.E." / "F.U.S.E." stay
// untouched while "(E)", "E × I" and "I = E ÷ R" light up. Opt-in only: a bare
// "I" is also the English pronoun, so this is unsafe for arbitrary prose and is
// enabled only where the copy is controlled (e.g. the guided tour's formulas).
const SYMBOL_RULES: Rule[] = [
  { re: "(?<![.\\w])E(?![.\\w])", category: "voltage" },
  { re: "(?<![.\\w])I(?![.\\w])", category: "current" },
  { re: "(?<![.\\w])R(?![.\\w])", category: "resistance" },
  { re: "(?<![.\\w])W(?![.\\w])", category: "power" },
];

type Span = { start: number; end: number; category: Category; priority: number };

// Collect every match of each rule into the spans array. `priority` is the rule's
// index (lower = higher priority) so earlier rules win ties.
function collect(spans: Span[], text: string, rules: Rule[], flags: string, base: number) {
  rules.forEach((rule, i) => {
    const re = new RegExp(rule.re, flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push({
        start: m.index,
        end: m.index + m[0].length,
        category: rule.category,
        priority: base + i,
      });
      if (m[0].length === 0) {
        re.lastIndex++; // guard against zero-length matches looping forever
      }
    }
  });
}

type HighlightOptions = {
  // Also colour lone symbol letters E/I/R/W (formulas). Off by default — see the
  // note on SYMBOL_RULES. Only pass true for controlled, pronoun-free copy.
  symbols?: boolean;
};

// Turns a plain string into React nodes with the key terms wrapped in coloured,
// bold spans. Non-matching text is passed through unchanged.
export function highlightTerms(text: string, options?: HighlightOptions): ReactNode[] {
  const spans: Span[] = [];
  collect(spans, text, WORD_RULES, "gi", 0);
  if (options?.symbols) {
    collect(spans, text, SYMBOL_RULES, "g", WORD_RULES.length);
  }
  // Left-to-right; on a shared start the LONGER span wins (so "Ohm's Law" beats
  // "Ohm"); on equal length the higher-priority (earlier) rule wins.
  spans.sort(
    (a, b) =>
      a.start - b.start ||
      b.end - b.start - (a.end - a.start) ||
      a.priority - b.priority,
  );

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
    nodes.push(
      <span key={key++} className={`ct-term ct-term-${span.category}`}>
        {text.slice(span.start, span.end)}
      </span>,
    );
    last = span.end;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}
