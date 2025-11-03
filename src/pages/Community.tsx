import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useEngagement } from "../context/EngagementContext";
import type { FormEvent } from "react";
import "../styles/community.css";

const formatRelativeTime = (timestamp: number) => {
  const delta = Date.now() - timestamp;
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

export default function Community() {
  const { currentUser, getUserById } = useAuth();
  const {
    messages,
    circuits,
    reviews,
    postMessage,
    shareCircuit,
    submitReview,
    toggleMessageReaction,
    toggleCircuitLike,
    toggleReviewEndorsement,
    stats,
  } = useEngagement();

  const [chatMessage, setChatMessage] = useState("");
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const [circuitForm, setCircuitForm] = useState({ title: "", summary: "", tags: "", reference: "" });
  const [circuitStatus, setCircuitStatus] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ headline: "", body: "", rating: 5 });
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [isSubmittingCircuit, setIsSubmittingCircuit] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const averageRatingLabel = useMemo(() => {
    if (!stats.averageRating) {
      return "No reviews yet";
    }
    return `${stats.averageRating.toFixed(1)} / 5`;
  }, [stats.averageRating]);

  const handlePostMessage = async (event: FormEvent) => {
    event.preventDefault();
    setChatStatus(null);
    setIsSubmittingMessage(true);
    const result = await postMessage({ body: chatMessage });
    if (result.ok) {
      setChatMessage("");
      setChatStatus("Message posted.");
    } else {
      setChatStatus(result.message);
    }
    setIsSubmittingMessage(false);
  };

  const handleShareCircuit = async (event: FormEvent) => {
    event.preventDefault();
    setCircuitStatus(null);
    setIsSubmittingCircuit(true);
    const tags = circuitForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const result = await shareCircuit({
      title: circuitForm.title,
      summary: circuitForm.summary,
      tags,
      reference: circuitForm.reference,
    });
    if (result.ok) {
      setCircuitForm({ title: "", summary: "", tags: "", reference: "" });
      setCircuitStatus("Circuit shared with the lab.");
    } else {
      setCircuitStatus(result.message);
    }
    setIsSubmittingCircuit(false);
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    setReviewStatus(null);
    setIsSubmittingReview(true);
    const result = await submitReview(reviewForm);
    if (result.ok) {
      setReviewForm({ headline: "", body: "", rating: 5 });
      setReviewStatus("Feedback submitted. Thank you!");
    } else {
      setReviewStatus(result.message);
    }
    setIsSubmittingReview(false);
  };

  return (
    <div className="community-page">
      <header className="community-hero">
        <div>
          <span className="community-eyebrow">Community Hub</span>
          <h1>The lab where builders compare notes</h1>
          <p>Sync with other makers, trade circuit tips, and capture feedback from the people using your builds.</p>
        </div>
        <div className="community-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.memberCount}</span>
            <span className="stat-label">Active members</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalMessages}</span>
            <span className="stat-label">Chat threads</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.circuitsShared}</span>
            <span className="stat-label">Circuits shared</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{averageRatingLabel}</span>
            <span className="stat-label">Community rating</span>
          </div>
        </div>
      </header>

      <section className="community-grid">
        <article className="community-panel">
          <header className="panel-header">
            <div>
              <h2>Lab Chat</h2>
              <p>Drop quick ideas or ask for feedback on a tricky circuit stage.</p>
            </div>
            {!currentUser && <p className="panel-cta">Sign in to join the conversation.</p>}
          </header>
          <div className="community-feed" role="list">
            {messages.map((message) => {
              const author = getUserById(message.userId);
              const initials = author?.displayName
                .split(" ")
                .map((segment) => segment.trim()[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div key={message.id} className="feed-item" role="listitem">
                  <div className="feed-avatar" style={{ backgroundColor: author?.avatarColor ?? "#334155" }} aria-hidden="true">
                    {initials || "?"}
                  </div>
                  <div className="feed-body">
                    <div className="feed-meta">
                      <strong>{author?.displayName ?? "Member"}</strong>
                      <span>{formatRelativeTime(message.createdAt)}</span>
                    </div>
                    <p>{message.body}</p>
                    <button
                      type="button"
                      className="reaction-button"
                      onClick={() => toggleMessageReaction(message.id)}
                      disabled={!currentUser}
                    >
                      ⚡ {message.reactions.length}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <form className="community-form" onSubmit={handlePostMessage}>
            <textarea
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              placeholder={currentUser ? "Share what you're building..." : "Sign in to post a message"}
              rows={3}
              disabled={!currentUser || isSubmittingMessage}
            />
            <div className="form-actions">
              <span className="form-status">{chatStatus}</span>
              <button type="submit" className="form-primary" disabled={!currentUser || isSubmittingMessage}>
                {isSubmittingMessage ? "Posting…" : "Post Message"}
              </button>
            </div>
          </form>
        </article>

        <article className="community-panel">
          <header className="panel-header">
            <div>
              <h2>Circuit Gallery</h2>
              <p>Share schematics, quick exports, or Arena snapshots for review.</p>
            </div>
            {!currentUser && <p className="panel-cta">Create an account to share circuits.</p>}
          </header>
          <div className="community-cards">
            {circuits.map((circuit) => {
              const author = getUserById(circuit.userId);
              return (
                <div key={circuit.id} className="circuit-card">
                  <div className="circuit-meta">
                    <div className="circuit-author" style={{ borderColor: author?.avatarColor ?? "#1e293b" }}>
                      <span className="dot" style={{ backgroundColor: author?.avatarColor ?? "#334155" }} aria-hidden="true" />
                      <span>{author?.displayName ?? "Member"}</span>
                    </div>
                    <time dateTime={new Date(circuit.createdAt).toISOString()}>{formatRelativeTime(circuit.createdAt)}</time>
                  </div>
                  <h3>{circuit.title}</h3>
                  <p>{circuit.summary}</p>
                  {circuit.reference && (
                    <p className="circuit-reference">
                      Reference: <code>{circuit.reference}</code>
                    </p>
                  )}
                  {circuit.tags.length > 0 && (
                    <div className="circuit-tags">
                      {circuit.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="circuit-actions">
                    <button type="button" onClick={() => toggleCircuitLike(circuit.id)} disabled={!currentUser}>
                      👍 {circuit.likes.length}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <form className="community-form" onSubmit={handleShareCircuit}>
            <input
              type="text"
              placeholder="Circuit title"
              value={circuitForm.title}
              onChange={(event) => setCircuitForm({ ...circuitForm, title: event.target.value })}
              disabled={!currentUser || isSubmittingCircuit}
              required
            />
            <textarea
              placeholder="What makes this circuit worth sharing?"
              rows={3}
              value={circuitForm.summary}
              onChange={(event) => setCircuitForm({ ...circuitForm, summary: event.target.value })}
              disabled={!currentUser || isSubmittingCircuit}
              required
            />
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={circuitForm.tags}
              onChange={(event) => setCircuitForm({ ...circuitForm, tags: event.target.value })}
              disabled={!currentUser || isSubmittingCircuit}
            />
            <input
              type="text"
              placeholder="Reference link or Arena ID (optional)"
              value={circuitForm.reference}
              onChange={(event) => setCircuitForm({ ...circuitForm, reference: event.target.value })}
              disabled={!currentUser || isSubmittingCircuit}
            />
            <div className="form-actions">
              <span className="form-status">{circuitStatus}</span>
              <button type="submit" className="form-primary" disabled={!currentUser || isSubmittingCircuit}>
                {isSubmittingCircuit ? "Sharing…" : "Share Circuit"}
              </button>
            </div>
          </form>
        </article>

        <article className="community-panel">
          <header className="panel-header">
            <div>
              <h2>Feedback Wall</h2>
              <p>Read what builders are saying or record how CircuiTry3D helps your workflow.</p>
            </div>
            {!currentUser && <p className="panel-cta">Sign in to leave a review.</p>}
          </header>
          <div className="review-summary">
            <span className="review-score">{averageRatingLabel}</span>
            <span>{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
          </div>
          <div className="community-feed" role="list">
            {reviews.map((review) => {
              const author = getUserById(review.userId);
              const stars = Array.from({ length: 5 }, (_, index) => index < review.rating);
              return (
                <div key={review.id} className="review-card" role="listitem">
                  <div className="review-header">
                    <div className="review-author">
                      <span className="dot" style={{ backgroundColor: author?.avatarColor ?? "#334155" }} aria-hidden="true" />
                      <span>{author?.displayName ?? "Member"}</span>
                    </div>
                    <time dateTime={new Date(review.createdAt).toISOString()}>{formatRelativeTime(review.createdAt)}</time>
                  </div>
                  <div className="review-stars" aria-hidden="true">
                    {stars.map((active, index) => (
                      <span key={index}>{active ? "★" : "☆"}</span>
                    ))}
                  </div>
                  <h3>{review.headline}</h3>
                  <p>{review.body}</p>
                  <button type="button" onClick={() => toggleReviewEndorsement(review.id)} disabled={!currentUser}>
                    🔁 {review.endorsements.length}
                  </button>
                </div>
              );
            })}
          </div>
          <form className="community-form" onSubmit={handleSubmitReview}>
            <label className="rating-label" htmlFor="community-rating">
              Rating
              <input
                id="community-rating"
                type="range"
                min={1}
                max={5}
                step={1}
                value={reviewForm.rating}
                onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}
                disabled={!currentUser || isSubmittingReview}
              />
              <span>{reviewForm.rating} / 5</span>
            </label>
            <input
              type="text"
              placeholder="Headline"
              value={reviewForm.headline}
              onChange={(event) => setReviewForm({ ...reviewForm, headline: event.target.value })}
              disabled={!currentUser || isSubmittingReview}
              required
            />
            <textarea
              rows={3}
              placeholder="How is CircuiTry3D helping your builds?"
              value={reviewForm.body}
              onChange={(event) => setReviewForm({ ...reviewForm, body: event.target.value })}
              disabled={!currentUser || isSubmittingReview}
              required
            />
            <div className="form-actions">
              <span className="form-status">{reviewStatus}</span>
              <button type="submit" className="form-primary" disabled={!currentUser || isSubmittingReview}>
                {isSubmittingReview ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}

