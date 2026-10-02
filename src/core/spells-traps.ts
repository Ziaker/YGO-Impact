import { deepFreeze } from "./freeze.ts";
import type { CardInstance } from "./draw.ts";
import type { Position } from "./spatial.ts";

export type SpellSubtype =
  | "normal"
  | "action"
  | "quick_play"
  | "continuous"
  | "equip"
  | "field"
  | "ritual";

export type TrapSubtype = "reaction" | "normal" | "continuous" | "counter" | "field";

export type SpellTrapSubtype = SpellSubtype | TrapSubtype;

export type SpellTrapEffectKind =
  | "stat_buff"
  | "damage"
  | "heal"
  | "destroy_monster"
  | "negate_chain_element"
  | "destroy_trap_slot";

export interface StatModifiers {
  readonly atk?: number;
  readonly def?: number;
  readonly spd?: number;
  readonly vis?: number;
}

export interface SpellTrapDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly kind: "spell" | "trap";
  readonly subtype: SpellTrapSubtype;
  readonly description: string;
  readonly actionCost?: number;
  readonly reactionCost?: number;
  readonly targetsEnemy?: boolean;
  readonly isImmediate?: boolean;
  readonly effectKind: SpellTrapEffectKind;
  readonly statModifiers?: StatModifiers;
  readonly value?: number;
}

export interface TrapSlotState {
  readonly slotIndex: number;
  readonly card: CardInstance | null;
  readonly isFieldTrap: boolean;
  readonly fieldRegion?: readonly Position[];
  readonly revealed: boolean;
}

export interface PlayerTrapSlots {
  readonly playerId: string;
  readonly slots: readonly [TrapSlotState, TrapSlotState, TrapSlotState];
}

export interface ResolutionCardState {
  readonly card: CardInstance;
  readonly controllerPlayerId: string;
  readonly chainId?: string;
  readonly elementId?: string;
  readonly isEquip?: boolean;
  readonly targetUnitId?: string;
}

export const MAX_TRAP_SLOTS_PER_PLAYER = 3 as const;
export const MAX_EQUIPMENT_PER_MONSTER = 3 as const;

export class SpellTrapInvariantError extends Error {
  override readonly name = "SpellTrapInvariantError";
}

export function createInitialTrapSlots(playerId: string): PlayerTrapSlots {
  if (playerId.trim().length === 0) {
    throw new SpellTrapInvariantError("playerId must not be empty.");
  }
  const slots: [TrapSlotState, TrapSlotState, TrapSlotState] = [
    { slotIndex: 0, card: null, isFieldTrap: false, revealed: false },
    { slotIndex: 1, card: null, isFieldTrap: false, revealed: false },
    { slotIndex: 2, card: null, isFieldTrap: false, revealed: false },
  ];
  return deepFreeze({
    playerId,
    slots: deepFreeze(slots) as readonly [TrapSlotState, TrapSlotState, TrapSlotState],
  });
}

/** Curated baseline set of pre-2005 Spells and Traps */
export const CURATED_SPELL_TRAP_DEFINITIONS: readonly SpellTrapDefinition[] = deepFreeze([
  // Equip Spells
  {
    definitionId: "86198326",
    name: "7 Completed",
    kind: "spell",
    subtype: "equip",
    description: "An Equip Spell that grants +2 ATK to the equipped monster.",
    actionCost: 1,
    reactionCost: 0,
    targetsEnemy: false,
    effectKind: "stat_buff",
    statModifiers: { atk: 2 },
  },
  {
    definitionId: "sword-dark-destr",
    name: "Sword of Dark Destruction",
    kind: "spell",
    subtype: "equip",
    description: "An Equip Spell that grants +2 ATK and -1 DEF.",
    actionCost: 1,
    reactionCost: 0,
    targetsEnemy: false,
    effectKind: "stat_buff",
    statModifiers: { atk: 2, def: -1 },
  },
  {
    definitionId: "horn-unicorn",
    name: "Horn of the Unicorn",
    kind: "spell",
    subtype: "equip",
    description: "An Equip Spell that grants +1 ATK and +1 DEF.",
    actionCost: 1,
    reactionCost: 0,
    targetsEnemy: false,
    effectKind: "stat_buff",
    statModifiers: { atk: 1, def: 1 },
  },
  // Normal Spells
  {
    definitionId: "raigeki",
    name: "Raigeki",
    kind: "spell",
    subtype: "normal",
    description: "Destroys 1 target enemy monster on the map within shared vision.",
    actionCost: 1,
    reactionCost: 0,
    targetsEnemy: true,
    effectKind: "destroy_monster",
  },
  {
    definitionId: "dian-keto",
    name: "Dian Keto the Cure Maiden",
    kind: "spell",
    subtype: "normal",
    description: "Heals 3 HP to 1 target allied monster.",
    actionCost: 1,
    reactionCost: 0,
    targetsEnemy: false,
    effectKind: "heal",
    value: 3,
  },
  {
    definitionId: "hinotama",
    name: "Hinotama",
    kind: "spell",
    subtype: "normal",
    description: "Inflicts 2 direct damage to 1 target enemy monster.",
    actionCost: 1,
    reactionCost: 0,
    targetsEnemy: true,
    effectKind: "damage",
    value: 2,
  },
  // Quick-Play / Action Spells
  {
    definitionId: "rush-recklessly",
    name: "Rush Recklessly",
    kind: "spell",
    subtype: "quick_play",
    description: "A Quick-Play Spell that grants +2 ATK to 1 target monster.",
    actionCost: 0, // Quick-Play does not consume resource pool action (GDD P732)
    reactionCost: 0,
    targetsEnemy: false,
    effectKind: "stat_buff",
    statModifiers: { atk: 2 },
  },
  // Traps: Reaction / Normal
  {
    definitionId: "trap-hole",
    name: "Trap Hole",
    kind: "trap",
    subtype: "reaction",
    description: "A Reaction Trap that destroys 1 target enemy monster.",
    actionCost: 0,
    reactionCost: 1,
    targetsEnemy: true,
    effectKind: "destroy_monster",
  },
  // Traps: Counter Trap
  {
    definitionId: "seven-tools",
    name: "Seven Tools of the Bandit",
    kind: "trap",
    subtype: "counter",
    description: "A Counter Trap that negates the activation of an opponent's Chain element.",
    actionCost: 0,
    reactionCost: 1,
    targetsEnemy: true,
    effectKind: "negate_chain_element",
  },
  {
    definitionId: "magic-jammer",
    name: "Magic Jammer",
    kind: "trap",
    subtype: "counter",
    description: "A Counter Trap that negates the activation of an opponent's Chain element.",
    actionCost: 0,
    reactionCost: 1,
    targetsEnemy: true,
    effectKind: "negate_chain_element",
  },
]);

export interface PendingSpellActivation {
  readonly elementId: string;
  readonly cardInstanceId: string;
  readonly controllerPlayerId: string;
  readonly effectKind: SpellTrapEffectKind;
  readonly targetUnitIds: readonly string[];
  readonly statModifiers?: StatModifiers;
  readonly value?: number;
}

export interface PendingTrapActivation {
  readonly elementId: string;
  readonly cardInstanceId: string;
  readonly controllerPlayerId: string;
  readonly effectKind: SpellTrapEffectKind;
  readonly targetUnitIds: readonly string[];
  readonly targetElementId?: string;
  readonly value?: number;
}

export function findSpellTrapDefinition(
  definitionId: string,
  customDefinitions?: readonly SpellTrapDefinition[],
): SpellTrapDefinition | undefined {
  if (customDefinitions) {
    const custom = customDefinitions.find((def) => def.definitionId === definitionId);
    if (custom) return custom;
  }
  return CURATED_SPELL_TRAP_DEFINITIONS.find((def) => def.definitionId === definitionId);
}

export function applyEquipModifiers(
  monster: import("./monster.ts").MonsterState,
  modifiers: StatModifiers,
): import("./monster.ts").MonsterState {
  return deepFreeze({
    ...monster,
    atk: Math.max(0, monster.atk + (modifiers.atk ?? 0)),
    def: Math.max(0, monster.def + (modifiers.def ?? 0)),
    vis: Math.max(0, monster.vis + (modifiers.vis ?? 0)),
  }) as import("./monster.ts").MonsterState;
}

export function removeEquipModifiers(
  monster: import("./monster.ts").MonsterState,
  modifiers: StatModifiers,
): import("./monster.ts").MonsterState {
  return deepFreeze({
    ...monster,
    atk: Math.max(0, monster.atk - (modifiers.atk ?? 0)),
    def: Math.max(0, monster.def - (modifiers.def ?? 0)),
    vis: Math.max(0, monster.vis - (modifiers.vis ?? 0)),
  }) as import("./monster.ts").MonsterState;
}

