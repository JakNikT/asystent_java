@echo off
REM Kompilacja FireSnow Bridge API z Java 21
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
    pause
    exit /b 1
)
echo [OK] Znaleziono lib\hsqldb.jar

REM Wykryj Java - najpierw sprobuj hardcoded sciezki
echo.
echo [2/6] Wykrywanie Java 21...
set "JAVAC_CMD="
set "JAR_CMD="

REM Sprawdz hardcoded sciezke (najszybsza opcja)
if exist "C:\Program Files\Java\jdk-21.0.9+10\bin\javac.exe" (
    set "JAVAC_CMD=C:\Program Files\Java\jdk-21.0.9+10\bin\javac.exe"
    set "JAR_CMD=C:\Program Files\Java\jdk-21.0.9+10\bin\jar.exe"
    echo [OK] Znaleziono Java 21 w domyslnej lokalizacji
    goto :java_found
)

REM Sprawdz JAVA_HOME
if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\javac.exe" (
        set "JAVAC_CMD=%JAVA_HOME%\bin\javac.exe"
        set "JAR_CMD=%JAVA_HOME%\bin\jar.exe"
        echo [OK] Znaleziono Java w JAVA_HOME: %JAVA_HOME%
        goto :java_found
    )
)

REM Sprawdz PATH
where javac >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "JAVAC_CMD=javac"
    set "JAR_CMD=jar"
    echo [OK] Znaleziono Java w PATH
    goto :java_found
)

REM Nie znaleziono Java
echo [BLAD] Nie znaleziono Java 21!
echo.
echo Sprawdz czy Java 21 jest zainstalowana:
echo   1. Pobierz z https://adoptium.net/
echo   2. Zainstaluj JDK 21
echo   3. Ustaw zmienna JAVA_HOME lub dodaj do PATH
echo.
pause
exit /b 1

:java_found

REM Sprawdz wersje Java
echo.
echo [3/6] Sprawdzanie wersji Java...
"%JAVAC_CMD%" -version 2>&1 | findstr /C:"21" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [OSTRZEZENIE] Wykryta inna wersja niz Java 21
    "%JAVAC_CMD%" -version
    echo Kontynuowac mimo to? (T/N)
    choice /C TN /N
    if errorlevel 2 exit /b 1
)
echo [OK] Wersja Java jest poprawna

REM Stworz katalog bin jesli nie istnieje
echo.
echo [4/6] Przygotowanie katalogow...
if not exist "bin" mkdir bin
echo [OK] Katalog bin gotowy

REM Usun stare pliki .class
if exist "bin\*.class" del /Q bin\*.class >nul 2>&1
if exist "src\*.class" del /Q src\*.class >nul 2>&1

REM Kompiluj
echo.
echo [5/6] Kompilowanie FireSnowBridge.java...
"%JAVAC_CMD%" -cp "lib\hsqldb.jar" -d bin src\FireSnowBridge.java

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BLAD] Kompilacja nie powiodla sie!
    echo        Sprawdz bledy powyzej.
    pause
    exit /b 1
)
echo [OK] Kompilacja zakonczona sukcesem

REM Tworzenie JAR
echo.
echo [6/6] Tworzenie pliku JAR...
cd bin
"%JAR_CMD%" cf ..\FireSnowBridge.jar FireSnowBridge*.class
cd ..

if %ERRORLEVEL% NEQ 0 (
    echo [BLAD] Nie udalo sie utworzyc pliku JAR!
    pause
    exit /b 1
)

REM Sprawdz czy JAR zostal utworzony
if not exist "FireSnowBridge.jar" (
    echo [BLAD] Plik FireSnowBridge.jar nie zostal utworzony!
    pause
    exit /b 1
)

echo [OK] Plik JAR utworzony pomyslnie

echo.
echo ========================================
echo   SUKCES! FireSnowBridge.jar gotowy
echo ========================================
echo.
echo Kompilacja z Java 21 zakonczona pomyslnie!
echo Plik: FireSnowBridge.jar
echo Rozmiar: 
dir FireSnowBridge.jar | findstr "FireSnowBridge.jar"
echo.
echo Mozesz teraz uruchomic aplikacje uzywajac:
echo   - start.bat
echo   - start_bez_kompilacji.bat
echo.
pause