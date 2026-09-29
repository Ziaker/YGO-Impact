import importlib.util
import tempfile
import unittest
import sys
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "baixar_artes.py"
spec = importlib.util.spec_from_file_location("baixar_artes", SCRIPT_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class DownloaderContractTests(unittest.TestCase):
    def test_supported_types_follow_prototype_scope(self):
        allowed = [
            "Normal Monster",
            "Effect Monster",
            "Fusion Monster",
            "Ritual Monster",
            "Ritual Effect Monster",
            "Toon Monster",
            "Spirit Monster",
            "Gemini Monster",
            "Spell Card",
            "Trap Card",
        ]
        forbidden = [
            "Synchro Monster",
            "Xyz Monster",
            "Pendulum Effect Monster",
            "Link Monster",
            "Token",
            "Skill Card",
        ]
        for card_type in allowed:
            race = "Dragon" if "Monster" in card_type else "Normal"
            self.assertTrue(module.card_is_supported({"type": card_type, "race": race}), card_type)
        for card_type in forbidden:
            self.assertFalse(module.card_is_supported({"type": card_type, "race": "Dragon"}), card_type)


    def test_monster_race_outside_initial_scope_is_rejected(self):
        self.assertFalse(module.card_is_supported({"type": "Effect Monster", "race": "Dinosaur"}))

    def test_pre_2010_filter_is_explicit_helper(self):
        old = {"card_sets": [{"set_tcg_date": "2009-12-31"}]}
        modern = {"card_sets": [{"set_tcg_date": "2010-01-01"}]}
        self.assertTrue(module.card_is_pre_2010(old))
        self.assertFalse(module.card_is_pre_2010(modern))

    def test_category_organizes_monsters_by_race_and_type(self):
        card = {"type": "Fusion Monster", "race": "Dragon"}
        self.assertEqual(module.category_path(card), Path("Monstros/Dragon/Fusion"))

    def test_spells_use_subtype_folder(self):
        card = {"type": "Spell Card", "race": "Quick-Play"}
        self.assertEqual(module.category_path(card), Path("Magias/Quick-Play"))

    def test_artwork_uses_image_url_cropped(self):
        card = {
            "id": 1,
            "name": "Teste",
            "type": "Normal Monster",
            "race": "Dragon",
            "card_images": [
                {
                    "id": 10,
                    "image_url": "https://example.invalid/full.jpg",
                    "image_url_cropped": "https://example.invalid/cropped.jpg",
                }
            ],
        }
        artwork = list(module.iter_artworks(card, all_artworks=False))[0]
        self.assertEqual(artwork.url, "https://example.invalid/cropped.jpg")

    def test_targets_file_accepts_name_id_and_comments(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "targets.txt"
            path.write_text("# exemplo\nname:Dark Magician\nid:46986414\nBlue-Eyes White Dragon\n", encoding="utf-8")
            targets = module.load_targets(path)
        self.assertEqual(
            [(target.kind, target.value) for target in targets],
            [("name", "Dark Magician"), ("id", "46986414"), ("name", "Blue-Eyes White Dragon")],
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
