import { createBasicAttackPlan } from "./attack.ts";
import { createBaseAttackPlan } from "./base-attack.ts";
import type { ChainWindow } from "./chain.ts";
import type { MonsterDefinition, MonsterState } from "./monster.ts";
import { resolveBasicMovement } from "./movement.ts";
import type { CardInstance, DrawMode, PlayerCardState } from "./draw.ts";
import { createMatchCardView, type PlayerCardView } from "./information.ts";
import type { EnemyFogRecord } from "./fog.ts";
import { deepFreeze } from "./freeze.ts";
import type { MatchState } from "./match.ts";
import type { PriorityToken } from "./priority.ts";
import { findNormalSummonDestinations } from "./summon.ts";
import {
  isInBounds,
  positionKey,
  type BasePlacement,
  type Position,
  type SpatialState,
} from "./spatial.ts";
import { orthogonalDistance } from "./geometry.ts";
import {
  findSpellTrapDefinition,
  MAX_EQUIPMENT_PER_MONSTER,
  type SpellTrapDefinition,
  type TrapSlotState,
} from "./spells-traps.ts";
import { createTerrainLookup } from "./terrain.ts";
import type { PlayerTurnState, ResourceAllocation, TurnState } from "./turn.ts";
import type { CommandInput, JsonValue, SimulationState } from "./types.ts";
import { calculateSharedVisibility } from "./visibility.ts";
import type { HeadlessDecisionContext, HeadlessPolicy } from "./headless.ts";

/**
 * Veiled view of opponent's trap slot (fair information under Fog of War).
 */
export interface AIOpponentTrapSlotView {
  readonly slotIndex: number;
  readonly occupied: boolean;
  readonly revealedCard: CardInstance | null;
}

export interface AIObservationSelf {
  readonly playerId: string;
  readonly cardView: PlayerCardView;
  readonly monsters: readonly MonsterState[];
  readonly trapSlots: readonly TrapSlotState[];
  readonly base: BasePlacement | undefined;
  readonly remainingActions: number;
  readonly remainingReactions: number;
  readonly visibleTiles: readonly Position[];
}

export interface AIObservationOpponent {
  readonly playerId: string;
  readonly cardView: PlayerCardView;
  readonly visibleMonsters: readonly MonsterState[];
  readonly fogEnemies: readonly EnemyFogRecord[];
  readonly trapSlots: readonly AIOpponentTrapSlotView[];
  readonly base: BasePlacement | undefined;
  readonly baseIsVisible: boolean;
}

/**
 * Fair player observation adhering strictly to Fog of War and Information Hiding.
 * Guaranteed zero leaks of hidden cards, unrevealed trap identities, or unspotted enemy units.
 */
export interface AIObservation {
  readonly playerId: string;
  readonly opponentPlayerId: string;
  readonly match: MatchState;
  readonly turn: TurnState;
  readonly priorityToken: PriorityToken;
  readonly spatial: SpatialState;
  readonly self: AIObservationSelf;
  readonly opponent: AIObservationOpponent;
  readonly activeWindows: readonly ChainWindow[];
}

export class AIInvariantError extends Error {
  override readonly name = "AIInvariantError";
}

/**
 * Creates an authoritative, deeply-frozen observation strictly filtered to the viewing player's legitimate perception.
 */
export function createAIObservation(state: SimulationState, playerId: string): AIObservation {
  if (playerId.trim().length === 0) {
    throw new AIInvariantError("playerId must not be empty.");
  }
  if (state.spatial === null) {
    throw new AIInvariantError("Cannot create AI observation without initialized spatial state.");
  }

  const opponentBase = state.spatial.bases.find((base) => base.playerId !== playerId);
  const selfBase = state.spatial.bases.find((base) => base.playerId === playerId);
  const opponentPlayerId =
    opponentBase !== undefined
      ? opponentBase.playerId
      : (state.cardSetup?.players.find((p) => p.playerId !== playerId)?.playerId ?? "opponent");

  // 1. Fair card view (opponent visibleHand and visibleExtraDeck are null)
  const cardStates = state.cardSetup?.players ?? [];
  const matchCardView = cardStates.length > 0 ? createMatchCardView(cardStates, playerId) : null;
  const selfCardView =
    matchCardView?.players.find((p) => p.playerId === playerId) ??
    deepFreeze({
      playerId,
      handCount: 0,
      visibleHand: [],
      monsterDeckCount: 0,
      spellTrapDeckCount: 0,
      extraDeckCount: 0,
      visibleExtraDeck: [],
      graveyard: [],
    });
  const opponentCardView =
    matchCardView?.players.find((p) => p.playerId === opponentPlayerId) ??
    deepFreeze({
      playerId: opponentPlayerId,
      handCount: 0,
      visibleHand: null,
      monsterDeckCount: 0,
      spellTrapDeckCount: 0,
      extraDeckCount: 0,
      visibleExtraDeck: null,
      graveyard: [],
    });

  // Verify fair information invariant on opponent card view
  if (opponentCardView.visibleHand !== null || opponentCardView.visibleExtraDeck !== null) {
    throw new AIInvariantError("Information leak detected: opponent private cards must not be visible in AI observation.");
  }

  // 2. Shared visibility and fog knowledge
  const visibleTiles = calculateSharedVisibility(state.monsters, state.spatial, playerId);
  const visibleKeys = new Set(visibleTiles.map(positionKey));
  const baseIsVisible =
    opponentBase !== undefined && visibleKeys.has(positionKey(opponentBase.position));

  const playerFog = state.fogKnowledge.find((k) => k.playerId === playerId);
  const visibleEnemyIds = new Set(
    playerFog !== undefined
      ? playerFog.enemies.filter((e) => e.currentlyVisible).map((e) => e.unitId)
      : [],
  );

  // Opponent monsters are strictly filtered to currently visible units
  const ownMonsters = deepFreeze(
    state.monsters.filter((monster) => monster.ownerPlayerId === playerId),
  );
  const visibleEnemyMonsters = deepFreeze(
    state.monsters.filter(
      (monster) =>
        monster.ownerPlayerId === opponentPlayerId && visibleEnemyIds.has(monster.unitId),
    ),
  );

  // 3. Own and opponent trap slots
  const ownTraps = state.trapSlots?.find((p) => p.playerId === playerId)?.slots ?? [];
  const rawOpponentTraps =
    state.trapSlots?.find((p) => p.playerId === opponentPlayerId)?.slots ?? [];

  const opponentTrapViews: readonly AIOpponentTrapSlotView[] = deepFreeze(
    rawOpponentTraps.map((slot) => ({
      slotIndex: slot.slotIndex,
      occupied: slot.card !== null,
      revealedCard: slot.revealed && slot.card !== null ? slot.card : null,
    })),
  );

  // 4. Turn resources
  const turnPlayer = state.turn.players.find((p) => p.playerId === playerId);
  const remainingActions = turnPlayer?.remaining?.actions ?? 0;
  const remainingReactions = turnPlayer?.remaining?.reactions ?? 0;

  return deepFreeze({
    playerId,
    opponentPlayerId,
    match: state.match,
    turn: state.turn,
    priorityToken: state.priorityToken,
    spatial: state.spatial,
    self: deepFreeze({
      playerId,
      cardView: selfCardView,
      monsters: ownMonsters,
      trapSlots: deepFreeze(ownTraps),
      base: selfBase,
      remainingActions,
      remainingReactions,
      visibleTiles,
    }),
    opponent: deepFreeze({
      playerId: opponentPlayerId,
      cardView: opponentCardView,
      visibleMonsters: visibleEnemyMonsters,
      fogEnemies: playerFog?.enemies ?? deepFreeze([]),
      trapSlots: opponentTrapViews,
      base: opponentBase,
      baseIsVisible,
    }),
    activeWindows: deepFreeze([...state.chainWindows]),
  }) as AIObservation;
}

export interface HeuristicWeights {
  readonly baseDamageWeight: number;
  readonly baseDefenseWeight: number;
  readonly unitEliminationWeight: number;
  readonly unitSurvivalWeight: number;
  readonly boardProximityWeight: number;
  readonly boardControlWeight: number;
  readonly equipmentWeight: number;
  readonly trapReadinessWeight: number;
  readonly deckPreservationWeight: number;
}

export const DEFAULT_HEURISTIC_WEIGHTS: HeuristicWeights = deepFreeze({
  baseDamageWeight: 500,
  baseDefenseWeight: 250,
  unitEliminationWeight: 200,
  unitSurvivalWeight: 120,
  boardProximityWeight: 30,
  boardControlWeight: 15,
  equipmentWeight: 50,
  trapReadinessWeight: 35,
  deckPreservationWeight: 75,
});

export const AGGRESSIVE_AI_WEIGHTS: HeuristicWeights = deepFreeze({
  baseDamageWeight: 700,
  baseDefenseWeight: 150,
  unitEliminationWeight: 220,
  unitSurvivalWeight: 80,
  boardProximityWeight: 50,
  boardControlWeight: 20,
  equipmentWeight: 60,
  trapReadinessWeight: 20,
  deckPreservationWeight: 50,
});

export const DEFENSIVE_AI_WEIGHTS: HeuristicWeights = deepFreeze({
  baseDamageWeight: 300,
  baseDefenseWeight: 450,
  unitEliminationWeight: 200,
  unitSurvivalWeight: 200,
  boardProximityWeight: 15,
  boardControlWeight: 30,
  equipmentWeight: 70,
  trapReadinessWeight: 60,
  deckPreservationWeight: 100,
});

export const TACTICAL_AI_WEIGHTS: HeuristicWeights = deepFreeze({
  baseDamageWeight: 550,
  baseDefenseWeight: 300,
  unitEliminationWeight: 250,
  unitSurvivalWeight: 150,
  boardProximityWeight: 35,
  boardControlWeight: 25,
  equipmentWeight: 80,
  trapReadinessWeight: 50,
  deckPreservationWeight: 80,
});

interface ScoredCandidateAction {
  readonly command: CommandInput;
  readonly score: number;
  readonly description: string;
}

/**
 * Creates an autonomous heuristic adversary AI operating strictly under Fog of War with fair information.
 */
export function createHeuristicAI(
  name = "HeuristicAI",
  weights: HeuristicWeights = DEFAULT_HEURISTIC_WEIGHTS,
): HeadlessPolicy {
  let unitCounter = 0;

  return {
    name,

    chooseDrawMode: (context: HeadlessDecisionContext): DrawMode => {
      const cardSetup = context.engine.state.cardSetup;
      const player = cardSetup?.players.find((p) => p.playerId === context.playerId);
      if (player === undefined) return "two_monsters";

      // 1. Deck Preservation: prevent deck out when either pile runs thin
      if (player.monsterDeck.length <= 2) {
        return "two_spell_traps";
      }
      if (player.spellTrapDeck.length <= 2) {
        return "two_monsters";
      }

      // 2. Hand & Field Needs
      const ownMonsters = context.engine.state.monsters.filter(
        (m) => m.ownerPlayerId === context.playerId,
      );
      const monsterCardsInHand = player.hand.filter((c) => c.kind === "normal_monster").length;

      if (ownMonsters.length + monsterCardsInHand < 2) {
        return "two_monsters";
      }
      if (monsterCardsInHand >= 3) {
        return "two_spell_traps";
      }

      return "one_each";
    },

    allocateResources: (context: HeadlessDecisionContext): ResourceAllocation => {
      const observation = createAIObservation(context.engine.state, context.playerId);
      const selfBase = observation.self.base;

      // Check if known or visible enemies threaten own base (distance <= 6)
      let enemyCloseToBase = false;
      if (selfBase !== undefined) {
        for (const enemy of observation.opponent.visibleMonsters) {
          if (orthogonalDistance(enemy.position, selfBase.position) <= 6) {
            enemyCloseToBase = true;
            break;
          }
        }
        if (!enemyCloseToBase) {
          for (const fogRecord of observation.opponent.fogEnemies) {
            if (orthogonalDistance(fogRecord.lastKnownPosition, selfBase.position) <= 6) {
              enemyCloseToBase = true;
              break;
            }
          }
        }
      }

      // Threat detected: balance 4 actions and 4 reactions for defense and counterplay
      if (enemyCloseToBase) {
        return { actions: 4, reactions: 4 };
      }

      // If set traps exist, reserve at least 3 reactions for tactical triggers
      const hasSetTraps = observation.self.trapSlots.some((s) => s.card !== null);
      if (hasSetTraps) {
        return { actions: 5, reactions: 3 };
      }

      // Otherwise allocate aggressively for map tempo
      return { actions: 6, reactions: 2 };
    },

    respondToChain: (context: HeadlessDecisionContext, window: ChainWindow): CommandInput => {
      const observation = createAIObservation(context.engine.state, context.playerId);
      const remainingReactions = observation.self.remainingReactions;

      if (remainingReactions >= 1) {
        const chain = context.engine.state.chainSystem.pendingChains.find(
          (c) => c.chainId === window.chainId,
        );
        const lastElement =
          chain && chain.elements.length > 0 ? chain.elements[chain.elements.length - 1] : undefined;

        // Only counter if the triggering action originated from the opponent
        if (lastElement && lastElement.controllerId === context.opponentPlayerId) {
          for (const slot of observation.self.trapSlots) {
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
        turnPlayer.remaining.actions === 0 ||
        turnPlayer.participationEnded
      ) {
        return { issuer: context.playerId, kind: "turn.end_participation", payload: {} };
      }

      const observation = createAIObservation(context.engine.state, context.playerId);
      const spatial = observation.spatial;
      const candidates: ScoredCandidateAction[] = [];

      // 1. CANDIDATE: Direct Base Attack (highest strategic priority)
      if (observation.opponent.base !== undefined && observation.opponent.baseIsVisible) {
        for (const monster of observation.self.monsters) {
          if (monster.battlePosition === "attack") {
            try {
              createBaseAttackPlan(
                monster,
                context.opponentPlayerId,
                spatial,
                [],
                true,
              );
              candidates.push({
                command: {
                  issuer: context.playerId,
                  kind: "battle.declare_base_attack",
                  payload: {
                    attackerUnitId: monster.unitId,
                    defenderPlayerId: context.opponentPlayerId,
                  },
                },
                score: weights.baseDamageWeight * 10,
                description: `Base attack by ${monster.unitId}`,
              });
            } catch {
              // Not in range or blocked
            }
          }
        }
      }

      // 2. CANDIDATE: Combat Attack on Visible Enemy
      if (observation.opponent.visibleMonsters.length > 0) {
        for (const monster of observation.self.monsters) {
          if (monster.battlePosition === "attack") {
            for (const enemy of observation.opponent.visibleMonsters) {
              try {
                createBasicAttackPlan(
                  monster,
                  enemy,
                  spatial,
                  [],
                  true,
                  false,
                );

                const targetVal =
                  enemy.battlePosition === "attack" ? enemy.atk : enemy.def;
                const netDiff = monster.atk - targetVal;

                let combatScore = 0;
                if (netDiff >= enemy.hp.current) {
                  // Lethal attack destroys enemy unit
                  combatScore = weights.unitEliminationWeight * 2 + netDiff * 10;
                } else if (netDiff > 0) {
                  // Favorable damage trade
                  combatScore = weights.unitEliminationWeight + netDiff * 5;
                } else if (netDiff === 0) {
                  // Even trade
                  combatScore = weights.unitEliminationWeight * 0.5;
                } else {
                  // Monster takes counter-damage
                  if (monster.hp.current > Math.abs(netDiff)) {
                    combatScore = -50;
                  } else {
                    combatScore = -500; // Avoid suicidal attacks
                  }
                }

                if (combatScore > 0) {
                  candidates.push({
                    command: {
                      issuer: context.playerId,
                      kind: "battle.declare_basic_attack",
                      payload: {
                        attackerUnitId: monster.unitId,
                        defenderUnitId: enemy.unitId,
                      },
                    },
                    score: combatScore,
                    description: `Combat attack: ${monster.unitId} vs ${enemy.unitId}`,
                  });
                }
              } catch {
                // Not in range or blocked
              }
            }
          }
        }
      }

      // 3. CANDIDATE: Equip Spell from Hand
      const visibleHand = observation.self.cardView.visibleHand ?? [];
      const equipSpell = visibleHand.find((card) => {
        if (card.kind !== "spell") return false;
        const def = findSpellTrapDefinition(
          card.definitionId,
          context.engine.state.content?.spellTrapDefinitions,
        );
        return def?.subtype === "equip";
      });

      if (equipSpell !== undefined && observation.self.monsters.length > 0) {
        const eligibleMonsters = observation.self.monsters.filter(
          (m) => (m.equippedCards?.length ?? 0) < MAX_EQUIPMENT_PER_MONSTER,
        );
        if (eligibleMonsters.length > 0) {
          // Sort by highest ATK then proximity to enemy base
          const sorted = [...eligibleMonsters].sort((a, b) => b.atk - a.atk);
          const targetUnit = sorted[0];
          if (targetUnit !== undefined) {
            candidates.push({
              command: {
                issuer: context.playerId,
                kind: "spell.equip",
                payload: {
                  cardInstanceId: equipSpell.instanceId,
                  targetUnitId: targetUnit.unitId,
                },
              },
              score: weights.equipmentWeight + targetUnit.atk * 0.1,
              description: `Equip ${equipSpell.name} onto ${targetUnit.unitId}`,
            });
          }
        }
      }

      // 4. CANDIDATE: Set Trap from Hand (costs 0 actions!)
      const trapCard = visibleHand.find((card) => card.kind === "trap");
      if (trapCard !== undefined) {
        const emptySlot = observation.self.trapSlots.find((s) => s.card === null);
        if (emptySlot !== undefined) {
          candidates.push({
            command: {
              issuer: context.playerId,
              kind: "trap.set",
              payload: {
                cardInstanceId: trapCard.instanceId,
                slotIndex: emptySlot.slotIndex,
              },
            },
            score: weights.trapReadinessWeight,
            description: `Set trap into slot ${emptySlot.slotIndex}`,
          });
        }
      }

      // 5. CANDIDATE: Normal Summon from Hand (if map capacity < 5)
      if (observation.self.monsters.length < 5) {
        const catalog = context.engine.state.content;
        const summonableCard = visibleHand.find((card) => {
          if (card.kind !== "normal_monster") return false;
          const def = catalog?.definitions.find((d: MonsterDefinition) => d.definitionId === card.definitionId);
          return def !== undefined && def.level <= 4;
        });

        if (summonableCard !== undefined) {
          const enemyBase = observation.opponent.base;
          const anchorUnit =
            observation.self.monsters.length === 0
              ? null
              : [...observation.self.monsters].sort((a, b) => {
                  if (enemyBase === undefined) return 0;
                  const distA = orthogonalDistance(a.position, enemyBase.position);
                  const distB = orthogonalDistance(b.position, enemyBase.position);
                  return distA - distB;
                })[0];
          const anchorUnitId = anchorUnit ? anchorUnit.unitId : null;

          try {
            const destinations = findNormalSummonDestinations(
              spatial,
              context.playerId,
              anchorUnitId,
              observation.self.visibleTiles,
            );
            if (destinations.positions.length > 0) {
              const sorted = [...destinations.positions].sort((left, right) => {
                if (enemyBase === undefined) return 0;
                const distLeft = orthogonalDistance(left, enemyBase.position);
                const distRight = orthogonalDistance(right, enemyBase.position);
                return distLeft - distRight;
              });
              const bestDest = sorted[0];
              if (bestDest !== undefined) {
                unitCounter += 1;
                candidates.push({
                  command: {
                    issuer: context.playerId,
                    kind: "summon.normal",
                    payload: {
                      cardInstanceId: summonableCard.instanceId,
                      unitId: `${context.playerId}:unit:${unitCounter}`,
                      destination: bestDest as unknown as JsonValue,
                      anchorUnitId,
                      battlePosition: "attack",
                    },
                  },
                  score: weights.unitSurvivalWeight + 10,
                  description: `Normal summon to (${bestDest.x}, ${bestDest.y})`,
                });
              }
            }
          } catch {
            // Cannot find valid summon tiles
          }
        }
      }

      // 6. CANDIDATE: Tactical Movement
      const enemyBase = observation.opponent.base;
      for (const monster of observation.self.monsters) {
        if (monster.spd.current >= 1) {
          // Determine target position: enemy base, or closest visible enemy, or advance along X
          let targetPos: Position | null = enemyBase ? enemyBase.position : null;
          if (observation.opponent.visibleMonsters.length > 0) {
            const nearestEnemy = [...observation.opponent.visibleMonsters].sort(
              (a, b) =>
                orthogonalDistance(a.position, monster.position) -
                orthogonalDistance(b.position, monster.position),
            )[0];
            if (nearestEnemy) targetPos = nearestEnemy.position;
          }

          if (targetPos !== null) {
            const currentDist = orthogonalDistance(monster.position, targetPos);
            const deltaX = Math.sign(targetPos.x - monster.position.x);
            const deltaY = Math.sign(targetPos.y - monster.position.y);
            const stepCandidates: Position[] = [];
            if (deltaX !== 0) {
              stepCandidates.push({ x: monster.position.x + deltaX, y: monster.position.y });
            }
            if (deltaY !== 0) {
              stepCandidates.push({ x: monster.position.x, y: monster.position.y + deltaY });
            }

            for (const step of stepCandidates) {
              if (isInBounds(step)) {
                try {
                  const moveResult = resolveBasicMovement(
                    spatial,
                    monster.unitId,
                    monster.spd.current,
                    [step],
                  );
                  if (moveResult.traversedPath.length > 0) {
                    const newDist = orthogonalDistance(step, targetPos);
                    const improvement = currentDist - newDist;
                    if (improvement > 0) {
                      candidates.push({
                        command: {
                          issuer: context.playerId,
                          kind: "monster.move_basic",
                          payload: {
                            unitId: monster.unitId,
                            path: [step] as unknown as JsonValue,
                          },
                        },
                        score: improvement * weights.boardProximityWeight,
                        description: `Move ${monster.unitId} towards target (${step.x}, ${step.y})`,
                      });
                    }
                  }
                } catch {
                  // Movement blocked
                }
              }
            }
          }
        }
      }

      // 7. Select candidate with highest positive score
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        if (best !== undefined && best.score > 0) {
          return best.command;
        }
      }

      // Default: End participation
      return { issuer: context.playerId, kind: "turn.end_participation", payload: {} };
    },
  };
}

export function createAggressiveAI(name = "AggressiveAI"): HeadlessPolicy {
  return createHeuristicAI(name, AGGRESSIVE_AI_WEIGHTS);
}

export function createDefensiveAI(name = "DefensiveAI"): HeadlessPolicy {
  return createHeuristicAI(name, DEFENSIVE_AI_WEIGHTS);
}

export function createTacticalAI(name = "TacticalAI"): HeadlessPolicy {
  return createHeuristicAI(name, TACTICAL_AI_WEIGHTS);
}
