import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeDamage,
  createAttackLogEntry,
  getNextTurnAgentId,
} from "./battleMath";
import type {
  ArenaBattleAgent,
  ArenaBattleHighlight,
  ArenaBattleLogEntry,
  ArenaBattleStatus,
} from "./types";

type UseArenaBattleOptions = {
  initialAgents: ArenaBattleAgent[];
  autoStart: boolean;
};

type ArenaBattleState = {
  agents: ArenaBattleAgent[];
  battleLog: ArenaBattleLogEntry[];
  currentTurnAgentId: string | null;
  winnerId: string | null;
  round: number;
  status: ArenaBattleStatus;
  highlight: ArenaBattleHighlight | null;
};

function createInitialBattleState(initialAgents: ArenaBattleAgent[]): ArenaBattleState {
  const introLog: ArenaBattleLogEntry[] = [
    {
      id: "arena-intro",
      kind: "system",
      round: 0,
      message: "Combatants spawn onto the neon test floor.",
    },
    ...initialAgents.map((agent, index) => ({
      id: `spawn-${agent.id}`,
      kind: "system" as const,
      round: 0,
      message: `${index + 1}. ${agent.name} enters with ${agent.attack} ATK / ${agent.defense} DEF.`,
    })),
  ];

  return {
    agents: initialAgents,
    battleLog: introLog,
    currentTurnAgentId: null,
    winnerId: null,
    round: 0,
    status: "ready",
    highlight: null,
  };
}

function capBattleLog(entries: ArenaBattleLogEntry[]): ArenaBattleLogEntry[] {
  return entries.slice(-18);
}

export function useArenaBattle({
  initialAgents,
  autoStart,
}: UseArenaBattleOptions) {
  const stableAgents = useMemo(() => initialAgents, [initialAgents]);
  const [state, setState] = useState(() => createInitialBattleState(stableAgents));

  useEffect(() => {
    setState(createInitialBattleState(stableAgents));
  }, [stableAgents]);

  useEffect(() => {
    if (!autoStart) {
      return;
    }

    setState((previous) => {
      if (previous.status !== "ready") {
        return previous;
      }

      return {
        ...previous,
        status: "battling",
        battleLog: capBattleLog([
          ...previous.battleLog,
          {
            id: "arena-battle-start",
            kind: "system",
            round: 0,
            message: "Battle sequence engaged. Orbit controls unlocked.",
          },
        ]),
      };
    });
  }, [autoStart]);

  const advanceBattle = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "battling") {
        return previous;
      }

      const livingAgents = previous.agents.filter((agent) => agent.health > 0);
      if (livingAgents.length <= 1) {
        const winner = livingAgents[0] ?? null;
        return {
          ...previous,
          status: "complete",
          winnerId: winner?.id ?? null,
          battleLog: capBattleLog([
            ...previous.battleLog,
            {
              id: "arena-complete",
              kind: "result",
              round: previous.round,
              message: winner
                ? `${winner.name} is the last agent standing.`
                : "Arena shutdown: no surviving agents.",
            },
          ]),
        };
      }

      const attackerId = getNextTurnAgentId(previous.agents, previous.currentTurnAgentId);
      const attacker = livingAgents.find((agent) => agent.id === attackerId);
      if (!attacker) {
        return previous;
      }

      const possibleTargets = livingAgents.filter((agent) => agent.id !== attacker.id);
      if (!possibleTargets.length) {
        return {
          ...previous,
          status: "complete",
          winnerId: attacker.id,
        };
      }

      const targetIndex = Math.floor(Math.random() * possibleTargets.length);
      const target = possibleTargets[targetIndex] ?? possibleTargets[0];
      const damage = computeDamage(attacker, target, Math.random());
      const nextRound = previous.round + 1;

      const nextAgents = previous.agents.map((agent) =>
        agent.id === target.id
          ? { ...agent, health: Math.max(0, agent.health - damage) }
          : agent,
      );

      const livingAfterAttack = nextAgents.filter((agent) => agent.health > 0);
      const winnerId =
        livingAfterAttack.length === 1 ? livingAfterAttack[0]?.id ?? null : null;
      const nextStatus = winnerId ? "complete" : "battling";

      const attackLog = createAttackLogEntry(attacker, target, damage, nextRound);
      const resultLog =
        nextStatus === "complete"
          ? [
              {
                id: `arena-winner-${winnerId}`,
                kind: "result" as const,
                round: nextRound,
                message: `${livingAfterAttack[0]?.name ?? "Unknown"} wins the arena.`,
              },
            ]
          : [];

      return {
        agents: nextAgents,
        battleLog: capBattleLog([...previous.battleLog, attackLog, ...resultLog]),
        currentTurnAgentId: attacker.id,
        winnerId,
        round: nextRound,
        status: nextStatus,
        highlight: {
          actorId: attacker.id,
          targetId: target.id,
          damage,
          token: nextRound,
        },
      };
    });
  }, []);

  useEffect(() => {
    if (!autoStart || state.status !== "battling") {
      return;
    }

    const timerId = window.setTimeout(advanceBattle, state.round === 0 ? 900 : 1400);
    return () => window.clearTimeout(timerId);
  }, [advanceBattle, autoStart, state.round, state.status]);

  const resetBattle = useCallback(() => {
    setState(createInitialBattleState(stableAgents));
  }, [stableAgents]);

  return {
    agents: state.agents,
    battleLog: state.battleLog,
    currentTurnAgentId: state.currentTurnAgentId,
    winnerId: state.winnerId,
    round: state.round,
    status: state.status,
    highlight: state.highlight,
    resetBattle,
  };
}
