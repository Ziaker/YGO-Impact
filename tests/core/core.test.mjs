import assert from "node:assert/strict";
import test from "node:test";

import {
  STEP_MS,
  STEP_PIPELINE,
  SIMULATION_HZ,
  advanceStep,
  canonicalStringify,
  createEngine,
  enqueueCommand,
  hashCanonical,
} from "../../src/core/index.ts";

test("fixed simulation cadence is 20 Hz / 50 ms", () => {
  assert.equal(SIMULATION_HZ, 20);
  assert.equal(STEP_MS, 50);
  assert.equal(STEP_PIPELINE.length, 10);
});

test("commands registered during a step become eligible on the next step", () => {
  const initial = createEngine("seed-1");
  const queued = enqueueCommand(initial, { issuer: "human:0", kind: "noop" });

  assert.equal(initial.pendingCommands.length, 0);
  assert.equal(queued.pendingCommands[0].receivedAtStep, 0);
  assert.equal(queued.pendingCommands[0].eligibleStep, 1);

  const result = advanceStep(queued);
  assert.deepEqual(result.processedCommands.map((command) => command.sequence), [0]);
  assert.equal(result.engine.state.step, 1);
});

test("registration sequence is stable and shared independently of issuer", () => {
  let engine = createEngine("seed-2");
  engine = enqueueCommand(engine, { issuer: "ai:1", kind: "second-name-but-first-registration" });
  engine = enqueueCommand(engine, { issuer: "human:0", kind: "first-name-but-second-registration" });

  const result = advanceStep(engine);
  assert.deepEqual(
    result.processedCommands.map((command) => [command.sequence, command.issuer]),
    [[0, "ai:1"], [1, "human:0"]],
  );
});

test("same seed and command log produce identical per-step hashes", () => {
  const run = () => {
    let engine = createEngine("replay-seed");
    const hashes = [engine.stateHash];
    engine = enqueueCommand(engine, { issuer: "human:0", kind: "noop", payload: { value: 7 } });
    engine = enqueueCommand(engine, { issuer: "ai:1", kind: "noop", payload: { value: -3 } });
    engine = advanceStep(engine).engine;
    hashes.push(engine.stateHash);
    engine = advanceStep(engine).engine;
    hashes.push(engine.stateHash);
    return hashes;
  };

  assert.deepEqual(run(), run());
});

test("canonical serialization ignores insertion order and never depends on locale collation", () => {
  assert.equal(canonicalStringify({ b: 2, a: 1 }), canonicalStringify({ a: 1, b: 2 }));
  assert.equal(hashCanonical({ b: 2, a: 1 }), hashCanonical({ a: 1, b: 2 }));
  assert.equal(canonicalStringify({ "ä": 3, a: 2, Z: 1 }), '{"Z":1,"a":2,"ä":3}');
});

test("authoritative numeric values reject floats and unsafe integers", () => {
  assert.throws(() => canonicalStringify({ value: 1.5 }), /safe integers/);
  assert.throws(() => canonicalStringify({ value: Number.MAX_SAFE_INTEGER + 1 }), /safe integers/);
});

test("queued payloads are defensive immutable snapshots", () => {
  const payload = { nested: { value: 1 } };
  const engine = enqueueCommand(createEngine("seed-3"), { issuer: "human:0", kind: "noop", payload });
  payload.nested.value = 99;

  assert.equal(engine.pendingCommands[0].payload.nested.value, 1);
  assert.equal(Object.isFrozen(engine.pendingCommands[0].payload), true);
  assert.equal(Object.isFrozen(engine.pendingCommands[0].payload.nested), true);
});

test("returned authoritative structures are frozen", () => {
  let engine = createEngine("seed-4");
  engine = enqueueCommand(engine, { issuer: "human:0", kind: "noop", payload: { nested: [1, 2] } });
  const result = advanceStep(engine);
  assert.equal(Object.isFrozen(result.engine), true);
  assert.equal(Object.isFrozen(result.engine.state), true);
  assert.equal(Object.isFrozen(result.processedCommands), true);
});
