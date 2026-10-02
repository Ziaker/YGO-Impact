<#
.SYNOPSIS
    Launcher do Yu-Gi-Oh! Impact para PowerShell no Windows.
.EXAMPLE
    .\launch.ps1
    .\launch.ps1 --no-browser
    .\launch.ps1 --port 3000
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgsList
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "[Yu-Gi-Oh! Impact] Iniciando ambiente local..." -ForegroundColor Cyan
python scripts/launch_game.py @ArgsList
