import { useState, useMemo, useCallback } from "react";
import textbook, { allChapters, getChaptersByYear } from "../data/electricalTextbook";
import type { TextbookChapter, TextbookSection, Formula } from "../data/electricalTextbook";
import { getChapterQuiz, getYearFinal } from "../data/textbookQuizzes";
import type { QuizQuestion } from "../data/textbookQuizzes";
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

function ChapterView({
  chapter,
  onStartQuiz,
}: {
  chapter: TextbookChapter;
  onStartQuiz: () => void;
}) {
  const hasQuiz = !!getChapterQuiz(chapter.id);
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
      {hasQuiz && (
        <div className="tb-quiz-cta">
          <div className="tb-quiz-cta-text">
            <span className="tb-quiz-cta-icon">📝</span>
            <div>
              <p className="tb-quiz-cta-title">Chapter Quiz</p>
              <p className="tb-quiz-cta-desc">
                Test your understanding of Chapter {chapter.number}: {chapter.title}
              </p>
            </div>
          </div>
          <button type="button" className="tb-quiz-start-btn" onClick={onStartQuiz}>
            Take Quiz
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Panel ───────────────────────────────────────────────────────────────

function QuizPanel({
  title,
  subtitle,
  questions,
  onBack,
}: {
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(questions.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return 0;
    return answers.filter((a, i) => a === questions[i].correctIndex).length;
  }, [submitted, answers, questions]);

  const allAnswered = answers.every((a) => a !== null);

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const handleSubmit = () => {
    if (allAnswered) setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
  };

  const pct = submitted ? Math.round((score / questions.length) * 100) : 0;

  function getGradeLabel(p: number): string {
    if (p >= 90) return "Excellent";
    if (p >= 70) return "Good";
    if (p >= 50) return "Pass";
    return "Needs Review";
  }

  function getGradeClass(p: number): string {
    if (p >= 90) return "grade-excellent";
    if (p >= 70) return "grade-good";
    if (p >= 50) return "grade-pass";
    return "grade-fail";
  }

  const grade = getGradeLabel(pct);
  const gradeClass = getGradeClass(pct);

  return (
    <div className="tb-quiz-panel">
      <div className="tb-quiz-panel-header">
        <button type="button" className="tb-quiz-back-btn" onClick={onBack} aria-label="Back">
          ← Back
        </button>
        <div className="tb-quiz-panel-title-group">
          <h2 className="tb-quiz-panel-title">{title}</h2>
          <p className="tb-quiz-panel-subtitle">{subtitle}</p>
        </div>
      </div>

      {submitted && (
        <div className={`tb-quiz-score-banner ${gradeClass}`}>
          <span className="tb-quiz-score-num">
            {score} / {questions.length}
          </span>
          <span className="tb-quiz-score-pct">{pct}%</span>
          <span className="tb-quiz-score-grade">{grade}</span>
        </div>
      )}

      <ol className="tb-quiz-question-list">
        {questions.map((q, qIdx) => {
          const selected = answers[qIdx];
          const isCorrect = submitted && selected === q.correctIndex;
          const isWrong = submitted && selected !== null && selected !== q.correctIndex;

          return (
            <li
              key={q.id}
              className={`tb-quiz-question${submitted ? (isCorrect ? " is-correct" : " is-wrong") : ""}`}
            >
              <p className="tb-quiz-q-text">
                <span className="tb-quiz-q-num">{qIdx + 1}.</span> {q.question}
              </p>
              <ul className="tb-quiz-options" role="list">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selected === optIdx;
                  const showCorrect = submitted && optIdx === q.correctIndex;
                  const showWrong = submitted && isSelected && optIdx !== q.correctIndex;
                  return (
                    <li key={optIdx}>
                      <button
                        type="button"
                        className={[
                          "tb-quiz-option",
                          isSelected && !submitted && "is-selected",
                          showCorrect && "is-correct",
                          showWrong && "is-wrong",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleSelect(qIdx, optIdx)}
                        disabled={submitted}
                        aria-pressed={isSelected}
                      >
                        <span className="tb-quiz-option-letter">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        {opt}
                        {showCorrect && <span className="tb-quiz-option-check">✓</span>}
                        {showWrong && <span className="tb-quiz-option-cross">✗</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {submitted && (
                <div className={`tb-quiz-explanation${isWrong ? " is-wrong" : ""}`}>
                  <span className="tb-quiz-explanation-label">
                    {isCorrect ? "✓ Correct" : "✗ Incorrect"} —{" "}
                  </span>
                  {q.explanation}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="tb-quiz-actions">
        {!submitted ? (
          <button
            type="button"
            className="tb-quiz-submit-btn"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            {allAnswered ? "Check Answers" : `Answer all ${questions.length} questions to submit`}
          </button>
        ) : (
          <>
            <button type="button" className="tb-quiz-retry-btn" onClick={handleRetry}>
              Retry Quiz
            </button>
            <button type="button" className="tb-quiz-back-btn-bottom" onClick={onBack}>
              Back to {title.includes("Final") ? "Textbook" : "Chapter"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ContentMode =
  | { kind: "chapter" }
  | { kind: "chapter-quiz" }
  | { kind: "final"; year: 1 | 2 };

export default function Textbook() {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(allChapters[0].id);
  const [activeYear, setActiveYear] = useState<1 | 2 | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contentMode, setContentMode] = useState<ContentMode>({ kind: "chapter" });

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

  const scrollContentToTop = () => {
    const content = document.querySelector<HTMLElement>(".tb-content");
    if (content) content.scrollTop = 0;
  };

  const handleChapterSelect = (id: string) => {
    setSelectedChapterId(id);
    setContentMode({ kind: "chapter" });
    scrollContentToTop();
  };

  const handleStartChapterQuiz = useCallback(() => {
    setContentMode({ kind: "chapter-quiz" });
    scrollContentToTop();
  }, []);

  const handleOpenFinal = (year: 1 | 2) => {
    setContentMode({ kind: "final", year });
    scrollContentToTop();
  };

  const handleBackToChapter = () => {
    setContentMode({ kind: "chapter" });
    scrollContentToTop();
  };

  // Resolve quiz / final data for the current content mode
  const chapterQuiz =
    contentMode.kind === "chapter-quiz" && selectedChapter
      ? getChapterQuiz(selectedChapter.id)
      : undefined;

  const yearFinal =
    contentMode.kind === "final" ? getYearFinal(contentMode.year) : undefined;

  return (
    <div className="tb-page">
      {/* ── Header ── */}
      <header className="tb-header">
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
              onClick={() => {
                setActiveYear(year);
                setContentMode({ kind: "chapter" });
              }}
            >
              {year === "all" ? "All Chapters" : `Year ${year}`}
            </button>
          ))}
          <span className="tb-year-tabs-sep" aria-hidden="true" />
          {([1, 2] as const).map((year) => (
            <button
              key={`final-${year}`}
              type="button"
              className={`tb-year-tab tb-final-tab${contentMode.kind === "final" && contentMode.year === year ? " is-active" : ""}`}
              onClick={() => handleOpenFinal(year)}
              title={`Year ${year} Final Examination`}
            >
              📋 Yr {year} Final
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
                  className={`tb-chapter-btn${selectedChapterId === chapter.id && contentMode.kind !== "final" ? " is-active" : ""}`}
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
          {contentMode.kind === "chapter-quiz" && chapterQuiz && selectedChapter ? (
            <QuizPanel
              key={`quiz-${selectedChapter.id}`}
              title={`Chapter ${selectedChapter.number} Quiz`}
              subtitle={selectedChapter.title}
              questions={chapterQuiz.questions}
              onBack={handleBackToChapter}
            />
          ) : contentMode.kind === "final" && yearFinal ? (
            <QuizPanel
              key={`final-${contentMode.year}`}
              title={yearFinal.title}
              subtitle={yearFinal.description}
              questions={yearFinal.questions}
              onBack={handleBackToChapter}
            />
          ) : selectedChapter ? (
            <ChapterView chapter={selectedChapter} onStartQuiz={handleStartChapterQuiz} />
          ) : (
            <div className="tb-empty">Select a chapter from the sidebar to begin reading.</div>
          )}
        </main>
      </div>
    </div>
  );
}
