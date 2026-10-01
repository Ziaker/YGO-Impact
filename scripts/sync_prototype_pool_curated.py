#!/usr/bin/env python3
"""Runner do pool com suplemento Psychic Normal vindo do RushCard.

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
RUSHCARD_SEARCH_URL = (
    "https://mail.rushcard.io/api/search.php?limit=100&race=Psychic"
    "&type=Normal%20Monster&sort=name"
)
SUPPLEMENT_SOURCE = "rushcard"


def fetch_curated_rush_normals(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    payload = base._request_json_value(RUSHCARD_SEARCH_URL, timeout=timeout, retries=retries)
    if not isinstance(payload, list):
        raise base.DownloaderError("Resposta inesperada do RushCard: array JSON esperado.")
    cards: list[dict[str, Any]] = []
    for raw in payload:
        if not isinstance(raw, dict):
            continue
        card_id = int(raw.get("id", 0))
        card = dict(raw)
        card["card_images"] = [{
            "id": card_id,
            "image_url_cropped": f"https://images.rushcard.io/images/card/{card_id}.jpg",
        }]
        card["_monster_impact_source"] = SUPPLEMENT_SOURCE
        card["_monster_impact_image_requires_crop"] = True
        if policy.is_normal_slot_candidate(card, "Psychic"):
            cards.append(card)
    return base.dedupe_cards(cards)


def fetch_cards_with_curated_rush_supplement(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    standard_cards = policy._ORIGINAL_FETCH_ALL_CARDS(timeout=timeout, retries=retries)
    rush_cards = fetch_curated_rush_normals(timeout=timeout, retries=retries)
    return base.dedupe_cards([*standard_cards, *rush_cards])


def build_selection_document(cards: Sequence[dict[str, Any]]) -> dict[str, Any]:
    document = policy.build_selection_document(cards)
    card_by_id = {int(card["id"]): card for card in cards}
    for row in document["cards"]:
        card = card_by_id[int(row["id"])]
        if card.get("_monster_impact_image_requires_crop"):
            row["image_source_url"] = row["image_url_cropped"]
            row["image_url_cropped"] = None
            row["art_status"] = "pending-clean-cropped-art"
        else:
            row["art_status"] = "ready"
    return document


def iter_clean_artworks(card: dict[str, Any], *, all_artworks: bool):
    if card.get("_monster_impact_image_requires_crop"):
        return iter(())
    return base._ORIGINAL_ITER_ARTWORKS(card, all_artworks=all_artworks)


def main(argv: Sequence[str] | None = None) -> int:
    base.TOTAL_MONSTERS = policy.TOTAL_MONSTERS
    base.TOTAL_PROTOTYPE_CARDS = policy.TOTAL_PROTOTYPE_CARDS
    base.fetch_all_cards = fetch_cards_with_curated_rush_supplement
    base.select_prototype_pool = policy.select_prototype_pool
    if not hasattr(base, "_ORIGINAL_ITER_ARTWORKS"):
        base._ORIGINAL_ITER_ARTWORKS = base.iter_artworks
    base.iter_artworks = iter_clean_artworks
    base.build_selection_document = build_selection_document
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
