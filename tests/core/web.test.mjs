import assert from "node:assert/strict";
import test from "node:test";

import { WebGameSession } from "../../src/web/client.ts";
import { verifyReplay } from "../../src/core/index.ts";

test("WebGameSession: initializes match and executes human vs AI turns deterministically", () => {
  const session = new WebGameSession({
    seed: "web-session-test-seed",
    aiType: "tactical",
    player1Name: "Alice",
    aiName: "Bob_AI",
  });

  assert.equal(session.player1Id, "Alice");
  assert.equal(session.aiPlayerId, "Bob_AI");
  assert.equal(session.state.match.status, "active");
  assert.equal(session.state.turn.turnNumber, 1);
  // Canonical GDD rule: Turn 1 starts directly in Decision Phase
  assert.equal(session.state.turn.phase, "decision");

  // Step 1: Human allocates resources on Turn 1 (5 actions, 3 reactions)
  const allocSuccess = session.allocateHumanResources(5, 3);
  assert.equal(allocSuccess, true);

  // Turn advances to action phase
  assert.equal(session.state.turn.phase, "action");

  // Step 3: Human inspects hand and summons a monster
  const cardState = session.getHumanPlayerCardState();
  assert.ok(cardState !== undefined);
  assert.ok(cardState.hand.length > 0);

  const summonableMonster = cardState.hand.find((c) => {
    if (c.kind !== "normal_monster") return false;
    const def = session.getCardDefinition(c.definitionId);
    return def !== null && def.level <= 4;
  });
  assert.ok(summonableMonster !== undefined);

  const legalTiles = session.getLegalSummonTiles(null);
  assert.ok(legalTiles.length > 0);

  const dest = legalTiles[0];
  assert.ok(dest !== undefined);
  const summonSuccess = session.summonHumanMonster(
    summonableMonster.instanceId,
    dest,
    null,
    "attack",
  );
  assert.equal(summonSuccess, true);

  // Verify unit placed on map
  let humanMonsters = session.getHumanMonsters();
  assert.equal(humanMonsters.length, 1);
  assert.equal(humanMonsters[0]?.position.x, dest.x);
  assert.equal(humanMonsters[0]?.position.y, dest.y);

  // Step 3b: Test summoning a SECOND monster in the same game session (multi-summon bug regression)
  const secondMonster = session.getHumanPlayerCardState()?.hand.find((c) => {
    if (c.kind !== "normal_monster") return false;
    const def = session.getCardDefinition(c.definitionId);
    return def !== null && def.level <= 4;
  });
  if (secondMonster !== undefined) {
    // Calling getLegalSummonTiles without anchor should return the union around own units
    const legalTiles2 = session.getLegalSummonTiles();
    assert.ok(legalTiles2.length > 0, "Second summon must produce legal destinations around existing monster");

    const dest2 = legalTiles2[0];
    assert.ok(dest2 !== undefined);
    const summon2Success = session.summonHumanMonster(
      secondMonster.instanceId,
      dest2,
      null, // Auto-resolves anchor
      "attack",
    );
    assert.equal(summon2Success, true, "Second summon must succeed with auto-resolved anchor");

    humanMonsters = session.getHumanMonsters();
    assert.equal(humanMonsters.length, 2, "Player should now control 2 monsters on the map");
  }

  // Step 4: Setting a trap from hand (costs 0 actions!)
  const trapCard = cardState.hand.find((c) => c.kind === "trap");
  if (trapCard !== undefined) {
    const setSuccess = session.setTrap(trapCard.instanceId, 0);
    assert.equal(setSuccess, true);
  }

  // Step 5: Movement test for the summoned unit
  const unitId = humanMonsters[0].unitId;
  const reachable = session.getReachableTilesForUnit(unitId);
  if (reachable.length > 0) {
    const moveStep = reachable[0];
    const moveSuccess = session.moveHumanMonster(unitId, [moveStep]);
    assert.equal(moveSuccess, true);
  }

  // Step 6: End participation
  const endSuccess = session.endParticipation();
  assert.equal(endSuccess, true);

  // Step 7: Export authoritative replay and verify 100% determinism
  const replay = session.exportReplay();
  assert.ok(replay !== null);
  assert.equal(replay.playerIds[0], "Alice");
  assert.equal(replay.playerIds[1], "Bob_AI");
  assert.ok(replay.commands.length > 0);

  const verification = verifyReplay(replay, session.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("WebGameSession: enforces Fog of War visibility on enemy units", () => {
  const session = new WebGameSession({
    seed: "fog-session-test",
    aiType: "defensive",
    player1Name: "HumanPlayer",
    aiName: "EnemyAI",
  });

  // At setup, human only sees tiles around base (0, 8)
  const visibleTiles = session.getHumanVisibleTiles();
  assert.ok(visibleTiles.length > 0);
  assert.ok(visibleTiles.some((t) => t.x === 0 && t.y === 8));

  // Enemy base at (30, 8) is outside human initial 5-block vision
  assert.equal(session.isTileVisibleToHuman({ x: 30, y: 8 }), false);

  // Any enemy monsters placed in fog cannot appear in visibleEnemyMonsters
  const enemies = session.getVisibleEnemyMonsters();
  for (const enemy of enemies) {
    assert.ok(session.isTileVisibleToHuman(enemy.position));
  }
});
