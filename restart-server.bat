@echo off
echo Restartowanie serwera...
echo.
echo 1. Zatrzym stary serwer (nacisnij Ctrl+C w terminalu gdzie dziala)
echo 2. Uruchom ten skrypt ponownie po zatrzymaniu
echo.
pause
echo Budowanie aplikacji...
call npm run build
echo.
echo Uruchamianie serwera...
call npm run server


