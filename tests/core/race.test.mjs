import assert from "node:assert/strict";
import test from "node:test";

import {
  PRIORITY_RACES,
  RACE_STAT_BONUSES,
  RaceInvariantError,
  calculateStructuralRaceBonuses,
  isPriorityRace,
} from "../../src/core/index.ts";

test("the current scope contains exactly the seventeen approved RACE", () => {
  assert.equal(PRIORITY_RACES.length, 17);
  assert.equal(new Set(PRIORITY_RACES).size, 17);
  for (const race of PRIORITY_RACES) {
    assert.equal(isPriorityRace(race), true);
    assert.equal(RACE_STAT_BONUSES[race] !== undefined, true);
  }
  assert.equal(isPriorityRace("Reptile"), false);
});

test("the approved structural bonus table is preserved", () => {
  assert.deepEqual(RACE_STAT_BONUSES.Aqua, { hp: 0, mp: 3, vis: 0, spd: 0, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Beast, { hp: 1, mp: 0, vis: 0, spd: 1, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Dragon, { hp: 1, mp: 0, vis: 0, spd: 0, atk: 0, def: 1 });
  assert.deepEqual(RACE_STAT_BONUSES.Fairy, { hp: 0, mp: 2, vis: 0, spd: 1, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Fiend, { hp: 0, mp: 0, vis: 0, spd: 1, atk: 1, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Fish, { hp: 0, mp: 0, vis: 0, spd: 2, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Insect, { hp: 0, mp: 0, vis: 0, spd: 3, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Machine, { hp: 0, mp: 0, vis: 0, spd: 0, atk: 0, def: 2 });
  assert.deepEqual(RACE_STAT_BONUSES.Plant, { hp: 2, mp: 0, vis: 0, spd: 0, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Psychic, { hp: 0, mp: 2, vis: 2, spd: 0, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Pyro, { hp: 0, mp: 0, vis: 0, spd: 0, atk: 3, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Rock, { hp: 1, mp: 0, vis: 0, spd: 0, atk: 0, def: 2 });
  assert.deepEqual(RACE_STAT_BONUSES.Spellcaster, { hp: 0, mp: 3, vis: 0, spd: 0, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Thunder, { hp: 0, mp: 0, vis: 0, spd: 3, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Warrior, { hp: 1, mp: 0, vis: 0, spd: 0, atk: 1, def: 1 });
  assert.deepEqual(RACE_STAT_BONUSES["Winged Beast"], { hp: 0, mp: 0, vis: 2, spd: 1, atk: 0, def: 0 });
  assert.deepEqual(RACE_STAT_BONUSES.Zombie, { hp: 1, mp: 0, vis: 0, spd: 0, atk: 2, def: 0 });
});

test("multiple structural RACE grant every bonus in full", () => {
  assert.deepEqual(calculateStructuralRaceBonuses(["Dragon", "Spellcaster", "Warrior"]), {
    hp: 2,
    mp: 3,
    vis: 0,
    spd: 0,
    atk: 1,
    def: 2,
  });
});

test("temporary or unsupported RACE cannot enter structural stat calculation", () => {
  assert.throws(() => calculateStructuralRaceBonuses([]), RaceInvariantError);
  assert.throws(() => calculateStructuralRaceBonuses(["Reptile"]), /outside the current prototype scope/);
  assert.throws(() => calculateStructuralRaceBonuses(["Dragon", "Dragon"]), /more than once/);
});
