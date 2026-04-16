import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentAction } from "./types";
import type { ComponentCategory } from "./types";
import { getSchematicSymbol } from "../circuit/SchematicSymbols";
import type { ComponentSymbol } from "../circuit/SchematicSymbols";
import { IS_DEMO_MODE, DEMO_COMPONENT_IDS } from "../../utils/demoMode";

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
// Category tabs configuration
// ---------------------------------------------------------------------------

type CategoryFilter = ComponentCategory | "all" | "favorites";

interface CategoryTab {
  id: CategoryFilter;
  label: string;
  shortLabel: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: "all",              label: "All",         shortLabel: "All"   },
  { id: "favorites",        label: "Pinned",      shortLabel: "★"     },
  { id: "power",            label: "Power",       shortLabel: "⚡"    },
  { id: "passive",          label: "Passive",     shortLabel: "─||─"  },
  { id: "semiconductor",    label: "Semi",        shortLabel: "🔬"    },
  { id: "electromechanical",label: "Mech",        shortLabel: "⚙"    },
  { id: "integrated",       label: "IC",          shortLabel: "▣"     },
  { id: "sensor",           label: "Sensor",      shortLabel: "🌡"    },
  { id: "connector",        label: "Node",        shortLabel: "●"     },
];

// ---------------------------------------------------------------------------
// Symbol resolution helper (mirrors ComponentLibraryCard logic)
// ---------------------------------------------------------------------------

function resolveSymbolKey(component: ComponentAction): ComponentSymbol {
  const t = component.builderType ?? component.id;
  if (t === "bjt-npn" || t === "bjt") return "transistor-npn" as ComponentSymbol;
  if (t === "bjt-pnp") return "transistor-pnp" as ComponentSymbol;
  return t as ComponentSymbol;
}

// ---------------------------------------------------------------------------
// ScrollerMenu props
// ---------------------------------------------------------------------------

export type ScrollerMenuProps = {
  /** Full list of all available component actions. Demo-mode filtering is handled internally. */
  components: ComponentAction[];
  /** Called when the user selects (taps/clicks) a component to add it to the workspace. */
  onSelect: (component: ComponentAction) => void;
  /** When true, all add buttons are disabled (frame not ready or circuit locked). */
  disabled: boolean;
  /** Whether the parent panel is currently open — used to reset category to "all" on each open so tutorial targets are always visible. */
  isOpen: boolean;
};

// ---------------------------------------------------------------------------
// ScrollerMenu component
// ---------------------------------------------------------------------------

export function ScrollerMenu({
  components,
  onSelect,
  disabled,
  isOpen,
}: ScrollerMenuProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const prevIsOpen = useRef(isOpen);

  // Persist favorites to localStorage whenever they change
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Reset to "all" each time the panel transitions to open, so tutorial
  // targets (battery / resistor) are always visible in the DOM.
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setActiveCategory("all");
      setSearchQuery("");
      setSearchOpen(false);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  // Focus the search input when it becomes visible
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Derive the list shown in the panel, respecting demo-mode limits
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

  // Keyboard navigation: ArrowUp / ArrowDown between item buttons
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (!listRef.current) return;
      const items =
        listRef.current.querySelectorAll<HTMLButtonElement>(".scroller-item-btn");
      if (!items.length) return;

      const focused = listRef.current.ownerDocument.activeElement;
      const focusedIdx = Array.from(items).indexOf(
        focused as HTMLButtonElement,
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = focusedIdx < items.length - 1 ? focusedIdx + 1 : 0;
        items[next]?.focus();
        items[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = focusedIdx > 0 ? focusedIdx - 1 : items.length - 1;
        items[prev]?.focus();
        items[prev]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },
    [],
  );

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((v) => {
      if (v) {
        // closing — clear query too
        setSearchQuery("");
      }
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

  return (
    <div className="scroller-menu" aria-label="Component scroller">
      {/* Category filter tabs */}
      <div className="scroller-tabs" role="tablist" aria-label="Filter by category">
        {CATEGORY_TABS.filter(
          (t) =>
            t.id !== "favorites" || hasFavorites || activeCategory === "favorites",
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
            }}
            title={tab.label}
          >
            {tab.shortLabel}
          </button>
        ))}

        {/* Search toggle at the end of the tab row */}
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

      {/* Search input (visible only when search is open) */}
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

      {/* Drum-scroll list */}
      <ul
        ref={listRef}
        className="scroller-list"
        onKeyDown={handleListKeyDown}
        aria-label="Components"
      >
        {visibleComponents.length === 0 ? (
          <li className="scroller-empty">
            {searchQuery
              ? "No matches"
              : activeCategory === "favorites"
                ? "No pinned items yet — tap ☆ to pin"
                : "No components"}
          </li>
        ) : (
          visibleComponents.map((component) => {
            const isFav = favorites.has(component.id);
            const symKey = resolveSymbolKey(component);
            const SymbolComp = getSchematicSymbol(symKey);
            const symRotation = symKey === "battery" ? -90 : 0;

            return (
              <li key={component.id} className="scroller-item">
                {/* Main add button */}
                <button
                  type="button"
                  className="scroller-item-btn"
                  onClick={() => onSelect(component)}
                  disabled={disabled}
                  aria-disabled={disabled}
                  title={component.description || component.label}
                  data-component-action={component.action}
                  data-tutorial-id={
                    component.id === "battery"
                      ? "tutorial-add-battery"
                      : component.id === "resistor"
                        ? "tutorial-add-resistor"
                        : undefined
                  }
                >
                  {/* Schematic symbol */}
                  <span className="scroller-item-symbol" aria-hidden="true">
                    {SymbolComp ? (
                      <svg
                        viewBox="-40 -40 80 80"
                        width="100%"
                        height="100%"
                        focusable="false"
                      >
                        <SymbolComp
                          x={0}
                          y={0}
                          rotation={symRotation}
                          scale={1}
                          showLabel={false}
                        />
                      </svg>
                    ) : (
                      <span className="scroller-item-icon-text" aria-hidden="true">
                        {component.icon}
                      </span>
                    )}
                  </span>

                  {/* Component name */}
                  <span className="scroller-item-name">{component.label}</span>
                </button>

                {/* Pin/favourite toggle — separate button so it doesn't nest inside add button */}
                <button
                  type="button"
                  className={`scroller-item-star${isFav ? " scroller-item-star--active" : ""}`}
                  onClick={(e) => toggleFavorite(component.id, e)}
                  aria-label={isFav ? `Unpin ${component.label}` : `Pin ${component.label}`}
                  aria-pressed={isFav}
                  title={isFav ? "Unpin" : "Pin to Pinned"}
                  tabIndex={0}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Demo-mode upsell notice */}
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
