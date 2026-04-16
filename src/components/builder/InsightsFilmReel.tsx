import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// InsightsFilmReel
//
// A horizontal film-strip reel showing one analysis metric card at a time
// through a "projector gate" bezel. The strip is pulled left/right — exactly
// like a roll of film on a spindle passing through a small window.
//
// Props are intentionally plain values so the component stays stateless with
// respect to the circuit data it renders.
// ---------------------------------------------------------------------------

export type InsightsMetric = {
  id: string;
  letter: string;
  label: string;
  value: string;
  /** Optional accent CSS color — used for the metric letter */
  accent?: string;
};

export type InsightsWireProfile = {
  gaugeLabel: string;
  resistancePer: string;
  isActive: boolean;
};

export type InsightsFilmReelProps = {
  metrics: InsightsMetric[];
  wireProfile: InsightsWireProfile;
};

// ---------------------------------------------------------------------------
// Card width constant — JS source of truth, injected as --insights-card-w
// ---------------------------------------------------------------------------

const CARD_W = 160;

// ---------------------------------------------------------------------------
// useIsCoarsePointer — reuse pattern from ScrollerMenu
// ---------------------------------------------------------------------------

function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = () => setCoarse(mq.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return coarse;
}

// ---------------------------------------------------------------------------
// InsightsFilmReel
// ---------------------------------------------------------------------------

export function InsightsFilmReel({ metrics, wireProfile }: InsightsFilmReelProps) {
  const isCoarse = useIsCoarsePointer();
  const cardW = isCoarse ? CARD_W + 20 : CARD_W;

  const [centerIndex, setCenterIndex] = useState(0);
  const reelRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  // Build the flat list of frames: 4 metrics + 1 wire profile card
  const frames = [
    ...metrics,
    {
      id: "wire-profile",
      letter: "⌀",
      label: "Wire Profile",
      value: wireProfile.gaugeLabel,
      sub: wireProfile.resistancePer,
      isProfile: true,
      isActive: wireProfile.isActive,
    } as InsightsMetric & { sub?: string; isProfile?: boolean; isActive?: boolean },
  ];

  const scrollToIndex = useCallback((idx: number, smooth = true) => {
    if (!reelRef.current) return;
    const target = idx * cardW;
    if (smooth) {
      reelRef.current.scrollTo({ left: target, behavior: "smooth" });
    } else {
      reelRef.current.scrollTo({ left: target, behavior: "auto" });
    }
    setCenterIndex(idx);
  }, [cardW]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!reelRef.current) return;
      const idx = Math.round(reelRef.current.scrollLeft / cardW);
      setCenterIndex(Math.max(0, Math.min(idx, frames.length - 1)));
    });
  }, [cardW, frames.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToIndex(Math.min(centerIndex + 1, frames.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToIndex(Math.max(centerIndex - 1, 0));
      }
    },
    [centerIndex, frames.length, scrollToIndex],
  );

  const reelStyle = {
    "--insights-card-w": `${cardW}px`,
    width: cardW,
  } as React.CSSProperties;

  return (
    <div
      className="insights-reel-wrapper"
      style={reelStyle}
      role="listbox"
      aria-label={`Circuit metric: ${frames[centerIndex]?.label ?? "none"}`}
      onKeyDown={handleKeyDown}
    >
      {/* Projector-gate bezel */}
      <div className="insights-reel-bezel" aria-hidden="true">
        <div className="insights-reel-bezel-inner" />
      </div>

      {/* Scrollable film strip */}
      <div
        ref={reelRef}
        className="insights-reel"
        onScroll={handleScroll}
      >
        {frames.map((frame, idx) => {
          const f = frame as typeof frame & { sub?: string; isProfile?: boolean; isActive?: boolean };
          const isCenter = idx === centerIndex;

          return (
            <div
              key={f.id}
              role="option"
              aria-selected={isCenter}
              className={`insights-card${isCenter ? " insights-card--center" : ""}${f.isProfile && f.isActive ? " insights-card--profile-active" : ""}`}
              onClick={() => scrollToIndex(idx)}
              tabIndex={isCenter ? 0 : -1}
              title={`${f.label}: ${f.value}`}
            >
              <span className="insights-card-letter" aria-hidden="true">
                {f.letter}
              </span>
              <span className="insights-card-value">{f.value}</span>
              {f.sub && (
                <span className="insights-card-sub">{f.sub}</span>
              )}
              <span className="insights-card-label">{f.label}</span>
            </div>
          );
        })}
      </div>

      {/* Left/right curtains — depth fade */}
      <div className="insights-curtain insights-curtain--left" aria-hidden="true" />
      <div className="insights-curtain insights-curtain--right" aria-hidden="true" />

      {/* Navigation dots */}
      <div className="insights-reel-dots" aria-hidden="true">
        {frames.map((f, idx) => (
          <span
            key={f.id}
            className={`insights-reel-dot${idx === centerIndex ? " insights-reel-dot--active" : ""}`}
            onClick={() => scrollToIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
}
