import { canonicalStringify } from "./canonical.ts";
import { deepFreeze } from "./freeze.ts";
import type { CommandEnvelope, CommandInput, CoreEngine, JsonValue } from "./types.ts";

function assertNonEmpty(label: string, value: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${label} must not be empty.`);
  }
}

export function compareCommands(left: CommandEnvelope, right: CommandEnvelope): number {
  return left.eligibleStep - right.eligibleStep || left.sequence - right.sequence;
}

export function enqueueCommand(engine: CoreEngine, input: CommandInput): CoreEngine {
  assertNonEmpty("issuer", input.issuer);
  assertNonEmpty("kind", input.kind);

  const payload = input.payload ?? {};
  canonicalStringify(payload as JsonValue);

  const command: CommandEnvelope = deepFreeze({
    sequence: engine.nextCommandSequence,
    receivedAtStep: engine.state.step,
    eligibleStep: engine.state.step + 1,
    issuer: input.issuer,
    kind: input.kind,
    payload,
  });

  return deepFreeze({
    ...engine,
    pendingCommands: [...engine.pendingCommands, command],
    nextCommandSequence: engine.nextCommandSequence + 1,
  }) as CoreEngine;
}

export function partitionCommandsForStep(
  commands: readonly CommandEnvelope[],
  step: number,
): readonly [readonly CommandEnvelope[], readonly CommandEnvelope[]] {
  const ordered = [...commands].sort(compareCommands);
  const eligible: CommandEnvelope[] = [];
  const pending: CommandEnvelope[] = [];

  for (const command of ordered) {
    (command.eligibleStep <= step ? eligible : pending).push(command);
  }

  return [deepFreeze(eligible), deepFreeze(pending)];
}
