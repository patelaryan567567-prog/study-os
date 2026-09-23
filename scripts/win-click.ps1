param([string]$Mode, [int]$Px, [int]$Py, [string]$Proc="StudyOS")
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr r, out RECT q);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  public struct RECT { public int L, T, R, B; }
}
"@
if ($Mode -eq "restore") {
  $p = Get-Process $Proc | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class SW {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@
  [SW]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
  [SW]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 500
  $r = New-Object 'W+RECT'
  [W]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
  Write-Output "$($r.L),$($r.T)"
} elseif ($Mode -eq "rect") {
  $p = Get-Process $Proc | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  $r = New-Object 'W+RECT'
  [W]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
  Write-Output "$($r.L),$($r.T)"
} elseif ($Mode -eq "click") {
  [W]::SetCursorPos($Px, $Py) | Out-Null
  Start-Sleep -Milliseconds 150
  [W]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 80
  [W]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}
