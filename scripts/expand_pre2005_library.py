#!/usr/bin/env python3
"""Expansão pré-2005 de Magias e Armadilhas para a biblioteca do Monster Impact (DEC-004)."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
import baixar_artes as base

CUTOFF_YEAR = 2005
SPELL_SUBTYPES = ("Normal", "Quick-Play", "Continuous", "Equip", "Field", "Ritual")
TRAP_SUBTYPES = ("Normal", "Continuous", "Counter")
EXPANSION = "pre-2005-spells-traps-expansion"


class ExpansionError(RuntimeError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ExpansionError(f"JSON inválido em {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ExpansionError(f"JSON inválido em {path}: objeto esperado.")
    return value


def cid(card: dict[str, Any]) -> int:
    try:
        return int(card.get("id", 0))
    except (TypeError, ValueError):
        return 0


def earliest_year(card: dict[str, Any], years: dict[str, int]) -> int | None:
    found = [
        years[str(s["set_name"])]
        for s in card.get("card_sets") or []
        if isinstance(s, dict) and s.get("set_name") and str(s["set_name"]) in years
    ]
    return min(found) if found else None


def pre_cutoff(card: dict[str, Any], years: dict[str, int], cutoff: int) -> bool:
    year = earliest_year(card, years)
    return year is not None and year < cutoff


def shape_ok(card: dict[str, Any]) -> bool:
    card_id = cid(card)
    card_type = str(card.get("type", ""))
    lowered = card_type.casefold()
    return bool(
        card_id
        and card_id not in base.KNOWN_UNAVAILABLE_CROPOUT_IDS
        if hasattr(base, "KNOWN_UNAVAILABLE_CROPOUT_IDS")
        else (
            card_id
            and card_id not in getattr(base, "KNOWN_UNAVAILABLE_CROPPED_CARD_IDS", ())
            and card_type not in base.FORBIDDEN_EXACT_TYPES
            and "match winner" not in lowered
            and not any(t in lowered for t in base.FORBIDDEN_TYPE_TOKENS)
            and base.primary_cropped_url(card)
        )
    )


def select_subtypes(
    cards: Sequence[dict[str, Any]],
    *,
    api_type: str,
    subtypes: Sequence[str],
    years: dict[str, int],
    cutoff: int,
    existing: set[int],
    quota: int,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    missing: list[str] = []
    for subtype in subtypes:
        candidates = sorted(
            (
                c
                for c in cards
                if cid(c) not in existing
                and shape_ok(c)
                and str(c.get("type", "")) == api_type
                and str(c.get("race", "")).strip() == subtype
                and pre_cutoff(c, years, cutoff)
            ),
            key=lambda c: (str(c.get("name", "")).casefold(), cid(c)),
        )
        if len(candidates) < quota:
            missing.append(f"{api_type}/{subtype}: necessários {quota}, encontrados {len(candidates)}")
            continue
        chosen = candidates[:quota]
        selected.extend(chosen)
        existing.update(cid(c) for c in chosen)
    if missing:
        raise ExpansionError("Cotas pré-2005 insuficientes:\n  - " + "\n  - ".join(missing))
    return selected


def selection_row(card: dict[str, Any], years: dict[str, int]) -> dict[str, Any]:
    card_type = str(card.get("type", ""))
    bucket = "spell" if card_type == "Spell Card" else "trap"
    return {
        "id": cid(card),
        "name": str(card.get("name", "")),
        "bucket": bucket,
        "race": str(card.get("race", "")),
        "api_type": card_type,
        "prototype_type": base.prototype_type(card),
        "level": None,
        "image_url_cropped": base.primary_cropped_url(card),
        "selection_source": "standard",
        "library_expansion": EXPANSION,
        "library_expansion_rule": "pre-2005",
        "earliest_tcg_year": earliest_year(card, years),
    }


def download(
    cards: Sequence[dict[str, Any]],
    output: Path,
    manifest: dict[str, Any],
    *,
    timeout: float,
    retries: int,
    delay: float,
) -> int:
    files = manifest.setdefault("files", {})
    failed = 0
    card_by_id = {cid(c): c for c in cards}
    arts = []
    for card in cards:
        arts.extend(base.iter_artworks(card, all_artworks=False))
    for index, art in enumerate(arts, 1):
        dest = output / art.relative_path
        key = art.relative_path.as_posix()
        if dest.exists():
            print(f"[{index}/{len(arts)}] SKIP {key}")
            continue
        try:
            payload = base.download_bytes(art.url, timeout=timeout, retries=retries)
            digest = base.write_atomic(dest, payload)
            card = card_by_id[art.card_id]
            files[key] = {
                "card_id": art.card_id,
                "image_id": art.image_id,
                "name": art.card_name,
                "api_type": art.api_type,
                "prototype_type": art.prototype_type,
                "race": art.race,
                "level": art.level,
                "source": art.url,
                "selection_source": "standard",
                "library_expansion": EXPANSION,
                "sha256": digest,
                "bytes": len(payload),
            }
            base.save_manifest(output / "manifest.json", manifest)
            print(f"[{index}/{len(arts)}] OK   {key}")
        except base.DownloaderError as exc:
            failed += 1
            print(f"[{index}/{len(arts)}] ERRO {art.card_name}: {exc}", file=sys.stderr)
        if delay:
            time.sleep(delay)
    return failed


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Expande Magias e Armadilhas pré-2005 (DEC-004).")
    p.add_argument("--output", type=Path, default=base.DEFAULT_OUTPUT)
    p.add_argument("--cutoff-year", type=int, default=CUTOFF_YEAR)
    p.add_argument("--spells-per-subtype", type=int, default=10)
    p.add_argument("--traps-per-subtype", type=int, default=10)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--delay", type=float, default=0.10)
    p.add_argument("--timeout", type=float, default=30.0)
    p.add_argument("--retries", type=int, default=2)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        selection = load_json(args.output / "selection.json")
        manifest = base.load_manifest(args.output / "manifest.json")
        rows = selection.get("cards", [])
        if not isinstance(rows, list):
            raise ExpansionError("selection.json: `cards` precisa ser array.")
        existing = {int(r["id"]) for r in rows if isinstance(r, dict) and str(r.get("id", "")).isdigit()}
        cards = base.fetch_all_cards(timeout=args.timeout, retries=args.retries)
        years = base.fetch_card_set_years(timeout=args.timeout, retries=args.retries)
        spells = select_subtypes(
            cards,
            api_type="Spell Card",
            subtypes=SPELL_SUBTYPES,
            years=years,
            cutoff=args.cutoff_year,
            existing=existing,
            quota=args.spells_per_subtype,
        )
        traps = select_subtypes(
            cards,
            api_type="Trap Card",
            subtypes=TRAP_SUBTYPES,
            years=years,
            cutoff=args.cutoff_year,
            existing=existing,
            quota=args.traps_per_subtype,
        )
        additions = [*spells, *traps]
        print(f"Planejado: {len(spells)} Magias + {len(traps)} Armadilhas pré-{args.cutoff_year}")
        if args.dry_run:
            for c in additions:
                print(f"PLAN {c.get('name')} | {c.get('type')} / {c.get('race')}")
            return 0
        if download(additions, args.output, manifest, timeout=args.timeout, retries=args.retries, delay=args.delay):
            return 1
        seen = {int(r["id"]) for r in rows if isinstance(r, dict) and str(r.get("id", "")).isdigit()}
        new_rows = [selection_row(c, years) for c in additions if cid(c) not in seen]
        rows.extend(new_rows)
        selection["spells_traps_expansion"] = {
            "source": EXPANSION,
            "cutoff_year_exclusive": args.cutoff_year,
            "spells_per_subtype": args.spells_per_subtype,
            "traps_per_subtype": args.traps_per_subtype,
            "new_cards_total": len(new_rows),
        }
        base.save_json(args.output / "selection.json", selection)
        base.save_manifest(args.output / "manifest.json", manifest)
        return 0
    except (ExpansionError, base.DownloaderError, OSError, ValueError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
