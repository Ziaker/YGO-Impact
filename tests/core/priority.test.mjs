import assert from "node:assert/strict";
import test from "node:test";

import {
  PriorityInvariantError,
  alternatePriorityToken,
  createPriorityToken,
  drawInitialPriorityToken,
  orderSimultaneousByPriority,
} from "../../src/core/index.ts";

test("the recorded coin-toss winner receives the initial priority token", () => {
  const token = createPriorityToken(["p1", "p2"], "p2");
  assert.equal(token.holderPlayerId, "p2");
  assert.equal(Object.isFrozen(token), true);
  assert.equal(Object.isFrozen(token.playerIds), true);
});

test("priority alternates between players at turn boundaries", () => {
  const first = createPriorityToken(["p1", "p2"], "p1");
  const second = alternatePriorityToken(first);
  const third = alternatePriorityToken(second);

  assert.equal(second.holderPlayerId, "p2");
  assert.equal(third.holderPlayerId, "p1");
});

test("simultaneous events put the token holder first and preserve controller order", () => {
  const token = createPriorityToken(["p1", "p2"], "p2");
  const events = [
    { playerId: "p1", id: "a" },
    { playerId: "p2", id: "b" },
    { playerId: "p2", id: "c" },
    { playerId: "p1", id: "d" },
  ];
  const ordered = orderSimultaneousByPriority(events, token, (event) => event.playerId);

  assert.deepEqual(ordered.map((event) => event.id), ["b", "c", "a", "d"]);
});

test("priority rejects invalid players and holders", () => {
  assert.throws(() => createPriorityToken(["p1"], "p1"), PriorityInvariantError);
  assert.throws(() => createPriorityToken(["p1", "p1"], "p1"), PriorityInvariantError);
  assert.throws(() => createPriorityToken(["p1", "p2"], "p3"), /Unknown initial priority holder/);

  const token = createPriorityToken(["p1", "p2"], "p1");
  assert.throws(
    () => orderSimultaneousByPriority([{ playerId: "p3" }], token, (event) => event.playerId),
    /Unknown simultaneous-event player/,
  );
});

test("the initial coin toss is uniform, seeded, and auditable", () => {
  const first = drawInitialPriorityToken(["p1", "p2"], "coin-seed");
  const replay = drawInitialPriorityToken(["p1", "p2"], "coin-seed");

  assert.deepEqual(first, replay);
  assert.equal(["p1", "p2"].includes(first.token.holderPlayerId), true);
  assert.equal(first.randomLog.streamId, "priority-token");
  assert.equal(first.randomLog.upperExclusive, 2);
  assert.equal(first.randomLog.position, 1);
});
