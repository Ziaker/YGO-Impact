import assert from "node:assert/strict";
import test from "node:test";

import {
  ActivationInvariantError,
  routeConfirmedActivation,
} from "../../src/core/index.ts";

test("an activation with an enemy target opens or joins a Chain", () => {
  assert.deepEqual(
    routeConfirmedActivation({
      hasEnemyTarget: true,
      immediate: false,
      isLegalReactionToOpenEnemyChain: false,
    }),
    {
      procedure: "add_to_chain",
      opensOrJoinsChain: true,
      suppressesAdditionalEffects: false,
    },
  );
});

test("self-only, allied, and map-only activations resolve without opening a Chain", () => {
  assert.deepEqual(
    routeConfirmedActivation({
      hasEnemyTarget: false,
      immediate: false,
      isLegalReactionToOpenEnemyChain: false,
    }),
    {
      procedure: "resolve_directly",
      opensOrJoinsChain: false,
      suppressesAdditionalEffects: false,
    },
  );
});

test("a legal allied defensive Reaction may join the enemy Chain that caused it", () => {
  const routing = routeConfirmedActivation({
    hasEnemyTarget: false,
    immediate: false,
    isLegalReactionToOpenEnemyChain: true,
  });
  assert.equal(routing.procedure, "add_to_chain");
  assert.equal(routing.opensOrJoinsChain, true);
});

test("IMMEDIATE always resolves outside the stack and suppresses additional effects", () => {
  for (const hasEnemyTarget of [false, true]) {
    const routing = routeConfirmedActivation({
      hasEnemyTarget,
      immediate: true,
      isLegalReactionToOpenEnemyChain: true,
    });
    assert.equal(routing.procedure, "resolve_immediately");
    assert.equal(routing.opensOrJoinsChain, false);
    assert.equal(routing.suppressesAdditionalEffects, true);
  }
});

test("activation routing rejects malformed runtime flags", () => {
  assert.throws(
    () => routeConfirmedActivation({ hasEnemyTarget: 1, immediate: false, isLegalReactionToOpenEnemyChain: false }),
    ActivationInvariantError,
  );
});
