#!/usr/bin/env python3
"""Aplica a política de conteúdo do primeiro protótipo ao downloader de artes.

A seleção mantém as cotas de RACE do pool. Beast, Fiend e Spellcaster reservam
exatamente 1 Ritual Monster. Psychic não possui Ritual Monster oficial no
catálogo atual; em seu lugar, 2 dos 15 slots Psychic são reservados aos dois
maiores Níveis disponíveis entre os monstros compatíveis dessa RACE.

"Alto nível" aqui é somente uma regra técnica de seleção: ordenar por Nível
decrescente e desempatar por nome + ID. Isso não cria uma categoria ou limiar
de gameplay no Monster Impact.

As Ritual Spells do pool são genéricas no Monster Impact: não existe vínculo de
nome entre uma Ritual Spell específica e um Ritual Monster específico.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import baixar_artes as base

RITUAL_TARGET_PER_RACE = 1
RITUAL_TARGET_RACES = frozenset({"Beast", "Fiend", "Spellcaster"})
PSYCHIC_HIGH_LEVEL_TARGET = 2
PSYCHIC_HIGH_LEVEL_RULE = "highest-level-then-name-id"
RITUAL_SPELL_COMPATIBILITY = "generic-any-ritual-monster"

_ORIGINAL_BUILD_SELECTION_DOCUMENT = base.build_selection_document


def _monster_candidates(
    compatible: Sequence[dict[str, Any]], race: str
) -> list[dict[str, Any]]:
    return sorted(
        (
            card
            for card in compatible
            if card.get("type") in base.ALLOWED_MONSTER_API_TYPES
            and str(card.get("race", "")) == race
        ),
        key=base.deterministic_card_key,
    )


def _high_level_key(card: dict[str, Any]) -> tuple[int, str, int]:
    level = card.get("level")
    normalized_level = level if isinstance(level, int) and not isinstance(level, bool) else -1
    name, card_id = base.deterministic_card_key(card)
    return (-normalized_level, name, card_id)


def _select_psychic_monsters(
    compatible: Sequence[dict[str, Any]], quota: int
) -> list[dict[str, Any]]:
    candidates = _monster_candidates(compatible, "Psychic")
    if len(candidates) < quota:
        raise base.DownloaderError(
            f"Pool insuficiente para Psychic: necessários {quota}, encontrados {len(candidates)}."
        )
    if len(candidates) < PSYCHIC_HIGH_LEVEL_TARGET:
        raise base.DownloaderError(
            "Pool insuficiente para reservar os monstros Psychic de maior Nível."
        )

    high_level = sorted(candidates, key=_high_level_key)[:PSYCHIC_HIGH_LEVEL_TARGET]
    reserved_ids = {int(card["id"]) for card in high_level}
    remaining = [card for card in candidates if int(card["id"]) not in reserved_ids]
    regular_needed = quota - PSYCHIC_HIGH_LEVEL_TARGET

    if len(remaining) < regular_needed:
        raise base.DownloaderError(
            f"Pool insuficiente para completar Psychic: necessários {regular_needed} adicionais, "
            f"encontrados {len(remaining)}."
        )

    selected = high_level + remaining[:regular_needed]
    if len(selected) != quota:
        raise base.DownloaderError(
            f"Seleção interna inválida para Psychic: esperado {quota}, obtido {len(selected)}."
        )
    return selected


def _select_monsters_for_race(
    compatible: Sequence[dict[str, Any]], race: str, quota: int
) -> list[dict[str, Any]]:
    if race == "Psychic":
        return _select_psychic_monsters(compatible, quota)

    candidates = _monster_candidates(compatible, race)
    if race not in RITUAL_TARGET_RACES:
        if len(candidates) < quota:
            raise base.DownloaderError(
                f"Pool insuficiente para {race}: necessários {quota}, encontrados {len(candidates)}."
            )
        return candidates[:quota]

    rituals = [card for card in candidates if card.get("type") in base.RITUAL_MONSTER_API_TYPES]
    non_rituals = [card for card in candidates if card.get("type") not in base.RITUAL_MONSTER_API_TYPES]

    if len(rituals) < RITUAL_TARGET_PER_RACE:
        raise base.DownloaderError(
            f"Ritual obrigatório ausente para {race}: nenhum Ritual Monster oficial compatível encontrado."
        )

    non_ritual_needed = quota - RITUAL_TARGET_PER_RACE
    if len(non_rituals) < non_ritual_needed:
        raise base.DownloaderError(
            f"Pool insuficiente para {race}: necessários {non_ritual_needed} monstros não-Ritual, "
            f"encontrados {len(non_rituals)}."
        )

    selected = rituals[:RITUAL_TARGET_PER_RACE] + non_rituals[:non_ritual_needed]
    if len(selected) != quota:
        raise base.DownloaderError(
            f"Seleção interna inválida para {race}: esperado {quota}, obtido {len(selected)}."
        )
    return selected


def select_prototype_pool(cards: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    compatible = [card for card in base.dedupe_cards(cards) if base.card_is_supported(card)]
    selected: list[dict[str, Any]] = []

    for race, quota in base.PROTOTYPE_MONSTER_QUOTAS.items():
        selected.extend(_select_monsters_for_race(compatible, race, quota))

    spell_candidates = sorted(
        (card for card in compatible if card.get("type") == "Spell Card"),
        key=base.deterministic_card_key,
    )
    used_spell_ids: set[int] = set()

    for subtype, quota in base.SPELL_SUBTYPE_QUOTAS.items():
        candidates = [
            card
            for card in spell_candidates
            if base.spell_subtype(card) == subtype and int(card["id"]) not in used_spell_ids
        ]
        if len(candidates) < quota:
            raise base.DownloaderError(
                f"Pool insuficiente para Magias {subtype}: necessárias {quota}, encontradas {len(candidates)}."
            )
        chosen = candidates[:quota]
        selected.extend(chosen)
        used_spell_ids.update(int(card["id"]) for card in chosen)

    general_spell_quota = base.TOTAL_SPELLS - sum(base.SPELL_SUBTYPE_QUOTAS.values())
    general_candidates = [
        card
        for card in spell_candidates
        if base.spell_subtype(card) in base.GENERAL_SPELL_SUBTYPES
        and int(card["id"]) not in used_spell_ids
    ]
    if len(general_candidates) < general_spell_quota:
        raise base.DownloaderError(
            f"Pool insuficiente para Magias gerais: necessárias {general_spell_quota}, "
            f"encontradas {len(general_candidates)}."
        )
    selected.extend(general_candidates[:general_spell_quota])

    trap_candidates = sorted(
        (card for card in compatible if card.get("type") == "Trap Card"),
        key=base.deterministic_card_key,
    )
    if len(trap_candidates) < base.TOTAL_TRAPS:
        raise base.DownloaderError(
            f"Pool insuficiente para Armadilhas: necessárias {base.TOTAL_TRAPS}, "
            f"encontradas {len(trap_candidates)}."
        )
    selected.extend(trap_candidates[: base.TOTAL_TRAPS])

    if len(selected) != base.TOTAL_PROTOTYPE_CARDS:
        raise base.DownloaderError(
            f"Seleção interna inválida: esperado {base.TOTAL_PROTOTYPE_CARDS}, obtido {len(selected)}."
        )
    return selected


def build_selection_document(cards: Sequence[dict[str, Any]]) -> dict[str, Any]:
    document = _ORIGINAL_BUILD_SELECTION_DOCUMENT(cards)
    ritual_counts = Counter(
        str(card.get("race", ""))
        for card in cards
        if card.get("type") in base.RITUAL_MONSTER_API_TYPES
    )
    psychic_cards = [
        card
        for card in cards
        if str(card.get("race", "")) == "Psychic"
        and card.get("type") in base.ALLOWED_MONSTER_API_TYPES
    ]
    psychic_reserved = sorted(psychic_cards, key=_high_level_key)[:PSYCHIC_HIGH_LEVEL_TARGET]

    document["selection_rule"] = "deterministic-name-id-with-rituals-and-psychic-high-level"
    document["requested"]["ritual_monster_target_per_race"] = RITUAL_TARGET_PER_RACE
    document["requested"]["ritual_monster_target_races"] = sorted(RITUAL_TARGET_RACES)
    document["requested"]["psychic_high_level_target"] = PSYCHIC_HIGH_LEVEL_TARGET
    document["requested"]["psychic_high_level_rule"] = PSYCHIC_HIGH_LEVEL_RULE
    document["requested"]["psychic_ritual_substitution"] = (
        "2 highest-level compatible Psychic monsters inside the existing 15-card Psychic quota"
    )
    document["requested"]["ritual_spell_compatibility"] = RITUAL_SPELL_COMPATIBILITY
    document["summary"]["ritual_monsters_by_race"] = {
        race: ritual_counts.get(race, 0)
        for race in base.PROTOTYPE_MONSTER_QUOTAS
    }
    document["summary"]["psychic_high_level_reserved"] = [
        {
            "id": int(card["id"]),
            "name": str(card.get("name", "")),
            "level": int(card["level"]),
            "prototype_type": base.prototype_type(card),
        }
        for card in psychic_reserved
    ]
    return document


def main(argv: Sequence[str] | None = None) -> int:
    base.select_prototype_pool = select_prototype_pool
    base.build_selection_document = build_selection_document
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
