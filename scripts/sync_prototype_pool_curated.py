#!/usr/bin/env python3
"""Compatibilidade retroativa: redireciona para scripts/sync_prototype_pool.py consolidado.

A lógica de sincronização com o catálogo suplementar RushCard foi unificada em
`scripts/sync_prototype_pool.py` (resolução de ISSUE-010). Este arquivo é mantido
como shim/alias retrocompatível para evitar quebra de automações e workflows existentes.
"""

from __future__ import annotations

import sys
import warnings
from pathlib import Path
from typing import Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import sync_prototype_pool as canonical

# Re-exporta símbolos para retrocompatibilidade
RUSHCARD_SEARCH_URL = canonical.RUSHCARD_SEARCH_URL
SUPPLEMENT_SOURCE = canonical.SUPPLEMENT_SOURCE
fetch_curated_rush_normals = canonical.fetch_curated_rush_normals
fetch_cards_with_curated_rush_supplement = canonical.fetch_cards_with_rush_normal_supplement
build_selection_document = canonical.build_selection_document
iter_clean_artworks = canonical.iter_clean_artworks


def main(argv: Sequence[str] | None = None) -> int:
    warnings.warn(
        "scripts/sync_prototype_pool_curated.py está depreciado. "
        "Utilize diretamente scripts/sync_prototype_pool.py.",
        DeprecationWarning,
        stacklevel=2,
    )
    return canonical.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
