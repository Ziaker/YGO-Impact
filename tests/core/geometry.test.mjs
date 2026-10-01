import assert from "node:assert/strict";
import test from "node:test";

import {
  GeometryInvariantError,
  hasClearAttackLine,
  isWithinOrthogonalRange,
  orthogonalDistance,
  traceTouchedTiles,
} from "../../src/core/index.ts";

test("range uses orthogonal distance rather than diagonal adjacency", () => {
  const origin = { x: 5, y: 5 };
  const diagonal = { x: 6, y: 6 };
  assert.equal(orthogonalDistance(origin, diagonal), 2);
  assert.equal(isWithinOrthogonalRange(origin, diagonal, 1), false);
  assert.equal(isWithinOrthogonalRange(origin, diagonal, 2), true);
});

test("straight attack lines include every crossed tile", () => {
  assert.deepEqual(traceTouchedTiles({ x: 1, y: 3 }, { x: 4, y: 3 }), [
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
  ]);
});

test("a line passing exactly through corners includes both adjacent tiles", () => {
  const touched = traceTouchedTiles({ x: 1, y: 1 }, { x: 3, y: 3 });
  const keys = new Set(touched.map((tile) => `${tile.x},${tile.y}`));

  assert.deepEqual(keys, new Set(["1,1", "2,1", "1,2", "2,2", "3,2", "2,3", "3,3"]));
});

test("intermediate units, obstacles, and bases block but the target does not", () => {
  const origin = { x: 1, y: 1 };
  const target = { x: 4, y: 1 };
  assert.equal(hasClearAttackLine(origin, target, [{ x: 2, y: 1 }]), false);
  assert.equal(hasClearAttackLine(origin, target, [target]), true);
  assert.equal(hasClearAttackLine(origin, target, [origin]), true);
});

test("a corner-touching blocker blocks the ranged line", () => {
  assert.equal(
    hasClearAttackLine({ x: 1, y: 1 }, { x: 2, y: 2 }, [{ x: 2, y: 1 }]),
    false,
  );
  assert.equal(hasClearAttackLine({ x: 1, y: 1 }, { x: 2, y: 2 }, []), true);
});

test("geometry rejects invalid positions and ranges", () => {
  assert.throws(() => orthogonalDistance({ x: -1, y: 0 }, { x: 0, y: 0 }), GeometryInvariantError);
  assert.throws(() => isWithinOrthogonalRange({ x: 0, y: 0 }, { x: 1, y: 0 }, -1), /non-negative/);
});
