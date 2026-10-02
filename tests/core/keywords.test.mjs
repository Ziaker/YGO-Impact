import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceStep,
  CANONICAL_KEYWORDS,
  calculateEffectiveAttackRange,
  calculateEffectiveAtk,
  calculatePsyblastReduction,
  calculateRepulseDestination,
  checkBerserkerTrigger,
  createBasicAttackPlan,
  createGameEngine,
  createMonsterState,
  createSpatialState,
  enqueueCommand,
  getKeywordParameter,
  hasKeyword,
  parseKeyword,
  parseMonsterKeywords,
  PROTOTYPE_NORMAL_MONSTERS,
  recoverMonsterAtSupport,
  resolvePlannedBasicAttack,
  KeywordInvariantError,
} from "../../src/core/index.ts";

test("keywords: all 21 canonical keywords are recognized", () => {
  assert.equal(CANONICAL_KEYWORDS.length, 21);
  for (const name of CANONICAL_KEYWORDS) {
    const parsed = parseKeyword(name);
    assert.equal(parsed.name, name);
    assert.equal(parsed.parameter, null);
  }
});

test("keywords: parses parameterized keywords and rejects invalid formats", () => {
  const parsedRegen = parseKeyword("REGEN 1");
  assert.equal(parsedRegen.name, "REGEN");
  assert.equal(parsedRegen.parameter, 1);

  const parsedSight = parseKeyword("SIGHT 2");
  assert.equal(parsedSight.name, "SIGHT");
  assert.equal(parsedSight.parameter, 2);

  assert.throws(() => parseKeyword(""), KeywordInvariantError);
  assert.throws(() => parseKeyword("UNKNOWN_KW"), /Unknown canonical keyword/);
  assert.throws(() => parseKeyword("REGEN -1"), /non-negative/);
  assert.throws(() => parseKeyword("REGEN 1 2"), /Invalid keyword format/);
});

test("keywords: hasKeyword and getKeywordParameter read monster state and definitions accurately", () => {
  const lusterDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Luster Dragon");
  assert.ok(lusterDef);
  assert.equal(hasKeyword(lusterDef, "BULWARK"), true);
  assert.equal(hasKeyword(lusterDef, "REGEN"), true);
  assert.equal(getKeywordParameter(lusterDef, "REGEN"), 1);
  assert.equal(hasKeyword(lusterDef, "GLIDER"), false);

  const chosenDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Chosen by the World Chalice");
  assert.ok(chosenDef);
  assert.equal(hasKeyword(chosenDef, "SIGHT"), true);
  assert.equal(getKeywordParameter(chosenDef, "SIGHT"), 2);
  assert.equal(hasKeyword(chosenDef, "PSYBLAST"), true);
  assert.equal(getKeywordParameter(chosenDef, "PSYBLAST"), 1);

  const chaserDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Mechanicalchaser");
  assert.ok(chaserDef);
  assert.equal(hasKeyword(chaserDef, "BULWARK"), false);
  assert.equal(getKeywordParameter(chaserDef, "REGEN"), null);
});

test("keywords: REGEN X recovers additional HP during Support Phase without exceeding maximum", () => {
  const lusterDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Luster Dragon");
  assert.ok(lusterDef);
  const luster = createMonsterState(
    lusterDef,
    "luster:1",
    "card:luster",
    "p1",
    { x: 5, y: 5 },
    "attack",
  );

  // Luster Dragon has 5 max HP. Reduce current to 2 HP.
  const damagedLuster = {
    ...luster,
    hp: { current: 2, maximum: 5 },
  };

  // Base support recovery is 1 HP + REGEN 1 = 2 HP recovered.
  const recovery = recoverMonsterAtSupport(damagedLuster);
  assert.equal(recovery.hpRecovered, 2);
  assert.equal(recovery.monster.hp.current, 4);

  // Clamping at maximum: at 4 HP, recovering 2 HP should clamp to 5 HP (1 recovered).
  const clamped = recoverMonsterAtSupport({ ...luster, hp: { current: 4, maximum: 5 } });
  assert.equal(clamped.hpRecovered, 1);
  assert.equal(clamped.monster.hp.current, 5);
});

test("keywords: BLAST X grants +X range on the first Basic Attack of the turn", () => {
  const clawDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Claw Reacher");
  assert.ok(clawDef);
  const claw = createMonsterState(
    clawDef,
    "claw:1",
    "card:claw",
    "p1",
    { x: 5, y: 5 },
    "attack",
  );

  // Claw Reacher has base range 1 and BLAST 1.
  assert.equal(calculateEffectiveAttackRange(claw, 0), 2);
  // Subsequent attack in same turn loses the BLAST bonus.
  assert.equal(calculateEffectiveAttackRange(claw, 1), 1);
});

test("keywords: INTIMIDATE X reduces enemy ATK within square aura of radius X", () => {
  const luster2Def = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Luster Dragon #2");
  assert.ok(luster2Def);
  const luster2 = createMonsterState(
    luster2Def,
    "luster2:1",
    "card:luster2",
    "p1",
    { x: 10, y: 10 },
    "attack",
  );

  const enemyDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Mechanicalchaser");
  assert.ok(enemyDef);
  const enemyClose = createMonsterState(
    enemyDef,
    "enemy:1",
    "card:enemy1",
    "p2",
    { x: 11, y: 11 }, // Distance = 1 (inside radius 1)
    "attack",
  );

  const enemyFar = createMonsterState(
    enemyDef,
    "enemy:2",
    "card:enemy2",
    "p2",
    { x: 12, y: 10 }, // Distance = 2 (outside radius 1)
    "attack",
  );

  // Close enemy suffers -1 ATK penalty from INTIMIDATE 1 aura
  const effectiveClose = calculateEffectiveAtk(enemyClose, [luster2, enemyClose]);
  assert.equal(effectiveClose, enemyClose.atk - 1);

  // Far enemy is unaffected
  const effectiveFar = calculateEffectiveAtk(enemyFar, [luster2, enemyFar]);
  assert.equal(effectiveFar, enemyFar.atk);
});

test("keywords: PSYBLAST X reduces defender MP when attack deals HP damage", () => {
  const chosenDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Chosen by the World Chalice");
  assert.ok(chosenDef);
  const chosen = createMonsterState(
    chosenDef,
    "chosen:1",
    "card:chosen",
    "p1",
    { x: 5, y: 5 },
    "attack",
  );

  // Deals 3 damage on first attack: reduces MP by PSYBLAST 1 = 1
  assert.equal(calculatePsyblastReduction(chosen, 3, 0), 1);
  // Zero damage deals 0 MP reduction
  assert.equal(calculatePsyblastReduction(chosen, 0, 0), 0);
  // Subsequent hit deals 0 MP reduction
  assert.equal(calculatePsyblastReduction(chosen, 3, 1), 0);
});

test("keywords: REPULSE X pushes defender away from attacker along line of fire", () => {
  const spatial = createSpatialState(
    [{ playerId: "p1", position: { x: 0, y: 8 } }, { playerId: "p2", position: { x: 30, y: 8 } }],
    [],
  );

  const attackerPos = { x: 5, y: 5 };
  const defenderPos = { x: 6, y: 5 };
  // Moving away in +X direction: from x=6 with distance 1 -> x=7
  const repulsed = calculateRepulseDestination(attackerPos, defenderPos, 1, spatial);
  assert.deepEqual(repulsed, { x: 7, y: 5 });
});

test("keywords: BERSERKER X triggers when HP drops below 50% of maximum", () => {
  const flameDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Flame Champion");
  assert.ok(flameDef);
  const flame = createMonsterState(
    flameDef,
    "flame:1",
    "card:flame",
    "p1",
    { x: 5, y: 5 },
    "attack",
  );

  // Max HP is 5. Half is ceil(5/2) = 3.
  // Dropping from 5 to 2 triggers BERSERKER 2 bonus.
  const bonus = checkBerserkerTrigger(flame, 5, 2);
  assert.equal(bonus, 2);

  // Dropping from 2 to 1 does NOT re-trigger (already was below half).
  assert.equal(checkBerserkerTrigger(flame, 2, 1), null);

  // Dropping from 5 to 3 does NOT trigger (3 is not below 3).
  assert.equal(checkBerserkerTrigger(flame, 5, 3), null);
});

test("combat: INTIMIDATE 1 aura reduces enemy effective ATK during battle", () => {
  const luster2Def = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Luster Dragon #2");
  const chaserDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Mechanicalchaser");
  const clawDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Claw Reacher");
  assert.ok(luster2Def && chaserDef && clawDef);

  const luster2 = createMonsterState(luster2Def, "p1:luster2", "card:l2", "p1", { x: 5, y: 5 }, "attack");
  const attacker = createMonsterState(clawDef, "p1:claw", "card:claw", "p1", { x: 6, y: 5 }, "attack");
  // Defender is adjacent to Luster Dragon #2 (within Chebyshev distance 1)
  // Give defender higher SPD (5 vs attacker's 3) so counterattack is available
  const defender = {
    ...createMonsterState(chaserDef, "p2:chaser", "card:chaser", "p2", { x: 6, y: 6 }, "attack"),
    spd: { current: 5, maximum: 5 },
  };

  const spatial = createSpatialState(
    [{ playerId: "p1", position: { x: 0, y: 8 } }, { playerId: "p2", position: { x: 30, y: 8 } }],
    [
      { unitId: luster2.unitId, playerId: "p1", position: luster2.position },
      { unitId: attacker.unitId, playerId: "p1", position: attacker.position },
      { unitId: defender.unitId, playerId: "p2", position: defender.position },
    ],
  );

  const plan = createBasicAttackPlan(attacker, defender, spatial, [], true, true);
  // Defender's printed ATK is 10, but due to INTIMIDATE 1 from luster2, its effective ATK is 9!
  // In counterattack mode, attacker takes defender.atk = 9 damage, defender takes attacker.atk = 6 damage.
  const resolution = resolvePlannedBasicAttack([luster2, attacker, defender], spatial, plan);

  assert.equal(resolution.combat.damageToAttacker, 9);
  assert.equal(resolution.combat.damageToDefender, 6);
});

test("combat: PSYBLAST 1 reduces defender MP on dealing positive HP damage", () => {
  const chosenDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Chosen by the World Chalice");
  const mokeyDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Mokey Mokey");
  assert.ok(chosenDef && mokeyDef);

  const chosen = createMonsterState(chosenDef, "p1:chosen", "card:chosen", "p1", { x: 5, y: 5 }, "attack");
  // Mokey Mokey in DEF position: DEF is 1 + 2 (Fairy bonus) = 3, MP is 2, HP is 1. Give it 15 HP to survive and check MP.
  const mokey = {
    ...createMonsterState(mokeyDef, "p2:mokey", "card:mokey", "p2", { x: 5, y: 6 }, "defense"),
    hp: { current: 15, maximum: 15 },
  };

  const spatial = createSpatialState(
    [{ playerId: "p1", position: { x: 0, y: 8 } }, { playerId: "p2", position: { x: 30, y: 8 } }],
    [
      { unitId: chosen.unitId, playerId: "p1", position: chosen.position },
      { unitId: mokey.unitId, playerId: "p2", position: mokey.position },
    ],
  );

  const plan = createBasicAttackPlan(chosen, mokey, spatial, [], true, false);
  const resolution = resolvePlannedBasicAttack([chosen, mokey], spatial, plan);

  // Chosen deals 11 - 3 = 8 HP damage to Mokey Mokey.
  assert.equal(resolution.combat.damageToDefender, 8);
  const survivingMokey = resolution.monsters.find((m) => m.unitId === mokey.unitId);
  assert.ok(survivingMokey);
  assert.equal(survivingMokey.mp.current, 1);
});

test("combat: REPULSE 1 pushes defender away when surviving positive HP damage", () => {
  const salmonDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Terrorking Salmon");
  const lusterDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Luster Dragon");
  assert.ok(salmonDef && lusterDef);

  const salmon = createMonsterState(salmonDef, "p1:salmon", "card:salmon", "p1", { x: 5, y: 5 }, "attack");
  const luster = {
    ...createMonsterState(lusterDef, "p2:luster", "card:luster", "p2", { x: 5, y: 6 }, "defense"),
    hp: { current: 10, maximum: 10 },
  };

  const spatial = createSpatialState(
    [{ playerId: "p1", position: { x: 0, y: 8 } }, { playerId: "p2", position: { x: 30, y: 8 } }],
    [
      { unitId: salmon.unitId, playerId: "p1", position: salmon.position },
      { unitId: luster.unitId, playerId: "p2", position: luster.position },
    ],
  );

  const plan = createBasicAttackPlan(salmon, luster, spatial, [], true, false);
  const resolution = resolvePlannedBasicAttack([salmon, luster], spatial, plan);

  assert.equal(resolution.combat.damageToDefender, 5);
  const survivingLuster = resolution.monsters.find((m) => m.unitId === luster.unitId);
  assert.ok(survivingLuster);
  assert.deepEqual(survivingLuster.position, { x: 5, y: 7 });
  assert.deepEqual(resolution.spatial.units.find((u) => u.unitId === luster.unitId)?.position, { x: 5, y: 7 });
});

test("combat: BERSERKER 2 boosts ATK and SPD when HP drops below 50%", () => {
  const flameDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Flame Champion");
  const chaserDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Mechanicalchaser");
  assert.ok(flameDef && chaserDef);

  const flame = createMonsterState(flameDef, "p2:flame", "card:flame", "p2", { x: 5, y: 6 }, "defense");
  const attacker = createMonsterState(chaserDef, "p1:chaser", "card:chaser", "p1", { x: 5, y: 5 }, "attack");

  const spatial = createSpatialState(
    [{ playerId: "p1", position: { x: 0, y: 8 } }, { playerId: "p2", position: { x: 30, y: 8 } }],
    [
      { unitId: attacker.unitId, playerId: "p1", position: attacker.position },
      { unitId: flame.unitId, playerId: "p2", position: flame.position },
    ],
  );

  const plan = createBasicAttackPlan(attacker, flame, spatial, [], true, false);
  const resolution = resolvePlannedBasicAttack([attacker, flame], spatial, plan);

  assert.equal(resolution.combat.damageToDefender, 3);
  const survivingFlame = resolution.monsters.find((m) => m.unitId === flame.unitId);
  assert.ok(survivingFlame);
  assert.equal(survivingFlame.hp.current, 2);
  assert.equal(survivingFlame.atk, 13);
  assert.equal(survivingFlame.spd.current, 5);
  assert.equal(survivingFlame.spd.maximum, 5);
});

test("engine: battle.activate_bulwark shifts monster to DEF position during response window", () => {
  const lusterDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Luster Dragon");
  const chaserDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Mechanicalchaser");
  assert.ok(lusterDef && chaserDef);

  const bases = [
    { playerId: "p1", position: { x: 0, y: 8 } },
    { playerId: "p2", position: { x: 30, y: 8 } },
  ];
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
      extraDeck: [],
    },
  }));
  const definitions = [
    ...players.flatMap((p) => p.decks.monsterDeck.map((c) => ({
      definitionId: c.definitionId,
      name: c.name,
      level: 4,
      type: "normal",
      elements: ["light"],
      races: ["Warrior"],
      printedVis: 2,
      printedSpd: 4,
      printedAtk: 13,
      printedDef: 8,
    }))),
    { ...lusterDef, definitionId: "custom:luster" },
  ];

  let engine = createGameEngine("test-bulwark", players, bases, definitions);
  engine = enqueueCommand(engine, { issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } });
  engine = enqueueCommand(engine, { issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } });
  engine = advanceStep(engine).engine;

  const p1Card = engine.state.cardSetup.players[0].hand[0];
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "summon.normal",
    payload: {
      cardInstanceId: p1Card.instanceId,
      unitId: "p1:attacker",
      anchorUnitId: null,
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    },
  });
  engine = advanceStep(engine).engine;

  const lusterUnit = createMonsterState(
    { ...lusterDef, definitionId: "custom:luster" },
    "p2:luster",
    "card:luster:unit",
    "p2",
    { x: 2, y: 8 },
    "attack",
  );
  engine = {
    ...engine,
    state: {
      ...engine.state,
      monsters: [...engine.state.monsters, lusterUnit],
      spatial: createSpatialState(engine.state.spatial.bases, [
        ...engine.state.spatial.units,
        { unitId: lusterUnit.unitId, playerId: "p2", position: lusterUnit.position },
      ]),
    },
  };

  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "battle.declare_basic_attack",
    payload: {
      attackerUnitId: "p1:attacker",
      defenderUnitId: "p2:luster",
    },
  });
  engine = advanceStep(engine).engine;

  assert.equal(engine.state.pendingBasicAttacks.length, 1);
  const elementId = engine.state.pendingBasicAttacks[0].elementId;
  const chainId = engine.state.chainWindows[0].chainId;

  engine = enqueueCommand(engine, {
    issuer: "p2",
    kind: "battle.activate_bulwark",
    payload: { elementId },
  });
  const bulwarkResult = advanceStep(engine);
  assert.equal(bulwarkResult.events[0].type, "command_accepted");

  const updatedLuster = bulwarkResult.engine.state.monsters.find((m) => m.unitId === "p2:luster");
  assert.equal(updatedLuster.battlePosition, "defense");

  let resolvedEngine = enqueueCommand(bulwarkResult.engine, { issuer: "p1", kind: "chain.pass_priority", payload: { chainId } });
  resolvedEngine = advanceStep(resolvedEngine).engine;

  resolvedEngine = enqueueCommand(resolvedEngine, { issuer: "system", kind: "chain.resolve_next", payload: { chainId } });
  const combatResult = advanceStep(resolvedEngine);

  assert.equal(combatResult.engine.state.pendingBasicAttacks.length, 0);
});

test("engine: monster.reanimate revives monster from Graveyard to map at action cost", () => {
  const servantDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Skull Servant");
  assert.ok(servantDef);

  const bases = [
    { playerId: "p1", position: { x: 0, y: 8 } },
    { playerId: "p2", position: { x: 30, y: 8 } },
  ];
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
      extraDeck: [],
    },
  }));
  const definitions = [
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
    servantDef,
  ];

  let engine = createGameEngine("test-reanimate", players, bases, definitions);
  engine = enqueueCommand(engine, { issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } });
  engine = enqueueCommand(engine, { issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } });
  engine = advanceStep(engine).engine;

  const skullServantCard = {
    instanceId: "p1:card:skull_servant",
    definitionId: servantDef.definitionId,
    name: servantDef.name,
    kind: "normal_monster",
  };
  engine = {
    ...engine,
    state: {
      ...engine.state,
      cardSetup: {
        ...engine.state.cardSetup,
        players: engine.state.cardSetup.players.map((p, idx) =>
          idx === 0 ? { ...p, graveyard: [...p.graveyard, skullServantCard] } : p,
        ),
      },
    },
  };

  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "monster.reanimate",
    payload: {
      cardInstanceId: skullServantCard.instanceId,
      unitId: "p1:skull_servant:unit",
      anchorUnitId: null,
      destination: { x: 1, y: 8 },
      battlePosition: "attack",
    },
  });
  const result = advanceStep(engine);
  assert.equal(result.events[0].type, "command_accepted");

  assert.equal(result.engine.state.turn.players[0].remaining.actions, 3);
  assert.equal(result.engine.state.cardSetup.players[0].graveyard.length, 0);
  const reanimated = result.engine.state.monsters.find((m) => m.unitId === "p1:skull_servant:unit");
  assert.ok(reanimated);
  assert.equal(reanimated.hp.current, reanimated.hp.maximum);
  assert.equal(reanimated.spd.current, reanimated.spd.maximum);
  assert.deepEqual(reanimated.position, { x: 1, y: 8 });
});

test("keywords: GLIDER is recognized on Blue-Winged Crown", () => {
  const crownDef = PROTOTYPE_NORMAL_MONSTERS.find((m) => m.name === "Blue-Winged Crown");
  assert.ok(crownDef);
  assert.equal(hasKeyword(crownDef, "GLIDER"), true);
});

