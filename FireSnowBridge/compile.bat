@echo off
REM Kompilacja FireSnow Bridge API (Java 21+, --release 21)
REM ================================
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Kompilacja FireSnowBridge
echo ========================================
echo.

REM Sprawdz czy hsqldb.jar istnieje
echo [1/6] Sprawdzanie zaleznosci...
if not exist "lib\hsqldb.jar" (
    echo [BLAD] Brak pliku lib\hsqldb.jar
    echo        Pobierz HSQLDB z https://sourceforge.net/projects/hsqldb/
    if "%CI%"=="" pause
    exit /b 1
)
echo [OK] Znaleziono lib\hsqldb.jar

REM Wykryj JDK: portable jdk\ -> JAVA_HOME -> PATH
echo.
echo [2/6] Wykrywanie JDK (Java 21+)...
set "JAVAC_CMD="
set "JAR_CMD="

if exist "%~dp0jdk\bin\javac.exe" (
    set "JAVAC_CMD=%~dp0jdk\bin\javac.exe"
    set "JAR_CMD=%~dp0jdk\bin\jar.exe"
    echo [OK] Znaleziono portable JDK: %~dp0jdk
    goto :java_found
)

if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\javac.exe" (
        set "JAVAC_CMD=%JAVA_HOME%\bin\javac.exe"
        set "JAR_CMD=%JAVA_HOME%\bin\jar.exe"
        echo [OK] Znaleziono JDK w JAVA_HOME: %JAVA_HOME%
        goto :java_found
    )
)

where javac >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "JAVAC_CMD=javac"
    set "JAR_CMD=jar"
    echo [OK] Znaleziono JDK w PATH
    goto :java_found
)

echo [BLAD] Nie znaleziono JDK (wymagana Java 21 lub nowsza)!
echo.
echo   1. Pobierz JDK 21 z https://adoptium.net/
echo   2. Zainstaluj JDK i ustaw JAVA_HOME lub dodaj do PATH
echo.
if "%CI%"=="" pause
exit /b 1

:java_found

REM Sprawdz wersje kompilatora (wymagane >= 21 dla --release 21)
echo.
echo [3/6] Sprawdzanie wersji JDK...
set "JAVAC_VERSION="
for /f "tokens=2" %%v in ('"%JAVAC_CMD%" -version 2^>^&1') do set "JAVAC_VERSION=%%v"
set "JAVAC_MAJOR="
for /f "tokens=1 delims=." %%m in ("!JAVAC_VERSION!") do set "JAVAC_MAJOR=%%m"
if "!JAVAC_MAJOR!"=="" (
    echo [BLAD] Nie udalo sie odczytac wersji javac
    if "%CI%"=="" pause
    exit /b 1
)
if !JAVAC_MAJOR! LSS 21 (
    echo [BLAD] Wykryto javac !JAVAC_VERSION! - wymagana Java 21 lub nowsza
    if "%CI%"=="" pause
    exit /b 1
)
echo [OK] javac !JAVAC_VERSION!

REM Stworz katalog bin jesli nie istnieje
echo.
echo [4/6] Przygotowanie katalogow...
if not exist "bin" mkdir bin
echo [OK] Katalog bin gotowy

REM Usun stare pliki .class
if exist "bin\*.class" del /Q bin\*.class >nul 2>&1
if exist "src\*.class" del /Q src\*.class >nul 2>&1

echo.
echo [5/6] Kompilowanie FireSnowBridge.java (--release 21)...
"%JAVAC_CMD%" --release 21 -cp "lib\hsqldb.jar" -d bin src\FireSnowBridge.java

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BLAD] Kompilacja nie powiodla sie!
    echo        Sprawdz bledy powyzej.
    if "%CI%"=="" pause
    exit /b 1
)
echo [OK] Kompilacja zakonczona sukcesem

REM Tworzenie JAR
echo.
echo [6/6] Tworzenie pliku JAR...
cd bin
"%JAR_CMD%" cf ..\FireSnowBridge.jar FireSnowBridge*.class
set "JAR_RC=%ERRORLEVEL%"
cd ..

if not "%JAR_RC%"=="0" (
    echo [BLAD] Nie udalo sie utworzyc pliku JAR!
    if "%CI%"=="" pause
    exit /b 1
)

if not exist "FireSnowBridge.jar" (
    echo [BLAD] Plik FireSnowBridge.jar nie zostal utworzony!
    if "%CI%"=="" pause
    exit /b 1
)

echo [OK] Plik JAR utworzony pomyslnie

echo.
echo ========================================
echo   SUKCES - FireSnowBridge.jar gotowy
echo ========================================
echo.
echo Uruchomienie: start-headless.bat
echo.
if "%CI%"=="" pause
