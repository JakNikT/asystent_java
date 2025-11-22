@echo off
REM Kompilacja FireSnow Bridge API
REM ================================

echo Kompilowanie FireSnowBridge.java...

REM Sprawdz czy hsqldb.jar istnieje
if not exist "lib\hsqldb.jar" (
    echo BLAD: Brak pliku lib\hsqldb.jar
    echo Skopiuj plik hsqldb.jar z FireSnow do folderu lib\
    pause
    exit /b 1
)

REM Znajdz Java do kompilacji (uzyj tej samej co do uruchomienia)
echo [INFO] Szukanie kompilatora Java...
set JAVAC_CMD=javac
where javac >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] javac znaleziony w PATH
    goto :javac_found
)

REM Sprawdz standardowe lokalizacje
if exist "C:\Program Files\Java\jre1.8.0_471\bin\javac.exe" (
    set "JAVAC_CMD=C:\Program Files\Java\jre1.8.0_471\bin\javac.exe"
    echo [OK] javac: C:\Program Files\Java\jre1.8.0_471\bin\javac.exe
    goto :javac_found
)

if exist "C:\FireSoft\FireSnow21\jre\bin\javac.exe" (
    set "JAVAC_CMD=C:\FireSoft\FireSnow21\jre\bin\javac.exe"
    echo [OK] javac: C:\FireSoft\FireSnow21\jre\bin\javac.exe
    goto :javac_found
)

if exist "C:\FireSoft\FireSnowServer20\jre\bin\javac.exe" (
    set "JAVAC_CMD=C:\FireSoft\FireSnowServer20\jre\bin\javac.exe"
    echo [OK] javac: C:\FireSoft\FireSnowServer20\jre\bin\javac.exe
    goto :javac_found
)

REM Nie znaleziono javac
echo [BLAD] javac nie znaleziony!
echo Sprawdzone lokalizacje:
echo   - PATH (where javac)
echo   - C:\Program Files\Java\jre1.8.0_471\bin\
echo   - C:\FireSoft\FireSnow21\jre\bin\
echo   - C:\FireSoft\FireSnowServer20\jre\bin\
echo.
echo ROZWIAZANIE: Zainstaluj Java JDK 8 lub nowsza
pause
exit /b 1

:javac_found
echo.

REM Kompiluj z targetem Java 8 (wersja 52.0) - kompatybilne z Java 8+
echo [INFO] Kompilacja z targetem Java 8 (kompatybilne z Java 8+)...
"%JAVAC_CMD%" -source 1.8 -target 1.8 -cp "lib\hsqldb.jar" src\FireSnowBridge.java
set COMPILE_RESULT=%ERRORLEVEL%

if %COMPILE_RESULT% EQU 0 (
    echo.
    echo Tworzenie JAR...
    cd src
    jar cf ..\FireSnowBridge.jar FireSnowBridge*.class
    cd ..
    
    REM Usun pliki .class
    del src\FireSnowBridge*.class >nul 2>nul
    
    echo.
    echo ========================================
    echo   Sukces! Plik FireSnowBridge.jar gotowy
    echo   (skompilowany dla Java 8 - kompatybilny)
    echo ========================================
    echo.
    echo Teraz mozesz uruchomic: start.bat
) else (
    echo.
    echo BLAD kompilacji! (kod: %COMPILE_RESULT%)
)

pause

