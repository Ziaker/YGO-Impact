import { deepFreeze } from "./freeze.ts";
import { isInBounds, positionKey, type Position } from "./spatial.ts";

export type TerrainKind = "plain" | "rough" | "impassable";

export interface TerrainTile {
  readonly position: Position;
  readonly kind: TerrainKind;
  readonly spdCost: number;
  readonly impassable: boolean;
}

export interface TerrainConfig {
  readonly tiles?: readonly TerrainTile[];
}

export class TerrainInvariantError extends Error {
  override readonly name = "TerrainInvariantError";
}

export function createTerrainTile(
  position: Position,
  kind: TerrainKind,
  customSpdCost?: number,
): TerrainTile {
  if (!isInBounds(position)) {
    throw new TerrainInvariantError(`Terrain tile at (${position.x}, ${position.y}) is out of bounds.`);
  }

  let spdCost = 1;
  let impassable = false;

  switch (kind) {
    case "plain":
      spdCost = customSpdCost ?? 1;
      impassable = false;
      break;
    case "rough":
      spdCost = customSpdCost ?? 2;
      impassable = false;
      break;
    case "impassable":
      spdCost = customSpdCost ?? Infinity;
      impassable = true;
      break;
    default:
      throw new TerrainInvariantError(`Unknown terrain kind: ${String(kind)}`);
  }

  return deepFreeze({
    position: deepFreeze({ x: position.x, y: position.y }),
    kind,
    spdCost,
    impassable,
  });
}

export function createTerrainLookup(
  tiles?: readonly TerrainTile[],
): (pos: Position) => { readonly spdCost: number; readonly impassable: boolean } {
  if (tiles === undefined || tiles.length === 0) {
    return () => ({ spdCost: 1, impassable: false });
  }

  const map = new Map<string, TerrainTile>();
  for (const tile of tiles) {
    map.set(positionKey(tile.position), tile);
  }

  return (pos: Position) => {
    const found = map.get(positionKey(pos));
    if (found !== undefined) {
      return { spdCost: found.spdCost, impassable: found.impassable };
    }
    return { spdCost: 1, impassable: false };
  };
}
