@echo off
REM FireSnow Bridge API - Headless (bez pauz)
REM ===================================

REM Sprawdź czy pliki wymagane istnieją
if not exist "FireSnowBridge.jar" (
    echo FireSnowBridge.jar nie istnieje - uruchom: npm run build:bridge
    exit /b 1
)
if not exist "lib\hsqldb.jar" exit /b 1

REM Szukanie Java - NAJPIERW portable Java z folderu jdk/
set JAVA_CMD=

REM 1. Sprawdź portable Java (najwyższy priorytet)
set "PORTABLE_JDK=%~dp0jdk"
if exist "%PORTABLE_JDK%\bin\java.exe" (
    set "JAVA_CMD=%PORTABLE_JDK%\bin\java.exe"
    goto :java_found
)

REM 2. Sprawdź Java 21 w systemie (wymagana wersja)
if exist "C:\Program Files\Java\jdk-21.0.9+10\bin\java.exe" (
    for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr /C:"21"') do (
        set JAVA_CMD=java
        goto :java_found
    )
)

if exist "C:\Program Files\Java\latest\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\latest\bin\java.exe"
    goto :java_found
)

REM Nie znaleziono Javy
exit /b 1

:java_found
"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge
