#!/usr/bin/env python3
"""Baixa artes oficiais para o pool atual do primeiro protótipo de Monster Impact.

Regras atuais do pool automático:
- 15 Beast;
- 15 Psychic;
- 18 Fiend;
- 18 Spellcaster;
- apenas monstros Normal, Effect, Ritual e Fusion;
- 20 Magias: 2 Field, 2 Ritual, 5 Equip e 11 gerais (Normal/Quick-Play/Continuous);
- 10 Armadilhas de qualquer subtipo;
- seleção determinística por nome + ID;
- somente cartas com image_url_cropped disponível entram na seleção;
- grava selection.json com nome, ID, RACE, tipo e Nível;
- usa image_url_cropped e não faz hotlink em runtime.

O downloader preserva modos manuais por nome/ID/RACE para inspeção e coleta pontual.
Somente biblioteca padrão do Python é utilizada.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
CARDSETS_URL = "https://db.ygoprodeck.com/api/v7/cardsets.php"
DEFAULT_OUTPUT = Path("assets-local/card-art")
USER_AGENT = "Monster-Impact-Art-Downloader/2.0 (+https://github.com/Ziaker/YGO-Impact)"

PROJECT_PRIORITY_RACES = (
    "Aqua",
    "Beast",
    "Dragon",
    "Fairy",
    "Fiend",
    "Fish",
    "Insect",
    "Machine",
    "Plant",
    "Psychic",
    "Pyro",
    "Rock",
    "Spellcaster",
    "Thunder",
    "Warrior",
    "Winged Beast",
    "Zombie",
)

PROTOTYPE_MONSTER_QUOTAS: dict[str, int] = {
    "Beast": 15,
    "Psychic": 15,
    "Fiend": 18,
    "Spellcaster": 18,
}

SPELL_SUBTYPE_QUOTAS: dict[str, int] = {
    "Field": 2,
    "Ritual": 2,
    "Equip": 5,
}
GENERAL_SPELL_SUBTYPES = frozenset({"Normal", "Quick-Play", "Continuous"})
TOTAL_SPELLS = 20
TOTAL_TRAPS = 10
TOTAL_MONSTERS = sum(PROTOTYPE_MONSTER_QUOTAS.values())
TOTAL_PROTOTYPE_CARDS = TOTAL_MONSTERS + TOTAL_SPELLS + TOTAL_TRAPS

FORBIDDEN_TYPE_TOKENS = ("synchro", "xyz", "pendulum", "link")
FORBIDDEN_EXACT_TYPES = {"Token", "Skill Card"}
NORMAL_MONSTER_API_TYPES = frozenset({"Normal Monster"})
FUSION_MONSTER_API_TYPES = frozenset({"Fusion Monster"})
RITUAL_MONSTER_API_TYPES = frozenset({"Ritual Monster", "Ritual Effect Monster"})
EFFECT_MONSTER_API_TYPES = frozenset(
    {
        "Effect Monster",
        "Flip Effect Monster",
        "Toon Monster",
        "Spirit Monster",
        "Union Effect Monster",
        "Gemini Monster",
    }
)
ALLOWED_MONSTER_API_TYPES = (
    NORMAL_MONSTER_API_TYPES
    | EFFECT_MONSTER_API_TYPES
    | RITUAL_MONSTER_API_TYPES
    | FUSION_MONSTER_API_TYPES
)


class DownloaderError(RuntimeError):
    """Erro esperado e apresentável do downloader."""


@dataclass(frozen=True)
class Target:
    kind: str  # "name" ou "id"
    value: str


@dataclass(frozen=True)
class Artwork:
    card_id: int
    image_id: int
    card_name: str
    api_type: str
    prototype_type: str
    race: str
    level: int | None
    url: str
    relative_path: Path


def _request_json_value(url: str, *, timeout: float, retries: int) -> Any:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urlopen(request, timeout=timeout) as response:
                payload = response.read()
            return json.loads(payload.decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt >= retries:
                break
            time.sleep(min(2**attempt, 4))
    raise DownloaderError(f"Falha ao consultar a API: {last_error}")


def _request_json(url: str, *, timeout: float, retries: int) -> dict[str, Any]:
    data = _request_json_value(url, timeout=timeout, retries=retries)
    if not isinstance(data, dict):
        raise DownloaderError("Resposta inesperada da API: objeto JSON esperado.")
    return data


def _api_url(params: dict[str, str] | None = None) -> str:
    if not params:
        return API_URL
    return f"{API_URL}?{urlencode(params)}"


def fetch_cards_for_target(target: Target, *, timeout: float, retries: int) -> list[dict[str, Any]]:
    params = {"id" if target.kind == "id" else "name": target.value}
    try:
        payload = _request_json(_api_url(params), timeout=timeout, retries=retries)
    except DownloaderError as exc:
        raise DownloaderError(f"Não foi possível localizar {target.kind}={target.value!r}: {exc}") from exc
    cards = payload.get("data", [])
    if not isinstance(cards, list):
        raise DownloaderError("Resposta inesperada da API: campo 'data' inválido.")
    if target.kind == "name":
        exact = [card for card in cards if str(card.get("name", "")).casefold() == target.value.casefold()]
        if not exact:
            raise DownloaderError(f"Nome exato não encontrado: {target.value}")
        return exact
    return cards


def fetch_all_cards(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    payload = _request_json(API_URL, timeout=timeout, retries=retries)
    cards = payload.get("data", [])
    if not isinstance(cards, list):
        raise DownloaderError("Resposta inesperada da API: campo 'data' inválido.")
    return cards


def normalize_race(value: str) -> str:
    wanted = value.strip().casefold()
    for race in PROTOTYPE_MONSTER_QUOTAS:
        if race.casefold() == wanted:
            return race
    allowed = ", ".join(PROTOTYPE_MONSTER_QUOTAS)
    raise argparse.ArgumentTypeError(f"RACE fora do pool ativo do protótipo: {value}. Use: {allowed}.")


def clean_component(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).strip()
    value = re.sub(r'[\\/:*?"<>|]+', "_", value)
    value = re.sub(r"\s+", " ", value)
    value = value.rstrip(" .")
    return value or "Sem nome"


def slug_filename(value: str) -> str:
    value = clean_component(value)
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    ascii_value = re.sub(r"[^A-Za-z0-9._ -]+", "", ascii_value)
    ascii_value = re.sub(r"[ _]+", "-", ascii_value).strip("-.").lower()
    return ascii_value or "card"


def primary_cropped_url(card: dict[str, Any]) -> str | None:
    images = card.get("card_images") or []
    if not isinstance(images, list):
        return None
    for image in images:
        if isinstance(image, dict) and image.get("image_url_cropped"):
            return str(image["image_url_cropped"])
    return None


def monster_family(card_type: str) -> str | None:
    if card_type in NORMAL_MONSTER_API_TYPES:
        return "Normal"
    if card_type in EFFECT_MONSTER_API_TYPES:
        return "Efeito"
    if card_type in RITUAL_MONSTER_API_TYPES:
        return "Ritual"
    if card_type in FUSION_MONSTER_API_TYPES:
        return "Fusion"
    return None


def card_is_supported(card: dict[str, Any]) -> bool:
    card_type = str(card.get("type", ""))
    lowered = card_type.casefold()
    if card_type in FORBIDDEN_EXACT_TYPES:
        return False
    if "match winner" in lowered or any(token in lowered for token in FORBIDDEN_TYPE_TOKENS):
        return False
    if card_type in {"Spell Card", "Trap Card"}:
        return primary_cropped_url(card) is not None
    if card_type not in ALLOWED_MONSTER_API_TYPES:
        return False
    if str(card.get("race", "")) not in PROTOTYPE_MONSTER_QUOTAS:
        return False
    level = card.get("level")
    return isinstance(level, int) and not isinstance(level, bool) and primary_cropped_url(card) is not None


def fetch_card_set_years(*, timeout: float, retries: int) -> dict[str, int]:
    payload = _request_json_value(CARDSETS_URL, timeout=timeout, retries=retries)
    if not isinstance(payload, list):
        raise DownloaderError("Resposta inesperada de cardsets.php: array JSON esperado.")
    years: dict[str, int] = {}
    for item in payload:
        if not isinstance(item, dict):
            continue
        name = item.get("set_name")
        date_text = item.get("tcg_date")
        if not name or not date_text:
            continue
        try:
            years[str(name)] = datetime.strptime(str(date_text), "%Y-%m-%d").year
        except ValueError:
            continue
    return years


def card_is_pre_2010(card: dict[str, Any], set_years: dict[str, int]) -> bool:
    for card_set in card.get("card_sets") or []:
        set_name = card_set.get("set_name")
        if set_name and set_years.get(str(set_name), 9999) < 2010:
            return True
    return False


def deterministic_card_key(card: dict[str, Any]) -> tuple[str, int]:
    return (str(card.get("name", "")).casefold(), int(card.get("id", 0)))


def spell_subtype(card: dict[str, Any]) -> str:
    return str(card.get("race", "")).strip()


def select_prototype_pool(cards: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    compatible = [card for card in dedupe_cards(cards) if card_is_supported(card)]

    selected: list[dict[str, Any]] = []

    for race, quota in PROTOTYPE_MONSTER_QUOTAS.items():
        candidates = sorted(
            (
                card
                for card in compatible
                if card.get("type") in ALLOWED_MONSTER_API_TYPES and str(card.get("race", "")) == race
            ),
            key=deterministic_card_key,
        )
        if len(candidates) < quota:
            raise DownloaderError(
                f"Pool insuficiente para {race}: necessários {quota}, encontrados {len(candidates)}."
            )
        selected.extend(candidates[:quota])

    spell_candidates = sorted(
        (card for card in compatible if card.get("type") == "Spell Card"),
        key=deterministic_card_key,
    )
    used_spell_ids: set[int] = set()

    for subtype, quota in SPELL_SUBTYPE_QUOTAS.items():
        candidates = [
            card
            for card in spell_candidates
            if spell_subtype(card) == subtype and int(card["id"]) not in used_spell_ids
        ]
        if len(candidates) < quota:
            raise DownloaderError(
                f"Pool insuficiente para Magias {subtype}: necessárias {quota}, encontradas {len(candidates)}."
            )
        chosen = candidates[:quota]
        selected.extend(chosen)
        used_spell_ids.update(int(card["id"]) for card in chosen)

    general_spell_quota = TOTAL_SPELLS - sum(SPELL_SUBTYPE_QUOTAS.values())
    general_candidates = [
        card
        for card in spell_candidates
        if spell_subtype(card) in GENERAL_SPELL_SUBTYPES and int(card["id"]) not in used_spell_ids
    ]
    if len(general_candidates) < general_spell_quota:
        raise DownloaderError(
            f"Pool insuficiente para Magias gerais: necessárias {general_spell_quota}, "
            f"encontradas {len(general_candidates)}."
        )
    chosen_general = general_candidates[:general_spell_quota]
    selected.extend(chosen_general)

    trap_candidates = sorted(
        (card for card in compatible if card.get("type") == "Trap Card"),
        key=deterministic_card_key,
    )
    if len(trap_candidates) < TOTAL_TRAPS:
        raise DownloaderError(
            f"Pool insuficiente para Armadilhas: necessárias {TOTAL_TRAPS}, encontradas {len(trap_candidates)}."
        )
    selected.extend(trap_candidates[:TOTAL_TRAPS])

    if len(selected) != TOTAL_PROTOTYPE_CARDS:
        raise DownloaderError(
            f"Seleção interna inválida: esperado {TOTAL_PROTOTYPE_CARDS}, obtido {len(selected)}."
        )
    return selected


def prototype_type(card: dict[str, Any]) -> str:
    card_type = str(card.get("type", ""))
    if card_type == "Spell Card":
        return "Magia"
    if card_type == "Trap Card":
        return "Armadilha"
    family = monster_family(card_type)
    if family is None:
        raise DownloaderError(f"Tipo de monstro sem classificação do protótipo: {card_type!r}")
    return family


def build_selection_document(cards: Sequence[dict[str, Any]]) -> dict[str, Any]:
    race_counts: Counter[str] = Counter()
    family_counts: Counter[str] = Counter()
    level_counts: Counter[int] = Counter()
    spell_counts: Counter[str] = Counter()
    trap_counts: Counter[str] = Counter()

    rows: list[dict[str, Any]] = []
    for card in cards:
        card_type = str(card.get("type", ""))
        proto_type = prototype_type(card)
        race = str(card.get("race", ""))
        level = card.get("level") if card_type not in {"Spell Card", "Trap Card"} else None

        if card_type == "Spell Card":
            spell_counts[race] += 1
            bucket = "spell"
        elif card_type == "Trap Card":
            trap_counts[race] += 1
            bucket = "trap"
        else:
            race_counts[race] += 1
            family_counts[proto_type] += 1
            if isinstance(level, int) and not isinstance(level, bool):
                level_counts[level] += 1
            bucket = "monster"

        rows.append(
            {
                "id": int(card["id"]),
                "name": str(card.get("name", "")),
                "bucket": bucket,
                "race": race,
                "api_type": card_type,
                "prototype_type": proto_type,
                "level": level,
                "image_url_cropped": primary_cropped_url(card),
            }
        )

    return {
        "schema_version": 1,
        "selection_rule": "deterministic-name-id",
        "requested": {
            "monster_races": PROTOTYPE_MONSTER_QUOTAS,
            "monster_types": ["Normal", "Efeito", "Ritual", "Fusion"],
            "spells_total": TOTAL_SPELLS,
            "spell_subtypes_exact": SPELL_SUBTYPE_QUOTAS,
            "spell_general_subtypes": sorted(GENERAL_SPELL_SUBTYPES),
            "traps_total": TOTAL_TRAPS,
        },
        "summary": {
            "total_cards": len(rows),
            "monsters_total": sum(race_counts.values()),
            "monsters_by_race": dict(sorted(race_counts.items())),
            "monsters_by_type": dict(sorted(family_counts.items())),
            "monsters_by_level": {str(level): level_counts[level] for level in sorted(level_counts)},
            "spells_total": sum(spell_counts.values()),
            "spells_by_subtype": dict(sorted(spell_counts.items())),
            "traps_total": sum(trap_counts.values()),
            "traps_by_subtype": dict(sorted(trap_counts.items())),
        },
        "cards": rows,
    }


def save_json(path: Path, data: dict[str, Any]) -> None:
    payload = (json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    write_atomic(path, payload)


def card_matches_races(card: dict[str, Any], races: set[str]) -> bool:
    if not races:
        return True
    return card.get("type") in ALLOWED_MONSTER_API_TYPES and str(card.get("race", "")) in races


def category_path(card: dict[str, Any]) -> Path:
    card_type = str(card.get("type", ""))
    race = clean_component(str(card.get("race", "Desconhecida")))

    if card_type == "Spell Card":
        return Path("Magias") / race
    if card_type == "Trap Card":
        return Path("Armadilhas") / race

    family = monster_family(card_type)
    if family is None:
        raise DownloaderError(f"Tipo não suportado para organização: {card_type!r}")
    return Path("Monstros") / race / family


def iter_artworks(card: dict[str, Any], *, all_artworks: bool) -> Iterator[Artwork]:
    card_id = int(card["id"])
    card_name = str(card.get("name", card_id))
    images = card.get("card_images") or []
    if not isinstance(images, list) or not images:
        return

    selected = images if all_artworks else images[:1]
    for index, image in enumerate(selected, start=1):
        url = image.get("image_url_cropped")
        if not url:
            continue
        image_id = int(image.get("id") or card_id)
        suffix = f"__art-{index}-{image_id}" if len(selected) > 1 else ""
        filename = f"{slug_filename(card_name)}__{card_id}{suffix}.jpg"
        card_type = str(card.get("type", ""))
        level = card.get("level") if card_type not in {"Spell Card", "Trap Card"} else None
        yield Artwork(
            card_id=card_id,
            image_id=image_id,
            card_name=card_name,
            api_type=card_type,
            prototype_type=prototype_type(card),
            race=str(card.get("race", "")),
            level=level if isinstance(level, int) and not isinstance(level, bool) else None,
            url=str(url),
            relative_path=category_path(card) / filename,
        )


def load_targets(path: Path) -> list[Target]:
    targets: list[Target] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            prefix, value = line.split(":", 1)
            prefix = prefix.strip().casefold()
            value = value.strip()
            if prefix not in {"name", "id"} or not value:
                raise DownloaderError(f"Linha {line_number} inválida em {path}: {raw!r}")
            targets.append(Target(prefix, value))
        elif line.isdigit():
            targets.append(Target("id", line))
        else:
            targets.append(Target("name", line))
    return targets


def collect_targets(args: argparse.Namespace) -> list[Target]:
    targets = [Target("name", value) for value in args.name]
    targets.extend(Target("id", str(value)) for value in args.id)
    if args.input:
        targets.extend(load_targets(args.input))

    deduped: list[Target] = []
    seen: set[tuple[str, str]] = set()
    for target in targets:
        key = (target.kind, target.value.casefold())
        if key not in seen:
            seen.add(key)
            deduped.append(target)
    return deduped


def dedupe_cards(cards: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[int] = set()
    for card in cards:
        try:
            card_id = int(card["id"])
        except (KeyError, TypeError, ValueError):
            continue
        if card_id not in seen:
            seen.add(card_id)
            result.append(card)
    return result


def download_bytes(url: str, *, timeout: float, retries: int) -> bytes:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
            with urlopen(request, timeout=timeout) as response:
                data = response.read()
            if not data:
                raise DownloaderError("arquivo de imagem vazio")
            return data
        except (HTTPError, URLError, TimeoutError, DownloaderError) as exc:
            last_error = exc
            if attempt >= retries:
                break
            time.sleep(min(2**attempt, 4))
    raise DownloaderError(f"Falha no download de {url}: {last_error}")


def write_atomic(path: Path, data: bytes) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(path.name + ".part")
    try:
        with temp_path.open("wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink()
    return hashlib.sha256(data).hexdigest()


def load_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"schema_version": 2, "files": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DownloaderError(f"Manifesto inválido em {path}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("files", {}), dict):
        raise DownloaderError(f"Manifesto inválido em {path}: estrutura inesperada.")
    data["schema_version"] = 2
    data.setdefault("files", {})
    return data


def save_manifest(path: Path, manifest: dict[str, Any]) -> None:
    save_json(path, manifest)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Seleciona e baixa image_url_cropped do YGOPRODeck para Monster Impact."
    )
    parser.add_argument(
        "--prototype-pool",
        action="store_true",
        help=f"seleciona o pool atual de {TOTAL_PROTOTYPE_CARDS} cartas do primeiro protótipo",
    )
    parser.add_argument("--name", action="append", default=[], metavar="NOME", help="nome exato; repetível")
    parser.add_argument("--id", action="append", default=[], type=int, metavar="ID", help="ID da carta; repetível")
    parser.add_argument("--input", type=Path, help="arquivo com nomes/IDs, um por linha")
    parser.add_argument("--race", action="append", default=[], type=normalize_race, help="RACE ativa; repetível")
    parser.add_argument(
        "--all-compatible",
        action="store_true",
        help="consulta todas as cartas compatíveis com o escopo ativo; use explicitamente",
    )
    parser.add_argument("--all-artworks", action="store_true", help="baixa todas as artes retornadas em card_images")
    parser.add_argument("--pre-2010", action="store_true", help="filtro TCG anterior a 2010; opcional")
    parser.add_argument("--dry-run", action="store_true", help="mostra o plano sem criar ou baixar arquivos")
    parser.add_argument("--force", action="store_true", help="sobrescreve imagens já existentes")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"destino (padrão: {DEFAULT_OUTPUT})")
    parser.add_argument("--selection", type=Path, help="caminho de selection.json; padrão: <output>/selection.json")
    parser.add_argument("--delay", type=float, default=0.10, help="pausa entre downloads em segundos")
    parser.add_argument("--timeout", type=float, default=30.0, help="timeout HTTP em segundos")
    parser.add_argument("--retries", type=int, default=2, help="número de novas tentativas por requisição")
    return parser


def print_selection_summary(document: dict[str, Any]) -> None:
    summary = document["summary"]
    print(
        "Pool do protótipo: "
        f"{summary['monsters_total']} monstros + {summary['spells_total']} magias + "
        f"{summary['traps_total']} armadilhas = {summary['total_cards']} cartas"
    )
    print("Monstros por RACE:")
    for race, count in summary["monsters_by_race"].items():
        print(f"  {race}: {count}")
    print("Monstros por Nível:")
    for level, count in summary["monsters_by_level"].items():
        print(f"  Nível {level}: {count}")
    print("Magias por subtipo:")
    for subtype, count in summary["spells_by_subtype"].items():
        print(f"  {subtype}: {count}")


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.delay < 0 or args.timeout <= 0 or args.retries < 0:
        parser.error("--delay, --timeout e --retries precisam ter valores válidos.")

    targets = collect_targets(args)
    manual_mode = bool(targets or args.race or args.all_compatible)
    if args.prototype_pool and manual_mode:
        parser.error("--prototype-pool não pode ser combinado com --name/--id/--input/--race/--all-compatible")
    if not args.prototype_pool and not manual_mode:
        parser.error(
            "informe --prototype-pool, --name/--id/--input, --race ou --all-compatible; "
            "download global nunca é implícito"
        )

    try:
        cards: list[dict[str, Any]] = []
        errors: list[str] = []

        if args.prototype_pool or args.all_compatible or args.race:
            cards.extend(fetch_all_cards(timeout=args.timeout, retries=args.retries))

        for target in targets:
            try:
                cards.extend(fetch_cards_for_target(target, timeout=args.timeout, retries=args.retries))
            except DownloaderError as exc:
                errors.append(str(exc))

        cards = dedupe_cards(cards)
        if args.pre_2010:
            set_years = fetch_card_set_years(timeout=args.timeout, retries=args.retries)
            cards = [card for card in cards if card_is_pre_2010(card, set_years)]

        selection_document: dict[str, Any] | None = None
        if args.prototype_pool:
            filtered = select_prototype_pool(cards)
            selection_document = build_selection_document(filtered)
            print_selection_summary(selection_document)
        else:
            filtered = [card for card in cards if card_is_supported(card)]
            filtered = [card for card in filtered if card_matches_races(card, set(args.race))]

        artworks: list[Artwork] = []
        seen_art: set[tuple[int, int]] = set()
        for card in filtered:
            for artwork in iter_artworks(card, all_artworks=args.all_artworks):
                key = (artwork.card_id, artwork.image_id)
                if key not in seen_art:
                    seen_art.add(key)
                    artworks.append(artwork)

        if not artworks:
            print("Nenhuma arte compatível encontrada para os filtros informados.", file=sys.stderr)
            for error in errors:
                print(f"AVISO: {error}", file=sys.stderr)
            return 2 if errors else 0

        print(f"Cartas compatíveis: {len(filtered)} | Artes planejadas: {len(artworks)}")
        if args.pre_2010:
            print("Filtro opcional pré-2010: ATIVO")
        if args.dry_run:
            print("Dry-run: nenhum arquivo será criado.")

        selection_path = args.selection or (args.output / "selection.json")
        if selection_document is not None and not args.dry_run:
            save_json(selection_path, selection_document)

        manifest_path = args.output / "manifest.json"
        manifest = {"schema_version": 2, "files": {}} if args.dry_run else load_manifest(manifest_path)
        if selection_document is not None:
            manifest["prototype_pool_summary"] = selection_document["summary"]

        downloaded = skipped = failed = 0
        for index, artwork in enumerate(artworks, start=1):
            destination = args.output / artwork.relative_path
            rel_key = artwork.relative_path.as_posix()

            if destination.exists() and not args.force:
                skipped += 1
                print(f"[{index}/{len(artworks)}] SKIP {rel_key}")
                continue

            if args.dry_run:
                print(f"[{index}/{len(artworks)}] PLAN {rel_key} <- {artwork.url}")
                continue

            try:
                payload = download_bytes(artwork.url, timeout=args.timeout, retries=args.retries)
                digest = write_atomic(destination, payload)
                manifest["files"][rel_key] = {
                    "card_id": artwork.card_id,
                    "image_id": artwork.image_id,
                    "name": artwork.card_name,
                    "api_type": artwork.api_type,
                    "prototype_type": artwork.prototype_type,
                    "race": artwork.race,
                    "level": artwork.level,
                    "source": artwork.url,
                    "sha256": digest,
                    "bytes": len(payload),
                }
                save_manifest(manifest_path, manifest)
                downloaded += 1
                print(f"[{index}/{len(artworks)}] OK   {rel_key}")
            except DownloaderError as exc:
                failed += 1
                print(f"[{index}/{len(artworks)}] ERRO {artwork.card_name}: {exc}", file=sys.stderr)

            if args.delay:
                time.sleep(args.delay)

        if selection_document is not None and not args.dry_run:
            save_manifest(manifest_path, manifest)

        for error in errors:
            print(f"AVISO: {error}", file=sys.stderr)

        print(f"Concluído: {downloaded} baixadas, {skipped} existentes, {failed} falhas.")
        return 1 if failed or errors else 0
    except DownloaderError as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
