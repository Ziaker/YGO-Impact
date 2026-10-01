import { deepFreeze } from "./freeze.ts";

export type ActivationProcedure = "resolve_immediately" | "resolve_directly" | "add_to_chain";

export interface ActivationContext {
  readonly hasEnemyTarget: boolean;
  readonly immediate: boolean;
  readonly isLegalReactionToOpenEnemyChain: boolean;
}

export interface ActivationRouting {
  readonly procedure: ActivationProcedure;
  readonly opensOrJoinsChain: boolean;
  readonly suppressesAdditionalEffects: boolean;
}

export class ActivationInvariantError extends Error {
  override readonly name = "ActivationInvariantError";
}

export function routeConfirmedActivation(context: ActivationContext): ActivationRouting {
  if (
    typeof context.hasEnemyTarget !== "boolean" ||
    typeof context.immediate !== "boolean" ||
    typeof context.isLegalReactionToOpenEnemyChain !== "boolean"
  ) {
    throw new ActivationInvariantError("Activation routing flags must be boolean.");
  }

  if (context.immediate) {
    return deepFreeze({
      procedure: "resolve_immediately" as const,
      opensOrJoinsChain: false,
      suppressesAdditionalEffects: true,
    });
  }
  if (context.hasEnemyTarget || context.isLegalReactionToOpenEnemyChain) {
    return deepFreeze({
      procedure: "add_to_chain" as const,
      opensOrJoinsChain: true,
      suppressesAdditionalEffects: false,
    });
  }
  return deepFreeze({
    procedure: "resolve_directly" as const,
    opensOrJoinsChain: false,
    suppressesAdditionalEffects: false,
  });
}
