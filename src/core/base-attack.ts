import { deepFreeze } from "./freeze.ts";
import { hasClearAttackLine, isWithinOrthogonalRange } from "./geometry.ts";
import { resolveBaseAttack, type MatchState } from "./match.ts";
import type { MonsterState } from "./monster.ts";
import { createRandomStream, drawUniformIndex, type RandomDrawLog } from "./random.ts";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  createSpatialState,
  isTilePhysicallyFree,
  type Position,
  type SpatialState,
} from "./spatial.ts";

export interface BaseAttackPlan {
  readonly attackerUnitId: string;
  readonly defenderPlayerId: string;
  readonly basePosition: Position;
}

export interface ConfirmedBaseAttackResolution {
  readonly match: MatchState;
  readonly monsters: readonly MonsterState[];
  readonly spatial: SpatialState;
  readonly impactRecorded: boolean;
  readonly repositionedTo: Position | null;
  readonly randomLog: RandomDrawLog | null;
}

export class BaseAttackInvariantError extends Error {
  override readonly name = "BaseAttackInvariantError";
}

export function createBaseAttackPlan(
  attacker: MonsterState,
  defenderPlayerId: string,
  spatial: SpatialState,
  fixedObstacles: readonly Position[],
  targetVisible: boolean,
): BaseAttackPlan {
  if (attacker.ownerPlayerId === defenderPlayerId) {
    throw new BaseAttackInvariantError("A monster cannot attack its own base.");
  }
  if (attacker.battlePosition !== "attack") {
    throw new BaseAttackInvariantError("Only a monster in ATK position can impact a base.");
  }
  if (!targetVisible) {
    throw new BaseAttackInvariantError("The target base is not visible to the attacker.");
  }
  const placement = spatial.units.find((unit) => unit.unitId === attacker.unitId);
  if (
    placement === undefined ||
    placement.playerId !== attacker.ownerPlayerId ||
    placement.position.x !== attacker.position.x ||
    placement.position.y !== attacker.position.y
  ) {
    throw new BaseAttackInvariantError(`Unit ${attacker.unitId} has inconsistent spatial state.`);
  }
  const base = spatial.bases.find((candidate) => candidate.playerId === defenderPlayerId);
  if (base === undefined) {
    throw new BaseAttackInvariantError(`Player ${defenderPlayerId} has no base.`);
  }
  if (!isWithinOrthogonalRange(attacker.position, base.position, attacker.attackRange)) {
    throw new BaseAttackInvariantError("The base is outside the attacker's Basic Attack range.");
  }
  const blockers = [
    ...fixedObstacles,
    ...spatial.bases.map((candidate) => candidate.position),
    ...spatial.units.map((unit) => unit.position),
  ];
  if (!hasClearAttackLine(attacker.position, base.position, blockers)) {
    throw new BaseAttackInvariantError("The Basic Attack line to the base is blocked.");
  }
  return deepFreeze({
    attackerUnitId: attacker.unitId,
    defenderPlayerId,
    basePosition: { ...base.position },
  });
}

export function legalBaseRepositionTiles(
  spatial: SpatialState,
  playerId: string,
): readonly Position[] {
  const base = spatial.bases.find((candidate) => candidate.playerId === playerId);
  if (base === undefined) throw new BaseAttackInvariantError(`Player ${playerId} has no base.`);
  const horizontalEdge = base.position.x === 0 || base.position.x === MAP_WIDTH - 1;
  const verticalEdge = base.position.y === 0 || base.position.y === MAP_HEIGHT - 1;
  if (horizontalEdge === verticalEdge) {
    throw new BaseAttackInvariantError("A base must be centered on exactly one map edge.");
  }
  const width = Math.ceil(MAP_WIDTH / 3);
  const height = Math.ceil(MAP_HEIGHT / 3);
  const minX = base.position.x === MAP_WIDTH - 1 ? MAP_WIDTH - width : 0;
  const maxX = base.position.x === 0 ? width - 1 : MAP_WIDTH - 1;
  const minY = base.position.y === MAP_HEIGHT - 1 ? MAP_HEIGHT - height : 0;
  const maxY = base.position.y === 0 ? height - 1 : MAP_HEIGHT - 1;
  const tiles: Position[] = [];
  for (let y = horizontalEdge ? 0 : minY; y <= (horizontalEdge ? MAP_HEIGHT - 1 : maxY); y += 1) {
    for (let x = verticalEdge ? 0 : minX; x <= (verticalEdge ? MAP_WIDTH - 1 : maxX); x += 1) {
      const position = { x, y };
      if (isTilePhysicallyFree(spatial, position)) tiles.push(deepFreeze(position));
    }
  }
  return deepFreeze(tiles);
}

export function resolveConfirmedBaseAttack(
  match: MatchState,
  monsters: readonly MonsterState[],
  spatial: SpatialState,
  actingPlayerId: string,
  attackerUnitId: string,
  defenderPlayerId: string,
  fixedObstacles: readonly Position[],
  targetVisible: boolean,
  seed: string,
  randomStreamId: string,
): ConfirmedBaseAttackResolution {
  const attacker = monsters.find((monster) => monster.unitId === attackerUnitId);
  if (attacker === undefined) throw new BaseAttackInvariantError(`Unknown attacker ${attackerUnitId}.`);
  if (attacker.ownerPlayerId !== actingPlayerId) {
    throw new BaseAttackInvariantError(`Player ${actingPlayerId} does not control ${attackerUnitId}.`);
  }
  createBaseAttackPlan(attacker, defenderPlayerId, spatial, fixedObstacles, targetVisible);
  const impact = resolveBaseAttack(match, {
    attackerPlayerId: actingPlayerId,
    defenderPlayerId,
    attackType: "basic",
    attackerPosition: attacker.battlePosition,
    anyPartResolved: true,
    hitBaseValidly: true,
  });
  if (!impact.impactRecorded) {
    return deepFreeze({
      match: impact.state,
      monsters,
      spatial,
      impactRecorded: false,
      repositionedTo: null,
      randomLog: null,
    });
  }
  const candidates = legalBaseRepositionTiles(spatial, actingPlayerId);
  if (candidates.length === 0) {
    throw new BaseAttackInvariantError("No legal tile exists in the attacker's home third.");
  }
  const draw = drawUniformIndex(createRandomStream(seed, randomStreamId), candidates.length);
  const destination = candidates[draw.log.result];
  if (destination === undefined) throw new BaseAttackInvariantError("Random reposition selected no tile.");
  const nextMonsters = deepFreeze(monsters.map((monster) =>
    monster.unitId === attackerUnitId
      ? deepFreeze({ ...monster, position: deepFreeze({ ...destination }) })
      : monster,
  ));
  const nextSpatial = createSpatialState(
    spatial.bases,
    spatial.units.map((unit) =>
      unit.unitId === attackerUnitId ? { ...unit, position: destination } : unit,
    ),
  );
  return deepFreeze({
    match: impact.state,
    monsters: nextMonsters,
    spatial: nextSpatial,
    impactRecorded: true,
    repositionedTo: deepFreeze({ ...destination }),
    randomLog: draw.log,
  });
}
