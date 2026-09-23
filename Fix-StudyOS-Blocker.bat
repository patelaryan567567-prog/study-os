@echo off
title StudyOS - Website Blocker Cleanup
color 0E

echo ================================================================
echo   StudyOS Website Blocker Cleanup (hosts + registry)
echo ================================================================
echo.

REM --- Step 0: Check for Administrator rights ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Admin rights REQUIRED.
    echo      Right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)
echo  [OK] Running with administrator rights.
echo.

REM --- Step 1: Backup the hosts file ---
set "HOSTS=C:\Windows\System32\drivers\etc\hosts"
set "BACKUP=C:\Windows\System32\drivers\etc\hosts.studyos-backup"
copy /y "%HOSTS%" "%BACKUP%" >nul
echo  [OK] Hosts file backup saved: %BACKUP%
echo.

REM --- Step 2: Remove the StudyOS section from the hosts file ---
echo  [..] Scanning hosts file for StudyOS entries...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='%HOSTS%'; $c=Get-Content $p -Raw; $b='# >>> StudyOS Blocker BEGIN >>>'; $e='# <<< StudyOS Blocker END <<<'; $i=$c.IndexOf($b); $j=$c.IndexOf($e); if($i -ge 0 -and $j -ge 0){ $c=$c.Substring(0,$i)+$c.Substring($j+$e.Length); Set-Content -Path $p -Value $c -Encoding ASCII; Write-Host ' [OK] StudyOS block entries REMOVED from hosts.' } else { Write-Host ' [--] No StudyOS entries found in hosts (already clean).' }"

echo.

REM --- Step 3: Remove Chrome / Edge Secure DNS policy (registry) ---
echo  [..] Removing Chrome DnsOverHttpsMode policy...
reg delete "HKLM\SOFTWARE\Policies\Google\Chrome" /v DnsOverHttpsMode /f >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Chrome DNS policy removed.
) else (
    echo  [--] Chrome DNS policy not present (already clean).
)

echo  [..] Removing Edge DnsOverHttpsMode policy...
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v DnsOverHttpsMode /f >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Edge DNS policy removed.
) else (
    echo  [--] Edge DNS policy not present (already clean).
)
echo.

REM --- Step 4: Flush the OS DNS cache ---
echo  [..] Flushing DNS cache...
ipconfig /flushdns >nul
echo  [OK] DNS cache flushed.
echo.

REM --- Step 5: Verify ---
findstr /C:"studyos-block" "%HOSTS%" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [!] WARNING: StudyOS entries are STILL in the hosts file!
) else (
    echo  [OK] VERIFIED: No StudyOS entries remain in the hosts file.
)

reg query "HKLM\SOFTWARE\Policies\Google\Chrome" /v DnsOverHttpsMode >nul 2>&1
if %errorlevel% equ 0 (
    echo  [!] WARNING: Chrome DNS policy still present.
) else (
    echo  [OK] VERIFIED: No Chrome DNS policy.
)

reg query "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v DnsOverHttpsMode >nul 2>&1
if %errorlevel% equ 0 (
    echo  [!] WARNING: Edge DNS policy still present.
) else (
    echo  [OK] VERIFIED: No Edge DNS policy.
)
echo.

echo ================================================================
echo   FINISHED.
echo   IMPORTANT: Fully close Chrome / Edge (and/or restart your PC),
echo   then try the website again.
echo ================================================================
pause