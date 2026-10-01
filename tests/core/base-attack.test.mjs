import assert from "node:assert/strict";
import test from "node:test";

import {
  BaseAttackInvariantError,
  createBaseAttackPlan,
  createMatchState,
  createMonsterState,
  createSpatialState,
  legalBaseRepositionTiles,
  resolveConfirmedBaseAttack,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function monster(position, battlePosition = "attack", range = 1) {
  return createMonsterState({
    definitionId: "attacker",
    name: "Attacker",
    level: 4,
    type: "normal",
    elements: ["light"],
    races: ["Warrior"],
    printedVis: 40,
    printedSpd: 40,
    printedAtk: 4,
    printedDef: 3,
    printedAttackRange: range,
  }, "attacker", "p1:card:attacker", "p1", position, battlePosition);
}

function battlefield(attacker) {
  return createSpatialState(bases, [{
    unitId: attacker.unitId,
    playerId: attacker.ownerPlayerId,
    position: attacker.position,
  }]);
}

test("a visible enemy base in range and line produces a valid Basic Attack plan", () => {
  const attacker = monster({ x: 29, y: 8 });
  assert.deepEqual(createBaseAttackPlan(attacker, "p2", battlefield(attacker), [], true), {
    attackerUnitId: "attacker",
    defenderPlayerId: "p2",
    basePosition: { x: 30, y: 8 },
  });
});

test("base attacks require ATK position, VIS, range, line, and an enemy base", () => {
  const attacker = monster({ x: 29, y: 8 });
  assert.throws(
    () => createBaseAttackPlan(monster({ x: 29, y: 8 }, "defense"), "p2", battlefield(monster({ x: 29, y: 8 }, "defense")), [], true),
    /ATK position/,
  );
  assert.throws(() => createBaseAttackPlan(attacker, "p2", battlefield(attacker), [], false), /not visible/);
  const distant = monster({ x: 28, y: 8 });
  assert.throws(() => createBaseAttackPlan(distant, "p2", battlefield(distant), [], true), /outside.*range/);
  assert.throws(() => createBaseAttackPlan(attacker, "p1", battlefield(attacker), [], true), /own base/);
  assert.throws(
    () => createBaseAttackPlan(monster({ x: 28, y: 8 }, "attack", 2), "p2", battlefield(monster({ x: 28, y: 8 }, "attack", 2)), [{ x: 29, y: 8 }], true),
    /line.*blocked/,
  );
});

test("a valid impact deterministically repositions the attacker in its home third", () => {
  const attacker = monster({ x: 29, y: 8 });
  const spatial = battlefield(attacker);
  const first = resolveConfirmedBaseAttack(
    createMatchState(["p1", "p2"]),
    [attacker],
    spatial,
    "p1",
    "attacker",
    "p2",
    [],
    true,
    "seed",
    "base-reposition:test",
  );
  const second = resolveConfirmedBaseAttack(
    createMatchState(["p1", "p2"]),
    [attacker],
    spatial,
    "p1",
    "attacker",
    "p2",
    [],
    true,
    "seed",
    "base-reposition:test",
  );

  assert.equal(first.impactRecorded, true);
  assert.equal(first.match.players[1].baseImpactsReceived, 1);
  assert.deepEqual(first.repositionedTo, second.repositionedTo);
  assert.deepEqual(first.randomLog, second.randomLog);
  assert.ok(first.repositionedTo.x <= 10);
  assert.notDeepEqual(first.repositionedTo, bases[0].position);
  assert.deepEqual(first.monsters[0].position, first.repositionedTo);
  assert.deepEqual(first.spatial.units[0].position, first.repositionedTo);
});

test("home-third candidates are legal free tiles and reject an unknown base", () => {
  const attacker = monster({ x: 1, y: 8 });
  const tiles = legalBaseRepositionTiles(battlefield(attacker), "p1");
  assert.ok(tiles.every((tile) => tile.x >= 0 && tile.x <= 10));
  assert.equal(tiles.some((tile) => tile.x === 0 && tile.y === 8), false);
  assert.equal(tiles.some((tile) => tile.x === 1 && tile.y === 8), false);
  assert.throws(() => legalBaseRepositionTiles(battlefield(attacker), "unknown"), BaseAttackInvariantError);
});
