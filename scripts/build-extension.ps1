param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-snapshot.ps1')
try {
    $root = Split-Path $PSScriptRoot -Parent
    $snapshot = Get-SourceSnapshot $root $false
    $extensionRoot = Join-Path $root 'extension'
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $nodeVersion = & $node --version
    if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 20) { throw 'Node.js 20 or later is required. Missing-runtime acquisition remains incomplete.' }
    $lock = FileHash (Join-Path $extensionRoot 'package-lock.json')
    $cacheReceipt = Join-Path $extensionRoot 'node_modules/.installation-lock.sha256'
    $validCache = (Test-Path -LiteralPath $cacheReceipt) -and ((Get-Content -LiteralPath $cacheReceipt -Raw).Trim() -eq $lock) -and (Test-Path -LiteralPath (Join-Path $extensionRoot 'node_modules/.bin/tsc.cmd'))
    Push-Location $extensionRoot
    try {
        if (-not $validCache) {
            & $npm ci --ignore-scripts --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            [IO.File]::WriteAllText($cacheReceipt, $lock)
        }
        if ($env:CI -eq 'true') { & $node build.mjs } else { & $npm run build }
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally { Pop-Location }
    Assert-SourceUnchanged $root $snapshot
    $dist = Join-Path $extensionRoot 'dist'
    $receipt = Get-Content -LiteralPath (Join-Path $dist 'build.json') -Raw | ConvertFrom-Json
    if ($receipt.sourceCommit -ne $snapshot.sourceCommit) { throw 'Extension build source does not match the frozen input snapshot.' }
    $output = Join-Path $root 'artifacts/extension'
    New-Item -ItemType Directory -Force $output | Out-Null
    $zip = Join-Path $output 'MaterialCompanion-extension.zip'
    Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip -Force
    Assert-SourceUnchanged $root $snapshot
    $files = Get-ChildItem -LiteralPath $dist -File -Recurse | ForEach-Object {
        @{ file=$_.FullName.Substring($dist.Length+1).Replace('\','/'); bytes=$_.Length; sha256=(FileHash $_.FullName) }
    }
    @{ schemaVersion=1; sourceCommit=$snapshot.sourceCommit; sourceSnapshot=$snapshot; files=@($files); zip=@{file='MaterialCompanion-extension.zip';bytes=(Get-Item -LiteralPath $zip).Length;sha256=(FileHash $zip)}; runtimeVerified=$false } |
        ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $output 'build-receipt.json') -Encoding UTF8
    Write-Host 'Source-bound unpacked extension and ZIP built locally. Browser runtime acceptance is unverified. No store submission occurred.'
    exit 0
} catch { Write-Error $_; exit 1 }
