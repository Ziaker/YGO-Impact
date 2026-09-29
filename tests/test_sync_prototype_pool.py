import importlib.util
import sys
import unittest
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
        "card_images": [
            {
                "id": card_id,
                "image_url_cropped": f"https://example.invalid/{card_id}.jpg",
            }
        ],
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
            cards.append(
                fake_card(next_id, f"{race} Ritual", "Ritual Monster", race, level=7)
            )
            next_id += 1

        if race == "Psychic":
            cards.append(fake_card(next_id, "Psychic High 11", "Effect Monster", race, level=11))
            next_id += 1
            cards.append(fake_card(next_id, "Psychic High 10", "Fusion Monster", race, level=10))
            next_id += 1
            cards.append(
                fake_card(
                    next_id,
                    "Psychic Archetype High 12",
                    "Effect Monster",
                    race,
                    level=12,
                    archetype="Named Psychic",
                )
            )
            next_id += 1

        for index in range(non_normal_quota + 5):
            cards.append(
                fake_card(
                    next_id,
                    f"{race} Regular {index:02d}",
                    "Effect Monster" if index % 4 else "Fusion Monster",
                    race,
                    level=(index % 8) + 1,
                )
            )
            next_id += 1

        # Este candidato deve ser descartado mesmo ordenando cedo.
        cards.append(
            fake_card(
                next_id,
                f"AAA {race} Archetype Effect",
                "Effect Monster",
                race,
                level=8,
                archetype=f"{race} Named Archetype",
            )
        )
        next_id += 1

        for index in range(module.NORMAL_TARGET_PER_RACE + 3):
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

        cards.append(
            fake_card(
                next_id,
                f"AAA {race} Archetype Normal",
                "Normal Monster",
                race,
                level=4,
                archetype=f"{race} Named Archetype",
            )
        )
        next_id += 1

        # Normal fora da faixa não pode completar a cota.
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
        self.assertEqual(
            document["summary"]["monsters_by_race"],
            {"Beast": 25, "Fiend": 28, "Psychic": 25, "Spellcaster": 28},
        )
        self.assertEqual(
            document["summary"]["normal_monsters_by_race"],
            {"Beast": 10, "Psychic": 10, "Fiend": 10, "Spellcaster": 10},
        )
        self.assertEqual(
            document["summary"]["non_normal_monsters_by_race"],
            {"Beast": 15, "Psychic": 15, "Fiend": 18, "Spellcaster": 18},
        )
        self.assertEqual(document["summary"]["spells_total"], 20)
        self.assertEqual(document["summary"]["traps_total"], 10)

    def test_all_selected_normals_are_level_2_to_4(self):
        selected = module.select_prototype_pool(build_pool())
        normals = [card for card in selected if card.get("type") == "Normal Monster"]
        self.assertEqual(len(normals), 40)
        self.assertTrue(all(2 <= int(card["level"]) <= 4 for card in normals))

    def test_no_selected_monster_has_api_archetype(self):
        selected = module.select_prototype_pool(build_pool())
        monsters = [
            card for card in selected if card.get("type") not in {"Spell Card", "Trap Card"}
        ]
        self.assertTrue(all(not module.has_named_archetype(card) for card in monsters))
        document = module.build_selection_document(selected)
        self.assertEqual(document["summary"]["archetyped_monsters_selected"], 0)
        self.assertTrue(
            all(row.get("archetype") is None for row in document["cards"] if row["bucket"] == "monster")
        )

    def test_archetype_monsters_are_excluded_even_when_they_sort_first_or_have_higher_level(self):
        cards = build_pool()
        archetype_ids = {
            int(card["id"])
            for card in cards
            if card.get("type") not in {"Spell Card", "Trap Card"}
            and module.has_named_archetype(card)
        }
        selected_ids = {int(card["id"]) for card in module.select_prototype_pool(cards)}
        self.assertTrue(archetype_ids)
        self.assertTrue(archetype_ids.isdisjoint(selected_ids))

    def test_psychic_high_level_reservation_ignores_archetype_candidate(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        reserved = document["summary"]["psychic_high_level_reserved"]
        self.assertEqual([row["name"] for row in reserved], ["Psychic High 11", "Psychic High 10"])
        self.assertEqual([row["level"] for row in reserved], [11, 10])

    def test_rituals_remain_reserved_for_three_races_without_archetype(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(
            document["summary"]["ritual_monsters_by_race"],
            {"Beast": 1, "Psychic": 0, "Fiend": 1, "Spellcaster": 1},
        )

    def test_ritual_spells_remain_generic_and_spell_trap_counts_do_not_change(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(
            document["requested"]["ritual_spell_compatibility"],
            "generic-any-ritual-monster",
        )
        self.assertEqual(document["summary"]["spells_by_subtype"]["Ritual"], 2)
        self.assertEqual(document["summary"]["spells_total"], 20)
        self.assertEqual(document["summary"]["traps_total"], 10)

    def test_exact_normal_target_fails_if_a_race_has_too_few_candidates(self):
        cards = [
            card
            for card in build_pool()
            if not (
                card.get("race") == "Psychic"
                and card.get("type") == "Normal Monster"
                and str(card.get("name", "")).startswith("Psychic Normal 0")
            )
        ]
        with self.assertRaises(base.DownloaderError):
            module.select_prototype_pool(cards)


if __name__ == "__main__":
    unittest.main()
