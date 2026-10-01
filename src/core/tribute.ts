import { deepFreeze } from "./freeze.ts";
import type { MonsterCatalog } from "./content.ts";
import type { CardInstance, PlayerCardState } from "./draw.ts";
import {
  createMonsterState,
  type MonsterBattlePosition,
  type MonsterDefinition,
  type MonsterState,
} from "./monster.ts";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  createSpatialState,
  isInBounds,
  isTilePhysicallyFree,
  type Position,
  type SpatialState,
} from "./spatial.ts";
import { addCardToGraveyard, removeCardFromHand } from "./zones.ts";

export interface TributeSummonPlan {
  readonly tributeUnitIds: readonly string[];
  readonly totalTributeLevels: number;
  readonly releasedPositions: readonly Position[];
}

export interface TributeSummonRequest {
  readonly cardState: PlayerCardState;
  readonly catalog: MonsterCatalog;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly playerId: string;
  readonly cardInstanceId: string;
  readonly unitId: string;
  readonly tributeUnitIds: readonly string[];
  readonly destination: Position;
  readonly battlePosition: MonsterBattlePosition;
}

export interface TributeSummonResult {
  readonly cardState: PlayerCardState;
  readonly spatial: SpatialState;
  readonly monsters: readonly MonsterState[];
  readonly summonedMonster: MonsterState;
  readonly plan: TributeSummonPlan;
}

export class TributeInvariantError extends Error {
  override readonly name = "TributeInvariantError";
}

export function createTributeSummonPlan(
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  playerId: string,
  target: MonsterDefinition,
  tributeUnitIds: readonly string[],
): TributeSummonPlan {
  if (playerId.trim().length === 0) throw new TributeInvariantError("playerId must not be empty.");
  if (target.type !== "effect") {
    throw new TributeInvariantError("Only an Effect Monster uses the prototype Tribute Summon rule.");
  }
  if (tributeUnitIds.length === 0) {
    throw new TributeInvariantError("A Tribute Summon requires at least one Normal Monster.");
  }
  if (new Set(tributeUnitIds).size !== tributeUnitIds.length) {
    throw new TributeInvariantError("A tribute unit cannot be selected more than once.");
  }

  const selected = tributeUnitIds.map((unitId) => {
    const monster = monsters.find((entry) => entry.unitId === unitId);
    if (monster === undefined) throw new TributeInvariantError(`Unknown tribute unit ${unitId}.`);
    if (monster.ownerPlayerId !== playerId) {
      throw new TributeInvariantError(`Unit ${unitId} is not controlled by ${playerId}.`);
    }
    if (monster.type !== "normal") {
      throw new TributeInvariantError(`Unit ${unitId} is not a Normal Monster.`);
    }
    const placement = spatial.units.find((entry) => entry.unitId === unitId);
    if (
      placement === undefined ||
      placement.playerId !== monster.ownerPlayerId ||
      placement.position.x !== monster.position.x ||
      placement.position.y !== monster.position.y
    ) {
      throw new TributeInvariantError(`Unit ${unitId} has inconsistent monster and spatial state.`);
    }
    return monster;
  });
  const totalTributeLevels = selected.reduce((total, monster) => total + monster.level, 0);
  if (totalTributeLevels < target.level) {
    throw new TributeInvariantError(
      `Tribute levels total ${totalTributeLevels}, below target level ${target.level}.`,
    );
  }

  const remainingSpatial: SpatialState = {
    bases: spatial.bases,
    units: spatial.units.filter((unit) => !tributeUnitIds.includes(unit.unitId)),
  };
  const releasedPositions = selected
    .map((monster) => monster.position)
    .filter((position) => isTilePhysicallyFree(remainingSpatial, position))
    .map((position) => deepFreeze({ ...position }))
    .sort((left, right) => left.y - right.y || left.x - right.x);
  if (releasedPositions.length === 0) {
    throw new TributeInvariantError("No legal destination would remain after paying the Tributes.");
  }

  return deepFreeze({
    tributeUnitIds: deepFreeze([...tributeUnitIds]),
    totalTributeLevels,
    releasedPositions: deepFreeze(releasedPositions),
  }) as TributeSummonPlan;
}

export function findTributeSummonFallback(
  spatial: SpatialState,
  releasedPositions: readonly Position[],
): readonly Position[] {
  if (releasedPositions.length === 0) {
    throw new TributeInvariantError("At least one released Tribute position is required.");
  }
  for (const position of releasedPositions) {
    if (!isInBounds(position)) {
      throw new TributeInvariantError("Every released Tribute position must be inside the map.");
    }
  }

  let nearestDistance = Number.MAX_SAFE_INTEGER;
  const nearest: Position[] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const candidate = { x, y };
      if (!isTilePhysicallyFree(spatial, candidate)) continue;
      const distance = Math.min(
        ...releasedPositions.map(
          (origin) => Math.abs(origin.x - candidate.x) + Math.abs(origin.y - candidate.y),
        ),
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest.length = 0;
        nearest.push(candidate);
      } else if (distance === nearestDistance) {
        nearest.push(candidate);
      }
    }
  }
  return deepFreeze(nearest.map((position) => deepFreeze({ ...position })));
}

function destroyedCard(monster: MonsterState): CardInstance {
  const kind: CardInstance["kind"] =
    monster.type === "normal" ? "normal_monster" : "effect_monster";
  return deepFreeze({
    instanceId: monster.cardInstanceId,
    definitionId: monster.definitionId,
    name: monster.name,
    kind,
  });
}

export function resolveTributeSummon(request: TributeSummonRequest): TributeSummonResult {
  if (request.cardState.playerId !== request.playerId) {
    throw new TributeInvariantError(
      `Card state for ${request.cardState.playerId} cannot be used by ${request.playerId}.`,
    );
  }
  if (request.unitId.trim().length === 0) {
    throw new TributeInvariantError("unitId must not be empty.");
  }
  if (request.monsters.length !== request.spatial.units.length) {
    throw new TributeInvariantError("Monster and spatial state contain different unit counts.");
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
      throw new TributeInvariantError(
        `Unit ${monster.unitId} has inconsistent monster and spatial state.`,
      );
    }
    if (representedCards.has(monster.cardInstanceId)) {
      throw new TributeInvariantError(
        `Physical card ${monster.cardInstanceId} represents more than one monster.`,
      );
    }
    representedCards.add(monster.cardInstanceId);
  }
  if (
    request.monsters.some((monster) => monster.unitId === request.unitId) ||
    request.spatial.units.some((unit) => unit.unitId === request.unitId)
  ) {
    throw new TributeInvariantError(`Unit id ${request.unitId} already exists.`);
  }

  const card = request.cardState.hand.find(
    (entry) => entry.instanceId === request.cardInstanceId,
  );
  if (card === undefined) {
    throw new TributeInvariantError(`Card ${request.cardInstanceId} is not in the hand.`);
  }
  if (card.kind !== "effect_monster") {
    throw new TributeInvariantError("Only an Effect Monster can use Tribute Summon.");
  }
  const definition = request.catalog.definitions.find(
    (entry) => entry.definitionId === card.definitionId,
  );
  if (definition === undefined || definition.type !== "effect" || definition.name !== card.name) {
    throw new TributeInvariantError(
      `Effect Monster ${card.definitionId} does not have a matching catalog definition.`,
    );
  }

  const plan = createTributeSummonPlan(
    request.monsters,
    request.spatial,
    request.playerId,
    definition,
    request.tributeUnitIds,
  );
  if (
    !plan.releasedPositions.some(
      (position) =>
        position.x === request.destination.x && position.y === request.destination.y,
    )
  ) {
    throw new TributeInvariantError("The selected destination is not a released Tribute tile.");
  }

  const tributeIds = new Set(plan.tributeUnitIds);
  const tributes = request.monsters.filter((monster) => tributeIds.has(monster.unitId));
  let cardState = removeCardFromHand(request.cardState, request.cardInstanceId).state;
  for (const tribute of tributes) {
    cardState = addCardToGraveyard(cardState, destroyedCard(tribute));
  }
  const summonedMonster = createMonsterState(
    definition,
    request.unitId,
    card.instanceId,
    request.playerId,
    request.destination,
    request.battlePosition,
  );
  const remainingMonsters = request.monsters.filter(
    (monster) => !tributeIds.has(monster.unitId),
  );
  const monsters = deepFreeze([...remainingMonsters, summonedMonster]);
  const remainingUnits = request.spatial.units.filter((unit) => !tributeIds.has(unit.unitId));
  const spatial = createSpatialState(request.spatial.bases, [
    ...remainingUnits,
    {
      unitId: summonedMonster.unitId,
      playerId: summonedMonster.ownerPlayerId,
      position: summonedMonster.position,
    },
  ]);

  return deepFreeze({ cardState, spatial, monsters, summonedMonster, plan });
}
