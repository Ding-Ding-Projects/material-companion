$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../scripts/ensure-qt.ps1')
$temp=Join-Path ([IO.Path]::GetTempPath()) ('companion-qt-test-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $temp | Out-Null
function Rejected($Action) { $rejected=$false; try { & $Action } catch { $rejected=$true }; if(-not $rejected) { throw 'Invalid Qt cache was accepted.' } }
try {
 [IO.File]::WriteAllText((Join-Path $temp 'module.txt'),'verified')
 $manifest=@{metadataSha256='fixture'}
 $receipt=@{metadataSha256='fixture';qtVersion='6.8.3';architecture='msvc2022_64';files=@(@{file='module.txt';sha256=(FileHash (Join-Path $temp 'module.txt'))})}
 Assert-QtCache $temp $receipt $manifest
 Rejected { Assert-SafeQtMember '../outside' }; Rejected { Assert-SafeQtMember 'C:/outside' }; Rejected { Assert-SafeQtMember '/outside' }
 [IO.File]::WriteAllText((Join-Path $temp 'module.txt'),'changed'); Rejected { Assert-QtCache $temp $receipt $manifest }
 [IO.File]::WriteAllText((Join-Path $temp 'extra.txt'),'unexpected'); Rejected { Assert-QtCache $temp $receipt $manifest }
 $receipt.qtVersion='6.9.0'; Rejected { Assert-QtCache $temp $receipt $manifest }
 Write-Host 'PASS 7 Qt bootstrap/cache checks'
} finally {
 $resolved=[IO.Path]::GetFullPath($temp); if(-not $resolved.StartsWith([IO.Path]::GetTempPath(),[StringComparison]::OrdinalIgnoreCase)) { throw 'Temporary fixture boundary invalid.' }
 Remove-Item -LiteralPath $resolved -Recurse -Force
}
