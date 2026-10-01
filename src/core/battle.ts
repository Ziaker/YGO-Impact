import { createBasicAttackPlan, type BasicAttackPlan } from "./attack.ts";
import { resolveBasicCombat, type BasicCombatResult } from "./combat.ts";
import type { CardKind } from "./deck.ts";
import type { CardInstance, PlayerCardState } from "./draw.ts";
import { deepFreeze } from "./freeze.ts";
import type { MonsterState } from "./monster.ts";
import { createSpatialState, type SpatialState } from "./spatial.ts";
import { addCardToGraveyard } from "./zones.ts";

export interface DestroyedMonsterCard extends CardInstance {
  readonly ownerPlayerId: string;
}

export interface BattleResolution {
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly combat: BasicCombatResult;
  readonly destroyedUnitIds: readonly string[];
  readonly destroyedCardInstanceIds: readonly string[];
  readonly destroyedCards: readonly DestroyedMonsterCard[];
}

export class BattleInvariantError extends Error {
  override readonly name = "BattleInvariantError";
}

export interface ConfirmedBasicAttackResolution extends BattleResolution {
  readonly plan: BasicAttackPlan;
  readonly cardStates: readonly PlayerCardState[];
}

export interface PendingBasicAttack {
  readonly elementId: string;
  readonly attackerUnitId: string;
  readonly defenderUnitId: string;
  readonly actingPlayerId: string;
  readonly defenderChoosesCounterattack: boolean;
}

export interface PendingBaseAttack {
  readonly elementId: string;
  readonly attackerUnitId: string;
  readonly actingPlayerId: string;
  readonly defenderPlayerId: string;
}

function monsterCardKind(monster: MonsterState): CardKind {
  switch (monster.type) {
    case "normal": return "normal_monster";
    case "effect": return "effect_monster";
    case "ritual": return "ritual_monster";
    case "fusion": return "fusion_monster";
  }
}

export function settleDestroyedCards(
  cardStates: readonly PlayerCardState[],
  resolution: BattleResolution,
): readonly PlayerCardState[] {
  const playerIds = cardStates.map((state) => state.playerId);
  if (new Set(playerIds).size !== playerIds.length) {
    throw new BattleInvariantError("Player card states must have unique player ids.");
  }
  let next = [...cardStates];
  for (const card of resolution.destroyedCards) {
    const index = next.findIndex((state) => state.playerId === card.ownerPlayerId);
    const owner = next[index];
    if (owner === undefined) {
      throw new BattleInvariantError(`Missing card state for destroyed card owner ${card.ownerPlayerId}.`);
    }
    const { ownerPlayerId: _ownerPlayerId, ...instance } = card;
    next[index] = addCardToGraveyard(owner, instance);
  }
  return deepFreeze(next);
}

export function resolvePlannedBasicAttack(
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  plan: BasicAttackPlan,
): BattleResolution {
  const attacker = monsters.find((monster) => monster.unitId === plan.attackerUnitId);
  const defender = monsters.find((monster) => monster.unitId === plan.defenderUnitId);
  if (attacker === undefined || defender === undefined) {
    throw new BattleInvariantError("Both planned combatants must still be on the battlefield.");
  }
  for (const monster of [attacker, defender]) {
    const placement = spatial.units.find((unit) => unit.unitId === monster.unitId);
    if (
      placement === undefined ||
      placement.position.x !== monster.position.x ||
      placement.position.y !== monster.position.y
    ) {
      throw new BattleInvariantError(`Unit ${monster.unitId} has inconsistent spatial state.`);
    }
  }
  if (defender.battlePosition === "defense") {
    if (plan.mode !== "defense" || plan.counterattackAvailable) {
      throw new BattleInvariantError("A defender in DEF position must resolve in defense mode without counterattack.");
    }
  } else if (plan.mode === "defense") {
    throw new BattleInvariantError("Defense mode requires the defender to remain in DEF position.");
  }
  if (plan.mode === "counterattack" && !plan.counterattackAvailable) {
    throw new BattleInvariantError("Counterattack mode requires a currently available counterattack.");
  }

  const combat = resolveBasicCombat(
    { ...attacker, spd: attacker.spd.current },
    { ...defender, spd: defender.spd.current },
    plan.mode,
  );
  const updated = monsters.map((monster) => {
    if (monster.unitId === attacker.unitId) return deepFreeze({ ...monster, hp: combat.attackerHp });
    if (monster.unitId === defender.unitId) return deepFreeze({ ...monster, hp: combat.defenderHp });
    return monster;
  });
  const destroyed = updated.filter((monster) => monster.hp.current === 0);
  const destroyedIds = new Set(destroyed.map((monster) => monster.unitId));
  const survivors = deepFreeze(updated.filter((monster) => !destroyedIds.has(monster.unitId)));
  const nextSpatial = createSpatialState(
    spatial.bases,
    spatial.units.filter((unit) => !destroyedIds.has(unit.unitId)),
  );
  return deepFreeze({
    monsters: survivors,
    spatial: nextSpatial,
    combat,
    destroyedUnitIds: deepFreeze(destroyed.map((monster) => monster.unitId)),
    destroyedCardInstanceIds: deepFreeze(destroyed.map((monster) => monster.cardInstanceId)),
    destroyedCards: deepFreeze(destroyed.map((monster) => ({
      ownerPlayerId: monster.ownerPlayerId,
      instanceId: monster.cardInstanceId,
      definitionId: monster.definitionId,
      name: monster.name,
      kind: monsterCardKind(monster),
    }))),
  }) as BattleResolution;
}

export function resolveConfirmedBasicAttack(
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  cardStates: readonly PlayerCardState[],
  actingPlayerId: string,
  attackerUnitId: string,
  defenderUnitId: string,
  fixedObstacles: readonly import("./spatial.ts").Position[],
  targetVisible: boolean,
  defenderChoosesCounterattack: boolean,
): ConfirmedBasicAttackResolution {
  const attacker = monsters.find((monster) => monster.unitId === attackerUnitId);
  const defender = monsters.find((monster) => monster.unitId === defenderUnitId);
  if (attacker === undefined || defender === undefined) {
    throw new BattleInvariantError("Both confirmed combatants must be on the battlefield.");
  }
  if (attacker.ownerPlayerId !== actingPlayerId) {
    throw new BattleInvariantError(
      `Player ${actingPlayerId} does not control attacker ${attackerUnitId}.`,
    );
  }
  const plan = createBasicAttackPlan(
    attacker,
    defender,
    spatial,
    fixedObstacles,
    targetVisible,
    defenderChoosesCounterattack,
  );
  const battle = resolvePlannedBasicAttack(monsters, spatial, plan);
  const settledCards = settleDestroyedCards(cardStates, battle);
  return deepFreeze({ ...battle, plan, cardStates: settledCards });
}
