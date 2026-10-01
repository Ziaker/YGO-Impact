import importlib.util
import sys
import unittest
from collections import Counter
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

SCRIPT_PATH = SCRIPTS_DIR / "sync_prototype_pool.py"
spec = importlib.util.spec_from_file_location("sync_prototype_pool_test", SCRIPT_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)
base = module.base


def fake_card(card_id, name, card_type, race, level=None, archetype=None):
    card = {
        "id": card_id,
        "name": name,
        "type": card_type,
        "race": race,
        "card_images": [{"id": card_id, "image_url_cropped": f"https://example.invalid/{card_id}.jpg"}],
    }
    if level is not None:
        card["level"] = level
    if archetype is not None:
        card["archetype"] = archetype
    return card


def build_pool():
    cards = []
    next_id = 1
    for race, non_normal_quota in module.CORE_NON_NORMAL_QUOTAS.items():
        if race in module.RITUAL_TARGET_RACES:
            cards.append(fake_card(next_id, f"{race} Ritual", "Ritual Monster", race, level=7))
            next_id += 1

        if race == "Psychic":
            cards.append(fake_card(next_id, "Psychic High 11", "Effect Monster", race, level=11))
            next_id += 1
            cards.append(fake_card(next_id, "Psychic High 10", "Fusion Monster", race, level=10))
            next_id += 1
            cards.append(fake_card(next_id, "Psychic Duplicate A", "Effect Monster", race, level=12, archetype="Shared Psychic"))
            next_id += 1
            cards.append(fake_card(next_id, "Psychic Duplicate B", "Effect Monster", race, level=9, archetype="Shared Psychic"))
            next_id += 1

        for index in range(non_normal_quota + 8):
            archetype = f"{race} Shared" if index in (0, 1) else None
            cards.append(
                fake_card(
                    next_id,
                    f"{race} Regular {index:02d}",
                    "Effect Monster" if index % 4 else "Fusion Monster",
                    race,
                    level=(index % 8) + 1,
                    archetype=archetype,
                )
            )
            next_id += 1

        for index in range(module.NORMAL_TARGET_PER_RACE + 5):
            cards.append(
                fake_card(
                    next_id,
                    f"{race} Normal {index:02d}",
                    "Normal Monster",
                    race,
                    level=module.NORMAL_LEVEL_MIN + (index % 3),
                )
            )
            next_id += 1

        cards.append(fake_card(next_id, f"AAA {race} Archetype Normal A", "Normal Monster", race, level=3, archetype=f"{race} Named"))
        next_id += 1
        cards.append(fake_card(next_id, f"AAA {race} Archetype Normal B", "Normal Monster", race, level=3, archetype=f"{race} Named"))
        next_id += 1
        cards.append(fake_card(next_id, f"{race} Normal L1", "Normal Monster", race, level=1))
        next_id += 1
        cards.append(fake_card(next_id, f"{race} Normal L5", "Normal Monster", race, level=5))
        next_id += 1

    for subtype, count in {
        "Field": 3,
        "Ritual": 3,
        "Equip": 6,
        "Normal": 12,
        "Quick-Play": 12,
        "Continuous": 12,
    }.items():
        for index in range(count):
            cards.append(fake_card(next_id, f"{subtype} Spell {index:02d}", "Spell Card", subtype))
            next_id += 1

    for index in range(12):
        cards.append(fake_card(next_id, f"Trap {index:02d}", "Trap Card", "Normal"))
        next_id += 1
    return cards


class ExpandedPrototypePoolTests(unittest.TestCase):
    def test_expanded_pool_has_10_normals_per_race_plus_core_non_normals(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(len(selected), 136)
        self.assertEqual(document["summary"]["monsters_total"], 106)
        self.assertEqual(document["summary"]["monsters_by_race"], {"Beast": 25, "Fiend": 28, "Psychic": 25, "Spellcaster": 28})
        self.assertEqual(document["summary"]["normal_monsters_by_race"], {"Beast": 10, "Psychic": 10, "Fiend": 10, "Spellcaster": 10})
        self.assertEqual(document["summary"]["spells_total"], 20)
        self.assertEqual(document["summary"]["traps_total"], 10)

    def test_all_selected_normals_are_level_2_to_4(self):
        selected = module.select_prototype_pool(build_pool())
        normals = [card for card in selected if card.get("type") == "Normal Monster"]
        self.assertEqual(len(normals), 40)
        self.assertTrue(all(2 <= int(card["level"]) <= 4 for card in normals))

    def test_named_archetype_can_appear_but_never_twice(self):
        selected = module.select_prototype_pool(build_pool())
        archetypes = [module.archetype_name(card) for card in selected if module.archetype_name(card)]
        counts = Counter(archetypes)
        self.assertTrue(all(count == 1 for count in counts.values()))
        document = module.build_selection_document(selected)
        self.assertEqual(document["summary"]["duplicated_named_archetypes"], {})

    def test_non_archetype_candidates_are_preferred_for_general_slots(self):
        selected = module.select_prototype_pool(build_pool())
        normals = [card for card in selected if card.get("type") == "Normal Monster"]
        self.assertTrue(all(module.archetype_name(card) is None for card in normals))

    def test_psychic_high_level_reservation_uses_level_first_and_unique_archetypes(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        reserved = document["summary"]["psychic_high_level_reserved"]
        self.assertEqual([row["name"] for row in reserved], ["Psychic Duplicate A", "Psychic High 11"])
        self.assertEqual([row["level"] for row in reserved], [12, 11])
        self.assertEqual(reserved[0]["archetype"], "Shared Psychic")

    def test_rituals_remain_reserved_for_three_races(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(document["summary"]["ritual_monsters_by_race"], {"Beast": 1, "Psychic": 0, "Fiend": 1, "Spellcaster": 1})

    def test_ritual_spells_remain_generic(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(document["requested"]["ritual_spell_compatibility"], "generic-any-ritual-monster")
        self.assertEqual(document["summary"]["spells_by_subtype"]["Ritual"], 2)

    def test_duplicate_archetype_is_skipped_when_needed(self):
        used = {"shared"}
        cards = [
            fake_card(1, "A", "Normal Monster", "Psychic", 3, archetype="Shared"),
            fake_card(2, "B", "Normal Monster", "Psychic", 3, archetype="Other"),
        ]
        chosen = module._choose_unique(cards, 1, used, context="teste")
        self.assertEqual(chosen[0]["name"], "B")

    def test_psychic_normals_allow_only_the_authorized_rushcard_exception(self):
        cards = []
        for index in range(6):
            cards.append(fake_card(index + 1, f"Unique {index}", "Normal Monster", "Psychic", 3))
        for index in range(4):
            card = fake_card(20 + index, f"Rush {index}", "Normal Monster", "Psychic", 3, archetype="Psychic Musician")
            card["_monster_impact_source"] = "rushcard"
            cards.append(card)
        chosen = module._select_normals_for_race(cards, "Psychic", set())
        self.assertEqual(len(chosen), 10)
        self.assertEqual(sum(module.archetype_name(card) == "Psychic Musician" for card in chosen), 4)


if __name__ == "__main__":
    unittest.main()
