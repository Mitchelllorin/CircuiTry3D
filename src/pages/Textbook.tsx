import { useState, useMemo } from "react";
import textbook, { allChapters, getChaptersByYear } from "../data/electricalTextbook";
import type { TextbookChapter, TextbookSection, Formula } from "../data/electricalTextbook";
import BrandSignature from "../components/BrandSignature";
import "../styles/textbook.css";

// ─── Sub-components ──────────────────────────────────────────────────────────

function FormulaCard({ formula }: { formula: Formula }) {
  return (
    <div className="tb-formula-card">
      <div className="tb-formula-name">{formula.name}</div>
      <div className="tb-formula-expression">{formula.expression}</div>
      {Object.entries(formula.variables).length > 0 && (
        <dl className="tb-formula-vars">
          {Object.entries(formula.variables).map(([symbol, meaning]) => (
            <div key={symbol} className="tb-formula-var-row">
              <dt>{symbol}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      )}
      {formula.example && (
        <div className="tb-formula-example">
          <span className="tb-formula-example-label">Example:</span> {formula.example}
        </div>
      )}
    </div>
  );
}

function SectionView({ section }: { section: TextbookSection }) {
  return (
    <article className="tb-section" id={`section-${section.id}`}>
      <h3 className="tb-section-title">{section.title}</h3>

      {section.body.map((paragraph, idx) => (
        <p key={idx} className="tb-body-para">
          {paragraph}
        </p>
      ))}

      {section.formulas && section.formulas.length > 0 && (
        <div className="tb-formulas">
          <h4 className="tb-sub-heading">Formulas</h4>
          <div className="tb-formula-grid">
            {section.formulas.map((f, idx) => (
              <FormulaCard key={idx} formula={f} />
            ))}
          </div>
        </div>
      )}

      {section.keyPoints && section.keyPoints.length > 0 && (
        <div className="tb-key-points">
          <h4 className="tb-sub-heading">Key Points</h4>
          <ul>
            {section.keyPoints.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {section.safetyNotes && section.safetyNotes.length > 0 && (
        <div className="tb-safety-notes">
          <h4 className="tb-sub-heading">⚠ Safety Notes</h4>
          <ul>
            {section.safetyNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {section.realWorldExamples && section.realWorldExamples.length > 0 && (
        <div className="tb-real-world">
          <h4 className="tb-sub-heading">Real-World Examples</h4>
          <ul>
            {section.realWorldExamples.map((example, idx) => (
              <li key={idx}>{example}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function ChapterView({ chapter }: { chapter: TextbookChapter }) {
  return (
    <div className="tb-chapter-view">
      <div className="tb-chapter-header">
        <span className="tb-year-badge">Year {chapter.year}</span>
        <h2 className="tb-chapter-title">
          Chapter {chapter.number}: {chapter.title}
        </h2>
        <p className="tb-chapter-overview">{chapter.overview}</p>
      </div>
      {chapter.sections.map((section) => (
        <SectionView key={section.id} section={section} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Textbook() {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(allChapters[0].id);
  const [activeYear, setActiveYear] = useState<1 | 2 | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedChapter: TextbookChapter | undefined = useMemo(
    () => allChapters.find((ch) => ch.id === selectedChapterId),
    [selectedChapterId],
  );

  const visibleChapters = useMemo(() => {
    const byYear = activeYear === "all" ? allChapters : getChaptersByYear(activeYear);
    if (!searchQuery.trim()) return byYear;
    const query = searchQuery.toLowerCase();
    return byYear.filter(
      (ch) =>
        ch.title.toLowerCase().includes(query) ||
        ch.overview.toLowerCase().includes(query) ||
        ch.sections.some(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.body.some((p) => p.toLowerCase().includes(query)) ||
            s.keyPoints?.some((kp) => kp.toLowerCase().includes(query)) ||
            s.formulas?.some((f) => f.name.toLowerCase().includes(query) || f.expression.toLowerCase().includes(query)),
        ),
    );
  }, [activeYear, searchQuery]);

  const handleChapterSelect = (id: string) => {
    setSelectedChapterId(id);
    // Scroll content area back to top
    const content = document.querySelector<HTMLElement>(".tb-content");
    if (content) content.scrollTop = 0;
  };

  return (
    <div className="tb-page">
      {/* ── Header ── */}
      <header className="tb-header">
        <BrandSignature size="sm" decorative className="tb-brand" />
        <div className="tb-header-text">
          <p className="tb-header-eyebrow">Reference Library</p>
          <h1 className="tb-header-title">{textbook.title}</h1>
          <p className="tb-header-subtitle">{textbook.subtitle}</p>
          <p className="tb-header-edition">{textbook.edition}</p>
        </div>
        <div className="tb-year-tabs">
          {(["all", 1, 2] as const).map((year) => (
            <button
              key={year}
              type="button"
              className={`tb-year-tab${activeYear === year ? " is-active" : ""}`}
              onClick={() => setActiveYear(year)}
            >
              {year === "all" ? "All Chapters" : `Year ${year}`}
            </button>
          ))}
        </div>
      </header>

      <div className="tb-body">
        {/* ── Sidebar / TOC ── */}
        <nav className="tb-sidebar" aria-label="Table of Contents">
          <div className="tb-search-wrap">
            <input
              className="tb-search"
              type="search"
              placeholder="Search textbook…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search textbook"
            />
          </div>
          <ul className="tb-chapter-list" role="list">
            {visibleChapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  className={`tb-chapter-btn${selectedChapterId === chapter.id ? " is-active" : ""}`}
                  onClick={() => handleChapterSelect(chapter.id)}
                >
                  <span className="tb-chapter-num">Ch {chapter.number}</span>
                  <span className="tb-chapter-label">{chapter.title}</span>
                  <span className={`tb-chapter-year-tag year-${chapter.year}`}>Yr {chapter.year}</span>
                </button>
              </li>
            ))}
            {visibleChapters.length === 0 && (
              <li className="tb-no-results">No chapters match your search.</li>
            )}
          </ul>
        </nav>

        {/* ── Content ── */}
        <main className="tb-content" aria-label="Textbook content">
          {selectedChapter ? (
            <ChapterView chapter={selectedChapter} />
          ) : (
            <div className="tb-empty">Select a chapter from the sidebar to begin reading.</div>
          )}
        </main>
      </div>
    </div>
  );
}
