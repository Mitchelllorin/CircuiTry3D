import "../../../styles/cinematic.css";

export type CinematicPreset = "orbit" | "atom" | "lattice" | "focus";

export type CameraKeyframe = {
  angleX: number;
  angleY: number;
  distance: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  fov: number;
  duration: number;
  easing: "linear" | "ease-in" | "ease-out" | "smooth";
};

type CinematicPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  isPlaying: boolean;
  isRecording: boolean;
  waypointCount: number;
  recordError?: string | null;
  onPlayPreset: (preset: CinematicPreset) => void;
  onPlayKeyframes: () => void;
  onStop: () => void;
  onCaptureFrame: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onAddWaypoint: () => void;
  onClearWaypoints: () => void;
};

const PRESETS: { id: CinematicPreset; icon: string; name: string; description: string }[] = [
  { id: "orbit",   icon: "🔄", name: "Orbit Sweep",    description: "Full 360° rotation" },
  { id: "atom",    icon: "⚛️",  name: "Atom Dive",      description: "Zoom to atomic level" },
  { id: "lattice", icon: "🔩", name: "Lattice Drift",  description: "Slow conductor dolly" },
  { id: "focus",   icon: "🎯", name: "Component Focus",description: "Push-in on component" },
];

export function CinematicPanel({
  isOpen,
  onToggle,
  isPlaying,
  isRecording,
  waypointCount,
  recordError,
  onPlayPreset,
  onPlayKeyframes,
  onStop,
  onCaptureFrame,
  onStartRecord,
  onStopRecord,
  onAddWaypoint,
  onClearWaypoints,
}: CinematicPanelProps) {
  return (
    <div className={`cinematic-panel${isOpen ? " open" : ""}`} role="region" aria-label="Cinematic camera controls">
      {/* Header */}
      <div className="cinematic-panel__header">
        <span className="cinematic-panel__title">
          🎬{" "}
          Cinematic Camera
          {isRecording && (
            <>
              {" "}
              <span className="cinematic-rec-dot" aria-label="Recording" />
              <span style={{ fontSize: 11, color: "rgba(239,68,68,0.9)" }}>REC</span>
            </>
          )}
          {isPlaying && (
            <span style={{ fontSize: 11, color: "rgba(99,102,241,0.9)", marginLeft: 4 }}>▶ Playing</span>
          )}
        </span>
        <button
          type="button"
          className="cinematic-panel__close"
          onClick={onToggle}
          aria-label="Close cinematic panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="cinematic-panel__body">
        {/* Preset Strip */}
        <div>
          <div className="cinematic-section-label">Quick Presets</div>
          <div className="cinematic-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`cinematic-preset-card${isPlaying ? " active" : ""}`}
                onClick={() => onPlayPreset(preset.id)}
                disabled={isRecording}
                title={preset.description}
                aria-label={`Play ${preset.name} preset`}
              >
                <span className="cinematic-preset-icon" aria-hidden="true">{preset.icon}</span>
                <span className="cinematic-preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Keyframe Timeline */}
        <div>
          <div className="cinematic-section-label">Custom Waypoints ({waypointCount})</div>
          <div className="cinematic-timeline" aria-label="Keyframe timeline">
            {waypointCount === 0 ? (
              <span className="cinematic-timeline__empty">No waypoints yet — add the current camera view as a waypoint</span>
            ) : (
              Array.from({ length: waypointCount }, (_, i) => (
                <span key={i} className="cinematic-waypoint-chip" aria-label={`Waypoint ${i + 1}`}>
                  <span aria-hidden="true">📍</span>
                  <span>{i + 1}</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="cinematic-controls">
          <button
            type="button"
            className="cinematic-btn"
            onClick={onAddWaypoint}
            disabled={isPlaying}
            title="Save current camera position as a waypoint"
          >
            + Add Waypoint
          </button>
          {waypointCount >= 2 && (
            <button
              type="button"
              className="cinematic-btn cinematic-btn--primary"
              onClick={onPlayKeyframes}
              disabled={isPlaying || isRecording}
              title="Play through your custom waypoints"
            >
              ▶ Play Custom
            </button>
          )}
          {waypointCount > 0 && (
            <button
              type="button"
              className="cinematic-btn"
              onClick={onClearWaypoints}
              disabled={isPlaying}
              title="Remove all waypoints"
            >
              ✕ Clear
            </button>
          )}
          {isPlaying && (
            <button
              type="button"
              className="cinematic-btn cinematic-btn--danger"
              onClick={onStop}
            >
              ⏹ Stop
            </button>
          )}
        </div>

        {/* Capture Row */}
        <div className="cinematic-controls">
          <button
            type="button"
            className="cinematic-btn"
            onClick={onCaptureFrame}
            title="Capture current frame as an image"
          >
            📷 Capture Frame
          </button>
          {!isRecording ? (
            <button
              type="button"
              className="cinematic-btn cinematic-btn--danger"
              onClick={onStartRecord}
              title="Start recording video"
            >
              ⏺ Start Recording
            </button>
          ) : (
            <button
              type="button"
              className="cinematic-btn cinematic-btn--success"
              onClick={onStopRecord}
              title="Stop recording and save to gallery"
            >
              ⏹ Stop Recording
            </button>
          )}
        </div>

        {/* Recording error */}
        {recordError && (
          <p className="cinematic-record-error" role="alert" aria-live="assertive">
            ⚠ {recordError}
          </p>
        )}
      </div>
    </div>
  );
}
