import assert from "node:assert/strict";
import test from "node:test";

import {
  FogInvariantError,
  createMonsterState,
  createPlayerFogKnowledge,
  createSpatialState,
  updatePlayerFogKnowledge,
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

function spatial(monsters) {
  return createSpatialState(
    bases,
    monsters.map((entry) => ({
      unitId: entry.unitId,
      playerId: entry.ownerPlayerId,
      position: entry.position,
    })),
  );
}

test("Fog records a visible enemy and does not follow hidden movement", () => {
  const scout = monster("scout", "p1", { x: 5, y: 5 }, 2);
  const nearby = monster("enemy", "p2", { x: 6, y: 5 });
  const first = updatePlayerFogKnowledge(
    createPlayerFogKnowledge("p1"),
    [scout, nearby],
    spatial([scout, nearby]),
  );
  assert.deepEqual(first.enemies, [
    {
      unitId: "enemy",
      ownerPlayerId: "p2",
      lastKnownPosition: { x: 6, y: 5 },
      currentlyVisible: true,
    },
  ]);

  const hidden = { ...nearby, position: { x: 15, y: 5 } };
  const second = updatePlayerFogKnowledge(first, [scout, hidden], spatial([scout, hidden]));
  assert.deepEqual(second.enemies, [
    {
      unitId: "enemy",
      ownerPlayerId: "p2",
      lastKnownPosition: { x: 6, y: 5 },
      currentlyVisible: false,
    },
  ]);
});

test("Fog refreshes the marker when an enemy becomes visible again", () => {
  const scout = monster("scout", "p1", { x: 5, y: 5 }, 3);
  const oldKnowledge = {
    playerId: "p1",
    enemies: [
      {
        unitId: "enemy",
        ownerPlayerId: "p2",
        lastKnownPosition: { x: 20, y: 5 },
        currentlyVisible: false,
      },
    ],
  };
  const enemy = monster("enemy", "p2", { x: 7, y: 5 });
  const result = updatePlayerFogKnowledge(
    oldKnowledge,
    [scout, enemy],
    spatial([scout, enemy]),
  );

  assert.deepEqual(result.enemies[0].lastKnownPosition, { x: 7, y: 5 });
  assert.equal(result.enemies[0].currentlyVisible, true);
});

test("Fog snapshots never expose allies and reject malformed prior knowledge", () => {
  assert.deepEqual(createPlayerFogKnowledge("p1"), { playerId: "p1", enemies: [] });
  assert.throws(() => createPlayerFogKnowledge(""), FogInvariantError);

  const scout = monster("scout", "p1", { x: 5, y: 5 });
  assert.throws(
    () =>
      updatePlayerFogKnowledge(
        {
          playerId: "p1",
          enemies: [
            {
              unitId: "scout",
              ownerPlayerId: "p1",
              lastKnownPosition: { x: 5, y: 5 },
              currentlyVisible: true,
            },
          ],
        },
        [scout],
        spatial([scout]),
      ),
    /must not contain an allied unit/,
  );
});
