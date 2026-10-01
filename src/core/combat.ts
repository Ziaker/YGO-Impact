import { deepFreeze } from "./freeze.ts";
import { applyDamage, type VitalPool } from "./vitals.ts";

export type CombatMode = "counterattack" | "defense" | "undefended";

export interface CombatantSnapshot {
  readonly unitId: string;
  readonly hp: VitalPool;
  readonly atk: number;
  readonly def: number;
  readonly spd: number;
}

export interface BasicCombatResult {
  readonly attackerHp: VitalPool;
  readonly defenderHp: VitalPool;
  readonly damageToAttacker: number;
  readonly damageToDefender: number;
  readonly attackerDestroyed: boolean;
  readonly defenderDestroyed: boolean;
  readonly simultaneous: boolean;
}

export class CombatInvariantError extends Error {
  override readonly name = "CombatInvariantError";
}

function assertStat(label: string, value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new CombatInvariantError(`${label} must be a safe integer.`);
  }
}

function vulnerability(value: number): number {
  return value < 0 ? -value : 0;
}

function positivePower(value: number): number {
  return Math.max(0, value);
}

export function canCounterattack(
  attacker: CombatantSnapshot,
  defender: CombatantSnapshot,
  defenderCanReachAttacker: boolean,
): boolean {
  assertStat("attacker.spd", attacker.spd);
  assertStat("defender.spd", defender.spd);
  if (typeof defenderCanReachAttacker !== "boolean") {
    throw new CombatInvariantError("defenderCanReachAttacker must be boolean.");
  }
  return defender.spd > attacker.spd && defenderCanReachAttacker;
}

export function resolveBasicCombat(
  attacker: CombatantSnapshot,
  defender: CombatantSnapshot,
  mode: CombatMode,
): BasicCombatResult {
  if (attacker.unitId === defender.unitId) {
    throw new CombatInvariantError("A unit cannot attack itself.");
  }
  for (const [label, value] of [
    ["attacker.atk", attacker.atk],
    ["attacker.def", attacker.def],
    ["attacker.spd", attacker.spd],
    ["defender.atk", defender.atk],
    ["defender.def", defender.def],
    ["defender.spd", defender.spd],
  ] as const) {
    assertStat(label, value);
  }

  let damageToAttacker = 0;
  let damageToDefender = 0;
  let simultaneous = false;
  switch (mode) {
    case "counterattack":
      damageToAttacker = positivePower(defender.atk) + vulnerability(attacker.atk);
      damageToDefender = positivePower(attacker.atk) + vulnerability(defender.atk);
      simultaneous = true;
      break;
    case "defense": {
      const attackPower = positivePower(attacker.atk);
      const defensePower = positivePower(defender.def);
      if (attackPower > defensePower) {
        damageToDefender = attackPower - defensePower + vulnerability(defender.def);
      } else if (defensePower > attackPower) {
        damageToAttacker = defensePower - attackPower + vulnerability(attacker.atk);
      }
      break;
    }
    case "undefended":
      damageToDefender = positivePower(attacker.atk) + vulnerability(defender.atk);
      break;
    default:
      throw new CombatInvariantError(`Unknown combat mode ${String(mode)}.`);
  }

  const attackerHp = applyDamage(attacker.hp, damageToAttacker).pool;
  const defenderHp = applyDamage(defender.hp, damageToDefender).pool;
  return deepFreeze({
    attackerHp,
    defenderHp,
    damageToAttacker,
    damageToDefender,
    attackerDestroyed: attackerHp.current === 0,
    defenderDestroyed: defenderHp.current === 0,
    simultaneous,
  }) as BasicCombatResult;
}
