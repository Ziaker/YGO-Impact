import assert from "node:assert/strict";
import test from "node:test";

import {
  SetupInvariantError,
  createConfiguredEngine,
  initializeMatchCardSetup,
  validateMatchSetup,
} from "../../src/core/index.ts";

function card(name, kind) {
  return { definitionId: `${kind}:${name}`, name, kind };
}

function decks(label) {
  return {
    monsterDeck: Array.from({ length: 20 }, (_, index) =>
      card(`${label} Monster ${index}`, index < 8 ? "normal_monster" : "effect_monster"),
    ),
    spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
      card(`${label} Support ${index}`, index % 2 === 0 ? "spell" : "trap"),
    ),
    extraDeck: [],
  };
}

function players() {
  return [
    { playerId: "human", decks: decks("Human"), initialMonsterCount: 4 },
    { playerId: "ai", decks: decks("AI"), initialMonsterCount: 3 },
  ];
}

test("match setup validates, shuffles, and draws both chosen opening splits", () => {
  const setup = initializeMatchCardSetup("match-seed", players());

  assert.equal(setup.players.length, 2);
  assert.equal(setup.players[0].hand.length, 7);
  assert.equal(setup.players[0].hand.filter((entry) => entry.kind.endsWith("monster")).length, 4);
  assert.equal(setup.players[1].hand.filter((entry) => entry.kind.endsWith("monster")).length, 3);
  assert.equal(setup.players[0].monsterDeck.length, 16);
  assert.equal(setup.players[1].spellTrapDeck.length, 11);
});

test("match setup supports all freely chosen initial hand splits (0 to 7 monsters)", () => {
  const splits = [
    [7, 0],
    [0, 7],
    [1, 6],
    [6, 1],
    [5, 2],
    [2, 5],
    [4, 3],
    [3, 4],
  ];

  for (const [p1Monsters, p2Monsters] of splits) {
    const input = [
      { playerId: "p1", decks: decks("P1"), initialMonsterCount: p1Monsters },
      { playerId: "p2", decks: decks("P2"), initialMonsterCount: p2Monsters },
    ];
    const setup = initializeMatchCardSetup(`seed-${p1Monsters}-${p2Monsters}`, input);
    const p1Hand = setup.players[0].hand;
    const p2Hand = setup.players[1].hand;

    assert.equal(p1Hand.length, 7);
    assert.equal(p2Hand.length, 7);
    assert.equal(p1Hand.filter((c) => c.kind.endsWith("monster")).length, p1Monsters);
    assert.equal(p1Hand.filter((c) => !c.kind.endsWith("monster")).length, 7 - p1Monsters);
    assert.equal(p2Hand.filter((c) => c.kind.endsWith("monster")).length, p2Monsters);
    assert.equal(p2Hand.filter((c) => !c.kind.endsWith("monster")).length, 7 - p2Monsters);

    assert.equal(setup.players[0].monsterDeck.length, 20 - p1Monsters);
    assert.equal(setup.players[0].spellTrapDeck.length, 15 - (7 - p1Monsters));
    assert.equal(setup.players[1].monsterDeck.length, 20 - p2Monsters);
    assert.equal(setup.players[1].spellTrapDeck.length, 15 - (7 - p2Monsters));
  }
});

test("setup rejects invalid initial hand splits (negative, greater than 7, non-integer, NaN)", () => {
  const invalidCounts = [-1, 8, 3.5, NaN, Infinity, -0.1];
  for (const count of invalidCounts) {
    const input = [
      { playerId: "p1", decks: decks("P1"), initialMonsterCount: count },
      { playerId: "p2", decks: decks("P2"), initialMonsterCount: 3 },
    ];
    const validation = validateMatchSetup(input);
    assert.equal(validation.valid, false);
    assert.equal(
      validation.violations.some((v) => v.code === "invalid_initial_hand_split"),
      true,
      `Expected invalid_initial_hand_split for count: ${count}`,
    );
    assert.throws(() => initializeMatchCardSetup("seed", input), SetupInvariantError);
  }
});

test("physical card identifiers are unique across both players", () => {
  const setup = initializeMatchCardSetup("unique-copies", players());
  const ids = setup.players
    .flatMap((player) => [
      ...player.monsterDeck,
      ...player.spellTrapDeck,
      ...player.extraDeck,
      ...player.hand,
    ])
    .map((entry) => entry.instanceId);

  assert.equal(new Set(ids).size, ids.length);
});

test("the same configured match produces the same setup hash and zones", () => {
  const first = initializeMatchCardSetup("replayable-setup", players());
  const replay = initializeMatchCardSetup("replayable-setup", players());
  const different = initializeMatchCardSetup("different-setup", players());

  assert.deepEqual(first, replay);
  assert.equal(first.setupHash, replay.setupHash);
  assert.notEqual(first.setupHash, different.setupHash);
});

test("configured cards and shuffle audit are part of the authoritative engine hash", () => {
  const first = createConfiguredEngine("configured-engine", players());
  const replay = createConfiguredEngine("configured-engine", players());
  const changedSeed = createConfiguredEngine("configured-engine-changed", players());

  assert.deepEqual(first, replay);
  assert.notEqual(first.state.cardSetup, null);
  assert.equal(first.state.cardSetup.players.every((player) => player.hand.length === 7), true);
  assert.equal(first.state.randomAudit.length > 1, true);
  assert.notEqual(first.stateHash, changedSeed.stateHash);
});

test("setup reports every player and Deck violation without changing input", () => {
  const input = players();
  input[0].playerId = "ai";
  input[0].initialMonsterCount = 8;
  input[0].decks.monsterDeck.length = 1;
  const before = structuredClone(input);
  const validation = validateMatchSetup(input);

  assert.equal(validation.valid, false);
  assert.equal(validation.violations.some((entry) => entry.code === "duplicate_player"), true);
  assert.equal(validation.violations.some((entry) => entry.code === "invalid_initial_hand_split"), true);
  assert.equal(validation.violations.some((entry) => entry.code === "illegal_deck"), true);
  assert.deepEqual(input, before);
  assert.throws(() => initializeMatchCardSetup("invalid", input), SetupInvariantError);
});

test("setup requires a seed and exactly two distinct non-empty players", () => {
  assert.throws(() => initializeMatchCardSetup("", players()), /seed must not be empty/);
  assert.equal(validateMatchSetup(players().slice(0, 1)).violations[0].code, "player_count");
  assert.equal(
    validateMatchSetup([{ ...players()[0], playerId: " " }, players()[1]]).violations.some(
      (entry) => entry.code === "invalid_player",
    ),
    true,
  );
});
