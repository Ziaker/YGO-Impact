import type { MonsterCatalog } from "./content.ts";
import type { CardInstance, PlayerCardState } from "./draw.ts";
import { deepFreeze } from "./freeze.ts";
import {
  createMonsterState,
  type MonsterBattlePosition,
  type MonsterState,
} from "./monster.ts";
import {
  createSpatialState,
  isTilePhysicallyFree,
  type Position,
  type SpatialState,
} from "./spatial.ts";
import { findNormalSummonDestinations } from "./summon.ts";
import { addCardToGraveyard, removeCardFromHand } from "./zones.ts";

export interface RitualProcedure {
  readonly spellDefinitionId: string;
  readonly compatibleRitualDefinitionIds: readonly string[];
}

export interface RitualSummonRequest {
  readonly cardState: PlayerCardState;
  readonly catalog: MonsterCatalog;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly playerId: string;
  readonly ritualMonsterInstanceId: string;
  readonly ritualSpellInstanceId: string;
  readonly procedure: RitualProcedure;
  readonly materialCardInstanceIds: readonly string[];
  readonly unitId: string;
  readonly anchorUnitId: string | null;
  readonly sharedVisibleTiles: readonly Position[];
  readonly destination: Position;
  readonly battlePosition: MonsterBattlePosition;
  readonly negated?: boolean | undefined;
}

export interface RitualSummonPlan {
  readonly materialCardInstanceIds: readonly string[];
  readonly mapMaterialUnitIds: readonly string[];
  readonly totalMaterialLevels: number;
  readonly releasedPositions: readonly Position[];
  readonly usedNormalSummonArea: boolean;
  readonly legalDestinations: readonly Position[];
  readonly negated?: boolean | undefined;
}

export interface RitualSummonResult {
  readonly cardState: PlayerCardState;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly summonedMonster: MonsterState | null;
  readonly plan: RitualSummonPlan;
}

export class RitualInvariantError extends Error {
  override readonly name = "RitualInvariantError";
}

function monsterCard(monster: MonsterState): CardInstance {
  const kind: CardInstance["kind"] = monster.type === "normal"
    ? "normal_monster"
    : monster.type === "effect"
      ? "effect_monster"
      : monster.type === "ritual"
        ? "ritual_monster"
        : "fusion_monster";
  return deepFreeze({
    instanceId: monster.cardInstanceId,
    definitionId: monster.definitionId,
    name: monster.name,
    kind,
  });
}

function samePosition(left: Position, right: Position): boolean {
  return left.x === right.x && left.y === right.y;
}

export function resolveRitualSummon(request: RitualSummonRequest): RitualSummonResult {
  if (request.cardState.playerId !== request.playerId) {
    throw new RitualInvariantError("Ritual card state must belong to the summoning player.");
  }
  if (request.unitId.trim().length === 0) throw new RitualInvariantError("unitId must not be empty.");
  if (request.materialCardInstanceIds.length === 0) {
    throw new RitualInvariantError("A Ritual Summon requires at least one material.");
  }
  const materialIds = new Set(request.materialCardInstanceIds);
  if (materialIds.size !== request.materialCardInstanceIds.length) {
    throw new RitualInvariantError("A Ritual material cannot be selected more than once.");
  }
  if (materialIds.has(request.ritualSpellInstanceId)) {
    throw new RitualInvariantError("The Ritual Spell cannot also be a Ritual material.");
  }
  if (
    request.monsters.some((monster) => monster.unitId === request.unitId) ||
    request.spatial.units.some((unit) => unit.unitId === request.unitId)
  ) {
    throw new RitualInvariantError(`Unit id ${request.unitId} already exists.`);
  }

  const ritualCard = request.cardState.extraDeck.find(
    (card) => card.instanceId === request.ritualMonsterInstanceId,
  );
  if (ritualCard === undefined || ritualCard.kind !== "ritual_monster") {
    throw new RitualInvariantError("The selected Ritual Monster is not in the Extra Deck.");
  }
  const ritualDefinition = request.catalog.definitions.find(
    (definition) => definition.definitionId === ritualCard.definitionId,
  );
  if (
    ritualDefinition === undefined ||
    ritualDefinition.type !== "ritual" ||
    ritualDefinition.name !== ritualCard.name
  ) {
    throw new RitualInvariantError("The Ritual Monster has no matching catalog definition.");
  }
  const spell = request.cardState.hand.find(
    (card) => card.instanceId === request.ritualSpellInstanceId,
  );
  if (spell === undefined || spell.kind !== "spell") {
    throw new RitualInvariantError("The selected Ritual Spell is not a Spell in the hand.");
  }
  if (request.procedure.spellDefinitionId !== spell.definitionId) {
    throw new RitualInvariantError("The selected procedure does not describe this Ritual Spell.");
  }
  if (!request.procedure.compatibleRitualDefinitionIds.includes(ritualDefinition.definitionId)) {
    throw new RitualInvariantError("The Ritual Spell is not compatible with the selected Ritual Monster.");
  }

  const handMaterials = request.cardState.hand.filter((card) => materialIds.has(card.instanceId));
  const mapMaterials = request.monsters.filter((monster) => materialIds.has(monster.cardInstanceId));
  if (handMaterials.some((card) => !card.kind.endsWith("_monster"))) {
    throw new RitualInvariantError("Every Ritual material must be a Monster.");
  }
  if (handMaterials.length + mapMaterials.length !== materialIds.size) {
    throw new RitualInvariantError("Every Ritual material must be in the controller's hand or map.");
  }
  if (mapMaterials.some((monster) => monster.ownerPlayerId !== request.playerId)) {
    throw new RitualInvariantError("Every map Ritual material must be controlled by the summoning player.");
  }
  for (const monster of mapMaterials) {
    const placement = request.spatial.units.find((unit) => unit.unitId === monster.unitId);
    if (
      placement === undefined ||
      placement.playerId !== monster.ownerPlayerId ||
      !samePosition(placement.position, monster.position)
    ) {
      throw new RitualInvariantError(`Ritual material ${monster.unitId} has inconsistent spatial state.`);
    }
  }
  const handLevels = handMaterials.map((card) => {
    const definition = request.catalog.definitions.find(
      (candidate) => candidate.definitionId === card.definitionId,
    );
    if (definition === undefined || definition.name !== card.name) {
      throw new RitualInvariantError(`Hand material ${card.instanceId} has no matching definition.`);
    }
    return definition.level;
  });
  const totalMaterialLevels = [
    ...handLevels,
    ...mapMaterials.map((monster) => monster.level),
  ].reduce((total, level) => total + level, 0);
  if (totalMaterialLevels < ritualDefinition.level) {
    throw new RitualInvariantError(
      `Ritual material levels total ${totalMaterialLevels}, below target level ${ritualDefinition.level}.`,
    );
  }

  const mapUnitIds = new Set(mapMaterials.map((monster) => monster.unitId));
  const remainingSpatial = createSpatialState(
    request.spatial.bases,
    request.spatial.units.filter((unit) => !mapUnitIds.has(unit.unitId)),
  );
  const releasedPositions = mapMaterials
    .map((monster) => monster.position)
    .filter((position) => isTilePhysicallyFree(remainingSpatial, position))
    .map((position) => deepFreeze({ ...position }));
  const usedNormalSummonArea = releasedPositions.length === 0;
  const legalDestinations = usedNormalSummonArea
    ? findNormalSummonDestinations(
        remainingSpatial,
        request.playerId,
        request.anchorUnitId,
        request.sharedVisibleTiles,
      ).positions
    : releasedPositions;
  if (!legalDestinations.some((position) => samePosition(position, request.destination))) {
    throw new RitualInvariantError("The selected destination is not legal for this Ritual Summon.");
  }

  let cardState = request.cardState;
  cardState = addCardToGraveyard(
    removeCardFromHand(cardState, request.ritualSpellInstanceId).state,
    spell,
  );
  for (const card of handMaterials) {
    cardState = addCardToGraveyard(removeCardFromHand(cardState, card.instanceId).state, card);
  }
  for (const monster of mapMaterials) {
    cardState = addCardToGraveyard(cardState, monsterCard(monster));
  }

  if (request.negated) {
    const monsters = deepFreeze(
      request.monsters.filter((monster) => !mapUnitIds.has(monster.unitId)),
    );
    const plan = deepFreeze({
      materialCardInstanceIds: deepFreeze([...request.materialCardInstanceIds]),
      mapMaterialUnitIds: deepFreeze(mapMaterials.map((monster) => monster.unitId)),
      totalMaterialLevels,
      releasedPositions: deepFreeze(releasedPositions),
      usedNormalSummonArea,
      legalDestinations: deepFreeze(legalDestinations),
      negated: true,
    });
    return deepFreeze({
      cardState,
      monsters,
      spatial: remainingSpatial,
      summonedMonster: null,
      plan,
    });
  }

  cardState = deepFreeze({
    ...cardState,
    extraDeck: deepFreeze(
      cardState.extraDeck.filter((card) => card.instanceId !== ritualCard.instanceId),
    ),
  });
  const summonedMonster = createMonsterState(
    ritualDefinition,
    request.unitId,
    ritualCard.instanceId,
    request.playerId,
    request.destination,
    request.battlePosition,
  );
  const monsters = deepFreeze([
    ...request.monsters.filter((monster) => !mapUnitIds.has(monster.unitId)),
    summonedMonster,
  ]);
  const spatial = createSpatialState(remainingSpatial.bases, [
    ...remainingSpatial.units,
    {
      unitId: summonedMonster.unitId,
      playerId: summonedMonster.ownerPlayerId,
      position: summonedMonster.position,
    },
  ]);
  const plan = deepFreeze({
    materialCardInstanceIds: deepFreeze([...request.materialCardInstanceIds]),
    mapMaterialUnitIds: deepFreeze(mapMaterials.map((monster) => monster.unitId)),
    totalMaterialLevels,
    releasedPositions: deepFreeze(releasedPositions),
    usedNormalSummonArea,
    legalDestinations: deepFreeze(legalDestinations),
    negated: false,
  });
  return deepFreeze({ cardState, monsters, spatial, summonedMonster, plan });
}
