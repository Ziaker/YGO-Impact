#!/usr/bin/env python3
"""Runner robusto do pool: usa suplemento Rush curado por nome exato.

O endpoint em massa `format=Rush Duel` do YGOPRODeck tem retornado HTTP 400 no
GitHub Actions. Este runner preserva toda a política de `sync_prototype_pool.py`,
mas substitui somente a coleta suplementar de Normal Monsters Rush por consultas
individuais `name=...`, mantendo a fonte auditável e determinística.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import baixar_artes as base
import sync_prototype_pool as policy

# Candidatos reais de Rush Duel usados apenas para completar Normal Monsters
# Psychic Nível 2-4. A seleção final ainda aplica nível, RACE e unicidade de
# `archetype`; portanto estar nesta lista não garante entrada no pool.
CURATED_RUSH_NORMAL_NAMES: tuple[str, ...] = (
    "Ama Lilith",
    "Ampler Glee",
    "Concert Costume Creator",
    "Eleckiss",
    "Elengel",
    "Keytar Kid",
    "Peace Holder",
    "Robbarim",
    "Silent Assailant",
)

SUPPLEMENT_SOURCE = "rush-duel-curated"


def fetch_curated_rush_normals(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    errors: list[str] = []

    for name in CURATED_RUSH_NORMAL_NAMES:
        try:
            found = base.fetch_cards_for_target(
                base.Target("name", name), timeout=timeout, retries=retries
            )
        except base.DownloaderError as exc:
            errors.append(f"{name}: {exc}")
            continue

        accepted = False
        for card in found:
            if not policy.is_normal_slot_candidate(card, "Psychic"):
                continue
            tagged = dict(card)
            tagged["_monster_impact_source"] = SUPPLEMENT_SOURCE
            cards.append(tagged)
            accepted = True

        if not accepted:
            errors.append(f"{name}: retornada pela API, mas não é Psychic Normal Nível 2-4 compatível")

    if errors:
        print("Avisos do suplemento Rush curado:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)

    return base.dedupe_cards(cards)


def fetch_cards_with_curated_rush_supplement(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    standard_cards = policy._ORIGINAL_FETCH_ALL_CARDS(timeout=timeout, retries=retries)
    rush_cards = fetch_curated_rush_normals(timeout=timeout, retries=retries)
    return base.dedupe_cards([*standard_cards, *rush_cards])


def main(argv: Sequence[str] | None = None) -> int:
    base.TOTAL_MONSTERS = policy.TOTAL_MONSTERS
    base.TOTAL_PROTOTYPE_CARDS = policy.TOTAL_PROTOTYPE_CARDS
    base.fetch_all_cards = fetch_cards_with_curated_rush_supplement
    base.select_prototype_pool = policy.select_prototype_pool
    base.build_selection_document = policy.build_selection_document
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
