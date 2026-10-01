import assert from "node:assert/strict";
import test from "node:test";

import {
  TributeInvariantError,
  createMonsterState,
  createSpatialState,
  createTributeSummonPlan,
  findTributeSummonFallback,
  resolveTributeSummon,
} from "../../src/core/index.ts";

const bases = [
  { playerId: "p1", position: { x: 0, y: 8 } },
  { playerId: "p2", position: { x: 30, y: 8 } },
];

function definition(id, level, type = "normal") {
  return {
    definitionId: id,
    name: id,
    level,
    type,
    elements: ["light"],
    races: ["Warrior"],
    printedVis: 2,
    printedSpd: 3,
    printedAtk: 4,
    printedDef: 3,
  };
}

function unit(id, playerId, level, position, type = "normal") {
  return createMonsterState(
    definition(id, level, type),
    id,
    `${playerId}:card:${id}`,
    playerId,
    position,
    "attack",
  );
}

function state(monsters) {
  return createSpatialState(
    bases,
    monsters.map((monster) => ({
      unitId: monster.unitId,
      playerId: monster.ownerPlayerId,
      position: monster.position,
    })),
  );
}

test("Normal Monster levels may equal or exceed the Effect Monster level", () => {
  const monsters = [unit("n4a", "p1", 4, { x: 2, y: 7 }), unit("n4b", "p1", 4, { x: 2, y: 9 })];
  const plan = createTributeSummonPlan(monsters, state(monsters), "p1", definition("e8", 8, "effect"), [
    "n4b",
    "n4a",
  ]);

  assert.equal(plan.totalTributeLevels, 8);
  assert.deepEqual(plan.tributeUnitIds, ["n4b", "n4a"]);
  assert.deepEqual(plan.releasedPositions, [{ x: 2, y: 7 }, { x: 2, y: 9 }]);
});

test("one higher-level Normal Monster is a sufficient Tribute", () => {
  const monsters = [unit("n8", "p1", 8, { x: 2, y: 8 })];
  const plan = createTributeSummonPlan(monsters, state(monsters), "p1", definition("e2", 2, "effect"), ["n8"]);
  assert.equal(plan.totalTributeLevels, 8);
  assert.deepEqual(plan.releasedPositions, [{ x: 2, y: 8 }]);
});

test("Tributes must be distinct controlled Normal Monsters with sufficient total level", () => {
  const monsters = [
    unit("normal", "p1", 3, { x: 2, y: 8 }),
    unit("effect", "p1", 4, { x: 3, y: 8 }, "effect"),
    unit("enemy", "p2", 8, { x: 28, y: 8 }),
  ];
  const spatial = state(monsters);
  const target = definition("target", 4, "effect");

  assert.throws(() => createTributeSummonPlan(monsters, spatial, "p1", target, []), /at least one/);
  assert.throws(() => createTributeSummonPlan(monsters, spatial, "p1", target, ["normal", "normal"]), /more than once/);
  assert.throws(() => createTributeSummonPlan(monsters, spatial, "p1", target, ["enemy"]), /not controlled/);
  assert.throws(() => createTributeSummonPlan(monsters, spatial, "p1", target, ["effect"]), /not a Normal/);
  assert.throws(() => createTributeSummonPlan(monsters, spatial, "p1", target, ["normal"]), /below target level/);
  assert.throws(
    () => createTributeSummonPlan(monsters, spatial, "p1", definition("normal-target", 1), ["normal"]),
    TributeInvariantError,
  );
});

test("monster and spatial records must agree before Tributes can be confirmed", () => {
  const monsters = [unit("normal", "p1", 4, { x: 2, y: 8 })];
  const inconsistent = createSpatialState(bases, [
    { unitId: "normal", playerId: "p1", position: { x: 3, y: 8 } },
  ]);
  assert.throws(
    () => createTributeSummonPlan(monsters, inconsistent, "p1", definition("effect", 4, "effect"), ["normal"]),
    /inconsistent/,
  );
});

test("an occupied confirmed destination falls back nearest to any released position", () => {
  const spatial = createSpatialState(bases, [
    { unitId: "occupier-a", playerId: "p2", position: { x: 5, y: 5 } },
    { unitId: "occupier-b", playerId: "p2", position: { x: 7, y: 5 } },
    { unitId: "block-up", playerId: "p2", position: { x: 5, y: 4 } },
  ]);
  const fallback = findTributeSummonFallback(spatial, [{ x: 5, y: 5 }, { x: 7, y: 5 }]);

  assert.deepEqual(fallback, [
    { x: 4, y: 5 },
    { x: 6, y: 5 },
    { x: 8, y: 5 },
    { x: 5, y: 6 },
    { x: 7, y: 6 },
    { x: 7, y: 4 },
  ].sort((left, right) => left.y - right.y || left.x - right.x));
});

test("Tribute fallback validates released positions", () => {
  assert.throws(() => findTributeSummonFallback(state([]), []), /At least one/);
  assert.throws(() => findTributeSummonFallback(state([]), [{ x: -1, y: 0 }]), /inside the map/);
});

test("Tribute Summon atomically pays map materials and preserves physical cards", () => {
  const tribute = unit("normal", "p1", 4, { x: 2, y: 8 });
  const targetDefinition = definition("effect", 4, "effect");
  const targetCard = {
    instanceId: "p1:hand:effect",
    definitionId: "effect",
    name: "effect",
    kind: "effect_monster",
  };
  const cardState = {
    playerId: "p1",
    monsterDeck: [],
    spellTrapDeck: [],
    extraDeck: [],
    hand: [targetCard],
    graveyard: [],
    randomAudit: [],
  };
  const result = resolveTributeSummon({
    cardState,
    catalog: { definitions: [targetDefinition] },
    monsters: [tribute],
    spatial: state([tribute]),
    playerId: "p1",
    cardInstanceId: targetCard.instanceId,
    unitId: "summoned-effect",
    tributeUnitIds: [tribute.unitId],
    destination: { x: 2, y: 8 },
    battlePosition: "defense",
  });

  assert.deepEqual(result.cardState.hand, []);
  assert.deepEqual(result.cardState.graveyard, [
    {
      instanceId: tribute.cardInstanceId,
      definitionId: tribute.definitionId,
      name: tribute.name,
      kind: "normal_monster",
    },
  ]);
  assert.equal(result.monsters.length, 1);
  assert.equal(result.monsters[0].unitId, "summoned-effect");
  assert.equal(result.monsters[0].cardInstanceId, targetCard.instanceId);
  assert.deepEqual(result.spatial.units[0].position, { x: 2, y: 8 });
  assert.equal(cardState.hand.length, 1);
});

test("Tribute Summon rejects a destination outside the released material tiles", () => {
  const tribute = unit("normal", "p1", 4, { x: 2, y: 8 });
  const targetCard = {
    instanceId: "p1:hand:effect",
    definitionId: "effect",
    name: "effect",
    kind: "effect_monster",
  };
  assert.throws(
    () =>
      resolveTributeSummon({
        cardState: {
          playerId: "p1",
          monsterDeck: [],
          spellTrapDeck: [],
          extraDeck: [],
          hand: [targetCard],
          graveyard: [],
          randomAudit: [],
        },
        catalog: { definitions: [definition("effect", 4, "effect")] },
        monsters: [tribute],
        spatial: state([tribute]),
        playerId: "p1",
        cardInstanceId: targetCard.instanceId,
        unitId: "summoned-effect",
        tributeUnitIds: [tribute.unitId],
        destination: { x: 3, y: 8 },
        battlePosition: "attack",
      }),
    /not a released Tribute tile/,
  );
});

test("multi-tribute releases multiple tiles and controller explicitly chooses which released tile to occupy", () => {
  const t1 = unit("t1", "p1", 4, { x: 2, y: 7 });
  const t2 = unit("t2", "p1", 4, { x: 2, y: 9 });
  const targetDef = definition("e8", 8, "effect");
  const targetCard = {
    instanceId: "p1:hand:e8",
    definitionId: "e8",
    name: "e8",
    kind: "effect_monster",
  };
  const cardState = {
    playerId: "p1",
    monsterDeck: [],
    spellTrapDeck: [],
    extraDeck: [],
    hand: [targetCard],
    graveyard: [],
    randomAudit: [],
  };
  const spatial = state([t1, t2]);

  const result1 = resolveTributeSummon({
    cardState: structuredClone(cardState),
    catalog: { definitions: [targetDef] },
    monsters: [t1, t2],
    spatial,
    playerId: "p1",
    cardInstanceId: targetCard.instanceId,
    unitId: "summoned:1",
    tributeUnitIds: ["t1", "t2"],
    destination: { x: 2, y: 7 },
    battlePosition: "attack",
  });
  assert.deepEqual(result1.spatial.units.find((u) => u.unitId === "summoned:1").position, { x: 2, y: 7 });

  const result2 = resolveTributeSummon({
    cardState: structuredClone(cardState),
    catalog: { definitions: [targetDef] },
    monsters: [t1, t2],
    spatial,
    playerId: "p1",
    cardInstanceId: targetCard.instanceId,
    unitId: "summoned:2",
    tributeUnitIds: ["t1", "t2"],
    destination: { x: 2, y: 9 },
    battlePosition: "attack",
  });
  assert.deepEqual(result2.spatial.units.find((u) => u.unitId === "summoned:2").position, { x: 2, y: 9 });

  assert.throws(
    () =>
      resolveTributeSummon({
        cardState: structuredClone(cardState),
        catalog: { definitions: [targetDef] },
        monsters: [t1, t2],
        spatial,
        playerId: "p1",
        cardInstanceId: targetCard.instanceId,
        unitId: "summoned:fail",
        tributeUnitIds: ["t1", "t2"],
        destination: { x: 2, y: 8 },
        battlePosition: "attack",
      }),
    /not a released Tribute tile/,
  );
});
