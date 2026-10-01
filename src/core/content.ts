import { hashCanonical } from "./canonical.ts";
import type { CardKind, DeckConfiguration } from "./deck.ts";
import { deepFreeze } from "./freeze.ts";
import { createMonsterState, type MonsterDefinition } from "./monster.ts";
import type { RitualProcedure } from "./ritual.ts";

export type ContentViolationCode =
  | "duplicate_definition"
  | "invalid_definition"
  | "missing_definition"
  | "type_mismatch"
  | "name_mismatch";

export interface ContentViolation {
  readonly code: ContentViolationCode;
  readonly definitionId: string;
  readonly message: string;
}

export interface MonsterCatalogValidation {
  readonly valid: boolean;
  readonly violations: readonly ContentViolation[];
}

export interface MonsterCatalog {
  readonly contentHash: string;
  readonly definitions: readonly MonsterDefinition[];
  readonly ritualProcedures?: readonly RitualProcedure[];
}

export class ContentInvariantError extends Error {
  override readonly name = "ContentInvariantError";
  readonly violations: readonly ContentViolation[];

  constructor(violations: readonly ContentViolation[]) {
    super(`Invalid monster content: ${violations.map((entry) => entry.message).join(" | ")}`);
    this.violations = violations;
  }
}

const MONSTER_KINDS = new Set<CardKind>([
  "normal_monster",
  "effect_monster",
  "ritual_monster",
  "fusion_monster",
]);

function expectedKind(definition: MonsterDefinition): CardKind {
  switch (definition.type) {
    case "normal":
      return "normal_monster";
    case "effect":
      return "effect_monster";
    case "ritual":
      return "ritual_monster";
    case "fusion":
      return "fusion_monster";
    default:
      return "effect_monster";
  }
}

function violation(
  code: ContentViolationCode,
  definitionId: string,
  message: string,
): ContentViolation {
  return deepFreeze({ code, definitionId, message });
}

function allCards(decks: readonly DeckConfiguration[]) {
  return decks.flatMap((configuration) => [
    ...configuration.monsterDeck,
    ...configuration.spellTrapDeck,
    ...configuration.extraDeck,
  ]);
}

export function validateMonsterCatalog(
  definitions: readonly MonsterDefinition[],
  decks: readonly DeckConfiguration[],
): MonsterCatalogValidation {
  const violations: ContentViolation[] = [];
  const byId = new Map<string, MonsterDefinition>();

  for (const definition of definitions) {
    if (byId.has(definition.definitionId)) {
      violations.push(
        violation(
          "duplicate_definition",
          definition.definitionId,
          `Monster definition ${definition.definitionId} appears more than once.`,
        ),
      );
      continue;
    }
    byId.set(definition.definitionId, definition);
    try {
      createMonsterState(
        definition,
        "content-validation-unit",
        "content-validation-card",
        "content-validation-player",
        { x: 0, y: 0 },
        "attack",
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown definition error.";
      violations.push(
        violation(
          "invalid_definition",
          definition.definitionId,
          `Monster definition ${definition.definitionId || "<empty>"} is invalid: ${reason}`,
        ),
      );
    }
  }

  const checkedCardIds = new Set<string>();
  for (const card of allCards(decks)) {
    if (!MONSTER_KINDS.has(card.kind) || checkedCardIds.has(card.definitionId)) continue;
    checkedCardIds.add(card.definitionId);
    const definition = byId.get(card.definitionId);
    if (definition === undefined) {
      violations.push(
        violation(
          "missing_definition",
          card.definitionId,
          `Monster card ${card.name} has no content definition.`,
        ),
      );
      continue;
    }
    if (card.kind !== expectedKind(definition)) {
      violations.push(
        violation(
          "type_mismatch",
          card.definitionId,
          `${card.name} is ${card.kind}, but its definition is ${definition.type}.`,
        ),
      );
    }
    if (card.name !== definition.name) {
      violations.push(
        violation(
          "name_mismatch",
          card.definitionId,
          `Card name ${card.name} does not match definition name ${definition.name}.`,
        ),
      );
    }
  }

  return deepFreeze({ valid: violations.length === 0, violations: deepFreeze(violations) });
}

export function computeContentHash(
  definitions: readonly MonsterDefinition[],
  ritualProcedures: readonly RitualProcedure[] = [],
): string {
  const sortedDefinitions = definitions
    .map((definition) => ({
      definitionId: definition.definitionId,
      name: definition.name,
      level: definition.level,
      type: definition.type,
      elements: [...definition.elements].sort(),
      races: [...definition.races].sort(),
      printedVis: definition.printedVis,
      printedSpd: definition.printedSpd,
      printedAtk: definition.printedAtk,
      printedDef: definition.printedDef,
      printedAttackRange: definition.printedAttackRange ?? 1,
      normalHasGrantedMpAbility: definition.normalHasGrantedMpAbility ?? false,
    }))
    .sort((left, right) =>
      left.definitionId < right.definitionId ? -1 : left.definitionId > right.definitionId ? 1 : 0,
    );

  const sortedProcedures = ritualProcedures
    .map((proc) => ({
      spellDefinitionId: proc.spellDefinitionId,
      compatibleRitualDefinitionIds: [...proc.compatibleRitualDefinitionIds].sort(),
    }))
    .sort((left, right) =>
      left.spellDefinitionId < right.spellDefinitionId
        ? -1
        : left.spellDefinitionId > right.spellDefinitionId
          ? 1
          : 0,
    );

  return hashCanonical({
    definitions: sortedDefinitions,
    ritualProcedures: sortedProcedures,
  });
}

export function createMonsterCatalog(
  definitions: readonly MonsterDefinition[],
  decks: readonly DeckConfiguration[],
  ritualProcedures: readonly RitualProcedure[] = [],
): MonsterCatalog {
  const validation = validateMonsterCatalog(definitions, decks);
  if (!validation.valid) throw new ContentInvariantError(validation.violations);
  const copied = definitions
    .map((definition) =>
      deepFreeze({
        ...definition,
        elements: deepFreeze([...definition.elements]),
        races: deepFreeze([...definition.races]),
      }),
    )
    .sort((left, right) =>
      left.definitionId < right.definitionId ? -1 : left.definitionId > right.definitionId ? 1 : 0,
    );
  const copiedProcedures = ritualProcedures
    .map((proc) =>
      deepFreeze({
        spellDefinitionId: proc.spellDefinitionId,
        compatibleRitualDefinitionIds: deepFreeze([...proc.compatibleRitualDefinitionIds]),
      }),
    )
    .sort((left, right) =>
      left.spellDefinitionId < right.spellDefinitionId
        ? -1
        : left.spellDefinitionId > right.spellDefinitionId
          ? 1
          : 0,
    );
  const contentHash = computeContentHash(copied, copiedProcedures);
  return deepFreeze({
    contentHash,
    definitions: deepFreeze(copied),
    ritualProcedures: deepFreeze(copiedProcedures),
  }) as MonsterCatalog;
}
