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

# A revisão canônica mais recente é textual e fica em docs/context para preservar
# o DOCX v0.43 original byte a byte como fonte-base histórica.
EXPECTED_CONTEXT_TEXT = {
    "docs/context/GDD_v0.44.md": [
        # Canônico no repositório Git / Linux (LF)
        (
            3_665,
            "3f72a0520940ccaf390a466d68dd56e28636b63ac9f93a91d40791c65301982f",
        ),
        # Checkout Windows (CRLF)
        (
            3_731,
            "c36a8449c7613629f6a24bcc2508145912ddaa800c8525399ed8de8f257ffdca",
        ),
    ],
}


def _check_text_file(
    path: Path,
    valid_variants: list[tuple[int, str]],
    failures: list[str],
) -> None:
    if not path.is_file():
        failures.append(f"ausente: {path.relative_to(ROOT)}")
        return

    data = path.read_bytes()
    actual_hash = hashlib.sha256(data).hexdigest()
    match = any(len(data) == size and actual_hash == h for size, h in valid_variants)
    if not match:
        expected_desc = " ou ".join(
            f"(tamanho {size}, sha {expected_hash[:12]}...)"
            for size, expected_hash in valid_variants
        )
        failures.append(
            f"conteúdo inválido em {path.relative_to(ROOT)}: "
            f"esperado {expected_desc}, obtido tamanho {len(data)} e sha {actual_hash}"
        )


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
        _check_text_file(SOURCES / name, valid_variants, failures)

    for relative_path, valid_variants in EXPECTED_CONTEXT_TEXT.items():
        _check_text_file(ROOT / relative_path, valid_variants, failures)

    if failures:
        for failure in failures:
            print(f"ERRO: {failure}")
        return 1

    print("Fontes canônicas conferidas: tamanho e SHA-256 válidos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
