@echo off
setlocal enabledelayedexpansion

title Yu-Gi-Oh! Impact Launcher
cd /d "%~dp0"

echo [Yu-Gi-Oh! Impact] Iniciando ambiente local...
python scripts\launch_game.py %*

if errorlevel 1 (
    echo.
    echo [ERRO] Ocorreu uma falha ao iniciar o launcher.
    pause
)
