import assert from "node:assert/strict";
import test from "node:test";

import {
  VisibilityInvariantError,
  BASE_VIS_RANGE,
  calculateSharedMonsterVisibility,
  calculateSharedVisibility,
  createMonsterState,
  createSpatialState,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function monster(unitId, playerId, position, printedVis = 2) {
  return createMonsterState(
    {
      definitionId: `monster:${unitId}`,
      name: unitId,
      level: 4,
      type: "effect",
      elements: ["light"],
      races: ["Warrior"],
      printedVis,
      printedSpd: 3,
      printedAtk: 4,
      printedDef: 3,
    },
    unitId,
    `card:${unitId}`,
    playerId,
    position,
    "attack",
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

function keys(positions) {
  return new Set(positions.map((position) => `${position.x},${position.y}`));
}

test("shared VIS is the deterministic union of allied orthogonal vision", () => {
  const allies = [
    monster("left", "p1", { x: 5, y: 5 }, 1),
    monster("right", "p1", { x: 8, y: 5 }, 1),
  ];
  const enemy = monster("enemy", "p2", { x: 20, y: 5 }, 5);
  const visible = calculateSharedMonsterVisibility(
    [...allies, enemy],
    battlefield([...allies, enemy]),
    "p1",
  );

  assert.deepEqual(keys(visible), new Set([
    "5,4", "4,5", "5,5", "6,5", "5,6",
    "8,4", "7,5", "8,5", "9,5", "8,6",
  ]));
  assert.deepEqual(visible, [...visible].sort((left, right) => left.y - right.y || left.x - right.x));
});

test("the base reveals an author-approved square of five blocks", () => {
  const visible = calculateSharedVisibility([], createSpatialState(bases), "p1");
  const visibleKeys = keys(visible);

  assert.equal(BASE_VIS_RANGE, 5);
  assert.equal(visibleKeys.has("5,3"), true);
  assert.equal(visibleKeys.has("5,13"), true);
  assert.equal(visibleKeys.has("6,8"), false);
  assert.equal(visible.length, 66);
});

test("fixed obstacles and bases are visible themselves but block tiles behind them", () => {
  const scout = monster("scout", "p1", { x: 2, y: 8 }, 4);
  const visible = keys(
    calculateSharedMonsterVisibility([scout], battlefield([scout]), "p1", [
      { x: 3, y: 8 },
    ]),
  );

  assert.equal(visible.has("3,8"), true);
  assert.equal(visible.has("4,8"), false);
  assert.equal(visible.has("0,8"), true);
});

test("negative VIS reveals no distance beyond the unit tile", () => {
  const original = monster("dark", "p1", { x: 5, y: 5 }, 0);
  const reduced = { ...original, vis: -3 };
  const visible = calculateSharedMonsterVisibility(
    [reduced],
    battlefield([reduced]),
    "p1",
  );

  assert.deepEqual(visible, [{ x: 5, y: 5 }]);
});

test("shared VIS rejects foreign players, invalid obstacles, and inconsistent state", () => {
  const scout = monster("scout", "p1", { x: 2, y: 8 });
  const spatial = battlefield([scout]);
  assert.throws(
    () => calculateSharedMonsterVisibility([scout], spatial, "unknown"),
    /has no base/,
  );
  assert.throws(
    () => calculateSharedMonsterVisibility([scout], spatial, "p1", [{ x: -1, y: 0 }]),
    VisibilityInvariantError,
  );
  assert.throws(
    () => calculateSharedMonsterVisibility([], spatial, "p1"),
    /different unit counts/,
  );
});
