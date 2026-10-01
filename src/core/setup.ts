import { hashCanonical } from "./canonical.ts";
import { validateDeckConfiguration, type DeckConfiguration } from "./deck.ts";
import {
  INITIAL_HAND_SIZE,
  drawInitialHand,
  initializePlayerCardState,
  type PlayerCardState,
} from "./draw.ts";
import { deepFreeze } from "./freeze.ts";
import type { JsonValue } from "./types.ts";

export interface PlayerSetupInput {
  readonly playerId: string;
  readonly decks: DeckConfiguration;
  readonly initialMonsterCount: number;
}

export type SetupViolationCode =
  | "player_count"
  | "invalid_player"
  | "duplicate_player"
  | "invalid_initial_hand_split"
  | "illegal_deck";

export interface SetupViolation {
  readonly code: SetupViolationCode;
  readonly playerId: string | null;
  readonly message: string;
}

export interface MatchSetupValidation {
  readonly valid: boolean;
  readonly violations: readonly SetupViolation[];
}

export interface MatchCardSetup {
  readonly seed: string;
  readonly players: readonly PlayerCardState[];
  readonly setupHash: string;
}

export class SetupInvariantError extends Error {
  override readonly name = "SetupInvariantError";
  readonly violations: readonly SetupViolation[];

  constructor(violations: readonly SetupViolation[]) {
    super(`Cannot initialize match: ${violations.map((entry) => entry.message).join(" | ")}`);
    this.violations = violations;
  }
}

function violation(
  code: SetupViolationCode,
  playerId: string | null,
  message: string,
): SetupViolation {
  return deepFreeze({ code, playerId, message });
}

export function validateMatchSetup(players: readonly PlayerSetupInput[]): MatchSetupValidation {
  const violations: SetupViolation[] = [];
  if (players.length !== 2) {
    violations.push(
      violation("player_count", null, "The first prototype requires exactly two players."),
    );
  }

  const seenPlayerIds = new Set<string>();
  for (const player of players) {
    const playerId = player.playerId.trim();
    if (playerId.length === 0) {
      violations.push(violation("invalid_player", null, "playerId must not be empty."));
    } else if (seenPlayerIds.has(playerId)) {
      violations.push(
        violation("duplicate_player", playerId, `Player ${playerId} appears more than once.`),
      );
    } else {
      seenPlayerIds.add(playerId);
    }

    if (
      !Number.isSafeInteger(player.initialMonsterCount) ||
      player.initialMonsterCount < 0 ||
      player.initialMonsterCount > INITIAL_HAND_SIZE
    ) {
      violations.push(
        violation(
          "invalid_initial_hand_split",
          playerId || null,
          `Initial Monster count must be from 0 to ${INITIAL_HAND_SIZE}.`,
        ),
      );
    }

    const deckValidation = validateDeckConfiguration(player.decks);
    for (const deckViolation of deckValidation.violations) {
      violations.push(
        violation(
          "illegal_deck",
          playerId || null,
          `${playerId || "Unnamed player"}: ${deckViolation.message}`,
        ),
      );
    }
  }

  return deepFreeze({ valid: violations.length === 0, violations: deepFreeze(violations) });
}

function hashableSetup(seed: string, players: readonly PlayerCardState[]): JsonValue {
  return {
    seed,
    players: players.map((player) => ({
      playerId: player.playerId,
      monsterDeck: player.monsterDeck.map((card) => ({ ...card })),
      spellTrapDeck: player.spellTrapDeck.map((card) => ({ ...card })),
      extraDeck: player.extraDeck.map((card) => ({ ...card })),
      hand: player.hand.map((card) => ({ ...card })),
      graveyard: player.graveyard.map((card) => ({ ...card })),
      randomAudit: player.randomAudit.map((entry) => ({ ...entry })),
    })),
  };
}

export function initializeMatchCardSetup(
  seed: string,
  players: readonly PlayerSetupInput[],
): MatchCardSetup {
  if (seed.length === 0) {
    throw new TypeError("seed must not be empty.");
  }
  const validation = validateMatchSetup(players);
  if (!validation.valid) {
    throw new SetupInvariantError(validation.violations);
  }

  const initialized = players.map((player) => {
    const shuffled = initializePlayerCardState(player.decks, seed, player.playerId.trim());
    return drawInitialHand(shuffled, player.initialMonsterCount).state;
  });
  return deepFreeze({
    seed,
    players: deepFreeze(initialized),
    setupHash: hashCanonical(hashableSetup(seed, initialized)),
  }) as MatchCardSetup;
}
