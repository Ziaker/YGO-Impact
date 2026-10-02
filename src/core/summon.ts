import { deepFreeze } from "./freeze.ts";
import type { MonsterCatalog } from "./content.ts";
import type { PlayerCardState } from "./draw.ts";
import {
  createMonsterState,
  type MonsterBattlePosition,
  type MonsterState,
} from "./monster.ts";
import {
  MAX_MONSTERS_PER_PLAYER,
  createSpatialState,
  isInBounds,
  isTilePhysicallyFree,
  positionKey,
  type Position,
  type SpatialState,
} from "./spatial.ts";
import { removeCardFromHand } from "./zones.ts";

export const NORMAL_SUMMON_FALLBACK_DISTANCE = 3 as const;

export interface NormalSummonDestinations {
  readonly anchor: Position;
  readonly distanceFromAnchor: number | null;
  readonly usedFallback: boolean;
  readonly positions: readonly Position[];
}

export interface NormalSummonRequest {
  readonly cardState: PlayerCardState;
  readonly catalog: MonsterCatalog;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly playerId: string;
  readonly cardInstanceId: string;
  readonly unitId: string;
  readonly anchorUnitId: string | null;
  /** Must be calculated by the authoritative visibility system, never trusted from UI input. */
  readonly sharedVisibleTiles: readonly Position[];
  readonly destination: Position;
  readonly battlePosition: MonsterBattlePosition;
}

export interface NormalSummonResult {
  readonly cardState: PlayerCardState;
  readonly spatial: SpatialState;
  readonly monsters: readonly MonsterState[];
  readonly summonedMonster: MonsterState;
  readonly legalDestinations: NormalSummonDestinations;
}

export class SummonInvariantError extends Error {
  override readonly name = "SummonInvariantError";
}

function comparePositions(left: Position, right: Position): number {
  return left.y - right.y || left.x - right.x;
}

function visibleKeys(visibleTiles: readonly Position[]): Set<string> {
  const result = new Set<string>();
  for (const position of visibleTiles) {
    if (!isInBounds(position)) {
      throw new SummonInvariantError("Every shared-visibility tile must be inside the map.");
    }
    result.add(positionKey(position));
  }
  return result;
}

function positionsAtOrthogonalDistance(anchor: Position, distance: number): readonly Position[] {
  const positions: Position[] = [];
  for (let deltaX = -distance; deltaX <= distance; deltaX += 1) {
    const deltaY = distance - Math.abs(deltaX);
    const candidates =
      deltaY === 0
        ? [{ x: anchor.x + deltaX, y: anchor.y }]
        : [
            { x: anchor.x + deltaX, y: anchor.y - deltaY },
            { x: anchor.x + deltaX, y: anchor.y + deltaY },
          ];
    for (const position of candidates) {
      if (isInBounds(position)) positions.push(position);
    }
  }
  return positions.sort(comparePositions);
}

export function findNormalSummonDestinations(
  state: SpatialState,
  playerId: string,
  anchorUnitId: string | null,
  sharedVisibleTiles: readonly Position[],
): NormalSummonDestinations {
  if (playerId.trim().length === 0) throw new SummonInvariantError("playerId must not be empty.");
  const ownUnits = state.units.filter((unit) => unit.playerId === playerId);
  if (ownUnits.length >= MAX_MONSTERS_PER_PLAYER) {
    throw new SummonInvariantError(
      `Player ${playerId} already controls ${MAX_MONSTERS_PER_PLAYER} monsters on the map.`,
    );
  }

  let anchor: Position;
  if (ownUnits.length === 0) {
    if (anchorUnitId !== null) {
      throw new SummonInvariantError("The base is the required anchor when no allied monster is on the map.");
    }
    const base = state.bases.find((entry) => entry.playerId === playerId);
    if (base === undefined) throw new SummonInvariantError(`Player ${playerId} has no base.`);
    anchor = base.position;
  } else {
    if (anchorUnitId === null) {
      throw new SummonInvariantError("An allied monster anchor must be selected.");
    }
    const unit = ownUnits.find((entry) => entry.unitId === anchorUnitId);
    if (unit === undefined) {
      throw new SummonInvariantError(`Unit ${anchorUnitId} is not an allied summon anchor.`);
    }
    anchor = unit.position;
  }

  const visibility = visibleKeys(sharedVisibleTiles);
  for (let distance = 1; distance <= 1 + NORMAL_SUMMON_FALLBACK_DISTANCE; distance += 1) {
    const positions = positionsAtOrthogonalDistance(anchor, distance)
      .filter((position) => visibility.has(positionKey(position)))
      .filter((position) => isTilePhysicallyFree(state, position))
      .map((position) => deepFreeze({ ...position }));
    if (positions.length > 0) {
      return deepFreeze({
        anchor: deepFreeze({ ...anchor }),
        distanceFromAnchor: distance,
        usedFallback: distance > 1,
        positions: deepFreeze(positions),
      }) as NormalSummonDestinations;
    }
  }

  return deepFreeze({
    anchor: deepFreeze({ ...anchor }),
    distanceFromAnchor: null,
    usedFallback: false,
    positions: deepFreeze([]),
  }) as NormalSummonDestinations;
}

export function resolveNormalSummon(request: NormalSummonRequest): NormalSummonResult {
  if (request.cardState.playerId !== request.playerId) {
    throw new SummonInvariantError(
      `Card state for ${request.cardState.playerId} cannot be used by ${request.playerId}.`,
    );
  }
  if (request.unitId.trim().length === 0) {
    throw new SummonInvariantError("unitId must not be empty.");
  }
  if (request.monsters.length !== request.spatial.units.length) {
    throw new SummonInvariantError("Monster and spatial state contain different unit counts.");
  }
  const representedCards = new Set<string>();
  for (const monster of request.monsters) {
    const placement = request.spatial.units.find((unit) => unit.unitId === monster.unitId);
    if (
      placement === undefined ||
      placement.playerId !== monster.ownerPlayerId ||
      placement.position.x !== monster.position.x ||
      placement.position.y !== monster.position.y
    ) {
      throw new SummonInvariantError(
        `Unit ${monster.unitId} has inconsistent monster and spatial state.`,
      );
    }
    if (representedCards.has(monster.cardInstanceId)) {
      throw new SummonInvariantError(
        `Physical card ${monster.cardInstanceId} represents more than one monster.`,
      );
    }
    representedCards.add(monster.cardInstanceId);
  }
  if (
    request.monsters.some((monster) => monster.unitId === request.unitId) ||
    request.spatial.units.some((unit) => unit.unitId === request.unitId)
  ) {
    throw new SummonInvariantError(`Unit id ${request.unitId} already exists.`);
  }
  if (representedCards.has(request.cardInstanceId)) {
    throw new SummonInvariantError(
      `Physical card ${request.cardInstanceId} is already represented on the map.`,
    );
  }

  const card = request.cardState.hand.find(
    (entry) => entry.instanceId === request.cardInstanceId,
  );
  if (card === undefined) {
    throw new SummonInvariantError(`Card ${request.cardInstanceId} is not in the hand.`);
  }
  if (card.kind !== "normal_monster") {
    throw new SummonInvariantError("Only a Normal Monster can use Normal Summon.");
  }
  const definition = request.catalog.definitions.find(
    (entry) => entry.definitionId === card.definitionId,
  );
  if (definition === undefined || definition.type !== "normal" || definition.name !== card.name) {
    throw new SummonInvariantError(
      `Normal Monster ${card.definitionId} does not have a matching catalog definition.`,
    );
  }
  if (definition.level >= 5) {
    throw new SummonInvariantError(
      `Level ${definition.level} Normal Monster ${card.name} requires Tribute Summon and cannot be Normal Summoned directly.`,
    );
  }

  const legalDestinations = findNormalSummonDestinations(
    request.spatial,
    request.playerId,
    request.anchorUnitId,
    request.sharedVisibleTiles,
  );
  if (
    !legalDestinations.positions.some(
      (position) =>
        position.x === request.destination.x && position.y === request.destination.y,
    )
  ) {
    throw new SummonInvariantError(
      `Destination ${positionKey(request.destination)} is not legal for this Normal Summon.`,
    );
  }

  const summonedMonster = createMonsterState(
    definition,
    request.unitId,
    card.instanceId,
    request.playerId,
    request.destination,
    request.battlePosition,
  );
  const removal = removeCardFromHand(request.cardState, request.cardInstanceId);
  const spatial = createSpatialState(request.spatial.bases, [
    ...request.spatial.units,
    {
      unitId: summonedMonster.unitId,
      playerId: summonedMonster.ownerPlayerId,
      position: summonedMonster.position,
    },
  ]);
  const monsters = deepFreeze([...request.monsters, summonedMonster]);

  return deepFreeze({
    cardState: removal.state,
    spatial,
    monsters,
    summonedMonster,
    legalDestinations,
  }) as NormalSummonResult;
}
