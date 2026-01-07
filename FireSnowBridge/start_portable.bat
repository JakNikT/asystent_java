@echo off
REM Uruchomienie z portable Java
echo ========================================
echo   FireSnow Bridge API (Portable)
echo ========================================
echo.

REM Uzyj portable Java
set "PORTABLE_JDK=%~dp0jdk"
if exist "%PORTABLE_JDK%\bin\java.exe" (
    set "JAVA_CMD=%PORTABLE_JDK%\bin\java.exe"
    echo [OK] Uzywam portable Java z: jdk\
    goto :start
)

REM Fallback: systemowa Java
where java >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "JAVA_CMD=java"
    echo [OK] Uzywam Java z PATH
    goto :start
)

echo [BLAD] Nie znaleziono Java!
echo Pobierz JDK ZIP z: https://adoptium.net/
pause
exit /b 1

:start
echo.
echo API dostepne na: http://localhost:8080/api/
echo.
"%JAVA_CMD%" -cp "FireSnowBridge.jar;lib\hsqldb.jar" FireSnowBridge
pause