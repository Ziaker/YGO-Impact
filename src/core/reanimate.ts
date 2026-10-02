import { deepFreeze } from "./freeze.ts";
import type { MonsterCatalog } from "./content.ts";
import type { PlayerCardState } from "./draw.ts";
import { getKeywordParameter } from "./keywords.ts";
import {
  createMonsterState,
  type MonsterBattlePosition,
  type MonsterState,
} from "./monster.ts";
import {
  createSpatialState,
  positionKey,
  type Position,
  type SpatialState,
} from "./spatial.ts";
import { findNormalSummonDestinations } from "./summon.ts";
import { removeCardFromGraveyard } from "./zones.ts";

export interface ReanimateRequest {
  readonly cardState: PlayerCardState;
  readonly catalog: MonsterCatalog;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly playerId: string;
  readonly cardInstanceId: string;
  readonly unitId: string;
  readonly anchorUnitId: string | null;
  readonly sharedVisibleTiles: readonly Position[];
  readonly destination: Position;
  readonly battlePosition: MonsterBattlePosition;
}

export interface ReanimateResult {
  readonly cardState: PlayerCardState;
  readonly spatial: SpatialState;
  readonly monsters: readonly MonsterState[];
  readonly reanimatedMonster: MonsterState;
  readonly actionCost: number;
}

export class ReanimateInvariantError extends Error {
  override readonly name = "ReanimateInvariantError";
}

export function resolveReanimate(request: ReanimateRequest): ReanimateResult {
  if (request.playerId.trim().length === 0) {
    throw new ReanimateInvariantError("playerId must not be empty.");
  }
  const card = request.cardState.graveyard.find(
    (entry) => entry.instanceId === request.cardInstanceId,
  );
  if (card === undefined) {
    throw new ReanimateInvariantError(`Card ${request.cardInstanceId} is not in the graveyard.`);
  }
  const definition = request.catalog.definitions.find(
    (entry) => entry.definitionId === card.definitionId,
  );
  if (definition === undefined) {
    throw new ReanimateInvariantError(
      `Card ${card.definitionId} does not have a matching catalog definition.`,
    );
  }
  const reanimateCost = getKeywordParameter(definition, "REANIMATE");
  if (reanimateCost === null || reanimateCost < 1) {
    throw new ReanimateInvariantError(`Card ${card.name} does not possess the REANIMATE keyword.`);
  }

  const legalDestinations = findNormalSummonDestinations(
    request.spatial,
    request.playerId,
    request.anchorUnitId,
    request.sharedVisibleTiles,
  );
  if (
    !legalDestinations.positions.some(
      (pos) => pos.x === request.destination.x && pos.y === request.destination.y,
    )
  ) {
    throw new ReanimateInvariantError(
      `Destination ${positionKey(request.destination)} is not legal for REANIMATE.`,
    );
  }

  const reanimatedMonster = createMonsterState(
    definition,
    request.unitId,
    card.instanceId,
    request.playerId,
    request.destination,
    request.battlePosition,
  );

  const removal = removeCardFromGraveyard(request.cardState, request.cardInstanceId);
  const spatial = createSpatialState(request.spatial.bases, [
    ...request.spatial.units,
    {
      unitId: reanimatedMonster.unitId,
      playerId: reanimatedMonster.ownerPlayerId,
      position: reanimatedMonster.position,
    },
  ]);
  const monsters = deepFreeze([...request.monsters, reanimatedMonster]);

  return deepFreeze({
    cardState: removal.state,
    spatial,
    monsters,
    reanimatedMonster,
    actionCost: reanimateCost,
  });
}
