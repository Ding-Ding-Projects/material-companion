$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../../scripts/source-snapshot.ps1')
$temp=Join-Path ([IO.Path]::GetTempPath()) ('companion-source-test-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $temp | Out-Null
try {
 & git -C $temp init -q; & git -C $temp config user.name 'Claude Fable 5.1'; & git -C $temp config user.email 'noreply@anthropic.com'
 [IO.File]::WriteAllText((Join-Path $temp 'input.txt'),'first')
 & git -C $temp add input.txt; & git -C $temp commit -q -m 'Fixture / 測試資料' -m 'Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>'
 $snapshot=Get-SourceSnapshot $temp
 Assert-SourceUnchanged $temp $snapshot
 [IO.File]::WriteAllText((Join-Path $temp 'input.txt'),'changed')
 $rejected=$false; try { Assert-SourceUnchanged $temp $snapshot } catch { $rejected=$true }; if(-not $rejected) { throw 'Changed source was accepted.' }
 $rejected=$false; try { Get-SourceSnapshot $temp | Out-Null } catch { $rejected=$true }; if(-not $rejected) { throw 'Unrecorded local changes were accepted.' }
 $dirty=Get-SourceSnapshot $temp $true; Assert-SourceUnchanged $temp $dirty
 & git -C $temp add input.txt; & git -C $temp commit -q -m 'Changed fixture / 更改測試資料' -m 'Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>'
 $rejected=$false; try { Assert-SourceUnchanged $temp $dirty } catch { $rejected=$true }; if(-not $rejected) { throw 'Moved source revision was accepted.' }
 Write-Host 'PASS 5 source receipt checks'
} finally {
 $resolved=[IO.Path]::GetFullPath($temp); if(-not $resolved.StartsWith([IO.Path]::GetTempPath(),[StringComparison]::OrdinalIgnoreCase)) { throw 'Temporary fixture boundary invalid.' }
 Remove-Item -LiteralPath $resolved -Recurse -Force
}
