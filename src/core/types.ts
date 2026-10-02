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
  readonly schemaVersion: 16;
  readonly step: number;
  readonly seed: string;
  readonly turn: import("./turn.ts").TurnState;
  readonly priorityToken: import("./priority.ts").PriorityToken;
  readonly randomAudit: readonly import("./random.ts").RandomDrawLog[];
  readonly match: import("./match.ts").MatchState;
  readonly cardSetup: import("./setup.ts").MatchCardSetup | null;
  readonly pendingDrawModes: readonly import("./draw.ts").DrawSelection[];
  readonly lastCompletedDrawTurn: number | null;
  readonly content: import("./content.ts").MonsterCatalog | null;
  readonly spatial: import("./spatial.ts").SpatialState | null;
  readonly monsters: readonly import("./monster.ts").MonsterState[];
  readonly fogKnowledge: readonly import("./fog.ts").PlayerFogKnowledge[];
  readonly chainSystem: import("./chain.ts").ChainSystem;
  readonly chainWindows: readonly import("./chain.ts").ChainWindow[];
  readonly pendingBasicAttacks: readonly import("./battle.ts").PendingBasicAttack[];
  readonly pendingBaseAttacks: readonly import("./battle.ts").PendingBaseAttack[];
  readonly pendingReactionMovements: readonly import("./movement.ts").PendingReactionMovement[];
  readonly lastCompletedSupportTurn: number | null;
  readonly trapSlots?: readonly import("./spells-traps.ts").PlayerTrapSlots[];
  readonly resolutionZone?: readonly import("./spells-traps.ts").ResolutionCardState[];
  readonly pendingSpellActivations?: readonly import("./spells-traps.ts").PendingSpellActivation[];
  readonly pendingTrapActivations?: readonly import("./spells-traps.ts").PendingTrapActivation[];
}

export interface CoreEngine {
  readonly state: SimulationState;
  readonly pendingCommands: readonly CommandEnvelope[];
  readonly nextCommandSequence: number;
  readonly stateHash: string;
}

export interface CommandAcceptedEvent {
  readonly type: "command_accepted";
  readonly step: number;
  readonly sequence: number;
  readonly issuer: string;
  readonly kind: string;
}

export interface CommandRejectedEvent {
  readonly type: "command_rejected";
  readonly step: number;
  readonly sequence: number;
  readonly issuer: string;
  readonly kind: string;
  readonly reason: string;
}

export type CoreEvent = CommandAcceptedEvent | CommandRejectedEvent;

export interface StepResult {
  readonly engine: CoreEngine;
  readonly events: readonly CoreEvent[];
  readonly processedCommands: readonly CommandEnvelope[];
}
