import assert from "node:assert/strict";
import test from "node:test";

import {
  InformationInvariantError,
  createMatchCardView,
  drawInitialHand,
  initializePlayerCardState,
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
    extraDeck: [card(`${label} Ritual`, "ritual_monster")],
  };
}

function states() {
  return ["p1", "p2"].map((playerId) =>
    drawInitialHand(initializePlayerCardState(decks(playerId), "views", playerId), 4).state,
  );
}

test("a player sees own hand and Extra Deck but only opponent counts", () => {
  const view = createMatchCardView(states(), "p1");
  const own = view.players[0];
  const opponent = view.players[1];

  assert.equal(own.visibleHand.length, 7);
  assert.equal(own.visibleExtraDeck.length, 1);
  assert.equal(opponent.handCount, 7);
  assert.equal(opponent.visibleHand, null);
  assert.equal(opponent.visibleExtraDeck, null);
  assert.equal(opponent.monsterDeckCount, 16);
  assert.equal(opponent.spellTrapDeckCount, 12);
});

test("both Graveyards are public while empty and after cards are present", () => {
  const input = states();
  const publicCard = input[1].hand[0];
  input[1] = { ...input[1], graveyard: [publicCard] };
  const view = createMatchCardView(input, "p1");
  assert.deepEqual(view.players[1].graveyard, [publicCard]);
  assert.equal(Object.isFrozen(view.players[1].graveyard), true);
});

test("card views reject unknown viewers and never expose mutable card references", () => {
  const input = states();
  assert.throws(() => createMatchCardView(input, "observer"), InformationInvariantError);
  const view = createMatchCardView(input, "p1");
  assert.notEqual(view.players[0].visibleHand[0], input[0].hand[0]);
  assert.equal(Object.isFrozen(view.players[0].visibleHand[0]), true);
});
