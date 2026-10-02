import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceStep,
  createAggressiveAI,
  createDefensiveAI,
  createDefaultPlayerSetup,
  createGameEngine,
  createTacticalAI,
  CURATED_SPELL_TRAP_DEFINITIONS,
  enqueueCommand,
  PROTOTYPE_NORMAL_MONSTERS,
  runHeadlessMatch,
  verifyReplay,
} from "../../src/core/index.ts";

/**
 * Helper to compute the total cards accounted for a given player in simulation state.
 */
function computeTotalPlayerCards(state, playerId) {
  let count = 0;

  // 1. Player Card Setup (Deck, Hand, Graveyard, Extra Deck)
  const playerCardState = state.cardSetup?.players.find((p) => p.playerId === playerId);
  if (playerCardState) {
    count += playerCardState.monsterDeck.length;
    count += playerCardState.spellTrapDeck.length;
    count += playerCardState.extraDeck.length;
    count += playerCardState.hand.length;
    count += playerCardState.graveyard.length;
  }

  // 2. Monsters on Map belonging to player
  const playerMonsters = state.monsters.filter((m) => m.ownerPlayerId === playerId);
  count += playerMonsters.length;

  // 3. Equipped Spells on monsters
  for (const monster of state.monsters) {
    if (monster.equippedCards) {
      for (const equip of monster.equippedCards) {
        if (equip.instanceId.startsWith(playerId)) {
          count += 1;
        }
      }
    }
  }

  // 4. Trap Slots
  const playerTraps = state.trapSlots?.find((p) => p.playerId === playerId);
  if (playerTraps) {
    for (const slot of playerTraps.slots) {
      if (slot.card !== null) {
        count += 1;
      }
    }
  }

  // 5. Resolution Zone
  if (state.resolutionZone) {
    for (const card of state.resolutionZone) {
      if (card.controllerPlayerId === playerId) {
        count += 1;
      }
    }
  }

  return count;
}

test("Fuzzing & Invariants: Card conservation holds across 100% of headless match steps", () => {
  const seeds = ["fuzz-seed-alpha", "fuzz-seed-beta", "fuzz-seed-gamma"];

  for (const seed of seeds) {
    const match = runHeadlessMatch({
      seed,
      players: ["P1_Tactical", "P2_Aggressive"],
      policies: {
        P1_Tactical: createTacticalAI("P1_Tactical"),
        P2_Aggressive: createAggressiveAI("P2_Aggressive"),
      },
      maxTurns: 8,
      maxSteps: 150,
    });

    assert.ok(match.stepsCompleted > 0, `Match with seed ${seed} did not execute any steps.`);

    // Invariant 1: Total cards for P1 and P2 must equal 35 (20 monsters + 15 spell/traps) at match end
    const p1Cards = computeTotalPlayerCards(match.engine.state, "P1_Tactical");
    const p2Cards = computeTotalPlayerCards(match.engine.state, "P2_Aggressive");

    assert.equal(p1Cards, 35, `Card conservation failed for P1 with seed ${seed}: found ${p1Cards} cards.`);
    assert.equal(p2Cards, 35, `Card conservation failed for P2 with seed ${seed}: found ${p2Cards} cards.`);

    // Invariant 2: 100% bit-to-bit deterministic replay verification
    const verification = verifyReplay(match.replay, match.stepHashes);
    assert.equal(
      verification.matches,
      true,
      `Deterministic replay failed for seed ${seed} at step ${verification.firstDivergentStep}`,
    );
  }
});

test("Fuzzing & Invariants: Spatial integrity, non-overlap, and map boundary invariants", () => {
  const seeds = ["spatial-fuzz-1", "spatial-fuzz-2"];

  for (const seed of seeds) {
    const match = runHeadlessMatch({
      seed,
      players: ["P1_Aggressive", "P2_Defensive"],
      policies: {
        P1_Aggressive: createAggressiveAI("P1_Aggressive"),
        P2_Defensive: createDefensiveAI("P2_Defensive"),
      },
      maxTurns: 6,
      maxSteps: 120,
    });

    const state = match.engine.state;
    const occupiedTiles = new Set();

    for (const monster of state.monsters) {
      // 1. Within 31x17 map bounds
      assert.ok(
        monster.position.x >= 0 && monster.position.x < 31,
        `Monster ${monster.unitId} out of bounds X: ${monster.position.x}`,
      );
      assert.ok(
        monster.position.y >= 0 && monster.position.y < 17,
        `Monster ${monster.unitId} out of bounds Y: ${monster.position.y}`,
      );

      // 2. Cannot occupy base tiles (0, 8) or (30, 8)
      assert.ok(
        !(monster.position.x === 0 && monster.position.y === 8),
        `Monster ${monster.unitId} illegally occupies base (0, 8)`,
      );
      assert.ok(
        !(monster.position.x === 30 && monster.position.y === 8),
        `Monster ${monster.unitId} illegally occupies base (30, 8)`,
      );

      // 3. Tile collision invariance
      const key = `${monster.position.x},${monster.position.y}`;
      assert.ok(!occupiedTiles.has(key), `Tile collision detected on tile (${key}) for unit ${monster.unitId}`);
      occupiedTiles.add(key);

      // 4. Vitals non-negativity and clamping
      assert.ok(monster.hp.current >= 0, `Monster ${monster.unitId} HP is negative: ${monster.hp.current}`);
      assert.ok(monster.hp.current <= monster.hp.maximum, `Monster ${monster.unitId} HP exceeds max: ${monster.hp.current}`);
      assert.ok(monster.spd.current >= 0, `Monster ${monster.unitId} SPD is negative: ${monster.spd.current}`);
      assert.ok(monster.spd.current <= monster.spd.maximum, `Monster ${monster.unitId} SPD exceeds max: ${monster.spd.current}`);
    }

    // 5. At most 5 monsters per player
    const p1Count = state.monsters.filter((m) => m.ownerPlayerId === "P1_Aggressive").length;
    const p2Count = state.monsters.filter((m) => m.ownerPlayerId === "P2_Defensive").length;
    assert.ok(p1Count <= 5, `P1 exceeded max 5 monsters: ${p1Count}`);
    assert.ok(p2Count <= 5, `P2 exceeded max 5 monsters: ${p2Count}`);
  }
});

test("Fuzzing & Invariants: Adversarial command fuzzing gracefully rejects malformed inputs without crashing", () => {
  const p1 = "Tester1";
  const p2 = "Tester2";
  const playerSetups = [
    createDefaultPlayerSetup(p1, 5),
    createDefaultPlayerSetup(p2, 5),
  ];
  const bases = [
    { playerId: p1, position: { x: 0, y: 8 } },
    { playerId: p2, position: { x: 30, y: 8 } },
  ];

  let engine = createGameEngine(
    "fuzz-crash-test-seed",
    playerSetups,
    bases,
    PROTOTYPE_NORMAL_MONSTERS,
    [],
    [],
    CURATED_SPELL_TRAP_DEFINITIONS,
  );

  // Array of malformed, corrupt, or illegal commands
  const corruptCommands = [
    // 1. Wrong phase commands
    { issuer: p1, kind: "battle.declare_basic_attack", payload: { attackerUnitId: "nonexistent", defenderUnitId: "fake" } },
    { issuer: p1, kind: "monster.move_basic", payload: { unitId: "nonexistent", path: [{ x: 50, y: 50 }] } },
    // 2. Illegal resource allocations
    { issuer: p1, kind: "turn.allocate_resources", payload: { actions: 10, reactions: 10 } },
    { issuer: p1, kind: "turn.allocate_resources", payload: { actions: -5, reactions: 13 } },
    // 3. Illegal draw modes
    { issuer: p1, kind: "cards.choose_draw_mode", payload: { mode: "five_hundred_cards" } },
    // 4. Illegal summons with out of bounds coordinates
    { issuer: p1, kind: "summon.normal", payload: { cardInstanceId: "fake:card", unitId: "unit:1", destination: { x: 999, y: 999 }, battlePosition: "attack" } },
    // 5. Invalid battle positions
    { issuer: p1, kind: "summon.normal", payload: { cardInstanceId: "fake:card", unitId: "unit:1", destination: { x: 1, y: 8 }, battlePosition: "flying" } },
    // 6. Non-existent chain priority pass
    { issuer: p1, kind: "chain.pass_priority", payload: { chainId: "bogus-chain-id" } },
    // 7. Non-existent trap activation
    { issuer: p1, kind: "trap.activate", payload: { slotIndex: 99, chainId: "fake-chain" } },
    // 8. Base attacks from non-existent units
    { issuer: p1, kind: "battle.declare_base_attack", payload: { attackerUnitId: "ghost_unit", defenderPlayerId: p2 } },
    // 9. Unauthorized system commands
    { issuer: p1, kind: "turn.advance_completed_phase", payload: {} },
    { issuer: "hacker", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
  ];

  for (const cmd of corruptCommands) {
    engine = enqueueCommand(engine, cmd);
    const stepResult = advanceStep(engine);
    engine = stepResult.engine;

    // Must gracefully produce command_rejected event
    assert.ok(
      stepResult.events.some((e) => e.type === "command_rejected"),
      `Expected command ${cmd.kind} by ${cmd.issuer} to be rejected, but was accepted or silent.`,
    );

    // State hash must remain non-empty and safe
    assert.ok(engine.stateHash.length === 16, `Corrupt state hash: ${engine.stateHash}`);
    assert.ok(engine.state.match.status === "active", `Match prematurely terminated on rejected command ${cmd.kind}`);
  }
});
