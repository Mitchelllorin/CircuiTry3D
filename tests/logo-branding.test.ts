import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_MARKERS = ['data-battery="true"', 'data-polarity="true"'];

const LOGO_ASSET_PATH = resolve(__dirname, "..", "src", "assets", "circuit-logo.svg");
const PUBLIC_LOGO_PATH = resolve(__dirname, "..", "public", "circuit-logo.svg");
const COMPONENT_LOGO_PATH = resolve(
  __dirname,
  "..",
  "src",
  "components",
  "circuit",
  "CircuitLogo.tsx",
);

const assertMarkers = (content: string, label: string) => {
  for (const marker of REQUIRED_MARKERS) {
    expect(content, `${label} must include ${marker}`).toContain(marker);
  }
};

describe("logo branding invariants", () => {
  it("keeps battery polarity markers in the source SVG asset", () => {
    const svg = readFileSync(LOGO_ASSET_PATH, "utf8");
    assertMarkers(svg, "src/assets/circuit-logo.svg");
  });

  it("keeps battery polarity markers in the public SVG asset", () => {
    const svg = readFileSync(PUBLIC_LOGO_PATH, "utf8");
    assertMarkers(svg, "public/circuit-logo.svg");
  });

  it("keeps battery polarity markers in the CircuitLogo component", () => {
    const component = readFileSync(COMPONENT_LOGO_PATH, "utf8");
    assertMarkers(component, "src/components/circuit/CircuitLogo.tsx");
  });
});
