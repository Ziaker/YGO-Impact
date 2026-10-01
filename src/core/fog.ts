import { deepFreeze } from "./freeze.ts";
import type { MonsterState } from "./monster.ts";
import { positionKey, type Position, type SpatialState } from "./spatial.ts";
import { calculateSharedVisibility } from "./visibility.ts";

export interface EnemyFogRecord {
  readonly unitId: string;
  readonly ownerPlayerId: string;
  readonly lastKnownPosition: Position;
  readonly currentlyVisible: boolean;
}

export interface PlayerFogKnowledge {
  readonly playerId: string;
  readonly enemies: readonly EnemyFogRecord[];
}

export class FogInvariantError extends Error {
  override readonly name = "FogInvariantError";
}

export function createPlayerFogKnowledge(playerId: string): PlayerFogKnowledge {
  if (playerId.trim().length === 0) throw new FogInvariantError("playerId must not be empty.");
  return deepFreeze({ playerId, enemies: deepFreeze([]) });
}

/**
 * Updates only information the viewer can legitimately know. Hidden movement never
 * changes a last-known marker. Removal after an observed destruction belongs to the
 * causal event layer; a snapshot alone must not guess why a unit is absent.
 */
export function updatePlayerFogKnowledge(
  previous: PlayerFogKnowledge,
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  fixedObstacles: readonly Position[] = [],
): PlayerFogKnowledge {
  if (previous.playerId.trim().length === 0) {
    throw new FogInvariantError("Fog knowledge playerId must not be empty.");
  }
  const duplicateRecords = new Set<string>();
  for (const record of previous.enemies) {
    if (record.ownerPlayerId === previous.playerId) {
      throw new FogInvariantError("Fog knowledge must not contain an allied unit.");
    }
    if (duplicateRecords.has(record.unitId)) {
      throw new FogInvariantError(`Fog record ${record.unitId} appears more than once.`);
    }
    duplicateRecords.add(record.unitId);
  }

  const visibleTiles = calculateSharedVisibility(
    monsters,
    spatial,
    previous.playerId,
    fixedObstacles,
  );
  const visibleKeys = new Set(visibleTiles.map(positionKey));
  const currentEnemies = monsters.filter(
    (monster) => monster.ownerPlayerId !== previous.playerId,
  );
  const currentById = new Map(currentEnemies.map((monster) => [monster.unitId, monster] as const));
  const result = new Map<string, EnemyFogRecord>();

  for (const record of previous.enemies) {
    const current = currentById.get(record.unitId);
    if (current !== undefined && visibleKeys.has(positionKey(current.position))) {
      result.set(
        current.unitId,
        deepFreeze({
          unitId: current.unitId,
          ownerPlayerId: current.ownerPlayerId,
          lastKnownPosition: deepFreeze({ ...current.position }),
          currentlyVisible: true,
        }),
      );
      continue;
    }
    result.set(
      record.unitId,
      deepFreeze({
        ...record,
        lastKnownPosition: deepFreeze({ ...record.lastKnownPosition }),
        currentlyVisible: false,
      }),
    );
  }

  for (const enemy of currentEnemies) {
    if (
      visibleKeys.has(positionKey(enemy.position)) &&
      !result.has(enemy.unitId)
    ) {
      result.set(
        enemy.unitId,
        deepFreeze({
          unitId: enemy.unitId,
          ownerPlayerId: enemy.ownerPlayerId,
          lastKnownPosition: deepFreeze({ ...enemy.position }),
          currentlyVisible: true,
        }),
      );
    }
  }

  const enemies = [...result.values()].sort((left, right) =>
    left.unitId < right.unitId ? -1 : left.unitId > right.unitId ? 1 : 0,
  );
  return deepFreeze({ playerId: previous.playerId, enemies: deepFreeze(enemies) });
}
