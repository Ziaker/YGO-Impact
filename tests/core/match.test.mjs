import assert from "node:assert/strict";
import test from "node:test";

import {
  BASE_IMPACTS_TO_WIN,
  MatchInvariantError,
  createPriorityToken,
  createMatchState,
  resolveBaseAttack,
  resolveDeckOut,
  resolveSimultaneousBaseAttacks,
} from "../../src/core/index.ts";

const players = ["p1", "p2"];

function validImpact(state, attackerPlayerId = "p1", defenderPlayerId = "p2") {
  return resolveBaseAttack(state, {
    attackerPlayerId,
    defenderPlayerId,
    attackType: "basic",
    attackerPosition: "attack",
    anyPartResolved: true,
    hitBaseValidly: true,
  });
}

test("a match starts active with two untouched bases", () => {
  const state = createMatchState(players);
  assert.equal(BASE_IMPACTS_TO_WIN, 5);
  assert.equal(state.status, "active");
  assert.equal(state.winnerPlayerId, null);
  assert.equal(state.endReason, null);
  assert.deepEqual(state.players.map((player) => player.baseImpactsReceived), [0, 0]);
  assert.equal(Object.isFrozen(state.players), true);
});

test("only a valid resolved basic attack in ATK position records an impact", () => {
  const initial = createMatchState(players);
  const cases = [
    { attackType: "effect", attackerPosition: "attack", anyPartResolved: true, hitBaseValidly: true },
    { attackType: "basic", attackerPosition: "defense", anyPartResolved: true, hitBaseValidly: true },
    { attackType: "basic", attackerPosition: "attack", anyPartResolved: false, hitBaseValidly: true },
    { attackType: "basic", attackerPosition: "attack", anyPartResolved: true, hitBaseValidly: false },
  ];

  for (const candidate of cases) {
    const result = resolveBaseAttack(initial, {
      attackerPlayerId: "p1",
      defenderPlayerId: "p2",
      ...candidate,
    });
    assert.equal(result.state, initial);
    assert.equal(result.impactRecorded, false);
    assert.equal(result.attackerRequiresReposition, false);
  }
});

test("a valid impact is independent of damage and requires attacker repositioning", () => {
  const result = validImpact(createMatchState(players));
  assert.equal(result.impactRecorded, true);
  assert.equal(result.attackerRequiresReposition, true);
  assert.equal(result.state.players[1].baseImpactsReceived, 1);
});

test("the fifth impact ends the match immediately with the attacker as winner", () => {
  let state = createMatchState(players);
  for (let impact = 1; impact <= BASE_IMPACTS_TO_WIN; impact += 1) {
    const result = validImpact(state);
    state = result.state;
    assert.equal(result.matchEnded, impact === BASE_IMPACTS_TO_WIN);
  }

  assert.equal(state.status, "finished");
  assert.equal(state.winnerPlayerId, "p1");
  assert.equal(state.endReason, "base_impacts");
  assert.equal(state.players[1].baseImpactsReceived, 5);
  assert.throws(() => validImpact(state, "p2", "p1"), /after the match has finished/);
});

test("match players must be distinct and attacks must target the opposing base", () => {
  assert.throws(() => createMatchState(["p1"]), MatchInvariantError);
  assert.throws(() => createMatchState(["p1", "p1"]), MatchInvariantError);
  const state = createMatchState(players);
  assert.throws(() => validImpact(state, "p1", "p1"), /own base/);
  assert.throws(() => validImpact(state, "unknown", "p2"), /Unknown attacker/);
  assert.throws(
    () => resolveBaseAttack(state, {
      attackerPlayerId: "p1",
      defenderPlayerId: "p2",
      attackType: "unknown",
      attackerPosition: "attack",
      anyPartResolved: true,
      hitBaseValidly: true,
    }),
    /Unknown attack type/,
  );
});

test("priority decides simultaneous fifth impacts and cancels the unresolved attack", () => {
  let state = createMatchState(players);
  for (let impact = 0; impact < 4; impact += 1) {
    state = validImpact(state, "p1", "p2").state;
    state = validImpact(state, "p2", "p1").state;
  }
  const token = createPriorityToken(players, "p2");
  const simultaneous = resolveSimultaneousBaseAttacks(state, token, [
    {
      attackerPlayerId: "p1",
      defenderPlayerId: "p2",
      attackType: "basic",
      attackerPosition: "attack",
      anyPartResolved: true,
      hitBaseValidly: true,
    },
    {
      attackerPlayerId: "p2",
      defenderPlayerId: "p1",
      attackType: "basic",
      attackerPosition: "attack",
      anyPartResolved: true,
      hitBaseValidly: true,
    },
  ]);

  assert.deepEqual(simultaneous.orderedAttackerPlayerIds, ["p2", "p1"]);
  assert.equal(simultaneous.resolvedCount, 1);
  assert.equal(simultaneous.canceledCount, 1);
  assert.equal(simultaneous.state.winnerPlayerId, "p2");
  assert.deepEqual(simultaneous.state.players.map((player) => player.baseImpactsReceived), [5, 4]);
});

test("one Deck Out gives victory to the opponent while simultaneous Deck Out is a draw", () => {
  const initial = createMatchState(players);
  const oneLoser = resolveDeckOut(initial, ["p1"]);
  const simultaneous = resolveDeckOut(initial, ["p1", "p2"]);

  assert.equal(oneLoser.status, "finished");
  assert.equal(oneLoser.winnerPlayerId, "p2");
  assert.equal(oneLoser.endReason, "deck_out");
  assert.equal(simultaneous.status, "finished");
  assert.equal(simultaneous.winnerPlayerId, null);
  assert.equal(simultaneous.endReason, "simultaneous_deck_out");
});

test("Deck Out validates losers and cannot resolve after the match ends", () => {
  const initial = createMatchState(players);
  assert.throws(() => resolveDeckOut(initial, []), MatchInvariantError);
  assert.throws(() => resolveDeckOut(initial, ["unknown"]), MatchInvariantError);
  assert.throws(() => resolveDeckOut(initial, ["p1", "p1"]), MatchInvariantError);
  assert.throws(() => resolveDeckOut(resolveDeckOut(initial, ["p1"]), ["p2"]), MatchInvariantError);
});
