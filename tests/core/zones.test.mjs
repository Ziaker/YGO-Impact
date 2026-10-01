import assert from "node:assert/strict";
import test from "node:test";

import {
  ZoneInvariantError,
  addCardToGraveyard,
  assertUniquePhysicalCards,
  drawInitialHand,
  initializePlayerCardState,
  removeCardFromHand,
  sendHandCardToGraveyard,
} from "../../src/core/index.ts";

function card(name, kind) {
  return { definitionId: `${kind}:${name}`, name, kind };
}

function state() {
  const decks = {
    monsterDeck: Array.from({ length: 20 }, (_, index) =>
      card(`Monster ${index}`, index < 8 ? "normal_monster" : "effect_monster"),
    ),
    spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
      card(`Support ${index}`, index % 2 === 0 ? "spell" : "trap"),
    ),
    extraDeck: [],
  };
  return drawInitialHand(initializePlayerCardState(decks, "zones", "p1"), 4).state;
}

test("removing a hand card preserves its physical identity without placing it elsewhere", () => {
  const initial = state();
  const selected = initial.hand[2];
  const result = removeCardFromHand(initial, selected.instanceId);
  assert.equal(result.card, selected);
  assert.equal(result.state.hand.length, 6);
  assert.equal(result.state.hand.some((entry) => entry.instanceId === selected.instanceId), false);
  assert.equal(initial.hand.length, 7);
});

test("sending a hand card to the Graveyard is atomic and appends the exact copy", () => {
  const initial = state();
  const selected = initial.hand[0];
  const next = sendHandCardToGraveyard(initial, selected.instanceId);
  assert.equal(next.hand.length, 6);
  assert.deepEqual(next.graveyard, [selected]);
  assertUniquePhysicalCards(next);
});

test("an out-of-play physical card may enter its owner's Graveyard once", () => {
  const initial = state();
  const removal = removeCardFromHand(initial, initial.hand[0].instanceId);
  const buried = addCardToGraveyard(removal.state, removal.card);
  assert.equal(buried.graveyard[0].instanceId, removal.card.instanceId);
  assert.throws(() => addCardToGraveyard(buried, removal.card), /already in a zone/);
});

test("zone operations reject missing cards and pre-existing duplicated copies", () => {
  const initial = state();
  assert.throws(() => removeCardFromHand(initial, "missing"), ZoneInvariantError);
  const duplicate = { ...initial, graveyard: [initial.hand[0]] };
  assert.throws(() => assertUniquePhysicalCards(duplicate), /more than one zone/);
  assert.throws(() => removeCardFromHand(duplicate, initial.hand[0].instanceId), /more than one zone/);
});
