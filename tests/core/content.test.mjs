import assert from "node:assert/strict";
import test from "node:test";

import {
  computeContentHash,
  ContentInvariantError,
  createMonsterCatalog,
  createMonsterState,
  PRIORITY_RACES,
  PROTOTYPE_NORMAL_MONSTERS,
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

test("PROTOTYPE_NORMAL_MONSTERS defines 20 balanced monsters covering all 17 priority races with exact 3-layer stats and keywords", () => {
  assert.equal(PROTOTYPE_NORMAL_MONSTERS.length, 20);

  const ids = new Set();
  const names = new Set();
  const racesRepresented = new Set();

  let keywordCount = 0;
  let twoKeywordCount = 0;
  let vanillaCount = 0;
  let highLevelCount = 0;

  for (const def of PROTOTYPE_NORMAL_MONSTERS) {
    assert.equal(ids.has(def.definitionId), false, `Duplicate ID: ${def.definitionId}`);
    ids.add(def.definitionId);
    assert.equal(names.has(def.name), false, `Duplicate Name: ${def.name}`);
    names.add(def.name);

    for (const r of def.races) {
      racesRepresented.add(r);
    }

    if (def.level >= 5) highLevelCount++;

    const kws = def.keywords ?? [];
    if (kws.length === 0) {
      vanillaCount++;
    } else if (kws.length === 1) {
      keywordCount++;
    } else if (kws.length === 2) {
      keywordCount++;
      twoKeywordCount++;
    } else {
      assert.fail(`Unexpected keyword count: ${kws.length}`);
    }

    // Instantiation verification
    const state = createMonsterState(def, "u1", "c1", "p1", { x: 5, y: 5 }, "attack");
    assert.equal(state.level, def.level);
    assert.equal(state.type, "normal");
  }

  assert.equal(racesRepresented.size, 17);
  for (const race of PRIORITY_RACES) {
    assert.equal(racesRepresented.has(race), true, `Missing race: ${race}`);
  }

  assert.equal(vanillaCount, 10);
  assert.equal(keywordCount, 10);
  assert.equal(twoKeywordCount, 2);
  assert.equal(highLevelCount, 11);

  // Exact 3-layer calculated stats verification
  const expectedStats = {
    "32274490": { hp: 2, mp: 0, atk: 4, def: 1, spd: 2, vis: 3, range: 1 },
    "27288416": { hp: 1, mp: 2, atk: 1, def: 1, spd: 2, vis: 3, range: 1 },
    "90357090": { hp: 4, mp: 0, atk: 7, def: 4, spd: 4, vis: 4, range: 1 },
    "41218256": { hp: 3, mp: 0, atk: 6, def: 4, spd: 3, vis: 3, range: 1 },
    "22916281": { hp: 3, mp: 2, atk: 9, def: 1, spd: 3, vis: 6, range: 1 },
    "69140098": { hp: 4, mp: 3, atk: 11, def: 5, spd: 3, vis: 4, range: 1 },
    "11091375": { hp: 5, mp: 0, atk: 11, def: 9, spd: 2, vis: 4, range: 1 },
    "7359741": { hp: 4, mp: 0, atk: 10, def: 6, spd: 3, vis: 3, range: 1 },
    "41396436": { hp: 4, mp: 0, atk: 8, def: 6, spd: 4, vis: 6, range: 1 },
    "67284908": { hp: 6, mp: 0, atk: 0, def: 18, spd: 1, vis: 2, range: 1 },
    "32012841": { hp: 6, mp: 0, atk: 2, def: 17, spd: 2, vis: 3, range: 1 },
    "17658803": { hp: 7, mp: 0, atk: 15, def: 10, spd: 3, vis: 4, range: 1 },
    "78060096": { hp: 5, mp: 0, atk: 14, def: 5, spd: 4, vis: 3, range: 1 },
    "96981563": { hp: 5, mp: 3, atk: 7, def: 10, spd: 1, vis: 3, range: 1 },
    "52584282": { hp: 5, mp: 0, atk: 8, def: 11, spd: 4, vis: 3, range: 1 },
    "78780140": { hp: 7, mp: 0, atk: 8, def: 10, spd: 1, vis: 3, range: 1 },
    "42599677": { hp: 5, mp: 0, atk: 11, def: 7, spd: 3, vis: 3, range: 1 },
    "12146024": { hp: 5, mp: 0, atk: 7, def: 8, spd: 4, vis: 3, range: 1 },
    "30113682": { hp: 7, mp: 0, atk: 13, def: 9, spd: 3, vis: 4, range: 1 },
    "47986555": { hp: 7, mp: 0, atk: 11, def: 14, spd: 2, vis: 3, range: 1 },
  };

  for (const def of PROTOTYPE_NORMAL_MONSTERS) {
    const s = createMonsterState(def, "u1", "c1", "p1", { x: 5, y: 5 }, "attack");
    const exp = expectedStats[def.definitionId];
    assert.ok(exp, `No expected stats for ${def.definitionId}`);
    assert.equal(s.hp.maximum, exp.hp, `${def.name} HP expected ${exp.hp}, got ${s.hp.maximum}`);
    assert.equal(s.mp.maximum, exp.mp, `${def.name} MP expected ${exp.mp}, got ${s.mp.maximum}`);
    assert.equal(s.atk, exp.atk, `${def.name} ATK expected ${exp.atk}, got ${s.atk}`);
    assert.equal(s.def, exp.def, `${def.name} DEF expected ${exp.def}, got ${s.def}`);
    assert.equal(s.spd.maximum, exp.spd, `${def.name} SPD expected ${exp.spd}, got ${s.spd.maximum}`);
    assert.equal(s.vis, exp.vis, `${def.name} VIS expected ${exp.vis}, got ${s.vis}`);
    assert.equal(s.attackRange, exp.range, `${def.name} Range expected ${exp.range}, got ${s.attackRange}`);
  }
});

