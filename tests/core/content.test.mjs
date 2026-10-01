import assert from "node:assert/strict";
import test from "node:test";

import {
  computeContentHash,
  ContentInvariantError,
  createMonsterCatalog,
  validateMonsterCatalog,
} from "../../src/core/index.ts";

function card(definitionId, name, kind) {
  return { definitionId, name, kind };
}

function decks() {
  return {
    monsterDeck: [
      card("normal", "Normal", "normal_monster"),
      card("effect", "Effect", "effect_monster"),
    ],
    spellTrapDeck: [card("spell", "Spell", "spell")],
    extraDeck: [card("ritual", "Ritual", "ritual_monster")],
  };
}

function definition(definitionId, name, type) {
  return {
    definitionId,
    name,
    level: 4,
    type,
    elements: ["light"],
    races: ["Spellcaster"],
    printedVis: 2,
    printedSpd: 3,
    printedAtk: 4,
    printedDef: 3,
  };
}

function definitions() {
  return [
    definition("normal", "Normal", "normal"),
    definition("effect", "Effect", "effect"),
    definition("ritual", "Ritual", "ritual"),
  ];
}

test("catalog connects every monster card to a validated matching definition", () => {
  const catalog = createMonsterCatalog(definitions().reverse(), [decks()]);
  assert.deepEqual(catalog.definitions.map((entry) => entry.definitionId), [
    "effect",
    "normal",
    "ritual",
  ]);
  assert.equal(Object.isFrozen(catalog.definitions[0].elements), true);
});

test("spell and trap cards do not require monster definitions", () => {
  const validation = validateMonsterCatalog(definitions(), [decks()]);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.violations, []);
});

test("catalog reports missing, mismatched, duplicate, and invalid definitions separately", () => {
  const configuredDecks = decks();
  configuredDecks.monsterDeck.push(card("missing", "Missing", "normal_monster"));
  configuredDecks.monsterDeck[1] = card("effect", "Wrong Name", "normal_monster");
  const invalid = definition("invalid", "Invalid", "effect");
  invalid.printedSpd = -1;
  const input = [...definitions(), definitions()[0], invalid];
  const validation = validateMonsterCatalog(input, [configuredDecks]);

  assert.equal(validation.valid, false);
  assert.equal(validation.violations.some((entry) => entry.code === "duplicate_definition"), true);
  assert.equal(validation.violations.some((entry) => entry.code === "invalid_definition"), true);
  assert.equal(validation.violations.some((entry) => entry.code === "missing_definition"), true);
  assert.equal(validation.violations.some((entry) => entry.code === "type_mismatch"), true);
  assert.equal(validation.violations.some((entry) => entry.code === "name_mismatch"), true);
  assert.throws(() => createMonsterCatalog(input, [configuredDecks]), ContentInvariantError);
});

test("catalog creation defensively copies definitions", () => {
  const input = definitions();
  const catalog = createMonsterCatalog(input, [decks()]);
  input[0].elements[0] = "dark";
  input[0].name = "Changed";
  assert.equal(catalog.definitions.find((entry) => entry.definitionId === "normal").name, "Normal");
  assert.deepEqual(
    catalog.definitions.find((entry) => entry.definitionId === "normal").elements,
    ["light"],
  );
});

test("catalog computes canonical contentHash incorporating definitions and ritual procedures", () => {
  const defs = definitions();
  const deckList = [decks()];
  const procsA = [
    { spellDefinitionId: "spell", compatibleRitualDefinitionIds: ["ritual"] },
  ];
  const procsB = [
    { spellDefinitionId: "spell", compatibleRitualDefinitionIds: ["other-ritual"] },
  ];

  const catalogA = createMonsterCatalog(defs, deckList, procsA);
  const catalogB = createMonsterCatalog(defs, deckList, procsB);
  const catalogNoProcs = createMonsterCatalog(defs, deckList, []);

  // contentHash is a non-empty 16-hex canonical string
  assert.match(catalogA.contentHash, /^[0-9a-f]{16}$/);
  assert.match(catalogB.contentHash, /^[0-9a-f]{16}$/);

  // Changing compatibleRitualDefinitionIds produces divergent contentHash
  assert.notEqual(catalogA.contentHash, catalogB.contentHash);
  assert.notEqual(catalogA.contentHash, catalogNoProcs.contentHash);

  // computeContentHash matches catalog.contentHash
  assert.equal(computeContentHash(defs, procsA), catalogA.contentHash);
  assert.equal(computeContentHash(defs, procsB), catalogB.contentHash);

  // Order invariance: reversing input order produces identical contentHash
  const reversedCatalogA = createMonsterCatalog([...defs].reverse(), deckList, procsA);
  assert.equal(reversedCatalogA.contentHash, catalogA.contentHash);
});
