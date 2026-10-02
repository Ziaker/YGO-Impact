import { hashCanonical } from "./canonical.ts";
import type { CardKind, DeckConfiguration } from "./deck.ts";
import { deepFreeze } from "./freeze.ts";
import { createMonsterState, type MonsterDefinition } from "./monster.ts";
import type { RitualProcedure } from "./ritual.ts";
import type { FusionProcedure } from "./fusion.ts";
import type { SpellTrapDefinition } from "./spells-traps.ts";

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
  readonly fusionProcedures?: readonly FusionProcedure[];
  readonly spellTrapDefinitions?: readonly SpellTrapDefinition[];
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
  fusionProcedures: readonly FusionProcedure[] = [],
  spellTrapDefinitions: readonly SpellTrapDefinition[] = [],
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
      ...(definition.keywords && definition.keywords.length > 0
        ? { keywords: [...definition.keywords].sort() }
        : {}),
      ...(definition.description !== undefined ? { description: definition.description } : {}),
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

  const sortedFusionProcedures = fusionProcedures
    .map((proc) => ({
      spellDefinitionId: proc.spellDefinitionId,
      fusionDefinitionId: proc.fusionDefinitionId,
      materialDefinitionIds: [...proc.materialDefinitionIds].sort(),
    }))
    .sort((left, right) =>
      left.fusionDefinitionId < right.fusionDefinitionId
        ? -1
        : left.fusionDefinitionId > right.fusionDefinitionId
          ? 1
          : left.spellDefinitionId < right.spellDefinitionId
            ? -1
            : left.spellDefinitionId > right.spellDefinitionId
              ? 1
              : 0,
    );

  const sortedSpellTraps = spellTrapDefinitions
    .map((def) => ({
      definitionId: def.definitionId,
      name: def.name,
      kind: def.kind,
      subtype: def.subtype,
      description: def.description,
      actionCost: def.actionCost ?? null,
      reactionCost: def.reactionCost ?? null,
      targetsEnemy: def.targetsEnemy ?? false,
      isImmediate: def.isImmediate ?? false,
      effectKind: def.effectKind,
      statModifiers: def.statModifiers
        ? {
            atk: def.statModifiers.atk ?? 0,
            def: def.statModifiers.def ?? 0,
            spd: def.statModifiers.spd ?? 0,
            vis: def.statModifiers.vis ?? 0,
          }
        : null,
      value: def.value ?? null,
    }))
    .sort((left, right) =>
      left.definitionId < right.definitionId ? -1 : left.definitionId > right.definitionId ? 1 : 0,
    );

  const hashPayload: Record<string, unknown> = {
    definitions: sortedDefinitions,
    ritualProcedures: sortedProcedures,
  };
  if (sortedFusionProcedures.length > 0) {
    hashPayload.fusionProcedures = sortedFusionProcedures;
  }
  if (sortedSpellTraps.length > 0) {
    hashPayload.spellTrapDefinitions = sortedSpellTraps;
  }

  return hashCanonical(hashPayload as any);
}

export function createMonsterCatalog(
  definitions: readonly MonsterDefinition[],
  decks: readonly DeckConfiguration[],
  ritualProcedures: readonly RitualProcedure[] = [],
  fusionProcedures: readonly FusionProcedure[] = [],
  spellTrapDefinitions: readonly SpellTrapDefinition[] = [],
): MonsterCatalog {
  const validation = validateMonsterCatalog(definitions, decks);
  if (!validation.valid) throw new ContentInvariantError(validation.violations);
  const copied = definitions
    .map((definition) =>
      deepFreeze({
        ...definition,
        elements: deepFreeze([...definition.elements]),
        races: deepFreeze([...definition.races]),
        ...(definition.keywords !== undefined
          ? { keywords: deepFreeze([...definition.keywords]) }
          : {}),
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
  const copiedFusionProcedures = fusionProcedures
    .map((proc) =>
      deepFreeze({
        spellDefinitionId: proc.spellDefinitionId,
        fusionDefinitionId: proc.fusionDefinitionId,
        materialDefinitionIds: deepFreeze([...proc.materialDefinitionIds]),
      }),
    )
    .sort((left, right) =>
      left.fusionDefinitionId < right.fusionDefinitionId
        ? -1
        : left.fusionDefinitionId > right.fusionDefinitionId
          ? 1
          : left.spellDefinitionId < right.spellDefinitionId
            ? -1
            : left.spellDefinitionId > right.spellDefinitionId
              ? 1
              : 0,
    );
  const copiedSpellTraps = spellTrapDefinitions
    .map((def) =>
      deepFreeze({
        ...def,
        ...(def.statModifiers !== undefined
          ? { statModifiers: deepFreeze({ ...def.statModifiers }) }
          : {}),
      }),
    )
    .sort((left, right) =>
      left.definitionId < right.definitionId ? -1 : left.definitionId > right.definitionId ? 1 : 0,
    );
  const contentHash = computeContentHash(
    copied,
    copiedProcedures,
    copiedFusionProcedures,
    copiedSpellTraps,
  );
  return deepFreeze({
    contentHash,
    definitions: deepFreeze(copied),
    ritualProcedures: deepFreeze(copiedProcedures),
    fusionProcedures: deepFreeze(copiedFusionProcedures),
    spellTrapDefinitions: deepFreeze(copiedSpellTraps),
  }) as MonsterCatalog;
}

export const PROTOTYPE_NORMAL_MONSTERS: readonly MonsterDefinition[] = deepFreeze([
  // 1. Skull Servant (Lv 1, Zombie, DARK) — [REANIMATE 1]
  // Base: HP 1, MP 0, ATK 2, DEF 1, SPD 2, VIS 3, Range 1
  // Zombie bonus: HP+1, ATK+2 -> Final: 2/0/4/1/2/3/1
  {
    definitionId: "32274490",
    name: "Skull Servant",
    level: 1,
    type: "normal",
    elements: ["dark"],
    races: ["Zombie"],
    printedVis: 3,
    printedSpd: 2,
    printedAtk: 2,
    printedDef: 1,
    printedAttackRange: 1,
    keywords: ["REANIMATE 1"],
    description: "A skeletal ghost that isn't strong but can mean trouble in large numbers. [REANIMATE 1]",
  },
  // 2. Mokey Mokey (Lv 1, Fairy, LIGHT) — [OBSCURE]
  // Base: HP 1, MP 0, ATK 1, DEF 1, SPD 1, VIS 3, Range 1
  // Fairy bonus: MP+2, SPD+1 -> Final: 1/2/1/1/2/3/1
  {
    definitionId: "27288416",
    name: "Mokey Mokey",
    level: 1,
    type: "normal",
    elements: ["light"],
    races: ["Fairy"],
    printedVis: 3,
    printedSpd: 1,
    printedAtk: 1,
    printedDef: 1,
    printedAttackRange: 1,
    keywords: ["OBSCURE"],
    description: "An outcast angel. Nobody knows what he is thinking every day. Sometimes he gets mad, and that is a sight to behold. [OBSCURE]",
  },
  // 3. Silver Fang (Lv 3, Beast, EARTH) — [CHARGE 1]
  // Base: HP 3, MP 0, ATK 7, DEF 4, SPD 3, VIS 4, Range 1
  // Beast bonus: HP+1, SPD+1 -> Final: 4/0/7/4/4/4/1
  {
    definitionId: "90357090",
    name: "Silver Fang",
    level: 3,
    type: "normal",
    elements: ["earth"],
    races: ["Beast"],
    printedVis: 4,
    printedSpd: 3,
    printedAtk: 7,
    printedDef: 4,
    printedAttackRange: 1,
    keywords: ["CHARGE 1"],
    description: "A snow wolf that's beautiful to the eye, but a terrible predator in battle. [CHARGE 1]",
  },
  // 4. Claw Reacher (Lv 3, Fiend, DARK) — [BLAST 1]
  // Base: HP 3, MP 0, ATK 5, DEF 4, SPD 2, VIS 3, Range 1
  // Fiend bonus: ATK+1, SPD+1 -> Final: 3/0/6/4/3/3/1
  {
    definitionId: "41218256",
    name: "Claw Reacher",
    level: 3,
    type: "normal",
    elements: ["dark"],
    races: ["Fiend"],
    printedVis: 3,
    printedSpd: 2,
    printedAtk: 5,
    printedDef: 4,
    printedAttackRange: 1,
    keywords: ["BLAST 1"],
    description: "Stretches its arms to tear opponents to shreds. [BLAST 1]",
  },
  // 5. Chosen by the World Chalice (Lv 3, Psychic, LIGHT) — [SIGHT 2, PSYBLAST 1]
  // Base: HP 3, MP 0, ATK 9, DEF 1, SPD 3, VIS 4, Range 1
  // Psychic bonus: MP+2, VIS+2 -> Final: 3/2/9/1/3/6/1
  {
    definitionId: "22916281",
    name: "Chosen by the World Chalice",
    level: 3,
    type: "normal",
    elements: ["light"],
    races: ["Psychic"],
    printedVis: 4,
    printedSpd: 3,
    printedAtk: 9,
    printedDef: 1,
    printedAttackRange: 1,
    keywords: ["SIGHT 2", "PSYBLAST 1"],
    description: "Inspired by the legends of the World Legacy, this young fighter adds armor parts to himself every day. [SIGHT 2] [PSYBLAST 1]",
  },
  // 6. Gemini Elf (Lv 4, Spellcaster, EARTH) — Vanilla
  // Base: HP 4, MP 0, ATK 11, DEF 5, SPD 3, VIS 4, Range 1
  // Spellcaster bonus: MP+3 -> Final: 4/3/11/5/3/4/1
  {
    definitionId: "69140098",
    name: "Gemini Elf",
    level: 4,
    type: "normal",
    elements: ["earth"],
    races: ["Spellcaster"],
    printedVis: 4,
    printedSpd: 3,
    printedAtk: 11,
    printedDef: 5,
    printedAttackRange: 1,
    description: "Elf twins that alternate their attacks in perfect harmony.",
  },
  // 7. Luster Dragon (Lv 4, Dragon, WIND) — [BULWARK, REGEN 1]
  // Base: HP 4, MP 0, ATK 11, DEF 8, SPD 2, VIS 4, Range 1
  // Dragon bonus: HP+1, DEF+1 -> Final: 5/0/11/9/2/4/1
  {
    definitionId: "11091375",
    name: "Luster Dragon",
    level: 4,
    type: "normal",
    elements: ["wind"],
    races: ["Dragon"],
    printedVis: 4,
    printedSpd: 2,
    printedAtk: 11,
    printedDef: 8,
    printedAttackRange: 1,
    keywords: ["BULWARK", "REGEN 1"],
    description: "A very beautiful dragon covered with sapphire. It does not like fights, but has incredibly high attack power. [BULWARK] [REGEN 1]",
  },
  // 8. Mechanicalchaser (Lv 4, Machine, DARK) — Vanilla
  // Base: HP 4, MP 0, ATK 10, DEF 4, SPD 3, VIS 3, Range 1
  // Machine bonus: DEF+2 -> Final: 4/0/10/6/3/3/1
  {
    definitionId: "7359741",
    name: "Mechanicalchaser",
    level: 4,
    type: "normal",
    elements: ["dark"],
    races: ["Machine"],
    printedVis: 3,
    printedSpd: 3,
    printedAtk: 10,
    printedDef: 4,
    printedAttackRange: 1,
    description: "A hunter that tracks its targets relentlessly with high-precision mechanics.",
  },
  // 9. Blue-Winged Crown (Lv 4, Winged Beast, WIND) — [GLIDER]
  // Base: HP 4, MP 0, ATK 8, DEF 6, SPD 3, VIS 4, Range 1
  // Winged Beast bonus: VIS+2, SPD+1 -> Final: 4/0/8/6/4/6/1
  {
    definitionId: "41396436",
    name: "Blue-Winged Crown",
    level: 4,
    type: "normal",
    elements: ["wind"],
    races: ["Winged Beast"],
    printedVis: 4,
    printedSpd: 3,
    printedAtk: 8,
    printedDef: 6,
    printedAttackRange: 1,
    keywords: ["GLIDER"],
    description: "With hair that blazes like a crown, this bird soars across the sky. [GLIDER]",
  },
  // 10. Labyrinth Wall (Lv 5, Rock, EARTH) — Vanilla
  // Base: HP 5, MP 0, ATK 0, DEF 16, SPD 1, VIS 2, Range 1
  // Rock bonus: HP+1, DEF+2 -> Final: 6/0/0/18/1/2/1
  {
    definitionId: "67284908",
    name: "Labyrinth Wall",
    level: 5,
    type: "normal",
    elements: ["earth"],
    races: ["Rock"],
    printedVis: 2,
    printedSpd: 1,
    printedAtk: 0,
    printedDef: 16,
    printedAttackRange: 1,
    description: "These walls form a labyrinth with no exit for enemies.",
  },
  // 11. Millennium Shield (Lv 5, Warrior, EARTH) — Vanilla
  // Base: HP 5, MP 0, ATK 1, DEF 16, SPD 2, VIS 3, Range 1
  // Warrior bonus: HP+1, ATK+1, DEF+1 -> Final: 6/0/2/17/2/3/1
  {
    definitionId: "32012841",
    name: "Millennium Shield",
    level: 5,
    type: "normal",
    elements: ["earth"],
    races: ["Warrior"],
    printedVis: 3,
    printedSpd: 2,
    printedAtk: 1,
    printedDef: 16,
    printedAttackRange: 1,
    description: "A legendary shield said to hold tremendous power and withstand almost any blow.",
  },
  // 12. Luster Dragon #2 (Lv 6, Dragon, WIND) — [INTIMIDATE 1]
  // Base: HP 6, MP 0, ATK 15, DEF 9, SPD 3, VIS 4, Range 1
  // Dragon bonus: HP+1, DEF+1 -> Final: 7/0/15/10/3/4/1
  {
    definitionId: "17658803",
    name: "Luster Dragon #2",
    level: 6,
    type: "normal",
    elements: ["wind"],
    races: ["Dragon"],
    printedVis: 4,
    printedSpd: 3,
    printedAtk: 15,
    printedDef: 9,
    printedAttackRange: 1,
    keywords: ["INTIMIDATE 1"],
    description: "A dragon that glistens emerald green. Its immense presence and hard ruby breath intimidate foes. [INTIMIDATE 1]",
  },
  // 13. Terrorking Salmon (Lv 5, Fish, WATER) — [REPULSE 1]
  // Base: HP 5, MP 0, ATK 14, DEF 5, SPD 2, VIS 3, Range 1
  // Fish bonus: SPD+2 -> Final: 5/0/14/5/4/3/1
  {
    definitionId: "78060096",
    name: "Terrorking Salmon",
    level: 5,
    type: "normal",
    elements: ["water"],
    races: ["Fish"],
    printedVis: 3,
    printedSpd: 2,
    printedAtk: 14,
    printedDef: 5,
    printedAttackRange: 1,
    keywords: ["REPULSE 1"],
    description: "A feared salmon, master of the Sea of Darkness. Its roe is the best delicacy in the World of Darkness. [REPULSE 1]",
  },
  // 14. Giant Turtle Who Feeds on Flames (Lv 5, Aqua, WATER) — Vanilla
  // Base: HP 5, MP 0, ATK 7, DEF 10, SPD 1, VIS 3, Range 1
  // Aqua bonus: MP+3 -> Final: 5/3/7/10/1/3/1
  {
    definitionId: "96981563",
    name: "Giant Turtle Who Feeds on Flames",
    level: 5,
    type: "normal",
    elements: ["water"],
    races: ["Aqua"],
    printedVis: 3,
    printedSpd: 1,
    printedAtk: 7,
    printedDef: 10,
    printedAttackRange: 1,
    description: "A giant tortoise that consumes fire, boasting heavy shell protection.",
  },
  // 15. Hercules Beetle (Lv 5, Insect, EARTH) — Vanilla
  // Base: HP 5, MP 0, ATK 8, DEF 11, SPD 1, VIS 3, Range 1
  // Insect bonus: SPD+3 -> Final: 5/0/8/11/4/3/1
  {
    definitionId: "52584282",
    name: "Hercules Beetle",
    level: 5,
    type: "normal",
    elements: ["earth"],
    races: ["Insect"],
    printedVis: 3,
    printedSpd: 1,
    printedAtk: 8,
    printedDef: 11,
    printedAttackRange: 1,
    description: "A massive beetle with a thick exoskeleton and swift skittering movements.",
  },
  // 16. Trent (Lv 5, Plant, EARTH) — Vanilla
  // Base: HP 5, MP 0, ATK 8, DEF 10, SPD 1, VIS 3, Range 1
  // Plant bonus: HP+2 -> Final: 7/0/8/10/1/3/1
  {
    definitionId: "78780140",
    name: "Trent",
    level: 5,
    type: "normal",
    elements: ["earth"],
    races: ["Plant"],
    printedVis: 3,
    printedSpd: 1,
    printedAtk: 8,
    printedDef: 10,
    printedAttackRange: 1,
    description: "A towering tree guardian of the ancient forest, possessing immense vitality.",
  },
  // 17. Flame Champion (Lv 5, Pyro, FIRE) — [BERSERKER 2]
  // Base: HP 5, MP 0, ATK 8, DEF 7, SPD 3, VIS 3, Range 1
  // Pyro bonus: ATK+3 -> Final: 5/0/11/7/3/3/1
  {
    definitionId: "42599677",
    name: "Flame Champion",
    level: 5,
    type: "normal",
    elements: ["fire"],
    races: ["Pyro"],
    printedVis: 3,
    printedSpd: 3,
    printedAtk: 8,
    printedDef: 7,
    printedAttackRange: 1,
    keywords: ["BERSERKER 2"],
    description: "A warrior clad in raging fire who fights with relentless burning passion. [BERSERKER 2]",
  },
  // 18. Bolt Escargot (Lv 5, Thunder, WATER) — Vanilla
  // Base: HP 5, MP 0, ATK 7, DEF 8, SPD 1, VIS 3, Range 1
  // Thunder bonus: SPD+3 -> Final: 5/0/7/8/4/3/1
  {
    definitionId: "12146024",
    name: "Bolt Escargot",
    level: 5,
    type: "normal",
    elements: ["water"],
    races: ["Thunder"],
    printedVis: 3,
    printedSpd: 1,
    printedAtk: 7,
    printedDef: 8,
    printedAttackRange: 1,
    description: "An aquatic snail that discharges high-voltage electric shocks.",
  },
  // 19. Judge Man (Lv 6, Warrior, EARTH) — Vanilla
  // Base: HP 6, MP 0, ATK 12, DEF 8, SPD 3, VIS 4, Range 1
  // Warrior bonus: HP+1, ATK+1, DEF+1 -> Final: 7/0/13/9/3/4/1
  {
    definitionId: "30113682",
    name: "Judge Man",
    level: 6,
    type: "normal",
    elements: ["earth"],
    races: ["Warrior"],
    printedVis: 4,
    printedSpd: 3,
    printedAtk: 12,
    printedDef: 8,
    printedAttackRange: 1,
    description: "This club-wielding warrior relentlessly executes judgment on any offender.",
  },
  // 20. Millennium Golem (Lv 6, Rock, EARTH) — Vanilla
  // Base: HP 6, MP 0, ATK 11, DEF 12, SPD 2, VIS 3, Range 1
  // Rock bonus: HP+1, DEF+2 -> Final: 7/0/11/14/2/3/1
  {
    definitionId: "47986555",
    name: "Millennium Golem",
    level: 6,
    type: "normal",
    elements: ["earth"],
    races: ["Rock"],
    printedVis: 3,
    printedSpd: 2,
    printedAtk: 11,
    printedDef: 12,
    printedAttackRange: 1,
    description: "An ancient golem that has guarded treasures for nearly a millennium.",
  },
]);
