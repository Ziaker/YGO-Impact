import assert from "node:assert/strict";
import test from "node:test";

import {
  CombatInvariantError,
  canCounterattack,
  createVitalPool,
  resolveBasicCombat,
} from "../../src/core/index.ts";

function unit(unitId, atk, def, spd, hp = 10) {
  return { unitId, atk, def, spd, hp: createVitalPool(hp) };
}

test("ATK versus ATK applies both full attacks simultaneously", () => {
  const result = resolveBasicCombat(unit("a", 6, 0, 2), unit("d", 4, 0, 3), "counterattack");
  assert.equal(result.damageToAttacker, 4);
  assert.equal(result.damageToDefender, 6);
  assert.deepEqual(result.attackerHp, { current: 6, maximum: 10 });
  assert.deepEqual(result.defenderHp, { current: 4, maximum: 10 });
  assert.equal(result.simultaneous, true);
});

test("simultaneous counterattack can destroy both monsters", () => {
  const result = resolveBasicCombat(unit("a", 5, 0, 1, 5), unit("d", 5, 0, 2, 5), "counterattack");
  assert.equal(result.attackerDestroyed, true);
  assert.equal(result.defenderDestroyed, true);
});

test("ATK versus DEF damages only the lower side by the difference", () => {
  const attackerWins = resolveBasicCombat(unit("a", 7, 0, 1), unit("d", 2, 4, 1), "defense");
  const defenderWins = resolveBasicCombat(unit("a", 3, 0, 1), unit("d", 2, 8, 1), "defense");
  const tie = resolveBasicCombat(unit("a", 5, 0, 1), unit("d", 2, 5, 1), "defense");
  assert.deepEqual([attackerWins.damageToAttacker, attackerWins.damageToDefender], [0, 3]);
  assert.deepEqual([defenderWins.damageToAttacker, defenderWins.damageToDefender], [5, 0]);
  assert.deepEqual([tie.damageToAttacker, tie.damageToDefender], [0, 0]);
});

test("negative positional stats add their magnitude to damage received", () => {
  const negativeDefense = resolveBasicCombat(unit("a", 5, 0, 1), unit("d", 2, -3, 1), "defense");
  const negativeAttack = resolveBasicCombat(unit("a", -2, 0, 1), unit("d", 2, 4, 1), "defense");
  const negativeCounter = resolveBasicCombat(unit("a", -2, 0, 1), unit("d", -3, 0, 2), "counterattack");
  const undefended = resolveBasicCombat(unit("a", 5, 0, 1), unit("d", -2, 0, 1), "undefended");
  assert.equal(negativeDefense.damageToDefender, 8);
  assert.equal(negativeAttack.damageToAttacker, 6);
  assert.deepEqual([negativeCounter.damageToAttacker, negativeCounter.damageToDefender], [2, 3]);
  assert.equal(undefended.damageToDefender, 7);
});

test("counterattack requires strictly more remaining SPD and reciprocal reach", () => {
  assert.equal(canCounterattack(unit("a", 1, 1, 2), unit("d", 1, 1, 3), true), true);
  assert.equal(canCounterattack(unit("a", 1, 1, 2), unit("d", 1, 1, 2), true), false);
  assert.equal(canCounterattack(unit("a", 1, 1, 2), unit("d", 1, 1, 3), false), false);
});

test("double-negative ATK versus DEF counts both powers as zero and deals no damage", () => {
  const result = resolveBasicCombat(unit("a", -2, 0, 1), unit("d", 1, -3, 1), "defense");
  assert.deepEqual([result.damageToAttacker, result.damageToDefender], [0, 0]);
  assert.deepEqual(result.attackerHp, { current: 10, maximum: 10 });
  assert.deepEqual(result.defenderHp, { current: 10, maximum: 10 });

  assert.throws(
    () => resolveBasicCombat(unit("same", 1, 1, 1), unit("same", 1, 1, 1), "undefended"),
    CombatInvariantError,
  );
});
