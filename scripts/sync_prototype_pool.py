#!/usr/bin/env python3
"""Aplica a política de conteúdo do primeiro protótipo ao downloader de artes.

Escopo atual:
- mantém os 66 slots não-Normal anteriores por RACE (15 Beast, 15 Psychic,
  18 Fiend, 18 Spellcaster);
- adiciona 10 Normal Monsters por RACE, somente Níveis 2 a 4;
- exclui qualquer MONSTRO cujo campo `archetype` da API esteja preenchido;
- Beast, Fiend e Spellcaster reservam 1 Ritual Monster sem arquétipo;
- Psychic reserva 2 monstros não-Normal sem arquétipo de maior Nível;
- o catálogo Rush Duel pode complementar SOMENTE os slots Normal Nível 2-4;
- Ritual Spells permanecem genéricas no Monster Impact.

Magias e Armadilhas não são filtradas por arquétipo nesta etapa.
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

CORE_NON_NORMAL_QUOTAS: dict[str, int] = dict(base.PROTOTYPE_MONSTER_QUOTAS)
NORMAL_TARGET_PER_RACE = 10
NORMAL_LEVEL_MIN = 2
NORMAL_LEVEL_MAX = 4
PSYCHIC_HIGH_LEVEL_TARGET = 2
RITUAL_TARGET_PER_RACE = 1
RITUAL_TARGET_RACES = ("Beast", "Fiend", "Spellcaster")
RITUAL_SPELL_COMPATIBILITY = "generic-any-ritual-monster"
MONSTER_ARCHETYPE_POLICY = "exclude-any-monster-with-nonempty-api-archetype"
NORMAL_SOURCE_POLICY = "standard-catalog-plus-rush-duel-normal-only-supplement"
RUSH_DUEL_FORMAT = "Rush Duel"

TOTAL_MONSTER_QUOTAS = {
    race: quota + NORMAL_TARGET_PER_RACE
    for race, quota in CORE_NON_NORMAL_QUOTAS.items()
}
TOTAL_MONSTERS = sum(TOTAL_MONSTER_QUOTAS.values())
TOTAL_PROTOTYPE_CARDS = TOTAL_MONSTERS + base.TOTAL_SPELLS + base.TOTAL_TRAPS

_ORIGINAL_BUILD_SELECTION_DOCUMENT = base.build_selection_document
_ORIGINAL_FETCH_ALL_CARDS = base.fetch_all_cards


def has_named_archetype(card: dict[str, Any]) -> bool:
    return bool(str(card.get("archetype") or "").strip())


def is_normal_slot_candidate(card: dict[str, Any], race: str | None = None) -> bool:
    if not base.card_is_supported(card):
        return False
    if card.get("type") not in base.NORMAL_MONSTER_API_TYPES:
        return False
    card_race = str(card.get("race", ""))
    if race is not None and card_race != race:
        return False
    if card_race not in CORE_NON_NORMAL_QUOTAS:
        return False
    if has_named_archetype(card):
        return False
    level = card.get("level")
    return (
        isinstance(level, int)
        and not isinstance(level, bool)
        and NORMAL_LEVEL_MIN <= level <= NORMAL_LEVEL_MAX
    )


def fetch_cards_with_rush_normal_supplement(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    standard_cards = _ORIGINAL_FETCH_ALL_CARDS(timeout=timeout, retries=retries)
    rush_payload = base._request_json(
        base._api_url({"format": RUSH_DUEL_FORMAT}),
        timeout=timeout,
        retries=retries,
    )
    rush_cards = rush_payload.get("data", [])
    if not isinstance(rush_cards, list):
        raise base.DownloaderError("Resposta inesperada do catálogo Rush Duel: campo 'data' inválido.")

    supplement: list[dict[str, Any]] = []
    for card in rush_cards:
        if not isinstance(card, dict) or not is_normal_slot_candidate(card):
            continue
        tagged = dict(card)
        tagged["_monster_impact_source"] = "rush-duel"
        supplement.append(tagged)

    return base.dedupe_cards([*standard_cards, *supplement])


def _eligible_monster_for_race(card: dict[str, Any], race: str) -> bool:
    return (
        card.get("type") in base.ALLOWED_MONSTER_API_TYPES
        and str(card.get("race", "")) == race
        and not has_named_archetype(card)
    )


def _normal_candidates(
    compatible: Sequence[dict[str, Any]], race: str
) -> list[dict[str, Any]]:
    return sorted(
        (card for card in compatible if is_normal_slot_candidate(card, race)),
        key=base.deterministic_card_key,
    )


def _non_normal_candidates(
    compatible: Sequence[dict[str, Any]], race: str
) -> list[dict[str, Any]]:
    return sorted(
        (
            card
            for card in compatible
            if _eligible_monster_for_race(card, race)
            and card.get("type") not in base.NORMAL_MONSTER_API_TYPES
        ),
        key=base.deterministic_card_key,
    )


def _high_level_key(card: dict[str, Any]) -> tuple[int, str, int]:
    level = card.get("level")
    safe_level = int(level) if isinstance(level, int) and not isinstance(level, bool) else -1
    return (-safe_level, str(card.get("name", "")).casefold(), int(card.get("id", 0)))


def _select_non_normal_for_race(
    compatible: Sequence[dict[str, Any]], race: str, quota: int
) -> list[dict[str, Any]]:
    candidates = _non_normal_candidates(compatible, race)
    reserved: list[dict[str, Any]] = []
    reserved_ids: set[int] = set()

    if race in RITUAL_TARGET_RACES:
        rituals = [card for card in candidates if card.get("type") in base.RITUAL_MONSTER_API_TYPES]
        if len(rituals) < RITUAL_TARGET_PER_RACE:
            raise base.DownloaderError(
                f"Ritual sem arquétipo obrigatório ausente para {race}: "
                f"necessário {RITUAL_TARGET_PER_RACE}, encontrado {len(rituals)}."
            )
        chosen = rituals[:RITUAL_TARGET_PER_RACE]
        reserved.extend(chosen)
        reserved_ids.update(int(card["id"]) for card in chosen)

    if race == "Psychic":
        high_level = sorted(
            (card for card in candidates if int(card["id"]) not in reserved_ids),
            key=_high_level_key,
        )
        if len(high_level) < PSYCHIC_HIGH_LEVEL_TARGET:
            raise base.DownloaderError(
                f"Pool Psychic insuficiente para {PSYCHIC_HIGH_LEVEL_TARGET} reservas de alto Nível."
            )
        chosen = high_level[:PSYCHIC_HIGH_LEVEL_TARGET]
        reserved.extend(chosen)
        reserved_ids.update(int(card["id"]) for card in chosen)

    remaining_needed = quota - len(reserved)
    fillers = [card for card in candidates if int(card["id"]) not in reserved_ids]
    if len(fillers) < remaining_needed:
        raise base.DownloaderError(
            f"Pool não-Normal sem arquétipo insuficiente para {race}: "
            f"necessários {remaining_needed}, encontrados {len(fillers)}."
        )

    selected = reserved + fillers[:remaining_needed]
    if len(selected) != quota:
        raise base.DownloaderError(
            f"Seleção não-Normal inválida para {race}: esperado {quota}, obtido {len(selected)}."
        )
    return selected


def _select_normals_for_race(
    compatible: Sequence[dict[str, Any]], race: str
) -> list[dict[str, Any]]:
    candidates = _normal_candidates(compatible, race)
    if len(candidates) < NORMAL_TARGET_PER_RACE:
        raise base.DownloaderError(
            f"Pool de Normal Monsters sem arquétipo insuficiente para {race} entre Níveis "
            f"{NORMAL_LEVEL_MIN}-{NORMAL_LEVEL_MAX}: necessários {NORMAL_TARGET_PER_RACE}, "
            f"encontrados {len(candidates)}."
        )
    return candidates[:NORMAL_TARGET_PER_RACE]


def select_prototype_pool(cards: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    compatible = [card for card in base.dedupe_cards(cards) if base.card_is_supported(card)]
    selected: list[dict[str, Any]] = []

    for race, non_normal_quota in CORE_NON_NORMAL_QUOTAS.items():
        selected.extend(_select_non_normal_for_race(compatible, race, non_normal_quota))
        selected.extend(_select_normals_for_race(compatible, race))

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

    if len(selected) != TOTAL_PROTOTYPE_CARDS:
        raise base.DownloaderError(
            f"Seleção interna inválida: esperado {TOTAL_PROTOTYPE_CARDS}, obtido {len(selected)}."
        )
    return selected


def build_selection_document(cards: Sequence[dict[str, Any]]) -> dict[str, Any]:
    document = _ORIGINAL_BUILD_SELECTION_DOCUMENT(cards)
    card_by_id = {int(card["id"]): card for card in cards}

    for row in document["cards"]:
        card = card_by_id[int(row["id"])]
        archetype = str(card.get("archetype") or "").strip() or None
        row["archetype"] = archetype
        row["selection_source"] = str(card.get("_monster_impact_source") or "standard")

    monster_cards = [
        card for card in cards if card.get("type") not in {"Spell Card", "Trap Card"}
    ]
    normal_cards = [
        card for card in monster_cards if card.get("type") in base.NORMAL_MONSTER_API_TYPES
    ]
    normal_counts = Counter(str(card.get("race", "")) for card in normal_cards)
    non_normal_counts = Counter(
        str(card.get("race", ""))
        for card in monster_cards
        if card.get("type") not in base.NORMAL_MONSTER_API_TYPES
    )
    ritual_counts = Counter(
        str(card.get("race", ""))
        for card in monster_cards
        if card.get("type") in base.RITUAL_MONSTER_API_TYPES
    )
    normal_source_counts = Counter(
        str(card.get("_monster_impact_source") or "standard") for card in normal_cards
    )

    psychic_non_normals = sorted(
        (
            card
            for card in monster_cards
            if str(card.get("race", "")) == "Psychic"
            and card.get("type") not in base.NORMAL_MONSTER_API_TYPES
        ),
        key=_high_level_key,
    )
    psychic_reserved = psychic_non_normals[:PSYCHIC_HIGH_LEVEL_TARGET]

    selected_archetyped_monsters = [card for card in monster_cards if has_named_archetype(card)]
    if selected_archetyped_monsters:
        names = ", ".join(str(card.get("name", card.get("id"))) for card in selected_archetyped_monsters)
        raise base.DownloaderError(f"Seleção contém monstros com arquétipo proibido: {names}")

    document["selection_rule"] = (
        "deterministic-name-id-archetype-free-with-10-normals-level-2-4-per-race"
    )
    document["requested"]["monster_races"] = TOTAL_MONSTER_QUOTAS
    document["requested"]["core_non_normal_quotas"] = CORE_NON_NORMAL_QUOTAS
    document["requested"]["normal_monsters_per_race"] = NORMAL_TARGET_PER_RACE
    document["requested"]["normal_monster_level_range"] = [NORMAL_LEVEL_MIN, NORMAL_LEVEL_MAX]
    document["requested"]["monster_archetype_policy"] = MONSTER_ARCHETYPE_POLICY
    document["requested"]["normal_source_policy"] = NORMAL_SOURCE_POLICY
    document["requested"]["ritual_monster_target_per_race"] = RITUAL_TARGET_PER_RACE
    document["requested"]["ritual_monster_target_races"] = list(RITUAL_TARGET_RACES)
    document["requested"]["ritual_spell_compatibility"] = RITUAL_SPELL_COMPATIBILITY
    document["requested"]["psychic_high_level_target"] = PSYCHIC_HIGH_LEVEL_TARGET
    document["requested"]["psychic_high_level_rule"] = "highest-level-then-name-id"

    document["summary"]["normal_monsters_by_race"] = {
        race: normal_counts.get(race, 0) for race in CORE_NON_NORMAL_QUOTAS
    }
    document["summary"]["non_normal_monsters_by_race"] = {
        race: non_normal_counts.get(race, 0) for race in CORE_NON_NORMAL_QUOTAS
    }
    document["summary"]["normal_monsters_by_source"] = dict(sorted(normal_source_counts.items()))
    document["summary"]["ritual_monsters_by_race"] = {
        race: ritual_counts.get(race, 0) for race in CORE_NON_NORMAL_QUOTAS
    }
    document["summary"]["archetyped_monsters_selected"] = 0
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
    base.TOTAL_MONSTERS = TOTAL_MONSTERS
    base.TOTAL_PROTOTYPE_CARDS = TOTAL_PROTOTYPE_CARDS
    base.fetch_all_cards = fetch_cards_with_rush_normal_supplement
    base.select_prototype_pool = select_prototype_pool
    base.build_selection_document = build_selection_document
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
