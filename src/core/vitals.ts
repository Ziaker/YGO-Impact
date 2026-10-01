import { deepFreeze } from "./freeze.ts";

export type PrototypeMonsterType = "normal" | "effect" | "ritual" | "fusion";
export type VitalChangeCause =
  | "damage"
  | "loss"
  | "payment"
  | "recovery"
  | "maximum_clamp"
  | "explicit_maximum_and_current_increase";

export interface VitalPool {
  readonly current: number;
  readonly maximum: number;
}

export interface VitalChangeResult {
  readonly pool: VitalPool;
  readonly amountChanged: number;
  readonly cause: VitalChangeCause;
}

export class VitalInvariantError extends Error {
  override readonly name = "VitalInvariantError";
}

function assertNonNegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new VitalInvariantError(`${label} must be a non-negative safe integer.`);
  }
}

function assertPositiveLevel(level: number): void {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new VitalInvariantError("level must be a positive safe integer.");
  }
}

function assertMonsterType(type: PrototypeMonsterType): void {
  if (type !== "normal" && type !== "effect" && type !== "ritual" && type !== "fusion") {
    throw new VitalInvariantError(`Unknown prototype monster type ${String(type)}.`);
  }
}

export function calculateBaseMaximumHp(level: number, type: PrototypeMonsterType): number {
  assertPositiveLevel(level);
  assertMonsterType(type);
  return type === "ritual" || type === "fusion" ? level + Math.floor(level / 2) : level;
}

export function calculateBaseMaximumMp(
  level: number,
  type: PrototypeMonsterType,
  normalHasGrantedMpAbility = false,
): number {
  assertPositiveLevel(level);
  assertMonsterType(type);
  if (type === "normal" && !normalHasGrantedMpAbility) return 0;
  const base = 2 + Math.floor(level / 2);
  return type === "ritual" || type === "fusion" ? base + Math.floor(level / 4) : base;
}

export function createVitalPool(maximum: number, current = maximum): VitalPool {
  assertNonNegativeInteger("maximum", maximum);
  assertNonNegativeInteger("current", current);
  if (current > maximum) {
    throw new VitalInvariantError("current cannot exceed maximum.");
  }
  return deepFreeze({ current, maximum });
}

function reduceVital(pool: VitalPool, amount: number, cause: "damage" | "loss"): VitalChangeResult {
  assertNonNegativeInteger("amount", amount);
  const nextCurrent = Math.max(0, pool.current - amount);
  return deepFreeze({
    pool: createVitalPool(pool.maximum, nextCurrent),
    amountChanged: pool.current - nextCurrent,
    cause,
  }) as VitalChangeResult;
}

export function applyDamage(pool: VitalPool, amount: number): VitalChangeResult {
  return reduceVital(pool, amount, "damage");
}

export function loseVital(pool: VitalPool, amount: number): VitalChangeResult {
  return reduceVital(pool, amount, "loss");
}

export function payVitalCost(pool: VitalPool, amount: number): VitalChangeResult {
  assertNonNegativeInteger("amount", amount);
  if (amount > pool.current) {
    throw new VitalInvariantError("A vital cost must be fully available before payment.");
  }
  return deepFreeze({
    pool: createVitalPool(pool.maximum, pool.current - amount),
    amountChanged: amount,
    cause: "payment" as const,
  }) as VitalChangeResult;
}

export function recoverVital(pool: VitalPool, amount: number): VitalChangeResult {
  assertNonNegativeInteger("amount", amount);
  const nextCurrent = Math.min(pool.maximum, pool.current + amount);
  return deepFreeze({
    pool: createVitalPool(pool.maximum, nextCurrent),
    amountChanged: nextCurrent - pool.current,
    cause: "recovery" as const,
  }) as VitalChangeResult;
}

export function setVitalMaximum(pool: VitalPool, maximum: number): VitalChangeResult {
  assertNonNegativeInteger("maximum", maximum);
  const nextCurrent = Math.min(pool.current, maximum);
  return deepFreeze({
    pool: createVitalPool(maximum, nextCurrent),
    amountChanged: pool.current - nextCurrent,
    cause: "maximum_clamp" as const,
  }) as VitalChangeResult;
}

export function increaseVitalMaximumAndCurrent(pool: VitalPool, amount: number): VitalChangeResult {
  assertNonNegativeInteger("amount", amount);
  return deepFreeze({
    pool: createVitalPool(pool.maximum + amount, pool.current + amount),
    amountChanged: amount,
    cause: "explicit_maximum_and_current_increase" as const,
  }) as VitalChangeResult;
}
