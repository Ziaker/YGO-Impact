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
  openChain,
  openChainWindow,
  passChainPriority,
  resolveNextChain,
} from "./chain.ts";
import { createMonsterCatalog, type MonsterCatalog } from "./content.ts";
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
        ...monster,
        structuralElements: [...monster.structuralElements],
        structuralRaces: [...monster.structuralRaces],
        position: { ...monster.position },
        hp: { ...monster.hp },
        mp: { ...monster.mp },
        spd: { ...monster.spd },
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
): CoreEngine {
  const engine = createConfiguredEngine(seed, players);
  const content: MonsterCatalog = createMonsterCatalog(
    monsterDefinitions,
    players.map((player) => player.decks),
    ritualProcedures,
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
