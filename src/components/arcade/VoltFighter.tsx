import { useCallback, useEffect, useState } from "react";
import ArcadeController from "./ArcadeController";
import type { ArcadeDirection } from "./ArcadeController";

const FIGHT_TICK_MS = 80;
const AI_INTERVAL = 8;
const PLAYER_MOVE = 6;
const ENEMY_MOVE = 4;
const ATTACK_RANGE = 22;
const BASE_PLAYER_DMG = 14;
const BASE_ENEMY_DMG = 9;
const BLOCK_TICKS = 18;
const HURT_TICKS = 8;
const PLAYER_MIN_X = 8;
const PLAYER_MAX_X = 52;
const ENEMY_MIN_X = 48;
const ENEMY_MAX_X = 85;

type VoltStatus = "ready" | "running" | "won" | "lost";

type VoltState = {
  status: VoltStatus;
  playerX: number;
  enemyX: number;
  playerFacing: "right" | "left";
  enemyFacing: "right" | "left";
  playerHp: number;
  enemyHp: number;
  playerBlockTicks: number;
  enemyBlockTicks: number;
  playerHurtTicks: number;
  enemyHurtTicks: number;
  aiTicks: number;
  message: string;
  enemyIndex: number;
};

const ENEMIES = [
  { name: "Resistor Ryu", symbol: "⊗", hue: "#e74c3c" },
  { name: "Capacitor Ken", symbol: "⊖", hue: "#9b59b6" },
  { name: "Diode Dan", symbol: "⊕", hue: "#e67e22" },
];

function createFightState(status: VoltStatus, enemyIndex = 0): VoltState {
  return {
    status,
    playerX: 15,
    enemyX: 72,
    playerFacing: "right",
    enemyFacing: "left",
    playerHp: 100,
    enemyHp: 100,
    playerBlockTicks: 0,
    enemyBlockTicks: 0,
    playerHurtTicks: 0,
    enemyHurtTicks: 0,
    aiTicks: 0,
    message:
      status === "ready"
        ? `Press Start to challenge ${ENEMIES[enemyIndex].name}!`
        : `Fight! Defeat ${ENEMIES[enemyIndex].name}!`,
    enemyIndex,
  };
}

function advanceFight(state: VoltState): VoltState {
  if (state.status !== "running") return state;

  let s: VoltState = {
    ...state,
    playerBlockTicks: Math.max(0, state.playerBlockTicks - 1),
    enemyBlockTicks: Math.max(0, state.enemyBlockTicks - 1),
    playerHurtTicks: Math.max(0, state.playerHurtTicks - 1),
    enemyHurtTicks: Math.max(0, state.enemyHurtTicks - 1),
    aiTicks: state.aiTicks + 1,
  };

  if (s.aiTicks >= AI_INTERVAL) {
    s = { ...s, aiTicks: 0 };
    const dist = Math.abs(s.playerX - s.enemyX);

    if (dist > 30) {
      const dir = s.playerX > s.enemyX ? 1 : -1;
      s = {
        ...s,
        enemyX: Math.min(ENEMY_MAX_X, Math.max(ENEMY_MIN_X, s.enemyX + dir * ENEMY_MOVE * 2)),
        enemyFacing: s.playerX < s.enemyX ? "left" : "right",
      };
    } else {
      const roll = Math.random();
      if (roll < 0.45) {
        if (dist < ATTACK_RANGE) {
          const blocked = s.playerBlockTicks > 0;
          const rawDmg = BASE_ENEMY_DMG + Math.floor(Math.random() * 6);
          const dmg = blocked ? Math.floor(rawDmg * 0.25) : rawDmg;
          const newHp = Math.max(0, s.playerHp - dmg);
          s = {
            ...s,
            playerHp: newHp,
            playerHurtTicks: HURT_TICKS,
            message: blocked
              ? `⛨ Blocked! Absorbed most damage. (${newHp} HP)`
              : `💥 Hit for ${dmg}! ${newHp} HP remaining`,
          };
        } else {
          const dir = s.playerX > s.enemyX ? 1 : -1;
          s = {
            ...s,
            enemyX: Math.min(ENEMY_MAX_X, Math.max(ENEMY_MIN_X, s.enemyX + dir * ENEMY_MOVE)),
          };
        }
      } else if (roll < 0.65) {
        s = { ...s, enemyBlockTicks: BLOCK_TICKS };
      }
      s = { ...s, enemyFacing: s.playerX < s.enemyX ? "left" : "right" };
    }
  }

  if (s.playerHp <= 0) {
    return { ...s, status: "lost", message: "Grounded! Resistance was too strong." };
  }
  if (s.enemyHp <= 0) {
    return { ...s, status: "won", message: `${ENEMIES[s.enemyIndex].name} defeated! Victory! ⚡` };
  }

  return s;
}

export default function VoltFighter() {
  const [fightState, setFightState] = useState<VoltState>(() => createFightState("ready"));

  const handleStart = useCallback(() => {
    setFightState((prev) => {
      if (prev.status === "running") return prev;
      return createFightState("running", prev.enemyIndex);
    });
  }, []);

  const handleReset = useCallback(() => {
    setFightState(createFightState("ready", 0));
  }, []);

  const handleDirection = useCallback((dir: ArcadeDirection) => {
    setFightState((prev) => {
      if (prev.status !== "running") {
        return createFightState("running", prev.enemyIndex);
      }
      if (dir === "left") {
        return {
          ...prev,
          playerX: Math.max(PLAYER_MIN_X, prev.playerX - PLAYER_MOVE),
          playerFacing: "left",
        };
      }
      if (dir === "right") {
        return {
          ...prev,
          playerX: Math.min(PLAYER_MAX_X, prev.playerX + PLAYER_MOVE),
          playerFacing: "right",
        };
      }
      return prev;
    });
  }, []);

  const handleAttack = useCallback(() => {
    setFightState((prev) => {
      if (prev.status !== "running") return prev;
      const currentEnemy = ENEMIES[prev.enemyIndex];
      const dist = Math.abs(prev.playerX - prev.enemyX);
      if (dist >= ATTACK_RANGE) {
        return { ...prev, message: "Out of range! Move closer to strike." };
      }
      const blocked = prev.enemyBlockTicks > 0;
      const rawDmg = BASE_PLAYER_DMG + Math.floor(Math.random() * 8);
      const dmg = blocked ? Math.floor(rawDmg * 0.2) : rawDmg;
      const newEnemyHp = Math.max(0, prev.enemyHp - dmg);
      const won = newEnemyHp <= 0;
      return {
        ...prev,
        enemyHp: newEnemyHp,
        enemyHurtTicks: HURT_TICKS,
        message: won
          ? `${currentEnemy.name} defeated! Victory! ⚡`
          : blocked
            ? `${currentEnemy.name} blocked! Only ${dmg} damage. (${newEnemyHp} HP)`
            : `⚡ Zap! Dealt ${dmg} damage. (${newEnemyHp} HP left)`,
        status: won ? "won" : prev.status,
      };
    });
  }, []);

  const handleBlock = useCallback(() => {
    setFightState((prev) => {
      if (prev.status !== "running") return prev;
      return {
        ...prev,
        playerBlockTicks: BLOCK_TICKS,
        message: "⛨ Shielding! Incoming damage reduced.",
      };
    });
  }, []);

  useEffect(() => {
    if (fightState.status !== "running") return;
    const tick = window.setInterval(() => {
      setFightState((prev) => advanceFight(prev));
    }, FIGHT_TICK_MS);
    return () => window.clearInterval(tick);
  }, [fightState.status]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || key === "a") {
        e.preventDefault();
        handleDirection("left");
      } else if (e.key === "ArrowRight" || key === "d") {
        e.preventDefault();
        handleDirection("right");
      } else if (key === "z" || key === "x") {
        e.preventDefault();
        handleAttack();
      } else if (key === "c") {
        e.preventDefault();
        handleBlock();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDirection, handleAttack, handleBlock, handleStart]);

  const enemy = ENEMIES[fightState.enemyIndex];
  const playerHpPct = `${fightState.playerHp}%`;
  const enemyHpPct = `${fightState.enemyHp}%`;
  const playerVisual =
    fightState.playerHurtTicks > 0
      ? "hurt"
      : fightState.playerBlockTicks > 0
        ? "blocking"
        : "idle";
  const enemyVisual =
    fightState.enemyHurtTicks > 0
      ? "hurt"
      : fightState.enemyBlockTicks > 0
        ? "blocking"
        : "idle";

  const primaryLabel =
    fightState.status === "ready"
      ? "Start Fight"
      : fightState.status === "running"
        ? "Fighting…"
        : "Fight Again";

  return (
    <section className="retro-game" aria-label="Volt Fighter mini game">
      <div className="retro-maze-header">
        <div>
          <h3>Volt Fighter &#39;87</h3>
          <p>
            Battle circuit-component villains in this electrifying fighter. Use
            the D-pad to move, A to zap, B to shield against incoming charge!
          </p>
        </div>
      </div>

      {/* HP bars */}
      <div className="fight-hud" role="status" aria-live="polite">
        <div className="fight-hp-section">
          <span className="fight-hp-name">⚡ Amp</span>
          <div className="fight-hp-track">
            <div
              className="fight-hp-fill fight-hp-fill-player"
              style={{ width: playerHpPct }}
            />
          </div>
          <span className="fight-hp-value">{fightState.playerHp}</span>
        </div>
        <div className="fight-vs">VS</div>
        <div className="fight-hp-section fight-hp-section-enemy">
          <span className="fight-hp-value">{fightState.enemyHp}</span>
          <div className="fight-hp-track">
            <div
              className="fight-hp-fill fight-hp-fill-enemy"
              style={{ width: enemyHpPct }}
            />
          </div>
          <span className="fight-hp-name">{enemy.name}</span>
        </div>
      </div>

      {/* Arena */}
      <div className="fight-arena">
        <div
          className={`fight-sprite fight-sprite-player ${playerVisual}`}
          style={{ left: `${fightState.playerX}%` }}
          aria-label="Player — Amp"
        >
          <div className="fight-sprite-icon">⚡</div>
          <div className="fight-sprite-label">Amp</div>
          {playerVisual === "blocking" && (
            <div className="fight-shield" aria-hidden="true">⛨</div>
          )}
        </div>

        <div
          className={`fight-sprite fight-sprite-enemy ${enemyVisual}`}
          style={{ left: `${fightState.enemyX}%` }}
          aria-label={`Enemy — ${enemy.name}`}
        >
          <div className="fight-sprite-icon" style={{ color: enemy.hue }}>
            {enemy.symbol}
          </div>
          <div className="fight-sprite-label">{enemy.name.split(" ")[0]}</div>
          {enemyVisual === "blocking" && (
            <div className="fight-shield" aria-hidden="true">⛨</div>
          )}
        </div>

        <div className="fight-platform" aria-hidden="true" />
      </div>

      <p className="retro-maze-message">{fightState.message}</p>

      <div className="retro-maze-controls">
        <div className="retro-maze-primary-actions">
          <button
            type="button"
            onClick={handleStart}
            disabled={fightState.status === "running"}
          >
            {primaryLabel}
          </button>
          <button type="button" className="ghost" onClick={handleReset}>
            Reset
          </button>
        </div>
        <ArcadeController
          onDirection={handleDirection}
          onA={fightState.status === "running" ? handleAttack : undefined}
          onB={fightState.status === "running" ? handleBlock : undefined}
        />
      </div>

      <p className="retro-maze-help">
        Keyboard: ←/→ to move · Z/X to zap · C to shield · Enter to start.
      </p>
    </section>
  );
}
