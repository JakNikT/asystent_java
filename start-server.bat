@echo off
echo ========================================
echo   Asystent Nart - Uruchamianie Serwera
echo ========================================
echo.

REM Sprawdz czy npm jest zainstalowany
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [BLAD] Node.js/npm nie jest zainstalowany!
    echo.
    echo Aby uruchomic serwer, musisz najpierw zainstalowac Node.js:
    echo.
    echo 1. Pobierz Node.js z: https://nodejs.org/
    echo 2. Zainstaluj wersje LTS (Long Term Support)
    echo 3. Zrestartuj komputer po instalacji
    echo 4. Uruchom ponownie ten plik
    echo.
    echo Wiecej informacji: docs\INSTRUKCJA_SERWER_SIECIOWY.md
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js jest zainstalowany
echo.
echo Uruchamianie serwera deweloperskiego...
echo.
echo Serwer bedzie dostepny pod adresem:
echo - Lokalnie: http://localhost:5173
echo - W sieci: http://[TWOJ_IP]:5173
echo.
echo Aby zatrzymac serwer, nacisnij Ctrl+C
echo.
echo ========================================
echo.

npm run dev -- --host

echo.
echo ========================================
echo Serwer zostal zatrzymany
echo ========================================
pause

