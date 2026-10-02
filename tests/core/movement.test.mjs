import assert from "node:assert/strict";
import test from "node:test";

import {
  MovementInvariantError,
  createSpatialState,
  resolveBasicMovement,
  resolveMonsterMovement,
  createMonsterState,
  createTerrainTile,
  createTerrainLookup,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function spatial(extraUnits = []) {
  return createSpatialState(bases, [
    { unitId: "moving", playerId: "p1", position: { x: 2, y: 8 } },
    ...extraUnits,
  ]);
}

function movingMonster(position = { x: 2, y: 8 }) {
  return createMonsterState(
    {
      definitionId: "monster:moving",
      name: "Moving Monster",
      level: 4,
      type: "effect",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 2,
      printedSpd: 4,
      printedAtk: 3,
      printedDef: 2,
    },
    "moving",
    "p1:card:moving",
    "p1",
    position,
    "attack",
  );
}

test("basic movement spends one SPD per orthogonal tile", () => {
  const result = resolveBasicMovement(spatial(), "moving", 4, [
    { x: 3, y: 8 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
  ]);

  assert.equal(result.stopReason, "completed");
  assert.equal(result.remainingSpd, 1);
  assert.deepEqual(result.spatial.units[0].position, { x: 4, y: 7 });
  assert.equal(result.traversedPath.length, 3);
});

test("basic movement rejects diagonal, skipped, and out-of-bounds path steps", () => {
  const state = spatial();
  assert.throws(
    () => resolveBasicMovement(state, "moving", 3, [{ x: 3, y: 7 }]),
    /orthogonal/,
  );
  assert.throws(
    () => resolveBasicMovement(state, "moving", 3, [{ x: 4, y: 8 }]),
    /orthogonal/,
  );
  assert.throws(
    () => resolveBasicMovement(state, "moving", 3, [{ x: -1, y: 8 }]),
    /outside the map/,
  );
});

test("allies may be crossed but cannot be the final destination", () => {
  const state = spatial([{ unitId: "ally", playerId: "p1", position: { x: 3, y: 8 } }]);
  const crossed = resolveBasicMovement(state, "moving", 2, [
    { x: 3, y: 8 },
    { x: 4, y: 8 },
  ]);
  const stopped = resolveBasicMovement(state, "moving", 2, [{ x: 3, y: 8 }]);

  assert.equal(crossed.stopReason, "completed");
  assert.deepEqual(crossed.spatial.units[0].position, { x: 4, y: 8 });
  assert.equal(stopped.stopReason, "blocked");
  assert.equal(stopped.spatial, state);
});

test("enemies and bases block passage and destination", () => {
  const enemyState = spatial([{ unitId: "enemy", playerId: "p2", position: { x: 4, y: 8 } }]);
  const enemyResult = resolveBasicMovement(enemyState, "moving", 4, [
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
  ]);
  assert.equal(enemyResult.stopReason, "blocked");
  assert.deepEqual(enemyResult.spatial.units[0].position, { x: 3, y: 8 });
  assert.equal(enemyResult.remainingSpd, 3);

  const baseResult = resolveBasicMovement(spatial(), "moving", 3, [
    { x: 1, y: 8 },
    { x: 0, y: 8 },
  ]);
  assert.equal(baseResult.stopReason, "blocked");
  assert.deepEqual(baseResult.spatial.units[0].position, { x: 1, y: 8 });
});

test("movement stops when SPD is exhausted and cannot begin below one", () => {
  const state = spatial();
  const partial = resolveBasicMovement(state, "moving", 2, [
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
  ]);
  const negative = resolveBasicMovement(state, "moving", -2, [{ x: 3, y: 8 }]);

  assert.equal(partial.stopReason, "insufficient_spd");
  assert.deepEqual(partial.spatial.units[0].position, { x: 4, y: 8 });
  assert.equal(partial.remainingSpd, 0);
  assert.equal(negative.stopReason, "insufficient_spd");
  assert.equal(negative.spatial, state);
  assert.equal(negative.remainingSpd, -2);
});

test("movement validates unit, SPD, and non-empty paths", () => {
  const state = spatial();
  assert.throws(() => resolveBasicMovement(state, "unknown", 3, [{ x: 3, y: 8 }]), /Unknown moving unit/);
  assert.throws(() => resolveBasicMovement(state, "moving", 1.5, [{ x: 3, y: 8 }]), /safe integer/);
  assert.throws(() => resolveBasicMovement(state, "moving", 3, []), MovementInvariantError);
});

test("monster movement updates spatial position, monster position, and current SPD atomically", () => {
  const monster = movingMonster();
  const state = spatial();
  const result = resolveMonsterMovement(
    [monster],
    state,
    "moving",
    "p1",
    [
      { x: 3, y: 8 },
      { x: 4, y: 8 },
    ],
  );

  assert.deepEqual(result.spatial.units[0].position, { x: 4, y: 8 });
  assert.deepEqual(result.monsters[0].position, { x: 4, y: 8 });
  assert.equal(result.monsters[0].spd.current, monster.spd.current - 2);
  assert.deepEqual(monster.position, { x: 2, y: 8 });
  assert.equal(monster.spd.current, monster.spd.maximum);
  assert.equal(state.units[0].position.x, 2);
});

test("monster movement rejects ownership and monster/spatial mismatches", () => {
  const monster = movingMonster();
  assert.throws(
    () => resolveMonsterMovement([monster], spatial(), "moving", "p2", [{ x: 3, y: 8 }]),
    /does not control/,
  );
  assert.throws(
    () =>
      resolveMonsterMovement(
        [movingMonster({ x: 3, y: 8 })],
        spatial(),
        "moving",
        "p1",
        [{ x: 4, y: 8 }],
      ),
    /inconsistent monster and spatial state/,
  );
});

test("movement spends variable SPD cost based on terrain lookup", () => {
  const terrainLookup = createTerrainLookup([
    createTerrainTile({ x: 3, y: 8 }, "rough", 2),
    createTerrainTile({ x: 4, y: 8 }, "plain", 1),
  ]);

  const result = resolveBasicMovement(
    spatial(),
    "moving",
    4,
    [
      { x: 3, y: 8 },
      { x: 4, y: 8 },
    ],
    { terrainLookup },
  );

  assert.equal(result.stopReason, "completed");
  // Spent 2 (rough) + 1 (plain) = 3 SPD out of 4 -> 1 remaining
  assert.equal(result.remainingSpd, 1);
  assert.deepEqual(result.spatial.units[0].position, { x: 4, y: 8 });
});

test("movement allows entering high-cost terrain with positive SPD, resulting in negative SPD", () => {
  const terrainLookup = createTerrainLookup([
    createTerrainTile({ x: 3, y: 8 }, "rough", 2),
  ]);

  // Starting with 1 SPD. Entering rough terrain (cost 2) leaves remainingSpd = 1 - 2 = -1.
  const entered = resolveBasicMovement(
    spatial(),
    "moving",
    1,
    [{ x: 3, y: 8 }],
    { terrainLookup },
  );

  assert.equal(entered.stopReason, "completed");
  assert.equal(entered.remainingSpd, -1);
  assert.deepEqual(entered.spatial.units[0].position, { x: 3, y: 8 });

  // While SPD is negative (-1 < 1), subsequent movement cannot begin and is blocked with insufficient_spd
  const blocked = resolveBasicMovement(
    entered.spatial,
    "moving",
    entered.remainingSpd,
    [{ x: 4, y: 8 }],
    { terrainLookup },
  );

  assert.equal(blocked.stopReason, "insufficient_spd");
  assert.equal(blocked.traversedPath.length, 0);
  assert.equal(blocked.remainingSpd, -1);
});

test("movement blocks non-GLIDER units from entering impassable terrain", () => {
  const terrainLookup = createTerrainLookup([
    createTerrainTile({ x: 3, y: 8 }, "impassable"),
  ]);

  const result = resolveBasicMovement(
    spatial(),
    "moving",
    4,
    [
      { x: 3, y: 8 },
      { x: 4, y: 8 },
    ],
    { terrainLookup, isGlider: false },
  );

  assert.equal(result.stopReason, "blocked");
  assert.deepEqual(result.spatial.units[0].position, { x: 2, y: 8 });
  assert.equal(result.remainingSpd, 4);
});

test("movement allows GLIDER to traverse impassable terrain but blocks ending on it", () => {
  const terrainLookup = createTerrainLookup([
    createTerrainTile({ x: 3, y: 8 }, "impassable"),
  ]);

  // Traversing across impassable terrain to a plain tile at {x: 4, y: 8}
  const crossed = resolveBasicMovement(
    spatial(),
    "moving",
    4,
    [
      { x: 3, y: 8 },
      { x: 4, y: 8 },
    ],
    { terrainLookup, isGlider: true },
  );

  assert.equal(crossed.stopReason, "completed");
  assert.deepEqual(crossed.spatial.units[0].position, { x: 4, y: 8 });
  // Glider pays standard 1 SPD per step: 4 - 2 = 2
  assert.equal(crossed.remainingSpd, 2);

  // Attempting to stop directly on the impassable tile is blocked
  const stoppedOnImpassable = resolveBasicMovement(
    spatial(),
    "moving",
    4,
    [{ x: 3, y: 8 }],
    { terrainLookup, isGlider: true },
  );

  assert.equal(stoppedOnImpassable.stopReason, "blocked");
  assert.deepEqual(stoppedOnImpassable.spatial.units[0].position, { x: 2, y: 8 });
});

test("GLIDER ignores rough terrain extra cost and pays standard 1 SPD", () => {
  const terrainLookup = createTerrainLookup([
    createTerrainTile({ x: 3, y: 8 }, "rough", 3),
  ]);

  const result = resolveBasicMovement(
    spatial(),
    "moving",
    4,
    [{ x: 3, y: 8 }],
    { terrainLookup, isGlider: true },
  );

  assert.equal(result.stopReason, "completed");
  // Ignores cost 3, pays 1 SPD -> 3 remaining
  assert.equal(result.remainingSpd, 3);
});

