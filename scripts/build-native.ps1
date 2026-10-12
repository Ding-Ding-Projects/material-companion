param([string]$QtRoot,[switch]$Silent,[switch]$DesktopTests,[switch]$AllowDirtySource,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'source-snapshot.ps1')
. (Join-Path $PSScriptRoot 'ensure-qt.ps1')
try {
 $root=Split-Path $PSScriptRoot -Parent
 $snapshot=Get-SourceSnapshot $root ([bool]$AllowDirtySource)
 if(-not $QtRoot) { $QtRoot=$env:MATERIAL_COMPANION_QT_ROOT }
 $qtComponents=@('Core','Network','Sql'); if(Test-Path (Join-Path $root 'desktop/CMakeLists.txt')) { $qtComponents+=@('Quick','QuickControls2','ShaderTools'); if($DesktopTests) { $qtComponents+='Test' } }
 $qtUsable=[bool]$QtRoot
 if($qtUsable) { foreach($component in $qtComponents) { if(-not(Test-Path -LiteralPath (Join-Path $QtRoot ('lib/cmake/Qt6'+$component+'/Qt6'+$component+'Config.cmake')))) { $qtUsable=$false } } }
 if(-not $qtUsable) { Write-Host 'The selected read-only Qt cache is absent or lacks required modules. Acquiring the complete pinned project-owned cache.'; $QtRoot=Ensure-Qt683 }
 $versionConfig=Get-Content -LiteralPath (Join-Path $QtRoot 'lib/cmake/Qt6/Qt6ConfigVersionImpl.cmake') -Raw
 if($versionConfig -notmatch 'PACKAGE_VERSION "6\.8\.3"') { throw 'The selected Qt cache is not the pinned 6.8.3 version.' }
 $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
 if(-not(Test-Path $vswhere)) { throw 'MSVC discovery requires official vswhere. Fresh-machine bootstrap is not yet implemented.' }
 $vs=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
 if(-not $vs) { throw 'MSVC x64 toolchain unavailable. Fresh-machine bootstrap is not yet implemented.' }
 $cmake=(Get-Command cmake.exe -ErrorAction Stop).Source
 $build=Join-Path $root 'build/native'; New-Item -ItemType Directory -Force $build | Out-Null
 $batch=Join-Path $build 'compile.cmd'
 $desktopOption=if($DesktopTests){'ON'}else{'OFF'}
 $lines=@('@echo off',('call "'+(Join-Path $vs 'VC/Auxiliary/Build/vcvars64.bat')+'" >nul'),'if errorlevel 1 exit /b %errorlevel%',('"'+$cmake+'" -S "'+$root+'" -B "'+$build+'" -G Ninja -DCMAKE_BUILD_TYPE=Release -DCOMPANION_DESKTOP_TESTS='+$desktopOption+' -DCMAKE_PREFIX_PATH="'+$QtRoot+'"'),'if errorlevel 1 exit /b %errorlevel%',('"'+$cmake+'" --build "'+$build+'"'),'exit /b %errorlevel%')
 [IO.File]::WriteAllLines($batch,$lines)
 & $env:ComSpec /d /c $batch
 if($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
 # Explicitly deploy the exact linked Qt modules. Relocated caches may carry an
 # old compiled installation prefix; no external cache configuration is changed.
 foreach($dll in @('Qt6Core.dll','Qt6Network.dll','Qt6Sql.dll')) { Copy-Item -LiteralPath (Join-Path $QtRoot ('bin/'+$dll)) -Destination $build -Force }
 $sqlPlugins=Join-Path $build 'sqldrivers'; New-Item -ItemType Directory -Force $sqlPlugins | Out-Null
 Copy-Item -LiteralPath (Join-Path $QtRoot 'plugins/sqldrivers/qsqlite.dll') -Destination $sqlPlugins -Force
 $redist=Get-ChildItem (Join-Path $vs 'VC/Redist/MSVC') -Directory | Where-Object { $_.Name -match '^\d+\.' } | Sort-Object Name -Descending | Select-Object -First 1
 $crt=Get-ChildItem (Join-Path $redist.FullName 'x64') -Directory -Filter '*.CRT' | Select-Object -First 1
 if(-not $crt) { throw 'MSVC redistributable runtime payload is unavailable.' }
 Get-ChildItem $crt.FullName -Filter '*.dll' | Copy-Item -Destination $build -Force
 $desktopBuild=Join-Path $build 'desktop'
 if(Test-Path -LiteralPath (Join-Path $desktopBuild 'material-companion.exe')) {
  # Explicit deployment from a read-only, relocated Qt cache.
  Get-ChildItem (Join-Path $QtRoot 'bin') -Filter 'Qt6*.dll' | Where-Object { $_.Name -notmatch 'd\.dll$' } | Copy-Item -Destination $desktopBuild -Force
  Get-ChildItem $crt.FullName -Filter '*.dll' | Copy-Item -Destination $desktopBuild -Force
  Copy-Item -LiteralPath (Join-Path $QtRoot 'qml') -Destination $desktopBuild -Recurse -Force
  foreach($plugin in @('platforms','imageformats','styles','sqldrivers')) { if(Test-Path (Join-Path $QtRoot ('plugins/'+$plugin))) { Copy-Item -LiteralPath (Join-Path $QtRoot ('plugins/'+$plugin)) -Destination $desktopBuild -Recurse -Force } }
  "[Paths]`nPrefix=.`nPlugins=.`nQmlImports=qml" | Set-Content -LiteralPath (Join-Path $desktopBuild 'qt.conf') -Encoding ASCII
 }
 Assert-SourceUnchanged $root $snapshot
 $files=Get-ChildItem $build -File -Recurse | Where-Object { $_.Extension -in @('.exe','.dll','.qml','.rcc') -or $_.Name -eq 'qt.conf' } | ForEach-Object { @{file=$_.FullName.Substring($build.Length+1).Replace('\','/');sha256=(FileHash $_.FullName)} }
 @{schemaVersion=2;sourceCommit=$snapshot.sourceCommit;sourceSnapshot=$snapshot;builtAtUtc=[DateTime]::UtcNow.ToString('o');desktopBuilt=(Test-Path (Join-Path $root 'desktop/CMakeLists.txt'));files=@($files)} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $build 'build-receipt.json') -Encoding UTF8
 Write-Host 'Native build completed. This receipt distinguishes local changes from the source commit.'
 exit 0
} catch { Write-Error $_; exit 1 }
