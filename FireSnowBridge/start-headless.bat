@echo off
REM FireSnow Bridge API - Headless (bez pauz)
REM ===================================

REM Sprawdź czy pliki wymagane istnieją
if not exist "FireSnowBridge.jar" exit /b 1
if not exist "lib\hsqldb.jar" exit /b 1

REM Szukanie Java - NAJPIERW Java 21 (wymagana dla FireSnowBridge)
set JAVA_CMD=

REM Sprawdź Java 21 (najnowsza wersja - wymagana)
if exist "C:\Program Files\Java\jdk-21.0.9+10\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\jdk-21.0.9+10\bin\java.exe"
    goto :java_found
)

REM Sprawdź inne możliwe lokalizacje Java 21
if exist "C:\Program Files\Java\jdk-21\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\jdk-21\bin\java.exe"
    goto :java_found
)

REM Sprawdź czy java w PATH to Java 21
where java >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    REM Sprawdź wersję - jeśli to Java 21, użyj jej
    for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr /C:"21"') do (
        set JAVA_CMD=java
        goto :java_found
    )
)

if exist "C:\Program Files\Java\latest\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\latest\bin\java.exe"
    goto :java_found
)

if exist "C:\Program Files\Java\jre1.8.0_471\bin\java.exe" (
    set "JAVA_CMD=C:\Program Files\Java\jre1.8.0_471\bin\java.exe"
    goto :java_found
)

if exist "C:\FireSoft\FireSnow21\jre\bin\java.exe" (
    set "JAVA_CMD=C:\FireSoft\FireSnow21\jre\bin\java.exe"
    goto :java_found
)

REM Nie znaleziono Javy
exit /b 1

:java_found
"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge
