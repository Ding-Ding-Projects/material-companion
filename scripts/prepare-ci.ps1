# Hosted build preparation. Local entrypoint bootstrap remains separately tracked.
$ErrorActionPreference = 'Stop'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'Windows 2022 runner is missing official Visual Studio discovery. MSVC acquisition is not implemented.' }
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if ($LASTEXITCODE -ne 0 -or -not $vs -or -not (Test-Path -LiteralPath (Join-Path $vs 'VC/Auxiliary/Build/vcvars64.bat'))) { throw 'Windows 2022 runner has no compatible MSVC x64 toolchain.' }
foreach ($tool in @('node.exe','npm.cmd','python.exe','tar.exe','git.exe')) { Get-Command $tool -ErrorAction Stop | Out-Null }
$packages = @()
if (-not (Get-Command cmake.exe -ErrorAction SilentlyContinue)) { $packages += 'cmake==3.31.6' }
if (-not (Get-Command ninja.exe -ErrorAction SilentlyContinue)) { $packages += 'ninja==1.11.1.3' }
if ($packages.Count -gt 0) {
    & python -m pip install --disable-pip-version-check @packages
    if ($LASTEXITCODE -ne 0) { throw 'Pinned CMake/Ninja acquisition from PyPI failed.' }
}
& cmake --version
if ($LASTEXITCODE -ne 0) { throw 'CMake is unavailable after preparation.' }
& ninja --version
if ($LASTEXITCODE -ne 0) { throw 'Ninja is unavailable after preparation.' }
& node --version
if ($LASTEXITCODE -ne 0) { throw 'Node is unavailable after setup-node.' }
Write-Host 'Hosted tools discovered. Qt 6.8.3 and packaging tools are acquired by the exact root producers.'
