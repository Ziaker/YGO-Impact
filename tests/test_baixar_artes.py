import importlib.util
import tempfile
import unittest
import sys
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "baixar_artes.py"
spec = importlib.util.spec_from_file_location("baixar_artes_new", SCRIPT_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)


def fake_card(
    card_id,
    name,
    card_type,
    race,
    level=None,
    image=True,
):
    card = {
        "id": card_id,
        "name": name,
        "type": card_type,
        "race": race,
        "card_images": [],
    }
    if level is not None:
        card["level"] = level
    if image:
        card["card_images"] = [
            {
                "id": card_id,
                "image_url": f"https://example.invalid/full/{card_id}.jpg",
                "image_url_cropped": f"https://example.invalid/cropped/{card_id}.jpg",
            }
        ]
    return card


class DownloaderContractTests(unittest.TestCase):
    def test_active_races_are_the_four_selected_for_prototype(self):
        for race in ("Beast", "Psychic", "Fiend", "Spellcaster"):
            self.assertIn(race, module.PROTOTYPE_MONSTER_QUOTAS)
        self.assertEqual(set(module.PROTOTYPE_MONSTER_QUOTAS), {"Beast", "Psychic", "Fiend", "Spellcaster"})

    def test_only_current_monster_families_are_supported(self):
        allowed = [
            "Normal Monster",
            "Effect Monster",
            "Fusion Monster",
            "Ritual Monster",
            "Ritual Effect Monster",
            "Flip Effect Monster",
            "Toon Monster",
            "Spirit Monster",
            "Union Effect Monster",
            "Gemini Monster",
        ]
        forbidden = [
            "Synchro Monster",
            "Xyz Monster",
            "Pendulum Effect Monster",
            "Link Monster",
            "Token",
            "Skill Card",
            "Tuner Monster",
        ]
        for i, card_type in enumerate(allowed, start=1):
            self.assertTrue(
                module.card_is_supported(fake_card(i, f"A{i}", card_type, "Beast", level=4)),
                card_type,
            )
        for i, card_type in enumerate(forbidden, start=100):
            self.assertFalse(
                module.card_is_supported(fake_card(i, f"F{i}", card_type, "Beast", level=4)),
                card_type,
            )

    def test_monster_outside_active_four_races_is_rejected(self):
        self.assertFalse(
            module.card_is_supported(fake_card(1, "Dragon Test", "Effect Monster", "Dragon", level=4))
        )


    def test_confirmed_broken_cropped_urls_are_regressions(self):
        for card_id in (100460002, 100460003):
            self.assertFalse(
                module.card_is_supported(
                    fake_card(card_id, f"Broken {card_id}", "Effect Monster", "Fiend", level=4)
                )
            )

    def test_card_without_cropped_art_is_rejected(self):
        self.assertFalse(
            module.card_is_supported(fake_card(1, "No Art", "Effect Monster", "Beast", level=4, image=False))
        )

    def test_pool_selects_exact_race_and_spell_trap_quotas(self):
        cards = []
        next_id = 1
        for race, quota in module.PROTOTYPE_MONSTER_QUOTAS.items():
            for index in range(quota + 3):
                cards.append(
                    fake_card(
                        next_id,
                        f"{race} {index:02d}",
                        "Normal Monster" if index % 4 == 0 else "Effect Monster",
                        race,
                        level=(index % 8) + 1,
                    )
                )
                next_id += 1

        for subtype, count in {"Field": 5, "Ritual": 5, "Equip": 8, "Normal": 8, "Quick-Play": 8, "Continuous": 8}.items():
            for index in range(count):
                cards.append(fake_card(next_id, f"{subtype} Spell {index:02d}", "Spell Card", subtype))
                next_id += 1

        for subtype in ("Normal", "Continuous", "Counter"):
            for index in range(7):
                cards.append(fake_card(next_id, f"{subtype} Trap {index:02d}", "Trap Card", subtype))
                next_id += 1

        selected = module.select_prototype_pool(cards)
        doc = module.build_selection_document(selected)

        self.assertEqual(len(selected), 96)
        self.assertEqual(
            doc["summary"]["monsters_by_race"],
            {"Beast": 15, "Fiend": 18, "Psychic": 15, "Spellcaster": 18},
        )
        self.assertEqual(doc["summary"]["spells_total"], 20)
        self.assertEqual(doc["summary"]["spells_by_subtype"]["Field"], 2)
        self.assertEqual(doc["summary"]["spells_by_subtype"]["Ritual"], 2)
        self.assertEqual(doc["summary"]["spells_by_subtype"]["Equip"], 5)
        general = sum(
            doc["summary"]["spells_by_subtype"].get(subtype, 0)
            for subtype in module.GENERAL_SPELL_SUBTYPES
        )
        self.assertEqual(general, 11)
        self.assertEqual(doc["summary"]["traps_total"], 10)

    def test_selection_is_deterministic_by_name_then_id_not_level(self):
        cards = []
        next_id = 1
        for race, quota in module.PROTOTYPE_MONSTER_QUOTAS.items():
            for index in range(quota):
                cards.append(
                    fake_card(
                        next_id,
                        f"{race} {chr(65 + (index % 26))}{index:02d}",
                        "Effect Monster",
                        race,
                        level=12 - (index % 8),
                    )
                )
                next_id += 1
        for subtype, quota in module.SPELL_SUBTYPE_QUOTAS.items():
            for index in range(quota):
                cards.append(fake_card(next_id, f"{subtype} Spell {index:02d}", "Spell Card", subtype))
                next_id += 1
        for index in range(11):
            cards.append(fake_card(next_id, f"Normal Spell {index:02d}", "Spell Card", "Normal"))
            next_id += 1
        for index in range(10):
            cards.append(fake_card(next_id, f"Trap {index:02d}", "Trap Card", "Normal"))
            next_id += 1

        selected_a = module.select_prototype_pool(list(reversed(cards)))
        selected_b = module.select_prototype_pool(cards)
        self.assertEqual([c["id"] for c in selected_a], [c["id"] for c in selected_b])

    def test_level_summary_counts_only_monsters(self):
        cards = [
            fake_card(1, "M1", "Normal Monster", "Beast", level=1),
            fake_card(2, "M2", "Effect Monster", "Beast", level=4),
            fake_card(3, "M3", "Fusion Monster", "Fiend", level=4),
            fake_card(4, "S", "Spell Card", "Normal"),
            fake_card(5, "T", "Trap Card", "Counter"),
        ]
        doc = module.build_selection_document(cards)
        self.assertEqual(doc["summary"]["monsters_by_level"], {"1": 1, "4": 2})

    def test_category_organizes_monsters_by_race_and_type(self):
        card = fake_card(1, "Fusion Test", "Fusion Monster", "Fiend", level=6)
        self.assertEqual(module.category_path(card), Path("Monstros/Fiend/Fusion"))

    def test_artwork_uses_image_url_cropped_and_keeps_level(self):
        card = fake_card(1, "Teste", "Effect Monster", "Psychic", level=3)
        artwork = list(module.iter_artworks(card, all_artworks=False))[0]
        self.assertEqual(artwork.url, "https://example.invalid/cropped/1.jpg")
        self.assertEqual(artwork.level, 3)
        self.assertEqual(artwork.prototype_type, "Efeito")

    def test_pre_2010_filter_remains_optional_helper(self):
        card = {"card_sets": [{"set_name": "Old Set"}, {"set_name": "New Set"}]}
        self.assertTrue(module.card_is_pre_2010(card, {"Old Set": 2009, "New Set": 2010}))
        self.assertFalse(module.card_is_pre_2010(card, {"Old Set": 2010, "New Set": 2020}))

    def test_targets_file_still_accepts_name_id_and_comments(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "targets.txt"
            path.write_text("# exemplo\nname:Dark Magician\nid:46986414\nKuriboh\n", encoding="utf-8")
            targets = module.load_targets(path)
        self.assertEqual(
            [(target.kind, target.value) for target in targets],
            [("name", "Dark Magician"), ("id", "46986414"), ("name", "Kuriboh")],
        )

    def test_write_atomic_leaves_no_part_file(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "file.jpg"
            digest = module.write_atomic(target, b"abc")
            self.assertTrue(target.exists())
            self.assertFalse(target.with_name("file.jpg.part").exists())
            self.assertEqual(len(digest), 64)


if __name__ == "__main__":
    unittest.main()
