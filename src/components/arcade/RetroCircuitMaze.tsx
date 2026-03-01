import { useCallback, useEffect, useMemo, useState } from "react";
import ArcadeController from "./ArcadeController";

type Direction = "up" | "down" | "left" | "right";
type ViewMode = "2d" | "3d";
type MazeStatus = "ready" | "running" | "won" | "gameover";
type PelletType = "dot" | "power";
type GhostTone = "cyan" | "pink" | "amber";

type Position = {
  x: number;
  y: number;
};

type GhostState = {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  direction: Direction;
  tone: GhostTone;
};

type MazeState = {
  status: MazeStatus;
  player: Position;
  playerDirection: Direction;
  queuedDirection: Direction;
  ghosts: GhostState[];
  pellets: Set<string>;
  score: number;
  lives: number;
  powerTicks: number;
  message: string;
};

type GhostTemplate = {
  id: string;
  startX: number;
  startY: number;
  direction: Direction;
  tone: GhostTone;
};

const MAZE_LAYOUT = [
  "###############",
  "#.............#",
  "#.###.###.###.#",
  "#o#.......#...#",
  "#.###.#.#.###.#",
  "#.....#.#.....#",
  "###.#.#.#.#.###",
  "#...#.....#...#",
  "#.###.###.###.#",
  "#.....#.#.....#",
  "#.###.#.#.###.#",
  "#...#.......#o#",
  "#.###.###.###.#",
  "#.............#",
  "###############",
];

const PLAYER_START: Position = { x: 1, y: 1 };
const STARTING_LIVES = 3;
const DOT_SCORE = 10;
const POWER_SCORE = 60;
const GHOST_SCORE = 200;
const POWER_TICKS = 42;
const TICK_MS = 260;

const GHOST_TEMPLATES: GhostTemplate[] = [
  { id: "ghost-cyan", startX: 13, startY: 1, direction: "left", tone: "cyan" },
  { id: "ghost-pink", startX: 13, startY: 13, direction: "left", tone: "pink" },
  { id: "ghost-amber", startX: 1, startY: 13, direction: "right", tone: "amber" },
];

const DIRECTION_ORDER: Direction[] = ["up", "down", "left", "right"];

const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

const toKey = (x: number, y: number) => `${x},${y}`;

const isWall = (x: number, y: number): boolean => {
  const row = MAZE_LAYOUT[y];
  if (!row || x < 0 || x >= row.length) {
    return true;
  }
  return row[x] === "#";
};

const canMove = (position: Position, direction: Direction): boolean => {
  const delta = DIRECTION_DELTAS[direction];
  return !isWall(position.x + delta.x, position.y + delta.y);
};

const movePosition = (position: Position, direction: Direction): Position => {
  const delta = DIRECTION_DELTAS[direction];
  return { x: position.x + delta.x, y: position.y + delta.y };
};

const manhattanDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const buildInitialGhosts = (): GhostState[] =>
  GHOST_TEMPLATES.map((ghost) => ({
    ...ghost,
    x: ghost.startX,
    y: ghost.startY,
  }));

const pelletTypesBuilder = new Map<string, PelletType>();
MAZE_LAYOUT.forEach((row, y) => {
  row.split("").forEach((tile, x) => {
    if (tile === ".") {
      pelletTypesBuilder.set(toKey(x, y), "dot");
    } else if (tile === "o") {
      pelletTypesBuilder.set(toKey(x, y), "power");
    }
  });
});

const PELLET_TYPES = pelletTypesBuilder;
const INITIAL_PELLET_KEYS = Array.from(PELLET_TYPES.keys());

const createInitialState = (status: MazeStatus): MazeState => ({
  status,
  player: { ...PLAYER_START },
  playerDirection: "right",
  queuedDirection: "right",
  ghosts: buildInitialGhosts(),
  pellets: new Set(INITIAL_PELLET_KEYS),
  score: 0,
  lives: STARTING_LIVES,
  powerTicks: 0,
  message:
    status === "ready"
      ? "Press Start to launch Circuit Chase '84."
      : "Collect every charge dot before the ghosts catch you.",
});

const collisionIndexes = (player: Position, ghosts: GhostState[]): number[] => {
  const collisions: number[] = [];
  ghosts.forEach((ghost, index) => {
    if (ghost.x === player.x && ghost.y === player.y) {
      collisions.push(index);
    }
  });
  return collisions;
};

const resolveCollisions = (state: MazeState): MazeState => {
  const hitIndexes = collisionIndexes(state.player, state.ghosts);
  if (!hitIndexes.length) {
    return state;
  }

  if (state.powerTicks > 0) {
    const eatenCount = hitIndexes.length;
    const ghosts = state.ghosts.map((ghost, index) =>
      hitIndexes.includes(index)
        ? { ...ghost, x: ghost.startX, y: ghost.startY, direction: "left" }
        : ghost,
    );

    return {
      ...state,
      ghosts,
      score: state.score + eatenCount * GHOST_SCORE,
      message: `Ghost discharged! +${eatenCount * GHOST_SCORE} points.`,
    };
  }

  const remainingLives = state.lives - 1;
  if (remainingLives <= 0) {
    return {
      ...state,
      lives: 0,
      status: "gameover",
      message: "Game over. Hit Restart Run for another try.",
    };
  }

  return {
    ...state,
    lives: remainingLives,
    player: { ...PLAYER_START },
    playerDirection: "right",
    queuedDirection: "right",
    ghosts: buildInitialGhosts(),
    powerTicks: 0,
    message: `Short circuit! ${remainingLives} lives left.`,
  };
};

const chooseGhostDirection = (
  ghost: GhostState,
  player: Position,
  frightened: boolean,
): Direction => {
  const movable = DIRECTION_ORDER.filter((direction) =>
    canMove({ x: ghost.x, y: ghost.y }, direction),
  );

  if (!movable.length) {
    return ghost.direction;
  }

  const reverse = OPPOSITE_DIRECTION[ghost.direction];
  const options =
    movable.length > 1
      ? movable.filter((direction) => direction !== reverse)
      : movable;

  const scored = options.map((direction) => {
    const candidatePosition = movePosition({ x: ghost.x, y: ghost.y }, direction);
    return {
      direction,
      distance: manhattanDistance(candidatePosition, player),
    };
  });

  scored.sort((a, b) =>
    frightened ? b.distance - a.distance : a.distance - b.distance,
  );
  const bestDistance = scored[0]?.distance;
  const best = scored.filter((item) => item.distance === bestDistance);
  const randomPick = best[Math.floor(Math.random() * best.length)];
  return randomPick?.direction ?? options[0];
};

const advanceMaze = (previous: MazeState): MazeState => {
  if (previous.status !== "running") {
    return previous;
  }

  const decayedPower = Math.max(0, previous.powerTicks - 1);
  const canUseQueued = canMove(previous.player, previous.queuedDirection);
  const canContinue = canMove(previous.player, previous.playerDirection);
  const nextDirection = canUseQueued
    ? previous.queuedDirection
    : canContinue
      ? previous.playerDirection
      : previous.playerDirection;
  const nextPlayer = canMove(previous.player, nextDirection)
    ? movePosition(previous.player, nextDirection)
    : previous.player;

  let nextState: MazeState = {
    ...previous,
    player: nextPlayer,
    playerDirection: nextDirection,
    powerTicks: decayedPower,
    message:
      decayedPower > 0
        ? `Power surge active (${decayedPower})`
        : "Collect every charge dot before the ghosts catch you.",
  };

  const playerCellKey = toKey(nextPlayer.x, nextPlayer.y);
  if (nextState.pellets.has(playerCellKey)) {
    const pellets = new Set(nextState.pellets);
    pellets.delete(playerCellKey);
    const pelletType = PELLET_TYPES.get(playerCellKey);
    const powerActive = pelletType === "power";
    const points = powerActive ? POWER_SCORE : DOT_SCORE;

    nextState = {
      ...nextState,
      pellets,
      score: nextState.score + points,
      powerTicks: powerActive ? POWER_TICKS : nextState.powerTicks,
      message: powerActive
        ? "Power core online! Ghosts are vulnerable."
        : nextState.message,
    };
  }

  nextState = resolveCollisions(nextState);
  if (nextState.status !== "running") {
    return nextState;
  }

  if (nextState.pellets.size === 0) {
    return {
      ...nextState,
      status: "won",
      message: "Board cleared. Restart Run to play again.",
    };
  }

  const frightened = nextState.powerTicks > 0;
  const movedGhosts = nextState.ghosts.map((ghost) => {
    const direction = chooseGhostDirection(ghost, nextState.player, frightened);
    const moved = canMove({ x: ghost.x, y: ghost.y }, direction)
      ? movePosition({ x: ghost.x, y: ghost.y }, direction)
      : { x: ghost.x, y: ghost.y };
    return {
      ...ghost,
      direction,
      x: moved.x,
      y: moved.y,
    };
  });

  nextState = {
    ...nextState,
    ghosts: movedGhosts,
  };

  nextState = resolveCollisions(nextState);
  if (nextState.status !== "running") {
    return nextState;
  }

  if (nextState.pellets.size === 0) {
    return {
      ...nextState,
      status: "won",
      message: "Board cleared. Restart Run to play again.",
    };
  }

  return nextState;
};

const withQueuedDirection = (
  previous: MazeState,
  direction: Direction,
): MazeState => {
  if (previous.status === "won" || previous.status === "gameover") {
    const restarted = createInitialState("running");
    return {
      ...restarted,
      queuedDirection: direction,
      playerDirection: direction,
    };
  }

  if (previous.status === "ready") {
    return {
      ...previous,
      status: "running",
      queuedDirection: direction,
      playerDirection: direction,
      message: "Collect every charge dot before the ghosts catch you.",
    };
  }

  return {
    ...previous,
    queuedDirection: direction,
  };
};

export default function RetroCircuitMaze() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [mazeState, setMazeState] = useState<MazeState>(() =>
    createInitialState("ready"),
  );

  const dotsCollected = INITIAL_PELLET_KEYS.length - mazeState.pellets.size;
  const powerPercent =
    mazeState.powerTicks > 0
      ? Math.round((mazeState.powerTicks / POWER_TICKS) * 100)
      : 0;

  const primaryActionLabel = useMemo(() => {
    if (mazeState.status === "ready") {
      return "Start Run";
    }
    if (mazeState.status === "running") {
      return "Running...";
    }
    if (mazeState.status === "won") {
      return "Restart Run";
    }
    return "Try Again";
  }, [mazeState.status]);

  const boardCells = useMemo(() => {
    const ghostByCell = new Map<string, GhostState>();
    mazeState.ghosts.forEach((ghost) => {
      ghostByCell.set(toKey(ghost.x, ghost.y), ghost);
    });

    const cells: JSX.Element[] = [];
    MAZE_LAYOUT.forEach((row, y) => {
      row.split("").forEach((tile, x) => {
        const key = toKey(x, y);
        const isPlayer = mazeState.player.x === x && mazeState.player.y === y;
        const ghost = ghostByCell.get(key);
        const pelletType = mazeState.pellets.has(key) ? PELLET_TYPES.get(key) : null;
        const wallTile = tile === "#";

        cells.push(
          <div key={key} className={`retro-maze-cell${wallTile ? " is-wall" : ""}`}>
            {!wallTile && pelletType ? (
              <span
                className={`retro-pellet${
                  pelletType === "power" ? " is-power" : ""
                }`}
              />
            ) : null}
            {ghost ? (
              <span
                className={`retro-ghost retro-ghost-${ghost.tone}${
                  mazeState.powerTicks > 0 ? " is-frightened" : ""
                }`}
              />
            ) : null}
            {isPlayer ? (
              <span
                className={`retro-player retro-facing-${mazeState.playerDirection}`}
              />
            ) : null}
          </div>,
        );
      });
    });

    return cells;
  }, [
    mazeState.ghosts,
    mazeState.pellets,
    mazeState.player.x,
    mazeState.player.y,
    mazeState.playerDirection,
    mazeState.powerTicks,
  ]);

  const queueDirection = useCallback((direction: Direction) => {
    setMazeState((previous) => withQueuedDirection(previous, direction));
  }, []);

  const handleStartOrRestart = useCallback(() => {
    setMazeState((previous) => {
      if (previous.status === "running") {
        return previous;
      }
      return createInitialState("running");
    });
  }, []);

  const handleResetBoard = useCallback(() => {
    setMazeState(createInitialState("ready"));
  }, []);

  useEffect(() => {
    if (mazeState.status !== "running") {
      return;
    }

    const tick = window.setInterval(() => {
      setMazeState((previous) => advanceMaze(previous));
    }, TICK_MS);

    return () => window.clearInterval(tick);
  }, [mazeState.status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const direction = KEY_TO_DIRECTION[key];
      if (direction) {
        event.preventDefault();
        queueDirection(direction);
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setMazeState((previous) =>
          previous.status === "running"
            ? previous
            : createInitialState("running"),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [queueDirection]);

  return (
    <section className="retro-maze" aria-label="Retro maze mini game">
      <div className="retro-maze-header">
        <div>
          <h3>Circuit Chase &#39;84</h3>
          <p>
            Retro 80s style maze mode inspired by classic arcade chasers. Grab
            every charge dot, dodge ghosts, and toggle between 2D and pseudo-3D
            cabinet views.
          </p>
        </div>
        <div
          className="retro-maze-view-toggle"
          role="group"
          aria-label="Retro view mode"
        >
          <button
            type="button"
            data-active={viewMode === "2d" ? "true" : undefined}
            onClick={() => setViewMode("2d")}
          >
            2D
          </button>
          <button
            type="button"
            data-active={viewMode === "3d" ? "true" : undefined}
            onClick={() => setViewMode("3d")}
          >
            3D
          </button>
        </div>
      </div>

      <div className="retro-maze-hud" role="status" aria-live="polite">
        <div>
          <span>Score</span>
          <strong>{mazeState.score}</strong>
        </div>
        <div>
          <span>Lives</span>
          <strong>{mazeState.lives}</strong>
        </div>
        <div>
          <span>Dots</span>
          <strong>
            {dotsCollected}/{INITIAL_PELLET_KEYS.length}
          </strong>
        </div>
        <div>
          <span>Power</span>
          <strong>{powerPercent}%</strong>
        </div>
      </div>

      <div
        className={`retro-maze-board-frame${viewMode === "3d" ? " is-3d" : ""}`}
      >
        <div
          className={`retro-maze-board${viewMode === "3d" ? " is-3d" : ""}`}
          style={{
            gridTemplateColumns: `repeat(${MAZE_LAYOUT[0]?.length ?? 0}, minmax(0, 1fr))`,
          }}
        >
          {boardCells}
        </div>
      </div>

      <p className="retro-maze-message">{mazeState.message}</p>

      <div className="retro-maze-controls">
        <ArcadeController
          onDirection={queueDirection}
          onStart={mazeState.status === "running" ? undefined : handleStartOrRestart}
          onSelect={handleResetBoard}
          onA={mazeState.status === "running" ? undefined : handleStartOrRestart}
          onB={handleResetBoard}
        />
      </div>

      <p className="retro-maze-help">
        Keyboard controls: Arrow keys or WASD to move, Enter to start.
      </p>
    </section>
  );
}
