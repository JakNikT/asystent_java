@echo off
REM FireSnow Bridge API - Headless (bez pauz)
REM ===================================

REM Sprawdź czy pliki wymagane istnieją
if not exist "FireSnowBridge.jar" exit /b 1
if not exist "lib\hsqldb.jar" exit /b 1

REM Szukanie Java
set JAVA_CMD=
where java >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set JAVA_CMD=java
    goto :java_found
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
