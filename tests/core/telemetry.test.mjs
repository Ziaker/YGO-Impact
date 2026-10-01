import assert from "node:assert/strict";
import test from "node:test";

import {
  TELEMETRY_SCHEMA_VERSION,
  TelemetryInvariantError,
  advanceStep,
  createDiagnosticBundle,
  createEngine,
  createReplayFile,
  createTelemetrySession,
  enqueueCommand,
  recordStepTelemetry,
} from "../../src/core/index.ts";

function options(level = "complete") {
  return { level, matchId: "match-1", buildVersion: "test-build", configurationHash: "config-hash" };
}

test("telemetry records commands, logical context, and the authoritative step hash", () => {
  let engine = createEngine("telemetry-seed", ["p1", "p2"]);
  let telemetry = createTelemetrySession(engine, options());
  engine = enqueueCommand(engine, {
    issuer: "p1",
    kind: "turn.allocate_resources",
    payload: { actions: 5, reactions: 3 },
  });
  const result = advanceStep(engine);
  telemetry = recordStepTelemetry(telemetry, result);

  assert.equal(TELEMETRY_SCHEMA_VERSION, 1);
  assert.equal(telemetry.events.length, 2);
  assert.equal(telemetry.events[0].kind, "command_accepted");
  assert.equal(telemetry.events[0].step, 1);
  assert.equal(telemetry.events[0].turn, 1);
  assert.equal(telemetry.events[0].phase, "decision");
  assert.equal(telemetry.events[0].monotonicMs, 50);
  assert.equal(telemetry.events[0].stateHash, result.engine.stateHash);
  assert.equal(telemetry.events[1].kind, "step_completed");
});

test("illegal command attempts include actor, command, and rejection reason", () => {
  let engine = createEngine("illegal-seed", ["p1", "p2"]);
  let telemetry = createTelemetrySession(engine, options("basic"));
  engine = enqueueCommand(engine, { issuer: "p1", kind: "unknown.command" });
  const result = advanceStep(engine);
  telemetry = recordStepTelemetry(telemetry, result);

  assert.equal(telemetry.events.length, 1);
  assert.equal(telemetry.events[0].kind, "command_rejected");
  assert.equal(telemetry.events[0].issuer, "p1");
  assert.equal(telemetry.events[0].commandKind, "unknown.command");
  assert.match(telemetry.events[0].reason, /Unknown command kind/);
});

test("complete telemetry records empty steps while off telemetry stores no events", () => {
  const engine = createEngine("levels", ["p1", "p2"]);
  const result = advanceStep(engine);
  const complete = recordStepTelemetry(createTelemetrySession(engine, options("complete")), result);
  const off = recordStepTelemetry(createTelemetrySession(engine, options("off")), result);

  assert.equal(complete.events[0].kind, "step_completed");
  assert.equal(off.events.length, 0);
  assert.equal(off.lastRecordedStep, 1);
});

test("telemetry rejects duplicate, skipped, and foreign engine steps", () => {
  const engine = createEngine("ordered", ["p1", "p2"]);
  const result = advanceStep(engine);
  const session = createTelemetrySession(engine, options());
  const recorded = recordStepTelemetry(session, result);
  assert.throws(() => recordStepTelemetry(recorded, result), /exactly once in order/);

  const foreign = advanceStep(createEngine("foreign", ["p1", "p2"]));
  assert.throws(() => recordStepTelemetry(session, foreign), /seed does not match/);
});

test("a diagnostic bundle keeps matching telemetry and replay together", () => {
  const engine = createEngine("bundle-seed", ["p1", "p2"]);
  const telemetry = createTelemetrySession(engine, options());
  const replay = createReplayFile("bundle-seed", ["p1", "p2"], 1, []);
  const bundle = createDiagnosticBundle(telemetry, replay);
  assert.equal(bundle.telemetry, telemetry);
  assert.equal(bundle.replay, replay);

  const otherReplay = createReplayFile("other-seed", ["p1", "p2"], 1, []);
  assert.throws(() => createDiagnosticBundle(telemetry, otherReplay), TelemetryInvariantError);
});
