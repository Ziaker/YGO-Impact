#!/usr/bin/env python3
"""Confere se as fontes canônicas versionadas permanecem byte a byte intactas."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "docs" / "context" / "sources"

EXPECTED_BINARY = {
    "Monster_Impact_GDD_v0.43.docx": (
        97_352,
        "6e40f214f2a254f5a30f54d64b4c74cccc352df1785e340e9eb4736a06c17fa9",
    ),
    "Monster_Impact_GDD_v0.42.docx": (
        96_807,
        "0a18e151aa844abcc57eb1b06611eb711c977f36c58ff98b9e937aed34e4f963",
    ),
}

# Arquivos de texto aceitam tanto a representação canônica em repositório (LF no Linux / CI)
# quanto a representação convertida pelo Git no Windows (CRLF).
EXPECTED_TEXT = {
    "PROMPT_MESTRE.txt": [
        # Canônico no repositório Git / Linux (LF)
        (
            35_829,
            "431f7e0a9bca844698eb676c856ba84a5d1e2ac4c83433d785a37241c050c26b",
        ),
        # Checkout Windows (CRLF)
        (
            37_225,
            "011fd2a1d4d4b65a96ec5c265244dfaa5b940785d851455b4ef01172fe101e67",
        ),
    ],
}


def main() -> int:
    failures: list[str] = []

    for name, (expected_size, expected_hash) in EXPECTED_BINARY.items():
        path = SOURCES / name
        if not path.is_file():
            failures.append(f"ausente: {path.relative_to(ROOT)}")
            continue

        data = path.read_bytes()
        actual_hash = hashlib.sha256(data).hexdigest()
        if len(data) != expected_size:
            failures.append(
                f"tamanho inválido em {path.relative_to(ROOT)}: "
                f"esperado {expected_size}, obtido {len(data)}"
            )
        if actual_hash != expected_hash:
            failures.append(
                f"SHA-256 inválido em {path.relative_to(ROOT)}: "
                f"esperado {expected_hash}, obtido {actual_hash}"
            )

    for name, valid_variants in EXPECTED_TEXT.items():
        path = SOURCES / name
        if not path.is_file():
            failures.append(f"ausente: {path.relative_to(ROOT)}")
            continue

        data = path.read_bytes()
        actual_hash = hashlib.sha256(data).hexdigest()
        match = any(len(data) == size and actual_hash == h for size, h in valid_variants)
        if not match:
            expected_desc = " ou ".join(f"(tamanho {s}, sha {h[:12]}...)" for s, h in valid_variants)
            failures.append(
                f"conteúdo inválido em {path.relative_to(ROOT)}: "
                f"esperado {expected_desc}, obtido tamanho {len(data)} e sha {actual_hash}"
            )

    if failures:
        for failure in failures:
            print(f"ERRO: {failure}")
        return 1

    print("Fontes canônicas conferidas: tamanho e SHA-256 válidos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
