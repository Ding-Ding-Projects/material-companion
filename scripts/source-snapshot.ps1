function FileHash([string]$Path) { $stream=[IO.File]::OpenRead($Path); $sha=[Security.Cryptography.SHA256]::Create(); try { ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose(); $stream.Dispose() } }
function Get-SourceSnapshot([string]$Root,[bool]$AllowDirty=$false) {
 $head=(& git -C $Root rev-parse HEAD).Trim(); if($LASTEXITCODE -ne 0) { throw 'Source revision unavailable.' }
 $ref=(& git -C $Root symbolic-ref -q HEAD) -join ''; if(-not $ref) { $ref='DETACHED' }
 $status=((& git -C $Root status --porcelain=v1 --untracked-files=all) -join "`n")
 if($status -and -not $AllowDirty) { throw 'Source has local changes. Preserve it first, or explicitly pass -AllowDirtySource to record exact inputs.' }
 $paths=@(& git -C $Root -c core.quotepath=false ls-files --cached --others --exclude-standard) | Sort-Object -Unique
 $files=@(); foreach($relative in $paths) {
  if($relative.StartsWith('"') -or $relative.Contains("`n")) { throw 'Unsupported ambiguous source filename.' }
  $absolute=Join-Path $Root $relative
  if(Test-Path -LiteralPath $absolute -PathType Leaf) { $files+=@{file=$relative;sha256=(FileHash $absolute)} } else { $files+=@{file=$relative;sha256='missing'} }
 }
 return @{sourceCommit=$head;sourceRef=$ref;trackedChanges=$status;allowDirtySource=$AllowDirty;inputs=$files}
}
function Assert-SourceUnchanged([string]$Root,$Original) {
 $current=Get-SourceSnapshot $Root $true
 if($Original.sourceCommit -ne $current.sourceCommit -or $Original.sourceRef -ne $current.sourceRef -or $Original.trackedChanges -ne $current.trackedChanges) { throw 'Source identity moved during production; outputs are unverified.' }
 $a=($Original.inputs | ForEach-Object { $_.file+':'+$_.sha256 }) -join "`n"
 $b=($current.inputs | ForEach-Object { $_.file+':'+$_.sha256 }) -join "`n"
 if($a -ne $b) { throw 'Source inputs moved during production; outputs are unverified.' }
}
