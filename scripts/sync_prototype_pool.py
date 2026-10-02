#!/usr/bin/env python3
"""Aplica a política de conteúdo do primeiro protótipo ao downloader de artes.

Escopo atual:
- preserva 66 slots não-Normal por RACE (15 Beast, 15 Psychic, 18 Fiend,
  18 Spellcaster);
- adiciona 10 Normal Monsters por RACE, somente Níveis 2 a 4;
- prefere monstros sem arquétipo e permite no máximo 1 monstro por arquétipo
  nomeado em todo o pool;
- Beast, Fiend e Spellcaster reservam 1 Ritual Monster;
- Psychic reserva 2 monstros não-Normal de maior Nível;
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
MONSTER_ARCHETYPE_POLICY = "prefer-no-archetype-max-one-monster-per-named-archetype"
PSYCHIC_NORMAL_REPEATABLE_ARCHETYPES = frozenset({"Psychic Musician", "Shaman Bandit"})
NORMAL_SOURCE_POLICY = "ygoprodeck-primary-rushcard-psychic-normal-supplement"
RUSHCARD_SEARCH_URL = (
    "https://mail.rushcard.io/api/search.php?limit=100&race=Psychic"
    "&type=Normal%20Monster&sort=name"
)
SUPPLEMENT_SOURCE = "rushcard"

TOTAL_MONSTER_QUOTAS = {
    race: quota + NORMAL_TARGET_PER_RACE
    for race, quota in CORE_NON_NORMAL_QUOTAS.items()
}
TOTAL_MONSTERS = sum(TOTAL_MONSTER_QUOTAS.values())
TOTAL_PROTOTYPE_CARDS = TOTAL_MONSTERS + base.TOTAL_SPELLS + base.TOTAL_TRAPS

_ORIGINAL_BUILD_SELECTION_DOCUMENT = base.build_selection_document
_ORIGINAL_FETCH_ALL_CARDS = base.fetch_all_cards


def archetype_name(card: dict[str, Any]) -> str | None:
    value = str(card.get("archetype") or "").strip()
    return value or None


def has_named_archetype(card: dict[str, Any]) -> bool:
    return archetype_name(card) is not None


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
    level = card.get("level")
    return (
        isinstance(level, int)
        and not isinstance(level, bool)
        and NORMAL_LEVEL_MIN <= level <= NORMAL_LEVEL_MAX
    )


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
        if is_normal_slot_candidate(card, "Psychic"):
            cards.append(card)
    return base.dedupe_cards(cards)


def fetch_cards_with_rush_normal_supplement(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    standard_cards = _ORIGINAL_FETCH_ALL_CARDS(timeout=timeout, retries=retries)
    rush_cards = fetch_curated_rush_normals(timeout=timeout, retries=retries)
    return base.dedupe_cards([*standard_cards, *rush_cards])


fetch_cards_with_curated_rush_supplement = fetch_cards_with_rush_normal_supplement


def _eligible_monster_for_race(card: dict[str, Any], race: str) -> bool:
    return (
        card.get("type") in base.ALLOWED_MONSTER_API_TYPES
        and str(card.get("race", "")) == race
    )


def _prefer_no_archetype_key(card: dict[str, Any]) -> tuple[int, str, int]:
    return (
        1 if has_named_archetype(card) else 0,
        str(card.get("name", "")).casefold(),
        int(card.get("id", 0)),
    )


def _high_level_key(card: dict[str, Any]) -> tuple[int, int, str, int]:
    level = card.get("level")
    safe_level = int(level) if isinstance(level, int) and not isinstance(level, bool) else -1
    return (
        -safe_level,
        1 if has_named_archetype(card) else 0,
        str(card.get("name", "")).casefold(),
        int(card.get("id", 0)),
    )


def _archetype_available(card: dict[str, Any], used_archetypes: set[str]) -> bool:
    archetype = archetype_name(card)
    return archetype is None or archetype.casefold() not in used_archetypes


def _record_archetype(card: dict[str, Any], used_archetypes: set[str]) -> None:
    archetype = archetype_name(card)
    if archetype is not None:
        used_archetypes.add(archetype.casefold())


def _choose_unique(
    candidates: Iterable[dict[str, Any]],
    count: int,
    used_archetypes: set[str],
    *,
    context: str,
) -> list[dict[str, Any]]:
    chosen: list[dict[str, Any]] = []
    for card in candidates:
        if not _archetype_available(card, used_archetypes):
            continue
        chosen.append(card)
        _record_archetype(card, used_archetypes)
        if len(chosen) >= count:
            break
    if len(chosen) < count:
        raise base.DownloaderError(
            f"Pool insuficiente para {context}: necessários {count}, encontrados {len(chosen)} "
            "após aplicar unicidade de arquétipo."
        )
    return chosen


def _non_normal_candidates(compatible: Sequence[dict[str, Any]], race: str) -> list[dict[str, Any]]:
    return sorted(
        (
            card
            for card in compatible
            if _eligible_monster_for_race(card, race)
            and card.get("type") not in base.NORMAL_MONSTER_API_TYPES
        ),
        key=_prefer_no_archetype_key,
    )


def _normal_candidates(compatible: Sequence[dict[str, Any]], race: str) -> list[dict[str, Any]]:
    return sorted(
        (card for card in compatible if is_normal_slot_candidate(card, race)),
        key=_prefer_no_archetype_key,
    )


def _select_non_normal_for_race(
    compatible: Sequence[dict[str, Any]],
    race: str,
    quota: int,
    used_archetypes: set[str],
) -> list[dict[str, Any]]:
    candidates = _non_normal_candidates(compatible, race)
    reserved: list[dict[str, Any]] = []
    reserved_ids: set[int] = set()

    if race in RITUAL_TARGET_RACES:
        rituals = sorted(
            (card for card in candidates if card.get("type") in base.RITUAL_MONSTER_API_TYPES),
            key=_prefer_no_archetype_key,
        )
        chosen = _choose_unique(
            rituals,
            RITUAL_TARGET_PER_RACE,
            used_archetypes,
            context=f"Ritual Monster de {race}",
        )
        reserved.extend(chosen)
        reserved_ids.update(int(card["id"]) for card in chosen)

    if race == "Psychic":
        high_level = sorted(
            (card for card in candidates if int(card["id"]) not in reserved_ids),
            key=_high_level_key,
        )
        chosen = _choose_unique(
            high_level,
            PSYCHIC_HIGH_LEVEL_TARGET,
            used_archetypes,
            context="reservas Psychic de maior Nível",
        )
        reserved.extend(chosen)
        reserved_ids.update(int(card["id"]) for card in chosen)

    fillers = [
        card
        for card in sorted(candidates, key=_prefer_no_archetype_key)
        if int(card["id"]) not in reserved_ids
    ]
    selected = reserved + _choose_unique(
        fillers,
        quota - len(reserved),
        used_archetypes,
        context=f"slots não-Normal de {race}",
    )
    if len(selected) != quota:
        raise base.DownloaderError(
            f"Seleção não-Normal inválida para {race}: esperado {quota}, obtido {len(selected)}."
        )
    return selected


def _select_normals_for_race(
    compatible: Sequence[dict[str, Any]],
    race: str,
    used_archetypes: set[str],
) -> list[dict[str, Any]]:
    candidates = _normal_candidates(compatible, race)
    chosen: list[dict[str, Any]] = []
    for card in candidates:
        if not _archetype_available(card, used_archetypes):
            continue
        chosen.append(card)
        _record_archetype(card, used_archetypes)
        if len(chosen) == NORMAL_TARGET_PER_RACE:
            return chosen

    if race == "Psychic":
        chosen_ids = {int(card["id"]) for card in chosen}
        for card in candidates:
            if int(card["id"]) in chosen_ids:
                continue
            if str(card.get("_monster_impact_source")) != "rushcard":
                continue
            if archetype_name(card) not in PSYCHIC_NORMAL_REPEATABLE_ARCHETYPES:
                continue
            chosen.append(card)
            chosen_ids.add(int(card["id"]))
            if len(chosen) == NORMAL_TARGET_PER_RACE:
                return chosen

    raise base.DownloaderError(
        f"Pool insuficiente para Normal Monsters {race} Níveis {NORMAL_LEVEL_MIN}-{NORMAL_LEVEL_MAX}: "
        f"necessários {NORMAL_TARGET_PER_RACE}, encontrados {len(chosen)} após aplicar a política de arquétipos."
    )


def select_prototype_pool(cards: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    compatible = [card for card in base.dedupe_cards(cards) if base.card_is_supported(card)]
    selected: list[dict[str, Any]] = []
    used_archetypes: set[str] = set()

    for race, non_normal_quota in CORE_NON_NORMAL_QUOTAS.items():
        selected.extend(
            _select_non_normal_for_race(compatible, race, non_normal_quota, used_archetypes)
        )
    for race in CORE_NON_NORMAL_QUOTAS:
        selected.extend(_select_normals_for_race(compatible, race, used_archetypes))

    spell_candidates = sorted(
        (card for card in compatible if card.get("type") == "Spell Card"),
        key=base.deterministic_card_key,
    )
    used_spell_ids: set[int] = set()
    for subtype, quota in base.SPELL_SUBTYPE_QUOTAS.items():
        candidates = [
            card for card in spell_candidates
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
        card for card in spell_candidates
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
            f"Pool insuficiente para Armadilhas: necessárias {base.TOTAL_TRAPS}, encontradas {len(trap_candidates)}."
        )
    selected.extend(trap_candidates[:base.TOTAL_TRAPS])

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
        row["archetype"] = archetype_name(card)
        row["selection_source"] = str(card.get("_monster_impact_source") or "standard")
        if card.get("_monster_impact_image_requires_crop"):
            row["image_source_url"] = row["image_url_cropped"]
            row["image_url_cropped"] = None
            row["art_status"] = "pending-clean-cropped-art"
        else:
            row["art_status"] = "ready" 

    monster_cards = [card for card in cards if card.get("type") not in {"Spell Card", "Trap Card"}]
    normal_cards = [card for card in monster_cards if card.get("type") in base.NORMAL_MONSTER_API_TYPES]
    normal_counts = Counter(str(card.get("race", "")) for card in normal_cards)
    non_normal_counts = Counter(
        str(card.get("race", "")) for card in monster_cards
        if card.get("type") not in base.NORMAL_MONSTER_API_TYPES
    )
    ritual_counts = Counter(
        str(card.get("race", "")) for card in monster_cards
        if card.get("type") in base.RITUAL_MONSTER_API_TYPES
    )
    normal_source_counts = Counter(
        str(card.get("_monster_impact_source") or "standard") for card in normal_cards
    )
    archetype_counts = Counter(
        archetype_name(card) for card in monster_cards if archetype_name(card) is not None
    )
    duplicated = {name: count for name, count in archetype_counts.items() if count > 1}
    disallowed_duplicates = {
        name: count for name, count in duplicated.items()
        if name not in PSYCHIC_NORMAL_REPEATABLE_ARCHETYPES
    }
    if disallowed_duplicates:
        raise base.DownloaderError(f"Seleção contém arquétipos repetidos fora da exceção: {disallowed_duplicates}")

    psychic_non_normals = sorted(
        (
            card for card in monster_cards
            if str(card.get("race", "")) == "Psychic"
            and card.get("type") not in base.NORMAL_MONSTER_API_TYPES
        ),
        key=_high_level_key,
    )

    document["selection_rule"] = (
        "deterministic-prefer-no-archetype-with-authorized-psychic-rushcard-archetype-exception"
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
    document["requested"]["psychic_high_level_rule"] = "highest-level-then-prefer-no-archetype-then-name-id"

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
    document["summary"]["archetyped_monsters_selected"] = sum(archetype_counts.values())
    document["summary"]["named_archetypes_selected"] = dict(sorted(archetype_counts.items()))
    document["requested"]["psychic_normal_repeatable_archetypes"] = sorted(PSYCHIC_NORMAL_REPEATABLE_ARCHETYPES)
    document["summary"]["duplicated_named_archetypes"] = dict(sorted(duplicated.items()))
    document["summary"]["psychic_high_level_reserved"] = [
        {
            "id": int(card["id"]),
            "name": str(card.get("name", "")),
            "level": int(card["level"]),
            "prototype_type": base.prototype_type(card),
            "archetype": archetype_name(card),
        }
        for card in psychic_non_normals[:PSYCHIC_HIGH_LEVEL_TARGET]
    ]
    return document


def iter_clean_artworks(card: dict[str, Any], *, all_artworks: bool):
    if card.get("_monster_impact_image_requires_crop"):
        return iter(())
    if not hasattr(base, "_ORIGINAL_ITER_ARTWORKS"):
        base._ORIGINAL_ITER_ARTWORKS = base.iter_artworks
    return base._ORIGINAL_ITER_ARTWORKS(card, all_artworks=all_artworks)


def main(argv: Sequence[str] | None = None) -> int:
    base.TOTAL_MONSTERS = TOTAL_MONSTERS
    base.TOTAL_PROTOTYPE_CARDS = TOTAL_PROTOTYPE_CARDS
    base.fetch_all_cards = fetch_cards_with_rush_normal_supplement
    base.select_prototype_pool = select_prototype_pool
    if not hasattr(base, "_ORIGINAL_ITER_ARTWORKS"):
        base._ORIGINAL_ITER_ARTWORKS = base.iter_artworks
    base.iter_artworks = iter_clean_artworks
    base.build_selection_document = build_selection_document
    return base.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
