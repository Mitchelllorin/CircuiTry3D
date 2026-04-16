import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentAction } from "./types";
import type { ComponentCategory } from "./types";
import { getSchematicSymbol, type ComponentSymbol } from "../circuit/SchematicSymbols";
import { useComponent3DThumbnail } from "./toolbars/useComponent3DThumbnail";
import { IS_DEMO_MODE, DEMO_COMPONENT_IDS } from "../../utils/demoMode";

// ---------------------------------------------------------------------------
// Film-reel constants
// ---------------------------------------------------------------------------

/**
 * Height of one film frame (card) in pixels for fine-pointer (mouse) devices.
 *
 * This value is written to the CSS custom property `--film-card-h` via a
 * style attribute on the film-reel-wrapper element, so the stylesheet always
 * derives its layout values from this single JS source of truth.  If you
 * need a different height for touch devices, adjust CARD_H_COARSE below
 * and the media-query `:root` override in scroller-menu.css is no longer
 * needed.
 */
const CARD_H = 116;
/** Larger card height for touch / coarse-pointer devices (≥ 44 px thumb targets). */
const CARD_H_COARSE = 128;

/** Number of cards visible in the reel viewport at one time. */
const VISIBLE = 3;

// ---------------------------------------------------------------------------
// Coarse-pointer detection (touch screens)
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
// Favorites persistence
// ---------------------------------------------------------------------------

const FAVORITES_KEY = "ct3d.scroller.favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set<string>(parsed as string[]);
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

function saveFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Category tabs
// ---------------------------------------------------------------------------

type CategoryFilter = ComponentCategory | "all" | "favorites";

interface CategoryTab {
  id: CategoryFilter;
  label: string;
  shortLabel: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: "all",               label: "All",    shortLabel: "All"  },
  { id: "favorites",         label: "Pinned", shortLabel: "★"    },
  { id: "power",             label: "Power",  shortLabel: "⚡"   },
  { id: "passive",           label: "Passive", shortLabel: "─||─" },
  { id: "semiconductor",     label: "Semi",   shortLabel: "🔬"   },
  { id: "electromechanical", label: "Mech",   shortLabel: "⚙"   },
  { id: "integrated",        label: "IC",     shortLabel: "▣"    },
  { id: "sensor",            label: "Sensor", shortLabel: "🌡"   },
  { id: "connector",         label: "Node",   shortLabel: "●"    },
];

// ---------------------------------------------------------------------------
// FilmCard — one frame on the reel (separate component to allow hook per card)
// ---------------------------------------------------------------------------

type FilmCardProps = {
  component: ComponentAction;
  /** True when this card is in the center slot of the viewport. */
  isCenter: boolean;
  /** True when the panel is currently open (enables thumbnail loading). */
  panelOpen: boolean;
  /** Called when the user taps this card. */
  onTap: (component: ComponentAction, wasCenter: boolean) => void;
  disabled: boolean;
};

function FilmCard({ component, isCenter, panelOpen, onTap, disabled }: FilmCardProps) {
  const kind = component.builderType ?? component.id;

  // Only load + animate the 3D thumbnail when the panel is open.
  // Animate (spin) only the center card — gives the "selected" feel.
  const thumbSrc = useComponent3DThumbnail(
    panelOpen ? kind : undefined,
    { animated: isCenter && panelOpen },
  );

  const symbolKey = (() => {
    if (kind === "bjt-npn" || kind === "bjt") return "transistor-npn";
    if (kind === "bjt-pnp") return "transistor-pnp";
    return kind;
  })();

  const Symbol = getSchematicSymbol(symbolKey as ComponentSymbol);
  const symbolRotation = symbolKey === "battery" ? -90 : 0;

  return (
    <div
      role="button"
      tabIndex={isCenter ? 0 : -1}
      aria-label={
        isCenter
          ? `Add ${component.label} (centered)`
          : `Scroll to ${component.label}`
      }
      aria-pressed={isCenter}
      aria-disabled={disabled}
      className={`film-card${isCenter ? " film-card--center" : ""}`}
      onClick={() => onTap(component, isCenter)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap(component, isCenter);
        }
      }}
      data-component-action={component.action}
      data-tutorial-id={
        component.id === "battery"
          ? "tutorial-add-battery"
          : component.id === "resistor"
            ? "tutorial-add-resistor"
            : undefined
      }
      title={isCenter ? (component.description || component.label) : component.label}
    >
      {/* 3D thumbnail — fills most of the card */}
      <div className="film-card-thumb" aria-hidden="true">
        {thumbSrc ? (
          <img src={thumbSrc} alt="" />
        ) : Symbol ? (
          <svg viewBox="-40 -40 80 80" focusable="false">
            <Symbol x={0} y={0} rotation={symbolRotation} scale={1} showLabel={false} />
          </svg>
        ) : (
          <span className="film-card-icon-text">{component.icon}</span>
        )}
      </div>

      {/* Component name */}
      <div className="film-card-label">{component.label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScrollerMenu props
// ---------------------------------------------------------------------------

export type ScrollerMenuProps = {
  /** Full list of all available component actions. Demo-mode filtering is handled internally. */
  components: ComponentAction[];
  /** Called when the user confirms adding a component to the workspace. */
  onSelect: (component: ComponentAction) => void;
  /** When true, all add interactions are disabled (frame not ready or circuit locked). */
  disabled: boolean;
  /** Whether the parent panel is currently open — enables thumbnail loading and resets state. */
  isOpen: boolean;
};

// ---------------------------------------------------------------------------
// ScrollerMenu — film-strip / spindle-reel picker
// ---------------------------------------------------------------------------

export function ScrollerMenu({
  components,
  onSelect,
  disabled,
  isOpen,
}: ScrollerMenuProps) {
  const isCoarse = useIsCoarsePointer();
  // Use the larger card height on touch devices so thumbnails are easy to tap.
  const cardH = isCoarse ? CARD_H_COARSE : CARD_H;

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [centerIndex, setCenterIndex] = useState(0);

  const reelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const prevIsOpen = useRef(isOpen);

  // Persist favorites
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Reset on panel open — ensures tutorial targets are always visible
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setActiveCategory("all");
      setSearchQuery("");
      setSearchOpen(false);
      setCenterIndex(0);
      if (reelRef.current) {
        reelRef.current.scrollTop = 0;
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  // Build filtered list
  const baseComponents = useMemo(
    () =>
      IS_DEMO_MODE
        ? components.filter((c) => DEMO_COMPONENT_IDS.includes(c.id))
        : components,
    [components],
  );

  const hasFavorites = useMemo(
    () => baseComponents.some((c) => favorites.has(c.id)),
    [baseComponents, favorites],
  );

  const visibleComponents = useMemo(() => {
    let list = baseComponents;
    if (activeCategory === "favorites") {
      list = list.filter((c) => favorites.has(c.id));
    } else if (activeCategory !== "all") {
      list = list.filter((c) => c.metadata?.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [baseComponents, activeCategory, favorites, searchQuery]);

  // Clamp centerIndex when list changes
  useEffect(() => {
    if (visibleComponents.length > 0) {
      setCenterIndex((prev) =>
        Math.max(0, Math.min(prev, visibleComponents.length - 1)),
      );
    }
  }, [visibleComponents]);

  // Sync scroll position when centerIndex changes programmatically
  // (but not on every render — only when triggered by scrollToIndex)
  const scrollToIndex = useCallback((idx: number, smooth = true) => {
    if (!reelRef.current) return;
    const target = idx * cardH;
    if (smooth) {
      reelRef.current.scrollTo({ top: target, behavior: "smooth" });
    } else {
      reelRef.current.scrollTop = target;
    }
    setCenterIndex(idx);
  }, [cardH]);

  // Track center index from scroll position
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!reelRef.current) return;
      const idx = Math.round(reelRef.current.scrollTop / cardH);
      setCenterIndex(Math.max(0, Math.min(idx, visibleComponents.length - 1)));
    });
  }, [cardH, visibleComponents.length]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // Card tap handler
  const handleCardTap = useCallback(
    (component: ComponentAction, wasCenter: boolean) => {
      if (disabled) return;
      const idx = visibleComponents.indexOf(component);
      if (idx < 0) return;
      if (wasCenter) {
        // Already centered — confirm add
        onSelect(component);
      } else {
        // Scroll it to center so the user can confirm
        scrollToIndex(idx);
      }
    },
    [disabled, visibleComponents, onSelect, scrollToIndex],
  );

  // Keyboard: reel-level ArrowUp / ArrowDown to advance one frame
  const handleReelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(centerIndex + 1, visibleComponents.length - 1);
        scrollToIndex(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(centerIndex - 1, 0);
        scrollToIndex(prev);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (visibleComponents[centerIndex] && !disabled) {
          onSelect(visibleComponents[centerIndex]);
        }
      }
    },
    [centerIndex, visibleComponents, scrollToIndex, disabled, onSelect],
  );

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((v) => {
      if (v) setSearchQuery("");
      return !v;
    });
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setSearchQuery("");
        setSearchOpen(false);
      }
    },
    [],
  );

  const toggleFavorite = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  // Reel viewport height shows VISIBLE cards; padding adds half-reel on each side
  const reelViewportH = VISIBLE * cardH;
  // Padding inside the scroll container so the first/last card can reach the
  // center snap position. Formula: floor((VISIBLE - 1) / 2) × cardH
  const reelPadding = Math.floor((VISIBLE - 1) / 2) * cardH;

  // Inject cardH as the CSS custom property --film-card-h so the stylesheet
  // always derives its layout values from this single JS source of truth.
  const reelStyle = {
    "--film-card-h": `${cardH}px`,
    height: reelViewportH,
  } as React.CSSProperties;

  return (
    <div className="scroller-menu" aria-label="Component film reel">
      {/* ── Category filter tab strip ───────────────────────────────── */}
      <div className="scroller-tabs" role="tablist" aria-label="Filter by category">
        {CATEGORY_TABS.filter(
          (t) =>
            t.id !== "favorites" ||
            hasFavorites ||
            activeCategory === "favorites",
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === tab.id}
            className={`scroller-tab${activeCategory === tab.id ? " scroller-tab--active" : ""}`}
            onClick={() => {
              setActiveCategory(tab.id);
              setSearchQuery("");
              setSearchOpen(false);
              setCenterIndex(0);
              if (reelRef.current) reelRef.current.scrollTop = 0;
            }}
            title={tab.label}
          >
            {tab.shortLabel}
          </button>
        ))}

        <button
          type="button"
          className={`scroller-tab scroller-tab--search${searchOpen || searchQuery ? " scroller-tab--active" : ""}`}
          onClick={handleSearchToggle}
          aria-label={searchOpen ? "Close search" : "Search components"}
          aria-pressed={searchOpen}
          title="Search"
        >
          {searchQuery ? "✕" : "🔍"}
        </button>
      </div>

      {/* ── Search input ─────────────────────────────────────────────── */}
      {searchOpen && (
        <div className="scroller-search-row">
          <input
            ref={searchRef}
            type="text"
            className="scroller-search-input"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search components"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {/* ── Film-reel wrapper (relative — holds the reel + the bezel overlay) ── */}
      <div
        className="film-reel-wrapper"
        style={reelStyle}
        role="listbox"
        aria-label={
          visibleComponents[centerIndex]
            ? `Selected: ${visibleComponents[centerIndex].label}`
            : "Component reel"
        }
        onKeyDown={handleReelKeyDown}
      >
        {/* Selection bezel — fixed chrome over the center slot */}
        <div className="film-bezel" aria-hidden="true">
          <div className="film-bezel-inner" />
        </div>

        {/* Scrollable film strip */}
        <div
          ref={reelRef}
          className="film-reel"
          onScroll={handleScroll}
          aria-hidden="false"
          style={{
            paddingTop: reelPadding,
            paddingBottom: reelPadding,
          }}
        >
          {visibleComponents.length === 0 ? (
            <div className="film-empty">
              {searchQuery
                ? "No matches"
                : activeCategory === "favorites"
                  ? "No pinned items yet"
                  : "No components"}
            </div>
          ) : (
            visibleComponents.map((component, idx) => (
              <FilmCard
                key={component.id}
                component={component}
                isCenter={idx === centerIndex}
                panelOpen={isOpen}
                onTap={handleCardTap}
                disabled={disabled}
              />
            ))
          )}
        </div>

        {/* Top / bottom fade curtains — the "projector gate" edges */}
        <div className="film-curtain film-curtain--top" aria-hidden="true" />
        <div className="film-curtain film-curtain--bottom" aria-hidden="true" />
      </div>

      {/* ── Hint & star for the centered card ────────────────────────── */}
      {visibleComponents.length > 0 && visibleComponents[centerIndex] && (
        <div className="film-footer">
          <span className="film-footer-hint">
            tap center to add · scroll to browse
          </span>
          <button
            type="button"
            className={`film-footer-star${favorites.has(visibleComponents[centerIndex].id) ? " film-footer-star--active" : ""}`}
            onClick={(e) =>
              toggleFavorite(visibleComponents[centerIndex].id, e)
            }
            aria-label={
              favorites.has(visibleComponents[centerIndex].id)
                ? `Unpin ${visibleComponents[centerIndex].label}`
                : `Pin ${visibleComponents[centerIndex].label}`
            }
            aria-pressed={favorites.has(visibleComponents[centerIndex].id)}
            title="Pin/unpin"
          >
            {favorites.has(visibleComponents[centerIndex].id) ? "★" : "☆"}
          </button>
        </div>
      )}

      {/* ── Demo-mode upsell ─────────────────────────────────────────── */}
      {IS_DEMO_MODE && (
        <a
          href="https://play.google.com/store/apps/details?id=com.circuitry3d.app"
          target="_blank"
          rel="noopener noreferrer"
          className="scroller-demo-lock"
        >
          🔒 More in full version
          <span className="scroller-demo-lock-sub"> · Play Store →</span>
        </a>
      )}
    </div>
  );
}
