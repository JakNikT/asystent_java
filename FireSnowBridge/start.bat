@echo off
REM FireSnow Bridge API - Uruchomienie
REM ===================================

echo.
echo ========================================
echo   FireSnow Bridge API
echo ========================================
echo.

REM Sprawdź czy Java jest dostępna
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo BLAD: Java nie jest zainstalowana!
    echo.
    echo Sprobuj uzyc Javy z FireSnow:
    echo C:\FireSoft\FireSnow21\jre\bin\java.exe -jar FireSnowBridge.jar
    echo.
    pause
    exit /b 1
)

REM Sprawdź czy plik JAR istnieje
if not exist "FireSnowBridge.jar" (
    echo BLAD: Brak pliku FireSnowBridge.jar
    echo.
    echo Upewnij sie ze plik znajduje sie w tym folderze.
    echo.
    pause
    exit /b 1
)

REM Sprawdź czy lib/hsqldb.jar istnieje
if not exist "lib\hsqldb.jar" (
    echo BLAD: Brak pliku lib\hsqldb.jar
    echo.
    echo Skopiuj plik hsqldb.jar z FireSnow do folderu lib\
    echo (C:\FireSoft\FireSnow21\lib\hsqldb.jar)
    echo.
    pause
    exit /b 1
)

REM Uruchom API
echo Uruchamianie API...
echo.

java -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge

echo.
echo API zostalo zatrzymane.
pause

