import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGamification } from "../../context/GamificationContext";
import { ARCADE_RUNNER_SEEDS } from "../../data/gamification";

type RunnerHistoryEntry = {
  id: string;
  timestamp: number;
  durationMs: number;
  distance: number;
  xpEarned: number;
};

type RunnerLeaderboardRow = {
  id: string;
  name: string;
  distance: number;
  location: string;
  rank: number;
  isCurrentUser: boolean;
};

type RunnerStats = {
  bestTimeMs: number | null;
  bestDistance: number;
  totalRuns: number;
  totalDistance: number;
  totalXp: number;
  history: RunnerHistoryEntry[];
};

const STORAGE_KEY = "circuiTry3d.arcade.runner.v1";

const DEFAULT_STATS: RunnerStats = {
  bestTimeMs: null,
  bestDistance: 0,
  totalRuns: 0,
  totalDistance: 0,
  totalXp: 0,
  history: [],
};

const readStats = (): RunnerStats => {
  if (typeof window === "undefined") {
    return DEFAULT_STATS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATS;
    }
    const parsed = JSON.parse(raw) as Partial<RunnerStats>;
    return {
      ...DEFAULT_STATS,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      bestTimeMs:
        typeof parsed.bestTimeMs === "number" && Number.isFinite(parsed.bestTimeMs)
          ? parsed.bestTimeMs
          : DEFAULT_STATS.bestTimeMs,
      bestDistance:
        typeof parsed.bestDistance === "number" && Number.isFinite(parsed.bestDistance)
          ? parsed.bestDistance
          : DEFAULT_STATS.bestDistance,
      totalRuns:
        typeof parsed.totalRuns === "number" && Number.isFinite(parsed.totalRuns)
          ? parsed.totalRuns
          : DEFAULT_STATS.totalRuns,
      totalDistance:
        typeof parsed.totalDistance === "number" && Number.isFinite(parsed.totalDistance)
          ? parsed.totalDistance
          : DEFAULT_STATS.totalDistance,
      totalXp:
        typeof parsed.totalXp === "number" && Number.isFinite(parsed.totalXp)
          ? parsed.totalXp
          : DEFAULT_STATS.totalXp,
    };
  } catch (error) {
    console.warn("[Arcade Runner] Failed to read stored stats", error);
    return DEFAULT_STATS;
  }
};

const writeStats = (stats: RunnerStats) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn("[Arcade Runner] Failed to write stats", error);
  }
};

const formatDuration = (ms: number) => {
  const safeMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.round(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const computeXp = (durationMs: number, distance: number) => {
  const baseXp = 8;
  const timeBonus = Math.min(18, Math.floor(durationMs / 15000) * 2);
  const distanceBonus = Math.min(12, Math.floor(distance / 500));
  const xp = baseXp + timeBonus + distanceBonus;
  return { xp, timeBonus, distanceBonus };
};

type RunnerStatus = "idle" | "running" | "crashed";

type Obstacle = {
  lane: number;
  y: number;
  size: number;
};

const LANE_COUNT = 3;
const PLAYER_Y = 0.82;
const BASE_SPEED = 0.00024;
const SPEED_RAMP_DENOMINATOR = 14000000;
const OBSTACLE_DRIFT = 5.2;
const SPAWN_MIN_MS = 900;
const SPAWN_VARIANCE_MS = 800;

export default function CurrentRunner() {
  const { grantArcadeReward } = useGamification();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const speedRef = useRef(0.00032);
  const runningRef = useRef(false);
  const laneRef = useRef(1);
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [lane, setLane] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distance, setDistance] = useState(0);
  const [runXp, setRunXp] = useState<number | null>(null);
  const [stats, setStats] = useState<RunnerStats>(() => readStats());

  useEffect(() => {
    writeStats(stats);
  }, [stats]);

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(width * ratio);
    const targetHeight = Math.floor(height * ratio);
    if (canvas.width === targetWidth && canvas.height === targetHeight) {
      return;
    }
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }, []);

  useEffect(() => {
    updateCanvasSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateCanvasSize);
      return () => window.removeEventListener("resize", updateCanvasSize);
    }
    const observer = new ResizeObserver(updateCanvasSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateCanvasSize]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    context.save();
    context.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const renderWidth = width / (window.devicePixelRatio || 1);
    const renderHeight = height / (window.devicePixelRatio || 1);

    // Background gradient
    const gradient = context.createLinearGradient(0, 0, 0, renderHeight);
    gradient.addColorStop(0, "rgba(12, 32, 64, 0.9)");
    gradient.addColorStop(1, "rgba(4, 10, 20, 0.95)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, renderWidth, renderHeight);

    // Track lanes
    const laneWidth = renderWidth / LANE_COUNT;
    for (let i = 0; i < LANE_COUNT; i += 1) {
      if (i % 2 === 0) {
        context.fillStyle = "rgba(12, 24, 44, 0.4)";
        context.fillRect(laneWidth * i, 0, laneWidth, renderHeight);
      }
    }
    context.strokeStyle = "rgba(120, 200, 255, 0.2)";
    context.lineWidth = 2;
    for (let i = 1; i < LANE_COUNT; i += 1) {
      const x = laneWidth * i;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, renderHeight);
      context.stroke();
    }

    // Flow markers
    const flowOffset = (distanceRef.current * 0.02) % 1;
    context.strokeStyle = "rgba(120, 220, 255, 0.25)";
    context.setLineDash([4, 12]);
    context.lineWidth = 1.2;
    for (let i = 0; i < LANE_COUNT; i += 1) {
      const centerX = laneWidth * i + laneWidth / 2;
      context.beginPath();
      context.moveTo(centerX, 0);
      context.lineTo(centerX, renderHeight);
      context.stroke();
    }
    context.setLineDash([]);

    context.fillStyle = "rgba(120, 220, 255, 0.45)";
    for (let i = 0; i < 16; i += 1) {
      const y = ((i / 16 + flowOffset) % 1) * renderHeight;
      for (let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex += 1) {
        const x = laneWidth * laneIndex + laneWidth / 2 + ((i % 2) * 12 - 6);
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      }
    }

    // Player
    const playerWidth = laneWidth * 0.38;
    const playerHeight = renderHeight * 0.08;
    const playerX = laneWidth * laneRef.current + laneWidth / 2 - playerWidth / 2;
    const playerY = renderHeight * PLAYER_Y;
    context.save();
    context.shadowColor = "rgba(120, 220, 255, 0.45)";
    context.shadowBlur = 18;
    context.fillStyle = "rgba(120, 220, 255, 0.9)";
    context.fillRect(playerX, playerY, playerWidth, playerHeight);
    context.restore();
    context.fillStyle = "rgba(0, 255, 170, 0.8)";
    context.fillRect(playerX + 6, playerY + 6, playerWidth - 12, playerHeight - 12);

    // Obstacles
    obstaclesRef.current.forEach((obstacle) => {
      const obstacleWidth = laneWidth * 0.42;
      const obstacleHeight = renderHeight * obstacle.size;
      const obstacleX = laneWidth * obstacle.lane + laneWidth / 2 - obstacleWidth / 2;
      const obstacleY = renderHeight * obstacle.y;
      const obstacleGradient = context.createLinearGradient(
        obstacleX,
        obstacleY,
        obstacleX + obstacleWidth,
        obstacleY + obstacleHeight,
      );
      obstacleGradient.addColorStop(0, "rgba(255, 120, 120, 0.95)");
      obstacleGradient.addColorStop(1, "rgba(255, 80, 120, 0.7)");
      context.fillStyle = obstacleGradient;
      context.fillRect(obstacleX, obstacleY, obstacleWidth, obstacleHeight);
      context.fillStyle = "rgba(255, 200, 200, 0.6)";
      context.fillRect(obstacleX + 6, obstacleY + 6, obstacleWidth - 12, obstacleHeight * 0.2);
    });

    context.restore();
  }, []);

  const endRun = useCallback((durationMs: number, distanceMeters: number) => {
    runningRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const { xp } = computeXp(durationMs, distanceMeters);
    setRunXp(xp);
    setStatus("crashed");

    const runEntry: RunnerHistoryEntry = {
      id: `${Date.now()}-${Math.round(distanceMeters)}`,
      timestamp: Date.now(),
      durationMs,
      distance: distanceMeters,
      xpEarned: xp,
    };

    setStats((previous) => {
      const bestTimeMs =
        previous.bestTimeMs === null ? durationMs : Math.min(previous.bestTimeMs, durationMs);
      const bestDistance = Math.max(previous.bestDistance, distanceMeters);
      const totalRuns = previous.totalRuns + 1;
      const totalDistance = previous.totalDistance + distanceMeters;
      const totalXp = previous.totalXp + xp;
      return {
        ...previous,
        bestTimeMs,
        bestDistance,
        totalRuns,
        totalDistance,
        totalXp,
        history: [runEntry, ...previous.history].slice(0, 6),
      };
    });

    grantArcadeReward({
      xp,
      label: "Current Runner clear",
      bonusLabels: ["Speed run"],
    });
  }, [grantArcadeReward]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!runningRef.current) {
      return;
    }
    if (!lastFrameRef.current) {
      lastFrameRef.current = timestamp;
    }
    const delta = timestamp - lastFrameRef.current;
    lastFrameRef.current = timestamp;

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const speed = BASE_SPEED + elapsed / SPEED_RAMP_DENOMINATOR;
    speedRef.current = speed;
    distanceRef.current += speed * delta * 150;

    spawnTimerRef.current -= delta;
    if (spawnTimerRef.current <= 0) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      obstaclesRef.current.push({
        lane,
        y: -0.1,
        size: 0.06 + Math.random() * 0.05,
      });
      spawnTimerRef.current = SPAWN_MIN_MS + Math.random() * SPAWN_VARIANCE_MS;
    }

    obstaclesRef.current = obstaclesRef.current
      .map((obstacle) => ({
        ...obstacle,
        y: obstacle.y + speed * delta * OBSTACLE_DRIFT,
      }))
      .filter((obstacle) => obstacle.y < 1.2);

    const playerLane = laneRef.current;
    const collision = obstaclesRef.current.some(
      (obstacle) =>
        obstacle.lane === playerLane &&
        obstacle.y > PLAYER_Y - 0.05 &&
        obstacle.y < PLAYER_Y + 0.03,
    );

    drawScene();

    if (!lastUiUpdateRef.current || timestamp - lastUiUpdateRef.current > 120) {
      lastUiUpdateRef.current = timestamp;
      setElapsedMs(elapsed);
      setDistance(distanceRef.current);
    }

    if (collision) {
      endRun(elapsed, distanceRef.current);
      return;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [drawScene, endRun]);

  const startRun = useCallback(() => {
    obstaclesRef.current = [];
    distanceRef.current = 0;
    speedRef.current = BASE_SPEED;
    spawnTimerRef.current = 1200;
    startTimeRef.current = null;
    lastFrameRef.current = null;
    lastUiUpdateRef.current = null;
    setElapsedMs(0);
    setDistance(0);
    setRunXp(null);
    setStatus("running");
    runningRef.current = true;
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const stopRun = useCallback(() => {
    runningRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setStatus("idle");
  }, []);

  const moveLane = useCallback((direction: -1 | 1) => {
    setLane((current) => {
      const next = Math.min(LANE_COUNT - 1, Math.max(0, current + direction));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        moveLane(-1);
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        moveLane(1);
      }
      if (event.key === " " && status !== "running") {
        event.preventDefault();
        startRun();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveLane, startRun, status]);

  useEffect(() => {
    drawScene();
  }, [drawScene, status]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const summaryStats = useMemo(() => {
    return [
      { label: "Best time", value: stats.bestTimeMs ? formatDuration(stats.bestTimeMs) : "--:--" },
      { label: "Best distance", value: `${Math.round(stats.bestDistance)} m` },
      { label: "Total runs", value: `${stats.totalRuns}` },
      { label: "Total distance", value: `${Math.round(stats.totalDistance)} m` },
      { label: "Arcade XP", value: `${stats.totalXp} XP` },
    ];
  }, [stats]);

  const runnerLeaderboard = useMemo<RunnerLeaderboardRow[]>(() => {
    const userEntry = {
      id: "current-user",
      name: "You",
      distance: stats.bestDistance,
      location: "Local Session",
    };

    const combined = [...ARCADE_RUNNER_SEEDS, userEntry]
      .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index)
      .sort((a, b) => b.distance - a.distance);

    return combined.slice(0, 5).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: entry.id === userEntry.id,
    }));
  }, [stats.bestDistance]);

  return (
    <section className="runner-card">
      <div className="runner-header">
        <div>
          <h2>Current Runner</h2>
          <p>Ride the electron flow and dodge overload spikes.</p>
        </div>
        <div className={`runner-status runner-status-${status}`}>
          {status === "running" ? "Live Run" : status === "crashed" ? "Run Complete" : "Idle"}
        </div>
      </div>

      <div className="runner-grid">
        <div className="runner-canvas-shell" ref={containerRef}>
          <canvas ref={canvasRef} className="runner-canvas" />
          <div className="runner-hud">
            <div>
              <span>Time</span>
              <strong>{formatDuration(elapsedMs)}</strong>
            </div>
            <div>
              <span>Distance</span>
              <strong>{Math.round(distance)} m</strong>
            </div>
            <div>
              <span>Flow</span>
              <strong>{(speedRef.current * 1000).toFixed(2)}</strong>
            </div>
          </div>
          {status !== "running" && (
            <div className="runner-overlay">
              <strong>
                {status === "crashed"
                  ? `Run complete${runXp ? ` · +${runXp} XP` : ""}`
                  : "Press Start to run"}
              </strong>
              <span>Use ←/→ or A/D to switch lanes.</span>
            </div>
          )}
        </div>

        <div className="runner-panel">
          <div className="runner-controls">
            <button type="button" onClick={status === "running" ? stopRun : startRun}>
              {status === "running" ? "Stop Run" : "Start Run"}
            </button>
            <div className="runner-button-row">
              <button type="button" onClick={() => moveLane(-1)} aria-label="Move left">
                ⬅
              </button>
              <button type="button" onClick={() => moveLane(1)} aria-label="Move right">
                ➡
              </button>
            </div>
          </div>

          <div className="runner-stat-grid">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="runner-stat">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div className="runner-history">
            <h3>Recent runs</h3>
            {stats.history.length ? (
              <ul>
                {stats.history.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{formatDuration(entry.durationMs)}</strong>
                      <small>{Math.round(entry.distance)} m</small>
                    </div>
                    <span>+{entry.xpEarned} XP</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No runs logged yet.</p>
            )}
          </div>

          <div className="runner-leaderboard">
            <h3>Runner leaderboard</h3>
            <ul>
              {runnerLeaderboard.map((entry) => (
                <li key={entry.id} className={entry.isCurrentUser ? "is-current" : undefined}>
                  <span className="rank">#{entry.rank}</span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.location}</small>
                  </div>
                  <span>{Math.round(entry.distance)} m</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
