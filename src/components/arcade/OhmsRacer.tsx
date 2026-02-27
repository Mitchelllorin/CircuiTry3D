import { useCallback, useEffect, useMemo, useState } from "react";
import ArcadeController from "./ArcadeController";
import type { ArcadeDirection } from "./ArcadeController";

const LANES = 3;
const TRACK_ROWS = 10;
const RACE_TICK_MS = 350;
const BOOST_TICK_MS = 195;
const BOOST_DURATION = 22;
const WIN_SCORE = 600;
const STARTING_LIVES = 3;
const LASER_TICKS = 2;
const LASER_COOLDOWN = 15;
const PLAYER_SYMBOL = "🚗";

type RaceStatus = "ready" | "running" | "won" | "gameover";

type TrackObject = {
  id: number;
  lane: number;
  row: number;
  kind: "obstacle" | "pickup";
  symbol: string;
};

type RaceState = {
  status: RaceStatus;
  playerLane: number;
  objects: TrackObject[];
  score: number;
  lives: number;
  boostTicks: number;
  distance: number;
  message: string;
  nextId: number;
  laserLane: number | null;
  laserTicks: number;
  laserCooldown: number;
};

const OBSTACLE_SYMBOLS = ["🔴", "⛔", "🚧"];
const PICKUP_SYMBOLS = ["⚡", "🔋"];

function createRaceState(status: RaceStatus): RaceState {
  return {
    status,
    playerLane: 1,
    objects: [],
    score: 0,
    lives: STARTING_LIVES,
    boostTicks: 0,
    distance: 0,
    message:
      status === "ready"
        ? "Press Start to race the circuits!"
        : "Dodge 🔴 hazards — grab ⚡🔋 pickups! (B = Laser)",
    nextId: 0,
    laserLane: null,
    laserTicks: 0,
    laserCooldown: 0,
  };
}

function advanceRace(state: RaceState): RaceState {
  if (state.status !== "running") return state;

  const boostTicks = Math.max(0, state.boostTicks - 1);
  const laserTicks = Math.max(0, state.laserTicks - 1);
  const laserCooldown = Math.max(0, state.laserCooldown - 1);
  const laserLane = laserTicks > 0 ? state.laserLane : null;
  const distance = state.distance + 1;
  const scoreGain = boostTicks > 0 ? 2 : 1;

  const moved = state.objects
    .map((obj) => ({ ...obj, row: obj.row + 1 }))
    .filter((obj) => obj.row < TRACK_ROWS);

  let lives = state.lives;
  let score = state.score + scoreGain;
  let message =
    boostTicks > 0
      ? `⚡ Boost active! (${boostTicks} ticks)`
      : "Dodge 🔴 hazards — grab ⚡🔋 pickups! (B = Laser)";

  const remaining: TrackObject[] = [];
  for (const obj of moved) {
    if (obj.row === TRACK_ROWS - 1 && obj.lane === state.playerLane) {
      if (obj.kind === "obstacle") {
        lives -= 1;
        message =
          lives > 0
            ? `💥 Hazard hit! ${lives} ${lives === 1 ? "life" : "lives"} left.`
            : "Circuit breaker! Game over.";
      } else {
        score += 50;
        message = "Power-up collected! +50 pts ⚡";
      }
    } else {
      remaining.push(obj);
    }
  }

  if (lives <= 0) {
    return {
      ...state,
      objects: remaining,
      score,
      lives: 0,
      status: "gameover",
      message: "Circuit breaker! Game over.",
      distance,
      boostTicks: 0,
      laserLane: null,
      laserTicks: 0,
      laserCooldown,
      nextId: state.nextId,
    };
  }

  if (score >= WIN_SCORE) {
    return {
      ...state,
      objects: remaining,
      score,
      lives,
      status: "won",
      message: `Lap complete! Score: ${score} — nicely driven! ⚡`,
      distance,
      boostTicks,
      laserLane,
      laserTicks,
      laserCooldown,
      nextId: state.nextId,
    };
  }

  let { nextId } = state;
  const spawned = [...remaining];

  if (distance % 3 === 0) {
    const count = Math.random() < 0.35 ? 2 : 1;
    const usedLanes = new Set<number>();
    for (let i = 0; i < count; i++) {
      let lane = Math.floor(Math.random() * LANES);
      let attempts = 0;
      while (usedLanes.has(lane) && attempts < LANES) {
        lane = (lane + 1) % LANES;
        attempts++;
      }
      usedLanes.add(lane);
      const isPickup = Math.random() < 0.25;
      spawned.push({
        id: nextId++,
        lane,
        row: 0,
        kind: isPickup ? "pickup" : "obstacle",
        symbol: isPickup
          ? PICKUP_SYMBOLS[Math.floor(Math.random() * PICKUP_SYMBOLS.length)]
          : OBSTACLE_SYMBOLS[Math.floor(Math.random() * OBSTACLE_SYMBOLS.length)],
      });
    }
  }

  return { ...state, objects: spawned, score, lives, boostTicks, laserLane, laserTicks, laserCooldown, distance, message, nextId };
}

export default function OhmsRacer() {
  const [raceState, setRaceState] = useState<RaceState>(() => createRaceState("ready"));
  const isBoosting = raceState.boostTicks > 0;

  const handleStart = useCallback(() => {
    setRaceState((prev) => {
      if (prev.status === "running") return prev;
      return createRaceState("running");
    });
  }, []);

  const handleReset = useCallback(() => {
    setRaceState(createRaceState("ready"));
  }, []);

  const handleDirection = useCallback((direction: ArcadeDirection) => {
    setRaceState((prev) => {
      if (prev.status !== "running") {
        return createRaceState("running");
      }
      if (direction === "left") {
        return { ...prev, playerLane: Math.max(0, prev.playerLane - 1) };
      }
      if (direction === "right") {
        return { ...prev, playerLane: Math.min(LANES - 1, prev.playerLane + 1) };
      }
      return prev;
    });
  }, []);

  const handleBoost = useCallback(() => {
    setRaceState((prev) => {
      if (prev.status !== "running") return prev;
      return { ...prev, boostTicks: BOOST_DURATION };
    });
  }, []);

  const handleLaser = useCallback(() => {
    setRaceState((prev) => {
      if (prev.status !== "running") return prev;
      if (prev.laserCooldown > 0) {
        return { ...prev, message: `🔄 Laser recharging… (${prev.laserCooldown} ticks)` };
      }
      const obstaclesInLane = prev.objects
        .filter((obj) => obj.lane === prev.playerLane && obj.kind === "obstacle")
        .sort((a, b) => a.row - b.row);
      let objects = prev.objects;
      let score = prev.score;
      let message = "⚡ Laser fired!";
      if (obstaclesInLane.length > 0) {
        objects = prev.objects.filter((obj) => obj.id !== obstaclesInLane[0].id);
        score += 15;
        message = "🎯 Obstacle zapped! +15 pts";
      }
      return {
        ...prev,
        objects,
        score,
        message,
        laserLane: prev.playerLane,
        laserTicks: LASER_TICKS,
        laserCooldown: LASER_COOLDOWN,
      };
    });
  }, []);

  useEffect(() => {
    if (raceState.status !== "running") return;
    const ms = isBoosting ? BOOST_TICK_MS : RACE_TICK_MS;
    const tick = window.setInterval(() => {
      setRaceState((prev) => advanceRace(prev));
    }, ms);
    return () => window.clearInterval(tick);
  }, [raceState.status, isBoosting]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || key === "a") {
        e.preventDefault();
        handleDirection("left");
      } else if (e.key === "ArrowRight" || key === "d") {
        e.preventDefault();
        handleDirection("right");
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRaceState((prev) => {
          if (prev.status === "running") {
            return { ...prev, boostTicks: BOOST_DURATION };
          }
          return createRaceState("running");
        });
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleLaser();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDirection, handleLaser]);

  const displayGrid = useMemo(() => {
    type CellKind = "empty" | "obstacle" | "pickup" | "player";
    const grid: Array<Array<{ symbol: string; kind: CellKind; isLaser: boolean }>> = Array.from(
      { length: TRACK_ROWS },
      () => Array(LANES).fill(null).map(() => ({ symbol: "", kind: "empty" as CellKind, isLaser: false })),
    );

    for (const obj of raceState.objects) {
      if (obj.row >= 0 && obj.row < TRACK_ROWS) {
        grid[obj.row][obj.lane] = { symbol: obj.symbol, kind: obj.kind, isLaser: false };
      }
    }

    if (raceState.status === "running" || raceState.status === "ready") {
      grid[TRACK_ROWS - 1][raceState.playerLane] = { symbol: PLAYER_SYMBOL, kind: "player", isLaser: false };
    }

    if (raceState.laserLane !== null && raceState.laserTicks > 0) {
      for (let row = 0; row < TRACK_ROWS - 1; row++) {
        grid[row][raceState.laserLane] = { ...grid[row][raceState.laserLane], isLaser: true };
      }
    }

    return grid;
  }, [raceState.objects, raceState.playerLane, raceState.status, raceState.laserLane, raceState.laserTicks]);

  const primaryLabel =
    raceState.status === "ready"
      ? "Start Race"
      : raceState.status === "running"
        ? "Racing…"
        : "Race Again";

  return (
    <section className="retro-game" aria-label="Ohm's Racer mini game">
      <div className="retro-maze-header">
        <div>
          <h3>Ohm&#39;s Racer &#39;85</h3>
          <p>
            Navigate your electron through the circuit board at full speed. Dodge
            resistors and capacitors — grab batteries and bulbs for bonus charge!
          </p>
        </div>
      </div>

      <div className="retro-maze-hud" role="status" aria-live="polite">
        <div>
          <span>Score</span>
          <strong>{raceState.score}</strong>
        </div>
        <div>
          <span>Lives</span>
          <strong>{raceState.lives}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{WIN_SCORE}</strong>
        </div>
        <div>
          <span>Boost</span>
          <strong>{isBoosting ? `${raceState.boostTicks}` : "Ready"}</strong>
        </div>
      </div>

      <div className="race-track-frame">
        <div className="race-track">
          {displayGrid.map((row, rowIdx) => (
            <div key={rowIdx} className="race-row">
              <div className="race-border" />
              {row.map((cell, laneIdx) => (
                <div
                  key={laneIdx}
                  className={[
                    "race-cell",
                    cell.kind === "player" ? "is-player" : "",
                    cell.kind === "obstacle" ? "is-obstacle" : "",
                    cell.kind === "pickup" ? "is-pickup" : "",
                    cell.isLaser ? "is-laser" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {cell.kind === "player" ? (
                    <span className="race-player-car">{cell.symbol}</span>
                  ) : cell.symbol}
                </div>
              ))}
              <div className="race-border" />
            </div>
          ))}
        </div>
      </div>

      <p className="retro-maze-message">{raceState.message}</p>

      <div className="retro-maze-controls">
        <ArcadeController
          onDirection={handleDirection}
          onStart={raceState.status === "running" ? undefined : handleStart}
          onSelect={handleReset}
          onA={handleBoost}
          onB={raceState.status === "running" ? handleLaser : handleReset}
          labelA="BOOST"
          labelB={raceState.laserCooldown > 0 ? "⚡…" : "LASER"}
        />
      </div>

      <p className="retro-maze-help">
        Keyboard: ←/→ or A/D to steer · Space to boost · B to fire laser.
      </p>
    </section>
  );
}
