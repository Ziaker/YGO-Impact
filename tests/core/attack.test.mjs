import assert from "node:assert/strict";
import test from "node:test";

import {
  AttackInvariantError,
  createBasicAttackPlan,
  createMonsterState,
  createSpatialState,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function monster(unitId, owner, position, options = {}) {
  return createMonsterState(
    {
      definitionId: unitId,
      name: unitId,
      level: 4,
      type: "effect",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 3,
      printedSpd: options.spd ?? 3,
      printedAtk: 4,
      printedDef: 3,
      printedAttackRange: options.range ?? 2,
    },
    unitId,
    `${owner}:card:${unitId}`,
    owner,
    position,
    options.position ?? "attack",
  );
}

function battlefield(monsters) {
  return createSpatialState(
    bases,
    monsters.map((entry) => ({
      unitId: entry.unitId,
      playerId: entry.ownerPlayerId,
      position: entry.position,
    })),
  );
}

test("an ATK target may counterattack only by choice, reach, and strictly greater SPD", () => {
  const attacker = monster("attacker", "p1", { x: 3, y: 8 }, { spd: 2, range: 3 });
  const defender = monster("defender", "p2", { x: 5, y: 8 }, { spd: 4, range: 2 });
  const spatial = battlefield([attacker, defender]);
  const accepted = createBasicAttackPlan(attacker, defender, spatial, [], true, true);
  const declined = createBasicAttackPlan(attacker, defender, spatial, [], true, false);

  assert.deepEqual(accepted, {
    attackerUnitId: "attacker",
    defenderUnitId: "defender",
    mode: "counterattack",
    counterattackAvailable: true,
  });
  assert.equal(declined.mode, "undefended");
  assert.equal(declined.counterattackAvailable, true);
});

test("a DEF target uses defense and never counterattacks", () => {
  const attacker = monster("attacker", "p1", { x: 3, y: 8 });
  const defender = monster("defender", "p2", { x: 4, y: 8 }, { spd: 9, position: "defense" });
  const plan = createBasicAttackPlan(attacker, defender, battlefield([attacker, defender]), [], true, true);
  assert.equal(plan.mode, "defense");
  assert.equal(plan.counterattackAvailable, false);
});

test("visibility, orthogonal range, and a clear center-to-center line are mandatory", () => {
  const attacker = monster("attacker", "p1", { x: 3, y: 8 }, { range: 2 });
  const defender = monster("defender", "p2", { x: 5, y: 8 });
  const blocker = monster("blocker", "p1", { x: 4, y: 8 });
  assert.throws(
    () => createBasicAttackPlan(attacker, defender, battlefield([attacker, defender]), [], false, false),
    /not visible/,
  );
  assert.throws(
    () => createBasicAttackPlan(attacker, { ...defender, position: { x: 6, y: 8 } }, battlefield([attacker, { ...defender, position: { x: 6, y: 8 } }]), [], true, false),
    /outside.*range/,
  );
  assert.throws(
    () => createBasicAttackPlan(attacker, defender, battlefield([attacker, blocker, defender]), [], true, false),
    /line is blocked/,
  );
});

test("attack plans reject allies, self-targets, and inconsistent spatial state", () => {
  const attacker = monster("attacker", "p1", { x: 3, y: 8 });
  const ally = monster("ally", "p1", { x: 4, y: 8 });
  const defender = monster("defender", "p2", { x: 4, y: 8 });
  assert.throws(
    () => createBasicAttackPlan(attacker, ally, battlefield([attacker, ally]), [], true, false),
    AttackInvariantError,
  );
  assert.throws(
    () => createBasicAttackPlan(attacker, attacker, battlefield([attacker]), [], true, false),
    AttackInvariantError,
  );
  assert.throws(
    () => createBasicAttackPlan(attacker, defender, battlefield([attacker]), [], true, false),
    /inconsistent spatial state/,
  );
});
