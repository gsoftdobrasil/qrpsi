<#
.SYNOPSIS
    Gera artefatos de producao do QRPSI (backend + frontend) na pasta .\dist.

.DESCRIPTION
    - Backend: instalacao de deps (npm install ou npm ci) + npm run build
    - Frontend: igual
    - Copia para .\dist\backend e .\dist\frontend (vide docs\PUBLICACAO-LINUX.md).

    No Windows, "npm ci" costuma falhar com EPERM ao remover esbuild.exe quando outro processo
    usa node_modules (ex.: npm run dev / tsx / antivirus). Por padrao este script usa
    "npm install". Para reproducivel em CI/CD: .\build-producao.ps1 -NpmDeps ci

    Invoca npm.cmd para evitar conflitos com npm.ps1 (Set-StrictMode).

    O arquivo .env NAO e copiado por seguranca - configure no servidor.

.PARAMETER NpmDeps
    "install" (padrao) ou "ci" para instalar a partir apenas do package-lock.json.

.PARAMETER SkipNpm
    Pula apenas a etapa npm install/ci; mantem npm run build (dependencias devem estar ok).

.EXAMPLE
    .\build-producao.ps1

.EXAMPLE
    .\build-producao.ps1 -NpmDeps ci
#>

[CmdletBinding()]
param(
    [ValidateSet('install', 'ci')]
    [string] $NpmDeps = 'install',

    [switch] $SkipNpm
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$ReleaseRoot = Join-Path $Root "dist"
$BackendRoot = Join-Path $Root "backend"
$FrontendRoot = Join-Path $Root "frontend"

function Test-RepoPath {
    param([string]$Path, [string]$Nome)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Pasta obrigatoria nao encontrada: $Nome ($Path)"
    }
}

function Resolve-NpmCmdPath {
    $candidates = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramW6432)) {
        $candidates.Add((Join-Path $env:ProgramW6432 "nodejs\npm.cmd"))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles "nodejs\npm.cmd"))
    }
    $pf86 = ${env:ProgramFiles(x86)}
    if (-not [string]::IsNullOrWhiteSpace($pf86)) {
        $candidates.Add((Join-Path $pf86 "nodejs\npm.cmd"))
    }

    foreach ($p in $candidates) {
        if (Test-Path -LiteralPath $p) {
            return (Resolve-Path -LiteralPath $p).Path
        }
    }

    $fromPath = Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
    if ($fromPath) {
        return $fromPath
    }

    throw "npm.cmd nao encontrado. Instale Node.js LTS ou confira PATH (evite depender apenas de 'npm.ps1')."
}

$NpmCmdPath = Resolve-NpmCmdPath

function Invoke-Npm {
    param(
        [string]$WorkingDirectory,
        [string]$Label,
        [string[]]$Arguments
    )
    Write-Host "[$Label] npm $($Arguments -join ' ') ..." -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $NpmCmdPath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Comando falhou com exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

Write-Host "`nQRPSI - Build de producao`nRaiz: $Root`nSaida: $ReleaseRoot`nNpm: $NpmCmdPath`nDeps: $(if ($SkipNpm) { '(pulado)' } else { $NpmDeps })`n" -ForegroundColor Green

Test-RepoPath $BackendRoot "backend"
Test-RepoPath $FrontendRoot "frontend"

if (Test-Path -LiteralPath $ReleaseRoot) {
    Write-Host "Removendo pasta dist anterior..." -ForegroundColor Yellow
    Remove-Item -LiteralPath $ReleaseRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseRoot | Out-Null

# --- Backend ---
if (-not $SkipNpm) {
    Invoke-Npm $BackendRoot "backend" @($NpmDeps)
}
Invoke-Npm $BackendRoot "backend" @("run", "build")

$OutBackend = Join-Path $ReleaseRoot "backend"
New-Item -ItemType Directory -Path $OutBackend | Out-Null
New-Item -ItemType Directory -Path (Join-Path $OutBackend "dist") | Out-Null

Copy-Item -Path (Join-Path $BackendRoot "dist\*") -Destination (Join-Path $OutBackend "dist") -Recurse -Force
Copy-Item -Path (Join-Path $BackendRoot "package.json"), (Join-Path $BackendRoot "package-lock.json") -Destination $OutBackend -Force
Copy-Item -Path (Join-Path $BackendRoot "knexfile.ts") -Destination $OutBackend -Force
Copy-Item -Path (Join-Path $BackendRoot "migrations") -Destination $OutBackend -Recurse -Force

if (Test-Path -LiteralPath (Join-Path $BackendRoot "seeds")) {
    Copy-Item -Path (Join-Path $BackendRoot "seeds") -Destination $OutBackend -Recurse -Force
}

# --- Frontend ---
if (-not $SkipNpm) {
    Invoke-Npm $FrontendRoot "frontend" @($NpmDeps)
}
Invoke-Npm $FrontendRoot "frontend" @("run", "build")

$OutFrontend = Join-Path $ReleaseRoot "frontend"
New-Item -ItemType Directory -Path $OutFrontend | Out-Null
Copy-Item -Path (Join-Path $FrontendRoot "dist\*") -Destination $OutFrontend -Recurse -Force

Write-Host "`nConcluido." -ForegroundColor Green

$footerBackend = ($OutBackend -replace '\\', '/')
$footerFrontend = ($OutFrontend -replace '\\', '/')
Write-Host @"

Artefatos:
  $footerBackend
    - dist/           (codigo compilado da API - node dist/server.js)
    - package.json / package-lock.json
    - knexfile.ts, migrations/ ( e seeds/ se existir )
  $footerFrontend
    - index.html, assets/, ... (Nginx root)

Proximo passo no servidor (resumo): copiar estas pastas para /var/www/qrpsi, npm ci --omit=dev no backend, .env no backend, systemd + nginx.

Documentacao: docs/PUBLICACAO-LINUX.md
"@ -ForegroundColor Gray
