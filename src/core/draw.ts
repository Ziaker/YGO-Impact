import { validateDeckConfiguration, type DeckCard, type DeckConfiguration } from "./deck.ts";
import { deepFreeze } from "./freeze.ts";
import { createRandomStream, drawUniformIndex, type RandomDrawLog } from "./random.ts";

export const INITIAL_HAND_SIZE = 7 as const;
export type DrawMode = "two_monsters" | "two_spell_traps" | "one_each";

export interface DrawSelection {
  readonly playerId: string;
  readonly mode: DrawMode;
}

export interface CardInstance extends DeckCard {
  readonly instanceId: string;
}

export interface PlayerCardState {
  readonly playerId: string;
  readonly monsterDeck: readonly CardInstance[];
  readonly spellTrapDeck: readonly CardInstance[];
  readonly extraDeck: readonly CardInstance[];
  readonly hand: readonly CardInstance[];
  readonly graveyard: readonly CardInstance[];
  readonly randomAudit: readonly RandomDrawLog[];
}

export interface DrawResult {
  readonly state: PlayerCardState;
  readonly drawn: readonly CardInstance[];
  readonly deckOut: boolean;
  readonly failedBeforeDrawing: boolean;
}

export class DrawInvariantError extends Error {
  override readonly name = "DrawInvariantError";
}

function instantiate(cards: readonly DeckCard[], playerId: string, zone: string): CardInstance[] {
  return cards.map((card, index) =>
    deepFreeze({ ...card, instanceId: `${playerId}:${zone}:${index}:${card.definitionId}` }),
  );
}

function shuffled(
  cards: readonly CardInstance[],
  seed: string,
  streamId: string,
): readonly [readonly CardInstance[], readonly RandomDrawLog[]] {
  const result = [...cards];
  let stream = createRandomStream(seed, streamId);
  const audit: RandomDrawLog[] = [];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = drawUniformIndex(stream, index + 1);
    stream = draw.stream;
    audit.push(draw.log);
    const selected = draw.log.result;
    const currentCard = result[index];
    const selectedCard = result[selected];
    if (currentCard === undefined || selectedCard === undefined) {
      throw new DrawInvariantError("Deterministic shuffle selected an invalid card index.");
    }
    result[index] = selectedCard;
    result[selected] = currentCard;
  }
  return [deepFreeze(result), deepFreeze(audit)];
}

export function initializePlayerCardState(
  configuration: DeckConfiguration,
  seed: string,
  playerId: string,
): PlayerCardState {
  const validation = validateDeckConfiguration(configuration);
  if (!validation.valid) {
    throw new DrawInvariantError(
      `Cannot initialize illegal Decks: ${validation.violations.map((entry) => entry.message).join(" | ")}`,
    );
  }
  if (playerId.trim().length === 0) throw new DrawInvariantError("playerId must not be empty.");

  const monster = shuffled(
    instantiate(configuration.monsterDeck, playerId, "monster"),
    seed,
    `shuffle:${playerId}:monster`,
  );
  const support = shuffled(
    instantiate(configuration.spellTrapDeck, playerId, "spell-trap"),
    seed,
    `shuffle:${playerId}:spell-trap`,
  );
  return deepFreeze({
    playerId,
    monsterDeck: monster[0],
    spellTrapDeck: support[0],
    extraDeck: deepFreeze(instantiate(configuration.extraDeck, playerId, "extra")),
    hand: deepFreeze([]),
    graveyard: deepFreeze([]),
    randomAudit: deepFreeze([...monster[1], ...support[1]]),
  }) as PlayerCardState;
}

function assertDrawCount(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DrawInvariantError(`${label} must be a non-negative safe integer.`);
  }
}

export function drawCards(
  state: PlayerCardState,
  monsterCount: number,
  spellTrapCount: number,
): DrawResult {
  assertDrawCount("monsterCount", monsterCount);
  assertDrawCount("spellTrapCount", spellTrapCount);
  if (monsterCount === 0 && spellTrapCount === 0) {
    throw new DrawInvariantError("A draw instruction must request at least one card.");
  }
  if (monsterCount > state.monsterDeck.length || spellTrapCount > state.spellTrapDeck.length) {
    return deepFreeze({
      state,
      drawn: deepFreeze([]),
      deckOut: true,
      failedBeforeDrawing: true,
    }) as DrawResult;
  }

  const drawn = deepFreeze([
    ...state.monsterDeck.slice(0, monsterCount),
    ...state.spellTrapDeck.slice(0, spellTrapCount),
  ]);
  const monsterDeck = deepFreeze(state.monsterDeck.slice(monsterCount));
  const spellTrapDeck = deepFreeze(state.spellTrapDeck.slice(spellTrapCount));
  const nextState = deepFreeze({
    ...state,
    monsterDeck,
    spellTrapDeck,
    hand: deepFreeze([...state.hand, ...drawn]),
  }) as PlayerCardState;

  return deepFreeze({
    state: nextState,
    drawn,
    deckOut: monsterDeck.length === 0 || spellTrapDeck.length === 0,
    failedBeforeDrawing: false,
  }) as DrawResult;
}

export function drawInitialHand(state: PlayerCardState, monsterCount: number): DrawResult {
  if (!Number.isSafeInteger(monsterCount) || monsterCount < 0 || monsterCount > INITIAL_HAND_SIZE) {
    throw new DrawInvariantError(`monsterCount must be from 0 to ${INITIAL_HAND_SIZE}.`);
  }
  return drawCards(state, monsterCount, INITIAL_HAND_SIZE - monsterCount);
}

export function drawForTurn(state: PlayerCardState, mode: DrawMode): DrawResult {
  switch (mode) {
    case "two_monsters":
      return drawCards(state, 2, 0);
    case "two_spell_traps":
      return drawCards(state, 0, 2);
    case "one_each":
      return drawCards(state, 1, 1);
    default:
      throw new DrawInvariantError(`Unknown draw mode ${String(mode)}.`);
  }
}
