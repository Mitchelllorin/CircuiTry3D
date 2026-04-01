// src/sim/androidBootstrap.ts

import { isAndroidApp } from "../utils/playStoreBilling";
import { getGlobalFlowSystem } from "../schematic/currentFlowSingleton";

export function setupAndroidSimBootstrap() {
  try {
    if (!isAndroidApp()) return;

    console.log("[CT3D] Android sim bootstrap starting");

    const flow = getGlobalFlowSystem();
    if (!flow) {
      console.warn("[CT3D] No global flow system found");
      return;
    }

    // Stable 60fps loop for Android WebView/Hermes
    let last = performance.now();

    function androidTick(now: number) {
      const dt = (now - last) / 1000; // convert ms → seconds
      last = now;

      try {
        flow.update(dt);
      } catch (err) {
        console.warn("[CT3D] Flow update error:", err);
      }

      setTimeout(() => {
        requestAnimationFrame(androidTick);
      }, 0);
    }

    requestAnimationFrame(androidTick);

    console.log("[CT3D] Android sim bootstrap active");
  } catch (error) {
    console.warn("[CT3D] Android sim bootstrap failed:", error);
  }
}
