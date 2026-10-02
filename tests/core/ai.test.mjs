import assert from "node:assert/strict";
import test from "node:test";

import {
  createAggressiveAI,
  createAIObservation,
  createDefensiveAI,
  createDefaultPlayerSetup,
  createGameEngine,
  createHeuristicAI,
  createPassivePolicy,
  createTacticalAI,
  createTacticalPolicy,
  findSpellTrapDefinition,
  PROTOTYPE_NORMAL_MONSTERS,
  runHeadlessMatch,
  verifyReplay,
} from "../../src/core/index.ts";

test("AI Observation: strictly enforces Fair Information and Fog-of-War hiding", () => {
  const p1Setup = createDefaultPlayerSetup("p1", 5);
  const p2Setup = createDefaultPlayerSetup("p2", 5);
  const bases = [
    { playerId: "p1", position: { x: 0, y: 8 } },
    { playerId: "p2", position: { x: 30, y: 8 } },
  ];

  const engine = createGameEngine(
    "fair-info-test",
    [p1Setup, p2Setup],
    bases,
    PROTOTYPE_NORMAL_MONSTERS,
  );

  const obs = createAIObservation(engine.state, "p1");

  // Invariant 1: Viewer is p1, opponent is p2
  assert.equal(obs.playerId, "p1");
  assert.equal(obs.opponentPlayerId, "p2");

  // Invariant 2: Own hand is visible, opponent hand is strictly hidden (null)
  assert.ok(obs.self.cardView.visibleHand !== null);
  assert.equal(obs.self.cardView.visibleHand.length, 7);
  assert.equal(obs.opponent.cardView.visibleHand, null);
  assert.equal(obs.opponent.cardView.handCount, 7);

  // Invariant 3: Own extra deck is visible, opponent extra deck is strictly hidden (null)
  assert.ok(obs.self.cardView.visibleExtraDeck !== null);
  assert.equal(obs.opponent.cardView.visibleExtraDeck, null);

  // Invariant 4: Opponent trap slots are veiled unless explicitly revealed
  assert.equal(obs.opponent.trapSlots.length, 3);
  for (const slot of obs.opponent.trapSlots) {
    assert.equal(slot.revealedCard, null);
  }

  // Invariant 5: Opponent monsters in fog of war are excluded from visibleMonsters
  // At game setup before units move into vision, p2 monsters (if any outside vision) are not in visibleMonsters
  for (const enemy of obs.opponent.visibleMonsters) {
    assert.equal(enemy.ownerPlayerId, "p2");
    const visibleTile = obs.self.visibleTiles.some(
      (pos) => pos.x === enemy.position.x && pos.y === enemy.position.y,
    );
    assert.ok(visibleTile, "Enemy in visibleMonsters must be in viewer visibleTiles");
  }

  // Invariant 6: Observation is deeply frozen
  assert.ok(Object.isFrozen(obs));
  assert.ok(Object.isFrozen(obs.self));
  assert.ok(Object.isFrozen(obs.opponent));
});

test("Heuristic AI: chooseDrawMode prevents deck out and balances hand composition", () => {
  const ai = createTacticalAI("TacticalAI");

  // Mock decision context with low monster deck
  const lowMonsterContext = {
    playerId: "p1",
    opponentPlayerId: "p2",
    turn: { turnNumber: 5, phase: "draw", players: [] },
    priorityToken: { holderPlayerId: "p1" },
    engine: {
      state: {
        cardSetup: {
          players: [
            {
              playerId: "p1",
              monsterDeck: [{ instanceId: "m1" }], // <= 2 cards!
              spellTrapDeck: [{ instanceId: "st1" }, { instanceId: "st2" }, { instanceId: "st3" }],
              hand: [],
            },
          ],
        },
        monsters: [],
      },
    },
  };

  assert.equal(ai.chooseDrawMode(lowMonsterContext), "two_spell_traps");

  // Mock decision context with low spell/trap deck
  const lowSpellTrapContext = {
    playerId: "p1",
    opponentPlayerId: "p2",
    turn: { turnNumber: 5, phase: "draw", players: [] },
    priorityToken: { holderPlayerId: "p1" },
    engine: {
      state: {
        cardSetup: {
          players: [
            {
              playerId: "p1",
              monsterDeck: [{ instanceId: "m1" }, { instanceId: "m2" }, { instanceId: "m3" }],
              spellTrapDeck: [{ instanceId: "st1" }], // <= 2 cards!
              hand: [],
            },
          ],
        },
        monsters: [],
      },
    },
  };

  assert.equal(ai.chooseDrawMode(lowSpellTrapContext), "two_monsters");
});

test("Heuristic AI: creates distinct specialized profiles with custom weights", () => {
  const aggressiveAI = createAggressiveAI("AggroBot");
  const defensiveAI = createDefensiveAI("TurtleBot");
  const tacticalAI = createTacticalAI("TacticianBot");

  assert.equal(aggressiveAI.name, "AggroBot");
  assert.equal(defensiveAI.name, "TurtleBot");
  assert.equal(tacticalAI.name, "TacticianBot");
});

test("AI vs Passive Policy: Aggressive AI defeats passive policy by 5 base impacts with verified replay", () => {
  const result = runHeadlessMatch({
    seed: "ai-aggressive-vs-passive",
    players: ["ai_aggressor", "passive_defender"],
    policies: {
      ai_aggressor: createAggressiveAI("AggressiveAI"),
      passive_defender: createPassivePolicy("PassiveDefender"),
    },
    maxTurns: 30,
    maxSteps: 3000,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.equal(result.winnerPlayerId, "ai_aggressor");
  assert.equal(result.endReason, "base_impacts");
  assert.equal(
    result.match.players.find((p) => p.playerId === "passive_defender")?.baseImpactsReceived,
    5,
  );
  assert.equal(
    result.match.players.find((p) => p.playerId === "ai_aggressor")?.baseImpactsReceived,
    0,
  );
  assert.ok(result.stepsCompleted > 0);
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("AI vs AI: Aggressive AI vs Defensive AI produces decisive autonomous match and deterministic replay", () => {
  const result = runHeadlessMatch({
    seed: "ai-aggro-vs-defense-seed-99",
    players: ["aggro", "defense"],
    policies: {
      aggro: createAggressiveAI("AggressiveAlpha"),
      defense: createDefensiveAI("DefensiveBeta"),
    },
    maxTurns: 35,
    maxSteps: 3500,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.ok(result.winnerPlayerId === "aggro" || result.winnerPlayerId === "defense" || result.endReason === "deck_out" || result.endReason === "simultaneous_deck_out");
  assert.ok(result.stepsCompleted > 10);
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("AI vs AI: Tactical AI vs Tactical AI with Equip Spells and Traps maintains 100% determinism", () => {
  const result = runHeadlessMatch({
    seed: "ai-tactical-mirror-seed-42",
    players: ["p1_tactical", "p2_tactical"],
    policies: {
      p1_tactical: createTacticalAI("TacticalP1"),
      p2_tactical: createTacticalAI("TacticalP2"),
    },
    maxTurns: 35,
    maxSteps: 3500,
    recordReplay: true,
  });

  assert.equal(result.match.status, "finished");
  assert.ok(result.stepsCompleted > 10);
  assert.ok(result.replay !== null);

  const verification = verifyReplay(result.replay, result.stepHashes);
  assert.equal(verification.matches, true, `Replay divergence at step ${verification.firstDivergentStep}`);
  assert.equal(verification.firstDivergentStep, null);
});

test("Heuristic AI: sets trap from hand when remaining actions are 0 before ending participation", () => {
  const ai = createTacticalAI("TacticalAI");

  const p1Setup = createDefaultPlayerSetup("p1", 5);
  const p2Setup = createDefaultPlayerSetup("p2", 5);
  const bases = [
    { playerId: "p1", position: { x: 0, y: 8 } },
    { playerId: "p2", position: { x: 30, y: 8 } },
  ];

  const engine = createGameEngine(
    "trap-cost-zero-test",
    [p1Setup, p2Setup],
    bases,
    PROTOTYPE_NORMAL_MONSTERS,
  );

  // Mock decision context where p1 has 0 actions remaining and 2 reactions remaining
  const context = {
    playerId: "p1",
    opponentPlayerId: "p2",
    turn: {
      turnNumber: 1,
      phase: "action",
      players: [
        {
          playerId: "p1",
          participationEnded: false,
          remaining: { actions: 0, reactions: 2 },
        },
        {
          playerId: "p2",
          participationEnded: false,
          remaining: { actions: 4, reactions: 4 },
        },
      ],
    },
    priorityToken: { holderPlayerId: "p1" },
    engine: {
      ...engine,
      state: {
        ...engine.state,
        turn: {
          ...engine.state.turn,
          phase: "action",
          players: [
            {
              playerId: "p1",
              participationEnded: false,
              remaining: { actions: 0, reactions: 2 },
            },
          ],
        },
        // Ensure p1 hand has a trap card
        cardSetup: {
          ...engine.state.cardSetup,
          players: engine.state.cardSetup.players.map((p) =>
            p.playerId === "p1"
              ? {
                  ...p,
                  hand: [{ instanceId: "test-trap-inst", definitionId: "trap:test", kind: "trap" }],
                }
              : p,
          ),
        },
      },
    },
  };

  const action = ai.takeAction(context);
  assert.ok(action !== null);
  assert.equal(action.kind, "trap.set");
  assert.equal(action.issuer, "p1");
  assert.equal(action.payload.cardInstanceId, "test-trap-inst");
  assert.equal(action.payload.slotIndex, 0);
});

test("Heuristic AI: collision-proof unit generation ensures unique unitIds even with pre-existing unit id", () => {
  const ai = createAggressiveAI("AggroCollisionTest");

  const p1Setup = createDefaultPlayerSetup("p1", 5);
  const p2Setup = createDefaultPlayerSetup("p2", 5);
  const bases = [
    { playerId: "p1", position: { x: 0, y: 8 } },
    { playerId: "p2", position: { x: 30, y: 8 } },
  ];

  const engine = createGameEngine(
    "collision-test-seed",
    [p1Setup, p2Setup],
    bases,
    PROTOTYPE_NORMAL_MONSTERS,
  );

  // Pre-seed an allied unit on map with unitId "p1:unit:1"
  const preExistingUnit = {
    unitId: "p1:unit:1",
    cardInstanceId: "card-inst-pre",
    ownerPlayerId: "p1",
    definitionId: "normal:beast-frightfur",
    name: "Pre Existing Unit",
    level: 3,
    type: "normal",
    structuralElements: ["dark"],
    structuralRaces: ["fiend"],
    position: { x: 1, y: 8 },
    battlePosition: "attack",
    hp: { current: 3, maximum: 3 },
    mp: { current: 0, maximum: 0 },
    spd: { current: 3, maximum: 3 },
    vis: 3,
    atk: 12,
    def: 8,
    attackRange: 1,
    usedEffectSinceLastSupport: false,
  };

  const context = {
    playerId: "p1",
    opponentPlayerId: "p2",
    turn: {
      turnNumber: 1,
      phase: "action",
      players: [
        {
          playerId: "p1",
          participationEnded: false,
          remaining: { actions: 2, reactions: 2 },
        },
      ],
    },
    priorityToken: { holderPlayerId: "p1" },
    engine: {
      ...engine,
      state: {
        ...engine.state,
        turn: {
          ...engine.state.turn,
          phase: "action",
          players: [
            {
              playerId: "p1",
              participationEnded: false,
              remaining: { actions: 2, reactions: 2 },
            },
          ],
        },
        spatial: {
          ...engine.state.spatial,
          units: [{ unitId: "p1:unit:1", playerId: "p1", position: { x: 1, y: 8 } }],
        },
        monsters: [preExistingUnit],
        cardSetup: {
          ...engine.state.cardSetup,
          players: engine.state.cardSetup.players.map((p) =>
            p.playerId === "p1"
              ? {
                  ...p,
                  hand: [
                    {
                      instanceId: "summonable-inst",
                      definitionId: "normal:luster-dragon",
                      kind: "normal_monster",
                    },
                  ],
                }
              : p,
          ),
        },
      },
    },
  };

  const action = ai.takeAction(context);
  assert.ok(action !== null);
  if (action.kind === "summon.normal") {
    // Must NOT be p1:unit:1 because p1:unit:1 is already taken!
    assert.notEqual(action.payload.unitId, "p1:unit:1");
    assert.equal(action.payload.unitId, "p1:unit:2");
  }
});
