import { CORE_SCHEMA_VERSION, STEP_PIPELINE, SYSTEM_ISSUER } from "./constants.ts";
import { createBasicAttackPlan } from "./attack.ts";
import { createBaseAttackPlan, resolveConfirmedBaseAttack } from "./base-attack.ts";
import {
  resolveConfirmedBasicAttack,
  type PendingBaseAttack,
  type PendingBasicAttack,
} from "./battle.ts";
import { hashCanonical } from "./canonical.ts";
import {
  addChainElement,
  confirmChainResponse,
  createChainSystem,
  negateChainElement,
  openChain,
  openChainWindow,
  passChainPriority,
  resolveNextChain,
} from "./chain.ts";
import { recoverVital } from "./vitals.ts";
import { createMonsterCatalog, type MonsterCatalog } from "./content.ts";
import { hasKeyword } from "./keywords.ts";
import { resolveReanimate } from "./reanimate.ts";
import { deepFreeze } from "./freeze.ts";
import { createPlayerFogKnowledge, updatePlayerFogKnowledge } from "./fog.ts";
import { drawForTurn, type DrawMode } from "./draw.ts";
import { resolveMonsterMovement, type PendingReactionMovement } from "./movement.ts";
import {
  createMatchState,
  resolveDeckOut,
  resolveSimultaneousBaseAttacks,
  type AttackType,
  type BaseAttackResolution,
  type BattlePosition,
} from "./match.ts";
import { partitionCommandsForStep } from "./queue.ts";
import { alternatePriorityToken, drawInitialPriorityToken } from "./priority.ts";
import { initializeMatchCardSetup, type PlayerSetupInput } from "./setup.ts";
import { createInitialSpatialState, positionKey, type BasePlacement } from "./spatial.ts";
import type { Position } from "./spatial.ts";
import { resolveNormalSummon } from "./summon.ts";
import { resolveTributeSummon } from "./tribute.ts";
import { resolveRitualSummon, type RitualProcedure } from "./ritual.ts";
import { resolveFusionSummon, type FusionProcedure } from "./fusion.ts";
import {
  createInitialTrapSlots,
  findSpellTrapDefinition,
  applyEquipModifiers,
  removeEquipModifiers,
  type PlayerTrapSlots,
  type ResolutionCardState,
  type PendingSpellActivation,
  type PendingTrapActivation,
  type SpellTrapDefinition,
  type TrapSlotState,
  MAX_EQUIPMENT_PER_MONSTER,
} from "./spells-traps.ts";
import { addCardToGraveyard, removeCardFromHand } from "./zones.ts";
import { calculateSharedVisibility } from "./visibility.ts";
import type { MonsterDefinition } from "./monster.ts";
import { changeMonsterBattlePosition, recoverMonstersAtSupport } from "./monster.ts";
import {
  TurnInvariantError,
  advanceCompletedPhase,
  confirmResourceUse,
  createFirstTurnState,
  endPlayerParticipation,
  settleResourceExhaustion,
  submitResourceAllocation,
} from "./turn.ts";
import type {
  CommandAcceptedEvent,
  CommandEnvelope,
  CommandRejectedEvent,
  CoreEngine,
  CoreEvent,
  JsonValue,
  SimulationState,
  StepResult,
} from "./types.ts";

function hashableEngine(engine: Omit<CoreEngine, "stateHash">): JsonValue {
  return {
    state: {
      schemaVersion: engine.state.schemaVersion,
      step: engine.state.step,
      seed: engine.state.seed,
      turn: {
        turnNumber: engine.state.turn.turnNumber,
        phase: engine.state.turn.phase,
        players: engine.state.turn.players.map((player) => ({
          playerId: player.playerId,
          allocation:
            player.allocation === null
              ? null
              : { actions: player.allocation.actions, reactions: player.allocation.reactions },
          remaining:
            player.remaining === null
              ? null
              : { actions: player.remaining.actions, reactions: player.remaining.reactions },
          participationEnded: player.participationEnded,
          conversionUsed: player.conversionUsed,
        })),
      },
      priorityToken: {
        playerIds: [...engine.state.priorityToken.playerIds],
        holderPlayerId: engine.state.priorityToken.holderPlayerId,
      },
      randomAudit: engine.state.randomAudit.map((log) => ({
        streamId: log.streamId,
        position: log.position,
        rawResult: log.rawResult,
        upperExclusive: log.upperExclusive,
        result: log.result,
      })),
      match: {
        status: engine.state.match.status,
        winnerPlayerId: engine.state.match.winnerPlayerId,
        endReason: engine.state.match.endReason,
        players: engine.state.match.players.map((player) => ({
          playerId: player.playerId,
          baseImpactsReceived: player.baseImpactsReceived,
        })),
      },
      cardSetup:
        engine.state.cardSetup === null
          ? null
          : {
              seed: engine.state.cardSetup.seed,
              setupHash: engine.state.cardSetup.setupHash,
              players: engine.state.cardSetup.players.map((player) => ({
                playerId: player.playerId,
                monsterDeck: player.monsterDeck.map((card) => ({ ...card })),
                spellTrapDeck: player.spellTrapDeck.map((card) => ({ ...card })),
                extraDeck: player.extraDeck.map((card) => ({ ...card })),
                hand: player.hand.map((card) => ({ ...card })),
                graveyard: player.graveyard.map((card) => ({ ...card })),
                randomAudit: player.randomAudit.map((entry) => ({ ...entry })),
              })),
            },
      pendingDrawModes: engine.state.pendingDrawModes.map((selection) => ({ ...selection })),
      lastCompletedDrawTurn: engine.state.lastCompletedDrawTurn,
      content:
        engine.state.content === null
          ? null
          : {
              contentHash: engine.state.content.contentHash,
              definitions: engine.state.content.definitions.map((definition) => ({
                definitionId: definition.definitionId,
                name: definition.name,
                level: definition.level,
                type: definition.type,
                elements: [...definition.elements],
                races: [...definition.races],
                printedVis: definition.printedVis,
                printedSpd: definition.printedSpd,
                printedAtk: definition.printedAtk,
                printedDef: definition.printedDef,
                printedAttackRange: definition.printedAttackRange ?? 1,
                normalHasGrantedMpAbility: definition.normalHasGrantedMpAbility ?? false,
              })),
              ritualProcedures: (engine.state.content.ritualProcedures ?? []).map((proc) => ({
                spellDefinitionId: proc.spellDefinitionId,
                compatibleRitualDefinitionIds: [...proc.compatibleRitualDefinitionIds],
              })),
              fusionProcedures: (engine.state.content.fusionProcedures ?? []).map((proc) => ({
                spellDefinitionId: proc.spellDefinitionId,
                fusionDefinitionId: proc.fusionDefinitionId,
                materialDefinitionIds: [...proc.materialDefinitionIds],
              })),
              ...(engine.state.content.spellTrapDefinitions && engine.state.content.spellTrapDefinitions.length > 0
                ? {
                    spellTrapDefinitions: engine.state.content.spellTrapDefinitions.map((def) => ({
                      definitionId: def.definitionId,
                      name: def.name,
                      kind: def.kind,
                      subtype: def.subtype,
                      description: def.description,
                      actionCost: def.actionCost ?? null,
                      reactionCost: def.reactionCost ?? null,
                      targetsEnemy: def.targetsEnemy ?? false,
                      isImmediate: def.isImmediate ?? false,
                      effectKind: def.effectKind,
                      statModifiers: def.statModifiers
                        ? {
                            atk: def.statModifiers.atk ?? 0,
                            def: def.statModifiers.def ?? 0,
                            spd: def.statModifiers.spd ?? 0,
                            vis: def.statModifiers.vis ?? 0,
                          }
                        : null,
                      value: def.value ?? null,
                    })),
                  }
                : {}),
            },
      spatial:
        engine.state.spatial === null
          ? null
          : {
              bases: engine.state.spatial.bases.map((base) => ({
                playerId: base.playerId,
                position: { ...base.position },
              })),
              units: engine.state.spatial.units.map((unit) => ({
                unitId: unit.unitId,
                playerId: unit.playerId,
                position: { ...unit.position },
              })),
            },
      monsters: engine.state.monsters.map((monster) => ({
        unitId: monster.unitId,
        cardInstanceId: monster.cardInstanceId,
        ownerPlayerId: monster.ownerPlayerId,
        definitionId: monster.definitionId,
        name: monster.name,
        level: monster.level,
        type: monster.type,
        structuralElements: [...monster.structuralElements],
        structuralRaces: [...monster.structuralRaces],
        position: { ...monster.position },
        battlePosition: monster.battlePosition,
        hp: { ...monster.hp },
        mp: { ...monster.mp },
        vis: monster.vis,
        spd: { ...monster.spd },
        atk: monster.atk,
        def: monster.def,
        attackRange: monster.attackRange,
        usedEffectSinceLastSupport: monster.usedEffectSinceLastSupport,
        ...(monster.keywords && monster.keywords.length > 0 ? { keywords: [...monster.keywords] } : {}),
        ...(monster.description !== undefined ? { description: monster.description } : {}),
        ...(monster.equippedCards && monster.equippedCards.length > 0
          ? { equippedCards: monster.equippedCards.map((c) => ({ ...c })) }
          : {}),
      })),
      fogKnowledge: engine.state.fogKnowledge.map((knowledge) => ({
        playerId: knowledge.playerId,
        enemies: knowledge.enemies.map((enemy) => ({
          unitId: enemy.unitId,
          ownerPlayerId: enemy.ownerPlayerId,
          lastKnownPosition: { ...enemy.lastKnownPosition },
          currentlyVisible: enemy.currentlyVisible,
        })),
      })),
      chainSystem: {
        nextRegistrationSequence: engine.state.chainSystem.nextRegistrationSequence,
        pendingChains: engine.state.chainSystem.pendingChains.map((chain) => ({
          chainId: chain.chainId,
          registrationSequence: chain.registrationSequence,
          kind: chain.kind,
          elements: chain.elements.map((element) => ({
            ...element,
            targetIds: [...element.targetIds],
          })),
        })),
      },
      chainWindows: engine.state.chainWindows.map((window) => ({ ...window })),
      pendingBasicAttacks: engine.state.pendingBasicAttacks.map((attack) => ({ ...attack })),
      pendingBaseAttacks: engine.state.pendingBaseAttacks.map((attack) => ({ ...attack })),
      pendingReactionMovements: engine.state.pendingReactionMovements.map((movement) => ({
        ...movement,
        path: movement.path.map((position) => ({ ...position })),
      })),
      lastCompletedSupportTurn: engine.state.lastCompletedSupportTurn,
      ...(engine.state.trapSlots && engine.state.trapSlots.some((p) => p.slots.some((s) => s.card !== null))
        ? {
            trapSlots: engine.state.trapSlots.map((p) => ({
              playerId: p.playerId,
              slots: p.slots.map((s) => ({
                slotIndex: s.slotIndex,
                card: s.card ? { ...s.card } : null,
                isFieldTrap: s.isFieldTrap,
                revealed: s.revealed,
                fieldRegion: s.fieldRegion ? s.fieldRegion.map((pos) => ({ ...pos })) : null,
              })),
            })),
          }
        : {}),
      ...(engine.state.resolutionZone && engine.state.resolutionZone.length > 0
        ? {
            resolutionZone: engine.state.resolutionZone.map((r) => ({
              card: { ...r.card },
              controllerPlayerId: r.controllerPlayerId,
              chainId: r.chainId ?? null,
              elementId: r.elementId ?? null,
              isEquip: r.isEquip ?? false,
              targetUnitId: r.targetUnitId ?? null,
            })),
          }
        : {}),
      ...(engine.state.pendingSpellActivations && engine.state.pendingSpellActivations.length > 0
        ? {
            pendingSpellActivations: engine.state.pendingSpellActivations.map((a) => ({
              elementId: a.elementId,
              cardInstanceId: a.cardInstanceId,
              controllerPlayerId: a.controllerPlayerId,
              effectKind: a.effectKind,
              targetUnitIds: [...a.targetUnitIds],
              statModifiers: a.statModifiers
                ? {
                    atk: a.statModifiers.atk ?? 0,
                    def: a.statModifiers.def ?? 0,
                    spd: a.statModifiers.spd ?? 0,
                    vis: a.statModifiers.vis ?? 0,
                  }
                : null,
              value: a.value ?? null,
            })),
          }
        : {}),
      ...(engine.state.pendingTrapActivations && engine.state.pendingTrapActivations.length > 0
        ? {
            pendingTrapActivations: engine.state.pendingTrapActivations.map((a) => ({
              elementId: a.elementId,
              cardInstanceId: a.cardInstanceId,
              controllerPlayerId: a.controllerPlayerId,
              effectKind: a.effectKind,
              targetUnitIds: [...a.targetUnitIds],
              targetElementId: a.targetElementId ?? null,
              value: a.value ?? null,
            })),
          }
        : {}),
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

export function createEngine(seed: string, playerIds: readonly string[]): CoreEngine {
  if (seed.length === 0) {
    throw new TypeError("seed must not be empty.");
  }

  const initialPriority = drawInitialPriorityToken(playerIds, seed);
  return withHash({
    state: deepFreeze({
      schemaVersion: CORE_SCHEMA_VERSION,
      step: 0,
      seed,
      turn: createFirstTurnState(playerIds),
      priorityToken: initialPriority.token,
      randomAudit: deepFreeze([initialPriority.randomLog]),
      match: createMatchState(playerIds),
      cardSetup: null,
      pendingDrawModes: deepFreeze([]),
      lastCompletedDrawTurn: null,
      content: null,
      spatial: null,
      monsters: deepFreeze([]),
      fogKnowledge: deepFreeze(playerIds.map(createPlayerFogKnowledge)),
      chainSystem: createChainSystem(),
      chainWindows: deepFreeze([]),
      pendingBasicAttacks: deepFreeze([]),
      pendingBaseAttacks: deepFreeze([]),
      pendingReactionMovements: deepFreeze([]),
      lastCompletedSupportTurn: null,
      trapSlots: deepFreeze(playerIds.map(createInitialTrapSlots)),
      resolutionZone: deepFreeze([]),
      pendingSpellActivations: deepFreeze([]),
      pendingTrapActivations: deepFreeze([]),
    }),
    pendingCommands: deepFreeze([]),
    nextCommandSequence: 0,
  });
}

export function createConfiguredEngine(
  seed: string,
  players: readonly PlayerSetupInput[],
): CoreEngine {
  const cardSetup = initializeMatchCardSetup(seed, players);
  const engine = createEngine(
    seed,
    cardSetup.players.map((player) => player.playerId),
  );
  return withHash({
    ...engine,
    state: deepFreeze({
      ...engine.state,
      randomAudit: deepFreeze([
        ...engine.state.randomAudit,
        ...cardSetup.players.flatMap((player) => player.randomAudit),
      ]),
      cardSetup,
    }),
  });
}

export function createGameEngine(
  seed: string,
  players: readonly PlayerSetupInput[],
  bases: readonly BasePlacement[],
  monsterDefinitions: readonly MonsterDefinition[],
  ritualProcedures: readonly RitualProcedure[] = [],
  fusionProcedures: readonly FusionProcedure[] = [],
  spellTrapDefinitions: readonly SpellTrapDefinition[] = [],
): CoreEngine {
  const engine = createConfiguredEngine(seed, players);
  const content: MonsterCatalog = createMonsterCatalog(
    monsterDefinitions,
    players.map((player) => player.decks),
    ritualProcedures,
    fusionProcedures,
    spellTrapDefinitions,
  );
  const spatial = createInitialSpatialState(
    players.map((player) => player.playerId.trim()),
    bases,
  );
  return withHash({
    ...engine,
    state: deepFreeze({ ...engine.state, content, spatial, monsters: deepFreeze([]) }),
  });
}

function acceptedEvent(command: CommandEnvelope, step: number): CommandAcceptedEvent {
  return deepFreeze({
    type: "command_accepted" as const,
    step,
    sequence: command.sequence,
    issuer: command.issuer,
    kind: command.kind,
  });
}

function rejectedEvent(command: CommandEnvelope, step: number, reason: string): CommandRejectedEvent {
  return deepFreeze({
    type: "command_rejected" as const,
    step,
    sequence: command.sequence,
    issuer: command.issuer,
    kind: command.kind,
    reason,
  });
}

function numericPayload(command: CommandEnvelope, key: string): number {
  const value = command.payload[key];
  if (typeof value !== "number") {
    throw new TurnInvariantError(`${key} must be a number.`);
  }
  return value;
}

function stringPayload(command: CommandEnvelope, key: string): string {
  const value = command.payload[key];
  if (typeof value !== "string") {
    throw new TurnInvariantError(`${key} must be a string.`);
  }
  return value;
}

function resourceKindPayload(command: CommandEnvelope): "action" | "reaction" {
  const value = stringPayload(command, "resource");
  if (value !== "action" && value !== "reaction") {
    throw new TurnInvariantError(`Unknown resource kind ${value}.`);
  }
  return value;
}

function drawModePayload(command: CommandEnvelope): DrawMode {
  const value = stringPayload(command, "mode");
  if (value !== "two_monsters" && value !== "two_spell_traps" && value !== "one_each") {
    throw new TurnInvariantError(`Unknown draw mode ${value}.`);
  }
  return value;
}

function requireSystemIssuer(command: CommandEnvelope): void {
  if (command.issuer !== SYSTEM_ISSUER) {
    throw new TurnInvariantError(`${command.kind} can only be issued by the authoritative system.`);
  }
}

function assertAllowedPayloadKeys(command: CommandEnvelope, allowedKeys: readonly string[]): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(command.payload)) {
    if (!allowed.has(key)) {
      throw new TurnInvariantError(
        `invalid_command_payload: Unexpected field '${key}' in ${command.kind} payload.`,
      );
    }
  }
}

function booleanField(value: Record<string, JsonValue>, key: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") {
    throw new TypeError(`${key} must be a boolean.`);
  }
  return field;
}

function stringField(value: Record<string, JsonValue>, key: string): string {
  const field = value[key];
  if (typeof field !== "string") {
    throw new TypeError(`${key} must be a string.`);
  }
  return field;
}

function stringArrayPayload(command: CommandEnvelope, key: string): readonly string[] {
  const value = command.payload[key];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new TypeError(`${key} must be an array of strings.`);
  }
  return value;
}

function positionField(value: JsonValue | undefined, label: string): Position {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a position object.`);
  }
  const record = value as Readonly<Record<string, JsonValue>>;
  const x = record["x"];
  const y = record["y"];
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError(`${label}.x and ${label}.y must be safe integers.`);
  }
  return deepFreeze({ x: x as number, y: y as number });
}

function positionPayload(command: CommandEnvelope, key: string): Position {
  return positionField(command.payload[key], key);
}

function positionArrayPayload(command: CommandEnvelope, key: string): readonly Position[] {
  const value = command.payload[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${key} must be a non-empty array of positions.`);
  }
  return deepFreeze(value.map((entry, index) => positionField(entry, `${key}[${index}]`)));
}

function nullableStringPayload(command: CommandEnvelope, key: string): string | null {
  const value = command.payload[key];
  if (value !== null && typeof value !== "string") {
    throw new TypeError(`${key} must be a string or null.`);
  }
  return value;
}

function requireActivePlayer(state: SimulationState, playerId: string): void {
  if (state.turn.phase !== "action") {
    throw new TurnInvariantError("Gameplay commands can only resolve during the action phase.");
  }
  const player = state.turn.players.find((entry) => entry.playerId === playerId);
  if (player === undefined) throw new TurnInvariantError(`Unknown player ${playerId}.`);
  if (player.remaining === null) {
    throw new TurnInvariantError(`Player ${playerId} has no committed allocation.`);
  }
  if (player.participationEnded) {
    throw new TurnInvariantError(`Player ${playerId} has ended participation in this turn.`);
  }
}

function baseAttackResolutionsPayload(command: CommandEnvelope): readonly BaseAttackResolution[] {
  const values = command.payload.resolutions;
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("resolutions must be a non-empty array.");
  }
  return values.map((value, index) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`resolutions[${index}] must be an object.`);
    }
    const record = value as Record<string, JsonValue>;
    const attackType = stringField(record, "attackType");
    const attackerPosition = stringField(record, "attackerPosition");
    if (attackType !== "basic" && attackType !== "effect") {
      throw new TypeError(`Unknown attack type ${attackType}.`);
    }
    if (attackerPosition !== "attack" && attackerPosition !== "defense") {
      throw new TypeError(`Unknown battle position ${attackerPosition}.`);
    }
    return {
      attackerPlayerId: stringField(record, "attackerPlayerId"),
      defenderPlayerId: stringField(record, "defenderPlayerId"),
      attackType: attackType as AttackType,
      attackerPosition: attackerPosition as BattlePosition,
      anyPartResolved: booleanField(record, "anyPartResolved"),
      hitBaseValidly: booleanField(record, "hitBaseValidly"),
    };
  });
}

function applyCommand(
  state: SimulationState,
  command: CommandEnvelope,
  step: number,
): readonly [SimulationState, CoreEvent] {
  if (state.match.status === "finished") {
    return [state, rejectedEvent(command, step, "The match has already finished.")];
  }
  try {
    let turn = state.turn;
    let priorityToken = state.priorityToken;
    let randomAudit = state.randomAudit;
    let match = state.match;
    let cardSetup = state.cardSetup;
    let pendingDrawModes = state.pendingDrawModes;
    let lastCompletedDrawTurn = state.lastCompletedDrawTurn;
    let spatial = state.spatial;
    let monsters = state.monsters;
    let chainSystem = state.chainSystem;
    let chainWindows = state.chainWindows;
    let pendingBasicAttacks = state.pendingBasicAttacks;
    let pendingBaseAttacks = state.pendingBaseAttacks;
    let pendingReactionMovements = state.pendingReactionMovements;
    let lastCompletedSupportTurn = state.lastCompletedSupportTurn;
    let trapSlots = state.trapSlots ?? deepFreeze(state.turn.players.map((p) => createInitialTrapSlots(p.playerId)));
    let resolutionZone = state.resolutionZone ?? deepFreeze([]);
    let pendingSpellActivations = state.pendingSpellActivations ?? deepFreeze([]);
    let pendingTrapActivations = state.pendingTrapActivations ?? deepFreeze([]);
    const isUnitCommitted = (unitId: string): boolean =>
      pendingBasicAttacks.some(
        (attack) => attack.attackerUnitId === unitId || attack.defenderUnitId === unitId,
      ) || pendingBaseAttacks.some((attack) => attack.attackerUnitId === unitId);
    switch (command.kind) {
      case "cards.choose_draw_mode": {
        if (state.turn.phase !== "draw") {
          throw new TurnInvariantError("A draw mode can only be chosen during the draw phase.");
        }
        if (cardSetup === null) {
          throw new TurnInvariantError("The match has no configured Decks.");
        }
        if (!cardSetup.players.some((player) => player.playerId === command.issuer)) {
          throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        }
        if (pendingDrawModes.some((selection) => selection.playerId === command.issuer)) {
          throw new TurnInvariantError(`Player ${command.issuer} already chose a draw mode.`);
        }
        pendingDrawModes = deepFreeze([
          ...pendingDrawModes,
          deepFreeze({ playerId: command.issuer, mode: drawModePayload(command) }),
        ]);
        if (pendingDrawModes.length === cardSetup.players.length) {
          const losers: string[] = [];
          const players = cardSetup.players.map((player) => {
            const selection = pendingDrawModes.find((entry) => entry.playerId === player.playerId);
            if (selection === undefined) {
              throw new TurnInvariantError(`Player ${player.playerId} has no locked draw mode.`);
            }
            const result = drawForTurn(player, selection.mode);
            if (result.deckOut) losers.push(player.playerId);
            return result.state;
          });
          cardSetup = deepFreeze({ ...cardSetup, players: deepFreeze(players) });
          pendingDrawModes = deepFreeze([]);
          lastCompletedDrawTurn = state.turn.turnNumber;
          if (losers.length > 0) match = resolveDeckOut(match, losers);
        }
        break;
      }
      case "turn.allocate_resources":
        turn = submitResourceAllocation(turn, command.issuer, {
          actions: numericPayload(command, "actions"),
          reactions: numericPayload(command, "reactions"),
        });
        break;
      case "support.resolve_recovery": {
        requireSystemIssuer(command);
        if (state.turn.phase !== "support") {
          throw new TurnInvariantError("Support recovery can only resolve during the support phase.");
        }
        if (lastCompletedSupportTurn === state.turn.turnNumber) {
          throw new TurnInvariantError("Support recovery has already resolved this turn.");
        }
        monsters = deepFreeze(
          recoverMonstersAtSupport(monsters).map((result) => result.monster),
        );
        lastCompletedSupportTurn = state.turn.turnNumber;
        break;
      }
      case "summon.normal": {
        requireActivePlayer(state, command.issuer);
        if (cardSetup === null || state.content === null || spatial === null) {
          throw new TurnInvariantError("Normal Summon requires configured cards, content, and map.");
        }
        const playerIndex = cardSetup.players.findIndex(
          (player) => player.playerId === command.issuer,
        );
        const playerCards = cardSetup.players[playerIndex];
        if (playerCards === undefined) {
          throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        }
        const battlePosition = stringPayload(command, "battlePosition");
        if (battlePosition !== "attack" && battlePosition !== "defense") {
          throw new TypeError(`Unknown battle position ${battlePosition}.`);
        }
        const result = resolveNormalSummon({
          cardState: playerCards,
          catalog: state.content,
          monsters,
          spatial,
          playerId: command.issuer,
          cardInstanceId: stringPayload(command, "cardInstanceId"),
          unitId: stringPayload(command, "unitId"),
          anchorUnitId: nullableStringPayload(command, "anchorUnitId"),
          sharedVisibleTiles: calculateSharedVisibility(monsters, spatial, command.issuer),
          destination: positionPayload(command, "destination"),
          battlePosition,
        });
        cardSetup = deepFreeze({
          ...cardSetup,
          players: deepFreeze(
            cardSetup.players.map((player, index) =>
              index === playerIndex ? result.cardState : player,
            ),
          ),
        });
        spatial = result.spatial;
        monsters = result.monsters;
        break;
      }
      case "monster.move_basic": {
        requireActivePlayer(state, command.issuer);
        if (spatial === null) {
          throw new TurnInvariantError("Monster movement requires a configured map.");
        }
        const unitId = stringPayload(command, "unitId");
        if (isUnitCommitted(unitId)) {
          throw new TurnInvariantError(`Monster ${unitId} is committed to an open Chain.`);
        }
        const result = resolveMonsterMovement(
          monsters,
          spatial,
          unitId,
          command.issuer,
          positionArrayPayload(command, "path"),
        );
        spatial = result.spatial;
        monsters = result.monsters;
        break;
      }
      case "monster.change_battle_position": {
        requireActivePlayer(state, command.issuer);
        const unitId = stringPayload(command, "unitId");
        if (isUnitCommitted(unitId)) {
          throw new TurnInvariantError(`Monster ${unitId} is committed to an open Chain.`);
        }
        const nextMonsters = changeMonsterBattlePosition(monsters, unitId, command.issuer);
        turn = confirmResourceUse(turn, command.issuer, "action");
        monsters = nextMonsters;
        break;
      }
      case "monster.reanimate": {
        requireActivePlayer(state, command.issuer);
        if (cardSetup === null || state.content === null || spatial === null) {
          throw new TurnInvariantError("Reanimate requires configured cards, content, and map.");
        }
        const playerIndex = cardSetup.players.findIndex(
          (player) => player.playerId === command.issuer,
        );
        const playerCards = cardSetup.players[playerIndex];
        if (playerCards === undefined) {
          throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        }
        const battlePosition = stringPayload(command, "battlePosition");
        if (battlePosition !== "attack" && battlePosition !== "defense") {
          throw new TypeError(`Unknown battle position ${battlePosition}.`);
        }
        const result = resolveReanimate({
          cardState: playerCards,
          catalog: state.content,
          monsters,
          spatial,
          playerId: command.issuer,
          cardInstanceId: stringPayload(command, "cardInstanceId"),
          unitId: stringPayload(command, "unitId"),
          anchorUnitId: nullableStringPayload(command, "anchorUnitId"),
          sharedVisibleTiles: calculateSharedVisibility(monsters, spatial, command.issuer),
          destination: positionPayload(command, "destination"),
          battlePosition,
        });
        for (let cost = 0; cost < result.actionCost; cost += 1) {
          turn = confirmResourceUse(turn, command.issuer, "action");
        }
        cardSetup = deepFreeze({
          ...cardSetup,
          players: deepFreeze(
            cardSetup.players.map((player, index) =>
              index === playerIndex ? result.cardState : player,
            ),
          ),
        });
        spatial = result.spatial;
        monsters = result.monsters;
        break;
      }
      case "summon.tribute": {
        requireActivePlayer(state, command.issuer);
        if (cardSetup === null || state.content === null || spatial === null) {
          throw new TurnInvariantError("Tribute Summon requires configured cards, content, and map.");
        }
        const playerIndex = cardSetup.players.findIndex(
          (player) => player.playerId === command.issuer,
        );
        const playerCards = cardSetup.players[playerIndex];
        if (playerCards === undefined) {
          throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        }
        const battlePosition = stringPayload(command, "battlePosition");
        if (battlePosition !== "attack" && battlePosition !== "defense") {
          throw new TypeError(`Unknown battle position ${battlePosition}.`);
        }
        const result = resolveTributeSummon({
          cardState: playerCards,
          catalog: state.content,
          monsters,
          spatial,
          playerId: command.issuer,
          cardInstanceId: stringPayload(command, "cardInstanceId"),
          unitId: stringPayload(command, "unitId"),
          tributeUnitIds: stringArrayPayload(command, "tributeUnitIds"),
          destination: positionPayload(command, "destination"),
          battlePosition,
        });
        cardSetup = deepFreeze({
          ...cardSetup,
          players: deepFreeze(
            cardSetup.players.map((player, index) =>
              index === playerIndex ? result.cardState : player,
            ),
          ),
        });
        spatial = result.spatial;
        monsters = result.monsters;
        break;
      }
      case "summon.ritual": {
        assertAllowedPayloadKeys(command, [
          "ritualMonsterInstanceId",
          "ritualSpellInstanceId",
          "materialCardInstanceIds",
          "unitId",
          "anchorUnitId",
          "destination",
          "battlePosition",
        ]);
        requireActivePlayer(state, command.issuer);
        if (chainWindows.length > 0 || chainSystem.pendingChains.length > 0) {
          throw new TurnInvariantError("A Ritual Summon cannot be declared while a Chain is open or resolving.");
        }
        if (cardSetup === null || state.content === null || spatial === null) {
          throw new TurnInvariantError("Ritual Summon requires configured cards, content, and map.");
        }
        const playerIndex = cardSetup.players.findIndex(
          (player) => player.playerId === command.issuer,
        );
        const playerCards = cardSetup.players[playerIndex];
        if (playerCards === undefined) {
          throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        }
        const battlePosition = stringPayload(command, "battlePosition");
        if (battlePosition !== "attack" && battlePosition !== "defense") {
          throw new TypeError(`Unknown battle position ${battlePosition}.`);
        }
        const ritualSpellInstanceId = stringPayload(command, "ritualSpellInstanceId");
        const spellCard = playerCards.hand.find((card) => card.instanceId === ritualSpellInstanceId);
        if (spellCard === undefined || spellCard.kind !== "spell") {
          throw new TurnInvariantError("The selected Ritual Spell is not in the hand.");
        }
        const procedure = (state.content.ritualProcedures ?? []).find(
          (entry) => entry.spellDefinitionId === spellCard.definitionId,
        );
        if (procedure === undefined) {
          throw new TurnInvariantError(`No canonical Ritual Procedure found for spell ${spellCard.definitionId}.`);
        }
        const materialCardInstanceIds = stringArrayPayload(command, "materialCardInstanceIds");
        const mapMaterials = monsters.filter((monster) =>
          materialCardInstanceIds.includes(monster.cardInstanceId),
        );
        for (const mapMonster of mapMaterials) {
          if (isUnitCommitted(mapMonster.unitId)) {
            throw new TurnInvariantError(`Monster ${mapMonster.unitId} is committed to an open Chain.`);
          }
        }
        const result = resolveRitualSummon({
          cardState: playerCards,
          catalog: state.content,
          monsters,
          spatial,
          playerId: command.issuer,
          ritualMonsterInstanceId: stringPayload(command, "ritualMonsterInstanceId"),
          ritualSpellInstanceId,
          procedure,
          materialCardInstanceIds,
          unitId: stringPayload(command, "unitId"),
          anchorUnitId: nullableStringPayload(command, "anchorUnitId"),
          sharedVisibleTiles: calculateSharedVisibility(monsters, spatial, command.issuer),
          destination: positionPayload(command, "destination"),
          battlePosition,
        });
        cardSetup = deepFreeze({
          ...cardSetup,
          players: deepFreeze(
            cardSetup.players.map((player, index) =>
              index === playerIndex ? result.cardState : player,
            ),
          ),
        });
        spatial = result.spatial;
        monsters = result.monsters;
        break;
      }
      case "summon.fusion": {
        assertAllowedPayloadKeys(command, [
          "fusionMonsterInstanceId",
          "fusionSpellInstanceId",
          "materialCardInstanceIds",
          "unitId",
          "anchorUnitId",
          "destination",
          "battlePosition",
        ]);
        requireActivePlayer(state, command.issuer);
        if (chainWindows.length > 0 || chainSystem.pendingChains.length > 0) {
          throw new TurnInvariantError("A Fusion Summon cannot be declared while a Chain is open or resolving.");
        }
        if (cardSetup === null || state.content === null || spatial === null) {
          throw new TurnInvariantError("Fusion Summon requires configured cards, content, and map.");
        }
        const playerIndex = cardSetup.players.findIndex(
          (player) => player.playerId === command.issuer,
        );
        const playerCards = cardSetup.players[playerIndex];
        if (playerCards === undefined) {
          throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        }
        const battlePosition = stringPayload(command, "battlePosition");
        if (battlePosition !== "attack" && battlePosition !== "defense") {
          throw new TypeError(`Unknown battle position ${battlePosition}.`);
        }
        const fusionSpellInstanceId = stringPayload(command, "fusionSpellInstanceId");
        const spellCard = playerCards.hand.find((card) => card.instanceId === fusionSpellInstanceId);
        if (spellCard === undefined || spellCard.kind !== "spell") {
          throw new TurnInvariantError("The selected Fusion Spell is not in the hand.");
        }
        const fusionMonsterInstanceId = stringPayload(command, "fusionMonsterInstanceId");
        const fusionMonsterCard = playerCards.extraDeck.find(
          (card) => card.instanceId === fusionMonsterInstanceId,
        );
        if (fusionMonsterCard === undefined || fusionMonsterCard.kind !== "fusion_monster") {
          throw new TurnInvariantError("The selected Fusion Monster is not in the Extra Deck.");
        }
        const procedure = (state.content.fusionProcedures ?? []).find(
          (entry) =>
            entry.spellDefinitionId === spellCard.definitionId &&
            entry.fusionDefinitionId === fusionMonsterCard.definitionId,
        );
        if (procedure === undefined) {
          throw new TurnInvariantError(
            `No canonical Fusion Procedure found for spell ${spellCard.definitionId} and monster ${fusionMonsterCard.definitionId}.`,
          );
        }
        const materialCardInstanceIds = stringArrayPayload(command, "materialCardInstanceIds");
        const mapMaterials = monsters.filter((monster) =>
          materialCardInstanceIds.includes(monster.cardInstanceId),
        );
        for (const mapMonster of mapMaterials) {
          if (isUnitCommitted(mapMonster.unitId)) {
            throw new TurnInvariantError(`Monster ${mapMonster.unitId} is committed to an open Chain.`);
          }
        }
        const result = resolveFusionSummon({
          cardState: playerCards,
          catalog: state.content,
          monsters,
          spatial,
          playerId: command.issuer,
          fusionMonsterInstanceId,
          fusionSpellInstanceId,
          procedure,
          materialCardInstanceIds,
          unitId: stringPayload(command, "unitId"),
          anchorUnitId: nullableStringPayload(command, "anchorUnitId"),
          sharedVisibleTiles: calculateSharedVisibility(monsters, spatial, command.issuer),
          destination: positionPayload(command, "destination"),
          battlePosition,
        });
        cardSetup = deepFreeze({
          ...cardSetup,
          players: deepFreeze(
            cardSetup.players.map((player, index) =>
              index === playerIndex ? result.cardState : player,
            ),
          ),
        });
        spatial = result.spatial;
        monsters = result.monsters;
        break;
      }
      case "battle.declare_basic_attack": {
        requireActivePlayer(state, command.issuer);
        if (spatial === null) {
          throw new TurnInvariantError("A Basic Attack requires a configured map.");
        }
        const attackerUnitId = stringPayload(command, "attackerUnitId");
        const defenderUnitId = stringPayload(command, "defenderUnitId");
        const attacker = monsters.find((monster) => monster.unitId === attackerUnitId);
        const defender = monsters.find((monster) => monster.unitId === defenderUnitId);
        if (attacker === undefined || defender === undefined) {
          throw new TurnInvariantError("Both Basic Attack combatants must be on the battlefield.");
        }
        if (attacker.ownerPlayerId !== command.issuer) {
          throw new TurnInvariantError(
            `Player ${command.issuer} does not control attacker ${attackerUnitId}.`,
          );
        }
        const visible = new Set(
          calculateSharedVisibility(monsters, spatial, command.issuer).map(positionKey),
        );
        createBasicAttackPlan(
          attacker,
          defender,
          spatial,
          [],
          visible.has(positionKey(defender.position)),
          false,
        );
        turn = confirmResourceUse(turn, command.issuer, "action");
        const elementId = `basic-attack:${command.sequence}`;
        const chainId = `chain:${command.sequence}`;
        chainSystem = openChain(chainSystem, chainId, "normal", {
          elementId,
          controllerId: command.issuer,
          kind: "action",
          targetIds: deepFreeze([defenderUnitId]),
          requiresAllTargets: true,
          negated: false,
        });
        const opponent = state.turn.players.find(
          (player) => player.playerId !== command.issuer,
        );
        if (opponent === undefined) {
          throw new TurnInvariantError("A Chain requires an opposing player.");
        }
        chainWindows = deepFreeze([
          ...chainWindows,
          openChainWindow(chainId, command.issuer, opponent.playerId),
        ]);
        const pending: PendingBasicAttack = deepFreeze({
          elementId,
          attackerUnitId,
          defenderUnitId,
          actingPlayerId: command.issuer,
          defenderChoosesCounterattack: false,
        });
        pendingBasicAttacks = deepFreeze([...pendingBasicAttacks, pending]);
        break;
      }
      case "battle.choose_counterattack": {
        if (spatial === null) {
          throw new TurnInvariantError("A counterattack choice requires a configured map.");
        }
        const elementId = stringPayload(command, "elementId");
        const pendingIndex = pendingBasicAttacks.findIndex(
          (attack) => attack.elementId === elementId,
        );
        const pending = pendingBasicAttacks[pendingIndex];
        if (pending === undefined) {
          throw new TurnInvariantError(`Unknown pending Basic Attack ${elementId}.`);
        }
        const attacker = monsters.find((monster) => monster.unitId === pending.attackerUnitId);
        const defender = monsters.find((monster) => monster.unitId === pending.defenderUnitId);
        if (attacker === undefined || defender === undefined) {
          throw new TurnInvariantError("Both combatants must remain on the battlefield.");
        }
        if (defender.ownerPlayerId !== command.issuer) {
          throw new TurnInvariantError(
            `Player ${command.issuer} does not control defender ${pending.defenderUnitId}.`,
          );
        }
        const windowIndex = chainWindows.findIndex((window) =>
          chainSystem.pendingChains.some(
            (chain) => chain.chainId === window.chainId &&
              chain.elements.some((element) => element.elementId === elementId),
          ),
        );
        const window = chainWindows[windowIndex];
        if (window === undefined) {
          throw new TurnInvariantError(`Basic Attack ${elementId} has no open Chain window.`);
        }
        const visible = new Set(
          calculateSharedVisibility(monsters, spatial, pending.actingPlayerId).map(positionKey),
        );
        const plan = createBasicAttackPlan(
          attacker,
          defender,
          spatial,
          [],
          visible.has(positionKey(defender.position)),
          true,
        );
        if (!plan.counterattackAvailable || plan.mode !== "counterattack") {
          throw new TurnInvariantError(`Defender ${defender.unitId} cannot counterattack.`);
        }
        const nextWindow = confirmChainResponse(
          window,
          command.issuer,
          pending.actingPlayerId,
        );
        chainWindows = deepFreeze(
          chainWindows.map((current, index) => (index === windowIndex ? nextWindow : current)),
        );
        pendingBasicAttacks = deepFreeze(
          pendingBasicAttacks.map((attack, index) =>
            index === pendingIndex
              ? deepFreeze({ ...attack, defenderChoosesCounterattack: true })
              : attack,
          ),
        );
        break;
      }
      case "battle.activate_bulwark": {
        if (spatial === null) {
          throw new TurnInvariantError("A BULWARK activation requires a configured map.");
        }
        const elementId = stringPayload(command, "elementId");
        const pendingIndex = pendingBasicAttacks.findIndex(
          (attack) => attack.elementId === elementId,
        );
        const pending = pendingBasicAttacks[pendingIndex];
        if (pending === undefined) {
          throw new TurnInvariantError(`Unknown pending Basic Attack ${elementId}.`);
        }
        const defender = monsters.find((monster) => monster.unitId === pending.defenderUnitId);
        if (defender === undefined) {
          throw new TurnInvariantError("Defender must remain on the battlefield.");
        }
        if (defender.ownerPlayerId !== command.issuer) {
          throw new TurnInvariantError(
            `Player ${command.issuer} does not control defender ${pending.defenderUnitId}.`,
          );
        }
        if (!hasKeyword(defender, "BULWARK")) {
          throw new TurnInvariantError(`Defender ${defender.unitId} does not possess BULWARK.`);
        }
        if (defender.battlePosition !== "attack") {
          throw new TurnInvariantError(`Defender ${defender.unitId} is not in attack position.`);
        }
        const windowIndex = chainWindows.findIndex((window) =>
          chainSystem.pendingChains.some(
            (chain) => chain.chainId === window.chainId &&
              chain.elements.some((element) => element.elementId === elementId),
          ),
        );
        const window = chainWindows[windowIndex];
        if (window === undefined) {
          throw new TurnInvariantError(`Basic Attack ${elementId} has no open Chain window.`);
        }
        monsters = deepFreeze(
          monsters.map((monster) =>
            monster.unitId === defender.unitId
              ? deepFreeze({ ...monster, battlePosition: "defense" as const })
              : monster,
          ),
        );
        pendingBasicAttacks = deepFreeze(
          pendingBasicAttacks.map((attack, index) =>
            index === pendingIndex
              ? deepFreeze({ ...attack, defenderChoosesCounterattack: false })
              : attack,
          ),
        );
        const nextWindow = confirmChainResponse(
          window,
          command.issuer,
          pending.actingPlayerId,
        );
        chainWindows = deepFreeze(
          chainWindows.map((current, index) => (index === windowIndex ? nextWindow : current)),
        );
        break;
      }
      case "battle.declare_base_attack": {
        requireActivePlayer(state, command.issuer);
        if (spatial === null) {
          throw new TurnInvariantError("A base attack requires a configured map.");
        }
        const attackerUnitId = stringPayload(command, "attackerUnitId");
        const defenderPlayerId = stringPayload(command, "defenderPlayerId");
        const attacker = monsters.find((monster) => monster.unitId === attackerUnitId);
        if (attacker === undefined) {
          throw new TurnInvariantError(`Unknown attacker ${attackerUnitId}.`);
        }
        if (attacker.ownerPlayerId !== command.issuer) {
          throw new TurnInvariantError(
            `Player ${command.issuer} does not control attacker ${attackerUnitId}.`,
          );
        }
        const targetBase = spatial.bases.find((base) => base.playerId === defenderPlayerId);
        if (targetBase === undefined) {
          throw new TurnInvariantError(`Unknown defender base ${defenderPlayerId}.`);
        }
        const visible = new Set(
          calculateSharedVisibility(monsters, spatial, command.issuer).map(positionKey),
        );
        createBaseAttackPlan(
          attacker,
          defenderPlayerId,
          spatial,
          [],
          visible.has(positionKey(targetBase.position)),
        );
        turn = confirmResourceUse(turn, command.issuer, "action");
        const elementId = `base-attack:${command.sequence}`;
        const chainId = `chain:${command.sequence}`;
        chainSystem = openChain(chainSystem, chainId, "normal", {
          elementId,
          controllerId: command.issuer,
          kind: "action",
          targetIds: deepFreeze([`base:${defenderPlayerId}`]),
          requiresAllTargets: true,
          negated: false,
        });
        chainWindows = deepFreeze([
          ...chainWindows,
          openChainWindow(chainId, command.issuer, defenderPlayerId),
        ]);
        const pending: PendingBaseAttack = deepFreeze({
          elementId,
          attackerUnitId,
          actingPlayerId: command.issuer,
          defenderPlayerId,
        });
        pendingBaseAttacks = deepFreeze([...pendingBaseAttacks, pending]);
        break;
      }
      case "chain.react_move": {
        if (spatial === null) {
          throw new TurnInvariantError("Reaction movement requires a configured map.");
        }
        const chainId = stringPayload(command, "chainId");
        const unitId = stringPayload(command, "unitId");
        const path = positionArrayPayload(command, "path");
        const windowIndex = chainWindows.findIndex((window) => window.chainId === chainId);
        const window = chainWindows[windowIndex];
        if (window === undefined) throw new TurnInvariantError(`Unknown Chain window ${chainId}.`);
        const chain = chainSystem.pendingChains.find((current) => current.chainId === chainId);
        if (chain === undefined) throw new TurnInvariantError(`Unknown Chain ${chainId}.`);
        const elementIds = new Set(chain.elements.map((element) => element.elementId));
        const involved = pendingBasicAttacks.some(
          (attack) => elementIds.has(attack.elementId) &&
            (attack.attackerUnitId === unitId || attack.defenderUnitId === unitId),
        ) || pendingBaseAttacks.some(
          (attack) => elementIds.has(attack.elementId) && attack.attackerUnitId === unitId,
        );
        if (!involved) {
          throw new TurnInvariantError(
            `Monster ${unitId} is not directly involved in Chain ${chainId}.`,
          );
        }
        const otherPlayer = state.turn.players.find(
          (player) => player.playerId !== command.issuer,
        );
        if (otherPlayer === undefined) throw new TurnInvariantError("Reaction requires an opponent.");
        resolveMonsterMovement(monsters, spatial, unitId, command.issuer, path);
        const nextWindow = confirmChainResponse(window, command.issuer, otherPlayer.playerId);
        const elementId = `reaction-move:${command.sequence}`;
        chainSystem = addChainElement(chainSystem, chainId, {
          elementId,
          controllerId: command.issuer,
          kind: "reaction",
          targetIds: deepFreeze([unitId]),
          requiresAllTargets: true,
          negated: false,
        });
        turn = confirmResourceUse(turn, command.issuer, "reaction");
        const pending: PendingReactionMovement = deepFreeze({
          elementId,
          chainId,
          playerId: command.issuer,
          unitId,
          path: deepFreeze(path.map((position) => deepFreeze({ ...position }))),
        });
        pendingReactionMovements = deepFreeze([...pendingReactionMovements, pending]);
        chainWindows = deepFreeze(
          chainWindows.map((current, index) => (index === windowIndex ? nextWindow : current)),
        );
        break;
      }
      case "chain.pass_priority": {
        const chainId = stringPayload(command, "chainId");
        const windowIndex = chainWindows.findIndex((window) => window.chainId === chainId);
        const window = chainWindows[windowIndex];
        if (window === undefined) {
          throw new TurnInvariantError(`Unknown Chain window ${chainId}.`);
        }
        const nextWindow = passChainPriority(window, command.issuer);
        chainWindows = deepFreeze(
          chainWindows.map((current, index) => (index === windowIndex ? nextWindow : current)),
        );
        break;
      }
      case "chain.resolve_next": {
        requireSystemIssuer(command);
        if (spatial === null || cardSetup === null) {
          throw new TurnInvariantError("Chain resolution requires configured cards and map.");
        }
        const nextChain = [...chainSystem.pendingChains].sort(
          (left, right) => left.registrationSequence - right.registrationSequence,
        )[0];
        if (nextChain === undefined) {
          throw new TurnInvariantError("There is no pending Chain to resolve.");
        }
        const window = chainWindows.find((current) => current.chainId === nextChain.chainId);
        if (window === undefined || window.stage !== "closed") {
          throw new TurnInvariantError(`Chain ${nextChain.chainId} still has an open response window.`);
        }
        const resolution = resolveNextChain(
          chainSystem,
          { monsters, spatial, cardStates: cardSetup.players, match, randomAudit },
          {
            isTargetValid: (battleState, targetId, element) => {
              const pendingMovement = pendingReactionMovements.find(
                (movement) => movement.elementId === element.elementId,
              );
              if (pendingMovement !== undefined) {
                if (pendingMovement.unitId !== targetId) return false;
                try {
                  resolveMonsterMovement(
                    battleState.monsters,
                    battleState.spatial,
                    pendingMovement.unitId,
                    pendingMovement.playerId,
                    pendingMovement.path,
                  );
                  return true;
                } catch {
                  return false;
                }
              }
              const pendingSpell = pendingSpellActivations.find((s) => s.elementId === element.elementId);
              if (pendingSpell !== undefined) {
                if (pendingSpell.targetUnitIds.length === 0) return true;
                return pendingSpell.targetUnitIds.every((id) => battleState.monsters.some((m) => m.unitId === id));
              }
              const pendingTrap = pendingTrapActivations.find((t) => t.elementId === element.elementId);
              if (pendingTrap !== undefined) {
                if (pendingTrap.targetElementId) return true;
                if (pendingTrap.targetUnitIds.length === 0) return true;
                return pendingTrap.targetUnitIds.every((id) => battleState.monsters.some((m) => m.unitId === id));
              }
              const pending = pendingBasicAttacks.find(
                (attack) => attack.elementId === element.elementId,
              );
              const pendingBase = pendingBaseAttacks.find(
                (attack) => attack.elementId === element.elementId,
              );
              if (pending === undefined) {
                if (pendingBase === undefined || `base:${pendingBase.defenderPlayerId}` !== targetId) {
                  return false;
                }
                const attacker = battleState.monsters.find(
                  (monster) => monster.unitId === pendingBase.attackerUnitId,
                );
                const targetBase = battleState.spatial.bases.find(
                  (base) => base.playerId === pendingBase.defenderPlayerId,
                );
                if (attacker === undefined || targetBase === undefined) return false;
                const visible = new Set(
                  calculateSharedVisibility(
                    battleState.monsters,
                    battleState.spatial,
                    pendingBase.actingPlayerId,
                  ).map(positionKey),
                );
                try {
                  createBaseAttackPlan(
                    attacker,
                    pendingBase.defenderPlayerId,
                    battleState.spatial,
                    [],
                    visible.has(positionKey(targetBase.position)),
                  );
                  return true;
                } catch {
                  return false;
                }
              }
              if (pending.defenderUnitId !== targetId) return false;
              const attacker = battleState.monsters.find(
                (monster) => monster.unitId === pending.attackerUnitId,
              );
              const defender = battleState.monsters.find(
                (monster) => monster.unitId === pending.defenderUnitId,
              );
              if (attacker === undefined || defender === undefined) return false;
              const visible = new Set(
                calculateSharedVisibility(
                  battleState.monsters,
                  battleState.spatial,
                  pending.actingPlayerId,
                ).map(positionKey),
              );
              try {
                createBasicAttackPlan(
                  attacker,
                  defender,
                  battleState.spatial,
                  [],
                  visible.has(positionKey(defender.position)),
                  pending.defenderChoosesCounterattack,
                );
                return true;
              } catch {
                return false;
              }
            },
            applyElement: (battleState, element) => {
              const pendingMovement = pendingReactionMovements.find(
                (movement) => movement.elementId === element.elementId,
              );
              if (pendingMovement !== undefined) {
                const movement = resolveMonsterMovement(
                  battleState.monsters,
                  battleState.spatial,
                  pendingMovement.unitId,
                  pendingMovement.playerId,
                  pendingMovement.path,
                );
                return { ...battleState, monsters: movement.monsters, spatial: movement.spatial };
              }
              const pendingSpell = pendingSpellActivations.find((s) => s.elementId === element.elementId);
              if (pendingSpell !== undefined) {
                if (pendingSpell.effectKind === "destroy_monster") {
                  const targetMonster = battleState.monsters.find((m) => pendingSpell.targetUnitIds.includes(m.unitId));
                  if (targetMonster) {
                    const nextMonsters = battleState.monsters.filter((m) => m.unitId !== targetMonster.unitId);
                    const nextSpatialUnits = battleState.spatial.units.filter((u) => u.unitId !== targetMonster.unitId);
                    const updatedSpatial = { ...battleState.spatial, units: deepFreeze(nextSpatialUnits) };
                    const ownerIdx = battleState.cardStates.findIndex((p) => p.playerId === targetMonster.ownerPlayerId);
                    let nextCardStates = [...battleState.cardStates];
                    const existingOwner = ownerIdx >= 0 ? nextCardStates[ownerIdx] : undefined;
                    if (existingOwner) {
                      let owner = addCardToGraveyard(existingOwner, {
                        definitionId: targetMonster.definitionId,
                        instanceId: targetMonster.cardInstanceId,
                        name: targetMonster.name,
                        kind: targetMonster.type === "normal" ? "normal_monster" : "effect_monster",
                      });
                      if (targetMonster.equippedCards && targetMonster.equippedCards.length > 0) {
                        for (const equip of targetMonster.equippedCards) {
                          owner = addCardToGraveyard(owner, equip);
                        }
                      }
                      nextCardStates[ownerIdx] = owner;
                    }
                    return {
                      ...battleState,
                      monsters: deepFreeze(nextMonsters),
                      spatial: deepFreeze(updatedSpatial),
                      cardStates: deepFreeze(nextCardStates),
                    };
                  }
                } else if (pendingSpell.effectKind === "damage") {
                  const targetMonster = battleState.monsters.find((m) => pendingSpell.targetUnitIds.includes(m.unitId));
                  if (targetMonster) {
                    const dmg = pendingSpell.value ?? 2;
                    const nextHp = Math.max(0, targetMonster.hp.current - dmg);
                    if (nextHp === 0) {
                      const nextMonsters = battleState.monsters.filter((m) => m.unitId !== targetMonster.unitId);
                      const nextSpatialUnits = battleState.spatial.units.filter((u) => u.unitId !== targetMonster.unitId);
                      const updatedSpatial = { ...battleState.spatial, units: deepFreeze(nextSpatialUnits) };
                      const ownerIdx = battleState.cardStates.findIndex((p) => p.playerId === targetMonster.ownerPlayerId);
                      let nextCardStates = [...battleState.cardStates];
                      const existingOwner = ownerIdx >= 0 ? nextCardStates[ownerIdx] : undefined;
                      if (existingOwner) {
                        let owner = addCardToGraveyard(existingOwner, {
                          definitionId: targetMonster.definitionId,
                          instanceId: targetMonster.cardInstanceId,
                          name: targetMonster.name,
                          kind: targetMonster.type === "normal" ? "normal_monster" : "effect_monster",
                        });
                        if (targetMonster.equippedCards && targetMonster.equippedCards.length > 0) {
                          for (const equip of targetMonster.equippedCards) {
                            owner = addCardToGraveyard(owner, equip);
                          }
                        }
                        nextCardStates[ownerIdx] = owner;
                      }
                      return {
                        ...battleState,
                        monsters: deepFreeze(nextMonsters),
                        spatial: deepFreeze(updatedSpatial),
                        cardStates: deepFreeze(nextCardStates),
                      };
                    } else {
                      const nextMonsters = battleState.monsters.map((m) =>
                        m.unitId === targetMonster.unitId ? deepFreeze({ ...m, hp: { ...m.hp, current: nextHp } }) : m,
                      );
                      return { ...battleState, monsters: deepFreeze(nextMonsters) };
                    }
                  }
                }
                return battleState;
              }
              const pendingTrap = pendingTrapActivations.find((t) => t.elementId === element.elementId);
              if (pendingTrap !== undefined) {
                if (pendingTrap.effectKind === "destroy_monster") {
                  const targetMonster = battleState.monsters.find((m) => pendingTrap.targetUnitIds.includes(m.unitId));
                  if (targetMonster) {
                    const nextMonsters = battleState.monsters.filter((m) => m.unitId !== targetMonster.unitId);
                    const nextSpatialUnits = battleState.spatial.units.filter((u) => u.unitId !== targetMonster.unitId);
                    const updatedSpatial = { ...battleState.spatial, units: deepFreeze(nextSpatialUnits) };
                    const ownerIdx = battleState.cardStates.findIndex((p) => p.playerId === targetMonster.ownerPlayerId);
                    let nextCardStates = [...battleState.cardStates];
                    const existingOwner = ownerIdx >= 0 ? nextCardStates[ownerIdx] : undefined;
                    if (existingOwner) {
                      let owner = addCardToGraveyard(existingOwner, {
                        definitionId: targetMonster.definitionId,
                        instanceId: targetMonster.cardInstanceId,
                        name: targetMonster.name,
                        kind: targetMonster.type === "normal" ? "normal_monster" : "effect_monster",
                      });
                      if (targetMonster.equippedCards && targetMonster.equippedCards.length > 0) {
                        for (const equip of targetMonster.equippedCards) {
                          owner = addCardToGraveyard(owner, equip);
                        }
                      }
                      nextCardStates[ownerIdx] = owner;
                    }
                    return {
                      ...battleState,
                      monsters: deepFreeze(nextMonsters),
                      spatial: deepFreeze(updatedSpatial),
                      cardStates: deepFreeze(nextCardStates),
                    };
                  }
                }
                return battleState;
              }
              const pending = pendingBasicAttacks.find(
                (attack) => attack.elementId === element.elementId,
              );
              if (pending === undefined) {
                const pendingBase = pendingBaseAttacks.find(
                  (attack) => attack.elementId === element.elementId,
                );
                if (pendingBase === undefined) return battleState;
                const targetBase = battleState.spatial.bases.find(
                  (base) => base.playerId === pendingBase.defenderPlayerId,
                );
                if (targetBase === undefined) return battleState;
                const visible = new Set(
                  calculateSharedVisibility(
                    battleState.monsters,
                    battleState.spatial,
                    pendingBase.actingPlayerId,
                  ).map(positionKey),
                );
                const baseAttack = resolveConfirmedBaseAttack(
                  battleState.match,
                  battleState.monsters,
                  battleState.spatial,
                  pendingBase.actingPlayerId,
                  pendingBase.attackerUnitId,
                  pendingBase.defenderPlayerId,
                  [],
                  visible.has(positionKey(targetBase.position)),
                  state.seed,
                  `base-reposition:${pendingBase.elementId}`,
                );
                return {
                  ...battleState,
                  match: baseAttack.match,
                  monsters: baseAttack.monsters,
                  spatial: baseAttack.spatial,
                  randomAudit: baseAttack.randomLog === null
                    ? battleState.randomAudit
                    : deepFreeze([...battleState.randomAudit, baseAttack.randomLog]),
                };
              }
              const defender = battleState.monsters.find(
                (monster) => monster.unitId === pending.defenderUnitId,
              );
              if (defender === undefined) return battleState;
              const visible = new Set(
                calculateSharedVisibility(
                  battleState.monsters,
                  battleState.spatial,
                  pending.actingPlayerId,
                ).map(positionKey),
              );
              const battle = resolveConfirmedBasicAttack(
                battleState.monsters,
                battleState.spatial,
                battleState.cardStates,
                pending.actingPlayerId,
                pending.attackerUnitId,
                pending.defenderUnitId,
                [],
                visible.has(positionKey(defender.position)),
                pending.defenderChoosesCounterattack,
              );
              return {
                ...battleState,
                monsters: battle.monsters,
                spatial: battle.spatial,
                cardStates: battle.cardStates,
              };
            },
          },
        );
        const resolvedElementIds = new Set(
          resolution.outcomes.map((outcome) => outcome.elementId),
        );
        chainSystem = resolution.system;
        chainWindows = deepFreeze(
          chainWindows.filter((current) => current.chainId !== nextChain.chainId),
        );
        pendingBasicAttacks = deepFreeze(
          pendingBasicAttacks.filter(
            (attack) => !resolvedElementIds.has(attack.elementId),
          ),
        );
        pendingBaseAttacks = deepFreeze(
          pendingBaseAttacks.filter(
            (attack) => !resolvedElementIds.has(attack.elementId),
          ),
        );
        pendingReactionMovements = deepFreeze(
          pendingReactionMovements.filter(
            (movement) => !resolvedElementIds.has(movement.elementId),
          ),
        );
        monsters = resolution.state.monsters;
        spatial = resolution.state.spatial;
        match = resolution.state.match;
        randomAudit = resolution.state.randomAudit;
        cardSetup = deepFreeze({ ...cardSetup, players: resolution.state.cardStates });
        const chainResCards = resolutionZone.filter((r) => r.chainId === nextChain.chainId);
        if (chainResCards.length > 0) {
          let updatedCardStates = [...cardSetup.players];
          for (const res of chainResCards) {
            const playerIdx = updatedCardStates.findIndex((p) => p.playerId === res.controllerPlayerId);
            const targetPlayerCardState = playerIdx >= 0 ? updatedCardStates[playerIdx] : undefined;
            if (targetPlayerCardState) {
              updatedCardStates[playerIdx] = addCardToGraveyard(targetPlayerCardState, res.card);
            }
          }
          cardSetup = deepFreeze({ ...cardSetup, players: deepFreeze(updatedCardStates) });
          resolutionZone = deepFreeze(resolutionZone.filter((r) => r.chainId !== nextChain.chainId));
        }
        pendingSpellActivations = deepFreeze(
          pendingSpellActivations.filter((s) => !resolvedElementIds.has(s.elementId)),
        );
        pendingTrapActivations = deepFreeze(
          pendingTrapActivations.filter((t) => !resolvedElementIds.has(t.elementId)),
        );
        if (match.status === "finished") {
          chainSystem = deepFreeze({ ...chainSystem, pendingChains: deepFreeze([]) });
          chainWindows = deepFreeze([]);
          pendingBasicAttacks = deepFreeze([]);
          pendingBaseAttacks = deepFreeze([]);
          pendingReactionMovements = deepFreeze([]);
        }
        break;
      }
      case "turn.confirm_resource_use":
        turn = confirmResourceUse(turn, command.issuer, resourceKindPayload(command));
        break;
      case "turn.end_participation":
        turn = endPlayerParticipation(turn, command.issuer);
        break;
      case "turn.settle_resources":
        requireSystemIssuer(command);
        turn = settleResourceExhaustion(
          turn,
          numericPayload(command, "openInteractionCount"),
          stringArrayPayload(command, "exhaustedPlayerIds"),
        );
        break;
      case "turn.advance_completed_phase":
        requireSystemIssuer(command);
        if (
          state.turn.phase === "draw" &&
          lastCompletedDrawTurn !== state.turn.turnNumber
        ) {
          throw new TurnInvariantError("The draw phase cannot advance before both draws resolve.");
        }
        if (
          state.turn.phase === "support" &&
          lastCompletedSupportTurn !== state.turn.turnNumber
        ) {
          throw new TurnInvariantError("The support phase cannot advance before recovery resolves.");
        }
        turn = advanceCompletedPhase(turn);
        if (state.turn.phase === "end" && turn.phase === "draw") {
          priorityToken = alternatePriorityToken(priorityToken);
        }
        break;
      case "match.resolve_simultaneous_base_attacks":
        requireSystemIssuer(command);
        match = resolveSimultaneousBaseAttacks(
          match,
          priorityToken,
          baseAttackResolutionsPayload(command),
        ).state;
        break;
      case "trap.set": {
        if (cardSetup === null) throw new TurnInvariantError("Setting a trap requires configured cards.");
        const cardInstanceId = stringPayload(command, "cardInstanceId");
        const slotIndex = numericPayload(command, "slotIndex");
        if (slotIndex < 0 || slotIndex >= 3) {
          throw new TurnInvariantError("Trap slot index must be 0, 1, or 2.");
        }
        const playerCardIndex = cardSetup.players.findIndex((p) => p.playerId === command.issuer);
        if (playerCardIndex < 0) throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        const playerCardState = cardSetup.players[playerCardIndex];
        if (!playerCardState) throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        const cardInHand = playerCardState.hand.find((c) => c.instanceId === cardInstanceId);
        if (!cardInHand) {
          throw new TurnInvariantError(`Card ${cardInstanceId} is not in hand.`);
        }
        if (cardInHand.kind !== "trap") {
          throw new TurnInvariantError(`Card ${cardInHand.name} is not a Trap card.`);
        }
        const playerTrapIndex = trapSlots.findIndex((p) => p.playerId === command.issuer);
        const existingPlayerTraps = playerTrapIndex >= 0 ? trapSlots[playerTrapIndex] : undefined;
        const playerTraps = existingPlayerTraps ?? createInitialTrapSlots(command.issuer);
        const targetSlot = playerTraps.slots[slotIndex];
        if (!targetSlot || targetSlot.card !== null) {
          throw new TurnInvariantError(`Trap slot ${slotIndex} is already occupied.`);
        }
        const removed = removeCardFromHand(playerCardState, cardInstanceId);
        const updatedPlayers = cardSetup.players.map((p, idx) =>
          idx === playerCardIndex ? removed.state : p,
        );
        cardSetup = deepFreeze({ ...cardSetup, players: deepFreeze(updatedPlayers) });

        const isFieldTrap = Boolean(command.payload?.isFieldTrap);
        const fieldRegion = Array.isArray(command.payload?.fieldRegion)
          ? deepFreeze((command.payload.fieldRegion as Position[]).map((pos) => ({ x: Number(pos.x), y: Number(pos.y) })))
          : undefined;

        const updatedSlots: [TrapSlotState, TrapSlotState, TrapSlotState] = [
          playerTraps.slots[0],
          playerTraps.slots[1],
          playerTraps.slots[2],
        ];
        updatedSlots[slotIndex] = deepFreeze({
          slotIndex,
          card: cardInHand,
          isFieldTrap,
          revealed: false,
          ...(fieldRegion !== undefined ? { fieldRegion } : {}),
        });

        const updatedPlayerTraps = deepFreeze({
          playerId: command.issuer,
          slots: deepFreeze(updatedSlots) as readonly [TrapSlotState, TrapSlotState, TrapSlotState],
        });
        trapSlots = deepFreeze(
          playerTrapIndex >= 0
            ? trapSlots.map((p, idx) => (idx === playerTrapIndex ? updatedPlayerTraps : p))
            : [...trapSlots, updatedPlayerTraps],
        );
        break;
      }
      case "spell.equip": {
        if (state.turn.phase !== "action") {
          throw new TurnInvariantError("A spell can only be equipped during the action phase.");
        }
        if (cardSetup === null || spatial === null) {
          throw new TurnInvariantError("Equipping a spell requires configured cards and map.");
        }
        const cardInstanceId = stringPayload(command, "cardInstanceId");
        const targetUnitId = stringPayload(command, "targetUnitId");
        const playerCardIndex = cardSetup.players.findIndex((p) => p.playerId === command.issuer);
        if (playerCardIndex < 0) throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        const playerCardState = cardSetup.players[playerCardIndex]!;
        const cardInHand = playerCardState.hand.find((c) => c.instanceId === cardInstanceId);
        if (!cardInHand) {
          throw new TurnInvariantError(`Card ${cardInstanceId} is not in hand.`);
        }
        if (cardInHand.kind !== "spell") {
          throw new TurnInvariantError(`Card ${cardInHand.name} is not a Spell card.`);
        }
        const targetMonster = monsters.find((m) => m.unitId === targetUnitId);
        if (!targetMonster) {
          throw new TurnInvariantError(`Target monster ${targetUnitId} is not on the battlefield.`);
        }
        if (targetMonster.ownerPlayerId !== command.issuer) {
          throw new TurnInvariantError(`Player ${command.issuer} does not control target monster ${targetUnitId}.`);
        }
        const currentEquipped = targetMonster.equippedCards ?? [];
        if (currentEquipped.length >= MAX_EQUIPMENT_PER_MONSTER) {
          throw new TurnInvariantError(`Monster ${targetUnitId} already has the maximum of 3 Equip Spells.`);
        }
        const spellDef = findSpellTrapDefinition(
          cardInHand.definitionId,
          state.content?.spellTrapDefinitions,
        );
        if (spellDef && spellDef.subtype !== "equip") {
          throw new TurnInvariantError(`Spell ${cardInHand.name} is not an Equip Spell.`);
        }
        turn = confirmResourceUse(turn, command.issuer, "action");
        const removed = removeCardFromHand(playerCardState, cardInstanceId);
        const updatedPlayers = cardSetup.players.map((p, idx) =>
          idx === playerCardIndex ? removed.state : p,
        );
        cardSetup = deepFreeze({ ...cardSetup, players: deepFreeze(updatedPlayers) });

        let updatedMonster: import("./monster.ts").MonsterState = deepFreeze({
          ...targetMonster,
          equippedCards: deepFreeze([...currentEquipped, cardInHand]),
        });
        if (spellDef?.statModifiers) {
          updatedMonster = applyEquipModifiers(updatedMonster, spellDef.statModifiers);
        }
        monsters = deepFreeze(
          monsters.map((m) => (m.unitId === targetUnitId ? updatedMonster : m)),
        );
        break;
      }
      case "spell.transfer_equip": {
        if (state.turn.phase !== "action") {
          throw new TurnInvariantError("An equip spell can only be transferred during the action phase.");
        }
        if (spatial === null) throw new TurnInvariantError("Transferring an equip requires a map.");
        const cardInstanceId = stringPayload(command, "cardInstanceId");
        const sourceUnitId = stringPayload(command, "sourceUnitId");
        const targetUnitId = stringPayload(command, "targetUnitId");
        if (sourceUnitId === targetUnitId) {
          throw new TurnInvariantError("Source and target monsters must be different.");
        }
        const sourceMonster = monsters.find((m) => m.unitId === sourceUnitId);
        const targetMonster = monsters.find((m) => m.unitId === targetUnitId);
        if (!sourceMonster || !targetMonster) {
          throw new TurnInvariantError("Both monsters must be on the battlefield.");
        }
        if (sourceMonster.ownerPlayerId !== command.issuer || targetMonster.ownerPlayerId !== command.issuer) {
          throw new TurnInvariantError("Both monsters must belong to the issuing player.");
        }
        const sourceEquips = sourceMonster.equippedCards ?? [];
        const cardToTransfer = sourceEquips.find((c) => c.instanceId === cardInstanceId);
        if (!cardToTransfer) {
          throw new TurnInvariantError(`Card ${cardInstanceId} is not equipped to ${sourceUnitId}.`);
        }
        const targetEquips = targetMonster.equippedCards ?? [];
        if (targetEquips.length >= MAX_EQUIPMENT_PER_MONSTER) {
          throw new TurnInvariantError(`Target monster ${targetUnitId} already has the maximum of 3 Equip Spells.`);
        }
        turn = confirmResourceUse(turn, command.issuer, "action");
        const spellDef = findSpellTrapDefinition(
          cardToTransfer.definitionId,
          state.content?.spellTrapDefinitions,
        );

        let newSource: import("./monster.ts").MonsterState = deepFreeze({
          ...sourceMonster,
          equippedCards: deepFreeze(sourceEquips.filter((c) => c.instanceId !== cardInstanceId)),
        });
        if (spellDef?.statModifiers) {
          newSource = removeEquipModifiers(newSource, spellDef.statModifiers);
        }

        let newTarget: import("./monster.ts").MonsterState = deepFreeze({
          ...targetMonster,
          equippedCards: deepFreeze([...targetEquips, cardToTransfer]),
        });
        if (spellDef?.statModifiers) {
          newTarget = applyEquipModifiers(newTarget, spellDef.statModifiers);
        }

        monsters = deepFreeze(
          monsters.map((m) => {
            if (m.unitId === sourceUnitId) return newSource;
            if (m.unitId === targetUnitId) return newTarget;
            return m;
          }),
        );
        break;
      }
      case "spell.activate": {
        if (state.turn.phase !== "action") {
          throw new TurnInvariantError("A spell can only be activated during the action phase.");
        }
        if (cardSetup === null) throw new TurnInvariantError("Activating a spell requires configured cards.");
        const cardInstanceId = stringPayload(command, "cardInstanceId");
        const playerCardIndex = cardSetup.players.findIndex((p) => p.playerId === command.issuer);
        if (playerCardIndex < 0) throw new TurnInvariantError(`Unknown player ${command.issuer}.`);
        const playerCardState = cardSetup.players[playerCardIndex]!;
        const cardInHand = playerCardState.hand.find((c) => c.instanceId === cardInstanceId);
        if (!cardInHand) throw new TurnInvariantError(`Card ${cardInstanceId} is not in hand.`);
        if (cardInHand.kind !== "spell") {
          throw new TurnInvariantError(`Card ${cardInHand.name} is not a Spell card.`);
        }
        const spellDef = findSpellTrapDefinition(
          cardInHand.definitionId,
          state.content?.spellTrapDefinitions,
        );
        const actionCost = spellDef?.actionCost ?? 1;
        if (actionCost > 0) {
          turn = confirmResourceUse(turn, command.issuer, "action");
        }
        const removed = removeCardFromHand(playerCardState, cardInstanceId);
        const updatedPlayers = cardSetup.players.map((p, idx) =>
          idx === playerCardIndex ? removed.state : p,
        );
        cardSetup = deepFreeze({ ...cardSetup, players: deepFreeze(updatedPlayers) });

        const targetUnitIds = Array.isArray(command.payload?.targetUnitIds)
          ? (command.payload?.targetUnitIds as string[]).map(String)
          : [];
        const targetsEnemy = spellDef?.targetsEnemy ?? targetUnitIds.some((id) => {
          const m = monsters.find((mon) => mon.unitId === id);
          return m !== undefined && m.ownerPlayerId !== command.issuer;
        });

        const elementId = `spell:${command.sequence}`;
        const inputChainId = typeof command.payload?.chainId === "string" ? command.payload.chainId : undefined;

        if (targetsEnemy) {
          if (inputChainId) {
            const chain = chainSystem.pendingChains.find((c) => c.chainId === inputChainId);
            if (!chain) throw new TurnInvariantError(`Unknown Chain ${inputChainId}.`);
            const windowIndex = chainWindows.findIndex((w) => w.chainId === inputChainId);
            const window = chainWindows[windowIndex];
            if (!window || window.priorityPlayerId !== command.issuer) {
              throw new TurnInvariantError(`Player ${command.issuer} does not have priority in Chain ${inputChainId}.`);
            }
            const opponent = cardSetup.players.find((p) => p.playerId !== command.issuer);
            const nextWindow = confirmChainResponse(window, command.issuer, opponent?.playerId ?? command.issuer);
            chainSystem = addChainElement(chainSystem, inputChainId, {
              elementId,
              controllerId: command.issuer,
              kind: "action",
              targetIds: targetUnitIds,
              requiresAllTargets: true,
              negated: false,
            });
            chainWindows = deepFreeze(
              chainWindows.map((w, idx) => (idx === windowIndex ? nextWindow : w)),
            );
            resolutionZone = deepFreeze([
              ...resolutionZone,
              { card: cardInHand, controllerPlayerId: command.issuer, chainId: inputChainId, elementId },
            ]);
            pendingSpellActivations = deepFreeze([
              ...pendingSpellActivations,
              {
                elementId,
                cardInstanceId,
                controllerPlayerId: command.issuer,
                effectKind: spellDef?.effectKind ?? "stat_buff",
                targetUnitIds,
                ...(spellDef?.statModifiers !== undefined ? { statModifiers: spellDef.statModifiers } : {}),
                ...(spellDef?.value !== undefined ? { value: spellDef.value } : {}),
              },
            ]);
          } else {
            const chainId = `chain:${command.sequence}`;
            const opponent = cardSetup.players.find((p) => p.playerId !== command.issuer);
            if (!opponent) throw new TurnInvariantError("A Chain requires an opposing player.");
            chainSystem = openChain(chainSystem, chainId, "normal", {
              elementId,
              controllerId: command.issuer,
              kind: "action",
              targetIds: targetUnitIds,
              requiresAllTargets: true,
              negated: false,
            });
            chainWindows = deepFreeze([
              ...chainWindows,
              openChainWindow(chainId, command.issuer, opponent.playerId),
            ]);
            resolutionZone = deepFreeze([
              ...resolutionZone,
              { card: cardInHand, controllerPlayerId: command.issuer, chainId, elementId },
            ]);
            pendingSpellActivations = deepFreeze([
              ...pendingSpellActivations,
              {
                elementId,
                cardInstanceId,
                controllerPlayerId: command.issuer,
                effectKind: spellDef?.effectKind ?? "stat_buff",
                targetUnitIds,
                ...(spellDef?.statModifiers !== undefined ? { statModifiers: spellDef.statModifiers } : {}),
                ...(spellDef?.value !== undefined ? { value: spellDef.value } : {}),
              },
            ]);
          }
        } else {
          if (spellDef?.effectKind === "heal" && targetUnitIds.length > 0) {
            const targetUnitId = targetUnitIds[0]!;
            const targetMonster = monsters.find((m) => m.unitId === targetUnitId);
            if (targetMonster) {
              const healed = recoverVital(targetMonster.hp, spellDef.value ?? 3);
              monsters = deepFreeze(
                monsters.map((m) => (m.unitId === targetUnitId ? { ...m, hp: healed.pool } : m)),
              );
            }
          }
          const ownerState = cardSetup.players[playerCardIndex]!;
          const updatedOwner = addCardToGraveyard(ownerState, cardInHand);
          cardSetup = deepFreeze({
            ...cardSetup,
            players: deepFreeze(cardSetup.players.map((p, idx) => (idx === playerCardIndex ? updatedOwner : p))),
          });
        }
        break;
      }
      case "trap.activate": {
        const slotIndex = numericPayload(command, "slotIndex");
        if (slotIndex < 0 || slotIndex >= 3) {
          throw new TurnInvariantError("Trap slot index must be 0, 1, or 2.");
        }
        const playerTrapIndex = trapSlots.findIndex((p) => p.playerId === command.issuer);
        const playerTraps = playerTrapIndex >= 0 ? trapSlots[playerTrapIndex] : null;
        if (!playerTraps || playerTraps.slots[slotIndex] === undefined || playerTraps.slots[slotIndex].card === null) {
          throw new TurnInvariantError(`Trap slot ${slotIndex} has no prepared trap.`);
        }
        const trapCard = playerTraps.slots[slotIndex].card;
        const trapDef = findSpellTrapDefinition(
          trapCard.definitionId,
          state.content?.spellTrapDefinitions,
        );
        const reactionCost = trapDef?.reactionCost ?? 1;
        if (reactionCost > 0) {
          turn = confirmResourceUse(turn, command.issuer, "reaction");
        }
        const updatedSlots: [TrapSlotState, TrapSlotState, TrapSlotState] = [
          playerTraps.slots[0],
          playerTraps.slots[1],
          playerTraps.slots[2],
        ];
        updatedSlots[slotIndex] = deepFreeze({
          slotIndex,
          card: null,
          isFieldTrap: false,
          revealed: false,
        });
        trapSlots = deepFreeze(
          trapSlots.map((p, idx) =>
            idx === playerTrapIndex
              ? deepFreeze({ playerId: command.issuer, slots: deepFreeze(updatedSlots) as readonly [TrapSlotState, TrapSlotState, TrapSlotState] })
              : p,
          ),
        );

        const inputChainId = typeof command.payload?.chainId === "string" ? command.payload.chainId : undefined;
        const targetElementId = typeof command.payload?.targetElementId === "string" ? command.payload.targetElementId : undefined;
        const targetUnitIds = Array.isArray(command.payload?.targetUnitIds)
          ? (command.payload?.targetUnitIds as string[]).map(String)
          : [];
        const elementId = `trap:${command.sequence}`;

        if (!inputChainId) {
          throw new TurnInvariantError("Activating a reaction/counter trap requires an open Chain window.");
        }
        const chain = chainSystem.pendingChains.find((c) => c.chainId === inputChainId);
        if (!chain) throw new TurnInvariantError(`Unknown Chain ${inputChainId}.`);
        const windowIndex = chainWindows.findIndex((w) => w.chainId === inputChainId);
        const window = chainWindows[windowIndex];
        if (!window || window.priorityPlayerId !== command.issuer) {
          throw new TurnInvariantError(`Player ${command.issuer} does not have priority in Chain ${inputChainId}.`);
        }
        const opponent = state.turn.players.find((p) => p.playerId !== command.issuer);
        const nextWindow = confirmChainResponse(window, command.issuer, opponent?.playerId ?? command.issuer);

        if (trapDef?.subtype === "counter" || trapDef?.effectKind === "negate_chain_element") {
          if (!targetElementId) throw new TurnInvariantError("Counter trap requires a targetElementId to negate.");
          chainSystem = negateChainElement(chainSystem, inputChainId, targetElementId);
        }
        chainSystem = addChainElement(chainSystem, inputChainId, {
          elementId,
          controllerId: command.issuer,
          kind: "reaction",
          targetIds: targetElementId ? [targetElementId] : targetUnitIds,
          requiresAllTargets: true,
          negated: false,
        });
        chainWindows = deepFreeze(
          chainWindows.map((w, idx) => (idx === windowIndex ? nextWindow : w)),
        );
        resolutionZone = deepFreeze([
          ...resolutionZone,
          { card: trapCard, controllerPlayerId: command.issuer, chainId: inputChainId, elementId },
        ]);
        pendingTrapActivations = deepFreeze([
          ...pendingTrapActivations,
          {
            elementId,
            cardInstanceId: trapCard.instanceId,
            controllerPlayerId: command.issuer,
            effectKind: trapDef?.effectKind ?? "destroy_monster",
            targetUnitIds,
            ...(targetElementId !== undefined ? { targetElementId } : {}),
            ...(trapDef?.value !== undefined ? { value: trapDef.value } : {}),
          },
        ]);
        break;
      }
      case "trap.destroy_preventive": {
        if (cardSetup === null) throw new TurnInvariantError("Destroying a trap requires configured cards.");
        const targetPlayerId = stringPayload(command, "targetPlayerId");
        const slotIndex = numericPayload(command, "slotIndex");
        if (slotIndex < 0 || slotIndex >= 3) {
          throw new TurnInvariantError("Trap slot index must be 0, 1, or 2.");
        }
        if (targetPlayerId === command.issuer) {
          throw new TurnInvariantError("Preventive trap destruction targets an opponent's trap slot.");
        }
        const targetPlayerTrapIndex = trapSlots.findIndex((p) => p.playerId === targetPlayerId);
        if (targetPlayerTrapIndex < 0) throw new TurnInvariantError(`Unknown player ${targetPlayerId}.`);
        const targetTraps = trapSlots[targetPlayerTrapIndex]!;
        const slot = targetTraps.slots[slotIndex];
        if (slot && slot.card !== null) {
          const destroyedCard = slot.card;
          const targetCardStateIndex = cardSetup.players.findIndex((p) => p.playerId === targetPlayerId);
          if (targetCardStateIndex >= 0) {
            const updatedTargetCardState = addCardToGraveyard(
              cardSetup.players[targetCardStateIndex]!,
              destroyedCard,
            );
            cardSetup = deepFreeze({
              ...cardSetup,
              players: deepFreeze(cardSetup.players.map((p, idx) => (idx === targetCardStateIndex ? updatedTargetCardState : p))),
            });
          }
          const updatedSlots: [TrapSlotState, TrapSlotState, TrapSlotState] = [
            targetTraps.slots[0],
            targetTraps.slots[1],
            targetTraps.slots[2],
          ];
          updatedSlots[slotIndex] = deepFreeze({
            slotIndex,
            card: null,
            isFieldTrap: false,
            revealed: false,
          });
          trapSlots = deepFreeze(
            trapSlots.map((p, idx) =>
              idx === targetPlayerTrapIndex
                ? deepFreeze({ playerId: targetPlayerId, slots: deepFreeze(updatedSlots) as readonly [TrapSlotState, TrapSlotState, TrapSlotState] })
                : p,
            ),
          );
        }
        break;
      }
      default:
        return [state, rejectedEvent(command, step, `Unknown command kind ${command.kind}.`)];
    }

    return [
      deepFreeze({
        ...state,
        turn,
        priorityToken,
        randomAudit,
        match,
        cardSetup,
        pendingDrawModes,
        lastCompletedDrawTurn,
        spatial,
        monsters,
        chainSystem,
        chainWindows,
        pendingBasicAttacks,
        pendingBaseAttacks,
        pendingReactionMovements,
        lastCompletedSupportTurn,
        trapSlots,
        resolutionZone,
        pendingSpellActivations,
        pendingTrapActivations,
      }) as SimulationState,
      acceptedEvent(command, step),
    ];
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown command failure.";
    return [state, rejectedEvent(command, step, reason)];
  }
}

export function advanceStep(engine: CoreEngine): StepResult {
  const nextStep = engine.state.step + 1;
  const [processedCommands, pendingCommands] = partitionCommandsForStep(engine.pendingCommands, nextStep);

  // The fixed pipeline remains explicit so new systems preserve authoritative ordering.
  void STEP_PIPELINE;

  let nextState = engine.state;
  const events: CoreEvent[] = [];
  for (const command of processedCommands) {
    const [updatedState, event] = applyCommand(nextState, command, nextStep);
    nextState = updatedState;
    events.push(event);
  }

  if (nextState.spatial !== null) {
    nextState = deepFreeze({
      ...nextState,
      fogKnowledge: deepFreeze(
        nextState.fogKnowledge.map((knowledge) =>
          updatePlayerFogKnowledge(
            knowledge,
            nextState.monsters,
            nextState.spatial!,
          ),
        ),
      ),
    }) as SimulationState;
  }

  const nextEngine = withHash({
    state: deepFreeze({
      ...nextState,
      step: nextStep,
    }),
    pendingCommands: nextState.match.status === "finished" ? deepFreeze([]) : pendingCommands,
    nextCommandSequence: engine.nextCommandSequence,
  });

  return deepFreeze({
    engine: nextEngine,
    events: deepFreeze(events),
    processedCommands,
  }) as StepResult;
}
