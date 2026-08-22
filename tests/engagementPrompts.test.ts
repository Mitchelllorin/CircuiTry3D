import { describe, expect, it } from "vitest";
import {
  MAX_RATING_PROMPT_IMPRESSIONS,
  UPGRADE_PROMPT_COOLDOWN_MS,
  markPromptShown,
  normalizeEngagementPromptState,
  recordMeaningfulSuccess,
} from "../src/utils/engagementPrompts";

const now = 1_800_000_000_000;

describe("engagement prompts", () => {
  it("offers an upgrade only after a verified success and respects its cooldown", () => {
    const initial = normalizeEngagementPromptState(null);
    const first = recordMeaningfulSuccess(initial, {
      now,
      hasPremiumAccess: false,
      isAndroid: false,
    });

    expect(first.prompt).toBe("upgrade");

    const shown = markPromptShown(first.state, "upgrade", now);
    const duringCooldown = recordMeaningfulSuccess(shown, {
      now: now + UPGRADE_PROMPT_COOLDOWN_MS - 1,
      hasPremiumAccess: false,
      isAndroid: false,
    });
    expect(duringCooldown.prompt).toBeNull();

    const afterCooldown = recordMeaningfulSuccess(duringCooldown.state, {
      now: now + UPGRADE_PROMPT_COOLDOWN_MS,
      hasPremiumAccess: false,
      isAndroid: false,
    });
    expect(afterCooldown.prompt).toBe("upgrade");
  });

  it("never prompts upgrade users who already have Premium access", () => {
    const decision = recordMeaningfulSuccess(normalizeEngagementPromptState(null), {
      now,
      hasPremiumAccess: true,
      isAndroid: true,
    });

    expect(decision.prompt).toBeNull();
    expect(decision.state.successfulSessions).toBe(1);
  });

  it("asks for a rating only after two successful Android sessions and caps it", () => {
    const first = recordMeaningfulSuccess(normalizeEngagementPromptState(null), {
      now,
      hasPremiumAccess: true,
      isAndroid: true,
    });
    const second = recordMeaningfulSuccess(first.state, {
      now: now + 1,
      hasPremiumAccess: true,
      isAndroid: true,
    });

    expect(second.prompt).toBe("rating");

    const shown = markPromptShown(second.state, "rating", now + 1);
    const capped = recordMeaningfulSuccess(shown, {
      now: now + 2,
      hasPremiumAccess: true,
      isAndroid: true,
    });
    expect(shown.ratingImpressions).toBe(MAX_RATING_PROMPT_IMPRESSIONS);
    expect(capped.prompt).toBeNull();
  });

  it("does not offer a Play rating on web or Electron", () => {
    const first = recordMeaningfulSuccess(normalizeEngagementPromptState(null), {
      now,
      hasPremiumAccess: true,
      isAndroid: false,
    });
    const second = recordMeaningfulSuccess(first.state, {
      now: now + 1,
      hasPremiumAccess: true,
      isAndroid: false,
    });

    expect(second.prompt).toBeNull();
  });
});
