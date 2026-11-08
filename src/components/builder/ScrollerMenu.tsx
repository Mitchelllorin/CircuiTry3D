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
 * need a different height for touch devices, adjust CARD_H_COARSE below —
 * the JS picks it up automatically via `useIsCoarsePointer()`; no CSS
 * override is needed.
 */
const CARD_H = 116;
/** Larger card height for touch / coarse-pointer devices (≥ 44 px thumb targets). */
const CARD_H_COARSE = 128;
/**
 * Card heights for a host sheet with less vertical room than the
 * workspace's own picker (the arena's quick-bar sheet). Same reel, same
 * three-card window, just shorter frames, so the whole reel fits the sheet
 * instead of being clipped by it.
 */
const CARD_H_COMPACT = 88;
const CARD_H_COARSE_COMPACT = 92;

/**
 * Number of cards visible inside the reel viewport at one time.
 * The viewport height = VISIBLE × CARD_H.  Only the center card is
 * highlighted; off-center cards peek in from above/below to create the
 * "film strip passing a small window" depth effect.
 */
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
}

/**
 * Categories are WORDS now, not glyphs.
 *
 * They used to render `⚡ ─||─ 🔬 ⚙ ▣ 🌡 ●`, which is a puzzle rather than a
 * filter: `─||─` for passive, `▣` for integrated, and a bulb glyph for
 * semiconductors that reads as a light. Half of them were emoji and half were
 * punctuation, so the row did not even look like one row of the same control.
 * The strip already scrolls horizontally, so the full word costs nothing.
 */
const CATEGORY_TABS: CategoryTab[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Pinned" },
  { id: "power", label: "Power" },
  { id: "passive", label: "Passive" },
  { id: "semiconductor", label: "Semi" },
  { id: "electromechanical", label: "Mech" },
  { id: "integrated", label: "IC" },
  { id: "sensor", label: "Sensor" },
  { id: "connector", label: "Node" },
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
      /* A branded part is known by its maker and its part number, not by the
         bare MPN the label shows — "BC847B" means nothing without "Nexperia".
         No aria-pressed: adding a part is not a toggle, and announcing it as
         one told screen readers the card was already on. */
      aria-label={
        component.metadata?.realWorld
          ? `Add ${component.metadata.realWorld.manufacturer} ${component.metadata.realWorld.partNumber}`
          : `Add ${component.label}`
      }
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
      title={component.description || component.label}
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

      {/* Component name, then the maker underneath for a branded part */}
      <div className="film-card-label">{component.label}</div>
      {component.metadata?.realWorld ? (
        <div className="film-card-mfr">
          {component.metadata.realWorld.manufacturer}
        </div>
      ) : null}
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
  /** Smaller cards, for a host with less vertical room than the workspace. */
  compact?: boolean;
};

// ---------------------------------------------------------------------------
// ScrollerMenu — film-strip / spindle-reel picker
// ---------------------------------------------------------------------------

export function ScrollerMenu({
  components,
  onSelect,
  disabled,
  isOpen,
  compact = false,
}: ScrollerMenuProps) {
  const isCoarse = useIsCoarsePointer();
  // Use the larger card height on touch devices so thumbnails are easy to tap.
  const cardH = isCoarse
    ? (compact ? CARD_H_COARSE_COMPACT : CARD_H_COARSE)
    : (compact ? CARD_H_COMPACT : CARD_H);

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
        reelRef.current.scrollTo({ top: 0, behavior: "auto" });
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
      reelRef.current.scrollTo({ top: target, behavior: "auto" });
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
      // One tap adds, wherever the card sits. The old tap-to-centre,
      // tap-again-to-add read as a dead button: the first tap on any card
      // off-centre did nothing anyone could see on the board.
      if (!wasCenter) scrollToIndex(idx);
      onSelect(component);
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
      {/* ── Category filter tab strip ─────────────────────────────────
          These are plain filter buttons, not ARIA tabs: there is no tabpanel
          on the other end of them, and role="tab" without one leaves a screen
          reader promising a pane that never appears. aria-pressed says what
          the control actually is — on or off. */}
      <div className="scroller-tabs" role="group" aria-label="Filter by category">
        {CATEGORY_TABS.filter(
          (t) =>
            t.id !== "favorites" ||
            hasFavorites ||
            activeCategory === "favorites",
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeCategory === tab.id}
            className={`scroller-tab${activeCategory === tab.id ? " scroller-tab--active" : ""}`}
            onClick={() => {
              setActiveCategory(tab.id);
              setSearchQuery("");
              setSearchOpen(false);
              setCenterIndex(0);
              if (reelRef.current) reelRef.current.scrollTo({ top: 0, behavior: "auto" });
            }}
            title={tab.label}
          >
            {tab.label}
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
        /* Not role="listbox": its children are buttons, and a listbox whose
           children are buttons is an invalid tree — some screen readers drop
           the whole reel rather than announce it. It is a group of buttons. */
        role="group"
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
            tap a part to add it · scroll to browse
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
