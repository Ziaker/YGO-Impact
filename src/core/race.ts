import { deepFreeze } from "./freeze.ts";

export const PRIORITY_RACES = [
  "Aqua",
  "Beast",
  "Dragon",
  "Fairy",
  "Fiend",
  "Fish",
  "Insect",
  "Machine",
  "Plant",
  "Psychic",
  "Pyro",
  "Rock",
  "Spellcaster",
  "Thunder",
  "Warrior",
  "Winged Beast",
  "Zombie",
] as const;

export type PriorityRace = (typeof PRIORITY_RACES)[number];

export interface StatBonuses {
  readonly hp: number;
  readonly mp: number;
  readonly vis: number;
  readonly spd: number;
  readonly atk: number;
  readonly def: number;
}

export const RACE_STAT_BONUSES: Readonly<Record<PriorityRace, StatBonuses>> = deepFreeze({
  Aqua: { hp: 0, mp: 3, vis: 0, spd: 0, atk: 0, def: 0 },
  Beast: { hp: 1, mp: 0, vis: 0, spd: 1, atk: 0, def: 0 },
  Dragon: { hp: 1, mp: 0, vis: 0, spd: 0, atk: 0, def: 1 },
  Fairy: { hp: 0, mp: 2, vis: 0, spd: 1, atk: 0, def: 0 },
  Fiend: { hp: 0, mp: 0, vis: 0, spd: 1, atk: 1, def: 0 },
  Fish: { hp: 0, mp: 0, vis: 0, spd: 2, atk: 0, def: 0 },
  Insect: { hp: 0, mp: 0, vis: 0, spd: 3, atk: 0, def: 0 },
  Machine: { hp: 0, mp: 0, vis: 0, spd: 0, atk: 0, def: 2 },
  Plant: { hp: 2, mp: 0, vis: 0, spd: 0, atk: 0, def: 0 },
  Psychic: { hp: 0, mp: 2, vis: 2, spd: 0, atk: 0, def: 0 },
  Pyro: { hp: 0, mp: 0, vis: 0, spd: 0, atk: 3, def: 0 },
  Rock: { hp: 1, mp: 0, vis: 0, spd: 0, atk: 0, def: 2 },
  Spellcaster: { hp: 0, mp: 3, vis: 0, spd: 0, atk: 0, def: 0 },
  Thunder: { hp: 0, mp: 0, vis: 0, spd: 3, atk: 0, def: 0 },
  Warrior: { hp: 1, mp: 0, vis: 0, spd: 0, atk: 1, def: 1 },
  "Winged Beast": { hp: 0, mp: 0, vis: 2, spd: 1, atk: 0, def: 0 },
  Zombie: { hp: 1, mp: 0, vis: 0, spd: 0, atk: 2, def: 0 },
});

export class RaceInvariantError extends Error {
  override readonly name = "RaceInvariantError";
}

export function isPriorityRace(value: string): value is PriorityRace {
  return (PRIORITY_RACES as readonly string[]).includes(value);
}

export function calculateStructuralRaceBonuses(races: readonly string[]): StatBonuses {
  if (races.length === 0) {
    throw new RaceInvariantError("A monster must have at least one structural RACE.");
  }
  const seen = new Set<string>();
  const total = { hp: 0, mp: 0, vis: 0, spd: 0, atk: 0, def: 0 };
  for (const race of races) {
    if (!isPriorityRace(race)) {
      throw new RaceInvariantError(`RACE ${race} is outside the current prototype scope.`);
    }
    if (seen.has(race)) {
      throw new RaceInvariantError(`Structural RACE ${race} appears more than once.`);
    }
    seen.add(race);
    const bonus = RACE_STAT_BONUSES[race];
    total.hp += bonus.hp;
    total.mp += bonus.mp;
    total.vis += bonus.vis;
    total.spd += bonus.spd;
    total.atk += bonus.atk;
    total.def += bonus.def;
  }
  return deepFreeze(total);
}
