import assert from "node:assert/strict";
import test from "node:test";

import {
  computeContentHash,
  REPLAY_SCHEMA_VERSION,
  ReplayInvariantError,
  createGameEngine,
  createReplayFile,
  runReplay,
  verifyReplay,
} from "../../src/core/index.ts";

const commands = [
  {
    receivedAtStep: 0,
    issuer: "p1",
    kind: "turn.allocate_resources",
    payload: { actions: 5, reactions: 3 },
  },
  {
    receivedAtStep: 0,
    issuer: "p2",
    kind: "turn.allocate_resources",
    payload: { actions: 4, reactions: 4 },
  },
  {
    receivedAtStep: 1,
    issuer: "p1",
    kind: "turn.confirm_resource_use",
    payload: { resource: "action" },
  },
];

function card(name, kind) {
  return { definitionId: `${kind}:${name}`, name, kind };
}

function playerSetup() {
  return ["p1", "p2"].map((playerId, playerIndex) => ({
    playerId,
    initialMonsterCount: 3 + playerIndex,
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

function gameSetup(players) {
  return {
    bases: [
      { playerId: "p1", position: { x: 0, y: 8 } },
      { playerId: "p2", position: { x: 30, y: 8 } },
    ],
    monsterDefinitions: players.flatMap((player) =>
      player.decks.monsterDeck.map((entry) => ({
        definitionId: entry.definitionId,
        name: entry.name,
        level: 4,
        type: entry.kind === "normal_monster" ? "normal" : "effect",
        elements: ["light"],
        races: ["Warrior"],
        printedVis: 2,
        printedSpd: 3,
        printedAtk: 4,
        printedDef: 3,
      })),
    ),
  };
}

function normalOnlyPlayerSetup() {
  return ["p1", "p2"].map((playerId) => ({
    playerId,
    initialMonsterCount: 7,
    decks: {
      monsterDeck: Array.from({ length: 20 }, (_, index) =>
        card(`${playerId} normal ${index}`, "normal_monster"),
      ),
      spellTrapDeck: Array.from({ length: 15 }, (_, index) =>
        card(`${playerId} support ${index}`, index % 2 === 0 ? "spell" : "trap"),
      ),
      extraDeck: [],
    },
  }));
}

test("a replay reconstructs every authoritative hash from seed and commands", () => {
  const replay = createReplayFile("replay-seed", ["p1", "p2"], 3, commands);
  const first = runReplay(replay);
  const second = runReplay(replay);

  assert.equal(REPLAY_SCHEMA_VERSION, 3);
  assert.deepEqual(first.hashes, second.hashes);
  assert.equal(first.hashes.length, 4);
  assert.equal(first.finalEngine.state.step, 3);
  assert.deepEqual(first.finalEngine.state.turn.players[0].remaining, { actions: 4, reactions: 3 });
});

test("command order at the same step is preserved", () => {
  const replay = createReplayFile("order-seed", ["p1", "p2"], 1, [
    { receivedAtStep: 0, issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 3, reactions: 5 } },
    { receivedAtStep: 0, issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 6, reactions: 2 } },
  ]);
  const run = runReplay(replay);
  assert.deepEqual(run.finalEngine.state.turn.players.map((player) => player.allocation), [
    { actions: 6, reactions: 2 },
    { actions: 3, reactions: 5 },
  ]);
});

test("a configured replay reconstructs shuffled Decks, hands, and their hashes", () => {
  const setup = playerSetup();
  const replay = createReplayFile("configured-replay", ["p1", "p2"], 1, [], setup);
  const first = runReplay(replay);
  setup[0].decks.monsterDeck[0].name = "mutated outside replay";
  const second = runReplay(replay);

  assert.deepEqual(first.hashes, second.hashes);
  assert.notEqual(first.finalEngine.state.cardSetup, null);
  assert.equal(first.finalEngine.state.cardSetup.players[0].hand.length, 7);
  assert.notEqual(first.finalEngine.state.cardSetup.players[0].hand[0].name, "mutated outside replay");
  assert.equal(Object.isFrozen(replay.playerSetup), true);
});

test("a full game replay embeds map and content without external dependencies", () => {
  const players = playerSetup();
  const game = gameSetup(players);
  const replay = createReplayFile("full-replay", ["p1", "p2"], 1, [], players, game);
  const first = runReplay(replay);
  game.bases[0].position.x = 15;
  game.monsterDefinitions[0].printedAtk = 99;
  const second = runReplay(replay);

  assert.deepEqual(first.hashes, second.hashes);
  assert.deepEqual(first.finalEngine.state.spatial.bases[0].position, { x: 0, y: 8 });
  assert.notEqual(first.finalEngine.state.content.definitions[0].printedAtk, 99);
  assert.equal(Object.isFrozen(replay.gameSetup.monsterDefinitions), true);
});

test("Normal Summon, Fog, and movement replay with identical authoritative hashes", () => {
  const players = normalOnlyPlayerSetup();
  const game = gameSetup(players);
  const initial = createGameEngine(
    "gameplay-replay",
    players,
    game.bases,
    game.monsterDefinitions,
  );
  const summonedCard = initial.state.cardSetup.players[0].hand[0];
  const gameplayCommands = [
    {
      receivedAtStep: 0,
      issuer: "p1",
      kind: "turn.allocate_resources",
      payload: { actions: 4, reactions: 4 },
    },
    {
      receivedAtStep: 0,
      issuer: "p2",
      kind: "turn.allocate_resources",
      payload: { actions: 4, reactions: 4 },
    },
    {
      receivedAtStep: 1,
      issuer: "p1",
      kind: "summon.normal",
      payload: {
        cardInstanceId: summonedCard.instanceId,
        unitId: "p1:unit:replay",
        anchorUnitId: null,
        destination: { x: 1, y: 8 },
        battlePosition: "attack",
      },
    },
    {
      receivedAtStep: 2,
      issuer: "p1",
      kind: "monster.move_basic",
      payload: {
        unitId: "p1:unit:replay",
        path: [{ x: 2, y: 8 }, { x: 3, y: 8 }],
      },
    },
  ];
  const replay = createReplayFile(
    "gameplay-replay",
    ["p1", "p2"],
    3,
    gameplayCommands,
    players,
    game,
  );
  const first = runReplay(replay);
  const second = runReplay(replay);

  assert.deepEqual(first.hashes, second.hashes);
  assert.deepEqual(first.finalEngine.state.monsters[0].position, { x: 3, y: 8 });
  assert.equal(first.finalEngine.state.monsters[0].cardInstanceId, summonedCard.instanceId);
  assert.equal(first.finalEngine.state.cardSetup.players[0].hand.length, 6);
});

test("a Basic Attack response window and counterattack replay identically", () => {
  const players = normalOnlyPlayerSetup();
  const baseGame = gameSetup(players);
  const game = {
    ...baseGame,
    monsterDefinitions: baseGame.monsterDefinitions.map((definition) => ({
      ...definition,
      printedVis: 40,
      printedSpd: 40,
    })),
  };
  const initial = createGameEngine(
    "attack-replay",
    players,
    game.bases,
    game.monsterDefinitions,
  );
  const p1Card = initial.state.cardSetup.players[0].hand[0];
  const p2Card = initial.state.cardSetup.players[1].hand[0];
  const attackElementId = "basic-attack:6";
  const chainId = "chain:6";
  const replay = createReplayFile(
    "attack-replay",
    ["p1", "p2"],
    7,
    [
      { receivedAtStep: 0, issuer: "p1", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
      { receivedAtStep: 0, issuer: "p2", kind: "turn.allocate_resources", payload: { actions: 4, reactions: 4 } },
      { receivedAtStep: 1, issuer: "p1", kind: "summon.normal", payload: {
        cardInstanceId: p1Card.instanceId, unitId: "p1:attacker", anchorUnitId: null,
        destination: { x: 1, y: 8 }, battlePosition: "attack",
      } },
      { receivedAtStep: 1, issuer: "p2", kind: "summon.normal", payload: {
        cardInstanceId: p2Card.instanceId, unitId: "p2:defender", anchorUnitId: null,
        destination: { x: 29, y: 8 }, battlePosition: "attack",
      } },
      { receivedAtStep: 2, issuer: "p1", kind: "monster.move_basic", payload: {
        unitId: "p1:attacker",
        path: Array.from({ length: 14 }, (_, index) => ({ x: index + 2, y: 8 })),
      } },
      { receivedAtStep: 2, issuer: "p2", kind: "monster.move_basic", payload: {
        unitId: "p2:defender",
        path: Array.from({ length: 13 }, (_, index) => ({ x: 28 - index, y: 8 })),
      } },
      { receivedAtStep: 3, issuer: "p1", kind: "battle.declare_basic_attack", payload: {
        attackerUnitId: "p1:attacker", defenderUnitId: "p2:defender",
      } },
      { receivedAtStep: 4, issuer: "p2", kind: "battle.choose_counterattack", payload: {
        elementId: attackElementId,
      } },
      { receivedAtStep: 5, issuer: "p1", kind: "chain.pass_priority", payload: { chainId } },
      { receivedAtStep: 6, issuer: "system", kind: "chain.resolve_next", payload: {} },
    ],
    players,
    game,
  );
  const first = runReplay(replay);
  const second = runReplay(replay);

  assert.deepEqual(first.hashes, second.hashes);
  assert.equal(first.finalEngine.state.chainWindows.length, 0);
  assert.equal(first.finalEngine.state.pendingBasicAttacks.length, 0);
  assert.deepEqual(first.finalEngine.state.monsters, []);
  assert.deepEqual(
    first.finalEngine.state.cardSetup.players.map((player) => player.graveyard.length),
    [1, 1],
  );
});

test("replay gameSetup validates and preserves canonical contentHash", () => {
  const players = playerSetup();
  const game = gameSetup(players);
  const expectedHash = computeContentHash(game.monsterDefinitions, []);

  const replay = createReplayFile("seed", ["p1", "p2"], 1, [], players, game);
  assert.equal(replay.gameSetup.contentHash, expectedHash);

  // Passing mismatched contentHash explicitly is rejected on replay creation
  assert.throws(
    () => createReplayFile("seed", ["p1", "p2"], 1, [], players, { ...game, contentHash: "mismatched-hash" }),
    (error) => {
      assert.ok(error instanceof ReplayInvariantError);
      assert.match(error.message, /contentHash mismatch/);
      return true;
    },
  );

  // Running replay with expectedContentHash mismatch is rejected before simulation
  assert.throws(
    () => runReplay(replay, { expectedContentHash: "different-hash" }),
    (error) => {
      assert.ok(error instanceof ReplayInvariantError);
      assert.match(error.message, /incompatible replay content/i);
      return true;
    },
  );
});

test("verification identifies the first divergent logical step", () => {
  const replay = createReplayFile("verify-seed", ["p1", "p2"], 2, commands.slice(0, 2));
  const hashes = runReplay(replay).hashes;
  const tampered = [...hashes];
  tampered[1] = "tampered";

  assert.deepEqual(verifyReplay(replay, hashes), {
    matches: true,
    firstDivergentStep: null,
    actualHashes: hashes,
  });
  assert.equal(verifyReplay(replay, tampered).firstDivergentStep, 1);
});

test("replay creation copies and freezes command payloads", () => {
  const payload = { actions: 4, reactions: 4 };
  const replay = createReplayFile("frozen", ["p1", "p2"], 1, [
    { receivedAtStep: 0, issuer: "p1", kind: "turn.allocate_resources", payload },
  ]);
  payload.actions = 8;
  assert.deepEqual(replay.commands[0].payload, { actions: 4, reactions: 4 });
  assert.equal(Object.isFrozen(replay.commands[0].payload), true);
});

test("invalid schedules and incompatible schemas are rejected", () => {
  assert.throws(
    () => createReplayFile("seed", ["p1", "p2"], 1, [{ ...commands[0], receivedAtStep: 1 }]),
    /before endStep/,
  );
  assert.throws(
    () => createReplayFile("seed", ["p1", "p2"], 3, [commands[2], commands[0]]),
    /ordered by receivedAtStep/,
  );
  const replay = createReplayFile("seed", ["p1", "p2"], 1, []);
  assert.throws(() => runReplay({ ...replay, schemaVersion: 99 }), ReplayInvariantError);
  assert.throws(
    () => createReplayFile("seed", ["p1", "p2"], 1, [], [{ ...playerSetup()[0], playerId: "wrong" }, playerSetup()[1]]),
    /must match playerIds/,
  );
  assert.throws(
    () => createReplayFile("seed", ["p1", "p2"], 1, [], null, gameSetup(playerSetup())),
    /requires player setup/,
  );
});
