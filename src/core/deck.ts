import { deepFreeze } from "./freeze.ts";

export const MONSTER_DECK_MIN = 20 as const;
export const MONSTER_DECK_MAX = 30 as const;
export const NORMAL_MONSTER_MIN = 8 as const;
export const SPELL_TRAP_DECK_MIN = 15 as const;
export const SPELL_TRAP_DECK_MAX = 30 as const;
export const EXTRA_DECK_MAX = 10 as const;
export const MAX_COPIES_PER_NAME = 3 as const;

export type CardKind =
  | "normal_monster"
  | "effect_monster"
  | "spell"
  | "trap"
  | "ritual_monster"
  | "fusion_monster";

export interface DeckCard {
  readonly definitionId: string;
  readonly name: string;
  readonly kind: CardKind;
}

export interface DeckConfiguration {
  readonly monsterDeck: readonly DeckCard[];
  readonly spellTrapDeck: readonly DeckCard[];
  readonly extraDeck: readonly DeckCard[];
}

export type DeckViolationCode =
  | "monster_deck_size"
  | "normal_monster_minimum"
  | "spell_trap_deck_size"
  | "extra_deck_size"
  | "wrong_deck"
  | "copy_limit"
  | "invalid_card";

export interface DeckViolation {
  readonly code: DeckViolationCode;
  readonly message: string;
}

export interface DeckValidationResult {
  readonly valid: boolean;
  readonly violations: readonly DeckViolation[];
}

function violation(code: DeckViolationCode, message: string): DeckViolation {
  return deepFreeze({ code, message });
}

function isCardKind(value: string): value is CardKind {
  return (
    value === "normal_monster" ||
    value === "effect_monster" ||
    value === "spell" ||
    value === "trap" ||
    value === "ritual_monster" ||
    value === "fusion_monster"
  );
}

export function validateDeckConfiguration(configuration: DeckConfiguration): DeckValidationResult {
  const violations: DeckViolation[] = [];
  if (
    configuration.monsterDeck.length < MONSTER_DECK_MIN ||
    configuration.monsterDeck.length > MONSTER_DECK_MAX
  ) {
    violations.push(
      violation(
        "monster_deck_size",
        `Monster Deck must contain ${MONSTER_DECK_MIN} to ${MONSTER_DECK_MAX} cards.`,
      ),
    );
  }
  const normalCount = configuration.monsterDeck.filter(
    (card) => card.kind === "normal_monster",
  ).length;
  if (normalCount < NORMAL_MONSTER_MIN) {
    violations.push(
      violation(
        "normal_monster_minimum",
        `Monster Deck must contain at least ${NORMAL_MONSTER_MIN} Normal Monsters.`,
      ),
    );
  }
  if (
    configuration.spellTrapDeck.length < SPELL_TRAP_DECK_MIN ||
    configuration.spellTrapDeck.length > SPELL_TRAP_DECK_MAX
  ) {
    violations.push(
      violation(
        "spell_trap_deck_size",
        `Spell/Trap Deck must contain ${SPELL_TRAP_DECK_MIN} to ${SPELL_TRAP_DECK_MAX} cards.`,
      ),
    );
  }
  if (configuration.extraDeck.length > EXTRA_DECK_MAX) {
    violations.push(
      violation("extra_deck_size", `Extra Deck must contain 0 to ${EXTRA_DECK_MAX} cards.`),
    );
  }

  const decks = [
    {
      label: "Monster Deck",
      cards: configuration.monsterDeck,
      allowed: new Set<CardKind>(["normal_monster", "effect_monster"]),
    },
    {
      label: "Spell/Trap Deck",
      cards: configuration.spellTrapDeck,
      allowed: new Set<CardKind>(["spell", "trap"]),
    },
    {
      label: "Extra Deck",
      cards: configuration.extraDeck,
      allowed: new Set<CardKind>(["ritual_monster", "fusion_monster"]),
    },
  ] as const;
  const copiesByName = new Map<string, number>();

  for (const deck of decks) {
    for (const card of deck.cards) {
      if (
        card.definitionId.trim().length === 0 ||
        card.name.trim().length === 0 ||
        !isCardKind(card.kind)
      ) {
        violations.push(
          violation("invalid_card", `${deck.label} contains a card with invalid identifying data.`),
        );
        continue;
      }
      if (!deck.allowed.has(card.kind)) {
        violations.push(
          violation("wrong_deck", `${card.name} (${card.kind}) cannot be placed in ${deck.label}.`),
        );
      }
      copiesByName.set(card.name, (copiesByName.get(card.name) ?? 0) + 1);
    }
  }

  for (const [name, count] of copiesByName) {
    if (count > MAX_COPIES_PER_NAME) {
      violations.push(
        violation(
          "copy_limit",
          `${name} has ${count} copies across all Decks; maximum is ${MAX_COPIES_PER_NAME}.`,
        ),
      );
    }
  }

  return deepFreeze({ valid: violations.length === 0, violations: deepFreeze(violations) });
}
