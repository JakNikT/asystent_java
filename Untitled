@echo off
REM Skrypt do zatrzymywania aplikacji Asystent Java (BEZ Dockera)
REM Ten skrypt zatrzymuje wszystkie procesy: Java, Node.js, Vite
setlocal enabledelayedexpansion

echo ========================================
echo   Zamykanie aplikacji Asystent Java
echo ========================================
echo.

set "KILLED=0"

REM === KROK 1: Zatrzymaj FireSnowBridge (Java - port 8081) ===
echo [1/4] Zatrzymywanie FireSnowBridge (Java API - port 8081)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
    echo   Zatrzymywanie procesu PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo   [OK] FireSnowBridge zatrzymany
        set "KILLED=1"
    )
)
if !KILLED! EQU 0 echo   [INFO] FireSnowBridge nie byl uruchomiony

echo.
REM === KROK 2: Zatrzymaj Backend Express Server (Node.js - port 5001) ===
echo [2/4] Zatrzymywanie Backend Express Server (port 5001)...
set "KILLED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
    echo   Zatrzymywanie procesu PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo   [OK] Backend Server zatrzymany
        set "KILLED=1"
    )
)
if !KILLED! EQU 0 echo   [INFO] Backend Server nie byl uruchomiony

echo.
REM === KROK 3: Zatrzymaj Vite Dev Server (port 5002) ===
echo [3/4] Zatrzymywanie Vite Dev Server (port 5002)...
set "KILLED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5002" ^| findstr "LISTENING"') do (
    echo   Zatrzymywanie procesu PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo   [OK] Vite Dev Server zatrzymany
        set "KILLED=1"
    )
)
if !KILLED! EQU 0 echo   [INFO] Vite Dev Server nie byl uruchomiony

echo.
REM === KROK 4: Weryfikacja - Sprawdz czy porty sa wolne ===
echo [4/4] Weryfikacja portow...
set "ALL_CLEAR=1"

netstat -ano | findstr ":8081" | findstr "LISTENING" >nul
if !ERRORLEVEL! EQU 0 (
    echo   [UWAGA] Port 8081 nadal zajety!
    set "ALL_CLEAR=0"
) else (
    echo   [OK] Port 8081 wolny (FireSnowBridge)
)

netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if !ERRORLEVEL! EQU 0 (
    echo   [UWAGA] Port 5001 nadal zajety!
    set "ALL_CLEAR=0"
) else (
    echo   [OK] Port 5001 wolny (Backend)
)

netstat -ano | findstr ":5002" | findstr "LISTENING" >nul
if !ERRORLEVEL! EQU 0 (
    echo   [UWAGA] Port 5002 nadal zajety!
    set "ALL_CLEAR=0"
) else (
    echo   [OK] Port 5002 wolny (Vite)
)

echo.
echo ========================================
if !ALL_CLEAR! EQU 1 (
    echo   Aplikacja zostala zamknieta!
) else (
    echo   UWAGA: Niektorych procesow nie udalo sie zamknac
    echo   Sprobuj zamknac recznie okno konsoli lub zobacz szczegoly:
    echo   netstat -ano ^| findstr ":8081 :5001 :5002"
)
echo ========================================
echo.
echo Zamkniete komponenty:
echo   - FireSnowBridge (Java API na porcie 8081)
echo   - Backend Express (Node.js API na porcie 5001)
echo   - Vite Dev Server (Frontend na porcie 5002)
echo.
pause