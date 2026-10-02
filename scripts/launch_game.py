#!/usr/bin/env python3
"""Launcher local do cliente web tático do Yu-Gi-Oh! Impact.

Verifica compilação TypeScript (dist/), inicializa servidor HTTP local
com alocação automática de porta e abre o navegador padrão.
"""

from __future__ import annotations

import argparse
import http.server
import os
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_PORT = 8080
DEFAULT_HOST = "127.0.0.1"


def is_built(root: Path = ROOT_DIR) -> bool:
    app_js = root / "dist" / "web" / "app.js"
    return app_js.is_file() and app_js.stat().st_size > 0


def build_project(root: Path = ROOT_DIR) -> None:
    print("Compilando cliente tático via npm run build...")
    use_shell = sys.platform == "win32"
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=root,
        shell=use_shell,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("Erro na compilação TypeScript:\n", result.stderr or result.stdout, file=sys.stderr)
        raise RuntimeError("Falha ao compilar o projeto TypeScript.")
    print("Compilação concluída com sucesso (dist/ gerado).")


def find_available_port(host: str = DEFAULT_HOST, starting_port: int = DEFAULT_PORT, max_attempts: int = 50) -> int:
    for port in range(starting_port, starting_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
                return port
            except OSError:
                continue
    raise RuntimeError(
        f"Nenhuma porta disponível encontrada no intervalo {starting_port}-{starting_port + max_attempts - 1}."
    )


class TacticalHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler com logging conciso e cabeçalhos adequados para módulos ES."""

    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory or str(ROOT_DIR), **kwargs)

    def end_headers(self) -> None:
        # Previne cache excessivo durante desenvolvimento local
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        # Silencia ruído desnecessário de logs HTTP mantendo console limpo
        pass


def launch(
    host: str = DEFAULT_HOST,
    port: int | None = None,
    open_browser: bool = True,
    force_build: bool = False,
    root: Path = ROOT_DIR,
) -> int:
    if force_build or not is_built(root):
        build_project(root)

    chosen_port = port if port is not None else find_available_port(host=host, starting_port=DEFAULT_PORT)
    url = f"http://{host}:{chosen_port}/index.html"

    handler_factory = lambda *args, **kwargs: TacticalHTTPRequestHandler(*args, directory=str(root), **kwargs)
    server = http.server.ThreadingHTTPServer((host, chosen_port), handler_factory)

    banner = f"""
========================================================================
  Yu-Gi-Oh! Impact — Tactical Web Client Launcher
========================================================================
  Servidor local:  {url}
  Diretório raiz:  {root}
  Status:          Rodando (Threaded HTTP Server)
  Para encerrar:   Pressione Ctrl+C neste terminal
========================================================================
"""
    print(banner)

    if open_browser:
        def _open():
            time.sleep(0.3)
            webbrowser.open(url)

        threading.Thread(target=_open, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor local do Yu-Gi-Oh! Impact. Até logo!")
    finally:
        server.server_close()

    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Launcher local do Yu-Gi-Oh! Impact.")
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"Host de escuta (padrão: {DEFAULT_HOST})")
    parser.add_argument("--port", type=int, default=None, help=f"Porta fixa (padrão: alocação dinâmica a partir de {DEFAULT_PORT})")
    parser.add_argument("--no-browser", action="store_true", help="Não abrir o navegador automaticamente")
    parser.add_argument("--build", action="store_true", help="Força recompilação TypeScript antes de iniciar")
    parser.add_argument("--build-only", action="store_true", help="Apenas compila os assets e encerra sem abrir servidor")

    args = parser.parse_args(argv)

    if args.build_only:
        build_project(ROOT_DIR)
        return 0

    return launch(
        host=args.host,
        port=args.port,
        open_browser=not args.no_browser,
        force_build=args.build,
        root=ROOT_DIR,
    )


if __name__ == "__main__":
    raise SystemExit(main())
