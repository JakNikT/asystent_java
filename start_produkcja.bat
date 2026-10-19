@echo off
REM start_produkcja.bat: Tryb PRODUKCYJNY - bridge Java + backend, ktory sam serwuje zbudowana aplikacje (dist/)
REM Aplikacja dostepna pod: http://localhost:5001 (jeden port, bez Vite)
REM ================================================================

echo.
echo ================================================================
echo   Asystent Nart - tryb PRODUKCYJNY
echo ================================================================
echo.
echo   [JAVA] FireSnow Bridge API - port 8081
echo   [API]  Backend + aplikacja  - port 5001
echo.
echo   Adres: http://localhost:5001
echo   Aby zatrzymac, nacisnij Ctrl+C
echo ================================================================
echo.

REM Zbuduj aplikacje (frontend -> dist/). Pomin: start_produkcja.bat nobuild
if /i not "%1"=="nobuild" (
    echo [BUILD] Budowanie aplikacji...
    call npm run build
    if errorlevel 1 (
        echo [BLAD] Budowanie nie powiodlo sie.
        pause
        exit /b 1
    )
)

set NODE_ENV=production
call npx concurrently "cd FireSnowBridge && start-headless.bat" "npm run start" --names "JAVA,API" --prefix-colors "yellow,blue"

pause
