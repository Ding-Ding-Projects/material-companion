param([string]$CacheRoot)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'source-snapshot.ps1')
function ArchiveSha1([string]$Path) { $stream=[IO.File]::OpenRead($Path); $sha=[Security.Cryptography.SHA1]::Create(); try { ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose(); $stream.Dispose() } }
function Assert-SafeQtMember([string]$Member) { if(-not $Member -or $Member -match '(^[/\\]|^[A-Za-z]:|(^|[/\\])\.\.([/\\]|$))') { throw 'Unsafe Qt archive/cache member path.' } }
function Assert-QtCache([string]$Destination,$Receipt,$Manifest) {
 if($Receipt.metadataSha256 -ne $Manifest.metadataSha256 -or $Receipt.qtVersion -ne '6.8.3' -or $Receipt.architecture -ne 'msvc2022_64') { throw 'Qt cache metadata receipt does not match the pinned manifest.' }
 $actual=@(Get-ChildItem $Destination -File -Recurse | Where-Object { $_.FullName -ne (Join-Path $Destination 'bootstrap-receipt.json') } | ForEach-Object { $_.FullName.Substring($Destination.Length+1).Replace('\','/') } | Sort-Object)
 $declared=@($Receipt.files | ForEach-Object { $_.file } | Sort-Object)
 if(($actual -join "`n") -ne ($declared -join "`n")) { throw 'Qt cache inventory is missing, duplicate or contains unexpected files.' }
 foreach($file in $Receipt.files) { Assert-SafeQtMember $file.file; $path=Join-Path $Destination $file.file; if((FileHash $path) -ne $file.sha256) { throw ('Qt cache file changed: '+$file.file) } }
}

function Find-QtArchiveTool([string]$CacheRoot) {
 $candidates=@()
 $command=Get-Command 7z.exe -ErrorAction SilentlyContinue
 if($command) { $candidates+=$command.Source }
 foreach($base in @($env:ProgramFiles,${env:ProgramFiles(x86)})) {
  if($base) { $candidates+=(Join-Path $base '7-Zip/7z.exe') }
 }
 foreach($candidate in ($candidates | Select-Object -Unique)) {
  if(-not(Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
  $capabilities=(& $candidate i 2>$null) -join "`n"
  if($LASTEXITCODE -eq 0 -and $capabilities -match '7-Zip(?: \([^)]*\))? ([0-9]+\.[0-9]+)' -and [version]$Matches[1] -ge [version]'25.01' -and $capabilities -match '\bLZMA\b') { return $candidate }
 }
 # Official release asset digest, checked before any executable invocation.
 $tools=Join-Path $CacheRoot 'tools'; New-Item -ItemType Directory -Force $tools | Out-Null
 $portable=Join-Path $tools '7zr-26.04.exe'
 $expected='256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282'
 if(-not(Test-Path -LiteralPath $portable) -or (FileHash $portable) -ne $expected) {
  $download=$portable+'.download'
  Invoke-WebRequest -UseBasicParsing 'https://github.com/ip7z/7zip/releases/download/26.04/7zr.exe' -OutFile $download
  if((FileHash $download) -ne $expected) { throw 'Pinned 7-Zip portable archive tool checksum mismatch.' }
  Move-Item -LiteralPath $download -Destination $portable -Force
 }
 return $portable
}
function Assert-QtArchiveListing([string[]]$Listing) {
 $members=0
 foreach($record in (($Listing -join "`n") -split '\r?\n\s*\r?\n')) {
  if(-not $record.Trim()) { continue }
  $fields=@{}
  foreach($line in ($record -split '\r?\n')) {
   if($line -notmatch '^([^=]+) = (.*)$') { throw 'Unrecognized Qt archive member listing.' }
   $key=$Matches[1]; $value=$Matches[2]
   if($fields.ContainsKey($key)) { throw 'Duplicate Qt archive member metadata.' }
   $fields[$key]=$value
  }
  if(-not $fields.ContainsKey('Path') -or -not $fields.ContainsKey('Attributes')) { throw 'Incomplete Qt archive member listing.' }
  Assert-SafeQtMember $fields.Path
  if($fields.Path -match '[:\x00-\x1f]' -or $fields.Path -match '(^|[/\\])\.([/\\]|$)') { throw 'Unsafe Qt archive member syntax.' }
  if($fields.ContainsKey('Symbolic Link') -or $fields.ContainsKey('Hard Link') -or $fields.ContainsKey('Reparse') -or $fields.Attributes -match '(^|\s)l|\bReparse\b') { throw 'Qt archive link members are not supported.' }
  $members++
 }
 if($members -eq 0) { throw 'Qt archive member listing is empty.' }
}

function Ensure-Qt683([string]$Root) {
 if(-not $Root) { $Root=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'MaterialCompanion/toolchain/Qt' }
 $Root=[IO.Path]::GetFullPath($Root); New-Item -ItemType Directory -Force $Root | Out-Null
 $manifest=Get-Content (Join-Path $PSScriptRoot 'qt683-manifest.json') -Raw | ConvertFrom-Json
 $destination=Join-Path $Root '6.8.3/msvc2022_64'; $receiptPath=Join-Path $destination 'bootstrap-receipt.json'
 if(Test-Path -LiteralPath $receiptPath) {
  $receipt=Get-Content $receiptPath -Raw | ConvertFrom-Json
  Assert-QtCache $destination $receipt $manifest
  Write-Host 'Reusing verified project-owned Qt 6.8.3 MSVC2022 cache.'
  return $destination
 }
 if(Test-Path -LiteralPath $destination) { throw 'An unverified Qt destination already exists; it was retained and will not be overwritten.' }
 $archiveTool=Find-QtArchiveTool $Root
 $downloads=Join-Path $Root 'downloads'; New-Item -ItemType Directory -Force $downloads | Out-Null
 $metadata=Join-Path $downloads 'Updates.xml'
 if(-not(Test-Path $metadata) -or (FileHash $metadata) -ne $manifest.metadataSha256) { Invoke-WebRequest -UseBasicParsing $manifest.metadataUrl -OutFile ($metadata+'.download'); if((FileHash ($metadata+'.download')) -ne $manifest.metadataSha256) { throw 'Official Qt metadata differs from the pinned reviewed version.' }; Move-Item -LiteralPath ($metadata+'.download') -Destination $metadata -Force }
 [xml]$xml=Get-Content $metadata -Raw
 $stage=Join-Path $Root ('stage-'+[Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory $stage | Out-Null
 $archiveRows=@()
 foreach($item in $manifest.archives) {
  if($item.url -notmatch '^https://download\.qt\.io/online/qtsdkrepository/windows_x86/desktop/qt6_683/qt6_683/' -or $item.archive -notmatch '^[A-Za-z0-9_.-]+\.7z$' -or $item.sha1 -notmatch '^[0-9a-f]{40}$') { throw 'Invalid pinned Qt archive identity.' }
  $package=$xml.Updates.PackageUpdate | Where-Object { $item.url.Contains('/'+$_.Name+'/'+$_.Version+$item.archive) }
  if(-not $package -or $package.Version -ne $manifest.packageVersion -or ($package.DownloadableArchives -split ', ') -notcontains $item.archive) { throw 'Archive is not present in the pinned official metadata.' }
  $archive=Join-Path $downloads $item.archive
  if(-not(Test-Path -LiteralPath $archive) -or (ArchiveSha1 $archive) -ne $item.sha1) {
   Write-Host ('Downloading pinned Qt archive '+$item.archive)
   Invoke-WebRequest -UseBasicParsing $item.url -OutFile ($archive+'.download')
   if((ArchiveSha1 ($archive+'.download')) -ne $item.sha1) { throw ('Official Qt archive checksum mismatch: '+$item.archive) }
   Move-Item -LiteralPath ($archive+'.download') -Destination $archive -Force
  }
  $entries=@(& $archiveTool l -slt -ba -- $archive); if($LASTEXITCODE -ne 0) { throw 'Qt archive listing failed.' }
  Assert-QtArchiveListing $entries
  $output=Join-Path $stage $item.destination; New-Item -ItemType Directory -Force $output | Out-Null
  & $archiveTool x -y -bd -bb0 ('-o'+$output) -- $archive | Out-Null; if($LASTEXITCODE -ne 0) { throw ('Qt archive extraction failed: '+$item.archive) }
  $archiveRows+=@{archive=$item.archive;url=$item.url;sha1=$item.sha1;sha256=(FileHash $archive);bytes=(Get-Item $archive).Length}
 }
 "[Paths]`nPrefix=..`n" | Set-Content -LiteralPath (Join-Path $stage 'bin/qt.conf') -Encoding ASCII
 foreach($required in @('lib/cmake/Qt6Core/Qt6CoreConfig.cmake','lib/cmake/Qt6Quick/Qt6QuickConfig.cmake','lib/cmake/Qt6QuickControls2/Qt6QuickControls2Config.cmake','lib/cmake/Qt6Sql/Qt6SqlConfig.cmake','lib/cmake/Qt6Test/Qt6TestConfig.cmake','lib/cmake/Qt6ShaderTools/Qt6ShaderToolsConfig.cmake','qml/QtQuick/Controls/qmldir')) { if(-not(Test-Path (Join-Path $stage $required))) { throw ('Qt module missing after official extraction: '+$required) } }
 $files=@(Get-ChildItem $stage -File -Recurse | ForEach-Object { @{file=$_.FullName.Substring($stage.Length+1).Replace('\','/');sha256=(FileHash $_.FullName)} })
 @{schemaVersion=1;qtVersion='6.8.3';architecture='msvc2022_64';metadataUrl=$manifest.metadataUrl;metadataSha256=$manifest.metadataSha256;archives=$archiveRows;files=$files;createdUtc=[DateTime]::UtcNow.ToString('o');freshEnvironmentVerified=$false} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $stage 'bootstrap-receipt.json') -Encoding UTF8
 New-Item -ItemType Directory -Force (Split-Path $destination -Parent) | Out-Null
 Move-Item -LiteralPath $stage -Destination $destination
 Write-Host 'Pinned Qt 6.8.3 Core, Quick, QuickControls2, Sql, Test and ShaderTools cache acquired and hash-verified.'
 return $destination
}
if($MyInvocation.InvocationName -ne '.') { try { Ensure-Qt683 $CacheRoot } catch { Write-Error $_; exit 1 } }
