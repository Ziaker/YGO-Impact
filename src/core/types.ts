export type JsonPrimitive = null | boolean | string | number;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type CommandPayload = Readonly<Record<string, JsonValue>>;

export interface CommandInput {
  readonly issuer: string;
  readonly kind: string;
  readonly payload?: CommandPayload;
}

export interface CommandEnvelope {
  readonly sequence: number;
  readonly receivedAtStep: number;
  readonly eligibleStep: number;
  readonly issuer: string;
  readonly kind: string;
  readonly payload: CommandPayload;
}

export interface SimulationState {
  readonly schemaVersion: 1;
  readonly step: number;
  readonly seed: string;
}

export interface CoreEngine {
  readonly state: SimulationState;
  readonly pendingCommands: readonly CommandEnvelope[];
  readonly nextCommandSequence: number;
  readonly stateHash: string;
}

export interface CommandProcessedEvent {
  readonly type: "command_processed";
  readonly step: number;
  readonly sequence: number;
  readonly issuer: string;
  readonly kind: string;
}

export type CoreEvent = CommandProcessedEvent;

export interface StepResult {
  readonly engine: CoreEngine;
  readonly events: readonly CoreEvent[];
  readonly processedCommands: readonly CommandEnvelope[];
}
