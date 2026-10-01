import { deepFreeze } from "./freeze.ts";
import { createRandomStream, drawUniformIndex, type RandomDrawLog } from "./random.ts";

export interface PriorityToken {
  readonly playerIds: readonly [string, string];
  readonly holderPlayerId: string;
}

export class PriorityInvariantError extends Error {
  override readonly name = "PriorityInvariantError";
}

export interface InitialPriorityResult {
  readonly token: PriorityToken;
  readonly randomLog: RandomDrawLog;
}

export function createPriorityToken(
  playerIds: readonly string[],
  initialHolderPlayerId: string,
): PriorityToken {
  if (playerIds.length !== 2 || playerIds[0] === undefined || playerIds[1] === undefined) {
    throw new PriorityInvariantError("The priority token requires exactly two players.");
  }
  if (playerIds[0].trim().length === 0 || playerIds[1].trim().length === 0) {
    throw new PriorityInvariantError("Priority player ids must not be empty.");
  }
  if (playerIds[0] === playerIds[1]) {
    throw new PriorityInvariantError("Priority player ids must be distinct.");
  }
  if (!playerIds.includes(initialHolderPlayerId)) {
    throw new PriorityInvariantError(`Unknown initial priority holder ${initialHolderPlayerId}.`);
  }

  return deepFreeze({
    playerIds: deepFreeze([playerIds[0], playerIds[1]] as const),
    holderPlayerId: initialHolderPlayerId,
  }) as PriorityToken;
}

export function alternatePriorityToken(token: PriorityToken): PriorityToken {
  const nextHolder = token.playerIds.find((playerId) => playerId !== token.holderPlayerId);
  if (nextHolder === undefined) {
    throw new PriorityInvariantError("Priority token has no valid opposing player.");
  }
  return createPriorityToken(token.playerIds, nextHolder);
}

export function drawInitialPriorityToken(
  playerIds: readonly string[],
  matchSeed: string,
): InitialPriorityResult {
  const stream = createRandomStream(matchSeed, "priority-token");
  const draw = drawUniformIndex(stream, 2);
  const holder = playerIds[draw.log.result];
  if (holder === undefined) {
    throw new PriorityInvariantError("The priority draw requires exactly two players.");
  }
  return deepFreeze({
    token: createPriorityToken(playerIds, holder),
    randomLog: draw.log,
  }) as InitialPriorityResult;
}

export function orderSimultaneousByPriority<T>(
  values: readonly T[],
  token: PriorityToken,
  getPlayerId: (value: T) => string,
): readonly T[] {
  const holderValues: T[] = [];
  const opposingValues: T[] = [];

  for (const value of values) {
    const playerId = getPlayerId(value);
    if (!token.playerIds.includes(playerId)) {
      throw new PriorityInvariantError(`Unknown simultaneous-event player ${playerId}.`);
    }
    (playerId === token.holderPlayerId ? holderValues : opposingValues).push(value);
  }

  return deepFreeze([...holderValues, ...opposingValues]);
}
