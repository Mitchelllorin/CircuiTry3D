import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useGallery } from "../context/GalleryContext";
import { useEngagement } from "../context/EngagementContext";
import { useAuth } from "../context/AuthContext";
import "../styles/gallery.css";

const formatDate = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function Gallery() {
  const { items, removeItem } = useGallery();
  const { shareMedia } = useEngagement();
  const { currentUser } = useAuth();
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});

  const handleDownload = useCallback((item: { id: string; dataUrl: string; title: string; type: string }) => {
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = `${item.title || "circuit"}-${item.id}.${item.type === "video" ? "webm" : "png"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleShare = useCallback(
    async (item: (typeof items)[number]) => {
      setShareStatus((prev) => ({ ...prev, [item.id]: "Sharing…" }));
      const result = await shareMedia({
        dataUrl: item.dataUrl,
        type: item.type,
        title: item.title || item.circuitName,
        description: item.description,
        circuitName: item.circuitName,
      });
      setShareStatus((prev) => ({
        ...prev,
        [item.id]: result.ok ? "Shared to community ✓" : (result.message ?? "Failed"),
      }));
      setTimeout(() => {
        setShareStatus((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 3500);
    },
    [shareMedia],
  );

  if (!currentUser) {
    return (
      <div className="gallery-page">
        <div className="gallery-signin-prompt">
          <span style={{ fontSize: 36 }}>🎬</span>
          <p>Sign in to view and manage your cinematic gallery.</p>
          <Link to="/account" className="gallery-signin-prompt__link">
            Sign In / Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <div className="gallery-page__header">
        <div>
          <h1 className="gallery-page__title">🎬 My Gallery</h1>
          <p className="gallery-page__subtitle">
            {items.length === 0
              ? "No shots yet — use the Cinematic Camera in the builder to capture frames and video"
              : `${items.length} item${items.length !== 1 ? "s" : ""} saved`}
          </p>
        </div>
        <div className="gallery-page__actions">
          <Link to="/app" className="gallery-action-btn">
            ← Back to Builder
          </Link>
          <Link to="/community" className="gallery-action-btn gallery-action-btn--share">
            🌐 Community
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="gallery-empty">
          <span className="gallery-empty__icon">📷</span>
          <p className="gallery-empty__title">Your gallery is empty</p>
          <p className="gallery-empty__body">
            Open the Circuit Builder, click the 🎬 button in the toolbar, and
            capture frames or record a fly-through. Shots appear here automatically.
          </p>
          <Link to="/app" className="gallery-action-btn gallery-action-btn--share">
            Open Builder
          </Link>
        </div>
      ) : (
        <div className="gallery-grid">
          {items.map((item) => (
            <div key={item.id} className="gallery-card">
              {item.type === "image" ? (
                <img
                  className="gallery-card__thumb"
                  src={item.dataUrl}
                  alt={item.title || item.circuitName}
                  loading="lazy"
                />
              ) : (
                <video
                  className="gallery-card__video"
                  src={item.dataUrl}
                  autoPlay={false}
                  loop
                  muted
                  playsInline
                  onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => undefined)}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); }}
                  aria-label={item.title || item.circuitName}
                />
              )}
              <div className="gallery-card__body">
                <p className="gallery-card__name">{item.title || item.circuitName || "Untitled"}</p>
                <div className="gallery-card__meta">
                  <span className="gallery-card__type-badge">
                    {item.type === "image" ? "📷 Photo" : "🎥 Video"}
                  </span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                {item.description && (
                  <p className="gallery-card__description">{item.description}</p>
                )}
                <div className="gallery-card__actions">
                  <button
                    type="button"
                    className="gallery-action-btn"
                    onClick={() => handleDownload(item)}
                    title="Download"
                  >
                    ⬇ Download
                  </button>
                  <button
                    type="button"
                    className="gallery-action-btn gallery-action-btn--share"
                    onClick={() => handleShare(item)}
                    title="Share to community feed"
                  >
                    🌐 Share
                  </button>
                  <button
                    type="button"
                    className="gallery-action-btn gallery-action-btn--delete"
                    onClick={() => removeItem(item.id)}
                    title="Delete from gallery"
                  >
                    🗑
                  </button>
                </div>
                {shareStatus[item.id] && (
                  <p className={`gallery-share-status${shareStatus[item.id].includes("Failed") ? " gallery-share-status--error" : ""}`}>
                    {shareStatus[item.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
