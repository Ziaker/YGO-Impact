import assert from "node:assert/strict";
import test from "node:test";

import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_MONSTERS_PER_PLAYER,
  SpatialInvariantError,
  createSpatialState,
  createInitialSpatialState,
  isInBounds,
  isTilePhysicallyFree,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

test("first prototype map dimensions are 31 x 17", () => {
  assert.equal(MAP_WIDTH, 31);
  assert.equal(MAP_HEIGHT, 17);
  assert.equal(MAX_MONSTERS_PER_PLAYER, 5);
  assert.equal(isInBounds({ x: 30, y: 16 }), true);
  assert.equal(isInBounds({ x: 31, y: 16 }), false);
  assert.equal(isInBounds({ x: 30, y: 17 }), false);
});

test("bases are solid and cannot share or receive a monster tile", () => {
  assert.throws(
    () => createSpatialState(bases, [{ unitId: "u1", playerId: "p1", position: { x: 0, y: 8 } }]),
    SpatialInvariantError,
  );
  assert.throws(
    () => createSpatialState([bases[0], { playerId: "p2", position: { x: 0, y: 8 } }]),
    SpatialInvariantError,
  );
});

test("at most one monster occupies a tile and each unit id is unique", () => {
  assert.throws(
    () =>
      createSpatialState(bases, [
        { unitId: "u1", playerId: "p1", position: { x: 1, y: 8 } },
        { unitId: "u2", playerId: "p2", position: { x: 1, y: 8 } },
      ]),
    SpatialInvariantError,
  );
  assert.throws(
    () =>
      createSpatialState(bases, [
        { unitId: "u1", playerId: "p1", position: { x: 1, y: 8 } },
        { unitId: "u1", playerId: "p1", position: { x: 2, y: 8 } },
      ]),
    SpatialInvariantError,
  );
});

test("a player cannot exceed five monsters on the map", () => {
  const five = Array.from({ length: 5 }, (_, index) => ({
    unitId: `u${index}`,
    playerId: "p1",
    position: { x: index + 1, y: 8 },
  }));
  assert.equal(createSpatialState(bases, five).units.length, 5);
  assert.throws(
    () =>
      createSpatialState(bases, [
        ...five,
        { unitId: "u5", playerId: "p1", position: { x: 6, y: 8 } },
      ]),
    SpatialInvariantError,
  );
});

test("placements must stay in bounds and belong to a player with a base", () => {
  assert.throws(
    () => createSpatialState(bases, [{ unitId: "u1", playerId: "p1", position: { x: -1, y: 8 } }]),
    SpatialInvariantError,
  );
  assert.throws(
    () => createSpatialState(bases, [{ unitId: "u1", playerId: "p3", position: { x: 1, y: 8 } }]),
    SpatialInvariantError,
  );
});

test("physical free-tile helper is deliberately narrower than movement legality", () => {
  const state = createSpatialState(bases, [
    { unitId: "u1", playerId: "p1", position: { x: 1, y: 8 } },
  ]);
  assert.equal(isTilePhysicallyFree(state, { x: 2, y: 8 }), true);
  assert.equal(isTilePhysicallyFree(state, { x: 1, y: 8 }), false);
  assert.equal(isTilePhysicallyFree(state, { x: 0, y: 8 }), false);
  assert.equal(isTilePhysicallyFree(state, { x: 31, y: 8 }), false);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.units[0].position), true);
});

test("initial bases may use either axis but must be centered on opposite edges", () => {
  const horizontal = createInitialSpatialState(["p1", "p2"], bases);
  const vertical = createInitialSpatialState(["p1", "p2"], [
    { playerId: "p1", position: { x: 15, y: 0 } },
    { playerId: "p2", position: { x: 15, y: 16 } },
  ]);

  assert.deepEqual(horizontal.units, []);
  assert.deepEqual(vertical.units, []);
  assert.throws(
    () => createInitialSpatialState(["p1", "p2"], [
      { playerId: "p1", position: { x: 0, y: 7 } },
      { playerId: "p2", position: { x: 30, y: 8 } },
    ]),
    /centers of two opposite map edges/,
  );
  assert.throws(
    () => createInitialSpatialState(["p1", "p2"], [bases[0], { ...bases[1], playerId: "p1" }]),
    /Every match player/,
  );
});
