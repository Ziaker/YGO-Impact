import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameEngine,
  createMonsterState,
  createSpatialState,
  enqueueCommand,
  advanceStep,
  applyEquipModifiers,
  removeEquipModifiers,
  MAX_EQUIPMENT_PER_MONSTER,
  CURATED_SPELL_TRAP_DEFINITIONS,
  resolvePlannedBasicAttack,
  settleDestroyedCards,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function createDummyMonsterDefs() {
  return Array.from({ length: 20 }, (_, i) => ({
    definitionId: `def:mon_${i}`,
    name: `Monster ${i}`,
    level: 4,
    type: "normal",
    elements: ["light"],
    races: ["Warrior"],
    printedVis: 3,
    printedSpd: 3,
    printedAtk: 4,
    printedDef: 4,
  }));
}

const swordEquip = {
  definitionId: "spell:sword",
  name: "Sword of Legend",
  kind: "spell",
  subtype: "equip",
  description: "Equip: +2 ATK",
  actionCost: 1,
  effectKind: "stat_buff",
  statModifiers: { atk: 2 },
};

const destroySpell = {
  definitionId: "spell:lightning",
  name: "Lightning Strike",
  kind: "spell",
  subtype: "normal",
  description: "Target enemy monster and destroy it.",
  actionCost: 1,
  targetsEnemy: true,
  effectKind: "destroy_monster",
};

const quickSpell = {
  definitionId: "spell:quick_booster",
  name: "Quick Booster",
  kind: "spell",
  subtype: "action",
  description: "0 pool cost action spell.",
  actionCost: 0,
  effectKind: "stat_buff",
  statModifiers: { atk: 1 },
};

const counterTrapDef = {
  definitionId: "trap:negate",
  name: "Magic Jammer",
  kind: "trap",
  subtype: "counter",
  description: "Negate an open Chain element.",
  reactionCost: 1,
  effectKind: "negate_chain_element",
};

const dummySpellDefs = Array.from({ length: 15 }, (_, i) => ({
  definitionId: `def:st_${i}`,
  name: `SpellTrap ${i}`,
  kind: i % 2 === 0 ? "spell" : "trap",
  subtype: "normal",
  description: `Dummy spell/trap ${i}`,
  actionCost: 1,
  reactionCost: 1,
  effectKind: "stat_buff",
}));

const allSpellTrapDefs = [
  swordEquip,
  destroySpell,
  quickSpell,
  counterTrapDef,
  ...dummySpellDefs,
  ...CURATED_SPELL_TRAP_DEFINITIONS,
];

function setupEngineWithCards(p1Cards, p2Cards) {
  const p1Setup = {
    playerId: "p1",
    initialMonsterCount: 3,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, i) => ({
        definitionId: `def:mon_${i}`,
        name: `Monster ${i}`,
        kind: "normal_monster",
      })),
      spellTrapDeck: Array.from({ length: 15 }, (_, i) => ({
        definitionId: `def:st_${i}`,
        name: `SpellTrap ${i}`,
        kind: i % 2 === 0 ? "spell" : "trap",
      })),
      extraDeck: [],
    },
  };
  const p2Setup = {
    playerId: "p2",
    initialMonsterCount: 3,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, i) => ({
        definitionId: `def:mon_${i}`,
        name: `Monster ${i}`,
        kind: "normal_monster",
      })),
      spellTrapDeck: Array.from({ length: 15 }, (_, i) => ({
        definitionId: `def:st_${i}`,
        name: `SpellTrap ${i}`,
        kind: i % 2 === 0 ? "spell" : "trap",
      })),
      extraDeck: [],
    },
  };

  const definitions = createDummyMonsterDefs();
  let engine = createGameEngine("test-seed-1", [p1Setup, p2Setup], bases, definitions, [], [], allSpellTrapDefs);

  // Advance through decision phase to action phase
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "turn.allocate_resources",
    payload: { actions: 5, reactions: 3 },
  });
  engine = enqueueCommand(engine, {
    issuer: "p2",
    kind: "turn.allocate_resources",
    payload: { actions: 4, reactions: 4 },
  });
  engine = advanceStep(engine).engine;

  // Set designated test hands
  engine = {
    ...engine,
    state: {
      ...engine.state,
      cardSetup: {
        ...engine.state.cardSetup,
        players: engine.state.cardSetup.players.map((p) => {
          if (p.playerId === "p1") {
            return { ...p, hand: p1Cards };
          }
          if (p.playerId === "p2") {
            return { ...p, hand: p2Cards };
          }
          return p;
        }),
      },
    },
  };

  return engine;
}

test("Trap slot setting: costs 0 resources, preserves hidden slot, rejects invalid slots", () => {
  const trapCard = {
    instanceId: "p1:trap_test",
    definitionId: "trap:negate",
    name: "Magic Jammer",
    kind: "trap",
  };
  let engine = setupEngineWithCards([trapCard], []);

  const p1RemainingBefore = engine.state.turn.players.find((p) => p.playerId === "p1").remaining;
  assert.equal(p1RemainingBefore.actions, 5);
  assert.equal(p1RemainingBefore.reactions, 3);

  // Set trap into slot 0
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "trap.set",
    payload: {
      cardInstanceId: trapCard.instanceId,
      slotIndex: 0,
    },
  });
  const stepRes = advanceStep(engine);
  engine = stepRes.engine;
  assert.equal(stepRes.events.some((e) => e.type === "command_accepted"), true);

  // Cost: 0 resources spent
  const p1RemainingAfter = engine.state.turn.players.find((p) => p.playerId === "p1").remaining;
  assert.equal(p1RemainingAfter.actions, 5);
  assert.equal(p1RemainingAfter.reactions, 3);

  // Hand no longer has card
  const p1Cards = engine.state.cardSetup.players.find((p) => p.playerId === "p1");
  assert.equal(p1Cards.hand.some((c) => c.instanceId === trapCard.instanceId), false);

  // Slot 0 is occupied
  const p1Traps = engine.state.trapSlots.find((p) => p.playerId === "p1");
  assert.ok(p1Traps);
  assert.equal(p1Traps.slots[0].card.instanceId, trapCard.instanceId);
  assert.equal(p1Traps.slots[0].revealed, false);
  assert.equal(p1Traps.slots[1].card, null);
  assert.equal(p1Traps.slots[2].card, null);

  // No chain opened
  assert.equal(engine.state.chainSystem.pendingChains.length, 0);

  // Trying to set into already occupied slot 0 is rejected
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "trap.set",
    payload: {
      cardInstanceId: "nonexistent",
      slotIndex: 0,
    },
  });
  const rejectRes = advanceStep(engine);
  assert.equal(rejectRes.events.some((e) => e.type === "command_rejected"), true);
});

test("Equip Spell: equips for 1 Action, applies stat modifiers, enforces max 3 limit", () => {
  const equip1 = { instanceId: "p1:sword1", definitionId: "spell:sword", name: "Sword of Legend", kind: "spell" };
  const equip2 = { instanceId: "p1:sword2", definitionId: "spell:sword", name: "Sword of Legend", kind: "spell" };
  const equip3 = { instanceId: "p1:sword3", definitionId: "spell:sword", name: "Sword of Legend", kind: "spell" };
  const equip4 = { instanceId: "p1:sword4", definitionId: "spell:sword", name: "Sword of Legend", kind: "spell" };

  let engine = setupEngineWithCards([equip1, equip2, equip3, equip4], []);

  // Place a monster for P1 on map
  const def0 = createDummyMonsterDefs()[0];
  const monster1 = createMonsterState(def0, "p1:unit1", "p1:m_card1", "p1", { x: 1, y: 8 }, "attack");
  const baseAtk = monster1.atk; // 4 + Warrior bonus (1) = 5
  engine = {
    ...engine,
    state: {
      ...engine.state,
      monsters: [monster1],
      spatial: createSpatialState(bases, [{ unitId: monster1.unitId, playerId: "p1", position: monster1.position }]),
    },
  };

  // Equip 1st sword
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.equip",
    payload: { cardInstanceId: equip1.instanceId, targetUnitId: monster1.unitId },
  });
  engine = advanceStep(engine).engine;

  let updatedMonster = engine.state.monsters.find((m) => m.unitId === monster1.unitId);
  assert.equal(updatedMonster.equippedCards.length, 1);
  assert.equal(updatedMonster.atk, baseAtk + 2);

  const p1Remaining = engine.state.turn.players.find((p) => p.playerId === "p1").remaining;
  assert.equal(p1Remaining.actions, 4); // 5 - 1 = 4

  // Equip 2nd and 3rd sword
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.equip",
    payload: { cardInstanceId: equip2.instanceId, targetUnitId: monster1.unitId },
  });
  engine = advanceStep(engine).engine;
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.equip",
    payload: { cardInstanceId: equip3.instanceId, targetUnitId: monster1.unitId },
  });
  engine = advanceStep(engine).engine;

  updatedMonster = engine.state.monsters.find((m) => m.unitId === monster1.unitId);
  assert.equal(updatedMonster.equippedCards.length, 3);
  assert.equal(updatedMonster.atk, baseAtk + 6);

  // 4th equip is rejected (max 3 limit)
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.equip",
    payload: { cardInstanceId: equip4.instanceId, targetUnitId: monster1.unitId },
  });
  const rejectRes = advanceStep(engine);
  assert.equal(rejectRes.events.some((e) => e.type === "command_rejected"), true);
});

test("Equip Spell transfer: costs 1 Action, shifts modifiers seamlessly", () => {
  const equip1 = { instanceId: "p1:sword1", definitionId: "spell:sword", name: "Sword of Legend", kind: "spell" };
  let engine = setupEngineWithCards([equip1], []);

  const defs = createDummyMonsterDefs();
  const m1 = createMonsterState(defs[0], "p1:m1", "p1:c1", "p1", { x: 1, y: 8 }, "attack");
  const m2 = createMonsterState(defs[1], "p1:m2", "p1:c2", "p1", { x: 1, y: 9 }, "attack");
  const m1BaseAtk = m1.atk;
  const m2BaseAtk = m2.atk;

  engine = {
    ...engine,
    state: {
      ...engine.state,
      monsters: [m1, m2],
      spatial: createSpatialState(bases, [
        { unitId: m1.unitId, playerId: "p1", position: m1.position },
        { unitId: m2.unitId, playerId: "p1", position: m2.position },
      ]),
    },
  };

  // Equip sword to m1
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.equip",
    payload: { cardInstanceId: equip1.instanceId, targetUnitId: m1.unitId },
  });
  engine = advanceStep(engine).engine;

  let mon1 = engine.state.monsters.find((m) => m.unitId === m1.unitId);
  assert.equal(mon1.atk, m1BaseAtk + 2);

  // Transfer equip from m1 to m2
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.transfer_equip",
    payload: {
      cardInstanceId: equip1.instanceId,
      sourceUnitId: m1.unitId,
      targetUnitId: m2.unitId,
    },
  });
  const transferRes = advanceStep(engine);
  engine = transferRes.engine;
  assert.equal(transferRes.events.some((e) => e.type === "command_accepted"), true);

  mon1 = engine.state.monsters.find((m) => m.unitId === m1.unitId);
  const mon2 = engine.state.monsters.find((m) => m.unitId === m2.unitId);

  assert.equal(mon1.equippedCards.length, 0);
  assert.equal(mon1.atk, m1BaseAtk);
  assert.equal(mon2.equippedCards.length, 1);
  assert.equal(mon2.atk, m2BaseAtk + 2);

  // Actions spent: 1 for equip + 1 for transfer = 2
  const p1Remaining = engine.state.turn.players.find((p) => p.playerId === "p1").remaining;
  assert.equal(p1Remaining.actions, 3);
});

test("Battle destruction of equipped monster atomically sends equips to Graveyard (GDD P724, P866)", () => {
  const equipCard = {
    instanceId: "p1:sword1",
    definitionId: "spell:sword",
    name: "Sword of Legend",
    kind: "spell",
  };
  const defs = createDummyMonsterDefs();
  const attacker = createMonsterState(defs[0], "p2:att", "p2:c_att", "p2", { x: 5, y: 5 }, "attack");
  const defender = createMonsterState(defs[1], "p1:def", "p1:c_def", "p1", { x: 5, y: 6 }, "defense");
  const equippedDefender = {
    ...defender,
    equippedCards: [equipCard],
    hp: { ...defender.hp, current: 1 }, // 1 HP
  };
  // Strong attacker (ATK 20) destroys 1 HP defender
  const strongAttacker = {
    ...attacker,
    atk: 20,
  };

  const spatial = createSpatialState(bases, [
    { unitId: attacker.unitId, playerId: "p2", position: attacker.position },
    { unitId: defender.unitId, playerId: "p1", position: defender.position },
  ]);

  const resolution = resolvePlannedBasicAttack(
    [strongAttacker, equippedDefender],
    spatial,
    {
      planId: "plan-1",
      attackerUnitId: attacker.unitId,
      defenderUnitId: defender.unitId,
      mode: "defense",
      counterattackAvailable: false,
    },
  );

  assert.ok(resolution.destroyedUnitIds.includes(defender.unitId));
  assert.equal(resolution.destroyedCards.length, 2);
  assert.ok(resolution.destroyedCards.some((c) => c.instanceId === defender.cardInstanceId));
  assert.ok(resolution.destroyedCards.some((c) => c.instanceId === equipCard.instanceId));

  const cardStateP1 = {
    playerId: "p1",
    monsterDeck: [],
    spellTrapDeck: [],
    extraDeck: [],
    hand: [],
    graveyard: [],
    randomAudit: [],
  };
  const cardStateP2 = {
    playerId: "p2",
    monsterDeck: [],
    spellTrapDeck: [],
    extraDeck: [],
    hand: [],
    graveyard: [],
    randomAudit: [],
  };

  const settledCards = settleDestroyedCards([cardStateP1, cardStateP2], resolution);
  const p1Grave = settledCards.find((p) => p.playerId === "p1").graveyard;
  assert.equal(p1Grave.length, 2);
  assert.ok(p1Grave.some((c) => c.instanceId === defender.cardInstanceId));
  assert.ok(p1Grave.some((c) => c.instanceId === equipCard.instanceId));
});

test("Preventive trap destruction: destroys hidden enemy trap without activating", () => {
  const trapCard = {
    instanceId: "p2:trap_secret",
    definitionId: "trap:negate",
    name: "Magic Jammer",
    kind: "trap",
  };
  let engine = setupEngineWithCards([], [trapCard]);

  // P2 sets trap in slot 2
  engine = enqueueCommand(engine, {
    issuer: "p2",
    kind: "trap.set",
    payload: { cardInstanceId: trapCard.instanceId, slotIndex: 2 },
  });
  engine = advanceStep(engine).engine;

  const p2TrapsBefore = engine.state.trapSlots.find((p) => p.playerId === "p2");
  assert.ok(p2TrapsBefore.slots[2].card);

  // P1 uses preventive destruction on P2's slot 2
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "trap.destroy_preventive",
    payload: { targetPlayerId: "p2", slotIndex: 2 },
  });
  const stepRes = advanceStep(engine);
  engine = stepRes.engine;
  assert.equal(stepRes.events.some((e) => e.type === "command_accepted"), true);

  const p2TrapsAfter = engine.state.trapSlots.find((p) => p.playerId === "p2");
  assert.equal(p2TrapsAfter.slots[2].card, null);

  const p2Grave = engine.state.cardSetup.players.find((p) => p.playerId === "p2").graveyard;
  assert.ok(p2Grave.some((c) => c.instanceId === trapCard.instanceId));

  // No chain opened
  assert.equal(engine.state.chainSystem.pendingChains.length, 0);
});

test("Offensive Normal Spell opens Chain, and Counter Trap negates it before resolution", () => {
  const spellCard = {
    instanceId: "p1:lightning1",
    definitionId: "spell:lightning",
    name: "Lightning Strike",
    kind: "spell",
  };
  const counterTrapCard = {
    instanceId: "p2:jammer1",
    definitionId: "trap:negate",
    name: "Magic Jammer",
    kind: "trap",
  };
  let engine = setupEngineWithCards([spellCard], [counterTrapCard]);

  const defs = createDummyMonsterDefs();
  const p2Monster = createMonsterState(defs[2], "p2:beast", "p2:c_beast", "p2", { x: 29, y: 8 }, "attack");
  engine = {
    ...engine,
    state: {
      ...engine.state,
      monsters: [p2Monster],
      spatial: createSpatialState(bases, [
        { unitId: p2Monster.unitId, playerId: "p2", position: p2Monster.position },
      ]),
    },
  };

  // P2 sets counter trap in slot 0
  engine = enqueueCommand(engine, {
    issuer: "p2",
    kind: "trap.set",
    payload: { cardInstanceId: counterTrapCard.instanceId, slotIndex: 0 },
  });
  engine = advanceStep(engine).engine;

  // P1 activates Lightning Strike targeting p2:beast
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.activate",
    payload: {
      cardInstanceId: spellCard.instanceId,
      targetUnitIds: [p2Monster.unitId],
    },
  });
  let stepRes = advanceStep(engine);
  engine = stepRes.engine;
  assert.equal(stepRes.events.some((e) => e.type === "command_accepted"), true);

  // Chain is opened!
  assert.equal(engine.state.chainSystem.pendingChains.length, 1);
  const openChain = engine.state.chainSystem.pendingChains[0];
  assert.equal(openChain.elements.length, 1);
  const spellElement = openChain.elements[0];
  assert.equal(spellElement.kind, "action");
  assert.equal(spellElement.negated, false);

  // Card moved to resolution zone
  assert.equal(engine.state.resolutionZone.length, 1);
  assert.equal(engine.state.resolutionZone[0].card.instanceId, spellCard.instanceId);

  // Priority window: P2 has priority now
  assert.equal(engine.state.chainWindows.length, 1);
  assert.equal(engine.state.chainWindows[0].priorityPlayerId, "p2");

  // P2 responds with Counter Trap from slot 0, targeting spellElement.elementId
  engine = enqueueCommand(engine, {
    issuer: "p2",
    kind: "trap.activate",
    payload: {
      slotIndex: 0,
      chainId: openChain.chainId,
      targetElementId: spellElement.elementId,
    },
  });
  stepRes = advanceStep(engine);
  engine = stepRes.engine;
  assert.equal(stepRes.events.some((e) => e.type === "command_accepted"), true);

  // Reaction cost confirmed
  const p2Remaining = engine.state.turn.players.find((p) => p.playerId === "p2").remaining;
  assert.equal(p2Remaining.reactions, 3); // 4 - 1 = 3

  // Chain now has 2 elements, and spell is marked negated!
  const chainAfterTrap = engine.state.chainSystem.pendingChains[0];
  assert.equal(chainAfterTrap.elements.length, 2);
  assert.equal(chainAfterTrap.elements[0].negated, true);
  assert.equal(chainAfterTrap.elements[1].kind, "reaction");

  // Resolution zone has both cards
  assert.equal(engine.state.resolutionZone.length, 2);

  // Both pass priority to resolve chain
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "chain.pass_priority",
    payload: { chainId: openChain.chainId },
  });
  engine = advanceStep(engine).engine;

  engine = enqueueCommand(engine, {
    issuer: "p2",
    kind: "chain.pass_priority",
    payload: { chainId: openChain.chainId },
  });
  engine = advanceStep(engine).engine;

  // Resolve the chain elements
  engine = enqueueCommand(engine, {
    issuer: "system",
    kind: "chain.resolve_next",
    payload: { chainId: openChain.chainId },
  });
  stepRes = advanceStep(engine);
  engine = stepRes.engine;

  // Target monster was NOT destroyed because spell was negated!
  const monsterAlive = engine.state.monsters.find((m) => m.unitId === p2Monster.unitId);
  assert.ok(monsterAlive);

  // Resolution zone cards moved to respective Graveyards
  assert.equal(engine.state.resolutionZone.length, 0);
  const p1Grave = engine.state.cardSetup.players.find((p) => p.playerId === "p1").graveyard;
  const p2Grave = engine.state.cardSetup.players.find((p) => p.playerId === "p2").graveyard;
  assert.ok(p1Grave.some((c) => c.instanceId === spellCard.instanceId));
  assert.ok(p2Grave.some((c) => c.instanceId === counterTrapCard.instanceId));
});

test("Quick-Play / Action Spell costs 0 from action pool", () => {
  const quickCard = {
    instanceId: "p1:quick1",
    definitionId: "spell:quick_booster",
    name: "Quick Booster",
    kind: "spell",
  };
  let engine = setupEngineWithCards([quickCard], []);

  const defs = createDummyMonsterDefs();
  const p1Monster = createMonsterState(defs[0], "p1:unit1", "p1:c1", "p1", { x: 1, y: 8 }, "attack");
  engine = {
    ...engine,
    state: {
      ...engine.state,
      monsters: [p1Monster],
      spatial: createSpatialState(bases, [
        { unitId: p1Monster.unitId, playerId: "p1", position: p1Monster.position },
      ]),
    },
  };

  const p1ActionsBefore = engine.state.turn.players.find((p) => p.playerId === "p1").remaining.actions;

  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "spell.activate",
    payload: {
      cardInstanceId: quickCard.instanceId,
      targetUnitIds: [p1Monster.unitId],
    },
  });
  engine = advanceStep(engine).engine;

  const p1ActionsAfter = engine.state.turn.players.find((p) => p.playerId === "p1").remaining.actions;
  assert.equal(p1ActionsAfter, p1ActionsBefore); // 0 pool cost
});
