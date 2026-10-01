import type { CardInstance, PlayerCardState } from "./draw.ts";
import { deepFreeze } from "./freeze.ts";

export interface PlayerCardView {
  readonly playerId: string;
  readonly handCount: number;
  readonly visibleHand: readonly CardInstance[] | null;
  readonly monsterDeckCount: number;
  readonly spellTrapDeckCount: number;
  readonly extraDeckCount: number;
  readonly visibleExtraDeck: readonly CardInstance[] | null;
  readonly graveyard: readonly CardInstance[];
}

export interface MatchCardView {
  readonly viewerPlayerId: string;
  readonly players: readonly PlayerCardView[];
}

export class InformationInvariantError extends Error {
  override readonly name = "InformationInvariantError";
}

function copyCards(cards: readonly CardInstance[]): readonly CardInstance[] {
  return deepFreeze(cards.map((card) => deepFreeze({ ...card })));
}

export function createMatchCardView(
  states: readonly PlayerCardState[],
  viewerPlayerId: string,
): MatchCardView {
  if (!states.some((state) => state.playerId === viewerPlayerId)) {
    throw new InformationInvariantError(`Unknown viewer ${viewerPlayerId}.`);
  }
  return deepFreeze({
    viewerPlayerId,
    players: deepFreeze(
      states.map((state) => {
        const own = state.playerId === viewerPlayerId;
        return deepFreeze({
          playerId: state.playerId,
          handCount: state.hand.length,
          visibleHand: own ? copyCards(state.hand) : null,
          monsterDeckCount: state.monsterDeck.length,
          spellTrapDeckCount: state.spellTrapDeck.length,
          extraDeckCount: state.extraDeck.length,
          visibleExtraDeck: own ? copyCards(state.extraDeck) : null,
          graveyard: copyCards(state.graveyard),
        });
      }),
    ),
  }) as MatchCardView;
}
