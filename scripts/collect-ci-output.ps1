param([Parameter(Mandatory=$true)][ValidateSet('native','documentation')][string]$Kind)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root ('artifacts/ci-' + $Kind)
New-Item -ItemType Directory -Force $out | Out-Null
$paths = if ($Kind -eq 'native') {
    @('build/native/build-receipt.json','artifacts/extension/MaterialCompanion-extension.zip',
      'artifacts/extension/build-receipt.json','artifacts/installer/Setup.exe',
      'artifacts/installer/RELEASES','artifacts/installer/MaterialCompanion-0.1.0-full.nupkg',
      'artifacts/installer/installer-receipt.json')
} else {
    @('website/dist/index.html','website/dist/component-registry.json','website/dist/build-receipt.json')
}
if ($Kind -eq 'documentation' -and (Test-Path -LiteralPath (Join-Path $root 'website/dist/assets'))) {
    $paths += @(Get-ChildItem -LiteralPath (Join-Path $root 'website/dist/assets') -File |
        Where-Object { $_.Name -match '^index-[A-Za-z0-9_-]+\.(css|js)$' } |
        ForEach-Object { 'website/dist/assets/' + $_.Name })
}
$copied = @()
foreach ($relative in $paths) {
    $source = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
    $destination = Join-Path $out $relative
    New-Item -ItemType Directory -Force (Split-Path $destination -Parent) | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    $copied += @{file=$relative; bytes=(Get-Item -LiteralPath $destination).Length;
        sha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()}
}
@{schemaVersion=1; source=$env:GITHUB_SHA; runId=$env:GITHUB_RUN_ID;
  runAttempt=$env:GITHUB_RUN_ATTEMPT; job=$env:GITHUB_JOB;
  jobStatus=$env:DELIVERY_JOB_STATUS; runnerOs=$env:RUNNER_OS;
  runnerArchitecture=$env:RUNNER_ARCH; files=$copied;
  scope=if($Kind -eq 'native'){'Existing native-only package; desktop installer integration is pending.'}else{'Documentation output only; live delivery is a separate verdict.'}
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'collection.json') -Encoding UTF8
Write-Host ('Collected ' + $copied.Count + ' explicitly allowed outputs.')
