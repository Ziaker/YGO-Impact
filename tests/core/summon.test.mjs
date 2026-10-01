import assert from "node:assert/strict";
import test from "node:test";

import {
  SummonInvariantError,
  createSpatialState,
  findNormalSummonDestinations,
  resolveNormalSummon,
} from "../../src/core/index.ts";

const allTiles = Array.from({ length: 17 }, (_, y) =>
  Array.from({ length: 31 }, (_, x) => ({ x, y })),
).flat();

function state(units = []) {
  return createSpatialState(
    [
      { playerId: "p1", position: { x: 0, y: 8 } },
      { playerId: "p2", position: { x: 30, y: 8 } },
    ],
    units,
  );
}

function definition(type = "normal") {
  return {
    definitionId: `monster:${type}`,
    name: type === "normal" ? "Summoned Normal" : "Summoned Effect",
    level: 4,
    type,
    elements: ["light"],
    races: ["Warrior"],
    printedVis: 2,
    printedSpd: 3,
    printedAtk: 4,
    printedDef: 3,
  };
}

function cardState(type = "normal") {
  const card = {
    instanceId: `p1:monster:0:monster:${type}`,
    definitionId: `monster:${type}`,
    name: type === "normal" ? "Summoned Normal" : "Summoned Effect",
    kind: type === "normal" ? "normal_monster" : "effect_monster",
  };
  return {
    playerId: "p1",
    monsterDeck: [],
    spellTrapDeck: [],
    extraDeck: [],
    hand: [card],
    graveyard: [],
    randomAudit: [],
  };
}

test("the base anchors the first summon and only free visible orthogonal tiles qualify", () => {
  const result = findNormalSummonDestinations(state(), "p1", null, allTiles);

  assert.equal(result.distanceFromAnchor, 1);
  assert.equal(result.usedFallback, false);
  assert.deepEqual(result.positions, [
    { x: 0, y: 7 },
    { x: 1, y: 8 },
    { x: 0, y: 9 },
  ]);
});

test("an explicitly selected allied monster anchors later normal summons", () => {
  const spatial = state([
    { unitId: "anchor", playerId: "p1", position: { x: 5, y: 5 } },
    { unitId: "block", playerId: "p2", position: { x: 5, y: 4 } },
  ]);
  const visible = [{ x: 4, y: 5 }, { x: 5, y: 4 }, { x: 6, y: 5 }];
  const result = findNormalSummonDestinations(spatial, "p1", "anchor", visible);

  assert.deepEqual(result.positions, [{ x: 4, y: 5 }, { x: 6, y: 5 }]);
});

test("fallback returns every tied nearest legal tile, at most three beyond the normal area", () => {
  const blockers = [
    { unitId: "anchor", playerId: "p1", position: { x: 5, y: 5 } },
    { unitId: "up", playerId: "p2", position: { x: 5, y: 4 } },
    { unitId: "left", playerId: "p2", position: { x: 4, y: 5 } },
    { unitId: "right", playerId: "p2", position: { x: 6, y: 5 } },
    { unitId: "down", playerId: "p2", position: { x: 5, y: 6 } },
  ];
  const result = findNormalSummonDestinations(state(blockers), "p1", "anchor", allTiles);

  assert.equal(result.distanceFromAnchor, 2);
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.positions, [
    { x: 5, y: 3 },
    { x: 4, y: 4 },
    { x: 6, y: 4 },
    { x: 3, y: 5 },
    { x: 7, y: 5 },
    { x: 4, y: 6 },
    { x: 6, y: 6 },
    { x: 5, y: 7 },
  ]);
});

test("when Normal Summon fallback produces tied nearest tiles, controller can pick any tied tile but non-tied tiles are rejected", () => {
  const blockers = [
    { unitId: "anchor", playerId: "p1", position: { x: 5, y: 5 } },
    { unitId: "up", playerId: "p2", position: { x: 5, y: 4 } },
    { unitId: "left", playerId: "p2", position: { x: 4, y: 5 } },
    { unitId: "right", playerId: "p2", position: { x: 6, y: 5 } },
    { unitId: "down", playerId: "p2", position: { x: 5, y: 6 } },
  ];
  const spatial = state(blockers);
  const fallback = findNormalSummonDestinations(spatial, "p1", "anchor", allTiles);
  assert.equal(fallback.usedFallback, true);
  assert.equal(fallback.positions.length, 8);

  const anchorDef = definition();
  const allMonsters = blockers.map((b) => ({
    unitId: b.unitId,
    cardInstanceId: `${b.playerId}:card:${b.unitId}`,
    definitionId: anchorDef.definitionId,
    name: anchorDef.name,
    level: 4,
    type: "normal",
    elements: ["light"],
    races: ["Warrior"],
    battlePosition: "attack",
    position: b.position,
    ownerPlayerId: b.playerId,
    controllerPlayerId: b.playerId,
    vis: { current: 2, maximum: 2 },
    spd: { current: 3, maximum: 3 },
    atk: { current: 4, maximum: 4 },
    def: { current: 3, maximum: 3 },
    hp: { current: 1600, maximum: 1600 },
    mp: { current: 0, maximum: 0 },
  }));

  const choiceA = resolveNormalSummon({
    cardState: cardState(),
    catalog: { definitions: [anchorDef] },
    monsters: allMonsters,
    spatial,
    playerId: "p1",
    cardInstanceId: "p1:monster:0:monster:normal",
    unitId: "summoned:a",
    anchorUnitId: "anchor",
    sharedVisibleTiles: allTiles,
    destination: { x: 5, y: 3 },
    battlePosition: "attack",
  });
  assert.deepEqual(choiceA.spatial.units.find((u) => u.unitId === "summoned:a").position, { x: 5, y: 3 });

  const choiceB = resolveNormalSummon({
    cardState: cardState(),
    catalog: { definitions: [anchorDef] },
    monsters: allMonsters,
    spatial,
    playerId: "p1",
    cardInstanceId: "p1:monster:0:monster:normal",
    unitId: "summoned:b",
    anchorUnitId: "anchor",
    sharedVisibleTiles: allTiles,
    destination: { x: 7, y: 5 },
    battlePosition: "attack",
  });
  assert.deepEqual(choiceB.spatial.units.find((u) => u.unitId === "summoned:b").position, { x: 7, y: 5 });

  assert.throws(
    () =>
      resolveNormalSummon({
        cardState: cardState(),
        catalog: { definitions: [anchorDef] },
        monsters: allMonsters,
        spatial,
        playerId: "p1",
        cardInstanceId: "p1:monster:0:monster:normal",
        unitId: "summoned:fail",
        anchorUnitId: "anchor",
        sharedVisibleTiles: allTiles,
        destination: { x: 5, y: 2 },
        battlePosition: "attack",
      }),
    /not legal/,
  );
});

test("no visible legal destination within distance four prevents the summon", () => {
  const result = findNormalSummonDestinations(state(), "p1", null, [{ x: 10, y: 10 }]);
  assert.equal(result.distanceFromAnchor, null);
  assert.deepEqual(result.positions, []);
});

test("anchor ownership, map capacity, bases, and visibility inputs are validated", () => {
  const withAllies = state([{ unitId: "ally", playerId: "p1", position: { x: 2, y: 8 } }]);
  assert.throws(
    () => findNormalSummonDestinations(withAllies, "p1", null, allTiles),
    /must be selected/,
  );
  assert.throws(
    () => findNormalSummonDestinations(withAllies, "p1", "unknown", allTiles),
    /not an allied summon anchor/,
  );
  assert.throws(
    () => findNormalSummonDestinations(state(), "p1", "ally", allTiles),
    /base is the required anchor/,
  );
  assert.throws(
    () => findNormalSummonDestinations(state(), "p1", null, [{ x: -1, y: 0 }]),
    SummonInvariantError,
  );

  const five = Array.from({ length: 5 }, (_, index) => ({
    unitId: `u${index}`,
    playerId: "p1",
    position: { x: 2 + index, y: 8 },
  }));
  assert.throws(
    () => findNormalSummonDestinations(state(five), "p1", "u0", allTiles),
    /already controls 5 monsters/,
  );
});

test("Normal Summon atomically moves the physical card from hand onto the battlefield", () => {
  const cards = cardState();
  const spatial = state();
  const result = resolveNormalSummon({
    cardState: cards,
    catalog: { definitions: [definition()] },
    monsters: [],
    spatial,
    playerId: "p1",
    cardInstanceId: cards.hand[0].instanceId,
    unitId: "p1:unit:0",
    anchorUnitId: null,
    sharedVisibleTiles: allTiles,
    destination: { x: 1, y: 8 },
    battlePosition: "defense",
  });

  assert.deepEqual(result.cardState.hand, []);
  assert.equal(result.summonedMonster.cardInstanceId, cards.hand[0].instanceId);
  assert.equal(result.summonedMonster.battlePosition, "defense");
  assert.equal(result.summonedMonster.spd.current, result.summonedMonster.spd.maximum);
  assert.deepEqual(result.monsters, [result.summonedMonster]);
  assert.deepEqual(result.spatial.units, [
    { unitId: "p1:unit:0", playerId: "p1", position: { x: 1, y: 8 } },
  ]);
  assert.equal(cards.hand.length, 1);
  assert.equal(spatial.units.length, 0);
});

test("Normal Summon rejects non-Normal cards, illegal destinations, and inconsistent authority", () => {
  const normalCards = cardState();
  const effectCards = cardState("effect");
  const common = {
    monsters: [],
    spatial: state(),
    playerId: "p1",
    unitId: "p1:unit:0",
    anchorUnitId: null,
    sharedVisibleTiles: allTiles,
    destination: { x: 1, y: 8 },
    battlePosition: "attack",
  };

  assert.throws(
    () =>
      resolveNormalSummon({
        ...common,
        cardState: effectCards,
        catalog: { definitions: [definition("effect")] },
        cardInstanceId: effectCards.hand[0].instanceId,
      }),
    /Only a Normal Monster/,
  );
  assert.throws(
    () =>
      resolveNormalSummon({
        ...common,
        cardState: normalCards,
        catalog: { definitions: [definition()] },
        cardInstanceId: normalCards.hand[0].instanceId,
        destination: { x: 2, y: 8 },
      }),
    /not legal/,
  );
  assert.throws(
    () =>
      resolveNormalSummon({
        ...common,
        cardState: normalCards,
        catalog: { definitions: [definition()] },
        cardInstanceId: normalCards.hand[0].instanceId,
        spatial: state([{ unitId: "orphan", playerId: "p1", position: { x: 2, y: 8 } }]),
      }),
    /different unit counts/,
  );
});
