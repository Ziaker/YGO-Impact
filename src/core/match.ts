import { deepFreeze } from "./freeze.ts";
import { orderSimultaneousByPriority, type PriorityToken } from "./priority.ts";

export const BASE_IMPACTS_TO_WIN = 5 as const;

export type AttackType = "basic" | "effect";
export type BattlePosition = "attack" | "defense";
export type MatchStatus = "active" | "finished";
export type MatchEndReason = "base_impacts" | "deck_out" | "simultaneous_deck_out";

export interface PlayerMatchState {
  readonly playerId: string;
  readonly baseImpactsReceived: number;
}

export interface MatchState {
  readonly status: MatchStatus;
  readonly winnerPlayerId: string | null;
  readonly endReason: MatchEndReason | null;
  readonly players: readonly PlayerMatchState[];
}

export interface BaseAttackResolution {
  readonly attackerPlayerId: string;
  readonly defenderPlayerId: string;
  readonly attackType: AttackType;
  readonly attackerPosition: BattlePosition;
  readonly anyPartResolved: boolean;
  readonly hitBaseValidly: boolean;
}

export interface BaseAttackResult {
  readonly state: MatchState;
  readonly impactRecorded: boolean;
  readonly attackerRequiresReposition: boolean;
  readonly matchEnded: boolean;
}

export interface SimultaneousBaseAttackResult {
  readonly state: MatchState;
  readonly orderedAttackerPlayerIds: readonly string[];
  readonly resolvedCount: number;
  readonly canceledCount: number;
}

export class MatchInvariantError extends Error {
  override readonly name = "MatchInvariantError";
}

function assertPlayerIds(playerIds: readonly string[]): void {
  if (playerIds.length !== 2) {
    throw new MatchInvariantError("The first prototype requires exactly two match players.");
  }
  const unique = new Set<string>();
  for (const playerId of playerIds) {
    if (playerId.trim().length === 0) {
      throw new MatchInvariantError("playerId must not be empty.");
    }
    if (unique.has(playerId)) {
      throw new MatchInvariantError(`Player id ${playerId} appears more than once.`);
    }
    unique.add(playerId);
  }
}

export function createMatchState(playerIds: readonly string[]): MatchState {
  assertPlayerIds(playerIds);
  return deepFreeze({
    status: "active" as const,
    winnerPlayerId: null,
    endReason: null,
    players: playerIds.map((playerId) => deepFreeze({ playerId, baseImpactsReceived: 0 })),
  }) as MatchState;
}

export function resolveDeckOut(state: MatchState, loserPlayerIds: readonly string[]): MatchState {
  if (state.status !== "active") {
    throw new MatchInvariantError("Deck Out cannot resolve after the match has finished.");
  }
  if (loserPlayerIds.length === 0 || loserPlayerIds.length > state.players.length) {
    throw new MatchInvariantError("Deck Out requires one or two losing players.");
  }
  const uniqueLosers = new Set(loserPlayerIds);
  if (uniqueLosers.size !== loserPlayerIds.length) {
    throw new MatchInvariantError("A Deck Out loser cannot appear more than once.");
  }
  for (const playerId of uniqueLosers) {
    assertKnownPlayer(state, playerId, "Deck Out");
  }
  const winner =
    uniqueLosers.size === state.players.length
      ? null
      : (state.players.find((player) => !uniqueLosers.has(player.playerId))?.playerId ?? null);
  return deepFreeze({
    ...state,
    status: "finished" as const,
    winnerPlayerId: winner,
    endReason:
      uniqueLosers.size === state.players.length
        ? ("simultaneous_deck_out" as const)
        : ("deck_out" as const),
  }) as MatchState;
}

function assertKnownPlayer(state: MatchState, playerId: string, role: string): void {
  if (!state.players.some((player) => player.playerId === playerId)) {
    throw new MatchInvariantError(`Unknown ${role} player ${playerId}.`);
  }
}

function noImpact(state: MatchState): BaseAttackResult {
  return deepFreeze({
    state,
    impactRecorded: false,
    attackerRequiresReposition: false,
    matchEnded: false,
  }) as BaseAttackResult;
}

export function resolveBaseAttack(state: MatchState, resolution: BaseAttackResolution): BaseAttackResult {
  if (state.status !== "active") {
    throw new MatchInvariantError("No attack can resolve after the match has finished.");
  }
  assertKnownPlayer(state, resolution.attackerPlayerId, "attacker");
  assertKnownPlayer(state, resolution.defenderPlayerId, "defender");
  if (resolution.attackerPlayerId === resolution.defenderPlayerId) {
    throw new MatchInvariantError("A player cannot generate an impact against their own base.");
  }
  if (resolution.attackType !== "basic" && resolution.attackType !== "effect") {
    throw new MatchInvariantError(`Unknown attack type ${String(resolution.attackType)}.`);
  }
  if (resolution.attackerPosition !== "attack" && resolution.attackerPosition !== "defense") {
    throw new MatchInvariantError(`Unknown battle position ${String(resolution.attackerPosition)}.`);
  }
  if (
    typeof resolution.anyPartResolved !== "boolean" ||
    typeof resolution.hitBaseValidly !== "boolean"
  ) {
    throw new MatchInvariantError("Base attack resolution flags must be boolean.");
  }

  const createsImpact =
    resolution.attackType === "basic" &&
    resolution.attackerPosition === "attack" &&
    resolution.anyPartResolved &&
    resolution.hitBaseValidly;
  if (!createsImpact) return noImpact(state);

  const players = state.players.map((player) =>
    player.playerId === resolution.defenderPlayerId
      ? deepFreeze({ ...player, baseImpactsReceived: player.baseImpactsReceived + 1 })
      : player,
  );
  const defender = players.find((player) => player.playerId === resolution.defenderPlayerId);
  const matchEnded = defender?.baseImpactsReceived === BASE_IMPACTS_TO_WIN;
  const nextState = deepFreeze({
    status: matchEnded ? ("finished" as const) : ("active" as const),
    winnerPlayerId: matchEnded ? resolution.attackerPlayerId : null,
    endReason: matchEnded ? ("base_impacts" as const) : null,
    players,
  }) as MatchState;

  return deepFreeze({
    state: nextState,
    impactRecorded: true,
    attackerRequiresReposition: true,
    matchEnded,
  }) as BaseAttackResult;
}

export function resolveSimultaneousBaseAttacks(
  state: MatchState,
  token: PriorityToken,
  resolutions: readonly BaseAttackResolution[],
): SimultaneousBaseAttackResult {
  const ordered = orderSimultaneousByPriority(
    resolutions,
    token,
    (resolution) => resolution.attackerPlayerId,
  );
  let nextState = state;
  let resolvedCount = 0;

  for (const resolution of ordered) {
    if (nextState.status === "finished") break;
    nextState = resolveBaseAttack(nextState, resolution).state;
    resolvedCount += 1;
  }

  return deepFreeze({
    state: nextState,
    orderedAttackerPlayerIds: ordered.map((resolution) => resolution.attackerPlayerId),
    resolvedCount,
    canceledCount: ordered.length - resolvedCount,
  }) as SimultaneousBaseAttackResult;
}
