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


def fake_card(card_id, name, card_type, race, level=None):
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
    return card


def build_pool(include_psychic_ritual=False):
    cards = []
    next_id = 1
    for race, quota in base.PROTOTYPE_MONSTER_QUOTAS.items():
        if race != "Psychic" or include_psychic_ritual:
            cards.append(fake_card(next_id, f"{race} Ritual", "Ritual Monster", race, level=7))
            next_id += 1
        for index in range(quota + 2):
            cards.append(
                fake_card(next_id, f"{race} Regular {index:02d}", "Effect Monster", race, level=4)
            )
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


class RitualPrototypePoolTests(unittest.TestCase):
    def test_real_ritual_is_selected_for_each_race_where_available(self):
        selected = module.select_prototype_pool(build_pool(include_psychic_ritual=False))
        document = module.build_selection_document(selected)
        self.assertEqual(
            document["summary"]["ritual_monsters_by_race"],
            {"Beast": 1, "Psychic": 0, "Fiend": 1, "Spellcaster": 1},
        )
        self.assertIn("Psychic", document["requested"]["ritual_official_exceptions"])

    def test_psychic_ritual_is_used_automatically_if_official_candidate_exists(self):
        selected = module.select_prototype_pool(build_pool(include_psychic_ritual=True))
        document = module.build_selection_document(selected)
        self.assertEqual(
            document["summary"]["ritual_monsters_by_race"],
            {"Beast": 1, "Psychic": 1, "Fiend": 1, "Spellcaster": 1},
        )
        self.assertEqual(document["requested"]["ritual_official_exceptions"], {})

    def test_race_quotas_and_total_stay_unchanged(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(len(selected), 96)
        self.assertEqual(
            document["summary"]["monsters_by_race"],
            {"Beast": 15, "Fiend": 18, "Psychic": 15, "Spellcaster": 18},
        )
        self.assertEqual(document["summary"]["spells_total"], 20)
        self.assertEqual(document["summary"]["traps_total"], 10)

    def test_ritual_spells_are_generic_in_pool_metadata(self):
        selected = module.select_prototype_pool(build_pool())
        document = module.build_selection_document(selected)
        self.assertEqual(
            document["requested"]["ritual_spell_compatibility"],
            "generic-any-ritual-monster",
        )
        self.assertEqual(document["summary"]["spells_by_subtype"]["Ritual"], 2)


if __name__ == "__main__":
    unittest.main()
