import { deepFreeze } from "./freeze.ts";
import { calculateStructuralRaceBonuses, type PriorityRace } from "./race.ts";
import { isInBounds, type Position } from "./spatial.ts";
import {
  calculateBaseMaximumHp,
  calculateBaseMaximumMp,
  createVitalPool,
  recoverVital,
  type PrototypeMonsterType,
  type VitalPool,
} from "./vitals.ts";

export const MONSTER_ELEMENTS = ["fire", "earth", "water", "wind", "light", "dark"] as const;
export type MonsterElement = (typeof MONSTER_ELEMENTS)[number];
export type MonsterBattlePosition = "attack" | "defense";

export interface MonsterDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly level: number;
  readonly type: PrototypeMonsterType;
  readonly elements: readonly MonsterElement[];
  readonly races: readonly PriorityRace[];
  readonly printedVis: number;
  readonly printedSpd: number;
  readonly printedAtk: number;
  readonly printedDef: number;
  readonly printedAttackRange?: number;
  readonly normalHasGrantedMpAbility?: boolean;
}

export interface MonsterState {
  readonly unitId: string;
  readonly cardInstanceId: string;
  readonly ownerPlayerId: string;
  readonly definitionId: string;
  readonly name: string;
  readonly level: number;
  readonly type: PrototypeMonsterType;
  readonly structuralElements: readonly MonsterElement[];
  readonly structuralRaces: readonly PriorityRace[];
  readonly position: Position;
  readonly battlePosition: MonsterBattlePosition;
  readonly hp: VitalPool;
  readonly mp: VitalPool;
  readonly vis: number;
  readonly spd: VitalPool;
  readonly atk: number;
  readonly def: number;
  readonly attackRange: number;
  readonly usedEffectSinceLastSupport: boolean;
}

export interface SupportRecoveryResult {
  readonly monster: MonsterState;
  readonly hpRecovered: number;
  readonly mpRecovered: number;
}

export class MonsterInvariantError extends Error {
  override readonly name = "MonsterInvariantError";
}

function assertNonEmpty(label: string, value: string): void {
  if (value.trim().length === 0) throw new MonsterInvariantError(`${label} must not be empty.`);
}

function assertNonNegative(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MonsterInvariantError(`${label} must be a non-negative safe integer.`);
  }
}

function assertUniqueValues(label: string, values: readonly string[]): void {
  if (values.length === 0) throw new MonsterInvariantError(`${label} must not be empty.`);
  if (new Set(values).size !== values.length) {
    throw new MonsterInvariantError(`${label} must not contain duplicates.`);
  }
}

export function createMonsterState(
  definition: MonsterDefinition,
  unitId: string,
  cardInstanceId: string,
  ownerPlayerId: string,
  position: Position,
  battlePosition: MonsterBattlePosition,
): MonsterState {
  assertNonEmpty("definitionId", definition.definitionId);
  assertNonEmpty("name", definition.name);
  assertNonEmpty("unitId", unitId);
  assertNonEmpty("cardInstanceId", cardInstanceId);
  assertNonEmpty("ownerPlayerId", ownerPlayerId);
  if (!Number.isSafeInteger(definition.level) || definition.level < 1) {
    throw new MonsterInvariantError("level must be a positive safe integer.");
  }
  assertUniqueValues("elements", definition.elements);
  if (!definition.elements.every((element) => MONSTER_ELEMENTS.includes(element))) {
    throw new MonsterInvariantError("Monster contains an unsupported structural element.");
  }
  assertUniqueValues("races", definition.races);
  assertNonNegative("printedVis", definition.printedVis);
  assertNonNegative("printedSpd", definition.printedSpd);
  assertNonNegative("printedAtk", definition.printedAtk);
  assertNonNegative("printedDef", definition.printedDef);
  const attackRange = definition.printedAttackRange ?? 1;
  if (!Number.isSafeInteger(attackRange) || attackRange < 1) {
    throw new MonsterInvariantError("printedAttackRange must be a positive safe integer.");
  }
  if (!isInBounds(position)) throw new MonsterInvariantError("position must be inside the map.");
  if (battlePosition !== "attack" && battlePosition !== "defense") {
    throw new MonsterInvariantError(`Unknown battle position ${String(battlePosition)}.`);
  }

  const bonuses = calculateStructuralRaceBonuses(definition.races);
  const maximumHp = calculateBaseMaximumHp(definition.level, definition.type) + bonuses.hp;
  const maximumMp =
    calculateBaseMaximumMp(
      definition.level,
      definition.type,
      definition.normalHasGrantedMpAbility ?? false,
    ) + bonuses.mp;
  const maximumSpd = definition.printedSpd + bonuses.spd;

  return deepFreeze({
    unitId,
    cardInstanceId,
    ownerPlayerId,
    definitionId: definition.definitionId,
    name: definition.name,
    level: definition.level,
    type: definition.type,
    structuralElements: deepFreeze([...definition.elements]),
    structuralRaces: deepFreeze([...definition.races]),
    position: deepFreeze({ x: position.x, y: position.y }),
    battlePosition,
    hp: createVitalPool(maximumHp),
    mp: createVitalPool(maximumMp),
    vis: definition.printedVis + bonuses.vis,
    spd: createVitalPool(maximumSpd),
    atk: definition.printedAtk + bonuses.atk,
    def: definition.printedDef + bonuses.def,
    attackRange,
    usedEffectSinceLastSupport: false,
  }) as MonsterState;
}

export function markMonsterEffectUsed(monster: MonsterState): MonsterState {
  if (monster.usedEffectSinceLastSupport) return monster;
  return deepFreeze({ ...monster, usedEffectSinceLastSupport: true }) as MonsterState;
}

export function changeMonsterBattlePosition(
  monsters: readonly MonsterState[],
  unitId: string,
  playerId: string,
): readonly MonsterState[] {
  const index = monsters.findIndex((monster) => monster.unitId === unitId);
  const monster = monsters[index];
  if (monster === undefined) throw new MonsterInvariantError(`Unknown monster ${unitId}.`);
  if (monster.ownerPlayerId !== playerId) {
    throw new MonsterInvariantError(`Player ${playerId} does not control monster ${unitId}.`);
  }
  return deepFreeze(monsters.map((current, currentIndex) =>
    currentIndex === index
      ? deepFreeze({
          ...current,
          battlePosition: current.battlePosition === "attack" ? "defense" : "attack",
        }) as MonsterState
      : current,
  ));
}

export function recoverMonsterAtSupport(monster: MonsterState): SupportRecoveryResult {
  const hp = recoverVital(monster.hp, 1);
  const mp = recoverVital(monster.mp, monster.usedEffectSinceLastSupport ? 1 : 2);
  return deepFreeze({
    monster: deepFreeze({
      ...monster,
      hp: hp.pool,
      mp: mp.pool,
      usedEffectSinceLastSupport: false,
    }) as MonsterState,
    hpRecovered: hp.amountChanged,
    mpRecovered: mp.amountChanged,
  }) as SupportRecoveryResult;
}

export function recoverMonstersAtSupport(
  monsters: readonly MonsterState[],
): readonly SupportRecoveryResult[] {
  const ids = new Set<string>();
  for (const monster of monsters) {
    if (ids.has(monster.unitId)) {
      throw new MonsterInvariantError(`Monster unit id ${monster.unitId} appears more than once.`);
    }
    ids.add(monster.unitId);
  }
  return deepFreeze(monsters.map((monster) => recoverMonsterAtSupport(monster)));
}
