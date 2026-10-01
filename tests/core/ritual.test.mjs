import assert from "node:assert/strict";
import test from "node:test";

import {
  RitualInvariantError,
  createMonsterState,
  createSpatialState,
  resolveRitualSummon,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function definition(definitionId, name, level, type) {
  return {
    definitionId, name, level, type,
    elements: ["light"], races: ["Warrior"],
    printedVis: 3, printedSpd: 4, printedAtk: 4, printedDef: 3,
  };
}

const definitions = [
  definition("normal-a", "Normal A", 4, "normal"),
  definition("normal-b", "Normal B", 4, "normal"),
  definition("ritual-8", "Ritual Eight", 8, "ritual"),
];
const spell = { instanceId: "spell:1", definitionId: "ritual-spell", name: "Ritual Spell", kind: "spell" };
const normalA = { instanceId: "hand:a", definitionId: "normal-a", name: "Normal A", kind: "normal_monster" };
const normalB = { instanceId: "hand:b", definitionId: "normal-b", name: "Normal B", kind: "normal_monster" };
const ritual = { instanceId: "extra:ritual", definitionId: "ritual-8", name: "Ritual Eight", kind: "ritual_monster" };
const procedure = {
  spellDefinitionId: "ritual-spell",
  compatibleRitualDefinitionIds: ["ritual-8"],
};

function cardState(hand) {
  return {
    playerId: "p1", monsterDeck: [], spellTrapDeck: [], extraDeck: [ritual],
    hand, graveyard: [], randomAudit: [],
  };
}

test("Ritual uses hand and map materials, their levels, the Spell, and a released tile atomically", () => {
  const mapMonster = createMonsterState(
    definitions[0], "map:a", "map-card:a", "p1", { x: 5, y: 5 }, "attack",
  );
  const spatial = createSpatialState(bases, [{
    unitId: mapMonster.unitId, playerId: "p1", position: mapMonster.position,
  }]);
  const result = resolveRitualSummon({
    cardState: cardState([spell, normalB]),
    catalog: { definitions },
    monsters: [mapMonster],
    spatial,
    playerId: "p1",
    ritualMonsterInstanceId: ritual.instanceId,
    ritualSpellInstanceId: spell.instanceId,
    procedure,
    materialCardInstanceIds: [normalB.instanceId, mapMonster.cardInstanceId],
    unitId: "ritual:unit",
    anchorUnitId: null,
    sharedVisibleTiles: [],
    destination: { x: 5, y: 5 },
    battlePosition: "attack",
  });

  assert.equal(result.plan.totalMaterialLevels, 8);
  assert.deepEqual(result.plan.mapMaterialUnitIds, ["map:a"]);
  assert.equal(result.plan.usedNormalSummonArea, false);
  assert.deepEqual(result.cardState.hand, []);
  assert.deepEqual(result.cardState.extraDeck, []);
  assert.deepEqual(result.cardState.graveyard.map((card) => card.instanceId), [
    spell.instanceId, normalB.instanceId, mapMonster.cardInstanceId,
  ]);
  assert.equal(result.monsters.length, 1);
  assert.equal(result.monsters[0].type, "ritual");
  assert.equal(result.monsters[0].cardInstanceId, ritual.instanceId);
  assert.deepEqual(result.spatial.units[0].position, { x: 5, y: 5 });
});

test("an all-hand Ritual uses a legal Normal Summon area", () => {
  const spatial = createSpatialState(bases, []);
  const result = resolveRitualSummon({
    cardState: cardState([spell, normalA, normalB]),
    catalog: { definitions },
    monsters: [], spatial, playerId: "p1",
    ritualMonsterInstanceId: ritual.instanceId,
    ritualSpellInstanceId: spell.instanceId,
    procedure,
    materialCardInstanceIds: [normalA.instanceId, normalB.instanceId],
    unitId: "ritual:unit", anchorUnitId: null,
    sharedVisibleTiles: [{ x: 1, y: 8 }],
    destination: { x: 1, y: 8 }, battlePosition: "defense",
  });

  assert.equal(result.plan.usedNormalSummonArea, true);
  assert.equal(result.summonedMonster.battlePosition, "defense");
  assert.deepEqual(result.cardState.graveyard.map((card) => card.instanceId), [
    spell.instanceId, normalA.instanceId, normalB.instanceId,
  ]);
});

test("Ritual rejects incompatible Spells, insufficient levels, duplicates, and illegal destinations", () => {
  const baseRequest = {
    cardState: cardState([spell, normalA]), catalog: { definitions }, monsters: [],
    spatial: createSpatialState(bases, []), playerId: "p1",
    ritualMonsterInstanceId: ritual.instanceId, ritualSpellInstanceId: spell.instanceId,
    procedure, materialCardInstanceIds: [normalA.instanceId], unitId: "ritual:unit",
    anchorUnitId: null, sharedVisibleTiles: [{ x: 1, y: 8 }],
    destination: { x: 1, y: 8 }, battlePosition: "attack",
  };
  assert.throws(() => resolveRitualSummon(baseRequest), /below target level/);
  assert.throws(
    () => resolveRitualSummon({ ...baseRequest, procedure: { ...procedure, compatibleRitualDefinitionIds: [] } }),
    /not compatible/,
  );
  assert.throws(
    () => resolveRitualSummon({ ...baseRequest, materialCardInstanceIds: [normalA.instanceId, normalA.instanceId] }),
    /more than once/,
  );
  assert.throws(
    () => resolveRitualSummon({
      ...baseRequest,
      cardState: cardState([spell, normalA, normalB]),
      materialCardInstanceIds: [normalA.instanceId, normalB.instanceId],
      destination: { x: 2, y: 8 },
    }),
    RitualInvariantError,
  );
});

test("internal Ritual resolution with negated: true preserves paid costs and Extra Deck without placing unit on map", () => {
  const spatial = createSpatialState(bases, []);
  const result = resolveRitualSummon({
    cardState: cardState([spell, normalA, normalB]),
    catalog: { definitions },
    monsters: [],
    spatial,
    playerId: "p1",
    ritualMonsterInstanceId: ritual.instanceId,
    ritualSpellInstanceId: spell.instanceId,
    procedure,
    materialCardInstanceIds: [normalA.instanceId, normalB.instanceId],
    unitId: "ritual:unit",
    anchorUnitId: null,
    sharedVisibleTiles: [{ x: 1, y: 8 }],
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
    negated: true,
  });

  assert.equal(result.summonedMonster, null);
  assert.equal(result.monsters.length, 0);
  assert.equal(result.spatial.units.length, 0);
  assert.equal(result.cardState.hand.length, 0);
  assert.equal(result.cardState.extraDeck.length, 1);
  assert.equal(result.cardState.extraDeck[0].instanceId, ritual.instanceId);
  assert.equal(result.cardState.graveyard.length, 3);
  assert.deepEqual(result.cardState.graveyard.map((c) => c.instanceId), [
    spell.instanceId, normalA.instanceId, normalB.instanceId,
  ]);
  assert.equal(result.plan.negated, true);
});
