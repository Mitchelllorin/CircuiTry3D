import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONSUMER_TIERS } from "../data/hybridPricing";
import { useEntitlements } from "../utils/entitlementManager";
import {
  getConsumerProductPrices,
  isAndroidApp,
  openAndroidStoreListing,
} from "../utils/playStoreBilling";
import {
  RATE_PROMPT_DELAY_MS,
  markPromptDismissed,
  markPromptShown,
  markRatingActioned,
  persistEngagementPromptState,
  readEngagementPromptState,
  recordMeaningfulSuccess,
  type EngagementPromptKind,
  type EngagementPromptState,
} from "../utils/engagementPrompts";
import "../styles/engagement-prompts.css";

type ActivePrompt = EngagementPromptKind | null;

function getTierPrice(
  tier: (typeof CONSUMER_TIERS)[number],
  prices: Record<string, string>,
): string {
  if (tier.id === "premium" && tier.sku) {
    return prices[tier.sku] ?? tier.staticPriceFallback;
  }
  if (tier.id === "pro" && tier.skus) {
    return prices[tier.skus.monthly] ?? tier.staticPriceFallback;
  }
  return tier.staticPriceFallback;
}

/**
 * Coordinates locally persisted, success-based prompts. The Builder dispatches
 * the success event only after a troubleshooting fix has been verified.
 */
export default function EngagementPromptManager() {
  const navigate = useNavigate();
  const { isPremiumOrAbove } = useEntitlements();
  const [activePrompt, setActivePrompt] = useState<ActivePrompt>(null);
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});
  const stateRef = useRef<EngagementPromptState>(readEngagementPromptState());
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const ratingTimerRef = useRef<number | null>(null);

  const saveState = useCallback((nextState: EngagementPromptState) => {
    stateRef.current = nextState;
    persistEngagementPromptState(nextState);
  }, []);

  const showPrompt = useCallback((prompt: EngagementPromptKind) => {
    const nextState = markPromptShown(stateRef.current, prompt, Date.now());
    saveState(nextState);
    setActivePrompt(prompt);
  }, [saveState]);

  useEffect(() => {
    if (!activePrompt) {
      return;
    }
    primaryActionRef.current?.focus({ preventScroll: true });
  }, [activePrompt]);

  useEffect(() => {
    if (activePrompt !== "upgrade" || !isAndroidApp()) {
      return;
    }

    let cancelled = false;
    void getConsumerProductPrices().then((prices) => {
      if (!cancelled) {
        setLivePrices(prices);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activePrompt]);

  useEffect(() => {
    return () => {
      if (ratingTimerRef.current !== null) {
        window.clearTimeout(ratingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMeaningfulSuccess = () => {
      const decision = recordMeaningfulSuccess(stateRef.current, {
        now: Date.now(),
        hasPremiumAccess: isPremiumOrAbove,
        isAndroid: isAndroidApp(),
      });
      saveState(decision.state);

      if (!decision.prompt || activePrompt) {
        return;
      }
      if (decision.prompt === "rating") {
        ratingTimerRef.current = window.setTimeout(() => {
          ratingTimerRef.current = null;
          showPrompt("rating");
        }, RATE_PROMPT_DELAY_MS);
        return;
      }
      showPrompt(decision.prompt);
    };

    window.addEventListener("circuitry3d:meaningfulSuccess", handleMeaningfulSuccess);
    return () => window.removeEventListener("circuitry3d:meaningfulSuccess", handleMeaningfulSuccess);
  }, [activePrompt, isPremiumOrAbove, saveState, showPrompt]);

  const dismiss = useCallback(() => {
    if (!activePrompt) {
      return;
    }
    saveState(markPromptDismissed(stateRef.current, activePrompt, Date.now()));
    setActivePrompt(null);
  }, [activePrompt, saveState]);

  useEffect(() => {
    if (!activePrompt) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activePrompt, dismiss]);

  const openPricing = useCallback(() => {
    dismiss();
    navigate("/pricing");
  }, [dismiss, navigate]);

  const rateApp = useCallback(() => {
    if (openAndroidStoreListing()) {
      saveState(markRatingActioned(stateRef.current, Date.now()));
    }
    dismiss();
  }, [dismiss, saveState]);

  if (!activePrompt) {
    return null;
  }

  return (
    <div className="engagement-prompt-backdrop" onClick={dismiss}>
      <section
        className="engagement-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`engagement-prompt-${activePrompt}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="engagement-prompt__close"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ×
        </button>

        {activePrompt === "upgrade" ? (
          <>
            <span className="engagement-prompt__eyebrow">Build further</span>
            <h2 id="engagement-prompt-upgrade-title">Keep your circuit work moving</h2>
            <p>
              Premium Unlock expands the component library, templates, saved circuits,
              and advanced physics. Pro adds cloud save and professional analysis tools.
            </p>
            <div className="engagement-prompt__plan-list" aria-label="Plan comparison">
              {CONSUMER_TIERS.map((tier) => (
                <article className="engagement-prompt__plan" key={tier.id}>
                  <div>
                    <h3>{tier.name}</h3>
                    <span>{getTierPrice(tier, livePrices)}</span>
                  </div>
                  <p>{tier.features.slice(0, 3).join(" · ")}</p>
                </article>
              ))}
            </div>
            <button
              type="button"
              className="engagement-prompt__primary"
              onClick={openPricing}
              ref={primaryActionRef}
            >
              Compare plans and unlock
            </button>
            <button type="button" className="engagement-prompt__secondary" onClick={dismiss}>
              Maybe later
            </button>
          </>
        ) : (
          <>
            <span className="engagement-prompt__eyebrow">Nice work</span>
            <h2 id="engagement-prompt-rating-title">Enjoying CircuiTry3D?</h2>
            <p>
              If the builder helped you solve a circuit, you can leave an honest review
              on Google Play. It helps other learners find the app.
            </p>
            <button
              type="button"
              className="engagement-prompt__primary"
              onClick={rateApp}
              ref={primaryActionRef}
            >
              Rate CircuiTry3D
            </button>
            <button type="button" className="engagement-prompt__secondary" onClick={dismiss}>
              Not now
            </button>
          </>
        )}
      </section>
    </div>
  );
}
