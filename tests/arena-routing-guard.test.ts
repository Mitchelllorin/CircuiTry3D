import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Arena routing guard", () => {
  it("does not expose a standalone /arena route in App.tsx", () => {
    const appRoutes = read(`${ROOT}/src/routes/App.tsx`);
    expect(appRoutes).not.toMatch(/path=["']\/arena["']/);
    expect(appRoutes).not.toContain("const Arena = lazy(() => import(\"../pages/Arena\"))");
  });

  it("keeps GlobalModeBar arena navigation anchored to /app workspace", () => {
    const modeBar = read(`${ROOT}/src/components/GlobalModeBar.tsx`);
    expect(modeBar).not.toMatch(/navigate\(["']\/arena["']\)/);
    expect(modeBar).toContain("if (!isWorkspacePage) {");
    expect(modeBar).toContain("navigate(\"/app\")");
  });

  it("opens arena through Builder workspace panel integration", () => {
    const builder = read(`${ROOT}/src/pages/Builder.tsx`);
    expect(builder).toContain("const openArenaWorkspace = useCallback(");
    expect(builder).toContain("setWorkspaceModeWithGlobalSync(\"arena\")");
    expect(builder).toContain("openArenaWorkspace({ forceSync: true });");
    expect(builder).not.toMatch(/pendingMode\s*===\s*["']arena["'][\s\S]{0,220}navigateTo\(["']\/arena["']\)/);
  });
});
