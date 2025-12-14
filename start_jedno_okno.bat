@echo off
REM start_jedno_okno.bat: Uruchamia wszystkie serwisy aplikacji w jednym oknie
REM ================================================================

echo.
echo ================================================================
echo   Asystent Nart - Uruchamianie wszystkich serwisow
echo ================================================================
echo.
echo Uruchamiane serwisy:
echo   [JAVA] FireSnow Bridge API - port 8081
echo   [API]  Backend Express Server - port 5001
echo   [WEB]  Vite Dev Server - port 5002
echo.
echo Aplikacja bedzie dostepna pod adresem:
echo   http://localhost:5002
echo.
echo Aby zatrzymac wszystkie serwisy, nacisnij Ctrl+C
echo ================================================================
echo.

npm run dev:all

pause
