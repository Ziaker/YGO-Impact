import assert from "node:assert/strict";
import test from "node:test";

import {
  createAggressivePolicy,
  createDefaultPlayerSetup,
  createPassivePolicy,
  createTacticalPolicy,
  CURATED_SPELL_TRAP_DEFINITIONS,
  PROTOTYPE_NORMAL_MONSTERS,
  runHeadlessMatch,
  verifyReplay,
} from "../../src/core/index.ts";

test("headless match: aggressive policy vs passive policy produces 5 base impacts victory", () => {
  const result = runHeadlessMatch({
    seed: "headless-aggressive-vs-passive",
    players: ["aggressor", "defender"],
    policies: {
      aggressor: createAggressivePolicy("AggressiveP1"),
      defender: createPassivePolicy("PassiveP2"),
    },
    maxTurns: 30,
    maxSteps: 3000,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.equal(result.winnerPlayerId, "aggressor");
  assert.equal(result.endReason, "base_impacts");
  assert.equal(
    result.match.players.find((p) => p.playerId === "defender")?.baseImpactsReceived,
    5,
  );
  assert.equal(
    result.match.players.find((p) => p.playerId === "aggressor")?.baseImpactsReceived,
    0,
  );
  assert.ok(result.stepsCompleted > 0);
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("headless match: asymmetric deck consumption produces single-player deck out victory", () => {
  const result = runHeadlessMatch({
    seed: "headless-single-deck-out",
    players: ["drawer", "survivor"],
    policies: {
      // drawer pulls 2 monsters each turn from a 20-card deck (15 after opening hand)
      drawer: createPassivePolicy("Drawer", "two_monsters"),
      // survivor draws 1 each, consuming both decks more slowly
      survivor: createPassivePolicy("Survivor", "one_each"),
    },
    maxTurns: 30,
    maxSteps: 3000,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.equal(result.winnerPlayerId, "survivor");
  assert.equal(result.endReason, "deck_out");
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("headless match: symmetric passive policy produces simultaneous deck out", () => {
  const result = runHeadlessMatch({
    seed: "headless-simultaneous-deck-out",
    players: ["p1", "p2"],
    policies: {
      p1: createPassivePolicy("Passive1", "two_monsters"),
      p2: createPassivePolicy("Passive2", "two_monsters"),
    },
    maxTurns: 30,
    maxSteps: 3000,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.equal(result.winnerPlayerId, null);
  assert.equal(result.endReason, "simultaneous_deck_out");
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("headless match: deterministic execution guarantees identical hashes for identical seeds", () => {
  const run1 = runHeadlessMatch({
    seed: "deterministic-test-seed",
    players: ["alpha", "beta"],
    policies: {
      alpha: createAggressivePolicy(),
      beta: createPassivePolicy(),
    },
    maxTurns: 15,
  });

  const run2 = runHeadlessMatch({
    seed: "deterministic-test-seed",
    players: ["alpha", "beta"],
    policies: {
      alpha: createAggressivePolicy(),
      beta: createPassivePolicy(),
    },
    maxTurns: 15,
  });

  assert.equal(run1.match.status, run2.match.status);
  assert.equal(run1.winnerPlayerId, run2.winnerPlayerId);
  assert.equal(run1.endReason, run2.endReason);
  assert.equal(run1.stepsCompleted, run2.stepsCompleted);
  assert.deepEqual(run1.stepHashes, run2.stepHashes);
});

test("headless match: tactical policy with Spells and Traps runs full autonomous match and deterministically verifies replay", () => {
  const p1Setup = {
    playerId: "tactician",
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

  const p2Setup = {
    playerId: "defender",
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
          definitionId: "magic-jammer",
          name: "Magic Jammer",
          kind: "trap",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "trap-hole",
          name: "Trap Hole",
          kind: "trap",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "seven-tools",
          name: "Seven Tools of the Bandit",
          kind: "trap",
        })),
        ...Array.from({ length: 3 }, () => ({
          definitionId: "rush-recklessly",
          name: "Rush Recklessly",
          kind: "spell",
        })),
      ],
      extraDeck: [],
    },
  };

  const result = runHeadlessMatch({
    seed: "headless-tactical-match-seed",
    players: ["tactician", "defender"],
    playerSetups: [p1Setup, p2Setup],
    spellTrapDefinitions: CURATED_SPELL_TRAP_DEFINITIONS,
    policies: {
      tactician: createTacticalPolicy("TacticianP1"),
      defender: createPassivePolicy("PassiveP2"),
    },
    maxTurns: 30,
    maxSteps: 3000,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.equal(result.winnerPlayerId, "tactician");
  assert.equal(result.endReason, "base_impacts");
  assert.ok(result.stepsCompleted > 0);
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

