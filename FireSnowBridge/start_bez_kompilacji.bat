@echo off
REM FireSnow Bridge API - Uruchomienie BEZ kompilacji (kompiluje w locie)
REM ========================================================================

echo.
echo ========================================
echo   FireSnow Bridge API
echo   (Kompilacja w locie...)
echo ========================================
echo.

REM Sprawdź czy lib/hsqldb.jar istnieje
if not exist "lib\hsqldb.jar" (
    echo BLAD: Brak pliku lib\hsqldb.jar
    echo.
    echo Skopiuj plik hsqldb.jar z FireSnow do folderu lib\
    echo Z: C:\FireSoft\FireSnow21\lib\hsqldb.jar
    echo Do: lib\hsqldb.jar
    echo.
    pause
    exit /b 1
)

REM Sprawdź czy kod źródłowy istnieje
if not exist "src\FireSnowBridge.java" (
    echo BLAD: Brak pliku src\FireSnowBridge.java
    pause
    exit /b 1
)

REM Użyj kompilatora z FireSnow (jeśli istnieje)
set FIRESNOW_JAVAC=C:\FireSoft\FireSnow21\jre\bin\javac.exe
set FIRESNOW_JAVA=C:\FireSoft\FireSnow21\jre\bin\java.exe

if exist "%FIRESNOW_JAVAC%" (
    echo Kompilowanie z Java z FireSnow...
    "%FIRESNOW_JAVAC%" -cp "lib\hsqldb.jar" src\FireSnowBridge.java
    
    if %ERRORLEVEL% EQU 0 (
        echo Kompilacja OK! Uruchamianie...
        echo.
        "%FIRESNOW_JAVA%" -cp "src;lib\hsqldb.jar" FireSnowBridge
    ) else (
        echo BLAD kompilacji!
        pause
    )
) else (
    echo.
    echo BLAD: Nie znaleziono kompilatora Java!
    echo.
    echo Opcje:
    echo 1. Zainstaluj Java JDK z: https://adoptium.net/
    echo 2. Lub poczekaj - dam Ci gotowy plik JAR
    echo.
    pause
)

