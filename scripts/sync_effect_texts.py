#!/usr/bin/env python3
"""Sincroniza textos de referência dos monstros de Efeito selecionados.

Para cada carta do `selection.json` cujo `prototype_type` seja `Efeito`, consulta
o registro atual no YGOPRODeck e cria um arquivo `.effect.txt` ao lado de cada
arte versionada da carta. O texto é somente referência da carta-fonte: não
substitui o GDD nem define automaticamente a implementação do Monster Impact.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import baixar_artes as base

EFFECT_REFERENCE_SUFFIX = ".effect.txt"
REFERENCE_KIND = "official-effect-reference"
REFERENCE_NOTICE = (
    "REFERÊNCIA SOMENTE: este texto vem da carta-fonte e não define automaticamente "
    "o efeito, custo, alvo, timing, Corrente ou qualquer outra regra no Monster Impact. "
    "O GDD e o conteúdo aprovado do projeto prevalecem."
)


class EffectSyncError(RuntimeError):
    """Falha esperada ao sincronizar referências de efeito."""


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise EffectSyncError(f"JSON inválido em {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise EffectSyncError(f"JSON inválido em {path}: objeto esperado.")
    return value


def is_effect_selection_row(row: dict[str, Any]) -> bool:
    return str(row.get("bucket", "")) == "monster" and str(row.get("prototype_type", "")) == "Efeito"


def effect_reference_path(image_relative_path: str | Path) -> Path:
    path = Path(image_relative_path)
    if path.suffix.casefold() != ".jpg":
        raise EffectSyncError(f"Arte sem extensão .jpg no manifesto: {path.as_posix()}")
    return path.with_name(path.stem + EFFECT_REFERENCE_SUFFIX)


def render_effect_reference(card: dict[str, Any], row: dict[str, Any]) -> str:
    description = str(card.get("desc") or "").strip()
    if not description:
        raise EffectSyncError(f"Carta de Efeito sem `desc`: {row.get('name')} ({row.get('id')})")

    level = row.get("level")
    level_text = str(level) if isinstance(level, int) and not isinstance(level, bool) else "-"
    lines = [
        "MONSTER IMPACT — REFERÊNCIA DE EFEITO",
        "",
        f"Nome: {row.get('name', '')}",
        f"ID: {row.get('id', '')}",
        f"RACE: {row.get('race', '')}",
        f"Nível: {level_text}",
        f"Tipo da API: {row.get('api_type', '')}",
        "Fonte do texto: YGOPRODeck cardinfo.desc",
        "",
        REFERENCE_NOTICE,
        "",
        "EFEITO / DESCRIÇÃO DA CARTA-FONTE:",
        description,
        "",
    ]
    return "\n".join(lines)


def find_art_paths_for_card(manifest: dict[str, Any], card_id: int) -> list[Path]:
    files = manifest.get("files", {})
    if not isinstance(files, dict):
        raise EffectSyncError("manifest.json inválido: `files` precisa ser objeto.")

    paths: list[Path] = []
    for relative_path, metadata in files.items():
        if not isinstance(metadata, dict):
            continue
        try:
            manifest_card_id = int(metadata.get("card_id"))
        except (TypeError, ValueError):
            continue
        if manifest_card_id != card_id:
            continue
        path = Path(relative_path)
        if path.suffix.casefold() == ".jpg":
            paths.append(path)
    return sorted(paths, key=lambda path: path.as_posix())


def fetch_exact_card(card_id: int, *, timeout: float, retries: int) -> dict[str, Any]:
    cards = base.fetch_cards_for_target(
        base.Target("id", str(card_id)), timeout=timeout, retries=retries
    )
    exact = [card for card in cards if int(card.get("id", -1)) == card_id]
    if not exact:
        raise EffectSyncError(f"ID {card_id} não retornou registro exato no YGOPRODeck.")
    return exact[0]


def sha256_text(text: str) -> tuple[str, int, bytes]:
    payload = text.encode("utf-8")
    return hashlib.sha256(payload).hexdigest(), len(payload), payload


def sync_effect_references(
    *,
    root: Path,
    timeout: float,
    retries: int,
    dry_run: bool = False,
) -> tuple[int, int]:
    selection_path = root / "selection.json"
    manifest_path = root / "manifest.json"
    selection = load_json(selection_path)
    manifest = load_json(manifest_path)

    rows = selection.get("cards", [])
    if not isinstance(rows, list):
        raise EffectSyncError("selection.json inválido: `cards` precisa ser array.")

    effect_rows = [row for row in rows if isinstance(row, dict) and is_effect_selection_row(row)]
    files = manifest.setdefault("files", {})
    if not isinstance(files, dict):
        raise EffectSyncError("manifest.json inválido: `files` precisa ser objeto.")

    written = 0
    planned = 0
    for row in effect_rows:
        card_id = int(row["id"])
        card = fetch_exact_card(card_id, timeout=timeout, retries=retries)
        text = render_effect_reference(card, row)
        digest, size, payload = sha256_text(text)
        art_paths = find_art_paths_for_card(manifest, card_id)
        if not art_paths:
            raise EffectSyncError(
                f"Nenhuma arte registrada no manifesto para {row.get('name')} ({card_id})."
            )

        for art_path in art_paths:
            relative_path = effect_reference_path(art_path)
            rel_key = relative_path.as_posix()
            planned += 1
            if dry_run:
                print(f"PLAN {rel_key}")
                continue

            base.write_atomic(root / relative_path, payload)
            files[rel_key] = {
                "kind": REFERENCE_KIND,
                "card_id": card_id,
                "name": str(row.get("name", "")),
                "api_type": str(row.get("api_type", "")),
                "prototype_type": "Efeito",
                "race": str(row.get("race", "")),
                "level": row.get("level"),
                "source": "YGOPRODeck cardinfo.desc",
                "paired_art": art_path.as_posix(),
                "sha256": digest,
                "bytes": size,
            }
            written += 1
            print(f"OK   {rel_key}")

    if not dry_run:
        manifest["effect_reference_summary"] = {
            "effect_monsters": len(effect_rows),
            "reference_files": planned,
            "policy": "sidecar-next-to-art-reference-only-gdd-prevails",
        }
        base.save_manifest(manifest_path, manifest)

    return written, planned


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Cria .effect.txt ao lado das artes dos monstros de Efeito selecionados."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=base.DEFAULT_OUTPUT,
        help=f"raiz das artes (padrão: {base.DEFAULT_OUTPUT})",
    )
    parser.add_argument("--dry-run", action="store_true", help="mostra os arquivos sem gravar")
    parser.add_argument("--timeout", type=float, default=30.0, help="timeout HTTP em segundos")
    parser.add_argument("--retries", type=int, default=2, help="novas tentativas por requisição")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        written, planned = sync_effect_references(
            root=args.root,
            timeout=args.timeout,
            retries=args.retries,
            dry_run=args.dry_run,
        )
    except (EffectSyncError, base.DownloaderError, OSError, ValueError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1

    if args.dry_run:
        print(f"Referências planejadas: {planned}")
    else:
        print(f"Referências de efeito sincronizadas: {written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
