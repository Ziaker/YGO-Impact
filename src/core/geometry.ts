import { deepFreeze } from "./freeze.ts";
import { isInBounds, positionKey, type Position } from "./spatial.ts";

export class GeometryInvariantError extends Error {
  override readonly name = "GeometryInvariantError";
}

function assertPosition(label: string, position: Position): void {
  if (!isInBounds(position)) {
    throw new GeometryInvariantError(`${label} must be inside the map.`);
  }
}

function frozenPosition(x: number, y: number): Position {
  return deepFreeze({ x, y });
}

export function orthogonalDistance(left: Position, right: Position): number {
  assertPosition("left", left);
  assertPosition("right", right);
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

export function isWithinOrthogonalRange(
  origin: Position,
  target: Position,
  range: number,
): boolean {
  if (!Number.isSafeInteger(range) || range < 0) {
    throw new GeometryInvariantError("range must be a non-negative safe integer.");
  }
  return orthogonalDistance(origin, target) <= range;
}

export function traceTouchedTiles(origin: Position, target: Position): readonly Position[] {
  assertPosition("origin", origin);
  assertPosition("target", target);

  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const countX = Math.abs(deltaX);
  const countY = Math.abs(deltaY);
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  let x = origin.x;
  let y = origin.y;
  let crossedX = 0;
  let crossedY = 0;
  const tiles: Position[] = [frozenPosition(x, y)];
  const seen = new Set<string>([positionKey(origin)]);

  const add = (tileX: number, tileY: number): void => {
    const key = `${tileX},${tileY}`;
    if (!seen.has(key)) {
      seen.add(key);
      tiles.push(frozenPosition(tileX, tileY));
    }
  };

  while (crossedX < countX || crossedY < countY) {
    const comparisonX = (1 + 2 * crossedX) * countY;
    const comparisonY = (1 + 2 * crossedY) * countX;
    if (comparisonX === comparisonY) {
      add(x + stepX, y);
      add(x, y + stepY);
      x += stepX;
      y += stepY;
      crossedX += 1;
      crossedY += 1;
      add(x, y);
    } else if (comparisonX < comparisonY) {
      x += stepX;
      crossedX += 1;
      add(x, y);
    } else {
      y += stepY;
      crossedY += 1;
      add(x, y);
    }
  }

  return deepFreeze(tiles);
}

export function hasClearAttackLine(
  origin: Position,
  target: Position,
  blockingTiles: readonly Position[],
): boolean {
  const originKey = positionKey(origin);
  const targetKey = positionKey(target);
  const blockers = new Set(blockingTiles.map(positionKey));
  return traceTouchedTiles(origin, target).every((tile) => {
    const key = positionKey(tile);
    return key === originKey || key === targetKey || !blockers.has(key);
  });
}
