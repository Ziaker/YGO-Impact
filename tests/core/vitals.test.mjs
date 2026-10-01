import assert from "node:assert/strict";
import test from "node:test";

import {
  VitalInvariantError,
  applyDamage,
  calculateBaseMaximumHp,
  calculateBaseMaximumMp,
  createVitalPool,
  increaseVitalMaximumAndCurrent,
  loseVital,
  payVitalCost,
  recoverVital,
  setVitalMaximum,
} from "../../src/core/index.ts";

test("base HP follows prototype monster type and level", () => {
  assert.equal(calculateBaseMaximumHp(8, "normal"), 8);
  assert.equal(calculateBaseMaximumHp(8, "effect"), 8);
  assert.equal(calculateBaseMaximumHp(8, "ritual"), 12);
  assert.equal(calculateBaseMaximumHp(7, "fusion"), 10);
});

test("base MP follows the formula and Normal exception", () => {
  assert.equal(calculateBaseMaximumMp(1, "effect"), 2);
  assert.equal(calculateBaseMaximumMp(4, "effect"), 4);
  assert.equal(calculateBaseMaximumMp(8, "effect"), 6);
  assert.equal(calculateBaseMaximumMp(8, "normal"), 0);
  assert.equal(calculateBaseMaximumMp(8, "normal", true), 6);
  assert.equal(calculateBaseMaximumMp(8, "ritual"), 8);
  assert.equal(calculateBaseMaximumMp(7, "fusion"), 6);
});

test("damage and HP loss share floor zero but retain distinct causes", () => {
  const pool = createVitalPool(10, 3);
  const damaged = applyDamage(pool, 8);
  const lost = loseVital(pool, 8);

  assert.deepEqual(damaged.pool, { current: 0, maximum: 10 });
  assert.deepEqual(lost.pool, { current: 0, maximum: 10 });
  assert.equal(damaged.amountChanged, 3);
  assert.equal(lost.amountChanged, 3);
  assert.equal(damaged.cause, "damage");
  assert.equal(lost.cause, "loss");
});

test("payment requires the complete cost while recovery respects maximum", () => {
  const pool = createVitalPool(6, 4);
  assert.deepEqual(payVitalCost(pool, 4).pool, { current: 0, maximum: 6 });
  assert.throws(() => payVitalCost(pool, 5), /fully available/);
  const recovered = recoverVital(pool, 10);
  assert.deepEqual(recovered.pool, { current: 6, maximum: 6 });
  assert.equal(recovered.amountChanged, 2);
});

test("changing maximum does not increase current unless explicitly requested", () => {
  const pool = createVitalPool(5, 3);
  const maximumOnly = setVitalMaximum(pool, 8);
  const explicitIncrease = increaseVitalMaximumAndCurrent(pool, 2);

  assert.deepEqual(maximumOnly.pool, { current: 3, maximum: 8 });
  assert.deepEqual(explicitIncrease.pool, { current: 5, maximum: 7 });
});

test("maximum reduction clamps current without classifying the difference as damage", () => {
  const result = setVitalMaximum(createVitalPool(10, 8), 4);
  assert.deepEqual(result.pool, { current: 4, maximum: 4 });
  assert.equal(result.amountChanged, 4);
  assert.equal(result.cause, "maximum_clamp");
});

test("vital pools and formulas reject invalid authoritative values", () => {
  assert.throws(() => calculateBaseMaximumHp(0, "normal"), VitalInvariantError);
  assert.throws(() => calculateBaseMaximumMp(4, "xyz"), /Unknown prototype monster type/);
  assert.throws(() => createVitalPool(4, 5), /cannot exceed/);
  assert.throws(() => createVitalPool(4.5), /non-negative safe integer/);
  assert.throws(() => applyDamage(createVitalPool(4), -1), /non-negative safe integer/);
});
