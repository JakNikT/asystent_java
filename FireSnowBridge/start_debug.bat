@echo off
REM FireSnow Bridge API - Uruchomienie z DEBUG
REM ===========================================

echo.
echo ===========================================
echo   FireSnow Bridge API (DEBUG MODE)
echo ===========================================
echo.

echo [1/5] Sprawdzanie lokalizacji...
cd
echo Obecny folder: %CD%
echo.

echo [2/5] Sprawdzanie plikow...
if exist "FireSnowBridge.jar" (
    echo   [OK] FireSnowBridge.jar znaleziony
) else (
    echo   [BLAD] FireSnowBridge.jar NIE ISTNIEJE!
    dir
    pause
    exit /b 1
)

if exist "config.properties" (
    echo   [OK] config.properties znaleziony
) else (
    echo   [UWAGA] config.properties nie istnieje - uzyje domyslnych wartosci
)

if exist "lib\hsqldb.jar" (
    echo   [OK] lib\hsqldb.jar znaleziony
) else (
    echo   [BLAD] lib\hsqldb.jar NIE ISTNIEJE!
    echo.
    echo   Sprawdz czy folder lib\ istnieje i zawiera hsqldb.jar
    pause
    exit /b 1
)
echo.

echo [3/5] Sprawdzanie Javy...
where java >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo   [OK] Java znaleziona w PATH
    java -version
) else (
    echo   [UWAGA] Java nie znaleziona w PATH
    echo   [INFO] Probuje uzyc Javy z FireSnow...
    if exist "C:\FireSoft\FireSnow21\jre\bin\java.exe" (
        echo   [OK] Java z FireSnow znaleziona
        "C:\FireSoft\FireSnow21\jre\bin\java.exe" -version
        set JAVA_CMD=C:\FireSoft\FireSnow21\jre\bin\java.exe
        goto :run_api
    ) else (
        echo   [BLAD] Java z FireSnow tez nie istnieje!
        echo.
        echo   ROZWIAZANIE:
        echo   1. Zainstaluj Java z: https://adoptium.net/
        echo   2. Lub podaj sciezke do java.exe z FireSnow
        pause
        exit /b 1
    )
)
set JAVA_CMD=java
echo.

:run_api
echo [4/5] Uruchamianie API...
echo Komenda: %JAVA_CMD% -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge
echo.

"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge

echo.
echo [5/5] API zostalo zatrzymane.
pause

