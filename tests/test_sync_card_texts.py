import importlib.util, sys, unittest
from pathlib import Path
SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path: sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("sync_text_test", SCRIPTS / "sync_card_texts.py")
module = importlib.util.module_from_spec(spec); assert spec and spec.loader; sys.modules[spec.name] = module; spec.loader.exec_module(module)
class TextTests(unittest.TestCase):
    def test_monster_fields(self):
        text = module.render({"id":1,"name":"N","type":"Normal Monster","race":"Warrior","level":4,"desc":"Flavor"}); self.assertIn("Nome: N",text); self.assertIn("RACE: Warrior",text); self.assertIn("Nível: 4",text); self.assertIn("Flavor",text)
    def test_spell_fields(self):
        text = module.render({"id":2,"name":"S","type":"Spell Card","race":"Quick-Play","desc":"Effect"}); self.assertIn("Categoria: Magia",text); self.assertIn("Subtipo: Quick-Play",text); self.assertIn("Effect",text)
    def test_trap_fields(self):
        text = module.render({"id":3,"name":"T","type":"Trap Card","race":"Counter","desc":"Negate"}); self.assertIn("Categoria: Armadilha",text); self.assertIn("Subtipo: Counter",text)
    def test_art_id(self): self.assertEqual(module.card_id_from_path(Path("Monstros/A/B/foo__123__art-2-999.jpg")),123)
if __name__ == "__main__": unittest.main()
