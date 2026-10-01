import { deepFreeze } from "./freeze.ts";

const UINT32_RANGE = 0x1_0000_0000;

export interface RandomStream {
  readonly algorithm: "mulberry32-v1";
  readonly streamId: string;
  readonly state: number;
  readonly position: number;
}

export interface RandomDrawLog {
  readonly streamId: string;
  readonly position: number;
  readonly rawResult: number;
  readonly upperExclusive: number;
  readonly result: number;
}

export interface RandomDrawResult {
  readonly stream: RandomStream;
  readonly log: RandomDrawLog;
}

export class RandomInvariantError extends Error {
  override readonly name = "RandomInvariantError";
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) throw new RandomInvariantError(`${label} must not be empty.`);
}

function hashSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRandomStream(seed: string, streamId: string): RandomStream {
  assertNonEmpty("seed", seed);
  assertNonEmpty("streamId", streamId);
  return deepFreeze({
    algorithm: "mulberry32-v1" as const,
    streamId,
    state: hashSeed(`${seed}\u0000${streamId}`),
    position: 0,
  });
}

function nextUint32(stream: RandomStream): readonly [RandomStream, number] {
  const state = (stream.state + 0x6d2b79f5) >>> 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const result = (value ^ (value >>> 14)) >>> 0;
  return [
    deepFreeze({ ...stream, state, position: stream.position + 1 }),
    result,
  ];
}

export function drawUniformIndex(stream: RandomStream, upperExclusive: number): RandomDrawResult {
  if (
    !Number.isSafeInteger(upperExclusive) ||
    upperExclusive <= 0 ||
    upperExclusive > UINT32_RANGE
  ) {
    throw new RandomInvariantError(`upperExclusive must be an integer from 1 to ${UINT32_RANGE}.`);
  }

  const acceptanceLimit = Math.floor(UINT32_RANGE / upperExclusive) * upperExclusive;
  let nextStream = stream;
  let rawResult: number;
  do {
    [nextStream, rawResult] = nextUint32(nextStream);
  } while (rawResult >= acceptanceLimit);

  const result = rawResult % upperExclusive;
  return deepFreeze({
    stream: nextStream,
    log: deepFreeze({
      streamId: stream.streamId,
      position: nextStream.position,
      rawResult,
      upperExclusive,
      result,
    }),
  }) as RandomDrawResult;
}
