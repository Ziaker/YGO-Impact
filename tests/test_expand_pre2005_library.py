import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

spec = importlib.util.spec_from_file_location("expand_test", SCRIPTS / "expand_pre2005_library.py")
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)
base = module.base


def spell_card(cid: int, subtype: str, year: int) -> dict:
    return {
        "id": cid,
        "name": f"Spell_{cid}",
        "type": "Spell Card",
        "race": subtype,
        "card_sets": [{"set_name": f"Set_{year}"}],
        "card_images": [{"id": cid, "image_url_cropped": f"https://x/{cid}.jpg"}],
    }


def trap_card(cid: int, subtype: str, year: int) -> dict:
    return {
        "id": cid,
        "name": f"Trap_{cid}",
        "type": "Trap Card",
        "race": subtype,
        "card_sets": [{"set_name": f"Set_{year}"}],
        "card_images": [{"id": cid, "image_url_cropped": f"https://x/{cid}.jpg"}],
    }


class ExpansionTests(unittest.TestCase):
    def test_cutoff_exclusive(self):
        years = {"Old": 2004, "Cutoff": 2005}
        self.assertTrue(module.pre_cutoff(spell_card(1, "Normal", 2004), {"Set_2004": 2004}, 2005))
        self.assertFalse(module.pre_cutoff(spell_card(2, "Normal", 2005), {"Set_2005": 2005}, 2005))

    def test_subtypes_definition(self):
        self.assertEqual(module.SPELL_SUBTYPES, ("Normal", "Quick-Play", "Continuous", "Equip", "Field", "Ritual"))
        self.assertEqual(module.TRAP_SUBTYPES, ("Normal", "Continuous", "Counter"))

    def test_select_subtypes_spells(self):
        years = {f"Set_{y}": y for y in (2002, 2003, 2006)}
        cards = [
            spell_card(1, "Normal", 2002),
            spell_card(2, "Normal", 2003),
            spell_card(3, "Normal", 2006),  # post 2005, should be excluded
        ]
        selected = module.select_subtypes(
            cards,
            api_type="Spell Card",
            subtypes=("Normal",),
            years=years,
            cutoff=2005,
            existing=set(),
            quota=2,
        )
        self.assertEqual(len(selected), 2)
        self.assertEqual([c["id"] for c in selected], [1, 2])

    def test_select_subtypes_shortfall_raises(self):
        years = {"Set_2002": 2002}
        cards = [trap_card(1, "Counter", 2002)]
        with self.assertRaises(module.ExpansionError):
            module.select_subtypes(
                cards,
                api_type="Trap Card",
                subtypes=("Counter",),
                years=years,
                cutoff=2005,
                existing=set(),
                quota=2,
            )


if __name__ == "__main__":
    unittest.main()
