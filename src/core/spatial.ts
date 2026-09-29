import { deepFreeze } from "./freeze.ts";

export const MAP_WIDTH = 31 as const;
export const MAP_HEIGHT = 17 as const;
export const MAX_MONSTERS_PER_PLAYER = 5 as const;

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface BasePlacement {
  readonly playerId: string;
  readonly position: Position;
}

export interface UnitPlacement {
  readonly unitId: string;
  readonly playerId: string;
  readonly position: Position;
}

export interface SpatialState {
  readonly bases: readonly BasePlacement[];
  readonly units: readonly UnitPlacement[];
}

export class SpatialInvariantError extends Error {
  override readonly name = "SpatialInvariantError";
}

function assertNonEmpty(label: string, value: string): void {
  if (value.trim().length === 0) {
    throw new SpatialInvariantError(`${label} must not be empty.`);
  }
}

function assertCoordinate(label: string, value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new SpatialInvariantError(`${label} must be a safe integer.`);
  }
}

export function isInBounds(position: Position): boolean {
  return (
    Number.isSafeInteger(position.x) &&
    Number.isSafeInteger(position.y) &&
    position.x >= 0 &&
    position.x < MAP_WIDTH &&
    position.y >= 0 &&
    position.y < MAP_HEIGHT
  );
}

export function positionKey(position: Position): string {
  assertCoordinate("position.x", position.x);
  assertCoordinate("position.y", position.y);
  return `${position.x},${position.y}`;
}

export function assertSpatialInvariants(state: SpatialState): void {
  const basePlayers = new Set<string>();
  const baseTiles = new Set<string>();

  for (const base of state.bases) {
    assertNonEmpty("base.playerId", base.playerId);
    if (!isInBounds(base.position)) {
      throw new SpatialInvariantError(`Base for ${base.playerId} is outside the ${MAP_WIDTH}x${MAP_HEIGHT} map.`);
    }
    if (basePlayers.has(base.playerId)) {
      throw new SpatialInvariantError(`Player ${base.playerId} has more than one base.`);
    }

    const tile = positionKey(base.position);
    if (baseTiles.has(tile)) {
      throw new SpatialInvariantError(`More than one base occupies tile ${tile}.`);
    }
    basePlayers.add(base.playerId);
    baseTiles.add(tile);
  }

  const unitIds = new Set<string>();
  const unitTiles = new Set<string>();
  const unitCounts = new Map<string, number>();

  for (const unit of state.units) {
    assertNonEmpty("unit.unitId", unit.unitId);
    assertNonEmpty("unit.playerId", unit.playerId);
    if (!basePlayers.has(unit.playerId)) {
      throw new SpatialInvariantError(`Unit ${unit.unitId} belongs to player ${unit.playerId}, which has no base.`);
    }
    if (!isInBounds(unit.position)) {
      throw new SpatialInvariantError(`Unit ${unit.unitId} is outside the ${MAP_WIDTH}x${MAP_HEIGHT} map.`);
    }
    if (unitIds.has(unit.unitId)) {
      throw new SpatialInvariantError(`Unit id ${unit.unitId} appears more than once.`);
    }

    const tile = positionKey(unit.position);
    if (baseTiles.has(tile)) {
      throw new SpatialInvariantError(`Unit ${unit.unitId} occupies solid base tile ${tile}.`);
    }
    if (unitTiles.has(tile)) {
      throw new SpatialInvariantError(`More than one monster occupies tile ${tile}.`);
    }

    const count = (unitCounts.get(unit.playerId) ?? 0) + 1;
    if (count > MAX_MONSTERS_PER_PLAYER) {
      throw new SpatialInvariantError(
        `Player ${unit.playerId} exceeds the ${MAX_MONSTERS_PER_PLAYER}-monster map limit.`,
      );
    }

    unitIds.add(unit.unitId);
    unitTiles.add(tile);
    unitCounts.set(unit.playerId, count);
  }
}

function clonePosition(position: Position): Position {
  return deepFreeze({ x: position.x, y: position.y });
}

export function createSpatialState(
  bases: readonly BasePlacement[],
  units: readonly UnitPlacement[] = [],
): SpatialState {
  const state: SpatialState = {
    bases: bases.map((base) =>
      deepFreeze({
        playerId: base.playerId,
        position: clonePosition(base.position),
      }),
    ),
    units: units.map((unit) =>
      deepFreeze({
        unitId: unit.unitId,
        playerId: unit.playerId,
        position: clonePosition(unit.position),
      }),
    ),
  };

  assertSpatialInvariants(state);
  return deepFreeze(state) as SpatialState;
}

export function isTilePhysicallyFree(state: SpatialState, position: Position): boolean {
  if (!isInBounds(position)) return false;
  const tile = positionKey(position);
  return (
    !state.bases.some((base) => positionKey(base.position) === tile) &&
    !state.units.some((unit) => positionKey(unit.position) === tile)
  );
}
