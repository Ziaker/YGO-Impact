import assert from "node:assert/strict";
import test from "node:test";

import { advanceStep, createEngine, enqueueCommand } from "../../src/core/index.ts";

const players = ["human:0", "ai:1"];

function queue(engine, issuer, kind, payload = {}) {
  return enqueueCommand(engine, { issuer, kind, payload });
}

test("turn state is part of the authoritative engine and its hash", () => {
  const initial = createEngine("turn-seed", players);
  const queued = queue(initial, "human:0", "turn.allocate_resources", {
    actions: 5,
    reactions: 3,
  });
  const result = advanceStep(queued);

  assert.equal(result.engine.state.schemaVersion, 16);
  assert.equal(result.engine.state.turn.players[0].allocation.actions, 5);
  assert.notEqual(result.engine.stateHash, initial.stateHash);
  assert.equal(result.events[0].type, "command_accepted");
});

test("the engine records seeded initial priority and alternates it on the next turn", () => {
  let engine = createEngine("priority-engine", players);
  const initialHolder = engine.state.priorityToken.holderPlayerId;
  assert.equal(engine.state.randomAudit.length, 1);
  assert.equal(engine.state.randomAudit[0].streamId, "priority-token");

  engine = queue(engine, "human:0", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = queue(engine, "ai:1", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "human:0", "turn.end_participation");
  engine = queue(engine, "ai:1", "turn.end_participation");
  engine = advanceStep(engine).engine;
  engine = queue(engine, "system", "turn.advance_completed_phase");
  engine = advanceStep(engine).engine;

  assert.equal(engine.state.turn.turnNumber, 2);
  assert.equal(engine.state.turn.phase, "draw");
  assert.notEqual(engine.state.priorityToken.holderPlayerId, initialHolder);
});

test("seeded priority state and audit are replay deterministic", () => {
  const first = createEngine("same-priority-seed", players);
  const replay = createEngine("same-priority-seed", players);
  assert.deepEqual(first.state.priorityToken, replay.state.priorityToken);
  assert.deepEqual(first.state.randomAudit, replay.state.randomAudit);
  assert.equal(first.stateHash, replay.stateHash);
});

test("human and AI allocations use the same deterministic command queue", () => {
  let engine = createEngine("shared-queue", players);
  engine = queue(engine, "ai:1", "turn.allocate_resources", { actions: 3, reactions: 5 });
  engine = queue(engine, "human:0", "turn.allocate_resources", { actions: 6, reactions: 2 });
  const result = advanceStep(engine);

  assert.deepEqual(result.processedCommands.map((command) => command.issuer), ["ai:1", "human:0"]);
  assert.equal(result.engine.state.turn.phase, "action");
  assert.deepEqual(result.events.map((event) => event.type), ["command_accepted", "command_accepted"]);
});

test("invalid and unknown commands are explicitly rejected without mutating turn state", () => {
  const initial = createEngine("reject-seed", players);
  let engine = queue(initial, "human:0", "turn.allocate_resources", { actions: 7, reactions: 7 });
  engine = queue(engine, "human:0", "unknown.command");
  const result = advanceStep(engine);

  assert.deepEqual(result.engine.state.turn, initial.state.turn);
  assert.deepEqual(result.events.map((event) => event.type), ["command_rejected", "command_rejected"]);
  assert.match(result.events[0].reason, /total exactly 8/);
  assert.match(result.events[1].reason, /Unknown command kind/);
});

test("system-only turn commands reject player issuers", () => {
  let engine = createEngine("system-auth", players);
  engine = queue(engine, "human:0", "turn.advance_completed_phase");
  const result = advanceStep(engine);

  assert.equal(result.events[0].type, "command_rejected");
  assert.match(result.events[0].reason, /authoritative system/);
});

test("confirmed resource use and voluntary exit mutate state through commands", () => {
  let engine = createEngine("resource-commands", players);
  engine = queue(engine, "human:0", "turn.allocate_resources", { actions: 2, reactions: 6 });
  engine = queue(engine, "ai:1", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = advanceStep(engine).engine;

  engine = queue(engine, "human:0", "turn.confirm_resource_use", { resource: "action" });
  engine = queue(engine, "ai:1", "turn.end_participation");
  const result = advanceStep(engine);

  assert.deepEqual(result.engine.state.turn.players[0].remaining, { actions: 1, reactions: 6 });
  assert.equal(result.engine.state.turn.players[1].participationEnded, true);
  assert.deepEqual(result.events.map((event) => event.type), ["command_accepted", "command_accepted"]);
});
