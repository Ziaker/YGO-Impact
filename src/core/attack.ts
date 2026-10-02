import { canCounterattack, type CombatMode } from "./combat.ts";
import { deepFreeze } from "./freeze.ts";
import { hasClearAttackLine, isWithinOrthogonalRange } from "./geometry.ts";
import type { MonsterState } from "./monster.ts";
import type { Position, SpatialState } from "./spatial.ts";
import { calculateEffectiveAttackRange } from "./keywords.ts";

export interface BasicAttackPlan {
  readonly attackerUnitId: string;
  readonly defenderUnitId: string;
  readonly mode: CombatMode;
  readonly counterattackAvailable: boolean;
}

export class AttackInvariantError extends Error {
  override readonly name = "AttackInvariantError";
}

export function createBasicAttackPlan(
  attacker: MonsterState,
  defender: MonsterState,
  spatial: SpatialState,
  fixedObstacles: readonly Position[],
  targetVisible: boolean,
  defenderChoosesCounterattack: boolean,
): BasicAttackPlan {
  if (attacker.unitId === defender.unitId || attacker.ownerPlayerId === defender.ownerPlayerId) {
    throw new AttackInvariantError("A Basic Attack requires a distinct enemy monster.");
  }
  if (!targetVisible) throw new AttackInvariantError("The target is not visible to the attacker.");
  for (const monster of [attacker, defender]) {
    const placement = spatial.units.find((unit) => unit.unitId === monster.unitId);
    if (
      placement === undefined ||
      placement.playerId !== monster.ownerPlayerId ||
      placement.position.x !== monster.position.x ||
      placement.position.y !== monster.position.y
    ) {
      throw new AttackInvariantError(`Unit ${monster.unitId} has inconsistent spatial state.`);
    }
  }
  const attackerRange = calculateEffectiveAttackRange(attacker);
  if (!isWithinOrthogonalRange(attacker.position, defender.position, attackerRange)) {
    throw new AttackInvariantError("The target is outside the attacker's Basic Attack range.");
  }
  const blockers = [
    ...fixedObstacles,
    ...spatial.bases.map((base) => base.position),
    ...spatial.units.map((unit) => unit.position),
  ];
  if (!hasClearAttackLine(attacker.position, defender.position, blockers)) {
    throw new AttackInvariantError("The Basic Attack line is blocked.");
  }

  const defenderRange = calculateEffectiveAttackRange(defender);
  const defenderCanReach =
    isWithinOrthogonalRange(defender.position, attacker.position, defenderRange) &&
    hasClearAttackLine(defender.position, attacker.position, blockers);
  const counterattackAvailable =
    defender.battlePosition === "attack" &&
    canCounterattack(
      { ...attacker, spd: attacker.spd.current },
      { ...defender, spd: defender.spd.current },
      defenderCanReach,
    );
  const mode: CombatMode =
    defender.battlePosition === "defense"
      ? "defense"
      : defenderChoosesCounterattack && counterattackAvailable
        ? "counterattack"
        : "undefended";
  return deepFreeze({
    attackerUnitId: attacker.unitId,
    defenderUnitId: defender.unitId,
    mode,
    counterattackAvailable,
  });
}
