import { deepFreeze } from "./freeze.ts";
import { hasKeyword } from "./keywords.ts";
import type { MonsterState } from "./monster.ts";
import {
  createSpatialState,
  isInBounds,
  positionKey,
  type Position,
  type SpatialState,
} from "./spatial.ts";

export type MovementStopReason = "completed" | "insufficient_spd" | "blocked";

export interface MovementOptions {
  readonly isGlider?: boolean;
  readonly terrainLookup?: (pos: Position) => { readonly spdCost: number; readonly impassable: boolean };
}

export interface BasicMovementResult {
  readonly spatial: SpatialState;
  readonly remainingSpd: number;
  readonly traversedPath: readonly Position[];
  readonly stopReason: MovementStopReason;
}

export interface MonsterMovementResult extends BasicMovementResult {
  readonly monsters: readonly MonsterState[];
}

export interface PendingReactionMovement {
  readonly elementId: string;
  readonly chainId: string;
  readonly playerId: string;
  readonly unitId: string;
  readonly path: readonly Position[];
}

export class MovementInvariantError extends Error {
  override readonly name = "MovementInvariantError";
}

function orthogonalDistance(left: Position, right: Position): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function clonePosition(position: Position): Position {
  return deepFreeze({ x: position.x, y: position.y });
}

export function resolveBasicMovement(
  spatial: SpatialState,
  unitId: string,
  currentSpd: number,
  path: readonly Position[],
  options?: MovementOptions,
): BasicMovementResult {
  if (!Number.isSafeInteger(currentSpd)) {
    throw new MovementInvariantError("currentSpd must be a safe integer.");
  }
  if (path.length === 0) {
    throw new MovementInvariantError("A movement path must contain at least one destination tile.");
  }

  const movingUnit = spatial.units.find((unit) => unit.unitId === unitId);
  if (movingUnit === undefined) {
    throw new MovementInvariantError(`Unknown moving unit ${unitId}.`);
  }
  if (currentSpd < 1) {
    return deepFreeze({
      spatial,
      remainingSpd: currentSpd,
      traversedPath: deepFreeze([]),
      stopReason: "insufficient_spd" as const,
    }) as BasicMovementResult;
  }

  let position = movingUnit.position;
  let remainingSpd = currentSpd;
  const traversedPath: Position[] = [];
  let stopReason: MovementStopReason = "completed";
  const baseTiles = new Set(spatial.bases.map((base) => positionKey(base.position)));
  const unitByTile = new Map(
    spatial.units
      .filter((unit) => unit.unitId !== unitId)
      .map((unit) => [positionKey(unit.position), unit] as const),
  );

  for (const destination of path) {
    if (!isInBounds(destination)) {
      throw new MovementInvariantError(`Movement destination ${positionKey(destination)} is outside the map.`);
    }
    if (orthogonalDistance(position, destination) !== 1) {
      throw new MovementInvariantError("Basic movement path must use one orthogonal tile per step.");
    }
    if (remainingSpd < 1) {
      stopReason = "insufficient_spd";
      break;
    }

    const destinationKey = positionKey(destination);
    if (baseTiles.has(destinationKey)) {
      stopReason = "blocked";
      break;
    }
    const occupant = unitByTile.get(destinationKey);
    if (occupant !== undefined && occupant.playerId !== movingUnit.playerId) {
      stopReason = "blocked";
      break;
    }
    const isFinalStep = traversedPath.length + 1 === path.length;
    if (occupant !== undefined && isFinalStep) {
      stopReason = "blocked";
      break;
    }

    const terrain = options?.terrainLookup
      ? options.terrainLookup(destination)
      : { spdCost: 1, impassable: false };

    const isGlider = options?.isGlider ?? false;

    if (terrain.impassable) {
      if (!isGlider || isFinalStep) {
        stopReason = "blocked";
        break;
      }
    }

    const stepCost = isGlider ? 1 : terrain.spdCost;

    position = clonePosition(destination);
    traversedPath.push(position);
    remainingSpd -= stepCost;
  }

  if (traversedPath.length === 0) {
    return deepFreeze({
      spatial,
      remainingSpd,
      traversedPath: deepFreeze([]),
      stopReason,
    }) as BasicMovementResult;
  }

  const units = spatial.units.map((unit) =>
    unit.unitId === unitId ? { ...unit, position } : unit,
  );
  return deepFreeze({
    spatial: createSpatialState(spatial.bases, units),
    remainingSpd,
    traversedPath: deepFreeze(traversedPath),
    stopReason,
  }) as BasicMovementResult;
}

export function resolveMonsterMovement(
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  unitId: string,
  playerId: string,
  path: readonly Position[],
  options?: MovementOptions,
): MonsterMovementResult {
  const monster = monsters.find((entry) => entry.unitId === unitId);
  if (monster === undefined) throw new MovementInvariantError(`Unknown moving monster ${unitId}.`);
  if (monster.ownerPlayerId !== playerId) {
    throw new MovementInvariantError(`Player ${playerId} does not control ${unitId}.`);
  }
  const placement = spatial.units.find((entry) => entry.unitId === unitId);
  if (
    placement === undefined ||
    placement.playerId !== playerId ||
    placement.position.x !== monster.position.x ||
    placement.position.y !== monster.position.y
  ) {
    throw new MovementInvariantError(`Unit ${unitId} has inconsistent monster and spatial state.`);
  }
  const isGlider = options?.isGlider ?? hasKeyword(monster, "GLIDER");
  const movement = resolveBasicMovement(spatial, unitId, monster.spd.current, path, {
    ...options,
    isGlider,
  });
  const finalPosition = movement.spatial.units.find((entry) => entry.unitId === unitId)?.position;
  if (finalPosition === undefined) throw new MovementInvariantError(`Moving unit ${unitId} disappeared.`);
  const updated = monsters.map((entry) =>
    entry.unitId === unitId
      ? deepFreeze({
          ...entry,
          position: deepFreeze({ ...finalPosition }),
          spd: deepFreeze({ ...entry.spd, current: movement.remainingSpd }),
        }) as MonsterState
      : entry,
  );
  return deepFreeze({ ...movement, monsters: deepFreeze(updated) }) as MonsterMovementResult;
}
