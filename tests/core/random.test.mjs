import assert from "node:assert/strict";
import test from "node:test";

import {
  RandomInvariantError,
  createRandomStream,
  drawUniformIndex,
} from "../../src/core/index.ts";

test("the same seed and stream reproduce every draw and audit position", () => {
  const run = () => {
    let stream = createRandomStream("match-seed", "shuffle");
    const logs = [];
    for (let index = 0; index < 20; index += 1) {
      const draw = drawUniformIndex(stream, 17);
      stream = draw.stream;
      logs.push(draw.log);
    }
    return logs;
  };

  assert.deepEqual(run(), run());
  assert.deepEqual(run().map((log) => log.position), Array.from({ length: 20 }, (_, index) => index + 1));
});

test("derived streams do not interfere with each other", () => {
  const priority = createRandomStream("same-seed", "priority-token");
  const shuffle = createRandomStream("same-seed", "shuffle");
  const firstPriority = drawUniformIndex(priority, 2);
  drawUniformIndex(shuffle, 52);
  const repeatedPriority = drawUniformIndex(createRandomStream("same-seed", "priority-token"), 2);

  assert.deepEqual(firstPriority, repeatedPriority);
  assert.notEqual(priority.state, shuffle.state);
});

test("uniform integer draws stay inside their requested range", () => {
  let stream = createRandomStream("range-seed", "targets");
  for (let index = 0; index < 1000; index += 1) {
    const draw = drawUniformIndex(stream, 7);
    stream = draw.stream;
    assert.equal(Number.isInteger(draw.log.result), true);
    assert.equal(draw.log.result >= 0 && draw.log.result < 7, true);
  }
});

test("random inputs are validated", () => {
  assert.throws(() => createRandomStream("", "stream"), RandomInvariantError);
  assert.throws(() => createRandomStream("seed", ""), RandomInvariantError);
  const stream = createRandomStream("seed", "stream");
  assert.throws(() => drawUniformIndex(stream, 0), RandomInvariantError);
  assert.throws(() => drawUniformIndex(stream, 1.5), RandomInvariantError);
  assert.throws(() => drawUniformIndex(stream, 0x1_0000_0001), RandomInvariantError);
});
