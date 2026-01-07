@echo off
REM Kompilacja z portable Java (dziala wszedzie!)
setlocal enabledelayedexpansion

echo ========================================
echo   Kompilacja FireSnowBridge (Portable)
echo ========================================
echo.

REM Uzyj portable Java z folderu jdk/
set "PORTABLE_JDK=%~dp0jdk"
if exist "%PORTABLE_JDK%\bin\javac.exe" (
    set "JAVAC_CMD=%PORTABLE_JDK%\bin\javac.exe"
    set "JAR_CMD=%PORTABLE_JDK%\bin\jar.exe"
    echo [OK] Uzywam portable Java z: jdk\
    goto :compile
)

REM Fallback: Sprobuj znalezc Java w systemie
echo [INFO] Portable Java nie znaleziona, szukam w systemie...
where javac >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "JAVAC_CMD=javac"
    set "JAR_CMD=jar"
    echo [OK] Znaleziono Java w PATH
    goto :compile
)

REM Nie znaleziono Java
echo [BLAD] Nie znaleziono Java!
echo.
echo ROZWIAZANIE:
echo   1. Pobierz JDK 21 ZIP z: https://adoptium.net/
echo   2. Rozpakuj do: %~dp0jdk\
echo   3. Struktura: jdk\bin\javac.exe
echo.
pause
exit /b 1

:compile
echo.
echo [1/3] Sprawdzanie zaleznosci...
if not exist "lib\hsqldb.jar" (
    echo [BLAD] Brak lib\hsqldb.jar
    pause
    exit /b 1
)
echo [OK] lib\hsqldb.jar

echo.
echo [2/3] Kompilowanie...
if not exist "bin" mkdir bin
"%JAVAC_CMD%" -cp "lib\hsqldb.jar" -d bin src\FireSnowBridge.java

if %ERRORLEVEL% NEQ 0 (
    echo [BLAD] Kompilacja nie powiodla sie!
    pause
    exit /b 1
)
echo [OK] Kompilacja zakonczona

echo.
echo [3/3] Tworzenie JAR...
cd bin
"%JAR_CMD%" cf ..\FireSnowBridge.jar FireSnowBridge*.class
cd ..

if not exist "FireSnowBridge.jar" (
    echo [BLAD] Nie utworzono JAR!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUKCES! FireSnowBridge.jar gotowy
echo ========================================
echo.
pause