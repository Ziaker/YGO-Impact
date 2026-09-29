import importlib.util, sys, unittest
from pathlib import Path
SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path: sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("expand_test", SCRIPTS / "expand_pre2005_library.py")
module = importlib.util.module_from_spec(spec); assert spec and spec.loader; sys.modules[spec.name] = module; spec.loader.exec_module(module); base = module.base

def card(i, race, level, *, year_set="Old", source="standard"):
    return {"id": i, "name": f"C{i}", "type": "Normal Monster", "race": race, "level": level, "card_sets": [{"set_name": year_set}], "card_images": [{"id": i, "image_url_cropped": f"https://x/{i}.jpg"}], "_monster_impact_source": source}

class ExpansionTests(unittest.TestCase):
    def test_cutoff_exclusive(self):
        self.assertTrue(module.pre_cutoff(card(1, "Aqua", 3), {"Old": 2004}, 2005))
        self.assertFalse(module.pre_cutoff(card(1, "Aqua", 3), {"Old": 2005}, 2005))
    def test_non_psychic_expands_level_max(self):
        cards = [card(i, "Aqua", 7 if i == 15 else 3) for i in range(1,16)]
        old = base.PROJECT_PRIORITY_RACES; base.PROJECT_PRIORITY_RACES = ("Aqua",)
        try: selected, max_level, psychic = module.select_normals(cards, {"Old":2004}, 2005, set(), set(), 15, 20)
        finally: base.PROJECT_PRIORITY_RACES = old
        self.assertEqual(len(selected),15); self.assertEqual(max_level["Aqua"],7); self.assertEqual(psychic,0)
    def test_psychic_any_date_any_level_up_to_20(self):
        cards = [card(i, "Psychic", (i%12)+1, year_set="Future", source="rush-duel") for i in range(1,26)]
        old = base.PROJECT_PRIORITY_RACES; base.PROJECT_PRIORITY_RACES = ("Psychic",)
        try: selected, max_level, psychic = module.select_normals(cards, {"Future":2021}, 2005, set(), set(), 15, 20)
        finally: base.PROJECT_PRIORITY_RACES = old
        self.assertEqual(len(selected),20); self.assertEqual(psychic,20); self.assertTrue(any(int(c["level"])<3 for c in selected)); self.assertEqual(max_level["Psychic"],12)
    def test_psychic_accepts_less_than_20(self):
        cards = [card(i, "Psychic", i, year_set="Future") for i in range(1,8)]
        old = base.PROJECT_PRIORITY_RACES; base.PROJECT_PRIORITY_RACES = ("Psychic",)
        try: selected, _, psychic = module.select_normals(cards, {"Future":2024}, 2005, set(), set(), 15, 20)
        finally: base.PROJECT_PRIORITY_RACES = old
        self.assertEqual(len(selected),7); self.assertEqual(psychic,7)
    def test_subtypes(self):
        self.assertEqual(module.SPELL_SUBTYPES, ("Normal","Quick-Play","Continuous","Equip","Field","Ritual")); self.assertEqual(module.TRAP_SUBTYPES, ("Normal","Continuous","Counter"))
if __name__ == "__main__": unittest.main()
