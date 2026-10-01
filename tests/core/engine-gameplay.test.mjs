import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceStep,
  createGameEngine,
  enqueueCommand,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function setup() {
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
        kind: index % 2 === 0 ? "spell" : "trap",
      })),
      extraDeck: [],
    },
  }));
  const definitions = players.flatMap((player) =>
    player.decks.monsterDeck.map((card) => ({
      definitionId: card.definitionId,
      name: card.name,
      level: 4,
      type: "normal",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 2,
      printedSpd: 4,
      printedAtk: 3,
      printedDef: 2,
    })),
  );
  return { players, definitions };
}

function mixedSetup() {
  const players = ["p1", "p2"].map((playerId) => ({
    playerId,
    initialMonsterCount: 7,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, index) => ({
        definitionId: `${playerId}:monster:${index}`,
        name: `${playerId} Monster ${index}`,
        kind: index < 8 ? "normal_monster" : "effect_monster",
      })),
      spellTrapDeck: Array.from({ length: 15 }, (_, index) => ({
        definitionId: `${playerId}:support:${index}`,
        name: `${playerId} Support ${index}`,
        kind: index % 2 === 0 ? "spell" : "trap",
      })),
      extraDeck: [],
    },
  }));
  const definitions = players.flatMap((player) =>
    player.decks.monsterDeck.map((card) => ({
      definitionId: card.definitionId,
      name: card.name,
      level: 4,
      type: card.kind === "normal_monster" ? "normal" : "effect",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 2,
      printedSpd: 4,
      printedAtk: 3,
      printedDef: 2,
    })),
  );
  return { players, definitions };
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

test("Normal Summon and movement resolve through the shared authoritative queue", () => {
  const input = setup();
  let engine = createGameEngine("gameplay-queue", input.players, bases, input.definitions);
  engine = enterActionPhase(engine);
  const card = engine.state.cardSetup.players[0].hand[0];

  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: card.instanceId,
    unitId: "p1:unit:0",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  let result = advanceStep(engine);
  engine = result.engine;

  assert.equal(result.events[0].type, "command_accepted");
  assert.equal(engine.state.cardSetup.players[0].hand.length, 6);
  assert.deepEqual(engine.state.spatial.units[0].position, { x: 1, y: 8 });
  assert.equal(engine.state.monsters[0].cardInstanceId, card.instanceId);

  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:unit:0",
    path: [{ x: 2, y: 8 }, { x: 3, y: 8 }],
  });
  result = advanceStep(engine);

  assert.equal(result.events[0].type, "command_accepted");
  assert.deepEqual(result.engine.state.spatial.units[0].position, { x: 3, y: 8 });
  assert.deepEqual(result.engine.state.monsters[0].position, { x: 3, y: 8 });
  assert.equal(result.engine.state.monsters[0].spd.current, 2);
});

test("changing battle position costs one Action and committed monsters stay paused", () => {
  const input = setup();
  const definitions = input.definitions.map((definition) => ({
    ...definition,
    printedVis: 40,
    printedSpd: 40,
  }));
  let engine = enterActionPhase(
    createGameEngine("position-change", input.players, bases, definitions),
  );
  const p1Card = engine.state.cardSetup.players[0].hand[0];
  const p2Card = engine.state.cardSetup.players[1].hand[0];
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: p1Card.instanceId, unitId: "p1:unit", anchorUnitId: null,
    destination: { x: 1, y: 8 }, battlePosition: "attack",
  });
  engine = queue(engine, "p2", "summon.normal", {
    cardInstanceId: p2Card.instanceId, unitId: "p2:unit", anchorUnitId: null,
    destination: { x: 29, y: 8 }, battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  const actionsBefore = engine.state.turn.players[0].remaining.actions;
  engine = queue(engine, "p1", "monster.change_battle_position", { unitId: "p1:unit" });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.monsters.find((monster) => monster.unitId === "p1:unit").battlePosition, "defense");
  assert.equal(engine.state.turn.players[0].remaining.actions, actionsBefore - 1);
  engine = queue(engine, "p1", "monster.change_battle_position", { unitId: "p1:unit" });
  engine = advanceStep(engine).engine;

  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:unit",
    path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = queue(engine, "p2", "monster.move_basic", {
    unitId: "p2:unit",
    path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "battle.declare_basic_attack", {
    attackerUnitId: "p1:unit", defenderUnitId: "p2:unit",
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:unit", path: [{ x: 15, y: 7 }],
  });
  const blocked = advanceStep(engine);

  assert.equal(blocked.events[0].type, "command_rejected");
  assert.match(blocked.events[0].reason, /committed to an open Chain/);
});

test("gameplay commands reject the wrong phase and preserve authoritative state", () => {
  const input = setup();
  const initial = createGameEngine("gameplay-reject", input.players, bases, input.definitions);
  const card = initial.state.cardSetup.players[0].hand[0];
  const queued = queue(initial, "p1", "summon.normal", {
    cardInstanceId: card.instanceId,
    unitId: "p1:unit:0",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  const result = advanceStep(queued);

  assert.equal(result.events[0].type, "command_rejected");
  assert.match(result.events[0].reason, /action phase/);
  assert.deepEqual(result.engine.state.monsters, []);
  assert.equal(result.engine.state.cardSetup.players[0].hand.length, 7);
});

test("Tribute Summon resolves through the engine without spending a universal Action", () => {
  const input = mixedSetup();
  let engine = createGameEngine("tribute-queue", input.players, bases, input.definitions);
  engine = enterActionPhase(engine);
  const initialHand = engine.state.cardSetup.players[0].hand;
  const normalCard = initialHand.find((card) => card.kind === "normal_monster");
  const effectCard = initialHand.find((card) => card.kind === "effect_monster");
  assert.notEqual(normalCard, undefined);
  assert.notEqual(effectCard, undefined);

  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: normalCard.instanceId,
    unitId: "p1:tribute:0",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  const resourcesBeforeTribute = engine.state.turn.players[0].remaining;

  engine = queue(engine, "p1", "summon.tribute", {
    cardInstanceId: effectCard.instanceId,
    unitId: "p1:effect:0",
    tributeUnitIds: ["p1:tribute:0"],
    destination: { x: 1, y: 8 },
    battlePosition: "defense",
  });
  const result = advanceStep(engine);

  assert.equal(result.events[0].type, "command_accepted");
  assert.equal(result.engine.state.monsters.length, 1);
  assert.equal(result.engine.state.monsters[0].unitId, "p1:effect:0");
  assert.equal(result.engine.state.monsters[0].cardInstanceId, effectCard.instanceId);
  assert.equal(
    result.engine.state.cardSetup.players[0].graveyard.some(
      (card) => card.instanceId === normalCard.instanceId,
    ),
    true,
  );
  assert.deepEqual(result.engine.state.turn.players[0].remaining, resourcesBeforeTribute);
});

test("a Basic Attack against an enemy opens a Chain and waits without applying damage", () => {
  const input = setup();
  const definitions = input.definitions.map((definition) => ({
    ...definition,
    printedVis: 40,
    printedSpd: 40,
  }));
  let engine = createGameEngine("attack-chain", input.players, bases, definitions);
  engine = enterActionPhase(engine);
  const p1Card = engine.state.cardSetup.players[0].hand[0];
  const p2Card = engine.state.cardSetup.players[1].hand[0];
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: p1Card.instanceId, unitId: "p1:attacker", anchorUnitId: null,
    destination: { x: 1, y: 8 }, battlePosition: "attack",
  });
  engine = queue(engine, "p2", "summon.normal", {
    cardInstanceId: p2Card.instanceId, unitId: "p2:defender", anchorUnitId: null,
    destination: { x: 29, y: 8 }, battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:attacker",
    path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = queue(engine, "p2", "monster.move_basic", {
    unitId: "p2:defender",
    path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
  });
  engine = advanceStep(engine).engine;
  const defenderHp = engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current;
  engine = queue(engine, "p1", "battle.declare_basic_attack", {
    attackerUnitId: "p1:attacker",
    defenderUnitId: "p2:defender",
  });
  const result = advanceStep(engine);

  assert.equal(result.events[0].type, "command_accepted");
  assert.equal(result.engine.state.chainSystem.pendingChains.length, 1);
  assert.equal(result.engine.state.pendingBasicAttacks.length, 1);
  assert.equal(
    result.engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current,
    defenderHp,
  );
  assert.equal(result.engine.state.turn.players[0].remaining.actions, 3);

  const chainId = result.engine.state.chainSystem.pendingChains[0].chainId;
  assert.equal(result.engine.state.chainWindows[0].priorityPlayerId, "p2");

  engine = queue(result.engine, "system", "chain.resolve_next", {});
  const premature = advanceStep(engine);
  assert.equal(premature.events[0].type, "command_rejected");
  assert.match(premature.events[0].reason, /open response window/);

  engine = queue(premature.engine, "p2", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.chainWindows[0].priorityPlayerId, "p1");
  engine = queue(engine, "p1", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.chainWindows[0].stage, "closed");

  engine = queue(engine, "system", "chain.resolve_next", {});
  const resolved = advanceStep(engine);
  assert.equal(resolved.events[0].type, "command_accepted");
  assert.equal(resolved.engine.state.chainSystem.pendingChains.length, 0);
  assert.equal(resolved.engine.state.chainWindows.length, 0);
  assert.equal(resolved.engine.state.pendingBasicAttacks.length, 0);
  assert.equal(
    resolved.engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current,
    defenderHp - 4,
  );
});

test("the defender can confirm an eligible counterattack before the Chain closes", () => {
  const input = setup();
  const definitions = input.definitions.map((definition) => ({
    ...definition,
    printedVis: 40,
    printedSpd: 40,
  }));
  let engine = enterActionPhase(
    createGameEngine("counterattack-chain", input.players, bases, definitions),
  );
  const p1Card = engine.state.cardSetup.players[0].hand[0];
  const p2Card = engine.state.cardSetup.players[1].hand[0];
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: p1Card.instanceId, unitId: "p1:attacker", anchorUnitId: null,
    destination: { x: 1, y: 8 }, battlePosition: "attack",
  });
  engine = queue(engine, "p2", "summon.normal", {
    cardInstanceId: p2Card.instanceId, unitId: "p2:defender", anchorUnitId: null,
    destination: { x: 29, y: 8 }, battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:attacker",
    path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = queue(engine, "p2", "monster.move_basic", {
    unitId: "p2:defender",
    path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
  });
  engine = advanceStep(engine).engine;
  const attackerHp = engine.state.monsters.find((monster) => monster.unitId === "p1:attacker").hp.current;
  const defenderHp = engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current;
  engine = queue(engine, "p1", "battle.declare_basic_attack", {
    attackerUnitId: "p1:attacker",
    defenderUnitId: "p2:defender",
  });
  engine = advanceStep(engine).engine;
  const chainId = engine.state.chainSystem.pendingChains[0].chainId;
  const elementId = engine.state.pendingBasicAttacks[0].elementId;

  engine = queue(engine, "p2", "battle.choose_counterattack", { elementId });
  const chosen = advanceStep(engine);
  assert.equal(chosen.events[0].type, "command_accepted");
  assert.equal(chosen.engine.state.pendingBasicAttacks[0].defenderChoosesCounterattack, true);
  assert.equal(chosen.engine.state.chainWindows[0].priorityPlayerId, "p1");
  assert.equal(chosen.engine.state.turn.players[1].remaining.reactions, 4);

  engine = queue(chosen.engine, "p1", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.chainWindows[0].stage, "closed");
  engine = queue(engine, "system", "chain.resolve_next", {});
  const resolved = advanceStep(engine);

  assert.equal(resolved.events[0].type, "command_accepted");
  assert.equal(
    resolved.engine.state.monsters.find((monster) => monster.unitId === "p1:attacker").hp.current,
    attackerHp - 4,
  );
  assert.equal(
    resolved.engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current,
    defenderHp - 4,
  );
});

test("an eligible defender who chooses NOT to counterattack passes priority and takes damage while attacker takes zero", () => {
  const input = setup();
  const definitions = input.definitions.map((definition) => ({
    ...definition,
    printedVis: 40,
    printedSpd: 40,
  }));
  let engine = enterActionPhase(
    createGameEngine("no-counterattack-chain", input.players, bases, definitions),
  );
  const p1Card = engine.state.cardSetup.players[0].hand[0];
  const p2Card = engine.state.cardSetup.players[1].hand[0];
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: p1Card.instanceId, unitId: "p1:attacker", anchorUnitId: null,
    destination: { x: 1, y: 8 }, battlePosition: "attack",
  });
  engine = queue(engine, "p2", "summon.normal", {
    cardInstanceId: p2Card.instanceId, unitId: "p2:defender", anchorUnitId: null,
    destination: { x: 29, y: 8 }, battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:attacker",
    path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = queue(engine, "p2", "monster.move_basic", {
    unitId: "p2:defender",
    path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
  });
  engine = advanceStep(engine).engine;
  const attackerHp = engine.state.monsters.find((monster) => monster.unitId === "p1:attacker").hp.current;
  const defenderHp = engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current;

  engine = queue(engine, "p1", "battle.declare_basic_attack", {
    attackerUnitId: "p1:attacker",
    defenderUnitId: "p2:defender",
  });
  engine = advanceStep(engine).engine;
  const chainId = engine.state.chainSystem.pendingChains[0].chainId;

  assert.equal(engine.state.chainWindows[0].priorityPlayerId, "p2");
  assert.equal(engine.state.pendingBasicAttacks[0].defenderChoosesCounterattack, false);
  engine = queue(engine, "p2", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;

  assert.equal(engine.state.chainWindows[0].priorityPlayerId, "p1");
  engine = queue(engine, "p1", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  assert.equal(engine.state.chainWindows[0].stage, "closed");

  engine = queue(engine, "system", "chain.resolve_next", {});
  const resolved = advanceStep(engine);

  assert.equal(resolved.events[0].type, "command_accepted");
  assert.equal(
    resolved.engine.state.monsters.find((monster) => monster.unitId === "p2:defender").hp.current,
    defenderHp - 4,
  );
  assert.equal(
    resolved.engine.state.monsters.find((monster) => monster.unitId === "p1:attacker").hp.current,
    attackerHp,
  );
});

test("a resolved base attack records an impact and repositions through seeded authority", () => {
  const input = setup();
  const definitions = input.definitions.map((definition) => ({
    ...definition,
    printedVis: 40,
    printedSpd: 40,
  }));
  let engine = enterActionPhase(
    createGameEngine("base-attack-engine", input.players, bases, definitions),
  );
  const card = engine.state.cardSetup.players[0].hand[0];
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: card.instanceId,
    unitId: "p1:base-attacker",
    anchorUnitId: null,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:base-attacker",
    path: Array.from({ length: 28 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "system", "match.resolve_simultaneous_base_attacks", {
    resolutions: Array.from({ length: 4 }, () => ({
      attackerPlayerId: "p1",
      defenderPlayerId: "p2",
      attackType: "basic",
      attackerPosition: "attack",
      anyPartResolved: true,
      hitBaseValidly: true,
    })),
  });
  engine = advanceStep(engine).engine;
  const auditLength = engine.state.randomAudit.length;
  engine = queue(engine, "p1", "battle.declare_base_attack", {
    attackerUnitId: "p1:base-attacker",
    defenderPlayerId: "p2",
  });
  engine = advanceStep(engine).engine;
  const chainId = engine.state.chainWindows[0].chainId;
  assert.equal(engine.state.pendingBaseAttacks.length, 1);
  assert.equal(engine.state.match.players[1].baseImpactsReceived, 4);

  engine = queue(engine, "p2", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "system", "chain.resolve_next", {});
  const resolved = advanceStep(engine);
  const attacker = resolved.engine.state.monsters.find(
    (monster) => monster.unitId === "p1:base-attacker",
  );

  assert.equal(resolved.events[0].type, "command_accepted");
  assert.equal(resolved.engine.state.match.players[1].baseImpactsReceived, 5);
  assert.equal(resolved.engine.state.match.status, "finished");
  assert.equal(resolved.engine.state.match.winnerPlayerId, "p1");
  assert.equal(resolved.engine.state.pendingBaseAttacks.length, 0);
  assert.equal(resolved.engine.state.randomAudit.length, auditLength + 1);
  assert.equal(resolved.engine.state.randomAudit.at(-1).streamId.startsWith("base-reposition:"), true);
  assert.ok(attacker.position.x <= 10);
  assert.deepEqual(
    resolved.engine.state.spatial.units.find((unit) => unit.unitId === attacker.unitId).position,
    attacker.position,
  );
});

test("defensive Reaction movement resolves first and can make the attack fail", () => {
  const input = setup();
  const definitions = input.definitions.map((definition) => ({
    ...definition,
    printedVis: 40,
    printedSpd: 40,
  }));
  let engine = enterActionPhase(
    createGameEngine("reaction-move", input.players, bases, definitions),
  );
  const p1Card = engine.state.cardSetup.players[0].hand[0];
  const p2Card = engine.state.cardSetup.players[1].hand[0];
  engine = queue(engine, "p1", "summon.normal", {
    cardInstanceId: p1Card.instanceId, unitId: "p1:attacker", anchorUnitId: null,
    destination: { x: 1, y: 8 }, battlePosition: "attack",
  });
  engine = queue(engine, "p2", "summon.normal", {
    cardInstanceId: p2Card.instanceId, unitId: "p2:defender", anchorUnitId: null,
    destination: { x: 29, y: 8 }, battlePosition: "attack",
  });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "monster.move_basic", {
    unitId: "p1:attacker",
    path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
  });
  engine = queue(engine, "p2", "monster.move_basic", {
    unitId: "p2:defender",
    path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
  });
  engine = advanceStep(engine).engine;
  const attackerHp = engine.state.monsters.find((monster) => monster.unitId === "p1:attacker").hp.current;
  const defenderBefore = engine.state.monsters.find((monster) => monster.unitId === "p2:defender");
  engine = queue(engine, "p1", "battle.declare_basic_attack", {
    attackerUnitId: "p1:attacker", defenderUnitId: "p2:defender",
  });
  engine = advanceStep(engine).engine;
  const chainId = engine.state.chainWindows[0].chainId;
  const reactionsBefore = engine.state.turn.players[1].remaining.reactions;

  engine = queue(engine, "p2", "chain.react_move", {
    chainId, unitId: "p2:defender", path: [{ x: 16, y: 7 }],
  });
  const reacted = advanceStep(engine);
  assert.equal(reacted.events[0].type, "command_accepted");
  assert.equal(reacted.engine.state.pendingReactionMovements.length, 1);
  assert.equal(reacted.engine.state.turn.players[1].remaining.reactions, reactionsBefore - 1);
  assert.deepEqual(
    reacted.engine.state.monsters.find((monster) => monster.unitId === "p2:defender").position,
    { x: 16, y: 8 },
  );

  engine = queue(reacted.engine, "p1", "chain.pass_priority", { chainId });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "system", "chain.resolve_next", {});
  const resolved = advanceStep(engine);
  const attacker = resolved.engine.state.monsters.find((monster) => monster.unitId === "p1:attacker");
  const defender = resolved.engine.state.monsters.find((monster) => monster.unitId === "p2:defender");

  assert.equal(resolved.events[0].type, "command_accepted");
  assert.deepEqual(defender.position, { x: 16, y: 7 });
  assert.equal(defender.spd.current, defenderBefore.spd.current - 1);
  assert.equal(defender.hp.current, defenderBefore.hp.current);
  assert.equal(attacker.hp.current, attackerHp);
  assert.equal(resolved.engine.state.pendingReactionMovements.length, 0);
  assert.equal(resolved.engine.state.pendingBasicAttacks.length, 0);
});
