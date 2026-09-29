import { CORE_SCHEMA_VERSION, STEP_PIPELINE } from "./constants.ts";
import { hashCanonical } from "./canonical.ts";
import { deepFreeze } from "./freeze.ts";
import { partitionCommandsForStep } from "./queue.ts";
import type { CommandProcessedEvent, CoreEngine, JsonValue, StepResult } from "./types.ts";

function hashableEngine(engine: Omit<CoreEngine, "stateHash">): JsonValue {
  return {
    state: {
      schemaVersion: engine.state.schemaVersion,
      step: engine.state.step,
      seed: engine.state.seed,
    },
    pendingCommands: engine.pendingCommands.map((command) => ({
      sequence: command.sequence,
      receivedAtStep: command.receivedAtStep,
      eligibleStep: command.eligibleStep,
      issuer: command.issuer,
      kind: command.kind,
      payload: command.payload,
    })),
    nextCommandSequence: engine.nextCommandSequence,
  };
}

function withHash(engine: Omit<CoreEngine, "stateHash">): CoreEngine {
  return deepFreeze({
    ...engine,
    stateHash: hashCanonical(hashableEngine(engine)),
  }) as CoreEngine;
}

export function createEngine(seed: string): CoreEngine {
  if (seed.length === 0) {
    throw new TypeError("seed must not be empty.");
  }

  return withHash({
    state: deepFreeze({
      schemaVersion: CORE_SCHEMA_VERSION,
      step: 0,
      seed,
    }),
    pendingCommands: deepFreeze([]),
    nextCommandSequence: 0,
  });
}

export function advanceStep(engine: CoreEngine): StepResult {
  const nextStep = engine.state.step + 1;
  const [processedCommands, pendingCommands] = partitionCommandsForStep(engine.pendingCommands, nextStep);

  // This scaffold intentionally has no gameplay mutation yet. The fixed pipeline is
  // exposed so later systems fill each phase without changing authoritative ordering.
  void STEP_PIPELINE;

  const events: CommandProcessedEvent[] = processedCommands.map((command) =>
    deepFreeze({
      type: "command_processed" as const,
      step: nextStep,
      sequence: command.sequence,
      issuer: command.issuer,
      kind: command.kind,
    }),
  );

  const nextEngine = withHash({
    state: deepFreeze({
      ...engine.state,
      step: nextStep,
    }),
    pendingCommands,
    nextCommandSequence: engine.nextCommandSequence,
  });

  return deepFreeze({
    engine: nextEngine,
    events: deepFreeze(events),
    processedCommands,
  }) as StepResult;
}
