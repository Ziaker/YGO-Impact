#!/usr/bin/env python3
"""Expansão aditiva da biblioteca de cartas pedida pelo autor em 2026-09-29."""
from __future__ import annotations

import argparse, json, sys, time
from collections import Counter
from pathlib import Path
from typing import Any, Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
import baixar_artes as base

CUTOFF_YEAR = 2005
NORMALS_PER_RACE = 15
LEVEL_MIN = 3
LEVEL_MAX_START = 6
LEVEL_MAX_LIMIT = 12
PSYCHIC_RACE = "Psychic"
PSYCHIC_LIMIT = 20
RUSH_DUEL_URL = f"{base.API_URL}?format=Rush%20Duel"
SPELL_SUBTYPES = ("Normal", "Quick-Play", "Continuous", "Equip", "Field", "Ritual")
TRAP_SUBTYPES = ("Normal", "Continuous", "Counter")
EXPANSION = "pre-2005-library-expansion"
PSYCHIC_RULE = "psychic-normal-any-date-any-level-up-to-20"

class ExpansionError(RuntimeError): pass

def load_json(path: Path) -> dict[str, Any]:
    try: value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc: raise ExpansionError(f"JSON inválido em {path}: {exc}") from exc
    if not isinstance(value, dict): raise ExpansionError(f"JSON inválido em {path}: objeto esperado.")
    return value

def cid(card: dict[str, Any]) -> int:
    try: return int(card.get("id", 0))
    except (TypeError, ValueError): return 0

def archetype(card: dict[str, Any]) -> str | None:
    value = str(card.get("archetype") or "").strip()
    return value or None

def card_key(card: dict[str, Any]) -> tuple[int, str, int]:
    return (1 if archetype(card) else 0, str(card.get("name", "")).casefold(), cid(card))

def earliest_year(card: dict[str, Any], years: dict[str, int]) -> int | None:
    found = [years[str(s["set_name"])] for s in card.get("card_sets") or [] if isinstance(s, dict) and s.get("set_name") and str(s["set_name"]) in years]
    return min(found) if found else None

def pre_cutoff(card: dict[str, Any], years: dict[str, int], cutoff: int) -> bool:
    year = earliest_year(card, years)
    return year is not None and year < cutoff

def shape_ok(card: dict[str, Any]) -> bool:
    card_id = cid(card); card_type = str(card.get("type", "")); lowered = card_type.casefold()
    return bool(card_id and card_id not in base.KNOWN_UNAVAILABLE_CROPPED_CARD_IDS and card_type not in base.FORBIDDEN_EXACT_TYPES and "match winner" not in lowered and not any(t in lowered for t in base.FORBIDDEN_TYPE_TOKENS) and base.primary_cropped_url(card))

def source(card: dict[str, Any]) -> str: return str(card.get("_monster_impact_source") or "standard")
def tag(card: dict[str, Any], value: str) -> dict[str, Any]:
    result = dict(card); result["_monster_impact_source"] = value; return result

def fetch_catalog(*, timeout: float, retries: int) -> list[dict[str, Any]]:
    standard = [tag(c, "standard") for c in base.fetch_all_cards(timeout=timeout, retries=retries) if isinstance(c, dict)]
    payload = base._request_json(RUSH_DUEL_URL, timeout=timeout, retries=retries)
    rush = payload.get("data", [])
    if not isinstance(rush, list): raise base.DownloaderError("Catálogo Rush Duel inválido: `data` não é array.")
    supplement = [tag(c, "rush-duel") for c in rush if isinstance(c, dict) and str(c.get("type", "")) in base.NORMAL_MONSTER_API_TYPES and str(c.get("race", "")) == PSYCHIC_RACE]
    return base.dedupe_cards([*standard, *supplement])

def unique_choose(cards: Sequence[dict[str, Any]], limit: int, used: set[str]) -> list[dict[str, Any]]:
    chosen = []
    for card in cards:
        arch = archetype(card)
        if arch and arch.casefold() in used: continue
        chosen.append(card)
        if arch: used.add(arch.casefold())
        if len(chosen) == limit: break
    return chosen

def select_normals(cards: Sequence[dict[str, Any]], years: dict[str, int], cutoff: int, existing: set[int], used: set[str], per_race: int, psychic_limit: int):
    selected: list[dict[str, Any]] = []; max_level: dict[str, int | None] = {}; shortfalls = []; psychic_count = 0
    for race in base.PROJECT_PRIORITY_RACES:
        if race == PSYCHIC_RACE:
            candidates = sorted((c for c in cards if cid(c) not in existing and shape_ok(c) and str(c.get("type", "")) in base.NORMAL_MONSTER_API_TYPES and str(c.get("race", "")) == race and isinstance(c.get("level"), int) and not isinstance(c.get("level"), bool) and int(c["level"]) >= 1), key=card_key)
            chosen = unique_choose(candidates, psychic_limit, used)
            selected += chosen; existing.update(cid(c) for c in chosen); psychic_count = len(chosen); max_level[race] = max((int(c["level"]) for c in chosen), default=None)
            continue
        candidates = sorted((c for c in cards if cid(c) not in existing and shape_ok(c) and str(c.get("type", "")) in base.NORMAL_MONSTER_API_TYPES and str(c.get("race", "")) == race and isinstance(c.get("level"), int) and not isinstance(c.get("level"), bool) and int(c["level"]) >= LEVEL_MIN and pre_cutoff(c, years, cutoff)), key=card_key)
        chosen = []
        for level_max in range(LEVEL_MAX_START, LEVEL_MAX_LIMIT + 1):
            trial_used = set(used)
            trial = unique_choose([c for c in candidates if int(c["level"]) <= level_max], per_race, trial_used)
            if len(trial) == per_race:
                chosen = trial; max_level[race] = level_max; break
        if len(chosen) != per_race:
            possible = unique_choose([c for c in candidates if int(c["level"]) <= LEVEL_MAX_LIMIT], per_race, set(used))
            shortfalls.append(f"{race}: necessários {per_race}, encontrados {len(possible)}")
            continue
        selected += chosen; existing.update(cid(c) for c in chosen)
        for card in chosen:
            arch = archetype(card)
            if arch: used.add(arch.casefold())
    if shortfalls: raise ExpansionError("Cotas pré-2005 insuficientes:\n  - " + "\n  - ".join(shortfalls))
    return selected, max_level, psychic_count

def select_subtypes(cards: Sequence[dict[str, Any]], *, api_type: str, subtypes: Sequence[str], years: dict[str, int], cutoff: int, existing: set[int], quota: int):
    selected = []; missing = []
    for subtype in subtypes:
        candidates = sorted((c for c in cards if cid(c) not in existing and shape_ok(c) and str(c.get("type", "")) == api_type and str(c.get("race", "")).strip() == subtype and pre_cutoff(c, years, cutoff)), key=lambda c: (str(c.get("name", "")).casefold(), cid(c)))
        if len(candidates) < quota: missing.append(f"{api_type}/{subtype}: necessários {quota}, encontrados {len(candidates)}"); continue
        chosen = candidates[:quota]; selected += chosen; existing.update(cid(c) for c in chosen)
    if missing: raise ExpansionError("Cotas pré-2005 insuficientes:\n  - " + "\n  - ".join(missing))
    return selected

def selection_row(card: dict[str, Any], years: dict[str, int]) -> dict[str, Any]:
    card_type = str(card.get("type", "")); monster = card_type not in {"Spell Card", "Trap Card"}; psychic = monster and str(card.get("race", "")) == PSYCHIC_RACE
    row = {"id": cid(card), "name": str(card.get("name", "")), "bucket": "monster" if monster else ("spell" if card_type == "Spell Card" else "trap"), "race": str(card.get("race", "")), "api_type": card_type, "prototype_type": base.prototype_type(card), "level": card.get("level") if monster else None, "image_url_cropped": base.primary_cropped_url(card), "selection_source": source(card), "library_expansion": EXPANSION, "library_expansion_rule": PSYCHIC_RULE if psychic else "pre-2005", "earliest_tcg_year": earliest_year(card, years)}
    if monster: row["archetype"] = archetype(card)
    return row

def download(cards: Sequence[dict[str, Any]], output: Path, manifest: dict[str, Any], *, timeout: float, retries: int, delay: float) -> int:
    files = manifest.setdefault("files", {}); failed = 0; card_by_id = {cid(c): c for c in cards}; arts = []
    for card in cards: arts.extend(base.iter_artworks(card, all_artworks=False))
    for index, art in enumerate(arts, 1):
        dest = output / art.relative_path; key = art.relative_path.as_posix()
        if dest.exists(): print(f"[{index}/{len(arts)}] SKIP {key}"); continue
        try:
            payload = base.download_bytes(art.url, timeout=timeout, retries=retries); digest = base.write_atomic(dest, payload); card = card_by_id[art.card_id]
            files[key] = {"card_id": art.card_id, "image_id": art.image_id, "name": art.card_name, "api_type": art.api_type, "prototype_type": art.prototype_type, "race": art.race, "level": art.level, "source": art.url, "selection_source": source(card), "library_expansion": EXPANSION, "sha256": digest, "bytes": len(payload)}
            base.save_manifest(output / "manifest.json", manifest); print(f"[{index}/{len(arts)}] OK   {key}")
        except base.DownloaderError as exc: failed += 1; print(f"[{index}/{len(arts)}] ERRO {art.card_name}: {exc}", file=sys.stderr)
        if delay: time.sleep(delay)
    return failed

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Expande a biblioteca pré-2005 com exceção Psychic.")
    p.add_argument("--output", type=Path, default=base.DEFAULT_OUTPUT); p.add_argument("--cutoff-year", type=int, default=CUTOFF_YEAR); p.add_argument("--normals-per-race", type=int, default=NORMALS_PER_RACE); p.add_argument("--psychic-limit", type=int, default=PSYCHIC_LIMIT); p.add_argument("--spells-per-subtype", type=int, default=10); p.add_argument("--traps-per-subtype", type=int, default=10); p.add_argument("--dry-run", action="store_true"); p.add_argument("--delay", type=float, default=.10); p.add_argument("--timeout", type=float, default=30.0); p.add_argument("--retries", type=int, default=2)
    return p

def main(argv: Sequence[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        selection = load_json(args.output / "selection.json"); manifest = base.load_manifest(args.output / "manifest.json"); rows = selection.get("cards", [])
        if not isinstance(rows, list): raise ExpansionError("selection.json: `cards` precisa ser array.")
        existing = {int(r["id"]) for r in rows if isinstance(r, dict) and str(r.get("id", "")).isdigit()}; used = {str(r["archetype"]).casefold() for r in rows if isinstance(r, dict) and r.get("archetype")}
        cards = fetch_catalog(timeout=args.timeout, retries=args.retries); years = base.fetch_card_set_years(timeout=args.timeout, retries=args.retries)
        normals, max_level, psychic_count = select_normals(cards, years, args.cutoff_year, existing, used, args.normals_per_race, args.psychic_limit)
        spells = select_subtypes(cards, api_type="Spell Card", subtypes=SPELL_SUBTYPES, years=years, cutoff=args.cutoff_year, existing=existing, quota=args.spells_per_subtype)
        traps = select_subtypes(cards, api_type="Trap Card", subtypes=TRAP_SUBTYPES, years=years, cutoff=args.cutoff_year, existing=existing, quota=args.traps_per_subtype)
        additions = [*normals, *spells, *traps]
        print(f"Planejado: {len(normals)} Normais + {len(spells)} Magias + {len(traps)} Armadilhas")
        print(f"Psychic: {psychic_count}/{args.psychic_limit} adicionais, qualquer data/Nível")
        if args.dry_run:
            for c in additions: print(f"PLAN {c.get('name')} | {c.get('race')} | Lv {c.get('level', '-')} | {source(c)}")
            return 0
        if download(additions, args.output, manifest, timeout=args.timeout, retries=args.retries, delay=args.delay): return 1
        seen = {int(r["id"]) for r in rows if isinstance(r, dict) and str(r.get("id", "")).isdigit()}; new_rows = [selection_row(c, years) for c in additions if cid(c) not in seen]; rows.extend(new_rows)
        monsters = [r for r in new_rows if r["bucket"] == "monster"]
        selection["library_expansion"] = {"source": EXPANSION, "cutoff_year_exclusive": args.cutoff_year, "normal_monsters_per_non_psychic_race": args.normals_per_race, "normal_level_min": LEVEL_MIN, "normal_initial_level_max": LEVEL_MAX_START, "normal_level_max_used_by_race": max_level, "psychic_exception": {"rule": PSYCHIC_RULE, "limit": args.psychic_limit, "selected": psychic_count, "sources": ["standard", "rush-duel"]}, "spells_per_subtype": args.spells_per_subtype, "traps_per_subtype": args.traps_per_subtype, "new_normals_by_race": dict(sorted(Counter(r["race"] for r in monsters).items())), "new_cards_total": len(new_rows)}
        base.save_json(args.output / "selection.json", selection); base.save_manifest(args.output / "manifest.json", manifest); return 0
    except (ExpansionError, base.DownloaderError, OSError, ValueError) as exc: print(f"ERRO: {exc}", file=sys.stderr); return 1

if __name__ == "__main__": raise SystemExit(main())
