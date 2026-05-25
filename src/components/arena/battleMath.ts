import type { ArenaBattleAgent, ArenaBattleLogEntry } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getLivingAgents(agents: ArenaBattleAgent[]): ArenaBattleAgent[] {
  return agents.filter((agent) => agent.health > 0);
}

export function computeDamage(
  attacker: ArenaBattleAgent,
  target: ArenaBattleAgent,
  randomValue: number,
): number {
  const offense =
    attacker.attack +
    attacker.metrics.voltage * 0.65 +
    attacker.metrics.current * 10 +
    Math.sqrt(attacker.metrics.power) * 2.2;
  const defense =
    target.defense + Math.log10(target.metrics.resistance + 1) * 5.5;
  const variance = 0.9 + randomValue * 0.32;

  return clamp(Math.round(offense * variance - defense * 0.58), 6, 44);
}

export function getNextTurnAgentId(
  agents: ArenaBattleAgent[],
  currentTurnAgentId: string | null,
): string | null {
  const livingAgents = getLivingAgents(agents);
  if (!livingAgents.length) {
    return null;
  }

  if (!currentTurnAgentId) {
    return livingAgents[0]?.id ?? null;
  }

  const currentIndex = livingAgents.findIndex((agent) => agent.id === currentTurnAgentId);
  if (currentIndex === -1) {
    return livingAgents[0]?.id ?? null;
  }

  return livingAgents[(currentIndex + 1) % livingAgents.length]?.id ?? null;
}

export function createAttackLogEntry(
  attacker: ArenaBattleAgent,
  target: ArenaBattleAgent,
  damage: number,
  round: number,
): ArenaBattleLogEntry {
  const defeatedSuffix =
    target.health - damage <= 0 ? ` ${target.name} burns out.` : "";

  return {
    id: `${attacker.id}-${target.id}-${round}-${damage}`,
    kind: "attack",
    round,
    actorId: attacker.id,
    targetId: target.id,
    damage,
    abilityName: attacker.abilityName,
    message: `${attacker.name} uses ${attacker.abilityName} on ${target.name} for ${damage} damage.${defeatedSuffix}`,
  };
}
