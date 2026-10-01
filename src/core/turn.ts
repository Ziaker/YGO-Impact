import { deepFreeze } from "./freeze.ts";

export const TURN_RESOURCE_BUDGET = 8 as const;
export const PLAYER_COUNT = 2 as const;

export type TurnPhase = "draw" | "support" | "decision" | "action" | "end";

export interface ResourceAllocation {
  readonly actions: number;
  readonly reactions: number;
}

export interface PlayerTurnState {
  readonly playerId: string;
  readonly allocation: ResourceAllocation | null;
  readonly remaining: ResourceAllocation | null;
  readonly participationEnded: boolean;
  readonly conversionUsed: boolean;
}

export interface TurnState {
  readonly turnNumber: number;
  readonly phase: TurnPhase;
  readonly players: readonly PlayerTurnState[];
}

export interface VisiblePlayerTurnState {
  readonly playerId: string;
  readonly allocationCommitted: boolean;
  readonly participationEnded: boolean;
  readonly allocation?: ResourceAllocation;
  readonly remaining?: ResourceAllocation;
}

export interface TurnView {
  readonly turnNumber: number;
  readonly phase: TurnPhase;
  readonly players: readonly VisiblePlayerTurnState[];
}

export class TurnInvariantError extends Error {
  override readonly name = "TurnInvariantError";
}

function assertNonEmptyPlayerId(playerId: string): void {
  if (playerId.trim().length === 0) {
    throw new TurnInvariantError("playerId must not be empty.");
  }
}

function assertResourceAmount(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TurnInvariantError(`${label} must be a non-negative safe integer.`);
  }
}

function freezeAllocation(actions: number, reactions: number): ResourceAllocation {
  return deepFreeze({ actions, reactions });
}

export function createFirstTurnState(playerIds: readonly string[]): TurnState {
  if (playerIds.length !== PLAYER_COUNT) {
    throw new TurnInvariantError(`The first prototype requires exactly ${PLAYER_COUNT} players.`);
  }

  const uniquePlayerIds = new Set<string>();
  const players = playerIds.map((playerId) => {
    assertNonEmptyPlayerId(playerId);
    if (uniquePlayerIds.has(playerId)) {
      throw new TurnInvariantError(`Player id ${playerId} appears more than once.`);
    }
    uniquePlayerIds.add(playerId);
    return deepFreeze({
      playerId,
      allocation: null,
      remaining: null,
      participationEnded: false,
      conversionUsed: false,
    });
  });

  return deepFreeze({
    turnNumber: 1,
    phase: "decision" as const,
    players,
  }) as TurnState;
}

export function submitResourceAllocation(
  state: TurnState,
  playerId: string,
  allocation: ResourceAllocation,
): TurnState {
  if (state.phase !== "decision") {
    throw new TurnInvariantError("Resource allocation is only allowed during the decision phase.");
  }

  assertNonEmptyPlayerId(playerId);
  assertResourceAmount("actions", allocation.actions);
  assertResourceAmount("reactions", allocation.reactions);
  if (allocation.actions + allocation.reactions !== TURN_RESOURCE_BUDGET) {
    throw new TurnInvariantError(
      `Actions and reactions must total exactly ${TURN_RESOURCE_BUDGET} resources.`,
    );
  }

  const playerIndex = state.players.findIndex((player) => player.playerId === playerId);
  if (playerIndex < 0) {
    throw new TurnInvariantError(`Unknown player ${playerId}.`);
  }
  if (state.players[playerIndex]?.allocation !== null) {
    throw new TurnInvariantError(`Player ${playerId} has already committed an allocation this turn.`);
  }

  const players = state.players.map((player, index) =>
    index === playerIndex
      ? deepFreeze({
          playerId: player.playerId,
          allocation: freezeAllocation(allocation.actions, allocation.reactions),
          remaining: freezeAllocation(allocation.actions, allocation.reactions),
          participationEnded: false,
          conversionUsed: false,
        })
      : player,
  );
  const allAllocationsCommitted = players.every((player) => player.allocation !== null);

  return deepFreeze({
    turnNumber: state.turnNumber,
    phase: allAllocationsCommitted ? ("action" as const) : ("decision" as const),
    players,
  }) as TurnState;
}

export type ResourceKind = "action" | "reaction";

function getPlayerIndex(state: TurnState, playerId: string): number {
  assertNonEmptyPlayerId(playerId);
  const playerIndex = state.players.findIndex((player) => player.playerId === playerId);
  if (playerIndex < 0) {
    throw new TurnInvariantError(`Unknown player ${playerId}.`);
  }
  return playerIndex;
}

function assertActionPhase(state: TurnState): void {
  if (state.phase !== "action") {
    throw new TurnInvariantError("Turn resources can only be consumed during the action phase.");
  }
}

export function confirmResourceUse(
  state: TurnState,
  playerId: string,
  kind: ResourceKind,
): TurnState {
  assertActionPhase(state);
  if (kind !== "action" && kind !== "reaction") {
    throw new TurnInvariantError(`Unknown resource kind ${String(kind)}.`);
  }
  const playerIndex = getPlayerIndex(state, playerId);
  const player = state.players[playerIndex];
  if (player === undefined || player.remaining === null) {
    throw new TurnInvariantError(`Player ${playerId} has no committed allocation.`);
  }
  if (player.participationEnded) {
    throw new TurnInvariantError(`Player ${playerId} has ended participation in this turn.`);
  }

  const resourceKey = kind === "action" ? "actions" : "reactions";
  if (player.remaining[resourceKey] === 0) {
    throw new TurnInvariantError(`Player ${playerId} has no ${kind} resources remaining.`);
  }

  const remaining = freezeAllocation(
    player.remaining.actions - (kind === "action" ? 1 : 0),
    player.remaining.reactions - (kind === "reaction" ? 1 : 0),
  );
  const players = state.players.map((current, index) =>
    index === playerIndex ? deepFreeze({ ...current, remaining }) : current,
  );

  return deepFreeze({ ...state, players }) as TurnState;
}

export function endPlayerParticipation(state: TurnState, playerId: string): TurnState {
  assertActionPhase(state);
  const playerIndex = getPlayerIndex(state, playerId);
  const player = state.players[playerIndex];
  if (player === undefined || player.remaining === null) {
    throw new TurnInvariantError(`Player ${playerId} has no committed allocation.`);
  }
  if (player.participationEnded) {
    throw new TurnInvariantError(`Player ${playerId} has already ended participation in this turn.`);
  }

  const players = state.players.map((current, index) =>
    index === playerIndex
      ? deepFreeze({
          ...current,
          remaining: freezeAllocation(0, 0),
          participationEnded: true,
        })
      : current,
  );
  const allParticipationEnded = players.every((current) => current.participationEnded);

  return deepFreeze({
    ...state,
    phase: allParticipationEnded ? ("end" as const) : ("action" as const),
    players,
  }) as TurnState;
}

function assertOpenInteractionCount(openInteractionCount: number): void {
  if (!Number.isSafeInteger(openInteractionCount) || openInteractionCount < 0) {
    throw new TurnInvariantError("openInteractionCount must be a non-negative safe integer.");
  }
}

export function settleResourceExhaustion(
  state: TurnState,
  openInteractionCount: number,
  exhaustedPlayerIds: readonly string[],
): TurnState {
  assertActionPhase(state);
  assertOpenInteractionCount(openInteractionCount);
  const requestedIds = new Set<string>();
  for (const playerId of exhaustedPlayerIds) {
    getPlayerIndex(state, playerId);
    if (requestedIds.has(playerId)) {
      throw new TurnInvariantError(`Exhausted player ${playerId} appears more than once.`);
    }
    requestedIds.add(playerId);
  }
  if (openInteractionCount > 0) return state;

  const participatingPlayers = state.players.filter((player) => !player.participationEnded);
  if (participatingPlayers.length === 0) {
    return deepFreeze({ ...state, phase: "end" as const }) as TurnState;
  }

  if (participatingPlayers.length === 1) {
    const remainingPlayer = participatingPlayers[0];
    if (
      remainingPlayer?.remaining?.actions === 0 &&
      requestedIds.has(remainingPlayer.playerId)
    ) {
      if (!remainingPlayer.conversionUsed && remainingPlayer.remaining.reactions > 0) {
        const players = state.players.map((player) =>
          player.playerId === remainingPlayer.playerId
            ? deepFreeze({
                ...player,
                remaining: freezeAllocation(player.remaining?.reactions ?? 0, 0),
                conversionUsed: true,
              })
            : player,
        );
        return deepFreeze({ ...state, players }) as TurnState;
      }
      return deepFreeze({ ...state, phase: "end" as const }) as TurnState;
    }
    return state;
  }

  const playersWithoutActions = participatingPlayers.filter(
    (player) => player.remaining?.actions === 0 && requestedIds.has(player.playerId),
  );
  if (playersWithoutActions.length === PLAYER_COUNT) {
    return deepFreeze({ ...state, phase: "end" as const }) as TurnState;
  }
  if (playersWithoutActions.length !== 1) return state;

  const exhaustedPlayer = playersWithoutActions[0];
  if (exhaustedPlayer === undefined || exhaustedPlayer.conversionUsed) return state;

  const players = state.players.map((player) => {
    if (player.remaining === null) return player;
    if (player.playerId === exhaustedPlayer.playerId) {
      return deepFreeze({
        ...player,
        remaining: freezeAllocation(player.remaining.reactions, 0),
        conversionUsed: true,
      });
    }
    return deepFreeze({
      ...player,
      remaining: freezeAllocation(0, player.remaining.reactions + player.remaining.actions),
    });
  });

  const phase = players.every(
    (player) => player.participationEnded || player.remaining?.actions === 0,
  )
    ? ("end" as const)
    : state.phase;
  return deepFreeze({ ...state, phase, players }) as TurnState;
}

export function advanceCompletedPhase(state: TurnState): TurnState {
  if (state.phase === "action" || state.phase === "decision") {
    throw new TurnInvariantError(`The ${state.phase} phase has its own completion rules.`);
  }

  if (state.phase === "end") {
    const players = state.players.map((player) =>
      deepFreeze({
        playerId: player.playerId,
        allocation: null,
        remaining: null,
        participationEnded: false,
        conversionUsed: false,
      }),
    );
    return deepFreeze({
      turnNumber: state.turnNumber + 1,
      phase: "draw" as const,
      players,
    }) as TurnState;
  }

  return deepFreeze({
    ...state,
    phase: state.phase === "draw" ? ("support" as const) : ("decision" as const),
  }) as TurnState;
}

export function createTurnView(state: TurnState, viewerId: string): TurnView {
  if (!state.players.some((player) => player.playerId === viewerId)) {
    throw new TurnInvariantError(`Unknown viewer ${viewerId}.`);
  }

  const players = state.players.map((player): VisiblePlayerTurnState => {
    const visible: VisiblePlayerTurnState = {
      playerId: player.playerId,
      allocationCommitted: player.allocation !== null,
      participationEnded: player.participationEnded,
      ...(player.playerId === viewerId && player.allocation !== null
        ? {
            allocation: freezeAllocation(player.allocation.actions, player.allocation.reactions),
            ...(player.remaining !== null
              ? { remaining: freezeAllocation(player.remaining.actions, player.remaining.reactions) }
              : {}),
          }
        : {}),
    };
    return deepFreeze(visible);
  });

  return deepFreeze({
    turnNumber: state.turnNumber,
    phase: state.phase,
    players,
  }) as TurnView;
}
