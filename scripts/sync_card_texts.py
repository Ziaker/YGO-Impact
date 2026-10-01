#!/usr/bin/env python3
"""Cria um TXT de referência para cada arte de Monstro, Magia e Armadilha."""
from __future__ import annotations

import argparse, hashlib, json, re, sys
from pathlib import Path
from typing import Any, Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
import baixar_artes as base

REFERENCE_KIND = "official-card-reference"
NOTICE = (
    "REFERÊNCIA SOMENTE: os dados abaixo vêm da carta-fonte. O GDD e o conteúdo "
    "aprovado do Monster Impact prevalecem sobre regras oficiais não adaptadas."
)
CARD_ID_RE = re.compile(r"__(\d+)(?:__art-\d+-\d+)?\.jpg$", re.I)

class CardTextError(RuntimeError): pass

def load_manifest(path: Path) -> dict[str, Any]:
    try: value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc: raise CardTextError(f"manifest inválido: {exc}") from exc
    if not isinstance(value, dict) or not isinstance(value.setdefault("files", {}), dict): raise CardTextError("manifest inválido")
    return value

def card_id_from_path(path: Path) -> int:
    match = CARD_ID_RE.search(path.name)
    if not match: raise CardTextError(f"ID ausente no nome da arte: {path}")
    return int(match.group(1))

def discover(root: Path, manifest: dict[str, Any]) -> dict[int, list[Path]]:
    result: dict[int, set[Path]] = {}
    for rel, meta in manifest.get("files", {}).items():
        if Path(rel).suffix.casefold() != ".jpg" or not isinstance(meta, dict): continue
        try: card_id = int(meta.get("card_id"))
        except (TypeError, ValueError): continue
        result.setdefault(card_id, set()).add(Path(rel))
    for category in ("Monstros", "Magias", "Armadilhas"):
        folder = root / category
        if not folder.exists(): continue
        for path in folder.rglob("*.jpg"):
            rel = path.relative_to(root); result.setdefault(card_id_from_path(rel), set()).add(rel)
    return {card_id: sorted(paths, key=lambda p: p.as_posix()) for card_id, paths in sorted(result.items())}

def fetch(card_id: int, *, timeout: float, retries: int) -> dict[str, Any]:
    cards = base.fetch_cards_for_target(base.Target("id", str(card_id)), timeout=timeout, retries=retries)
    for card in cards:
        if int(card.get("id", -1)) == card_id: return card
    raise CardTextError(f"ID não encontrado: {card_id}")

def render(card: dict[str, Any]) -> str:
    card_type = str(card.get("type", "")); monster = card_type not in {"Spell Card", "Trap Card"}; desc = str(card.get("desc") or "").strip()
    if not desc: raise CardTextError(f"Carta sem descrição: {card.get('name')} ({card.get('id')})")
    lines = ["MONSTER IMPACT — REFERÊNCIA DA CARTA-FONTE", "", f"Nome: {card.get('name', '')}", f"ID: {card.get('id', '')}", f"Categoria: {'Monstro' if monster else ('Magia' if card_type == 'Spell Card' else 'Armadilha')}", f"Tipo da API: {card_type}"]
    if monster:
        level = card.get("level"); level = level if isinstance(level, int) and not isinstance(level, bool) else "-"
        lines += [f"RACE: {card.get('race', '')}", f"Nível: {level}", f"Tipo Monster Impact: {base.prototype_type(card)}"]
    else: lines += [f"Subtipo: {card.get('race', '')}"]
    lines += ["Fonte do texto: YGOPRODeck cardinfo.desc", "", NOTICE, "", "DESCRIÇÃO / EFEITO DA CARTA-FONTE:", desc, ""]
    return "\n".join(str(x) for x in lines)

def main(argv: Sequence[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Sincroniza TXT para todas as artes de cartas."); p.add_argument("--root", type=Path, default=base.DEFAULT_OUTPUT); p.add_argument("--dry-run", action="store_true"); p.add_argument("--timeout", type=float, default=30.0); p.add_argument("--retries", type=int, default=2); args = p.parse_args(argv)
    try:
        manifest = load_manifest(args.root / "manifest.json"); files = manifest["files"]; arts = discover(args.root, manifest); planned = written = 0
        try:
            all_catalog = base.fetch_all_cards(timeout=args.timeout, retries=args.retries)
            catalog_lookup = {int(c["id"]): c for c in all_catalog if "id" in c and str(c["id"]).isdigit()}
        except Exception:
            catalog_lookup = {}
        for card_id, paths in arts.items():
            card = catalog_lookup.get(card_id) or fetch(card_id, timeout=args.timeout, retries=args.retries); text = render(card); payload = text.encode("utf-8"); digest = hashlib.sha256(payload).hexdigest()
            for art in paths:
                txt = art.with_suffix(".txt"); planned += 1
                if args.dry_run: print(f"PLAN {txt.as_posix()}"); continue
                base.write_atomic(args.root / txt, payload); files[txt.as_posix()] = {"kind": REFERENCE_KIND, "card_id": card_id, "name": str(card.get("name", "")), "api_type": str(card.get("type", "")), "race": str(card.get("race", "")), "level": card.get("level") if str(card.get("type", "")) not in {"Spell Card", "Trap Card"} else None, "source": "YGOPRODeck cardinfo.desc", "paired_art": art.as_posix(), "sha256": digest, "bytes": len(payload)}; written += 1; print(f"OK   {txt.as_posix()}")
        if not args.dry_run:
            manifest["card_reference_summary"] = {"cards": len(arts), "reference_files": planned, "policy": "one-txt-per-jpg-all-card-categories"}; base.save_manifest(args.root / "manifest.json", manifest)
        print(f"Referências {'planejadas' if args.dry_run else 'sincronizadas'}: {planned if args.dry_run else written}"); return 0
    except (CardTextError, base.DownloaderError, OSError, ValueError) as exc: print(f"ERRO: {exc}", file=sys.stderr); return 1

if __name__ == "__main__": raise SystemExit(main())
