import assert from "node:assert/strict";
import test from "node:test";

import { advanceStep, createConfiguredEngine, enqueueCommand } from "../../src/core/index.ts";

function card(name, kind) {
  return { definitionId: `${kind}:${name}`, name, kind };
}

function playerSetup() {
  return ["p1", "p2"].map((playerId) => ({
    playerId,
    initialMonsterCount: 4,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, index) =>
        card(`${playerId} monster ${index}`, index < 8 ? "normal_monster" : "effect_monster"),
      ),
      spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
        card(`${playerId} support ${index}`, index % 2 === 0 ? "spell" : "trap"),
      ),
      extraDeck: [],
    },
  }));
}

function queue(engine, issuer, kind, payload = {}) {
  return enqueueCommand(engine, { issuer, kind, payload });
}

function reachSecondTurnDraw(engine) {
  engine = queue(engine, "p1", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = queue(engine, "p2", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "turn.end_participation");
  engine = queue(engine, "p2", "turn.end_participation");
  engine = advanceStep(engine).engine;
  engine = queue(engine, "system", "turn.advance_completed_phase");
  return advanceStep(engine).engine;
}

function reachNextDraw(engine) {
  engine = advanceStep(queue(engine, "system", "turn.advance_completed_phase")).engine;
  engine = advanceStep(queue(engine, "system", "support.resolve_recovery")).engine;
  engine = advanceStep(queue(engine, "system", "turn.advance_completed_phase")).engine;
  engine = queue(engine, "p1", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = queue(engine, "p2", "turn.allocate_resources", { actions: 4, reactions: 4 });
  engine = advanceStep(engine).engine;
  engine = queue(engine, "p1", "turn.end_participation");
  engine = queue(engine, "p2", "turn.end_participation");
  engine = advanceStep(engine).engine;
  return advanceStep(queue(engine, "system", "turn.advance_completed_phase")).engine;
}

test("both locked choices resolve the draw phase atomically inside the engine", () => {
  let engine = reachSecondTurnDraw(createConfiguredEngine("draw-engine", playerSetup()));
  const before = engine.state.cardSetup.players.map((player) => ({
    monsters: player.monsterDeck.length,
    support: player.spellTrapDeck.length,
  }));
  engine = queue(engine, "p2", "cards.choose_draw_mode", { mode: "two_spell_traps" });
  engine = queue(engine, "p1", "cards.choose_draw_mode", { mode: "one_each" });
  const result = advanceStep(engine);

  assert.deepEqual(result.events.map((event) => event.type), ["command_accepted", "command_accepted"]);
  assert.deepEqual(result.engine.state.pendingDrawModes, []);
  assert.equal(result.engine.state.lastCompletedDrawTurn, 2);
  assert.equal(result.engine.state.cardSetup.players[0].monsterDeck.length, before[0].monsters - 1);
  assert.equal(result.engine.state.cardSetup.players[0].spellTrapDeck.length, before[0].support - 1);
  assert.equal(result.engine.state.cardSetup.players[1].monsterDeck.length, before[1].monsters);
  assert.equal(result.engine.state.cardSetup.players[1].spellTrapDeck.length, before[1].support - 2);
});

test("draw phase cannot be skipped and a player cannot replace a locked choice", () => {
  const initial = reachSecondTurnDraw(createConfiguredEngine("draw-guards", playerSetup()));
  const skipped = advanceStep(queue(initial, "system", "turn.advance_completed_phase"));
  assert.equal(skipped.events[0].type, "command_rejected");
  assert.equal(skipped.engine.state.turn.phase, "draw");

  let engine = advanceStep(
    queue(initial, "p1", "cards.choose_draw_mode", { mode: "two_monsters" }),
  ).engine;
  const duplicate = advanceStep(
    queue(engine, "p1", "cards.choose_draw_mode", { mode: "one_each" }),
  );
  assert.equal(duplicate.events[0].type, "command_rejected");
  assert.match(duplicate.events[0].reason, /already chose/);
});

test("configured Decks are mandatory and draw modes are validated", () => {
  let engine = reachSecondTurnDraw(createConfiguredEngine("draw-validation", playerSetup()));
  const invalidMode = advanceStep(
    queue(engine, "p1", "cards.choose_draw_mode", { mode: "anything" }),
  );
  assert.equal(invalidMode.events[0].type, "command_rejected");
  assert.match(invalidMode.events[0].reason, /Unknown draw mode/);
});

test("support recovery resolves exactly once before the decision phase", () => {
  let engine = reachSecondTurnDraw(createConfiguredEngine("support-phase", playerSetup()));
  engine = queue(engine, "p1", "cards.choose_draw_mode", { mode: "one_each" });
  engine = queue(engine, "p2", "cards.choose_draw_mode", { mode: "one_each" });
  engine = advanceStep(engine).engine;
  engine = advanceStep(queue(engine, "system", "turn.advance_completed_phase")).engine;
  assert.equal(engine.state.turn.phase, "support");

  const skipped = advanceStep(queue(engine, "system", "turn.advance_completed_phase"));
  assert.equal(skipped.events[0].type, "command_rejected");
  assert.match(skipped.events[0].reason, /before recovery resolves/);

  engine = advanceStep(queue(engine, "system", "support.resolve_recovery")).engine;
  assert.equal(engine.state.lastCompletedSupportTurn, 2);
  const duplicate = advanceStep(queue(engine, "system", "support.resolve_recovery"));
  assert.equal(duplicate.events[0].type, "command_rejected");
  assert.match(duplicate.events[0].reason, /already resolved/);

  engine = advanceStep(queue(engine, "system", "turn.advance_completed_phase")).engine;
  assert.equal(engine.state.turn.phase, "decision");
});

test("a Deck Out produced by the joint draw ends the match before another command", () => {
  let engine = reachSecondTurnDraw(createConfiguredEngine("engine-deck-out", playerSetup()));
  for (let drawNumber = 1; drawNumber <= 6; drawNumber += 1) {
    engine = queue(engine, "p1", "cards.choose_draw_mode", { mode: "two_spell_traps" });
    engine = queue(engine, "p2", "cards.choose_draw_mode", { mode: "two_monsters" });
    engine = advanceStep(engine).engine;
    if (drawNumber < 6) engine = reachNextDraw(engine);
  }

  assert.equal(engine.state.match.status, "finished");
  assert.equal(engine.state.match.winnerPlayerId, "p2");
  assert.equal(engine.state.cardSetup.players[0].spellTrapDeck.length, 0);
  assert.equal(engine.state.cardSetup.players[1].monsterDeck.length, 4);
});
