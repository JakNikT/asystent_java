# FireSnow Bridge API Watchdog
# Automatycznie restartuje API gdy wykryje zmiany w bazie FireSnow

$API_JAR = "FireSnowBridge.jar"
$HSQLDB_JAR = "lib\hsqldb.jar"
$DB_LOG_FILE = "C:\FireSoft\FireSnowServer20\database\FireSport_database_4.log"
$CHECK_INTERVAL = 5  # Sprawdzaj co 5 sekund

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FireSnow Bridge API Watchdog" -ForegroundColor Cyan
Write-Host "  Auto-restart on database changes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Sprawdź czy plik bazy istnieje
if (-not (Test-Path $DB_LOG_FILE)) {
    Write-Host "BLAD: Nie znaleziono pliku bazy: $DB_LOG_FILE" -ForegroundColor Red
    Write-Host "Sprawdz sciezke w watchdog.ps1" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "[WATCHDOG] Monitoruje: $DB_LOG_FILE" -ForegroundColor Green
Write-Host "[WATCHDOG] Sprawdzam co $CHECK_INTERVAL sekund" -ForegroundColor Green
Write-Host ""

# Funkcja uruchamiająca API
function Start-API {
    Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - Uruchamiam API..." -ForegroundColor Yellow
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "java"
    $processInfo.Arguments = "-cp `"$API_JAR;$HSQLDB_JAR`" FireSnowBridge"
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $false
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $process.Start() | Out-Null
    
    Start-Sleep -Seconds 3  # Daj czas na uruchomienie
    
    Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - API uruchomione (PID: $($process.Id))" -ForegroundColor Green
    
    return $process
}

# Funkcja zatrzymująca API
function Stop-API {
    param($process)
    
    if ($process -and -not $process.HasExited) {
        Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - Zatrzymuje API (PID: $($process.Id))..." -ForegroundColor Yellow
        
        $process.Kill()
        $process.WaitForExit(5000)  # Czekaj max 5 sekund
        
        Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - API zatrzymane" -ForegroundColor Green
    }
}

# Uruchom API pierwszy raz
$apiProcess = Start-API
$lastModified = (Get-Item $DB_LOG_FILE).LastWriteTime

Write-Host ""
Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - Watchdog aktywny. Nacisnij Ctrl+C aby zakonczyc." -ForegroundColor Cyan
Write-Host ""

# Główna pętla watchdog
try {
    while ($true) {
        Start-Sleep -Seconds $CHECK_INTERVAL
        
        # Sprawdź czy API nadal działa
        if ($apiProcess.HasExited) {
            Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - API zostalo zatrzymane! Uruchamiam ponownie..." -ForegroundColor Red
            $apiProcess = Start-API
            $lastModified = (Get-Item $DB_LOG_FILE).LastWriteTime
            continue
        }
        
        # Sprawdź czy plik bazy się zmienił
        $currentModified = (Get-Item $DB_LOG_FILE).LastWriteTime
        
        if ($currentModified -gt $lastModified) {
            Write-Host ""
            Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - WYKRYTO ZMIANY W BAZIE!" -ForegroundColor Magenta
            Write-Host "[WATCHDOG] Poprzednia modyfikacja: $lastModified" -ForegroundColor Gray
            Write-Host "[WATCHDOG] Aktualna modyfikacja:   $currentModified" -ForegroundColor Gray
            
            # Restart API
            Stop-API -process $apiProcess
            Start-Sleep -Seconds 1
            $apiProcess = Start-API
            
            $lastModified = $currentModified
            
            Write-Host "[WATCHDOG] $(Get-Date -Format 'HH:mm:ss') - Restart zakonczony. API ma teraz swieze dane!" -ForegroundColor Green
            Write-Host ""
        }
    }
}
catch {
    Write-Host ""
    Write-Host "[WATCHDOG] Przerwano przez uzytkownika" -ForegroundColor Yellow
}
finally {
    # Zatrzymaj API przy wyjściu
    Write-Host "[WATCHDOG] Zatrzymuje API..." -ForegroundColor Yellow
    Stop-API -process $apiProcess
    Write-Host "[WATCHDOG] Watchdog zakonczony" -ForegroundColor Cyan
}



