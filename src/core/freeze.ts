import type { JsonValue } from "./types.ts";

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function cloneAndFreezeJson<T extends JsonValue>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return deepFreeze(value.map((item) => cloneAndFreezeJson(item))) as T;
  }

  const clone: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    clone[key] = cloneAndFreezeJson(child);
  }
  return deepFreeze(clone) as T;
}
