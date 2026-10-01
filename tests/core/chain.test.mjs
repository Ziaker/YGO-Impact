import assert from "node:assert/strict";
import test from "node:test";

import {
  CROSS_CHAIN_ADDITION_LIMIT,
  ChainInvariantError,
  addChainElement,
  createChainSystem,
  negateChainElement,
  openChainWindow,
  openChain,
  passChainPriority,
  confirmChainResponse,
  resolveNextChain,
} from "../../src/core/index.ts";

test("a Chain window gives the opponent first response and closes after the initiator passes", () => {
  let window = openChainWindow("chain-1", "p1", "p2");
  assert.equal(window.priorityPlayerId, "p2");
  assert.equal(window.stage, "reaction");

  window = passChainPriority(window, "p2");
  assert.equal(window.priorityPlayerId, "p1");
  assert.equal(window.stage, "initiator_addition");

  window = passChainPriority(window, "p1");
  assert.equal(window.stage, "closed");
  assert.throws(() => passChainPriority(window, "p1"), /already closed/);
});

test("a confirmed response returns priority to the other player", () => {
  const window = openChainWindow("chain-1", "p1", "p2");
  const responded = confirmChainResponse(window, "p2", "p1");
  assert.equal(responded.priorityPlayerId, "p1");
  assert.equal(responded.stage, "initiator_addition");
  assert.throws(() => confirmChainResponse(window, "p1", "p2"), /does not have priority/);
});

function element(elementId, targetIds = [], overrides = {}) {
  return {
    elementId,
    controllerId: "p1",
    kind: "action",
    targetIds,
    requiresAllTargets: false,
    negated: false,
    ...overrides,
  };
}

function resolve(system, targets = ["a", "b", "c"]) {
  return resolveNextChain(system, { targets: new Set(targets), applied: [] }, {
    isTargetValid: (state, targetId) => state.targets.has(targetId),
    applyElement: (state, current, validTargetIds) => ({
      ...state,
      applied: [...state.applied, [current.elementId, ...validTargetIds]],
    }),
  });
}

test("a Chain resolves in reverse declaration order", () => {
  let system = openChain(createChainSystem(), "chain-1", "normal", element("first", ["a"]));
  system = addChainElement(system, "chain-1", element("second", ["b"]));
  system = addChainElement(system, "chain-1", element("third", ["c"]));
  const result = resolve(system);

  assert.deepEqual(result.outcomes.map((outcome) => outcome.elementId), ["third", "second", "first"]);
  assert.deepEqual(result.state.applied.map((entry) => entry[0]), ["third", "second", "first"]);
  assert.equal(result.system.pendingChains.length, 0);
});

test("invalid targets are ignored individually unless all are required", () => {
  let system = openChain(createChainSystem(), "chain-1", "normal", element("partial", ["a", "missing"]));
  system = addChainElement(
    system,
    "chain-1",
    element("all-required", ["b", "missing"], { requiresAllTargets: true }),
  );
  const result = resolve(system, ["a", "b"]);

  assert.equal(result.outcomes[0].status, "failed");
  assert.equal(result.outcomes[1].status, "resolved");
  assert.deepEqual(result.outcomes[1].validTargetIds, ["a"]);
  assert.deepEqual(result.outcomes[1].invalidTargetIds, ["missing"]);
});

test("an element with no valid target fails without canceling independent responses", () => {
  let system = openChain(createChainSystem(), "chain-1", "normal", element("original", ["missing"]));
  system = addChainElement(system, "chain-1", element("response", ["a"]));
  const result = resolve(system, ["a"]);

  assert.deepEqual(result.outcomes.map((outcome) => outcome.status), ["resolved", "failed"]);
  assert.deepEqual(result.state.applied, [["response", "a"]]);
});

test("negating one element does not cancel the elements added in response", () => {
  let system = openChain(createChainSystem(), "chain-1", "normal", element("original", ["a"]));
  system = addChainElement(system, "chain-1", element("response", ["b"]));
  system = negateChainElement(system, "chain-1", "original");
  const result = resolve(system);

  assert.deepEqual(result.outcomes.map((outcome) => outcome.status), ["resolved", "negated"]);
  assert.deepEqual(result.state.applied, [["response", "b"]]);
});

test("independent Chains resolve by registration before later state revalidation", () => {
  let system = openChain(createChainSystem(), "first", "normal", element("remove-a", ["a"]));
  system = openChain(system, "second", "normal", element("use-a", ["a"]));
  const hooks = {
    isTargetValid: (state, targetId) => state.targets.has(targetId),
    applyElement: (state, current) => {
      const targets = new Set(state.targets);
      if (current.elementId === "remove-a") targets.delete("a");
      return { targets };
    },
  };
  const first = resolveNextChain(system, { targets: new Set(["a"]) }, hooks);
  const second = resolveNextChain(first.system, first.state, hooks);

  assert.equal(first.outcomes[0].elementId, "remove-a");
  assert.equal(second.outcomes[0].status, "failed");
});

test("Cross Chains allow only three additions beyond the initial element", () => {
  let system = openChain(createChainSystem(), "cross", "cross", element("initial"));
  for (let index = 1; index <= CROSS_CHAIN_ADDITION_LIMIT; index += 1) {
    system = addChainElement(system, "cross", element(`addition-${index}`));
  }
  assert.equal(system.pendingChains[0].elements.length, 4);
  assert.throws(
    () => addChainElement(system, "cross", element("illegal-fourth")),
    /allowed additions/,
  );
});

test("normal Chains have no artificial depth limit", () => {
  let system = openChain(createChainSystem(), "normal", "normal", element("initial"));
  for (let index = 0; index < 100; index += 1) {
    system = addChainElement(system, "normal", element(`response-${index}`));
  }
  assert.equal(system.pendingChains[0].elements.length, 101);
});

test("Chain identifiers, targets, and element identifiers are validated", () => {
  const system = openChain(createChainSystem(), "chain", "normal", element("element", ["a"]));
  assert.throws(() => openChain(system, "chain", "normal", element("other")), ChainInvariantError);
  assert.throws(() => addChainElement(system, "chain", element("element")), /already exists/);
  assert.throws(() => addChainElement(system, "missing", element("other")), /Unknown Chain/);
  assert.throws(
    () => addChainElement(system, "chain", element("duplicate-target", ["a", "a"])),
    /duplicate target/,
  );
});
