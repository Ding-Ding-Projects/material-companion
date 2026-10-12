param([string]$QtRoot,[switch]$Silent,[Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest)
$ErrorActionPreference='Stop'
function FileHash([string]$Path) { $stream=[IO.File]::OpenRead($Path); $sha=[Security.Cryptography.SHA256]::Create(); try { ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose(); $stream.Dispose() } }
try {
 $root=Split-Path $PSScriptRoot -Parent
 if(-not $QtRoot) { $QtRoot=$env:MATERIAL_COMPANION_QT_ROOT }
 if(-not $QtRoot -or -not(Test-Path -LiteralPath (Join-Path $QtRoot 'lib/cmake/Qt6/Qt6Config.cmake'))) { throw 'Qt 6.8.3 MSVC x64 is required. Supply -QtRoot or MATERIAL_COMPANION_QT_ROOT. No cache is modified.' }
 $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
 if(-not(Test-Path $vswhere)) { throw 'MSVC discovery requires official vswhere. Fresh-machine bootstrap is not yet implemented.' }
 $vs=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
 if(-not $vs) { throw 'MSVC x64 toolchain unavailable. Fresh-machine bootstrap is not yet implemented.' }
 $cmake=(Get-Command cmake.exe -ErrorAction Stop).Source
 $build=Join-Path $root 'build/native'; New-Item -ItemType Directory -Force $build | Out-Null
 $batch=Join-Path $build 'compile.cmd'
 $lines=@('@echo off',('call "'+(Join-Path $vs 'VC/Auxiliary/Build/vcvars64.bat')+'" >nul'),'if errorlevel 1 exit /b %errorlevel%',('"'+$cmake+'" -S "'+$root+'" -B "'+$build+'" -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="'+$QtRoot+'"'),'if errorlevel 1 exit /b %errorlevel%',('"'+$cmake+'" --build "'+$build+'"'),'exit /b %errorlevel%')
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
 $source=(& git -C $root rev-parse HEAD).Trim()
 $files=Get-ChildItem $build -File -Filter '*.exe' | ForEach-Object { @{file=$_.Name;sha256=(FileHash $_.FullName)} }
 @{schemaVersion=1;sourceCommit=$source;trackedChanges=((& git -C $root status --porcelain) -join "`n");builtAtUtc=[DateTime]::UtcNow.ToString('o');desktopBuilt=(Test-Path (Join-Path $root 'desktop/CMakeLists.txt'));files=@($files)} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $build 'build-receipt.json') -Encoding UTF8
 Write-Host 'Native build completed. This receipt distinguishes local changes from the source commit.'
 exit 0
} catch { Write-Error $_; exit 1 }
