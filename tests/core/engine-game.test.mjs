import assert from "node:assert/strict";
import test from "node:test";

import {
  ContentInvariantError,
  SpatialInvariantError,
  createGameEngine,
} from "../../src/core/index.ts";

function card(playerId, index, kind) {
  const definitionId = `${playerId}:${kind}:${index}`;
  return { definitionId, name: `${playerId} ${kind} ${index}`, kind };
}

function setup() {
  const players = ["p1", "p2"].map((playerId) => ({
    playerId,
    initialMonsterCount: 4,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, index) =>
        card(playerId, index, index < 8 ? "normal_monster" : "effect_monster"),
      ),
      spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
        card(playerId, index, index % 2 === 0 ? "spell" : "trap"),
      ),
      extraDeck: [],
    },
  }));
  const definitions = players.flatMap((player) =>
    player.decks.monsterDeck.map((entry) => ({
      definitionId: entry.definitionId,
      name: entry.name,
      level: 4,
      type: entry.kind === "normal_monster" ? "normal" : "effect",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 2,
      printedSpd: 3,
      printedAtk: 4,
      printedDef: 3,
    })),
  );
  return { players, definitions };
}

const horizontalBases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

test("complete game initialization hashes Decks, content, bases, and an empty battlefield", () => {
  const input = setup();
  const first = createGameEngine("full-game", input.players, horizontalBases, input.definitions);
  const replay = createGameEngine("full-game", input.players, horizontalBases, input.definitions);

  assert.deepEqual(first, replay);
  assert.equal(first.state.schemaVersion, 16);
  assert.equal(first.state.content.definitions.length, 40);
  assert.deepEqual(first.state.spatial.units, []);
  assert.deepEqual(first.state.monsters, []);
  assert.deepEqual(first.state.fogKnowledge, [
    { playerId: "p1", enemies: [] },
    { playerId: "p2", enemies: [] },
  ]);
  assert.equal(first.state.cardSetup.players.every((player) => player.hand.length === 7), true);
});

test("a different legal map orientation produces a different authoritative hash", () => {
  const input = setup();
  const horizontal = createGameEngine("map-axis", input.players, horizontalBases, input.definitions);
  const vertical = createGameEngine(
    "map-axis",
    input.players,
    [
      { playerId: "p1", position: { x: 15, y: 0 } },
      { playerId: "p2", position: { x: 15, y: 16 } },
    ],
    input.definitions,
  );
  assert.notEqual(horizontal.stateHash, vertical.stateHash);
});

test("a game cannot start with invalid content or misplaced bases", () => {
  const input = setup();
  assert.throws(
    () => createGameEngine("bad-content", input.players, horizontalBases, input.definitions.slice(1)),
    ContentInvariantError,
  );
  assert.throws(
    () => createGameEngine(
      "bad-map",
      input.players,
      [horizontalBases[0], { playerId: "p2", position: { x: 29, y: 8 } }],
      input.definitions,
    ),
    SpatialInvariantError,
  );
});
