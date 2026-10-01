import { computeContentHash } from "./content.ts";
import { advanceStep, createConfiguredEngine, createEngine, createGameEngine } from "./engine.ts";
import { cloneAndFreezeJson, deepFreeze } from "./freeze.ts";
import { enqueueCommand } from "./queue.ts";
import type { PlayerSetupInput } from "./setup.ts";
import type { BasePlacement } from "./spatial.ts";
import type { MonsterDefinition } from "./monster.ts";
import type { CommandInput, CommandPayload, JsonValue } from "./types.ts";

export const REPLAY_SCHEMA_VERSION = 3 as const;

export interface ReplayGameSetup {
  readonly contentHash?: string;
  readonly bases: readonly BasePlacement[];
  readonly monsterDefinitions: readonly MonsterDefinition[];
  readonly ritualProcedures?: readonly import("./ritual.ts").RitualProcedure[];
}

export interface ReplayCommand {
  readonly receivedAtStep: number;
  readonly issuer: string;
  readonly kind: string;
  readonly payload: CommandPayload;
}

export interface ReplayFile {
  readonly schemaVersion: 3;
  readonly seed: string;
  readonly playerIds: readonly [string, string];
  readonly endStep: number;
  readonly commands: readonly ReplayCommand[];
  readonly playerSetup: readonly PlayerSetupInput[] | null;
  readonly gameSetup: ReplayGameSetup | null;
}

export interface ReplayRun {
  readonly finalEngine: import("./types.ts").CoreEngine;
  readonly hashes: readonly string[];
}

export interface ReplayVerification {
  readonly matches: boolean;
  readonly firstDivergentStep: number | null;
  readonly actualHashes: readonly string[];
}

export class ReplayInvariantError extends Error {
  override readonly name = "ReplayInvariantError";
}

function assertStep(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ReplayInvariantError(`${label} must be a non-negative safe integer.`);
  }
}

export function createReplayFile(
  seed: string,
  playerIds: readonly string[],
  endStep: number,
  commands: readonly (CommandInput & { readonly receivedAtStep: number })[],
  playerSetup: readonly PlayerSetupInput[] | null = null,
  gameSetup: ReplayGameSetup | null = null,
): ReplayFile {
  if (seed.length === 0) throw new ReplayInvariantError("seed must not be empty.");
  if (
    playerIds.length !== 2 ||
    playerIds[0] === undefined ||
    playerIds[1] === undefined ||
    playerIds[0] === playerIds[1]
  ) {
    throw new ReplayInvariantError("Replay requires exactly two distinct players.");
  }
  assertStep("endStep", endStep);
  const frozenCommands = commands.map((command, index) => {
    assertStep(`commands[${index}].receivedAtStep`, command.receivedAtStep);
    if (command.receivedAtStep >= endStep) {
      throw new ReplayInvariantError("Every replay command must be received before endStep.");
    }
    if (command.issuer.trim().length === 0 || command.kind.trim().length === 0) {
      throw new ReplayInvariantError("Replay command issuer and kind must not be empty.");
    }
    const payload = cloneAndFreezeJson((command.payload ?? {}) as JsonValue) as CommandPayload;
    return deepFreeze({
      receivedAtStep: command.receivedAtStep,
      issuer: command.issuer,
      kind: command.kind,
      payload,
    });
  });
  for (let index = 1; index < frozenCommands.length; index += 1) {
    if (
      (frozenCommands[index]?.receivedAtStep ?? 0) <
      (frozenCommands[index - 1]?.receivedAtStep ?? 0)
    ) {
      throw new ReplayInvariantError("Replay commands must be ordered by receivedAtStep.");
    }
  }

  const frozenPlayerSetup =
    playerSetup === null
      ? null
      : deepFreeze(
          playerSetup.map((player) => ({
            playerId: player.playerId,
            initialMonsterCount: player.initialMonsterCount,
            decks: {
              monsterDeck: player.decks.monsterDeck.map((card) => ({ ...card })),
              spellTrapDeck: player.decks.spellTrapDeck.map((card) => ({ ...card })),
              extraDeck: player.decks.extraDeck.map((card) => ({ ...card })),
            },
          })),
        );
  if (
    frozenPlayerSetup !== null &&
    (frozenPlayerSetup.length !== 2 ||
      frozenPlayerSetup[0]?.playerId !== playerIds[0] ||
      frozenPlayerSetup[1]?.playerId !== playerIds[1])
  ) {
    throw new ReplayInvariantError("Replay player setup must match playerIds in the same order.");
  }
  if (gameSetup !== null && frozenPlayerSetup === null) {
    throw new ReplayInvariantError("A full game replay requires player setup.");
  }
  const computedContentHash =
    gameSetup === null
      ? null
      : computeContentHash(
          gameSetup.monsterDefinitions,
          gameSetup.ritualProcedures ?? [],
        );
  if (
    gameSetup !== null &&
    gameSetup.contentHash !== undefined &&
    gameSetup.contentHash !== computedContentHash
  ) {
    throw new ReplayInvariantError(
      `Replay contentHash mismatch: expected ${computedContentHash}, got ${gameSetup.contentHash}.`,
    );
  }
  const frozenGameSetup =
    gameSetup === null
      ? null
      : deepFreeze({
          contentHash: computedContentHash!,
          bases: gameSetup.bases.map((base) => ({
            playerId: base.playerId,
            position: { ...base.position },
          })),
          monsterDefinitions: gameSetup.monsterDefinitions.map((definition) => ({
            ...definition,
            elements: [...definition.elements],
            races: [...definition.races],
          })),
          ritualProcedures: (gameSetup.ritualProcedures ?? []).map((proc) => ({
            spellDefinitionId: proc.spellDefinitionId,
            compatibleRitualDefinitionIds: [...proc.compatibleRitualDefinitionIds],
          })),
        });

  return deepFreeze({
    schemaVersion: REPLAY_SCHEMA_VERSION,
    seed,
    playerIds: deepFreeze([playerIds[0], playerIds[1]] as const),
    endStep,
    commands: deepFreeze(frozenCommands),
    playerSetup: frozenPlayerSetup,
    gameSetup: frozenGameSetup,
  }) as ReplayFile;
}

export interface RunReplayOptions {
  readonly expectedContentHash?: string;
  readonly ritualProcedures?: readonly import("./ritual.ts").RitualProcedure[];
  readonly monsterDefinitions?: readonly MonsterDefinition[];
}

export function runReplay(replay: ReplayFile, options?: RunReplayOptions): ReplayRun {
  if (replay.schemaVersion !== REPLAY_SCHEMA_VERSION) {
    throw new ReplayInvariantError(`Unsupported replay schema version ${String(replay.schemaVersion)}.`);
  }
  let engine;
  if (replay.gameSetup !== null) {
    if (replay.playerSetup === null) {
      throw new ReplayInvariantError("A full game replay requires player setup.");
    }
    const monsterDefs = options?.monsterDefinitions ?? replay.gameSetup.monsterDefinitions;
    const ritualProcs = options?.ritualProcedures ?? replay.gameSetup.ritualProcedures ?? [];
    engine = createGameEngine(
      replay.seed,
      replay.playerSetup,
      replay.gameSetup.bases,
      monsterDefs,
      ritualProcs,
    );

    const actualContentHash = engine.state.content?.contentHash;
    if (replay.gameSetup.contentHash !== undefined && actualContentHash !== replay.gameSetup.contentHash) {
      throw new ReplayInvariantError(
        `Incompatible replay content: replay was recorded with contentHash ${replay.gameSetup.contentHash}, but simulation content has ${actualContentHash}.`,
      );
    }
    if (options?.expectedContentHash !== undefined && actualContentHash !== options.expectedContentHash) {
      throw new ReplayInvariantError(
        `Incompatible replay content: expected contentHash ${options.expectedContentHash}, but simulation content has ${actualContentHash}.`,
      );
    }
  } else {
    engine =
      replay.playerSetup === null
        ? createEngine(replay.seed, replay.playerIds)
        : createConfiguredEngine(replay.seed, replay.playerSetup);
  }
  const hashes = [engine.stateHash];
  let commandIndex = 0;

  while (engine.state.step < replay.endStep) {
    while (replay.commands[commandIndex]?.receivedAtStep === engine.state.step) {
      const command = replay.commands[commandIndex];
      if (command === undefined) break;
      engine = enqueueCommand(engine, command);
      commandIndex += 1;
    }
    engine = advanceStep(engine).engine;
    hashes.push(engine.stateHash);
  }
  if (commandIndex !== replay.commands.length) {
    throw new ReplayInvariantError("Replay contains commands outside its executable step range.");
  }

  return deepFreeze({ finalEngine: engine, hashes: deepFreeze(hashes) }) as ReplayRun;
}

export function verifyReplay(
  replay: ReplayFile,
  expectedHashes: readonly string[],
  options?: RunReplayOptions,
): ReplayVerification {
  const run = runReplay(replay, options);
  const comparisonLength = Math.max(run.hashes.length, expectedHashes.length);
  let firstDivergentStep: number | null = null;
  for (let step = 0; step < comparisonLength; step += 1) {
    if (run.hashes[step] !== expectedHashes[step]) {
      firstDivergentStep = step;
      break;
    }
  }
  return deepFreeze({
    matches: firstDivergentStep === null,
    firstDivergentStep,
    actualHashes: run.hashes,
  }) as ReplayVerification;
}
