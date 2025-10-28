@echo off
REM FireSnow Bridge API - Uruchomienie
REM ===================================

echo.
echo ========================================
echo   FireSnow Bridge API
echo ========================================
echo.

REM Sprawdź czy pliki wymagane istnieją
echo [1/3] Sprawdzanie plikow...
if not exist "FireSnowBridge.jar" (
    echo   [BLAD] Brak pliku FireSnowBridge.jar
    echo.
    echo   Upewnij sie ze plik znajduje sie w folderze: %CD%
    echo.
    pause
    exit /b 1
)
echo   [OK] FireSnowBridge.jar

if not exist "lib\hsqldb.jar" (
    echo   [BLAD] Brak pliku lib\hsqldb.jar
    echo.
    echo   Skopiuj plik hsqldb.jar z FireSnow do folderu lib\
    echo   (C:\FireSoft\FireSnow21\lib\hsqldb.jar)
    echo.
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

REM Sprawdź czy Java jest dostępna i znajdź ją automatycznie
echo [2/3] Szukanie Java...
set JAVA_CMD=
where java >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set JAVA_CMD=java
    echo   [OK] Java znaleziona w PATH
    goto :java_found
)

REM Spróbuj znaleźć Java w standardowych lokalizacjach
if exist "C:\Program Files\Java\latest\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\latest\bin\java.exe"
    echo   [OK] Java: C:\Program Files\Java\latest\bin\java.exe
    goto :java_found
)

if exist "C:\Program Files\Java\jre1.8.0_471\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\jre1.8.0_471\bin\java.exe"
    echo   [OK] Java: C:\Program Files\Java\jre1.8.0_471\bin\java.exe
    goto :java_found
)

REM Sprawdź czy jest Java z FireSnow
if exist "C:\FireSoft\FireSnow21\jre\bin\java.exe" (
    set "JAVA_CMD=C:\FireSoft\FireSnow21\jre\bin\java.exe"
    echo   [OK] Java z FireSnow: C:\FireSoft\FireSnow21\jre\bin\java.exe
    goto :java_found
)

REM Nie znaleziono Javy nigdzie
echo   [BLAD] Java nie jest zainstalowana!
echo.
echo Sprawdzone lokalizacje:
echo   - PATH (where java)
echo   - C:\Program Files\Java\
echo   - C:\FireSoft\FireSnow21\jre\
echo.
echo ROZWIAZANIE: Zainstaluj Java 8 lub nowsza z: https://corretto.aws
echo.
pause
exit /b 1

:java_found
echo.

REM Uruchom API
echo [3/3] Uruchamianie API...
echo API bedzie dostepne na: http://localhost:8080/api/
echo.
echo UWAGA: Nie zamykaj tego okna - serwer musi byc uruchomiony!
echo        Aby zatrzymac serwer, nacisnij Ctrl+C
echo.
echo ========================================
echo.

"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge

echo.
echo ========================================
echo API zostalo zatrzymane.
echo ========================================
pause

