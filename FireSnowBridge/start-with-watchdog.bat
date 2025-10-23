@echo off
REM FireSnow Bridge API - Uruchomienie z automatycznym restartem
REM ============================================================

echo.
echo ========================================
echo   FireSnow Bridge API + Watchdog
echo   Auto-restart on database changes
echo ========================================
echo.

REM Sprawdź czy pliki istnieją
if not exist "FireSnowBridge.jar" (
    echo BLAD: Brak pliku FireSnowBridge.jar
    pause
    exit /b 1
)

if not exist "lib\hsqldb.jar" (
    echo BLAD: Brak pliku lib\hsqldb.jar
    pause
    exit /b 1
)

if not exist "watchdog.ps1" (
    echo BLAD: Brak pliku watchdog.ps1
    pause
    exit /b 1
)

echo Uruchamianie watchdog...
echo.

REM Uruchom PowerShell z watchdog
powershell -ExecutionPolicy Bypass -File watchdog.ps1

echo.
echo Watchdog zakonczony.
pause



