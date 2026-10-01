import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceStep,
  createGameEngine,
  createReplayFile,
  enqueueCommand,
  ReplayInvariantError,
  runReplay,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function ritualPlayerSetup() {
  return ["p1", "p2"].map((playerId) => ({
    playerId,
    initialMonsterCount: 5,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, index) => ({
        definitionId: `${playerId}:normal:${index}`,
        name: `${playerId} Normal ${index}`,
        kind: "normal_monster",
      })),
      spellTrapDeck: Array.from({ length: 15 }, (_, index) => ({
        definitionId: `${playerId}:spell:${index}`,
        name: `${playerId} Spell ${index}`,
        kind: "spell",
      })),
      extraDeck: [
        {
          definitionId: "ritual-8",
          name: "Ritual Eight",
          kind: "ritual_monster",
        },
      ],
    },
  }));
}

function ritualDefinitions(players) {
  const monsterDefs = players.flatMap((player) =>
    player.decks.monsterDeck.map((entry) => ({
      definitionId: entry.definitionId,
      name: entry.name,
      level: 4,
      type: "normal",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 40,
      printedSpd: 40,
      printedAtk: 4,
      printedDef: 3,
    })),
  );
  const ritualDef = {
    definitionId: "ritual-8",
    name: "Ritual Eight",
    level: 8,
    type: "ritual",
    elements: ["dark"],
    races: ["Dragon"],
    printedVis: 3,
    printedSpd: 4,
    printedAtk: 6,
    printedDef: 5,
  };
  return [...monsterDefs, ritualDef];
}

function canonicalProcedures(players) {
  return players.flatMap((player) =>
    player.decks.spellTrapDeck.map((spell) => ({
      spellDefinitionId: spell.definitionId,
      compatibleRitualDefinitionIds: ["ritual-8"],
    })),
  );
}

function queue(engine, issuer, kind, payload) {
  return enqueueCommand(engine, { issuer, kind, payload });
}

function enterActionPhase(engine) {
  let queued = queue(engine, "p1", "turn.allocate_resources", {
    actions: 4,
    reactions: 4,
  });
  queued = queue(queued, "p2", "turn.allocate_resources", {
    actions: 4,
    reactions: 4,
  });
  return advanceStep(queued).engine;
}

test("1. Ritual Summon using hand-only materials resolves atomically (procedure from canonical content)", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-hand-only", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  assert.ok(handMonsters.length >= 2);
  assert.ok(handSpells.length >= 1);
  assert.ok(ritualCard);

  // Command payload contains ONLY player choices: NO procedure, NO negated
  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_accepted");
  const after = stepResult.engine;
  assert.equal(after.state.monsters.length, 1);
  const summoned = after.state.monsters[0];
  assert.equal(summoned.unitId, "p1:ritual-unit");
  assert.equal(summoned.type, "ritual");
  assert.equal(summoned.cardInstanceId, ritualCard.instanceId);
  assert.deepEqual(summoned.position, { x: 1, y: 8 });
  assert.deepEqual(after.state.spatial.units[0].position, { x: 1, y: 8 });

  const p1After = after.state.cardSetup.players[0];
  assert.equal(p1After.hand.length, 4);
  assert.equal(p1After.extraDeck.length, 0);
  assert.equal(p1After.graveyard.length, 3);
  assert.equal(p1After.graveyard[0].instanceId, handSpells[0].instanceId);
  assert.equal(p1After.graveyard[1].instanceId, handMonsters[0].instanceId);
  assert.equal(p1After.graveyard[2].instanceId, handMonsters[1].instanceId);
  assert.equal(after.state.turn.players[0].remaining.actions, 4);
});

test("2. Ritual Summon combining hand and map materials resolves atomically", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-hand-map", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: handMonsters[0].instanceId,
    unitId: "p1:normal-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.monsters.length, 1);
  assert.equal(engine.state.monsters[0].unitId, "p1:normal-unit");

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[1].instanceId, handMonsters[0].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "defense",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_accepted");
  const after = stepResult.engine;
  assert.equal(after.state.monsters.length, 1);
  assert.equal(after.state.monsters[0].unitId, "p1:ritual-unit");
  assert.equal(after.state.monsters[0].battlePosition, "defense");
  assert.deepEqual(after.state.monsters[0].position, { x: 1, y: 8 });

  const p1After = after.state.cardSetup.players[0];
  assert.equal(p1After.hand.length, 4);
  assert.equal(p1After.extraDeck.length, 0);
  assert.equal(p1After.graveyard.length, 3);
});

test("3. Ritual Summon rejects insufficient material levels", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-insufficient", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /below target level/);
  assert.equal(stepResult.engine.state.monsters.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].hand.length, 7);
  assert.equal(stepResult.engine.state.cardSetup.players[0].graveyard.length, 0);
});

test("4. Ritual Summon rejects ritual monster missing from Extra Deck", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-missing-extra", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: "non-existent-instance-id",
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /not in the Extra Deck/);
  assert.equal(stepResult.engine.state.monsters.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].hand.length, 7);
});

test("5. Ritual Summon rejects illegal destination", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-illegal-dest", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 15, y: 8 },
    battlePosition: "attack",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /not legal/);
  assert.equal(stepResult.engine.state.monsters.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].hand.length, 7);
});

test("6. Ritual Summon with multiple released map tiles allows controller to choose which tile to occupy", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);

  function prepareTwoMonsterEngine() {
    let engine = enterActionPhase(createGameEngine("ritual-multi-choice", players, bases, defs, procs));
    const p1Cards = engine.state.cardSetup.players[0];
    const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");

    engine = queue(engine, "p1", "summon.normal", {
      cardInstanceId: handMonsters[0].instanceId,
      unitId: "p1:unit-1",
      anchorUnitId: null,
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    });
    engine = advanceStep(engine).engine;

    engine = queue(engine, "p1", "monster.move_basic", {
      unitId: "p1:unit-1",
      path: [{ x: 2, y: 8 }],
    });
    engine = advanceStep(engine).engine;

    engine = queue(engine, "p1", "summon.normal", {
      cardInstanceId: handMonsters[1].instanceId,
      unitId: "p1:unit-2",
      anchorUnitId: "p1:unit-1",
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    });
    engine = advanceStep(engine).engine;
    assert.equal(engine.state.monsters.length, 2);
    return engine;
  }

  // Choice A: destination { x: 2, y: 8 }
  {
    let engineA = prepareTwoMonsterEngine();
    const p1Cards = engineA.state.cardSetup.players[0];
    const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
    const ritualCard = p1Cards.extraDeck[0];
    const mapMaterials = engineA.state.monsters.map((m) => m.cardInstanceId);

    engineA = queue(engineA, "p1", "summon.ritual", {
      ritualMonsterInstanceId: ritualCard.instanceId,
      ritualSpellInstanceId: handSpells[0].instanceId,
      materialCardInstanceIds: mapMaterials,
      unitId: "p1:ritual-unit",
      anchorUnitId: null,
      destination: { x: 2, y: 8 },
      battlePosition: "attack",
    });
    const resultA = advanceStep(engineA);
    assert.equal(resultA.events[0].type, "command_accepted");
    assert.equal(resultA.engine.state.monsters.length, 1);
    assert.deepEqual(resultA.engine.state.monsters[0].position, { x: 2, y: 8 });
  }

  // Choice B: destination { x: 1, y: 8 }
  {
    let engineB = prepareTwoMonsterEngine();
    const p1Cards = engineB.state.cardSetup.players[0];
    const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
    const ritualCard = p1Cards.extraDeck[0];
    const mapMaterials = engineB.state.monsters.map((m) => m.cardInstanceId);

    engineB = queue(engineB, "p1", "summon.ritual", {
      ritualMonsterInstanceId: ritualCard.instanceId,
      ritualSpellInstanceId: handSpells[0].instanceId,
      materialCardInstanceIds: mapMaterials,
      unitId: "p1:ritual-unit",
      anchorUnitId: null,
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    });
    const resultB = advanceStep(engineB);
    assert.equal(resultB.events[0].type, "command_accepted");
    assert.equal(resultB.engine.state.monsters.length, 1);
    assert.deepEqual(resultB.engine.state.monsters[0].position, { x: 1, y: 8 });
  }

  // Choice C: destination { x: 3, y: 8 } (unreleased tile)
  {
    let engineC = prepareTwoMonsterEngine();
    const p1Cards = engineC.state.cardSetup.players[0];
    const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
    const ritualCard = p1Cards.extraDeck[0];
    const mapMaterials = engineC.state.monsters.map((m) => m.cardInstanceId);

    engineC = queue(engineC, "p1", "summon.ritual", {
      ritualMonsterInstanceId: ritualCard.instanceId,
      ritualSpellInstanceId: handSpells[0].instanceId,
      materialCardInstanceIds: mapMaterials,
      unitId: "p1:ritual-unit",
      anchorUnitId: null,
      destination: { x: 3, y: 8 },
      battlePosition: "attack",
    });
    const resultC = advanceStep(engineC);
    assert.equal(resultC.events[0].type, "command_rejected");
    assert.match(resultC.events[0].reason, /not legal/);
    assert.equal(resultC.engine.state.monsters.length, 2);
  }
});

test("7. Cancellation before confirmation preserves all cards and resources without cost", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-cancel", players, bases, defs, procs));
  const initialHandLength = engine.state.cardSetup.players[0].hand.length;
  const initialExtraDeckLength = engine.state.cardSetup.players[0].extraDeck.length;
  const initialActions = engine.state.turn.players[0].remaining.actions;

  engine = queue(engine, "p1", "turn.pass_turn_phase", {});
  engine = advanceStep(engine).engine;

  assert.equal(engine.state.cardSetup.players[0].hand.length, initialHandLength);
  assert.equal(engine.state.cardSetup.players[0].extraDeck.length, initialExtraDeckLength);
  assert.equal(engine.state.cardSetup.players[0].graveyard.length, 0);
  assert.equal(engine.state.monsters.length, 0);
  assert.equal(engine.state.turn.players[0].remaining.actions, initialActions);
});

test("8. Successful Ritual Summon initializes full HP, MP, SPD, and structural RACE stats", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-stats", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:dragon-ritual",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;

  const monster = engine.state.monsters[0];
  assert.ok(monster);
  assert.equal(monster.type, "ritual");
  assert.deepEqual(monster.structuralRaces, ["Dragon"]);

  // Level 8 Ritual: base HP = 8 + floor(8/2) = 12. Dragon RACE bonus: +1 HP -> 13
  assert.equal(monster.hp.maximum, 13);
  assert.equal(monster.hp.current, 13);

  // Level 8 Ritual: base MP = (2 + floor(8/2)) + floor(8/4) = 6 + 2 = 8. Dragon bonus: +0 MP -> 8
  assert.equal(monster.mp.maximum, 8);
  assert.equal(monster.mp.current, 8);

  // Printed SPD 4 + Dragon 0 = 4
  assert.equal(monster.spd.maximum, 4);
  assert.equal(monster.spd.current, 4);

  // Printed ATK 6 + Dragon 0 = 6
  assert.equal(monster.atk, 6);

  // Printed DEF 5 + Dragon 1 = 6
  assert.equal(monster.def, 6);

  // Printed VIS 3 + Dragon 0 = 3
  assert.equal(monster.vis, 3);
});

test("9. Timing: summon.ritual is rejected when attempted outside the Action phase", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  const engine = createGameEngine("ritual-timing-phase", players, bases, defs, procs);
  assert.equal(engine.state.turn.phase, "decision");

  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  const queued = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const result = advanceStep(queued);

  assert.equal(result.events[0].type, "command_rejected");
  assert.match(result.events[0].reason, /action phase/);
  assert.equal(result.engine.state.monsters.length, 0);
});

test("10. Timing: summon.ritual is rejected when attempted while another Chain is open or resolving", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-timing-chain", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const p2Cards = engine.state.cardSetup.players[1];
  const p1Monsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const p2Monsters = p2Cards.hand.filter((c) => c.kind === "normal_monster");
  const p1Spells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  // Summon attacker and defender
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: p1Monsters[0].instanceId,
    unitId: "p1:attacker",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  engine = queue(engine, "p2", "summon.normal", {
    cardInstanceId: p2Monsters[0].instanceId,
    unitId: "p2:defender",
    anchorUnitId: null,
    destination: { x: 29, y: 8 },
    battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;

  // Move them adjacent
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:attacker",
    path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = queue(engine, "p2", "monster.move_basic", {
    unitId: "p2:defender",
    path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
  });
  engine = advanceStep(engine).engine;

  // Declare attack to open a Chain window
  engine = queue(engine, "p1", "battle.declare_basic_attack", {
    attackerUnitId: "p1:attacker",
    defenderUnitId: "p2:defender",
  });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.chainWindows.length, 1);

  // Attempt to declare summon.ritual while the Chain is open -> REJECTED
  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: p1Spells[0].instanceId,
    materialCardInstanceIds: [p1Monsters[1].instanceId, p1Monsters[2].instanceId],
    unitId: "p1:ritual-mid-chain",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const blocked = advanceStep(engine);

  assert.equal(blocked.events[0].type, "command_rejected");
  assert.match(blocked.events[0].reason, /Chain is open or resolving/);
  assert.equal(blocked.engine.state.monsters.some((m) => m.unitId === "p1:ritual-mid-chain"), false);
});

test("11. Strict Payload Validation: client cannot inject 'procedure' into summon.ritual payload (rejected with command_rejected)", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  // Canonical procedure only allows "other-ritual-id", NOT "ritual-8"
  const procs = players.flatMap((p) =>
    p.decks.spellTrapDeck.map((spell) => ({
      spellDefinitionId: spell.definitionId,
      compatibleRitualDefinitionIds: ["other-ritual-id"],
    })),
  );
  let engine = enterActionPhase(createGameEngine("ritual-client-tamper", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0]; // definitionId: "ritual-8"

  // Client attempts to override canonical procedure by injecting a procedure into payload that allows "ritual-8"
  const tamperedPayload = {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    procedure: {
      spellDefinitionId: handSpells[0].definitionId,
      compatibleRitualDefinitionIds: ["ritual-8"],
    },
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:tampered-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  };

  // The engine strictly rejects unknown/extra fields in payload: command_rejected, no mutations, no costs paid!
  const stepResult = advanceStep(queue(engine, "p1", "summon.ritual", tamperedPayload));
  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /unexpected field 'procedure'/i);
  assert.equal(stepResult.engine.state.monsters.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].graveyard.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].hand.length, 7);
});

test("12. Authoritative Content: summon.ritual is rejected when the Ritual Spell has no canonical procedure", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  // Empty ritual procedures: NO canonical procedure exists for this spell
  let engine = enterActionPhase(createGameEngine("ritual-no-procedure", players, bases, defs, []));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /No canonical Ritual Procedure found/);
  assert.equal(stepResult.engine.state.monsters.length, 0);
});

test("13. Authoritative Content: summon.ritual is rejected when canonical procedure does not include the Ritual Monster", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  // Canonical procedure only allows "other-ritual-id", NOT "ritual-8"
  const procs = players.flatMap((p) =>
    p.decks.spellTrapDeck.map((spell) => ({
      spellDefinitionId: spell.definitionId,
      compatibleRitualDefinitionIds: ["other-ritual-id"],
    })),
  );
  let engine = enterActionPhase(createGameEngine("ritual-incompatible-proc", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /not compatible/);
  assert.equal(stepResult.engine.state.monsters.length, 0);
});

test("14. Strict Payload Validation: client cannot self-negate by passing 'negated: true' into summon.ritual payload", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-client-negate", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  // Client attempts to pass negated: true in the public command
  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
    negated: true,
  });
  const stepResult = advanceStep(engine);

  // The engine strictly rejects 'negated': command_rejected, no mutations, no costs paid!
  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /unexpected field 'negated'/i);
  assert.equal(stepResult.engine.state.monsters.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].graveyard.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].extraDeck.length, 1);
  assert.equal(stepResult.engine.state.cardSetup.players[0].hand.length, 7);
});

test("14b. Strict Payload Validation: arbitrary unknown fields in summon.ritual payload are strictly rejected without state mutation", () => {
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);
  let engine = enterActionPhase(createGameEngine("ritual-client-extra-field", players, bases, defs, procs));
  const p1Cards = engine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  engine = queue(engine, "p1", "summon.ritual", {
    ritualMonsterInstanceId: ritualCard.instanceId,
    ritualSpellInstanceId: handSpells[0].instanceId,
    materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
    unitId: "p1:ritual-unit",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
    arbitraryField: "not_allowed",
  });
  const stepResult = advanceStep(engine);

  assert.equal(stepResult.events[0].type, "command_rejected");
  assert.match(stepResult.events[0].reason, /unexpected field 'arbitraryField'/i);
  assert.equal(stepResult.engine.state.monsters.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].graveyard.length, 0);
  assert.equal(stepResult.engine.state.cardSetup.players[0].extraDeck.length, 1);
  assert.equal(stepResult.engine.state.cardSetup.players[0].hand.length, 7);
});

test("15. Ritual Summon executes deterministically across independent engine instances with same seed", () => {
  const seed = "deterministic-ritual-seed";
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);

  function runEngine() {
    let engine = enterActionPhase(createGameEngine(seed, players, bases, defs, procs));
    const p1Cards = engine.state.cardSetup.players[0];
    const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
    const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
    const ritualCard = p1Cards.extraDeck[0];

    engine = queue(engine, "p1", "summon.ritual", {
      ritualMonsterInstanceId: ritualCard.instanceId,
      ritualSpellInstanceId: handSpells[0].instanceId,
      materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
      unitId: "p1:ritual-unit",
      anchorUnitId: null,
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    });
    return advanceStep(engine).engine;
  }

  const engine1 = runEngine();
  const engine2 = runEngine();

  assert.equal(engine1.stateHash, engine2.stateHash);
  assert.deepEqual(engine1.state, engine2.state);
});

test("16. Replay recording a match with Ritual Summon reproduces identical authoritative hashes", () => {
  const seed = "replay-ritual-seed";
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procs = canonicalProcedures(players);

  const initialEngine = createGameEngine(seed, players, bases, defs, procs);
  const p1Cards = initialEngine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  const replay = createReplayFile(
    seed,
    ["p1", "p2"],
    2,
    [
      { receivedAtStep: 0, issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
      { receivedAtStep: 0, issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
      {
        receivedAtStep: 1,
        issuer: "p1",
        kind: "summon.ritual",
        payload: {
          ritualMonsterInstanceId: ritualCard.instanceId,
          ritualSpellInstanceId: handSpells[0].instanceId,
          materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
          unitId: "p1:replay-ritual",
          anchorUnitId: null,
          destination: { x: 1, y: 8 },
          battlePosition: "attack",
        },
      },
    ],
    players,
    { bases, monsterDefinitions: defs, ritualProcedures: procs },
  );

  const run1 = runReplay(replay);
  const run2 = runReplay(replay);

  assert.deepEqual(run1.hashes, run2.hashes);
  assert.equal(run1.hashes.length, 3);
  assert.equal(run1.finalEngine.state.monsters.length, 1);
  assert.equal(run1.finalEngine.state.monsters[0].unitId, "p1:replay-ritual");
  assert.equal(run1.finalEngine.state.monsters[0].type, "ritual");
  assert.equal(run1.finalEngine.state.cardSetup.players[0].graveyard.length, 3);
  assert.equal(run1.finalEngine.state.cardSetup.players[0].extraDeck.length, 0);
});

test("17. Canonical Content Hash & Replay Incompatibility: Replay recorded with procedure A is rejected before simulation when executed against procedure B", () => {
  const seed = "replay-incompatible-proc-seed";
  const players = ritualPlayerSetup();
  const defs = ritualDefinitions(players);
  const procsA = canonicalProcedures(players); // Spell allows "ritual-8"
  const procsB = players.flatMap((p) =>
    p.decks.spellTrapDeck.map((spell) => ({
      spellDefinitionId: spell.definitionId,
      compatibleRitualDefinitionIds: ["other-ritual-id"], // Divergent procedure B
    })),
  );

  const initialEngine = createGameEngine(seed, players, bases, defs, procsA);
  const p1Cards = initialEngine.state.cardSetup.players[0];
  const handMonsters = p1Cards.hand.filter((c) => c.kind === "normal_monster");
  const handSpells = p1Cards.hand.filter((c) => c.kind === "spell");
  const ritualCard = p1Cards.extraDeck[0];

  const replay = createReplayFile(
    seed,
    ["p1", "p2"],
    2,
    [
      { receivedAtStep: 0, issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
      { receivedAtStep: 0, issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
      {
        receivedAtStep: 1,
        issuer: "p1",
        kind: "summon.ritual",
        payload: {
          ritualMonsterInstanceId: ritualCard.instanceId,
          ritualSpellInstanceId: handSpells[0].instanceId,
          materialCardInstanceIds: [handMonsters[0].instanceId, handMonsters[1].instanceId],
          unitId: "p1:replay-ritual",
          anchorUnitId: null,
          destination: { x: 1, y: 8 },
          battlePosition: "attack",
        },
      },
    ],
    players,
    { bases, monsterDefinitions: defs, ritualProcedures: procsA },
  );

  // The replay recorded with procedure A has contentHash(A)
  assert.ok(replay.gameSetup.contentHash);

  // Executing the replay against environment with procedure B is rejected before simulation starts!
  assert.throws(
    () => runReplay(replay, { ritualProcedures: procsB }),
    (error) => {
      assert.ok(error instanceof ReplayInvariantError);
      assert.match(error.message, /incompatible replay content/i);
      return true;
    },
  );

  // Tampering with replay gameSetup contentHash is also rejected before simulation starts
  const tamperedReplay = {
    ...replay,
    gameSetup: {
      ...replay.gameSetup,
      contentHash: "tampered-hash-value-1234",
    },
  };
  assert.throws(
    () => runReplay(tamperedReplay),
    (error) => {
      assert.ok(error instanceof ReplayInvariantError);
      assert.match(error.message, /incompatible replay content/i);
      return true;
    },
  );
});
