import { buildPartQuery, type PartQuery } from "../../affiliate";
import type { ArenaBattleAgent } from "./types";

/**
 * The one adapter between an Arena agent and the affiliate module.
 *
 * The affiliate code takes a plain shape on purpose — it is used by the
 * Builder and the catalog too, and none of them should have to know about
 * `ArenaBattleAgent`. That translation has to happen somewhere, and it happens
 * exactly once, here, so a part searched for from the leaderboard and the same
 * part searched for from a card cannot produce two different searches.
 */
export function partQueryForAgent(agent: ArenaBattleAgent): PartQuery {
  return buildPartQuery({
    name: agent.name,
    family: agent.family,
    componentNumber: agent.componentNumber,
    properties: agent.properties,
    ratings: {
      powerRating: agent.ratings.powerRating,
      maxVoltage: agent.ratings.maxVoltage,
      maxCurrent: agent.ratings.maxCurrent,
    },
  });
}
