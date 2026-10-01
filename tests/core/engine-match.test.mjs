import assert from "node:assert/strict";
import test from "node:test";

import { advanceStep, createEngine, enqueueCommand } from "../../src/core/index.ts";

const players = ["p1", "p2"];

function impact(attackerPlayerId, defenderPlayerId) {
  return {
    attackerPlayerId,
    defenderPlayerId,
    attackType: "basic",
    attackerPosition: "attack",
    anyPartResolved: true,
    hitBaseValidly: true,
  };
}

function queueBatch(engine, resolutions, issuer = "system") {
  return enqueueCommand(engine, {
    issuer,
    kind: "match.resolve_simultaneous_base_attacks",
    payload: { resolutions },
  });
}

test("base impacts enter the authoritative hash only through a system command", () => {
  const initial = createEngine("match-engine", players);
  const result = advanceStep(queueBatch(initial, [impact("p1", "p2")])).engine;

  assert.equal(result.state.match.players[1].baseImpactsReceived, 1);
  assert.notEqual(result.stateHash, initial.stateHash);

  const unauthorized = advanceStep(queueBatch(initial, [impact("p1", "p2")], "p1"));
  assert.equal(unauthorized.events[0].type, "command_rejected");
  assert.equal(unauthorized.engine.state.match.players[1].baseImpactsReceived, 0);
});

test("priority decides simultaneous fifth impacts inside the engine", () => {
  let engine = createEngine("simultaneous-fifth", players);
  const setup = [];
  for (let index = 0; index < 4; index += 1) {
    setup.push(impact("p1", "p2"), impact("p2", "p1"));
  }
  engine = advanceStep(queueBatch(engine, setup)).engine;
  assert.deepEqual(engine.state.match.players.map((player) => player.baseImpactsReceived), [4, 4]);

  const holder = engine.state.priorityToken.holderPlayerId;
  const opponent = players.find((playerId) => playerId !== holder);
  engine = advanceStep(queueBatch(engine, [impact(opponent, holder), impact(holder, opponent)])).engine;

  assert.equal(engine.state.match.status, "finished");
  assert.equal(engine.state.match.winnerPlayerId, holder);
  assert.equal(engine.state.match.players.find((player) => player.playerId === opponent).baseImpactsReceived, 5);
  assert.equal(engine.state.match.players.find((player) => player.playerId === holder).baseImpactsReceived, 4);
});

test("commands after the fifth impact are rejected in the same step", () => {
  let engine = createEngine("immediate-end", players);
  engine = advanceStep(queueBatch(engine, Array.from({ length: 4 }, () => impact("p1", "p2")))).engine;
  engine = queueBatch(engine, [impact("p1", "p2")]);
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "turn.allocate_resources",
    payload: { actions: 4, reactions: 4 },
  });
  const result = advanceStep(engine);

  assert.equal(result.engine.state.match.status, "finished");
  assert.deepEqual(result.events.map((event) => event.type), ["command_accepted", "command_rejected"]);
  assert.match(result.events[1].reason, /already finished/);
});

test("malformed base resolution payloads are rejected without mutation", () => {
  const initial = createEngine("invalid-base", players);
  const result = advanceStep(queueBatch(initial, [{ attackType: "basic" }]));
  assert.equal(result.events[0].type, "command_rejected");
  assert.deepEqual(result.engine.state.match, initial.state.match);
});
