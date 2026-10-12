param([string]$QtRoot,[string]$NugetPath,[string]$SquirrelPath,[switch]$Silent,[switch]$AllowDirtySource,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'source-snapshot.ps1')
try {
 $root=Split-Path $PSScriptRoot -Parent
 $snapshot=Get-SourceSnapshot $root ([bool]$AllowDirtySource)
 $buildArguments=@('-Silent'); if($QtRoot) { $buildArguments+=@('-QtRoot',$QtRoot) }; if($AllowDirtySource) { $buildArguments+='-AllowDirtySource' }
 & (Join-Path $root 'build.bat') @buildArguments
 if($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
 $tools=Join-Path $root '.tools'; New-Item -ItemType Directory -Force $tools | Out-Null
 if(-not $NugetPath) {
  $NugetPath=Join-Path $tools 'nuget-6.11.1.exe'
  if(-not(Test-Path $NugetPath)) { Invoke-WebRequest -UseBasicParsing 'https://dist.nuget.org/win-x86-commandline/v6.11.1/nuget.exe' -OutFile ($NugetPath+'.download'); Move-Item -LiteralPath ($NugetPath+'.download') -Destination $NugetPath }
  if(-not(Get-Command Get-AuthenticodeSignature -ErrorAction SilentlyContinue)) { Import-Module (Join-Path ([Environment]::GetFolderPath('System')) 'WindowsPowerShell/v1.0/Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop }
  if((Get-AuthenticodeSignature $NugetPath).Status -ne 'Valid') { throw 'Official NuGet executable signature is invalid.' }
 }
 if(-not $SquirrelPath) {
  & $NugetPath install squirrel.windows -Version 2.0.1 -Source 'https://api.nuget.org/v3/index.json' -OutputDirectory $tools -NonInteractive
  if($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $SquirrelPath=Join-Path $tools 'squirrel.windows.2.0.1/tools/Squirrel.exe'
 }
 if(-not(Test-Path $NugetPath) -or -not(Test-Path $SquirrelPath)) { throw 'Pinned NuGet 6.11.1 and Squirrel.Windows 2.0.1 tools are unavailable.' }
 $stage=Join-Path $root 'build/package'; $payload=Join-Path $stage 'lib/net45'; New-Item -ItemType Directory -Force $payload | Out-Null
 $native=Join-Path $root 'build/native'
 $buildReceipt=Get-Content -LiteralPath (Join-Path $native 'build-receipt.json') -Raw | ConvertFrom-Json
 if($buildReceipt.sourceCommit -ne $snapshot.sourceCommit) { throw 'Build receipt source does not match packaging source.' }
 Copy-Item -LiteralPath (Join-Path $native 'build-receipt.json') -Destination (Join-Path $payload 'build-receipt.json') -Force
 foreach($exe in @('companion-host.exe','companion-service.exe')) { Copy-Item -LiteralPath (Join-Path $native $exe) -Destination $payload -Force }
 Get-ChildItem $native -Filter '*.dll' | Copy-Item -Destination $payload -Force
 Copy-Item -LiteralPath (Join-Path $native 'sqldrivers') -Destination $payload -Recurse -Force
 $nuspec=Join-Path $stage 'MaterialCompanion.nuspec'
 @'
<?xml version="1.0"?>
<package><metadata><id>MaterialCompanion</id><version>0.1.0</version><authors>Material Companion contributors</authors><description>Native companion service and messaging host. Desktop shell and browser registration are not included.</description></metadata><files><file src="lib\**" target="lib" /></files></package>
'@ | Set-Content -LiteralPath $nuspec -Encoding UTF8
 $out=Join-Path $root 'artifacts/installer'; New-Item -ItemType Directory -Force $out | Out-Null
 & $NugetPath pack $nuspec -BasePath $stage -OutputDirectory $stage -NoPackageAnalysis -NonInteractive
 if($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
 $package=Join-Path $stage 'MaterialCompanion.0.1.0.nupkg'
 $publisher=Start-Process -FilePath $SquirrelPath -ArgumentList @('--releasify',('"'+$package+'"'),'--releaseDir',('"'+$out+'"'),'--no-msi') -WindowStyle Hidden -PassThru -Wait
 if($publisher.ExitCode -ne 0) { exit $publisher.ExitCode }
 foreach($file in @('Setup.exe','RELEASES','MaterialCompanion-0.1.0-full.nupkg')) { if(-not(Test-Path (Join-Path $out $file))) { throw ('Missing installer output: '+$file) } }
 $files=Get-ChildItem $out -File | Where-Object { $_.Name -ne 'installer-receipt.json' } | ForEach-Object { @{file=$_.Name;bytes=$_.Length;sha256=(FileHash $_.FullName)} }
 Assert-SourceUnchanged $root $snapshot
 @{schemaVersion=2;sourceCommit=$snapshot.sourceCommit;sourceSnapshot=$snapshot;buildReceipt=$buildReceipt;unsigned=$true;runtimeVerified=$false;files=@($files)} | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $out 'installer-receipt.json') -Encoding UTF8
 Write-Host 'Unsigned Squirrel.Windows package created locally. Installation and runtime acceptance are unverified. No publication occurred.'
 exit 0
} catch { Write-Error $_; exit 1 }
