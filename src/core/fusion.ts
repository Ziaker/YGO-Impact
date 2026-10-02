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

export interface FusionProcedure {
  readonly spellDefinitionId: string;
  readonly fusionDefinitionId: string;
  readonly materialDefinitionIds: readonly string[];
}

export interface FusionSummonRequest {
  readonly cardState: PlayerCardState;
  readonly catalog: MonsterCatalog;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly playerId: string;
  readonly fusionMonsterInstanceId: string;
  readonly fusionSpellInstanceId: string;
  readonly procedure: FusionProcedure;
  readonly materialCardInstanceIds: readonly string[];
  readonly unitId: string;
  readonly anchorUnitId: string | null;
  readonly sharedVisibleTiles: readonly Position[];
  readonly destination: Position;
  readonly battlePosition: MonsterBattlePosition;
  readonly negated?: boolean | undefined;
}

export interface FusionSummonPlan {
  readonly materialCardInstanceIds: readonly string[];
  readonly mapMaterialUnitIds: readonly string[];
  readonly releasedPositions: readonly Position[];
  readonly usedNormalSummonArea: boolean;
  readonly legalDestinations: readonly Position[];
  readonly negated?: boolean | undefined;
}

export interface FusionSummonResult {
  readonly cardState: PlayerCardState;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly summonedMonster: MonsterState | null;
  readonly plan: FusionSummonPlan;
}

export class FusionInvariantError extends Error {
  override readonly name = "FusionInvariantError";
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

export function resolveFusionSummon(request: FusionSummonRequest): FusionSummonResult {
  if (request.cardState.playerId !== request.playerId) {
    throw new FusionInvariantError("Fusion card state must belong to the summoning player.");
  }
  if (request.unitId.trim().length === 0) throw new FusionInvariantError("unitId must not be empty.");
  if (request.materialCardInstanceIds.length === 0) {
    throw new FusionInvariantError("A Fusion Summon requires at least one material.");
  }
  const materialIds = new Set(request.materialCardInstanceIds);
  if (materialIds.size !== request.materialCardInstanceIds.length) {
    throw new FusionInvariantError("A Fusion material cannot be selected more than once.");
  }
  if (materialIds.has(request.fusionSpellInstanceId)) {
    throw new FusionInvariantError("The Fusion Spell cannot also be a Fusion material.");
  }
  if (
    request.monsters.some((monster) => monster.unitId === request.unitId) ||
    request.spatial.units.some((unit) => unit.unitId === request.unitId)
  ) {
    throw new FusionInvariantError(`Unit id ${request.unitId} already exists.`);
  }

  const fusionCard = request.cardState.extraDeck.find(
    (card) => card.instanceId === request.fusionMonsterInstanceId,
  );
  if (fusionCard === undefined || fusionCard.kind !== "fusion_monster") {
    throw new FusionInvariantError("The selected Fusion Monster is not in the Extra Deck.");
  }
  const fusionDefinition = request.catalog.definitions.find(
    (definition) => definition.definitionId === fusionCard.definitionId,
  );
  if (
    fusionDefinition === undefined ||
    fusionDefinition.type !== "fusion" ||
    fusionDefinition.name !== fusionCard.name
  ) {
    throw new FusionInvariantError("The Fusion Monster has no matching catalog definition.");
  }
  const spell = request.cardState.hand.find(
    (card) => card.instanceId === request.fusionSpellInstanceId,
  );
  if (spell === undefined || spell.kind !== "spell") {
    throw new FusionInvariantError("The selected Fusion Spell is not a Spell in the hand.");
  }
  if (request.procedure.spellDefinitionId !== spell.definitionId) {
    throw new FusionInvariantError("The selected procedure does not describe this Fusion Spell.");
  }
  if (request.procedure.fusionDefinitionId !== fusionDefinition.definitionId) {
    throw new FusionInvariantError("The procedure does not match the selected Fusion Monster.");
  }

  const handMaterials = request.cardState.hand.filter((card) => materialIds.has(card.instanceId));
  const mapMaterials = request.monsters.filter((monster) => materialIds.has(monster.cardInstanceId));
  if (handMaterials.some((card) => !card.kind.endsWith("_monster"))) {
    throw new FusionInvariantError("Every Fusion material must be a Monster.");
  }
  if (handMaterials.length + mapMaterials.length !== materialIds.size) {
    throw new FusionInvariantError("Every Fusion material must be in the controller's hand or map.");
  }
  if (mapMaterials.some((monster) => monster.ownerPlayerId !== request.playerId)) {
    throw new FusionInvariantError("Every map Fusion material must be controlled by the summoning player.");
  }
  for (const monster of mapMaterials) {
    const placement = request.spatial.units.find((unit) => unit.unitId === monster.unitId);
    if (
      placement === undefined ||
      placement.playerId !== monster.ownerPlayerId ||
      !samePosition(placement.position, monster.position)
    ) {
      throw new FusionInvariantError(`Fusion material ${monster.unitId} has inconsistent spatial state.`);
    }
  }

  const suppliedDefinitionIds = [
    ...handMaterials.map((c) => c.definitionId),
    ...mapMaterials.map((m) => m.definitionId),
  ].sort();
  const requiredDefinitionIds = [...request.procedure.materialDefinitionIds].sort();
  if (
    suppliedDefinitionIds.length !== requiredDefinitionIds.length ||
    !suppliedDefinitionIds.every((defId, idx) => defId === requiredDefinitionIds[idx])
  ) {
    throw new FusionInvariantError("Supplied materials do not match the required Fusion materials.");
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
    throw new FusionInvariantError("The selected destination is not legal for this Fusion Summon.");
  }

  let cardState = request.cardState;
  cardState = addCardToGraveyard(
    removeCardFromHand(cardState, request.fusionSpellInstanceId).state,
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
      cardState.extraDeck.filter((card) => card.instanceId !== fusionCard.instanceId),
    ),
  });
  const summonedMonster = createMonsterState(
    fusionDefinition,
    request.unitId,
    fusionCard.instanceId,
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
    releasedPositions: deepFreeze(releasedPositions),
    usedNormalSummonArea,
    legalDestinations: deepFreeze(legalDestinations),
    negated: false,
  });
  return deepFreeze({ cardState, monsters, spatial, summonedMonster, plan });
}
