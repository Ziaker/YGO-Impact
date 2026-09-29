import type { JsonValue } from "./types.ts";

const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

function assertIntegerNumber(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Authoritative numeric values must be safe integers; received ${String(value)}.`);
  }
}

export function canonicalStringify(value: JsonValue): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      assertIntegerNumber(value);
      return String(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
      }

      const objectValue = value as { readonly [key: string]: JsonValue };
      const entries = Object.entries(objectValue).sort(([left], [right]) => left.localeCompare(right, "en"));
      return `{${entries
        .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
        .join(",")}}`;
    }
    default:
      throw new TypeError(`Unsupported authoritative value type: ${typeof value}.`);
  }
}

export function hashCanonical(value: JsonValue): string {
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  let hash = FNV_OFFSET_BASIS_64;

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME_64) & UINT64_MASK;
  }

  return hash.toString(16).padStart(16, "0");
}
