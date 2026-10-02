import type { CardInstance, PlayerCardState } from "./draw.ts";
import { deepFreeze } from "./freeze.ts";

export interface CardRemovalResult {
  readonly state: PlayerCardState;
  readonly card: CardInstance;
}

export class ZoneInvariantError extends Error {
  override readonly name = "ZoneInvariantError";
}

function allZoneCards(state: PlayerCardState): readonly CardInstance[] {
  return [
    ...state.monsterDeck,
    ...state.spellTrapDeck,
    ...state.extraDeck,
    ...state.hand,
    ...state.graveyard,
  ];
}

export function assertUniquePhysicalCards(state: PlayerCardState): void {
  const ids = new Set<string>();
  for (const card of allZoneCards(state)) {
    if (ids.has(card.instanceId)) {
      throw new ZoneInvariantError(`Physical card ${card.instanceId} exists in more than one zone.`);
    }
    ids.add(card.instanceId);
  }
}

export function removeCardFromHand(
  state: PlayerCardState,
  instanceId: string,
): CardRemovalResult {
  if (instanceId.trim().length === 0) throw new ZoneInvariantError("instanceId must not be empty.");
  assertUniquePhysicalCards(state);
  const index = state.hand.findIndex((card) => card.instanceId === instanceId);
  const card = state.hand[index];
  if (card === undefined) throw new ZoneInvariantError(`Card ${instanceId} is not in the hand.`);
  return deepFreeze({
    state: deepFreeze({
      ...state,
      hand: deepFreeze(state.hand.filter((_, cardIndex) => cardIndex !== index)),
    }) as PlayerCardState,
    card,
  }) as CardRemovalResult;
}

export function addCardToGraveyard(
  state: PlayerCardState,
  card: CardInstance,
): PlayerCardState {
  assertUniquePhysicalCards(state);
  if (allZoneCards(state).some((current) => current.instanceId === card.instanceId)) {
    throw new ZoneInvariantError(`Physical card ${card.instanceId} is already in a zone.`);
  }
  return deepFreeze({
    ...state,
    graveyard: deepFreeze([...state.graveyard, deepFreeze({ ...card })]),
  }) as PlayerCardState;
}

export function sendHandCardToGraveyard(
  state: PlayerCardState,
  instanceId: string,
): PlayerCardState {
  const removal = removeCardFromHand(state, instanceId);
  return addCardToGraveyard(removal.state, removal.card);
}

export function removeCardFromGraveyard(
  state: PlayerCardState,
  instanceId: string,
): CardRemovalResult {
  if (instanceId.trim().length === 0) throw new ZoneInvariantError("instanceId must not be empty.");
  assertUniquePhysicalCards(state);
  const index = state.graveyard.findIndex((card) => card.instanceId === instanceId);
  const card = state.graveyard[index];
  if (card === undefined) throw new ZoneInvariantError(`Card ${instanceId} is not in the graveyard.`);
  return deepFreeze({
    state: deepFreeze({
      ...state,
      graveyard: deepFreeze(state.graveyard.filter((_, cardIndex) => cardIndex !== index)),
    }) as PlayerCardState,
    card,
  }) as CardRemovalResult;
}

