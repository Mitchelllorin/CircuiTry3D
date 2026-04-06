import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGallery } from "../context/GalleryContext";
import { useEngagement } from "../context/EngagementContext";
import { useAuth } from "../context/AuthContext";
import "../styles/gallery.css";

const formatDate = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/**
 * Convert a data URL to a Blob-backed object URL for reliable downloads of
 * large files (browsers restrict data URL navigation for files > ~2 MB).
 * Returns the object URL; caller must revoke it when done.
 * Throws if the data URL is malformed.
 */
function dataUrlToObjectUrl(dataUrl: string, fallbackMime = "application/octet-stream"): string {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) throw new Error("Invalid data URL: missing comma separator");
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  if (!base64) throw new Error("Invalid data URL: empty payload");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const bytes = atob(base64);
  const ab = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) ab[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([ab], { type: mime }));
}

export default function Gallery() {
  const { items, removeItem } = useGallery();
  const { shareMedia } = useEngagement();
  const { currentUser } = useAuth();
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});
  // Track which video cards are currently playing (for tap-to-play overlay)
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  // Pending object URLs created for downloads — revoked after download starts or on unmount
  const pendingObjectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      pendingObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      pendingObjectUrlsRef.current = [];
    };
  }, []);

  const toggleVideoPlay = useCallback((id: string, videoEl: HTMLVideoElement) => {
    if (videoEl.paused) {
      videoEl.play().then(() => {
        setPlayingVideos((prev) => ({ ...prev, [id]: true }));
      }).catch((err) => {
        console.error("Video playback failed:", err);
      });
    } else {
      videoEl.pause();
      setPlayingVideos((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  const handleDownload = useCallback((item: { id: string; dataUrl: string; title: string; type: string }) => {
    const ext = item.type === "video" ? "webm" : "png";
    const filename = `${item.title || "circuit"}-${item.id}.${ext}`;
    // Convert data URL → object URL so large video files download reliably
    // (browsers block data URL navigation above ~2 MB).
    let objectUrl: string;
    try {
      objectUrl = dataUrlToObjectUrl(item.dataUrl, item.type === "video" ? "video/webm" : "image/png");
    } catch (err) {
      console.error("Download failed — could not convert data URL:", err);
      return;
    }
    pendingObjectUrlsRef.current.push(objectUrl);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after 2 s — enough time for the browser to begin the download
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      pendingObjectUrlsRef.current = pendingObjectUrlsRef.current.filter((u) => u !== objectUrl);
    }, 2000);
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
                <div className="gallery-card__video-wrap" role="button" tabIndex={0} aria-label={`Play ${item.title || item.circuitName}`}
                  onClick={(e) => {
                    const video = (e.currentTarget as HTMLDivElement).querySelector("video");
                    if (video) toggleVideoPlay(item.id, video);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const video = (e.currentTarget as HTMLDivElement).querySelector("video");
                      if (video) toggleVideoPlay(item.id, video);
                    }
                  }}
                >
                  <video
                    className="gallery-card__video"
                    src={item.dataUrl}
                    autoPlay={false}
                    loop
                    muted
                    playsInline
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLVideoElement).play().then(() => {
                        setPlayingVideos((prev) => ({ ...prev, [item.id]: true }));
                      }).catch((err) => {
                        console.error("Video hover-play failed:", err);
                      });
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLVideoElement).pause();
                      setPlayingVideos((prev) => ({ ...prev, [item.id]: false }));
                    }}
                    onPlay={() => setPlayingVideos((prev) => ({ ...prev, [item.id]: true }))}
                    onPause={() => setPlayingVideos((prev) => ({ ...prev, [item.id]: false }))}
                    aria-label={item.title || item.circuitName}
                  />
                  {!playingVideos[item.id] && (
                    <span className="gallery-card__play-overlay" aria-hidden="true">▶</span>
                  )}
                </div>
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
