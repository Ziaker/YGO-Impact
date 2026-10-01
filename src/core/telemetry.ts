import { STEP_MS } from "./constants.ts";
import { deepFreeze } from "./freeze.ts";
import type { ReplayFile } from "./replay.ts";
import type { CoreEngine, StepResult } from "./types.ts";

export const TELEMETRY_SCHEMA_VERSION = 1 as const;
export type TelemetryLevel = "off" | "basic" | "complete";

export interface TelemetryEvent {
  readonly schemaVersion: 1;
  readonly eventIndex: number;
  readonly matchId: string;
  readonly step: number;
  readonly turn: number;
  readonly phase: string;
  readonly monotonicMs: number;
  readonly kind: "command_accepted" | "command_rejected" | "step_completed";
  readonly stateHash: string;
  readonly commandSequence?: number;
  readonly issuer?: string;
  readonly commandKind?: string;
  readonly reason?: string;
}

export interface TelemetrySession {
  readonly schemaVersion: 1;
  readonly level: TelemetryLevel;
  readonly matchId: string;
  readonly seed: string;
  readonly buildVersion: string;
  readonly configurationHash: string;
  readonly lastRecordedStep: number;
  readonly events: readonly TelemetryEvent[];
}

export interface DiagnosticBundle {
  readonly telemetry: TelemetrySession;
  readonly replay: ReplayFile;
}

export class TelemetryInvariantError extends Error {
  override readonly name = "TelemetryInvariantError";
}

function assertNonEmpty(label: string, value: string): void {
  if (value.trim().length === 0) throw new TelemetryInvariantError(`${label} must not be empty.`);
}

export function createTelemetrySession(
  engine: CoreEngine,
  options: {
    readonly level?: TelemetryLevel;
    readonly matchId: string;
    readonly buildVersion: string;
    readonly configurationHash: string;
  },
): TelemetrySession {
  assertNonEmpty("matchId", options.matchId);
  assertNonEmpty("buildVersion", options.buildVersion);
  assertNonEmpty("configurationHash", options.configurationHash);
  const level = options.level ?? "complete";
  if (level !== "off" && level !== "basic" && level !== "complete") {
    throw new TelemetryInvariantError(`Unknown telemetry level ${String(level)}.`);
  }
  return deepFreeze({
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    level,
    matchId: options.matchId,
    seed: engine.state.seed,
    buildVersion: options.buildVersion,
    configurationHash: options.configurationHash,
    lastRecordedStep: engine.state.step,
    events: deepFreeze([]),
  }) as TelemetrySession;
}

export function recordStepTelemetry(
  session: TelemetrySession,
  result: StepResult,
): TelemetrySession {
  if (session.schemaVersion !== TELEMETRY_SCHEMA_VERSION) {
    throw new TelemetryInvariantError(
      `Unsupported telemetry schema version ${String(session.schemaVersion)}.`,
    );
  }
  if (result.engine.state.seed !== session.seed) {
    throw new TelemetryInvariantError("Telemetry seed does not match the engine.");
  }
  if (result.engine.state.step !== session.lastRecordedStep + 1) {
    throw new TelemetryInvariantError("Telemetry steps must be recorded exactly once in order.");
  }
  if (session.level === "off") {
    return deepFreeze({ ...session, lastRecordedStep: result.engine.state.step });
  }

  const state = result.engine.state;
  const base = {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    matchId: session.matchId,
    step: state.step,
    turn: state.turn.turnNumber,
    phase: state.turn.phase,
    monotonicMs: state.step * STEP_MS,
    stateHash: result.engine.stateHash,
  };
  const added: TelemetryEvent[] = result.events.map((event, offset) =>
    deepFreeze({
      ...base,
      eventIndex: session.events.length + offset,
      kind: event.type,
      commandSequence: event.sequence,
      issuer: event.issuer,
      commandKind: event.kind,
      ...(event.type === "command_rejected" ? { reason: event.reason } : {}),
    }),
  );
  if (session.level === "complete" || added.length === 0) {
    added.push(
      deepFreeze({
        ...base,
        eventIndex: session.events.length + added.length,
        kind: "step_completed" as const,
      }),
    );
  }

  return deepFreeze({
    ...session,
    lastRecordedStep: state.step,
    events: deepFreeze([...session.events, ...added]),
  }) as TelemetrySession;
}

export function createDiagnosticBundle(
  telemetry: TelemetrySession,
  replay: ReplayFile,
): DiagnosticBundle {
  if (telemetry.seed !== replay.seed) {
    throw new TelemetryInvariantError("Diagnostic telemetry and replay seeds must match.");
  }
  return deepFreeze({ telemetry, replay });
}
