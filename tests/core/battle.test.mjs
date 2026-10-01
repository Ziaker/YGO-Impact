import assert from "node:assert/strict";
import test from "node:test";

import {
  BattleInvariantError,
  createMonsterState,
  createSpatialState,
  resolveConfirmedBasicAttack,
  resolvePlannedBasicAttack,
  settleDestroyedCards,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function unit(id, owner, position, atk, hp) {
  const monster = createMonsterState(
    {
      definitionId: id,
      name: id,
      level: 4,
      type: "effect",
      elements: ["light"],
      races: ["Dragon"],
      printedVis: 2,
      printedSpd: 3,
      printedAtk: atk,
      printedDef: 2,
    },
    id,
    `${owner}:card:${id}`,
    owner,
    position,
    "attack",
  );
  return { ...monster, hp: { current: hp, maximum: monster.hp.maximum } };
}

function spatial(monsters) {
  return createSpatialState(
    bases,
    monsters.map((monster) => ({
      unitId: monster.unitId,
      playerId: monster.ownerPlayerId,
      position: monster.position,
    })),
  );
}

test("simultaneously destroyed combatants leave the map and expose their physical cards", () => {
  const attacker = unit("attacker", "p1", { x: 2, y: 8 }, 5, 5);
  const defender = unit("defender", "p2", { x: 3, y: 8 }, 5, 5);
  const result = resolvePlannedBasicAttack([attacker, defender], spatial([attacker, defender]), {
    attackerUnitId: "attacker",
    defenderUnitId: "defender",
    mode: "counterattack",
    counterattackAvailable: true,
  });

  assert.deepEqual(result.monsters, []);
  assert.deepEqual(result.spatial.units, []);
  assert.deepEqual(result.destroyedUnitIds, ["attacker", "defender"]);
  assert.deepEqual(result.destroyedCardInstanceIds, ["p1:card:attacker", "p2:card:defender"]);
  assert.deepEqual(result.destroyedCards, [
    { ownerPlayerId: "p1", instanceId: "p1:card:attacker", definitionId: "attacker", name: "attacker", kind: "effect_monster" },
    { ownerPlayerId: "p2", instanceId: "p2:card:defender", definitionId: "defender", name: "defender", kind: "effect_monster" },
  ]);

  const cards = [
    { playerId: "p1", monsterDeck: [], spellTrapDeck: [], extraDeck: [], hand: [], graveyard: [], randomAudit: [] },
    { playerId: "p2", monsterDeck: [], spellTrapDeck: [], extraDeck: [], hand: [], graveyard: [], randomAudit: [] },
  ];
  const settled = settleDestroyedCards(cards, result);
  assert.equal(settled[0].graveyard[0].instanceId, "p1:card:attacker");
  assert.equal(settled[1].graveyard[0].instanceId, "p2:card:defender");
});

test("a surviving combatant keeps its updated HP and placement", () => {
  const attacker = unit("attacker", "p1", { x: 2, y: 8 }, 3, 4);
  const defender = unit("defender", "p2", { x: 3, y: 8 }, 2, 4);
  const result = resolvePlannedBasicAttack([attacker, defender], spatial([attacker, defender]), {
    attackerUnitId: "attacker",
    defenderUnitId: "defender",
    mode: "undefended",
    counterattackAvailable: false,
  });
  assert.equal(result.monsters.length, 2);
  assert.equal(result.monsters.find((entry) => entry.unitId === "defender").hp.current, 1);
  assert.equal(result.spatial.units.length, 2);
  assert.deepEqual(result.destroyedUnitIds, []);
});

test("destroyed cards require exactly one matching owner state", () => {
  const attacker = unit("attacker", "p1", { x: 2, y: 8 }, 5, 5);
  const defender = unit("defender", "p2", { x: 3, y: 8 }, 5, 5);
  const result = resolvePlannedBasicAttack([attacker, defender], spatial([attacker, defender]), {
    attackerUnitId: "attacker",
    defenderUnitId: "defender",
    mode: "counterattack",
    counterattackAvailable: true,
  });
  const p1 = { playerId: "p1", monsterDeck: [], spellTrapDeck: [], extraDeck: [], hand: [], graveyard: [], randomAudit: [] };
  assert.throws(() => settleDestroyedCards([p1], result), /Missing card state/);
  assert.throws(() => settleDestroyedCards([p1, p1], result), /unique player ids/);
});

test("battle resolution rejects absent and spatially inconsistent combatants", () => {
  const attacker = unit("attacker", "p1", { x: 2, y: 8 }, 3, 4);
  const defender = unit("defender", "p2", { x: 3, y: 8 }, 2, 4);
  const plan = {
    attackerUnitId: "attacker",
    defenderUnitId: "defender",
    mode: "undefended",
    counterattackAvailable: false,
  };
  assert.throws(() => resolvePlannedBasicAttack([attacker], spatial([attacker]), plan), BattleInvariantError);
  assert.throws(
    () => resolvePlannedBasicAttack([attacker, defender], spatial([attacker]), plan),
    /inconsistent spatial state/,
  );
});

test("battle resolution rejects stale or forged combat modes", () => {
  const attacker = unit("attacker", "p1", { x: 2, y: 8 }, 3, 4);
  const defender = unit("defender", "p2", { x: 3, y: 8 }, 2, 4);
  const currentSpatial = spatial([attacker, defender]);
  assert.throws(
    () => resolvePlannedBasicAttack([attacker, defender], currentSpatial, {
      attackerUnitId: "attacker", defenderUnitId: "defender", mode: "defense", counterattackAvailable: false,
    }),
    /DEF position/,
  );
  assert.throws(
    () => resolvePlannedBasicAttack([attacker, defender], currentSpatial, {
      attackerUnitId: "attacker", defenderUnitId: "defender", mode: "counterattack", counterattackAvailable: false,
    }),
    /currently available/,
  );
});

test("a confirmed Basic Attack validates, resolves, and settles Graveyards atomically", () => {
  const attacker = unit("attacker", "p1", { x: 2, y: 8 }, 5, 5);
  const defender = unit("defender", "p2", { x: 3, y: 8 }, 2, 5);
  const cards = [
    { playerId: "p1", monsterDeck: [], spellTrapDeck: [], extraDeck: [], hand: [], graveyard: [], randomAudit: [] },
    { playerId: "p2", monsterDeck: [], spellTrapDeck: [], extraDeck: [], hand: [], graveyard: [], randomAudit: [] },
  ];
  const result = resolveConfirmedBasicAttack(
    [attacker, defender],
    spatial([attacker, defender]),
    cards,
    "p1",
    "attacker",
    "defender",
    [],
    true,
    false,
  );

  assert.equal(result.plan.mode, "undefended");
  assert.deepEqual(result.destroyedUnitIds, ["defender"]);
  assert.equal(result.cardStates[1].graveyard[0].instanceId, defender.cardInstanceId);
  assert.equal(result.spatial.units.some((entry) => entry.unitId === "defender"), false);
  assert.throws(
    () => resolveConfirmedBasicAttack(
      [attacker, defender], spatial([attacker, defender]), cards, "p2",
      "attacker", "defender", [], true, false,
    ),
    /does not control attacker/,
  );
});
