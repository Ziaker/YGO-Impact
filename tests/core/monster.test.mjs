import assert from "node:assert/strict";
import test from "node:test";

import {
  MonsterInvariantError,
  changeMonsterBattlePosition,
  createMonsterState,
  markMonsterEffectUsed,
  recoverMonsterAtSupport,
  recoverMonstersAtSupport,
} from "../../src/core/index.ts";

test("battle position toggles without changing SPD or spatial identity", () => {
  const initial = monster();
  const defending = changeMonsterBattlePosition([initial], "unit:1", "p1");
  const attacking = changeMonsterBattlePosition(defending, "unit:1", "p1");

  assert.equal(defending[0].battlePosition, "defense");
  assert.deepEqual(defending[0].spd, initial.spd);
  assert.deepEqual(defending[0].position, initial.position);
  assert.equal(attacking[0].battlePosition, "attack");
  assert.throws(() => changeMonsterBattlePosition([initial], "missing", "p1"), /Unknown monster/);
  assert.throws(() => changeMonsterBattlePosition([initial], "unit:1", "p2"), /does not control/);
});

function definition(overrides = {}) {
  return {
    definitionId: "blue-eyes",
    name: "Blue-Eyes White Dragon",
    level: 8,
    type: "normal",
    elements: ["light"],
    races: ["Dragon"],
    printedVis: 3,
    printedSpd: 4,
    printedAtk: 8,
    printedDef: 7,
    ...overrides,
  };
}

function monster(overrides = {}) {
  return createMonsterState(
    definition(overrides),
    "unit:1",
    "p1:monster:0:blue-eyes",
    "p1",
    { x: 2, y: 3 },
    "attack",
  );
}

test("monster creation combines formulas and structural RACE bonuses once", () => {
  const state = monster();

  assert.deepEqual(state.hp, { current: 9, maximum: 9 });
  assert.deepEqual(state.mp, { current: 0, maximum: 0 });
  assert.deepEqual(state.spd, { current: 4, maximum: 4 });
  assert.equal(state.vis, 3);
  assert.equal(state.atk, 8);
  assert.equal(state.def, 8);
  assert.equal(state.attackRange, 1);
  assert.deepEqual(state.structuralRaces, ["Dragon"]);
});

test("multiple structural RACE bonuses are cumulative and frozen into initial stats", () => {
  const state = monster({
    type: "effect",
    races: ["Spellcaster", "Winged Beast"],
    printedVis: 1,
    printedSpd: 2,
  });

  assert.deepEqual(state.hp, { current: 8, maximum: 8 });
  assert.deepEqual(state.mp, { current: 9, maximum: 9 });
  assert.deepEqual(state.spd, { current: 3, maximum: 3 });
  assert.equal(state.vis, 3);
});

test("support recovery uses prior-turn effect activity and advances its history", () => {
  const initial = monster({ type: "effect" });
  const spent = {
    ...initial,
    hp: { current: initial.hp.maximum - 2, maximum: initial.hp.maximum },
    mp: { current: initial.mp.maximum - 3, maximum: initial.mp.maximum },
    usedEffectSinceLastSupport: true,
  };
  const first = recoverMonsterAtSupport(spent);
  assert.equal(first.hpRecovered, 1);
  assert.equal(first.mpRecovered, 1);
  assert.equal(first.monster.usedEffectSinceLastSupport, false);

  const used = markMonsterEffectUsed(first.monster);
  const second = recoverMonsterAtSupport(used);
  assert.equal(second.mpRecovered, 1);
  assert.equal(second.monster.usedEffectSinceLastSupport, false);
});

test("monster identity, printed stats, structure, position, and battle position are validated", () => {
  assert.throws(() => monster({ level: 0 }), MonsterInvariantError);
  assert.throws(() => monster({ elements: [] }), /elements must not be empty/);
  assert.throws(() => monster({ elements: ["light", "light"] }), /duplicates/);
  assert.throws(() => monster({ elements: ["divine"] }), /unsupported structural element/);
  assert.throws(() => monster({ races: [] }), /races must not be empty/);
  assert.throws(() => monster({ printedAtk: -1 }), /non-negative/);
  assert.throws(() => monster({ printedAttackRange: 0 }), /positive safe integer/);
  assert.throws(
    () => createMonsterState(definition(), "u", "c", "p1", { x: 31, y: 0 }, "attack"),
    /inside the map/,
  );
  assert.throws(
    () => createMonsterState(definition(), "u", "c", "p1", { x: 0, y: 0 }, "other"),
    /Unknown battle position/,
  );
});

test("support recovery preserves unit order and rejects duplicate authoritative ids", () => {
  const first = monster({ definitionId: "first", name: "First", type: "effect" });
  const second = createMonsterState(
    definition({ definitionId: "second", name: "Second", type: "effect" }),
    "unit:2",
    "p1:monster:1:second",
    "p1",
    { x: 3, y: 3 },
    "defense",
  );
  const recovered = recoverMonstersAtSupport([first, second]);
  assert.deepEqual(recovered.map((entry) => entry.monster.unitId), ["unit:1", "unit:2"]);
  assert.throws(() => recoverMonstersAtSupport([first, first]), /appears more than once/);
});
