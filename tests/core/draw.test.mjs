import assert from "node:assert/strict";
import test from "node:test";

import {
  DrawInvariantError,
  INITIAL_HAND_SIZE,
  drawCards,
  drawForTurn,
  drawInitialHand,
  initializePlayerCardState,
} from "../../src/core/index.ts";

function card(name, kind) {
  return { definitionId: `${kind}:${name}`, name, kind };
}

function configuration() {
  return {
    monsterDeck: Array.from({ length: 20 }, (_, index) =>
      card(`Monster ${index}`, index < 8 ? "normal_monster" : "effect_monster"),
    ),
    spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
      card(`Support ${index}`, index % 2 === 0 ? "spell" : "trap"),
    ),
    extraDeck: [card("Ritual", "ritual_monster"), card("Fusion", "fusion_monster")],
  };
}

test("separate Decks shuffle reproducibly and every physical copy gets an id", () => {
  const first = initializePlayerCardState(configuration(), "deck-seed", "p1");
  const replay = initializePlayerCardState(configuration(), "deck-seed", "p1");

  assert.deepEqual(first, replay);
  assert.equal(new Set(first.monsterDeck.map((entry) => entry.instanceId)).size, 20);
  assert.equal(first.randomAudit.some((entry) => entry.streamId === "shuffle:p1:monster"), true);
  assert.equal(first.randomAudit.some((entry) => entry.streamId === "shuffle:p1:spell-trap"), true);
});

test("the initial hand contains exactly seven cards in the chosen split", () => {
  const initial = initializePlayerCardState(configuration(), "initial-hand", "p1");
  const result = drawInitialHand(initial, 3);

  assert.equal(INITIAL_HAND_SIZE, 7);
  assert.equal(result.drawn.length, 7);
  assert.equal(result.drawn.filter((entry) => entry.kind.endsWith("monster")).length, 3);
  assert.equal(result.state.hand.length, 7);
  assert.equal(result.state.monsterDeck.length, 17);
  assert.equal(result.state.spellTrapDeck.length, 11);
});

test("all three turn draw modes draw two cards from the selected Decks", () => {
  for (const [mode, expectedMonster, expectedSupport] of [
    ["two_monsters", 2, 0],
    ["two_spell_traps", 0, 2],
    ["one_each", 1, 1],
  ]) {
    const initial = initializePlayerCardState(configuration(), `mode:${mode}`, "p1");
    const result = drawForTurn(initial, mode);
    assert.equal(result.drawn.length, 2);
    assert.equal(initial.monsterDeck.length - result.state.monsterDeck.length, expectedMonster);
    assert.equal(initial.spellTrapDeck.length - result.state.spellTrapDeck.length, expectedSupport);
  }
});

test("an insufficient draw loses before moving any card", () => {
  const initialized = initializePlayerCardState(configuration(), "insufficient", "p1");
  const state = { ...initialized, monsterDeck: initialized.monsterDeck.slice(0, 1) };
  const result = drawCards(state, 2, 0);

  assert.equal(result.deckOut, true);
  assert.equal(result.failedBeforeDrawing, true);
  assert.equal(result.state, state);
  assert.deepEqual(result.drawn, []);
  assert.equal(result.state.hand.length, 0);
});

test("drawing the final card moves it and then reports Deck Out", () => {
  const initialized = initializePlayerCardState(configuration(), "exact-empty", "p1");
  const state = { ...initialized, monsterDeck: initialized.monsterDeck.slice(0, 1) };
  const result = drawCards(state, 1, 0);

  assert.equal(result.deckOut, true);
  assert.equal(result.failedBeforeDrawing, false);
  assert.equal(result.drawn.length, 1);
  assert.equal(result.state.hand.length, 1);
  assert.equal(result.state.monsterDeck.length, 0);
});

test("draw operations validate modes, counts, and Deck legality", () => {
  const initial = initializePlayerCardState(configuration(), "validation", "p1");
  assert.throws(() => drawInitialHand(initial, 8), DrawInvariantError);
  assert.throws(() => drawForTurn(initial, "unknown"), /Unknown draw mode/);
  assert.throws(() => drawCards(initial, -1, 0), /non-negative safe integer/);
  assert.throws(() => drawCards(initial, 0, 0), /at least one card/);

  const illegal = configuration();
  illegal.monsterDeck.length = 1;
  assert.throws(() => initializePlayerCardState(illegal, "seed", "p1"), /illegal Decks/);
});
