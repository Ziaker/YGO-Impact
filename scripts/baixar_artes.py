#!/usr/bin/env python3
"""Baixa artes oficiais para uso local no Monster Impact.

Contrato derivado do GDD v0.42:
- usa image_url_cropped da API do YGOPRODeck;
- não faz hotlink durante o jogo;
- aceita nomes exatos e IDs;
- suporta artes alternativas, dry-run e retomada;
- evita duplicatas e grava por arquivo temporário + replace atômico;
- organiza por categoria/RACE/tipo;
- exclui Synchro, Xyz, Pendulum e Link;
- filtro pré-2010 é opcional.

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
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
DEFAULT_OUTPUT = Path("assets-local/card-art")
USER_AGENT = "Monster-Impact-Art-Downloader/1.0 (+https://github.com/Ziaker/YGO-Impact)"

PRIORITY_RACES = (
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

FORBIDDEN_TYPE_TOKENS = ("synchro", "xyz", "pendulum", "link")
FORBIDDEN_EXACT_TYPES = {"Token", "Skill Card"}


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
    card_type: str
    race: str
    url: str
    relative_path: Path


def _request_json(url: str, *, timeout: float, retries: int) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urlopen(request, timeout=timeout) as response:
                payload = response.read()
            data = json.loads(payload.decode("utf-8"))
            if not isinstance(data, dict):
                raise DownloaderError("Resposta inesperada da API: objeto JSON esperado.")
            return data
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt >= retries:
                break
            time.sleep(min(2 ** attempt, 4))
    raise DownloaderError(f"Falha ao consultar a API: {last_error}")


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
    for race in PRIORITY_RACES:
        if race.casefold() == wanted:
            return race
    raise argparse.ArgumentTypeError(
        f"RACE fora do escopo inicial: {value}. Use uma das 17 RACE prioritárias do GDD."
    )


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


def card_is_supported(card: dict[str, Any]) -> bool:
    card_type = str(card.get("type", ""))
    lowered = card_type.casefold()
    if card_type in FORBIDDEN_EXACT_TYPES:
        return False
    if "match winner" in lowered or any(token in lowered for token in FORBIDDEN_TYPE_TOKENS):
        return False
    if card_type in {"Spell Card", "Trap Card"}:
        return True
    if "monster" not in lowered:
        return False
    return str(card.get("race", "")) in PRIORITY_RACES


def card_is_pre_2010(card: dict[str, Any]) -> bool:
    for card_set in card.get("card_sets") or []:
        date_text = card_set.get("set_tcg_date")
        if not date_text:
            continue
        try:
            if datetime.strptime(str(date_text), "%Y-%m-%d").year < 2010:
                return True
        except ValueError:
            continue
    return False


def card_matches_races(card: dict[str, Any], races: set[str]) -> bool:
    if not races:
        return True
    card_type = str(card.get("type", ""))
    if "Monster" not in card_type:
        return False
    return str(card.get("race", "")) in races


def category_path(card: dict[str, Any]) -> Path:
    card_type = str(card.get("type", ""))
    race = clean_component(str(card.get("race", "Desconhecida")))
    lowered = card_type.casefold()

    if card_type == "Spell Card":
        return Path("Magias") / race
    if card_type == "Trap Card":
        return Path("Armadilhas") / race

    if "fusion" in lowered:
        subtype = "Fusion"
    elif "ritual" in lowered:
        subtype = "Ritual"
    elif "normal" in lowered and "effect" not in lowered:
        subtype = "Normal"
    else:
        subtype = "Efeito"
    return Path("Monstros") / race / subtype


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
        yield Artwork(
            card_id=card_id,
            image_id=image_id,
            card_name=card_name,
            card_type=str(card.get("type", "")),
            race=str(card.get("race", "")),
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
            time.sleep(min(2 ** attempt, 4))
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
        return {"schema_version": 1, "files": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DownloaderError(f"Manifesto inválido em {path}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("files", {}), dict):
        raise DownloaderError(f"Manifesto inválido em {path}: estrutura inesperada.")
    data.setdefault("schema_version", 1)
    data.setdefault("files", {})
    return data


def save_manifest(path: Path, manifest: dict[str, Any]) -> None:
    payload = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    write_atomic(path, payload)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Baixa image_url_cropped do YGOPRODeck para assets locais do Monster Impact."
    )
    parser.add_argument("--name", action="append", default=[], metavar="NOME", help="nome exato; repetível")
    parser.add_argument("--id", action="append", default=[], type=int, metavar="ID", help="ID da carta; repetível")
    parser.add_argument("--input", type=Path, help="arquivo com nomes/IDs, um por linha")
    parser.add_argument("--race", action="append", default=[], type=normalize_race, help="filtra uma RACE prioritária; repetível")
    parser.add_argument("--all-compatible", action="store_true", help="consulta todo o acervo compatível; use explicitamente")
    parser.add_argument("--all-artworks", action="store_true", help="baixa todas as artes retornadas em card_images")
    parser.add_argument("--pre-2010", action="store_true", help="ativa opcionalmente o filtro TCG anterior a 2010")
    parser.add_argument("--dry-run", action="store_true", help="mostra o plano sem criar ou baixar arquivos")
    parser.add_argument("--force", action="store_true", help="sobrescreve imagens já existentes")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"destino local (padrão: {DEFAULT_OUTPUT})")
    parser.add_argument("--delay", type=float, default=0.05, help="pausa entre downloads em segundos")
    parser.add_argument("--timeout", type=float, default=30.0, help="timeout HTTP em segundos")
    parser.add_argument("--retries", type=int, default=2, help="número de novas tentativas por requisição")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.delay < 0 or args.timeout <= 0 or args.retries < 0:
        parser.error("--delay, --timeout e --retries precisam ter valores válidos.")

    targets = collect_targets(args)
    if not targets and not args.all_compatible and not args.race:
        parser.error("informe --name/--id/--input, --race ou --all-compatible; download global nunca é implícito")

    try:
        cards: list[dict[str, Any]] = []
        errors: list[str] = []

        if args.all_compatible or args.race:
            cards.extend(fetch_all_cards(timeout=args.timeout, retries=args.retries))

        for target in targets:
            try:
                cards.extend(fetch_cards_for_target(target, timeout=args.timeout, retries=args.retries))
            except DownloaderError as exc:
                errors.append(str(exc))

        races = set(args.race)
        filtered = [card for card in dedupe_cards(cards) if card_is_supported(card)]
        filtered = [card for card in filtered if card_matches_races(card, races)]
        if args.pre_2010:
            filtered = [card for card in filtered if card_is_pre_2010(card)]

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

        manifest_path = args.output / "manifest.json"
        manifest = {"schema_version": 1, "files": {}} if args.dry_run else load_manifest(manifest_path)
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
                    "type": artwork.card_type,
                    "race": artwork.race,
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

        for error in errors:
            print(f"AVISO: {error}", file=sys.stderr)

        print(f"Concluído: {downloaded} baixadas, {skipped} existentes, {failed} falhas.")
        return 1 if failed or errors else 0
    except DownloaderError as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
