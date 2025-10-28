@echo off
REM FireSnow Bridge API - Uruchomienie (FIXED)
REM ===========================================

echo.
echo ========================================
echo   FireSnow Bridge API (FIXED)
echo ========================================
echo.

REM Ustaw katalog roboczy na folder skryptu
cd /d "%~dp0"
echo Katalog roboczy: %CD%
echo.

REM Sprawdź czy pliki wymagane istnieją
echo [1/3] Sprawdzanie plikow...

if not exist "FireSnowBridge.jar" (
    echo   [BLAD] Brak pliku FireSnowBridge.jar
    echo   Katalog: %CD%
    pause
    exit /b 1
)
echo   [OK] FireSnowBridge.jar

if not exist "lib\hsqldb.jar" (
    echo   [BLAD] Brak pliku lib\hsqldb.jar
    echo   Katalog: %CD%
    pause
    exit /b 1
)
echo   [OK] lib\hsqldb.jar

if exist "config.properties" (
    echo   [OK] config.properties
) else (
    echo   [INFO] config.properties nie znaleziony - uzyje wartosci domyslnych
)
echo.

REM Sprawdź czy Java jest dostępna
echo [2/3] Szukanie Java...
set JAVA_CMD=
where java >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set JAVA_CMD=java
    echo   [OK] Java znaleziona w PATH
    goto :java_found
)

REM Spróbuj znaleźć Java w standardowych lokalizacjach
if exist "C:\Program Files\Java\jre1.8.0_471\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\jre1.8.0_471\bin\java.exe"
    echo   [OK] Java: C:\Program Files\Java\jre1.8.0_471\bin\java.exe
    goto :java_found
)

REM Sprawdź czy jest Java z FireSnow
if exist "C:\FireSoft\FireSnow21\jre\bin\java.exe" (
    set "JAVA_CMD=C:\FireSoft\FireSnow21\jre\bin\java.exe"
    echo   [OK] Java z FireSnow
    goto :java_found
)

REM Nie znaleziono Javy
echo   [BLAD] Java nie jest zainstalowana!
echo.
echo ROZWIAZANIE: Zainstaluj Java z https://corretto.aws
pause
exit /b 1

:java_found
echo.

REM Uruchom API
echo [3/3] Uruchamianie API...
echo.
echo API bedzie dostepne na: http://localhost:8080/api/
echo.
echo UWAGA: Nie zamykaj tego okna - serwer dziala!
echo        Zatrzymanie: Ctrl+C
echo.
echo ========================================
echo.

"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge

echo.
echo ========================================
echo API zostalo zatrzymane.
echo ========================================
pause




