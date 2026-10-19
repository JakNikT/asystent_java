@echo off
REM FireSnow Bridge API - Headless (bez pauz)
REM ===================================

REM Sprawdz czy pliki wymagane istnieja
if not exist "FireSnowBridge.jar" (
    echo FireSnowBridge.jar nie istnieje - uruchom: npm run build:bridge
    exit /b 1
)
if not exist "lib\hsqldb.jar" (
    echo Brak pliku lib\hsqldb.jar
    exit /b 1
)

REM Szukanie Javy: portable jdk\ -> JAVA_HOME -> PATH -> stare sciezki
set "JAVA_CMD="

if exist "%~dp0jdk\bin\java.exe" (
    set "JAVA_CMD=%~dp0jdk\bin\java.exe"
    goto :java_found
)

if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        set "JAVA_CMD=%JAVA_HOME%\bin\java.exe"
        goto :java_found
    )
)

where java >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "JAVA_CMD=java"
    goto :java_found
)

if exist "C:\Program Files\Java\latest\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\latest\bin\java.exe"
    goto :java_found
)

echo Nie znaleziono Javy (wymagana Java 21 lub nowsza).
echo   - zainstaluj JDK 21 (np. winget install EclipseAdoptium.Temurin.21.JDK)
echo   - albo skopiuj JDK do folderu FireSnowBridge\jdk
exit /b 1

:java_found
"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge
