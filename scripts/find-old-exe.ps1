$out = 'C:\website\study-os-main\scripts\shadow-exe-search.txt'
$res = @()
foreach ($n in 5,4,3,2,1) {
  $p = "\\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy$n\website\study os APP\StudyOS\StudyOS.exe"
  try {
    if (Test-Path -LiteralPath $p) {
      $item = Get-Item -LiteralPath $p
      $res += "FOUND ShadowCopy${n}: $($item.Length) bytes | modified $($item.LastWriteTime)"
      Copy-Item -LiteralPath $p -Destination "C:\website\study-os-main\scripts\old-exe-sc$n.exe" -Force
    } else {
      $res += "not found in ShadowCopy$n"
    }
  } catch {
    $res += "ERROR ShadowCopy${n}: $($_.Exception.Message)"
  }
}
$res | Out-File $out -Encoding utf8