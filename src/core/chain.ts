import { deepFreeze } from "./freeze.ts";

export const CROSS_CHAIN_ADDITION_LIMIT = 3 as const;
export type ChainKind = "normal" | "cross";
export type ChainElementKind = "action" | "reaction" | "trigger";
export type ChainElementOutcomeStatus = "resolved" | "failed" | "negated";

export interface ChainElement {
  readonly elementId: string;
  readonly controllerId: string;
  readonly kind: ChainElementKind;
  readonly targetIds: readonly string[];
  readonly requiresAllTargets: boolean;
  readonly negated: boolean;
}

export interface PendingChain {
  readonly chainId: string;
  readonly registrationSequence: number;
  readonly kind: ChainKind;
  readonly elements: readonly ChainElement[];
}

export interface ChainSystem {
  readonly nextRegistrationSequence: number;
  readonly pendingChains: readonly PendingChain[];
}

export type ChainWindowStage = "reaction" | "initiator_addition" | "closed";

export interface ChainWindow {
  readonly chainId: string;
  readonly initiatorPlayerId: string;
  readonly priorityPlayerId: string;
  readonly stage: ChainWindowStage;
}

export interface ChainElementOutcome {
  readonly chainId: string;
  readonly elementId: string;
  readonly status: ChainElementOutcomeStatus;
  readonly validTargetIds: readonly string[];
  readonly invalidTargetIds: readonly string[];
}

export interface ChainResolutionResult<TState> {
  readonly system: ChainSystem;
  readonly state: TState;
  readonly outcomes: readonly ChainElementOutcome[];
}

export interface ChainResolutionHooks<TState> {
  readonly isTargetValid: (
    state: TState,
    targetId: string,
    element: ChainElement,
  ) => boolean;
  readonly applyElement: (
    state: TState,
    element: ChainElement,
    validTargetIds: readonly string[],
  ) => TState;
}

export class ChainInvariantError extends Error {
  override readonly name = "ChainInvariantError";
}

export function createChainSystem(): ChainSystem {
  return deepFreeze({ nextRegistrationSequence: 0, pendingChains: deepFreeze([]) });
}

export function openChainWindow(
  chainId: string,
  initiatorPlayerId: string,
  opponentPlayerId: string,
): ChainWindow {
  assertNonEmpty("chainId", chainId);
  assertNonEmpty("initiatorPlayerId", initiatorPlayerId);
  assertNonEmpty("opponentPlayerId", opponentPlayerId);
  if (initiatorPlayerId === opponentPlayerId) {
    throw new ChainInvariantError("A Chain window requires two different players.");
  }
  return deepFreeze({
    chainId,
    initiatorPlayerId,
    priorityPlayerId: opponentPlayerId,
    stage: "reaction" as const,
  });
}

export function passChainPriority(window: ChainWindow, playerId: string): ChainWindow {
  if (window.stage === "closed") {
    throw new ChainInvariantError(`Chain window ${window.chainId} is already closed.`);
  }
  if (window.priorityPlayerId !== playerId) {
    throw new ChainInvariantError(`Player ${playerId} does not have priority in ${window.chainId}.`);
  }
  if (window.stage === "reaction") {
    return deepFreeze({
      ...window,
      priorityPlayerId: window.initiatorPlayerId,
      stage: "initiator_addition" as const,
    });
  }
  return deepFreeze({ ...window, stage: "closed" as const });
}

export function confirmChainResponse(
  window: ChainWindow,
  playerId: string,
  otherPlayerId: string,
): ChainWindow {
  if (window.stage === "closed") {
    throw new ChainInvariantError(`Chain window ${window.chainId} is already closed.`);
  }
  if (window.priorityPlayerId !== playerId) {
    throw new ChainInvariantError(`Player ${playerId} does not have priority in ${window.chainId}.`);
  }
  if (playerId === otherPlayerId) {
    throw new ChainInvariantError("A confirmed response must pass priority to the other player.");
  }
  return deepFreeze({
    ...window,
    priorityPlayerId: otherPlayerId,
    stage: otherPlayerId === window.initiatorPlayerId
      ? ("initiator_addition" as const)
      : ("reaction" as const),
  });
}

function assertNonEmpty(label: string, value: string): void {
  if (value.trim().length === 0) throw new ChainInvariantError(`${label} must not be empty.`);
}

function freezeElement(element: ChainElement): ChainElement {
  assertNonEmpty("elementId", element.elementId);
  assertNonEmpty("controllerId", element.controllerId);
  if (element.kind !== "action" && element.kind !== "reaction" && element.kind !== "trigger") {
    throw new ChainInvariantError(`Unknown Chain element kind ${String(element.kind)}.`);
  }
  if (typeof element.requiresAllTargets !== "boolean" || typeof element.negated !== "boolean") {
    throw new ChainInvariantError("Chain element flags must be boolean.");
  }
  const targetIds = element.targetIds.map((targetId) => {
    assertNonEmpty("targetId", targetId);
    return targetId;
  });
  if (new Set(targetIds).size !== targetIds.length) {
    throw new ChainInvariantError(`Element ${element.elementId} contains a duplicate target.`);
  }
  return deepFreeze({ ...element, targetIds: deepFreeze(targetIds) });
}

function hasElementId(system: ChainSystem, elementId: string): boolean {
  return system.pendingChains.some((chain) =>
    chain.elements.some((element) => element.elementId === elementId),
  );
}

export function openChain(
  system: ChainSystem,
  chainId: string,
  kind: ChainKind,
  initialElement: ChainElement,
): ChainSystem {
  assertNonEmpty("chainId", chainId);
  if (kind !== "normal" && kind !== "cross") {
    throw new ChainInvariantError(`Unknown Chain kind ${String(kind)}.`);
  }
  if (system.pendingChains.some((chain) => chain.chainId === chainId)) {
    throw new ChainInvariantError(`Chain id ${chainId} already exists.`);
  }
  if (hasElementId(system, initialElement.elementId)) {
    throw new ChainInvariantError(`Element id ${initialElement.elementId} already exists.`);
  }
  const chain = deepFreeze({
    chainId,
    registrationSequence: system.nextRegistrationSequence,
    kind,
    elements: deepFreeze([freezeElement(initialElement)]),
  });
  return deepFreeze({
    nextRegistrationSequence: system.nextRegistrationSequence + 1,
    pendingChains: deepFreeze([...system.pendingChains, chain]),
  }) as ChainSystem;
}

export function addChainElement(
  system: ChainSystem,
  chainId: string,
  element: ChainElement,
): ChainSystem {
  if (hasElementId(system, element.elementId)) {
    throw new ChainInvariantError(`Element id ${element.elementId} already exists.`);
  }
  const chainIndex = system.pendingChains.findIndex((chain) => chain.chainId === chainId);
  const chain = system.pendingChains[chainIndex];
  if (chain === undefined) throw new ChainInvariantError(`Unknown Chain ${chainId}.`);
  if (chain.kind === "cross" && chain.elements.length - 1 >= CROSS_CHAIN_ADDITION_LIMIT) {
    throw new ChainInvariantError(
      `Cross Chain ${chainId} already has its ${CROSS_CHAIN_ADDITION_LIMIT} allowed additions.`,
    );
  }

  const updated = deepFreeze({
    ...chain,
    elements: deepFreeze([...chain.elements, freezeElement(element)]),
  });
  return deepFreeze({
    ...system,
    pendingChains: deepFreeze(
      system.pendingChains.map((current, index) => (index === chainIndex ? updated : current)),
    ),
  }) as ChainSystem;
}

export function negateChainElement(
  system: ChainSystem,
  chainId: string,
  elementId: string,
): ChainSystem {
  const chainIndex = system.pendingChains.findIndex((chain) => chain.chainId === chainId);
  const chain = system.pendingChains[chainIndex];
  if (chain === undefined) throw new ChainInvariantError(`Unknown Chain ${chainId}.`);
  const elementIndex = chain.elements.findIndex((element) => element.elementId === elementId);
  if (elementIndex < 0) throw new ChainInvariantError(`Unknown element ${elementId}.`);
  const elements = chain.elements.map((element, index) =>
    index === elementIndex ? deepFreeze({ ...element, negated: true }) : element,
  );
  const updated = deepFreeze({ ...chain, elements: deepFreeze(elements) });
  return deepFreeze({
    ...system,
    pendingChains: deepFreeze(
      system.pendingChains.map((current, index) => (index === chainIndex ? updated : current)),
    ),
  }) as ChainSystem;
}

export function resolveNextChain<TState>(
  system: ChainSystem,
  initialState: TState,
  hooks: ChainResolutionHooks<TState>,
): ChainResolutionResult<TState> {
  const chain = [...system.pendingChains].sort(
    (left, right) => left.registrationSequence - right.registrationSequence,
  )[0];
  if (chain === undefined) throw new ChainInvariantError("There is no pending Chain to resolve.");

  let state = initialState;
  const outcomes: ChainElementOutcome[] = [];
  for (const element of [...chain.elements].reverse()) {
    const validTargetIds = element.targetIds.filter((targetId) =>
      hooks.isTargetValid(state, targetId, element),
    );
    const invalidTargetIds = element.targetIds.filter(
      (targetId) => !validTargetIds.includes(targetId),
    );
    let status: ChainElementOutcomeStatus;
    if (element.negated) {
      status = "negated";
    } else if (
      (element.targetIds.length > 0 && validTargetIds.length === 0) ||
      (element.requiresAllTargets && invalidTargetIds.length > 0)
    ) {
      status = "failed";
    } else {
      status = "resolved";
      state = hooks.applyElement(state, element, deepFreeze(validTargetIds));
    }
    outcomes.push(
      deepFreeze({
        chainId: chain.chainId,
        elementId: element.elementId,
        status,
        validTargetIds: deepFreeze(validTargetIds),
        invalidTargetIds: deepFreeze(invalidTargetIds),
      }),
    );
  }

  return deepFreeze({
    system: deepFreeze({
      ...system,
      pendingChains: deepFreeze(
        system.pendingChains.filter((current) => current.chainId !== chain.chainId),
      ),
    }) as ChainSystem,
    state,
    outcomes: deepFreeze(outcomes),
  }) as ChainResolutionResult<TState>;
}
