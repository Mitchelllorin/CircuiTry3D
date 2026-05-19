import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

function createWindow(isNativePlatform = true) {
  const target = new EventTarget();

  return {
    Capacitor: {
      isNativePlatform: () => isNativePlatform,
    },
    open: vi.fn(),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  } as unknown as Window & typeof globalThis;
}

async function loadPlayStoreBilling(plugin: Record<string, unknown>, isNativePlatform = true) {
  vi.resetModules();
  vi.doMock("@capacitor/core", () => ({
    registerPlugin: () => plugin,
  }));

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: createWindow(isNativePlatform),
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });

  const module = await import("../src/utils/playStoreBilling");
  return { module, window: globalThis.window };
}

describe("playStoreBilling", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.doUnmock("@capacitor/core");
    vi.restoreAllMocks();
  });

  it("initializes Google Play Billing only once for concurrent callers", async () => {
    const plugin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    };

    const { module } = await loadPlayStoreBilling(plugin);

    const results = await Promise.all([
      module.initBilling(),
      module.initBilling(),
      module.initBilling(),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    expect(plugin.addListener).toHaveBeenCalledTimes(2);

    await module.initBilling();

    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    expect(plugin.addListener).toHaveBeenCalledTimes(2);
  });

  it("dispatches a purchase failure event when billing is unavailable", async () => {
    const plugin = {
      initialize: vi.fn().mockRejectedValue(new Error("Billing down")),
      addListener: vi.fn(),
      purchase: vi.fn(),
    };

    const { module, window } = await loadPlayStoreBilling(plugin);
    const failures: Array<{ cancelled?: boolean; error?: string }> = [];

    window.addEventListener("circuitry3d:purchaseFailed", (event) => {
      failures.push((event as CustomEvent<{ cancelled?: boolean; error?: string }>).detail);
    });

    await expect(module.purchaseProSubscription("monthly")).resolves.toBe(false);

    expect(plugin.purchase).not.toHaveBeenCalled();
    expect(failures).toEqual([
      {
        cancelled: false,
        error: "Google Play Billing is unavailable on this device.",
      },
    ]);
  });

  it("initializes billing before fetching live consumer prices", async () => {
    const plugin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
      getInAppProducts: vi.fn().mockResolvedValue({
        products: [{ productId: "premium_unlock", price: "$6.99" }],
      }),
      getProducts: vi.fn().mockResolvedValue({
        products: [
          { productId: "sub_monthly", price: "$1.50 / mo" },
          { productId: "sub_yearly", price: "$14.99 / yr" },
        ],
      }),
    };

    const { module } = await loadPlayStoreBilling(plugin);

    await expect(module.getConsumerProductPrices()).resolves.toEqual({
      premium_unlock: "$6.99",
      sub_monthly: "$1.50 / mo",
      sub_yearly: "$14.99 / yr",
    });

    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    expect(plugin.getInAppProducts).toHaveBeenCalledWith({
      skus: ["premium_unlock"],
    });
    expect(plugin.getProducts).toHaveBeenCalledWith({
      skus: ["sub_monthly", "sub_yearly"],
    });
  });
});
