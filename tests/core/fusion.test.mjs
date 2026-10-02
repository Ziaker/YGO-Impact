import assert from "node:assert/strict";
import test from "node:test";

import {
  FusionInvariantError,
  createGameEngine,
  createMonsterState,
  createSpatialState,
  enqueueCommand,
  advanceStep,
  resolveFusionSummon,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function definition(definitionId, name, level, type) {
  return {
    definitionId,
    name,
    level,
    type,
    elements: ["light"],
    races: ["Warrior"],
    printedVis: 3,
    printedSpd: 4,
    printedAtk: 4,
    printedDef: 3,
  };
}

const definitions = [
  definition("mat-a", "Material A", 4, "normal"),
  definition("mat-b", "Material B", 4, "normal"),
  definition("fusion-6", "Fusion Six", 6, "fusion"),
];
const polySpell = { instanceId: "spell:poly", definitionId: "poly-spell", name: "Polymerization", kind: "spell" };
const matA = { instanceId: "hand:a", definitionId: "mat-a", name: "Material A", kind: "normal_monster" };
const matB = { instanceId: "hand:b", definitionId: "mat-b", name: "Material B", kind: "normal_monster" };
const fusionMonster = { instanceId: "extra:fusion", definitionId: "fusion-6", name: "Fusion Six", kind: "fusion_monster" };

const procedure = {
  spellDefinitionId: "poly-spell",
  fusionDefinitionId: "fusion-6",
  materialDefinitionIds: ["mat-a", "mat-b"],
};

function cardState(hand, extraDeck = [fusionMonster]) {
  return {
    playerId: "p1",
    monsterDeck: [],
    spellTrapDeck: [],
    extraDeck,
    hand,
    graveyard: [],
    randomAudit: [],
  };
}

test("Fusion uses hand and map materials, the Spell, and a released tile atomically", () => {
  const mapMonster = createMonsterState(
    definitions[0],
    "map:a",
    "map-card:a",
    "p1",
    { x: 5, y: 5 },
    "attack",
  );
  const spatial = createSpatialState(bases, [
    { unitId: mapMonster.unitId, playerId: "p1", position: mapMonster.position },
  ]);

  const result = resolveFusionSummon({
    cardState: cardState([polySpell, matB]),
    catalog: { definitions },
    monsters: [mapMonster],
    spatial,
    playerId: "p1",
    fusionMonsterInstanceId: fusionMonster.instanceId,
    fusionSpellInstanceId: polySpell.instanceId,
    procedure,
    materialCardInstanceIds: [matB.instanceId, mapMonster.cardInstanceId],
    unitId: "fusion:unit",
    anchorUnitId: null,
    sharedVisibleTiles: [],
    destination: { x: 5, y: 5 },
    battlePosition: "attack",
  });

  assert.deepEqual(result.plan.mapMaterialUnitIds, ["map:a"]);
  assert.equal(result.plan.usedNormalSummonArea, false);
  assert.deepEqual(result.cardState.hand, []);
  assert.deepEqual(result.cardState.extraDeck, []);
  assert.deepEqual(
    result.cardState.graveyard.map((card) => card.instanceId),
    [polySpell.instanceId, matB.instanceId, mapMonster.cardInstanceId],
  );
  assert.equal(result.monsters.length, 1);
  assert.equal(result.monsters[0].type, "fusion");
  assert.equal(result.monsters[0].cardInstanceId, fusionMonster.instanceId);
  assert.deepEqual(result.spatial.units[0].position, { x: 5, y: 5 });
});

test("an all-hand Fusion uses a legal Normal Summon area", () => {
  const spatial = createSpatialState(bases, []);
  const result = resolveFusionSummon({
    cardState: cardState([polySpell, matA, matB]),
    catalog: { definitions },
    monsters: [],
    spatial,
    playerId: "p1",
    fusionMonsterInstanceId: fusionMonster.instanceId,
    fusionSpellInstanceId: polySpell.instanceId,
    procedure,
    materialCardInstanceIds: [matA.instanceId, matB.instanceId],
    unitId: "fusion:unit",
    anchorUnitId: null,
    sharedVisibleTiles: [{ x: 1, y: 8 }],
    destination: { x: 1, y: 8 },
    battlePosition: "defense",
  });

  assert.equal(result.plan.usedNormalSummonArea, true);
  assert.equal(result.summonedMonster?.battlePosition, "defense");
  assert.deepEqual(
    result.cardState.graveyard.map((card) => card.instanceId),
    [polySpell.instanceId, matA.instanceId, matB.instanceId],
  );
  assert.equal(result.monsters.length, 1);
  assert.deepEqual(result.spatial.units[0].position, { x: 1, y: 8 });
});

test("Fusion rejects mismatched materials, incompatible Spells, duplicates, and illegal destinations", () => {
  const spatial = createSpatialState(bases, []);
  const baseRequest = {
    cardState: cardState([polySpell, matA, matB]),
    catalog: { definitions },
    monsters: [],
    spatial,
    playerId: "p1",
    fusionMonsterInstanceId: fusionMonster.instanceId,
    fusionSpellInstanceId: polySpell.instanceId,
    procedure,
    materialCardInstanceIds: [matA.instanceId, matB.instanceId],
    unitId: "fusion:unit",
    anchorUnitId: null,
    sharedVisibleTiles: [{ x: 1, y: 8 }],
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  };

  // Duplicate material selection
  assert.throws(
    () => resolveFusionSummon({ ...baseRequest, materialCardInstanceIds: [matA.instanceId, matA.instanceId] }),
    FusionInvariantError,
  );

  // Incompatible Spell
  assert.throws(
    () => resolveFusionSummon({ ...baseRequest, procedure: { ...procedure, spellDefinitionId: "wrong-spell" } }),
    FusionInvariantError,
  );

  // Illegal destination outside normal area
  assert.throws(
    () => resolveFusionSummon({ ...baseRequest, destination: { x: 10, y: 10 } }),
    FusionInvariantError,
  );
});

test("internal Fusion resolution with negated: true preserves paid costs without placing unit on map", () => {
  const spatial = createSpatialState(bases, []);
  const result = resolveFusionSummon({
    cardState: cardState([polySpell, matA, matB]),
    catalog: { definitions },
    monsters: [],
    spatial,
    playerId: "p1",
    fusionMonsterInstanceId: fusionMonster.instanceId,
    fusionSpellInstanceId: polySpell.instanceId,
    procedure,
    materialCardInstanceIds: [matA.instanceId, matB.instanceId],
    unitId: "fusion:unit",
    anchorUnitId: null,
    sharedVisibleTiles: [{ x: 1, y: 8 }],
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
    negated: true,
  });

  assert.equal(result.summonedMonster, null);
  assert.equal(result.monsters.length, 0);
  assert.equal(result.spatial.units.length, 0);
  assert.deepEqual(
    result.cardState.graveyard.map((card) => card.instanceId),
    [polySpell.instanceId, matA.instanceId, matB.instanceId],
  );
  // Fusion monster remains safely in Extra Deck
  assert.equal(result.cardState.extraDeck.length, 1);
});

test("engine: summon.fusion command executes full Fusion Summon onto battlefield", () => {
  const players = ["p1", "p2"].map((playerId) => ({
    playerId,
    initialMonsterCount: 7,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, index) => ({
        definitionId: `${playerId}:normal:${index}`,
        name: `${playerId} Normal ${index}`,
        kind: "normal_monster",
      })),
      spellTrapDeck: Array.from({ length: 15 }, (_, index) => ({
        definitionId: `${playerId}:support:${index}`,
        name: `${playerId} Support ${index}`,
        kind: "spell",
      })),
      extraDeck: [
        {
          definitionId: "fusion-hero",
          name: "Fusion Hero",
          kind: "fusion_monster",
        },
      ],
    },
  }));

  const heroDef = {
    definitionId: "fusion-hero",
    name: "Fusion Hero",
    level: 6,
    type: "fusion",
    elements: ["light"],
    races: ["Warrior"],
    printedVis: 3,
    printedSpd: 3,
    printedAtk: 12,
    printedDef: 10,
    printedAttackRange: 1,
  };

  const mat1Def = {
    definitionId: "mat-1",
    name: "Mat 1",
    level: 3,
    type: "normal",
    elements: ["earth"],
    races: ["Warrior"],
    printedVis: 2,
    printedSpd: 3,
    printedAtk: 6,
    printedDef: 4,
    printedAttackRange: 1,
  };

  const mat2Def = {
    definitionId: "mat-2",
    name: "Mat 2",
    level: 3,
    type: "normal",
    elements: ["earth"],
    races: ["Warrior"],
    printedVis: 2,
    printedSpd: 3,
    printedAtk: 6,
    printedDef: 4,
    printedAttackRange: 1,
  };

  const heroProcedure = {
    spellDefinitionId: "poly-card",
    fusionDefinitionId: "fusion-hero",
    materialDefinitionIds: ["mat-1", "mat-2"],
  };

  const allDefinitions = [
    ...players.flatMap((p) => p.decks.monsterDeck.map((c) => ({
      definitionId: c.definitionId,
      name: c.name,
      level: 4,
      type: "normal",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 2,
      printedSpd: 4,
      printedAtk: 3,
      printedDef: 2,
    }))),
    heroDef,
    mat1Def,
    mat2Def,
  ];

  let engine = createGameEngine("test-fusion-engine", players, bases, allDefinitions, [], [heroProcedure]);
  engine = enqueueCommand(engine, { issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } });
  engine = enqueueCommand(engine, { issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } });
  engine = advanceStep(engine).engine;

  const polyCardInstance = { instanceId: "p1:card:poly", definitionId: "poly-card", name: "Polymerization", kind: "spell" };
  const mat1CardInstance = { instanceId: "p1:card:mat1", definitionId: "mat-1", name: "Mat 1", kind: "normal_monster" };
  const mat2CardInstance = { instanceId: "p1:card:mat2", definitionId: "mat-2", name: "Mat 2", kind: "normal_monster" };

  // Setup p1 hand with materials and spell
  engine = {
    ...engine,
    state: {
      ...engine.state,
      cardSetup: {
        ...engine.state.cardSetup,
        players: engine.state.cardSetup.players.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                hand: [polyCardInstance, mat1CardInstance, mat2CardInstance, ...p.hand],
              }
            : p,
        ),
      },
    },
  };

  const fusionExtraCard = engine.state.cardSetup.players[0].extraDeck[0];
  assert.ok(fusionExtraCard);

  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "summon.fusion",
    payload: {
      fusionMonsterInstanceId: fusionExtraCard.instanceId,
      fusionSpellInstanceId: polyCardInstance.instanceId,
      materialCardInstanceIds: [mat1CardInstance.instanceId, mat2CardInstance.instanceId],
      unitId: "p1:fusion_hero:unit",
      anchorUnitId: null,
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    },
  });

  const result = advanceStep(engine);
  assert.equal(result.events[0].type, "command_accepted");

  // Fusion monster is on map
  const summoned = result.engine.state.monsters.find((m) => m.unitId === "p1:fusion_hero:unit");
  assert.ok(summoned);
  assert.equal(summoned.type, "fusion");
  assert.equal(summoned.name, "Fusion Hero");
  assert.deepEqual(summoned.position, { x: 1, y: 8 });

  // Extra deck is now empty
  assert.equal(result.engine.state.cardSetup.players[0].extraDeck.length, 0);
  // Materials and spell are in graveyard
  assert.equal(result.engine.state.cardSetup.players[0].graveyard.length, 3);
});
