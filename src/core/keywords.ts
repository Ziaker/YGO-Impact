import { deepFreeze } from "./freeze.ts";
import type { MonsterDefinition, MonsterState } from "./monster.ts";
import { isInBounds, isTilePhysicallyFree, type Position, type SpatialState } from "./spatial.ts";

export const CANONICAL_KEYWORDS = [
  "GLIDER",
  "LEAPER",
  "PHANTOM",
  "BULWARK",
  "OBSCURE",
  "SIGHT",
  "REGEN",
  "REPULSE",
  "BARRAGE",
  "CHARGE",
  "EVASIVE",
  "INTIMIDATE",
  "ADAPTATION",
  "PREPARATION",
  "REANIMATE",
  "RECALL",
  "BLAST",
  "PSYWAVE",
  "PSYBLAST",
  "BERSERKER",
  "RAMPAGE",
] as const;

export type CanonicalKeywordName = (typeof CANONICAL_KEYWORDS)[number];

export interface ParsedKeyword {
  readonly name: CanonicalKeywordName;
  readonly parameter: number | null;
  readonly raw: string;
}

export class KeywordInvariantError extends Error {
  override readonly name = "KeywordInvariantError";
}

/**
 * Parses a keyword string such as "REGEN 1", "BULWARK", "SIGHT 2", "CHARGE 1".
 */
export function parseKeyword(raw: string): ParsedKeyword {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new KeywordInvariantError("Keyword string must not be empty.");
  }

  const parts = trimmed.split(/\s+/);
  const nameCandidate = parts[0]?.toUpperCase() as CanonicalKeywordName;
  if (!CANONICAL_KEYWORDS.includes(nameCandidate)) {
    throw new KeywordInvariantError(`Unknown canonical keyword '${nameCandidate}'.`);
  }

  if (parts.length === 1) {
    return deepFreeze({
      name: nameCandidate,
      parameter: null,
      raw: trimmed,
    });
  }

  if (parts.length === 2) {
    const param = Number(parts[1]);
    if (!Number.isSafeInteger(param) || param < 0) {
      throw new KeywordInvariantError(
        `Keyword parameter for '${nameCandidate}' must be a non-negative safe integer: received '${parts[1]}'.`,
      );
    }
    return deepFreeze({
      name: nameCandidate,
      parameter: param,
      raw: trimmed,
    });
  }

  throw new KeywordInvariantError(`Invalid keyword format '${trimmed}'. Expected 'NAME' or 'NAME <number>'.`);
}

export function parseMonsterKeywords(
  keywords?: readonly string[],
): readonly ParsedKeyword[] {
  if (keywords === undefined || keywords.length === 0) {
    return deepFreeze([]);
  }
  return deepFreeze(keywords.map(parseKeyword));
}

export function hasKeyword(
  entity: Pick<MonsterState, "keywords"> | Pick<MonsterDefinition, "keywords">,
  keywordName: CanonicalKeywordName,
): boolean {
  if (entity.keywords === undefined || entity.keywords.length === 0) {
    return false;
  }
  return entity.keywords.some((raw) => {
    try {
      return parseKeyword(raw).name === keywordName;
    } catch {
      return false;
    }
  });
}

export function getKeywordParameter(
  entity: Pick<MonsterState, "keywords"> | Pick<MonsterDefinition, "keywords">,
  keywordName: CanonicalKeywordName,
): number | null {
  if (entity.keywords === undefined || entity.keywords.length === 0) {
    return null;
  }
  for (const raw of entity.keywords) {
    try {
      const parsed = parseKeyword(raw);
      if (parsed.name === keywordName) {
        return parsed.parameter;
      }
    } catch {
      // Ignore unparseable
    }
  }
  return null;
}

/**
 * BLAST X: The monster's first Basic Attack each turn gains +X range.
 */
export function calculateEffectiveAttackRange(
  monster: MonsterState,
  attacksDeclaredThisTurn = 0,
): number {
  const blastParam = getKeywordParameter(monster, "BLAST");
  if (blastParam !== null && attacksDeclaredThisTurn === 0) {
    return monster.attackRange + blastParam;
  }
  return monster.attackRange;
}

/**
 * INTIMIDATE X: Enemies in a square of radius X around this monster receive ATK -1 while in the area.
 */
export function calculateEffectiveAtk(
  monster: MonsterState,
  allMonsters: readonly MonsterState[],
): number {
  let penalty = 0;
  for (const other of allMonsters) {
    if (other.ownerPlayerId === monster.ownerPlayerId) continue;
    const radius = getKeywordParameter(other, "INTIMIDATE");
    if (radius !== null) {
      const dist = Math.max(
        Math.abs(monster.position.x - other.position.x),
        Math.abs(monster.position.y - other.position.y),
      );
      if (dist <= radius) {
        penalty += 1;
      }
    }
  }
  return monster.atk - penalty;
}

/**
 * PSYBLAST X: First basic attack that deals > 0 HP damage reduces target's MP by X.
 */
export function calculatePsyblastReduction(
  attacker: MonsterState,
  hpDamageDealt: number,
  attacksHitThisTurn = 0,
): number {
  if (hpDamageDealt <= 0 || attacksHitThisTurn > 0) return 0;
  const psyblastParam = getKeywordParameter(attacker, "PSYBLAST");
  return psyblastParam ?? 0;
}

/**
 * REPULSE X: After dealing damage, moves target up to X blocks directly away from attacker,
 * stopping before an illegal tile.
 */
export function calculateRepulseDestination(
  attackerPosition: Position,
  defenderPosition: Position,
  distance: number,
  spatial: SpatialState,
): Position {
  const deltaX = Math.sign(defenderPosition.x - attackerPosition.x);
  const deltaY = Math.sign(defenderPosition.y - attackerPosition.y);
  if (deltaX === 0 && deltaY === 0) return defenderPosition;

  let current = defenderPosition;
  for (let step = 1; step <= distance; step += 1) {
    const next = { x: current.x + deltaX, y: current.y + deltaY };
    if (!isInBounds(next)) break;
    if (!isTilePhysicallyFree(spatial, next)) break;
    current = next;
  }
  return deepFreeze({ ...current });
}

/**
 * BERSERKER X: First time current HP drops below half maximum HP, gains ATK +X, max SPD +X, current SPD +X.
 */
export function checkBerserkerTrigger(
  monster: MonsterState,
  previousHpCurrent: number,
  newHpCurrent: number,
): number | null {
  if (!hasKeyword(monster, "BERSERKER")) return null;
  const halfMax = Math.ceil(monster.hp.maximum / 2);
  if (previousHpCurrent >= halfMax && newHpCurrent < halfMax && newHpCurrent > 0) {
    return getKeywordParameter(monster, "BERSERKER") ?? 0;
  }
  return null;
}

