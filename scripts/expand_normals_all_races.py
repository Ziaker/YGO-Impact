#!/usr/bin/env python3
"""Expande o acervo de Monstros Normais para que TODAS as 17 RACE prioritárias
tenham pelo menos 15 Monstros Normais, com artes recortadas e sidecars TXT.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import sys
import time
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Sequence
from urllib.request import Request, urlopen
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import baixar_artes as base

ROOT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = ROOT_DIR / "assets-local" / "card-art"
RUSHCARD_PSYCHIC_URL = (
    "https://mail.rushcard.io/api/search.php?limit=100&race=Psychic"
    "&type=Normal%20Monster&sort=name"
)
RUSHCARD_THUNDER_URL = (
    "https://mail.rushcard.io/api/search.php?limit=100&race=Thunder"
    "&type=Normal%20Monster&sort=name"
)
NOTICE = (
    "REFERÊNCIA SOMENTE: os dados abaixo vêm da carta-fonte. O GDD e o conteúdo "
    "aprovado do Monster Impact prevalecem sobre regras oficiais não adaptadas."
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict[str, Any]) -> None:
    payload = (json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    base.write_atomic(path, payload)


def fetch_rush_cards(url: str, race: str, *, timeout: float = 30.0, retries: int = 3) -> list[dict[str, Any]]:
    payload = base._request_json_value(url, timeout=timeout, retries=retries)
    if not isinstance(payload, list):
        return []
    cards = []
    for raw in payload:
        if not isinstance(raw, dict):
            continue
        cid = int(raw.get("id", 0))
        if not cid:
            continue
        desc = str(raw.get("description") or raw.get("desc") or "Normal Monster").strip()
        card = {
            "id": cid,
            "name": str(raw.get("name", "")).strip(),
            "type": "Normal Monster",
            "race": race,
            "level": int(raw.get("level", 1)),
            "desc": desc,
            "archetype": str(raw.get("archetype") or "").strip() or None,
            "card_images": [{"id": cid, "image_url_cropped": f"https://images.rushcard.io/images/card/{cid}.jpg"}],
            "_monster_impact_source": "rushcard",
            "_monster_impact_image_requires_crop": True,
        }
        cards.append(card)
    return cards


def render_txt(card: dict[str, Any]) -> str:
    source_name = "RushCard API" if card.get("_monster_impact_source") == "rushcard" else "YGOPRODeck cardinfo.desc"
    lines = [
        "MONSTER IMPACT — REFERÊNCIA DA CARTA-FONTE",
        "",
        f"Nome: {card.get('name', '')}",
        f"ID: {card.get('id', '')}",
        "Categoria: Monstro",
        "Tipo da API: Normal Monster",
        f"RACE: {card.get('race', '')}",
        f"Nível: {card.get('level', 1)}",
        "Tipo Monster Impact: Normal",
        f"Fonte do texto: {source_name}",
        "",
        NOTICE,
        "",
        "DESCRIÇÃO / EFEITO DA CARTA-FONTE:",
        str(card.get("desc", "Normal Monster")).strip(),
        "",
    ]
    return "\n".join(lines)


def download_and_crop(card: dict[str, Any], dest: Path, *, timeout: float = 30.0, retries: int = 3) -> tuple[bytes, str]:
    is_rush = bool(card.get("_monster_impact_image_requires_crop"))
    url = card["card_images"][0]["image_url_cropped"]
    
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = Request(url, headers={"User-Agent": base.USER_AGENT})
            with urlopen(req, timeout=timeout) as resp:
                raw_bytes = resp.read()
            if is_rush:
                img = Image.open(io.BytesIO(raw_bytes))
                # Crop art box from Rush card (328x473 -> 26, 56, 302, 280)
                art = img.crop((26, 56, 302, 280))
                out_io = io.BytesIO()
                art.save(out_io, format="JPEG", quality=95)
                final_bytes = out_io.getvalue()
            else:
                final_bytes = raw_bytes
            digest = base.write_atomic(dest, final_bytes)
            return final_bytes, digest
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Falha ao baixar {card.get('name')} de {url}: {last_err}")


def select_candidates_for_race(
    race: str,
    needed: int,
    existing_ids: set[int],
    pool: list[dict[str, Any]],
    years: dict[str, int],
) -> list[dict[str, Any]]:
    candidates = [
        c for c in pool
        if int(c.get("id", 0)) not in existing_ids
        and str(c.get("type")) in base.NORMAL_MONSTER_API_TYPES
        and str(c.get("race")) == race
        and isinstance(c.get("level"), int)
        and not isinstance(c.get("level"), bool)
    ]

    def sort_key(c: dict[str, Any]):
        has_pre = any(
            years.get(str(s.get("set_name"))) and years[str(s["set_name"])] < 2005
            for s in c.get("card_sets") or []
        )
        pre_score = 0 if has_pre else 1
        arch = c.get("archetype")
        arch_score = 0 if not arch else 1
        lvl = c["level"]
        lvl_score = 0 if 3 <= lvl <= 6 else (1 if 1 <= lvl <= 8 else 2)
        return (pre_score, arch_score, lvl_score, c.get("name", "").casefold(), int(c.get("id", 0)))

    sorted_cands = sorted(candidates, key=sort_key)
    chosen: list[dict[str, Any]] = []
    used_arch: set[str] = set()
    for c in sorted_cands:
        arch = c.get("archetype")
        if arch and arch.casefold() in used_arch:
            continue
        chosen.append(c)
        if arch:
            used_arch.add(arch.casefold())
        if len(chosen) == needed:
            break

    if len(chosen) < needed:
        for c in sorted_cands:
            if c not in chosen:
                chosen.append(c)
                if len(chosen) == needed:
                    break

    return chosen


def main() -> int:
    selection_path = OUTPUT_DIR / "selection.json"
    manifest_path = OUTPUT_DIR / "manifest.json"

    selection = load_json(selection_path)
    manifest = load_json(manifest_path)
    manifest_files = manifest.setdefault("files", {})

    existing_rows = selection.get("cards", [])
    existing_ids = {int(r["id"]) for r in existing_rows if isinstance(r, dict) and "id" in r}

    # Count existing Normal monsters per race
    existing_normal_by_race: dict[str, list[dict[str, Any]]] = {}
    for r in existing_rows:
        if r.get("bucket") == "monster" and r.get("prototype_type") == "Normal":
            race = str(r.get("race", ""))
            existing_normal_by_race.setdefault(race, []).append(r)

    print("Carregando catálogos YGOPRODeck e RushCard...")
    cards = base.fetch_all_cards(timeout=30.0, retries=2)
    years = base.fetch_card_set_years(timeout=30.0, retries=2)
    rush_psychic = fetch_rush_cards(RUSHCARD_PSYCHIC_URL, "Psychic")
    rush_thunder = fetch_rush_cards(RUSHCARD_THUNDER_URL, "Thunder")

    pool = list(cards) + rush_psychic + rush_thunder
    print(f"Pool total montado: {len(pool)} cartas.")

    new_cards_to_add: list[dict[str, Any]] = []

    for race in base.PROJECT_PRIORITY_RACES:
        existing_count = len(existing_normal_by_race.get(race, []))
        # For Psychic, user wants all available (up to 17), for others at least 15
        needed = 16 if race == "Psychic" else max(0, 15 - existing_count)
        
        chosen = select_candidates_for_race(race, needed, existing_ids, pool, years)
        total_race = existing_count + len(chosen)
        print(f"RACE {race:15}: existentes={existing_count}, novos={len(chosen)}, total={total_race}")
        
        if total_race < 15:
            print(f"AVISO: {race} não atingiu 15! total={total_race}", file=sys.stderr)
            
        new_cards_to_add.extend(chosen)
        existing_ids.update(int(c["id"]) for c in chosen)

    print(f"\nTotal de novos Monstros Normais a baixar e registrar: {len(new_cards_to_add)}")

    downloaded = 0
    skipped = 0

    for i, card in enumerate(new_cards_to_add, 1):
        cid = int(card["id"])
        cname = str(card.get("name", ""))
        race = str(card.get("race", ""))
        level = card.get("level", 1)
        slug = base.slug_filename(cname)
        
        rel_jpg = Path("Monstros") / race / "Normal" / f"{slug}__{cid}.jpg"
        rel_txt = Path("Monstros") / race / "Normal" / f"{slug}__{cid}.txt"
        
        abs_jpg = OUTPUT_DIR / rel_jpg
        abs_txt = OUTPUT_DIR / rel_txt
        
        abs_jpg.parent.mkdir(parents=True, exist_ok=True)
        
        # Download and crop JPG if missing
        if abs_jpg.exists():
            payload = abs_jpg.read_bytes()
            digest_jpg = hashlib.sha256(payload).hexdigest()
            skipped += 1
        else:
            payload, digest_jpg = download_and_crop(card, abs_jpg)
            downloaded += 1
            print(f"[{i}/{len(new_cards_to_add)}] OK JPG  {rel_jpg.as_posix()}")

        # Write TXT sidecar
        text = render_txt(card)
        payload_txt = text.encode("utf-8")
        digest_txt = base.write_atomic(abs_txt, payload_txt)

        # Update manifest entries
        posix_jpg = rel_jpg.as_posix()
        posix_txt = rel_txt.as_posix()

        manifest_files[posix_jpg] = {
            "card_id": cid,
            "image_id": cid,
            "name": cname,
            "api_type": "Normal Monster",
            "prototype_type": "Normal",
            "race": race,
            "level": level,
            "source": card["card_images"][0]["image_url_cropped"],
            "selection_source": card.get("_monster_impact_source", "standard"),
            "sha256": digest_jpg,
            "bytes": len(payload),
        }

        manifest_files[posix_txt] = {
            "kind": "official-card-reference",
            "card_id": cid,
            "name": cname,
            "api_type": "Normal Monster",
            "race": race,
            "level": level,
            "source": "RushCard API" if card.get("_monster_impact_source") == "rushcard" else "YGOPRODeck cardinfo.desc",
            "paired_art": posix_jpg,
            "sha256": digest_txt,
            "bytes": len(payload_txt),
        }

        # Add to selection rows
        existing_rows.append({
            "api_type": "Normal Monster",
            "archetype": card.get("archetype"),
            "bucket": "monster",
            "id": cid,
            "image_url_cropped": card["card_images"][0]["image_url_cropped"],
            "level": level,
            "name": cname,
            "prototype_type": "Normal",
            "race": race,
            "selection_source": card.get("_monster_impact_source", "standard"),
        })

    # Recalculate summary in selection.json
    all_monsters = [r for r in existing_rows if r.get("bucket") == "monster"]
    monsters_by_race = dict(sorted(Counter(r.get("race", "") for r in all_monsters).items()))
    monsters_by_type = dict(sorted(Counter(r.get("prototype_type", "") for r in all_monsters).items()))
    monsters_by_level = dict(sorted(Counter(str(r.get("level")) for r in all_monsters if r.get("level") is not None).items(), key=lambda kv: int(kv[0])))

    selection["cards"] = existing_rows
    selection["summary"]["monsters_total"] = len(all_monsters)
    selection["summary"]["total_cards"] = len(existing_rows)
    selection["summary"]["monsters_by_race"] = monsters_by_race
    selection["summary"]["monsters_by_type"] = monsters_by_type
    selection["summary"]["monsters_by_level"] = monsters_by_level

    save_json(selection_path, selection)
    save_json(manifest_path, manifest)

    print(f"\nConcluído com sucesso!")
    print(f"Total de cartas na seleção: {len(existing_rows)}")
    print(f"Monstros Normais por RACE:")
    normals = [r for r in all_monsters if r.get("prototype_type") == "Normal"]
    for race, count in sorted(Counter(r.get("race", "") for r in normals).items()):
        print(f"  {race:15}: {count} Normais")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
