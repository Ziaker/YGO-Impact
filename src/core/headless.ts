import { createBasicAttackPlan } from "./attack.ts";
import { createBaseAttackPlan } from "./base-attack.ts";
import type { ChainWindow } from "./chain.ts";
import { PROTOTYPE_NORMAL_MONSTERS } from "./content.ts";
import type { DeckConfiguration } from "./deck.ts";
import type { CardInstance, DrawMode, PlayerCardState } from "./draw.ts";
import {
  advanceStep,
  createGameEngine,
} from "./engine.ts";
import { deepFreeze } from "./freeze.ts";
import type { MatchEndReason, MatchState, MatchStatus } from "./match.ts";
import type { MonsterDefinition, MonsterState } from "./monster.ts";
import { resolveBasicMovement } from "./movement.ts";
import type { PriorityToken } from "./priority.ts";
import { enqueueCommand } from "./queue.ts";
import { createReplayFile, type ReplayFile, type ReplayGameSetup } from "./replay.ts";
import type { RitualProcedure } from "./ritual.ts";
import type { FusionProcedure } from "./fusion.ts";
import {
  findSpellTrapDefinition,
  MAX_EQUIPMENT_PER_MONSTER,
  type SpellTrapDefinition,
} from "./spells-traps.ts";
import type { PlayerSetupInput } from "./setup.ts";
import {
  isInBounds,
  positionKey,
  type BasePlacement,
  type Position,
} from "./spatial.ts";
import { findNormalSummonDestinations } from "./summon.ts";
import type { PlayerTurnState, ResourceAllocation, TurnState } from "./turn.ts";
import type {
  CommandInput,
  CoreEngine,
  CoreEvent,
  JsonValue,
  StepResult,
} from "./types.ts";
import { calculateSharedVisibility } from "./visibility.ts";

export interface HeadlessDecisionContext {
  readonly playerId: string;
  readonly opponentPlayerId: string;
  readonly engine: CoreEngine;
  readonly turn: TurnState;
  readonly priorityToken: PriorityToken;
}

export interface HeadlessPolicy {
  readonly name: string;
  chooseDrawMode?(context: HeadlessDecisionContext): DrawMode;
  allocateResources?(context: HeadlessDecisionContext): ResourceAllocation;
  takeAction?(context: HeadlessDecisionContext): CommandInput | null;
  respondToChain?(
    context: HeadlessDecisionContext,
    window: ChainWindow,
  ): CommandInput;
}

export interface HeadlessMatchOptions {
  readonly seed?: string;
  readonly players?: readonly [string, string];
  readonly playerSetups?: readonly [PlayerSetupInput, PlayerSetupInput];
  readonly bases?: readonly [BasePlacement, BasePlacement];
  readonly monsterDefinitions?: readonly MonsterDefinition[];
  readonly ritualProcedures?: readonly RitualProcedure[];
  readonly fusionProcedures?: readonly FusionProcedure[];
  readonly spellTrapDefinitions?: readonly SpellTrapDefinition[];
  readonly policies?: Readonly<Record<string, HeadlessPolicy>>;
  readonly maxTurns?: number;
  readonly maxSteps?: number;
  readonly recordReplay?: boolean;
}

export interface HeadlessMatchResult {
  readonly engine: CoreEngine;
  readonly match: MatchState;
  readonly winnerPlayerId: string | null;
  readonly endReason: MatchEndReason | null;
  readonly turnsCompleted: number;
  readonly stepsCompleted: number;
  readonly stepHashes: readonly string[];
  readonly events: readonly CoreEvent[];
  readonly replay: ReplayFile | null;
}

export function createDefaultDecks(prefix = "card"): DeckConfiguration {
  const monsterDeck = PROTOTYPE_NORMAL_MONSTERS.map((def) => ({
    definitionId: def.definitionId,
    name: def.name,
    kind: "normal_monster" as const,
  }));

  const spellTrapDeck = [
    ...Array.from({ length: 3 }, (_, index) => ({
      definitionId: `${prefix}:spell:recovery:${index}`,
      name: `${prefix} Recovery Spell`,
      kind: "spell" as const,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      definitionId: `${prefix}:spell:boost:${index}`,
      name: `${prefix} Boost Spell`,
      kind: "spell" as const,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      definitionId: `${prefix}:spell:tactics:${index}`,
      name: `${prefix} Tactics Spell`,
      kind: "spell" as const,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      definitionId: `${prefix}:trap:shield:${index}`,
      name: `${prefix} Shield Trap`,
      kind: "trap" as const,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      definitionId: `${prefix}:trap:counter:${index}`,
      name: `${prefix} Counter Trap`,
      kind: "trap" as const,
    })),
  ];

  return deepFreeze({
    monsterDeck: deepFreeze(monsterDeck),
    spellTrapDeck: deepFreeze(spellTrapDeck),
    extraDeck: deepFreeze([]),
  }) as DeckConfiguration;
}

export function createDefaultPlayerSetup(
  playerId: string,
  initialMonsterCount = 5,
): PlayerSetupInput {
  return deepFreeze({
    playerId,
    initialMonsterCount,
    decks: createDefaultDecks(playerId),
  }) as PlayerSetupInput;
}

export function createPassivePolicy(
  name = "PassivePolicy",
  drawMode?: DrawMode,
): HeadlessPolicy {
  return {
    name,
    chooseDrawMode: (context: HeadlessDecisionContext) => {
      if (drawMode !== undefined) return drawMode;
      const cardSetup = context.engine.state.cardSetup;
      const player = cardSetup?.players.find((p) => p.playerId === context.playerId);
      if (player !== undefined && player.monsterDeck.length <= 2) {
        return "two_spell_traps";
      }
      return "two_monsters";
    },
    allocateResources: () => ({ actions: 4, reactions: 4 }),
    takeAction: (context: HeadlessDecisionContext) => ({
      issuer: context.playerId,
      kind: "turn.end_participation",
      payload: {},
    }),
    respondToChain: (context: HeadlessDecisionContext, window: ChainWindow) => ({
      issuer: context.playerId,
      kind: "chain.pass_priority",
      payload: { chainId: window.chainId },
    }),
  };
}

export function createAggressivePolicy(name = "AggressivePolicy"): HeadlessPolicy {
  let unitCounter = 0;

  return {
    name,
    chooseDrawMode: (context: HeadlessDecisionContext) => {
      const cardSetup = context.engine.state.cardSetup;
      const player = cardSetup?.players.find((p) => p.playerId === context.playerId);
      if (player !== undefined && player.monsterDeck.length <= 2) {
        return "two_spell_traps";
      }
      return "two_monsters";
    },
    allocateResources: () => ({ actions: 6, reactions: 2 }),
    respondToChain: (context: HeadlessDecisionContext, window: ChainWindow) => ({
      issuer: context.playerId,
      kind: "chain.pass_priority",
      payload: { chainId: window.chainId },
    }),
    takeAction: (context: HeadlessDecisionContext): CommandInput | null => {
      const turnPlayer = context.engine.state.turn.players.find(
        (player: PlayerTurnState) => player.playerId === context.playerId,
      );
      if (
        turnPlayer === undefined ||
        turnPlayer.remaining === null ||
        turnPlayer.remaining.actions === 0 ||
        turnPlayer.participationEnded
      ) {
        return { issuer: context.playerId, kind: "turn.end_participation", payload: {} };
      }

      const spatial = context.engine.state.spatial;
      if (spatial === null) return null;

      const ownMonsters = context.engine.state.monsters.filter(
        (monster: MonsterState) => monster.ownerPlayerId === context.playerId,
      );
      const enemyBase = spatial.bases.find((base: BasePlacement) => base.playerId === context.opponentPlayerId);

      // 1. Declare base attack if within range and visible
      if (enemyBase !== undefined) {
        const visibleTiles = calculateSharedVisibility(
          context.engine.state.monsters,
          spatial,
          context.playerId,
        );
        const visibleBase = visibleTiles.some(
          (pos) => pos.x === enemyBase.position.x && pos.y === enemyBase.position.y,
        );

        for (const monster of ownMonsters) {
          if (monster.battlePosition === "attack") {
            try {
              createBaseAttackPlan(
                monster,
                context.opponentPlayerId,
                spatial,
                [],
                visibleBase,
              );
              return {
                issuer: context.playerId,
                kind: "battle.declare_base_attack",
                payload: {
                  attackerUnitId: monster.unitId,
                  defenderPlayerId: context.opponentPlayerId,
                },
              };
            } catch {
              // Not in range or blocked
            }
          }
        }
      }

      // 2. Declare basic attack against enemy monster if in range and visible
      const enemyMonsters = context.engine.state.monsters.filter(
        (monster: MonsterState) => monster.ownerPlayerId === context.opponentPlayerId,
      );
      if (enemyMonsters.length > 0) {
        const visibleTiles = calculateSharedVisibility(
          context.engine.state.monsters,
          spatial,
          context.playerId,
        );
        const visibleKeys = new Set(visibleTiles.map(positionKey));

        for (const monster of ownMonsters) {
          if (monster.battlePosition === "attack") {
            for (const enemy of enemyMonsters) {
              try {
                createBasicAttackPlan(
                  monster,
                  enemy,
                  spatial,
                  [],
                  visibleKeys.has(positionKey(enemy.position)),
                  false,
                );
                return {
                  issuer: context.playerId,
                  kind: "battle.declare_basic_attack",
                  payload: {
                    attackerUnitId: monster.unitId,
                    defenderUnitId: enemy.unitId,
                  },
                };
              } catch {
                // Not in range or blocked
              }
            }
          }
        }
      }

      // 3. Move forward towards enemy base if SPD available
      if (enemyBase !== undefined) {
        for (const monster of ownMonsters) {
          if (monster.spd.current >= 1) {
            const deltaX = Math.sign(enemyBase.position.x - monster.position.x);
            const deltaY = Math.sign(enemyBase.position.y - monster.position.y);
            const candidates: Position[] = [];
            if (deltaX !== 0) candidates.push({ x: monster.position.x + deltaX, y: monster.position.y });
            if (deltaY !== 0) candidates.push({ x: monster.position.x, y: monster.position.y + deltaY });

            for (const candidate of candidates) {
              if (isInBounds(candidate)) {
                try {
                  const moveResult = resolveBasicMovement(
                    spatial,
                    monster.unitId,
                    monster.spd.current,
                    [candidate],
                  );
                  if (moveResult.traversedPath.length > 0) {
                    return {
                      issuer: context.playerId,
                      kind: "monster.move_basic",
                      payload: {
                        unitId: monster.unitId,
                        path: [candidate] as unknown as JsonValue,
                      },
                    };
                  }
                } catch {
                  // Path blocked
                }
              }
            }
          }
        }
      }

      // 4. Normal Summon from hand if below map capacity (5 units)
      const cardSetup = context.engine.state.cardSetup;
      if (cardSetup !== null && ownMonsters.length < 5) {
        const playerCardState = cardSetup.players.find(
          (player: PlayerCardState) => player.playerId === context.playerId,
        );
        if (playerCardState !== undefined) {
          const catalog = context.engine.state.content;
          const summonableCard = playerCardState.hand.find((card: CardInstance) => {
            if (card.kind !== "normal_monster") return false;
            const def = catalog?.definitions.find((d: MonsterDefinition) => d.definitionId === card.definitionId);
            return def !== undefined && def.level <= 4;
          });

          if (summonableCard !== undefined) {
            const visibleTiles = calculateSharedVisibility(
              context.engine.state.monsters,
              spatial,
              context.playerId,
            );
            const anchorUnit =
              ownMonsters.length === 0
                ? null
                : [...ownMonsters].sort((a, b) => {
                    if (enemyBase === undefined) return a.unitId.localeCompare(b.unitId);
                    const distA =
                      Math.abs(a.position.x - enemyBase.position.x) +
                      Math.abs(a.position.y - enemyBase.position.y);
                    const distB =
                      Math.abs(b.position.x - enemyBase.position.x) +
                      Math.abs(b.position.y - enemyBase.position.y);
                    return distA - distB || a.unitId.localeCompare(b.unitId);
                  })[0];
            const anchorUnitId = anchorUnit ? anchorUnit.unitId : null;

            try {
              const destinations = findNormalSummonDestinations(
                spatial,
                context.playerId,
                anchorUnitId,
                visibleTiles,
              );
              if (destinations.positions.length > 0) {
                // Pick destination closest to enemy base
                const sorted = [...destinations.positions].sort((left, right) => {
                  if (enemyBase === undefined) return left.y - right.y || left.x - right.x;
                  const distLeft =
                    Math.abs(left.x - enemyBase.position.x) +
                    Math.abs(left.y - enemyBase.position.y);
                  const distRight =
                    Math.abs(right.x - enemyBase.position.x) +
                    Math.abs(right.y - enemyBase.position.y);
                  return distLeft - distRight || left.y - right.y || left.x - right.x;
                });
                const destination = sorted[0];
                if (destination !== undefined) {
                  unitCounter += 1;
                  return {
                    issuer: context.playerId,
                    kind: "summon.normal",
                    payload: {
                      cardInstanceId: summonableCard.instanceId,
                      unitId: `${context.playerId}:unit:${unitCounter}`,
                      anchorUnitId,
                      destination: destination as unknown as JsonValue,
                      battlePosition: "attack",
                    },
                  };
                }
              }
            } catch {
              // No valid destinations
            }
          }
        }
      }

      // 5. End participation if no productive action remains
      return { issuer: context.playerId, kind: "turn.end_participation", payload: {} };
    },
  };
}

export function createTacticalPolicy(name = "TacticalPolicy"): HeadlessPolicy {
  const baseAggressive = createAggressivePolicy(name);

  return {
    name,
    chooseDrawMode: (context: HeadlessDecisionContext) => {
      const cardSetup = context.engine.state.cardSetup;
      const player = cardSetup?.players.find((p) => p.playerId === context.playerId);
      if (player !== undefined && player.monsterDeck.length <= 2) {
        return "two_spell_traps";
      }
      return "one_each";
    },
    allocateResources: () => ({ actions: 5, reactions: 3 }),
    respondToChain: (context: HeadlessDecisionContext, window: ChainWindow) => {
      const playerTraps = context.engine.state.trapSlots?.find((p) => p.playerId === context.playerId);
      const turnPlayer = context.engine.state.turn.players.find((p) => p.playerId === context.playerId);
      const remainingReactions = turnPlayer?.remaining?.reactions ?? 0;

      if (playerTraps && remainingReactions >= 1) {
        const chain = context.engine.state.chainSystem.pendingChains.find((c) => c.chainId === window.chainId);
        const lastElement = chain && chain.elements.length > 0 ? chain.elements[chain.elements.length - 1] : undefined;

        for (const slot of playerTraps.slots) {
          if (slot.card !== null) {
            const trapDef = findSpellTrapDefinition(
              slot.card.definitionId,
              context.engine.state.content?.spellTrapDefinitions,
            );
            if (trapDef && (trapDef.subtype === "counter" || trapDef.subtype === "reaction")) {
              return {
                issuer: context.playerId,
                kind: "trap.activate",
                payload: {
                  slotIndex: slot.slotIndex,
                  chainId: window.chainId,
                  ...(lastElement ? { targetElementId: lastElement.elementId } : {}),
                },
              };
            }
          }
        }
      }

      return {
        issuer: context.playerId,
        kind: "chain.pass_priority",
        payload: { chainId: window.chainId },
      };
    },
    takeAction: (context: HeadlessDecisionContext): CommandInput | null => {
      const turnPlayer = context.engine.state.turn.players.find(
        (player: PlayerTurnState) => player.playerId === context.playerId,
      );
      if (
        turnPlayer === undefined ||
        turnPlayer.remaining === null ||
        turnPlayer.participationEnded
      ) {
        return { issuer: context.playerId, kind: "turn.end_participation", payload: {} };
      }

      const cardSetup = context.engine.state.cardSetup;
      const playerCardState = cardSetup?.players.find((p) => p.playerId === context.playerId);
      const ownMonsters = context.engine.state.monsters.filter(
        (monster: MonsterState) => monster.ownerPlayerId === context.playerId,
      );

      // 1. If actions >= 1, check if we can equip an Equip Spell from hand
      if (turnPlayer.remaining.actions >= 1 && playerCardState && ownMonsters.length > 0) {
        const equipSpell = playerCardState.hand.find((card) => {
          if (card.kind !== "spell") return false;
          const def = findSpellTrapDefinition(card.definitionId, context.engine.state.content?.spellTrapDefinitions);
          return def?.subtype === "equip";
        });
        if (equipSpell) {
          const eligibleMonster = ownMonsters.find(
            (m) => (m.equippedCards?.length ?? 0) < MAX_EQUIPMENT_PER_MONSTER,
          );
          if (eligibleMonster) {
            return {
              issuer: context.playerId,
              kind: "spell.equip",
              payload: {
                cardInstanceId: equipSpell.instanceId,
                targetUnitId: eligibleMonster.unitId,
              },
            };
          }
        }
      }

      // 2. Setting a trap costs 0 actions: set trap from hand into free slot
      if (playerCardState) {
        const trapCard = playerCardState.hand.find((c) => c.kind === "trap");
        if (trapCard) {
          const playerTraps = context.engine.state.trapSlots?.find((p) => p.playerId === context.playerId);
          const emptySlotIndex = playerTraps ? playerTraps.slots.findIndex((s) => s.card === null) : 0;
          if (emptySlotIndex >= 0 && emptySlotIndex < 3) {
            return {
              issuer: context.playerId,
              kind: "trap.set",
              payload: {
                cardInstanceId: trapCard.instanceId,
                slotIndex: emptySlotIndex,
              },
            };
          }
        }
      }

      // 3. Fallback to aggressive monster actions (attack base, attack monster, move, summon)
      return baseAggressive.takeAction ? baseAggressive.takeAction(context) : null;
    },
  };
}

export function runHeadlessMatch(options: HeadlessMatchOptions = {}): HeadlessMatchResult {
  const seed = options.seed ?? "headless-match-seed";
  const player1Id = options.players?.[0] ?? "player1";
  const player2Id = options.players?.[1] ?? "player2";
  const playerIds: readonly [string, string] = [player1Id, player2Id];

  const bases: readonly [BasePlacement, BasePlacement] = options.bases ?? [
    { playerId: player1Id, position: { x: 0, y: 8 } },
    { playerId: player2Id, position: { x: 30, y: 8 } },
  ];

  const monsterDefinitions = options.monsterDefinitions ?? PROTOTYPE_NORMAL_MONSTERS;
  const ritualProcedures = options.ritualProcedures ?? [];
  const fusionProcedures = options.fusionProcedures ?? [];
  const spellTrapDefinitions = options.spellTrapDefinitions ?? [];

  const playerSetups: readonly [PlayerSetupInput, PlayerSetupInput] = options.playerSetups ?? [
    createDefaultPlayerSetup(player1Id, 5),
    createDefaultPlayerSetup(player2Id, 5),
  ];

  const defaultPolicy = createAggressivePolicy();
  const policies: Readonly<Record<string, HeadlessPolicy>> = {
    [player1Id]: options.policies?.[player1Id] ?? defaultPolicy,
    [player2Id]: options.policies?.[player2Id] ?? defaultPolicy,
  };

  let engine = createGameEngine(
    seed,
    playerSetups,
    bases,
    monsterDefinitions,
    ritualProcedures,
    fusionProcedures,
    spellTrapDefinitions,
  );

  const recordedCommands: (CommandInput & { readonly receivedAtStep: number })[] = [];
  const stepHashes: string[] = [engine.stateHash];
  const allEvents: CoreEvent[] = [];

  const maxTurns = options.maxTurns ?? 50;
  const maxSteps = options.maxSteps ?? 3000;
  let stepsCompleted = 0;

  function queue(issuer: string, kind: string, payload: Record<string, JsonValue> = {}): void {
    const input: CommandInput = { issuer, kind, payload };
    recordedCommands.push(deepFreeze({ ...input, receivedAtStep: engine.state.step }));
    engine = enqueueCommand(engine, input);
  }

  function executeStep(): StepResult {
    const result = advanceStep(engine);
    engine = result.engine;
    stepHashes.push(engine.stateHash);
    allEvents.push(...result.events);
    stepsCompleted += 1;
    return result;
  }

  function createContext(playerId: string): HeadlessDecisionContext {
    const opponentPlayerId = playerId === player1Id ? player2Id : player1Id;
    return {
      playerId,
      opponentPlayerId,
      engine,
      turn: engine.state.turn,
      priorityToken: engine.state.priorityToken,
    };
  }

  while (
    (engine.state.match.status as MatchStatus) === "active" &&
    engine.state.turn.turnNumber <= maxTurns &&
    stepsCompleted < maxSteps
  ) {
    const currentPhase = engine.state.turn.phase;

    switch (currentPhase) {
      case "draw": {
        // Handle draw mode selection for both players
        const cardSetup = engine.state.cardSetup;
        if (cardSetup !== null) {
          for (const player of cardSetup.players) {
            const alreadyChosen = engine.state.pendingDrawModes.some(
              (mode) => mode.playerId === player.playerId,
            );
            if (!alreadyChosen) {
              const policy = policies[player.playerId] ?? defaultPolicy;
              const mode = policy.chooseDrawMode
                ? policy.chooseDrawMode(createContext(player.playerId))
                : "two_monsters";
              queue(player.playerId, "cards.choose_draw_mode", { mode });
            }
          }
        }

        executeStep();
        if ((engine.state.match.status as MatchStatus) === "finished") break;

        // If draw phase completed, advance to support phase
        if (engine.state.lastCompletedDrawTurn === engine.state.turn.turnNumber) {
          queue("system", "turn.advance_completed_phase", {});
          executeStep();
        }
        break;
      }

      case "support": {
        if (engine.state.lastCompletedSupportTurn !== engine.state.turn.turnNumber) {
          queue("system", "support.resolve_recovery", {});
          executeStep();
        }

        if (engine.state.lastCompletedSupportTurn === engine.state.turn.turnNumber) {
          queue("system", "turn.advance_completed_phase", {});
          executeStep();
        }
        break;
      }

      case "decision": {
        // Resource allocation for both players
        for (const player of engine.state.turn.players) {
          if (player.allocation === null) {
            const policy = policies[player.playerId] ?? defaultPolicy;
            const allocation = policy.allocateResources
              ? policy.allocateResources(createContext(player.playerId))
              : { actions: 6, reactions: 2 };
            queue(player.playerId, "turn.allocate_resources", {
              actions: allocation.actions,
              reactions: allocation.reactions,
            });
          }
        }

        executeStep();
        break;
      }

      case "action": {
        // If there are open chain windows, resolve them first
        if (engine.state.chainWindows.length > 0) {
          const window = engine.state.chainWindows[0]!;
          if (window.stage !== "closed") {
            const responderId = window.priorityPlayerId;
            const policy = policies[responderId] ?? defaultPolicy;
            const response = policy.respondToChain
              ? policy.respondToChain(createContext(responderId), window)
              : {
                  issuer: responderId,
                  kind: "chain.pass_priority",
                  payload: { chainId: window.chainId },
                };
            queue(
              response.issuer,
              response.kind,
              (response.payload ?? {}) as Record<string, JsonValue>,
            );
            executeStep();
          } else {
            queue("system", "chain.resolve_next", {});
            executeStep();
            if ((engine.state.match.status as MatchStatus) === "finished") break;
          }
          break;
        }

        // Active players choose actions
        const activePlayers = engine.state.turn.players.filter(
          (player) => !player.participationEnded,
        );
        if (activePlayers.length === 0) {
          // Both players finished action phase
          break;
        }

        // Priority token holder gets opportunity first, else other active player
        const holderId = engine.state.priorityToken.holderPlayerId;
        const actingPlayer =
          activePlayers.find((p) => p.playerId === holderId) ?? activePlayers[0]!;

        const policy = policies[actingPlayer.playerId] ?? defaultPolicy;
        const action = policy.takeAction
          ? policy.takeAction(createContext(actingPlayer.playerId))
          : null;

        if (action !== null) {
          queue(
            action.issuer,
            action.kind,
            (action.payload ?? {}) as Record<string, JsonValue>,
          );
          const stepResult = executeStep();
          // If rejected, force end participation to prevent stall
          if (stepResult.events.some((event: CoreEvent) => event.type === "command_rejected")) {
            queue(actingPlayer.playerId, "turn.end_participation", {});
            executeStep();
          }
        } else {
          queue(actingPlayer.playerId, "turn.end_participation", {});
          executeStep();
        }

        if ((engine.state.match.status as MatchStatus) === "finished") break;
        break;
      }

      case "end": {
        // Advance turn
        queue("system", "turn.advance_completed_phase", {});
        executeStep();
        break;
      }

      default:
        break;
    }
  }

  const contentHash = engine.state.content?.contentHash;
  const gameSetup: ReplayGameSetup = {
    ...(contentHash !== undefined ? { contentHash } : {}),
    bases,
    monsterDefinitions,
    ...(ritualProcedures.length > 0 ? { ritualProcedures } : {}),
    ...(fusionProcedures.length > 0 ? { fusionProcedures } : {}),
    ...(spellTrapDefinitions.length > 0 ? { spellTrapDefinitions } : {}),
  };

  const recordReplay = options.recordReplay ?? true;
  const replay = recordReplay
    ? createReplayFile(
        seed,
        playerIds,
        engine.state.step,
        recordedCommands,
        playerSetups,
        gameSetup,
      )
    : null;

  return deepFreeze({
    engine,
    match: engine.state.match,
    winnerPlayerId: engine.state.match.winnerPlayerId,
    endReason: engine.state.match.endReason,
    turnsCompleted: engine.state.turn.turnNumber,
    stepsCompleted,
    stepHashes: deepFreeze(stepHashes),
    events: deepFreeze(allEvents),
    replay,
  }) as HeadlessMatchResult;
}
