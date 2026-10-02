#!/usr/bin/env node

import {
  createTacticalPolicy,
  createAggressivePolicy,
  CURATED_SPELL_TRAP_DEFINITIONS,
  PROTOTYPE_NORMAL_MONSTERS,
  runHeadlessMatch,
  verifyReplay,
} from "../src/core/index.ts";

function createPlayerSetup(playerId) {
  return {
    playerId,
    initialMonsterCount: 5,
    decks: {
      monsterDeck: PROTOTYPE_NORMAL_MONSTERS.map((def) => ({
        definitionId: def.definitionId,
        name: def.name,
        kind: "normal_monster",
      })),
      spellTrapDeck: [
        ...Array.from({ length: 3 }, () => ({
          definitionId: "sword-legend",
          name: "Sword of Legend",
          kind: "spell",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "rush-recklessly",
          name: "Rush Recklessly",
          kind: "spell",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "trap-hole",
          name: "Trap Hole",
          kind: "trap",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "magic-jammer",
          name: "Magic Jammer",
          kind: "trap",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "dian-keto",
          name: "Dian Keto the Cure Maiden",
          kind: "spell",
        })),
      ],
      extraDeck: [],
    },
  };
}

const seed = process.argv[2] ?? "autonomous-sim-seed-1";
console.log(`[Headless Simulation] Starting autonomous match with seed: ${seed}`);

const p1 = createPlayerSetup("player1");
const p2 = createPlayerSetup("player2");

const result = runHeadlessMatch({
  seed,
  players: ["player1", "player2"],
  playerSetups: [p1, p2],
  spellTrapDefinitions: CURATED_SPELL_TRAP_DEFINITIONS,
  policies: {
    player1: createTacticalPolicy("TacticianP1"),
    player2: createAggressivePolicy("AggressiveP2"),
  },
  maxTurns: 50,
  maxSteps: 5000,
  recordReplay: true,
});

console.log(`[Headless Simulation] Match finished!`);
console.log(`  - Status: ${result.match.status}`);
console.log(`  - Winner: ${result.winnerPlayerId ?? "Draw / None"}`);
console.log(`  - End Reason: ${result.endReason}`);
console.log(`  - Turns Completed: ${result.turnsCompleted}`);
console.log(`  - Steps Completed: ${result.stepsCompleted}`);
console.log(`  - Base Impacts Received:`);
for (const p of result.match.players) {
  console.log(`      * ${p.playerId}: ${p.baseImpactsReceived} / 5`);
}

if (!result.replay) {
  console.error(`[Headless Simulation] ERROR: Replay was not recorded.`);
  process.exit(1);
}

const verification = verifyReplay(result.replay, result.stepHashes);
if (!verification.matches) {
  console.error(`[Headless Simulation] ERROR: Replay divergence at step ${verification.firstDivergentStep}`);
  process.exit(1);
}

console.log(`[Headless Simulation] SUCCESS: 100% Deterministic Replay Hash Verification Passed!`);
process.exit(0);
