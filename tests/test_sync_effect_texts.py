import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

SCRIPT_PATH = SCRIPTS_DIR / "sync_effect_texts.py"
spec = importlib.util.spec_from_file_location("sync_effect_texts_test", SCRIPT_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class EffectReferenceTests(unittest.TestCase):
    def test_effect_sidecar_stays_next_to_art(self):
        path = module.effect_reference_path(
            "Monstros/Psychic/Efeito/test-monster__123.jpg"
        )
        self.assertEqual(
            path,
            Path("Monstros/Psychic/Efeito/test-monster__123.effect.txt"),
        )

    def test_only_effect_monsters_receive_reference(self):
        effect = {"bucket": "monster", "prototype_type": "Efeito"}
        normal = {"bucket": "monster", "prototype_type": "Normal"}
        fusion = {"bucket": "monster", "prototype_type": "Fusion"}
        spell = {"bucket": "spell", "prototype_type": "Magia"}
        self.assertTrue(module.is_effect_selection_row(effect))
        self.assertFalse(module.is_effect_selection_row(normal))
        self.assertFalse(module.is_effect_selection_row(fusion))
        self.assertFalse(module.is_effect_selection_row(spell))

    def test_reference_contains_identity_source_and_gdd_notice(self):
        row = {
            "id": 123,
            "name": "Test Psychic",
            "race": "Psychic",
            "level": 4,
            "api_type": "Effect Monster",
            "bucket": "monster",
            "prototype_type": "Efeito",
        }
        card = {"desc": "Once per turn: do the source-card thing."}
        text = module.render_effect_reference(card, row)
        self.assertIn("Nome: Test Psychic", text)
        self.assertIn("RACE: Psychic", text)
        self.assertIn("Nível: 4", text)
        self.assertIn("YGOPRODeck cardinfo.desc", text)
        self.assertIn("GDD", text)
        self.assertIn("Once per turn: do the source-card thing.", text)

    def test_sync_updates_manifest_with_effect_sidecar(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            art = root / "Monstros/Psychic/Efeito/test-psychic__123.jpg"
            art.parent.mkdir(parents=True)
            art.write_bytes(b"jpg")

            selection = {
                "cards": [
                    {
                        "id": 123,
                        "name": "Test Psychic",
                        "bucket": "monster",
                        "race": "Psychic",
                        "api_type": "Effect Monster",
                        "prototype_type": "Efeito",
                        "level": 4,
                    }
                ]
            }
            manifest = {
                "schema_version": 2,
                "files": {
                    "Monstros/Psychic/Efeito/test-psychic__123.jpg": {
                        "card_id": 123,
                        "name": "Test Psychic",
                        "prototype_type": "Efeito",
                    }
                },
            }
            (root / "selection.json").write_text(json.dumps(selection), encoding="utf-8")
            (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

            original_fetch = module.fetch_exact_card
            try:
                module.fetch_exact_card = lambda *args, **kwargs: {
                    "id": 123,
                    "desc": "Reference effect text.",
                }
                written, planned = module.sync_effect_references(
                    root=root, timeout=1, retries=0
                )
            finally:
                module.fetch_exact_card = original_fetch

            sidecar = art.with_name("test-psychic__123.effect.txt")
            self.assertEqual((written, planned), (1, 1))
            self.assertTrue(sidecar.exists())
            saved_manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
            key = "Monstros/Psychic/Efeito/test-psychic__123.effect.txt"
            self.assertEqual(saved_manifest["files"][key]["kind"], module.REFERENCE_KIND)
            self.assertEqual(saved_manifest["files"][key]["paired_art"], "Monstros/Psychic/Efeito/test-psychic__123.jpg")


if __name__ == "__main__":
    unittest.main()
