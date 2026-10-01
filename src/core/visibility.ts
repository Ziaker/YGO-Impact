import { deepFreeze } from "./freeze.ts";
import { hasClearAttackLine, isWithinOrthogonalRange } from "./geometry.ts";
import type { MonsterState } from "./monster.ts";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  isInBounds,
  positionKey,
  type Position,
  type SpatialState,
} from "./spatial.ts";

export class VisibilityInvariantError extends Error {
  override readonly name = "VisibilityInvariantError";
}

export const BASE_VIS_RANGE = 5 as const;

function comparePositions(left: Position, right: Position): number {
  return left.y - right.y || left.x - right.x;
}

/**
 * Calculates the tiles revealed by allied monsters. Fixed geography remains known
 * independently; this result is the authoritative dynamic shared-VIS area.
 */
export function calculateSharedMonsterVisibility(
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  playerId: string,
  fixedObstacles: readonly Position[] = [],
): readonly Position[] {
  if (playerId.trim().length === 0) {
    throw new VisibilityInvariantError("playerId must not be empty.");
  }
  if (!spatial.bases.some((base) => base.playerId === playerId)) {
    throw new VisibilityInvariantError(`Player ${playerId} has no base on this map.`);
  }
  if (monsters.length !== spatial.units.length) {
    throw new VisibilityInvariantError("Monster and spatial state contain different unit counts.");
  }
  for (const obstacle of fixedObstacles) {
    if (!isInBounds(obstacle)) {
      throw new VisibilityInvariantError("Every fixed obstacle must be inside the map.");
    }
  }
  for (const monster of monsters) {
    const placement = spatial.units.find((unit) => unit.unitId === monster.unitId);
    if (
      placement === undefined ||
      placement.playerId !== monster.ownerPlayerId ||
      placement.position.x !== monster.position.x ||
      placement.position.y !== monster.position.y
    ) {
      throw new VisibilityInvariantError(
        `Unit ${monster.unitId} has inconsistent monster and spatial state.`,
      );
    }
  }

  const allies = monsters.filter((monster) => monster.ownerPlayerId === playerId);
  const blockers = [...fixedObstacles, ...spatial.bases.map((base) => base.position)];
  const visible = new Map<string, Position>();
  for (const ally of allies) {
    const range = Math.max(0, ally.vis);
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const target = { x, y };
        if (
          isWithinOrthogonalRange(ally.position, target, range) &&
          hasClearAttackLine(ally.position, target, blockers)
        ) {
          visible.set(positionKey(target), deepFreeze(target));
        }
      }
    }
  }

  return deepFreeze([...visible.values()].sort(comparePositions));
}

/** Shared VIS includes the author-approved square of radius five around the player's base. */
export function calculateSharedVisibility(
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  playerId: string,
  fixedObstacles: readonly Position[] = [],
): readonly Position[] {
  const visible = new Map(
    calculateSharedMonsterVisibility(monsters, spatial, playerId, fixedObstacles).map(
      (position) => [positionKey(position), position] as const,
    ),
  );
  const base = spatial.bases.find((entry) => entry.playerId === playerId);
  if (base === undefined) {
    throw new VisibilityInvariantError(`Player ${playerId} has no base on this map.`);
  }
  const blockers = [...fixedObstacles, ...spatial.bases.map((entry) => entry.position)];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const target = { x, y };
      if (
        Math.max(
          Math.abs(base.position.x - target.x),
          Math.abs(base.position.y - target.y),
        ) <= BASE_VIS_RANGE &&
        hasClearAttackLine(base.position, target, blockers)
      ) {
        visible.set(positionKey(target), deepFreeze(target));
      }
    }
  }
  return deepFreeze([...visible.values()].sort(comparePositions));
}
