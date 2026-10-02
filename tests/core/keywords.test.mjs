import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_KEYWORDS,
  calculateEffectiveAttackRange,
  calculateEffectiveAtk,
  calculatePsyblastReduction,
  calculateRepulseDestination,
  checkBerserkerTrigger,
  createMonsterState,
  createSpatialState,
  getKeywordParameter,
  hasKeyword,
  parseKeyword,
  parseMonsterKeywords,
  PROTOTYPE_NORMAL_MONSTERS,
  recoverMonsterAtSupport,
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
