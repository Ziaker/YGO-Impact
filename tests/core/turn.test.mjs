import assert from "node:assert/strict";
import test from "node:test";

import {
  TURN_RESOURCE_BUDGET,
  TurnInvariantError,
  advanceCompletedPhase,
  confirmResourceUse,
  createFirstTurnState,
  createTurnView,
  endPlayerParticipation,
  settleResourceExhaustion,
  submitResourceAllocation,
} from "../../src/core/index.ts";

test("the first turn starts in decision with an eight-resource budget", () => {
  const state = createFirstTurnState(["p1", "p2"]);

  assert.equal(TURN_RESOURCE_BUDGET, 8);
  assert.equal(state.turnNumber, 1);
  assert.equal(state.phase, "decision");
  assert.deepEqual(state.players.map((player) => player.allocation), [null, null]);
  assert.deepEqual(state.players.map((player) => player.remaining), [null, null]);
});

test("the first prototype requires two distinct non-empty players", () => {
  assert.throws(() => createFirstTurnState(["p1"]), TurnInvariantError);
  assert.throws(() => createFirstTurnState(["p1", "p1"]), TurnInvariantError);
  assert.throws(() => createFirstTurnState(["p1", "  "]), TurnInvariantError);
});

test("all zero-to-eight splits are accepted", () => {
  for (let actions = 0; actions <= TURN_RESOURCE_BUDGET; actions += 1) {
    const state = createFirstTurnState(["p1", "p2"]);
    const allocated = submitResourceAllocation(state, "p1", {
      actions,
      reactions: TURN_RESOURCE_BUDGET - actions,
    });
    assert.deepEqual(allocated.players[0].allocation, {
      actions,
      reactions: TURN_RESOURCE_BUDGET - actions,
    });
  }
});

test("invalid resource allocations are rejected", () => {
  const state = createFirstTurnState(["p1", "p2"]);

  assert.throws(
    () => submitResourceAllocation(state, "p1", { actions: 4, reactions: 3 }),
    /total exactly 8/,
  );
  assert.throws(
    () => submitResourceAllocation(state, "p1", { actions: -1, reactions: 9 }),
    /non-negative safe integer/,
  );
  assert.throws(
    () => submitResourceAllocation(state, "p1", { actions: 1.5, reactions: 6.5 }),
    /non-negative safe integer/,
  );
  assert.throws(
    () => submitResourceAllocation(state, "unknown", { actions: 4, reactions: 4 }),
    /Unknown player/,
  );
});

test("a player commits only one allocation per turn", () => {
  const state = submitResourceAllocation(createFirstTurnState(["p1", "p2"]), "p1", {
    actions: 5,
    reactions: 3,
  });

  assert.throws(
    () => submitResourceAllocation(state, "p1", { actions: 4, reactions: 4 }),
    /already committed/,
  );
});

test("the action phase starts only after both players commit", () => {
  const initial = createFirstTurnState(["p1", "p2"]);
  const oneCommitted = submitResourceAllocation(initial, "p2", { actions: 0, reactions: 8 });
  const bothCommitted = submitResourceAllocation(oneCommitted, "p1", { actions: 8, reactions: 0 });

  assert.equal(oneCommitted.phase, "decision");
  assert.equal(bothCommitted.phase, "action");
  assert.throws(
    () => submitResourceAllocation(bothCommitted, "p1", { actions: 4, reactions: 4 }),
    /only allowed during the decision phase/,
  );
});

test("each player sees only their own distribution throughout the turn", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 6, reactions: 2 });
  state = submitResourceAllocation(state, "p2", { actions: 3, reactions: 5 });

  const p1View = createTurnView(state, "p1");
  const p2View = createTurnView(state, "p2");

  assert.deepEqual(p1View.players[0].allocation, { actions: 6, reactions: 2 });
  assert.deepEqual(p1View.players[0].remaining, { actions: 6, reactions: 2 });
  assert.equal("allocation" in p1View.players[1], false);
  assert.equal("remaining" in p1View.players[1], false);
  assert.equal("allocation" in p2View.players[0], false);
  assert.equal("remaining" in p2View.players[0], false);
  assert.deepEqual(p2View.players[1].allocation, { actions: 3, reactions: 5 });
  assert.equal(p1View.players[1].allocationCommitted, true);
});

test("turn state and player views are deeply immutable", () => {
  const state = submitResourceAllocation(createFirstTurnState(["p1", "p2"]), "p1", {
    actions: 4,
    reactions: 4,
  });
  const view = createTurnView(state, "p1");

  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.players), true);
  assert.equal(Object.isFrozen(state.players[0].allocation), true);
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.players), true);
});

test("a resource is consumed only at the explicit confirmation boundary", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 5, reactions: 3 });
  state = submitResourceAllocation(state, "p2", { actions: 4, reactions: 4 });

  const afterAction = confirmResourceUse(state, "p1", "action");
  const afterReaction = confirmResourceUse(afterAction, "p1", "reaction");

  assert.deepEqual(state.players[0].remaining, { actions: 5, reactions: 3 });
  assert.deepEqual(afterAction.players[0].remaining, { actions: 4, reactions: 3 });
  assert.deepEqual(afterReaction.players[0].remaining, { actions: 4, reactions: 2 });
  assert.deepEqual(afterReaction.players[0].allocation, { actions: 5, reactions: 3 });
});

test("resources cannot be consumed before action or after voluntary exit", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 4, reactions: 4 });
  assert.throws(() => confirmResourceUse(state, "p1", "action"), /action phase/);

  state = submitResourceAllocation(state, "p2", { actions: 4, reactions: 4 });
  state = endPlayerParticipation(state, "p1");
  assert.throws(() => confirmResourceUse(state, "p1", "reaction"), /ended participation/);
});

test("a resource category cannot be spent below zero", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 8, reactions: 0 });
  state = submitResourceAllocation(state, "p2", { actions: 0, reactions: 8 });

  assert.throws(() => confirmResourceUse(state, "p1", "reaction"), /no reaction resources/);
  assert.throws(() => confirmResourceUse(state, "p2", "action"), /no action resources/);
  assert.throws(() => confirmResourceUse(state, "p1", "unknown"), /Unknown resource kind/);
});

test("voluntary exit loses remaining resources without stopping the opponent", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 6, reactions: 2 });
  state = submitResourceAllocation(state, "p2", { actions: 3, reactions: 5 });
  state = confirmResourceUse(state, "p1", "action");
  state = endPlayerParticipation(state, "p1");

  assert.equal(state.phase, "action");
  assert.equal(state.players[0].participationEnded, true);
  assert.deepEqual(state.players[0].remaining, { actions: 0, reactions: 0 });
  assert.deepEqual(state.players[1].remaining, { actions: 3, reactions: 5 });

  state = confirmResourceUse(state, "p2", "action");
  assert.deepEqual(state.players[1].remaining, { actions: 2, reactions: 5 });
});

test("the turn reaches end when both players voluntarily exit", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 4, reactions: 4 });
  state = submitResourceAllocation(state, "p2", { actions: 4, reactions: 4 });
  state = endPlayerParticipation(state, "p1");
  state = endPlayerParticipation(state, "p2");

  assert.equal(state.phase, "end");
  assert.throws(() => endPlayerParticipation(state, "p1"), /action phase/);
});

test("resource conversion waits until every chain and cross chain is closed", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 1, reactions: 7 });
  state = submitResourceAllocation(state, "p2", { actions: 6, reactions: 2 });
  state = confirmResourceUse(state, "p1", "action");

  const whileOpen = settleResourceExhaustion(state, 1, ["p1"]);
  const afterClose = settleResourceExhaustion(whileOpen, 0, ["p1"]);

  assert.equal(whileOpen, state);
  assert.deepEqual(afterClose.players[0].remaining, { actions: 7, reactions: 0 });
  assert.deepEqual(afterClose.players[1].remaining, { actions: 0, reactions: 8 });
  assert.equal(afterClose.players[0].conversionUsed, true);
  assert.equal(afterClose.players[1].conversionUsed, false);
});

test("each player participates in resource conversion at most once per turn", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 0, reactions: 8 });
  state = submitResourceAllocation(state, "p2", { actions: 8, reactions: 0 });
  state = settleResourceExhaustion(state, 0, ["p1"]);

  const secondSettlement = settleResourceExhaustion(state, 0, ["p1"]);
  assert.equal(secondSettlement, state);
  assert.deepEqual(secondSettlement.players[0].remaining, { actions: 8, reactions: 0 });
  assert.deepEqual(secondSettlement.players[1].remaining, { actions: 0, reactions: 8 });
});

test("simultaneous action exhaustion ends the turn without conversion", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 1, reactions: 7 });
  state = submitResourceAllocation(state, "p2", { actions: 1, reactions: 7 });
  state = confirmResourceUse(state, "p1", "action");
  state = confirmResourceUse(state, "p2", "action");
  state = settleResourceExhaustion(state, 0, ["p1", "p2"]);

  assert.equal(state.phase, "end");
  assert.equal(state.players[0].conversionUsed, false);
  assert.equal(state.players[1].conversionUsed, false);
  assert.deepEqual(state.players[0].remaining, { actions: 0, reactions: 7 });
  assert.deepEqual(state.players[1].remaining, { actions: 0, reactions: 7 });
});

test("an exited player does not prevent the remaining player from acting", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 4, reactions: 4 });
  state = submitResourceAllocation(state, "p2", { actions: 1, reactions: 7 });
  state = endPlayerParticipation(state, "p1");

  assert.equal(settleResourceExhaustion(state, 0, []), state);
  state = confirmResourceUse(state, "p2", "action");
  state = settleResourceExhaustion(state, 0, ["p2"]);
  assert.equal(state.phase, "action");
  assert.deepEqual(state.players[1].remaining, { actions: 7, reactions: 0 });
  assert.equal(state.players[1].conversionUsed, true);
});

test("interaction counts are validated before resource settlement", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 4, reactions: 4 });
  state = submitResourceAllocation(state, "p2", { actions: 4, reactions: 4 });

  assert.throws(() => settleResourceExhaustion(state, -1, ["p1"]), /non-negative safe integer/);
  assert.throws(() => settleResourceExhaustion(state, 0.5, ["p1"]), /non-negative safe integer/);
  assert.throws(() => settleResourceExhaustion(state, 0, ["p1", "p1"]), /more than once/);
});

test("later turns follow draw, support, decision, action, and end", () => {
  let state = createFirstTurnState(["p1", "p2"]);
  state = submitResourceAllocation(state, "p1", { actions: 4, reactions: 4 });
  state = submitResourceAllocation(state, "p2", { actions: 4, reactions: 4 });
  state = endPlayerParticipation(state, "p1");
  state = endPlayerParticipation(state, "p2");

  state = advanceCompletedPhase(state);
  assert.equal(state.turnNumber, 2);
  assert.equal(state.phase, "draw");
  assert.deepEqual(state.players.map((player) => player.allocation), [null, null]);
  assert.deepEqual(state.players.map((player) => player.remaining), [null, null]);

  state = advanceCompletedPhase(state);
  assert.equal(state.phase, "support");
  state = advanceCompletedPhase(state);
  assert.equal(state.phase, "decision");

  assert.throws(() => advanceCompletedPhase(state), /own completion rules/);
});
