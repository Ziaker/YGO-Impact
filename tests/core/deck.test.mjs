import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTRA_DECK_MAX,
  MAX_COPIES_PER_NAME,
  MONSTER_DECK_MAX,
  MONSTER_DECK_MIN,
  NORMAL_MONSTER_MIN,
  SPELL_TRAP_DECK_MAX,
  SPELL_TRAP_DECK_MIN,
  validateDeckConfiguration,
} from "../../src/core/index.ts";

function card(name, kind, copy = 0) {
  return { definitionId: `${kind}:${name}:${copy}`, name, kind };
}

function validDeck() {
  return {
    monsterDeck: Array.from({ length: 20 }, (_, index) =>
      card(`Monster ${index}`, index < 8 ? "normal_monster" : "effect_monster"),
    ),
    spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
      card(`Support ${index}`, index % 2 === 0 ? "spell" : "trap"),
    ),
    extraDeck: [],
  };
}

test("deck limits match the first prototype format", () => {
  assert.equal(MONSTER_DECK_MIN, 20);
  assert.equal(MONSTER_DECK_MAX, 30);
  assert.equal(NORMAL_MONSTER_MIN, 8);
  assert.equal(SPELL_TRAP_DECK_MIN, 15);
  assert.equal(SPELL_TRAP_DECK_MAX, 30);
  assert.equal(EXTRA_DECK_MAX, 10);
  assert.equal(MAX_COPIES_PER_NAME, 3);
  assert.deepEqual(validateDeckConfiguration(validDeck()), { valid: true, violations: [] });
});

test("every construction violation is reported without altering the deck", () => {
  const configuration = {
    monsterDeck: [card("Only Effect", "effect_monster")],
    spellTrapDeck: [card("Only Spell", "spell")],
    extraDeck: Array.from({ length: 11 }, (_, index) => card(`Fusion ${index}`, "fusion_monster")),
  };
  const snapshot = structuredClone(configuration);
  const result = validateDeckConfiguration(configuration);

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.violations.map((entry) => entry.code),
    ["monster_deck_size", "normal_monster_minimum", "spell_trap_deck_size", "extra_deck_size"],
  );
  assert.deepEqual(configuration, snapshot);
});

test("card kinds are restricted to their corresponding Deck", () => {
  const configuration = validDeck();
  configuration.monsterDeck[0] = card("Wrong Spell", "spell");
  configuration.spellTrapDeck[0] = card("Wrong Monster", "effect_monster");
  configuration.extraDeck.push(card("Wrong Extra", "normal_monster"));
  const result = validateDeckConfiguration(configuration);

  assert.equal(result.violations.filter((entry) => entry.code === "wrong_deck").length, 3);
});

test("the three-copy limit is counted across the complete card collection", () => {
  const configuration = validDeck();
  configuration.monsterDeck[0] = card("Shared Name", "normal_monster", 0);
  configuration.monsterDeck[1] = card("Shared Name", "normal_monster", 1);
  configuration.monsterDeck[2] = card("Shared Name", "normal_monster", 2);
  configuration.extraDeck.push(card("Shared Name", "fusion_monster", 3));
  const result = validateDeckConfiguration(configuration);

  assert.equal(result.valid, false);
  assert.equal(result.violations.filter((entry) => entry.code === "copy_limit").length, 1);
});

test("an empty Extra Deck is valid and Ritual/Fusion are its only current types", () => {
  const empty = validDeck();
  assert.equal(validateDeckConfiguration(empty).valid, true);

  const populated = validDeck();
  populated.extraDeck.push(card("Ritual One", "ritual_monster"));
  populated.extraDeck.push(card("Fusion One", "fusion_monster"));
  assert.equal(validateDeckConfiguration(populated).valid, true);
});

test("invalid card identity data produces explicit violations", () => {
  const configuration = validDeck();
  configuration.monsterDeck[0] = { definitionId: "", name: "", kind: "xyz_monster" };
  const result = validateDeckConfiguration(configuration);

  assert.equal(result.valid, false);
  assert.equal(result.violations.some((entry) => entry.code === "invalid_card"), true);
  assert.equal(Object.isFrozen(result.violations), true);
});
