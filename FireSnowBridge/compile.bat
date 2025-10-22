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

REM Kompiluj
javac -cp "lib\hsqldb.jar" src\FireSnowBridge.java

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Tworzenie JAR...
    cd src
    jar cf ..\FireSnowBridge.jar FireSnowBridge*.class
    cd ..
    
    REM Usun pliki .class
    del src\FireSnowBridge*.class
    
    echo.
    echo ========================================
    echo   Sukces! Plik FireSnowBridge.jar gotowy
    echo ========================================
    echo.
    echo Teraz mozesz uruchomic: start.bat
) else (
    echo.
    echo BLAD kompilacji!
)

pause

