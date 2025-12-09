# Instalacja Docker Desktop na Windows

## Krok 1: Pobierz Docker Desktop

1. Przejdź na stronę: https://www.docker.com/products/docker-desktop/
2. Kliknij "Download for Windows"
3. Pobierz plik instalacyjny `Docker Desktop Installer.exe`

## Krok 2: Wymagania systemowe

**Minimalne wymagania:**
- Windows 10 64-bit: Pro, Enterprise, lub Education (Build 19041 lub nowszy)
- Windows 11 64-bit: Home lub Pro (wersja 21H2 lub nowsza)
- Włączona funkcja WSL 2 (Windows Subsystem for Linux 2)
- Wirtualizacja włączona w BIOS/UEFI

**Sprawdź czy masz WSL 2:**
```powershell
wsl --version
```

Jeśli nie masz WSL 2, zainstaluj:
```powershell
wsl --install
```

## Krok 3: Instalacja Docker Desktop

1. Uruchom pobrany plik `Docker Desktop Installer.exe`
2. Zaznacz opcje:
   - ✅ "Use WSL 2 instead of Hyper-V" (jeśli dostępne)
   - ✅ "Add shortcut to desktop"
3. Kliknij "Ok" i poczekaj na zakończenie instalacji
4. **WAŻNE**: Po instalacji **zrestartuj komputer**

## Krok 4: Uruchomienie Docker Desktop

1. Po restarcie znajdź "Docker Desktop" w menu Start
2. Uruchom Docker Desktop
3. Zaakceptuj warunki licencyjne
4. Poczekaj aż Docker Desktop się uruchomi (ikona wieloryba w system tray)

## Krok 5: Weryfikacja instalacji

Otwórz PowerShell i sprawdź:

```powershell
# Sprawdź wersję Docker
docker --version

# Sprawdź wersję Docker Compose (nowa składnia)
docker compose version

# Lub stara składnia (jeśli dostępna)
docker-compose --version
```

**Oczekiwany wynik:**
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

## Krok 6: Test instalacji

Uruchom prosty test:

```powershell
docker run hello-world
```

Powinieneś zobaczyć komunikat "Hello from Docker!"

## Rozwiązywanie problemów

### Problem: "docker: command not found"

**Rozwiązanie:**
1. Sprawdź czy Docker Desktop jest uruchomiony (ikona w system tray)
2. Zrestartuj PowerShell/Terminal
3. Sprawdź czy Docker Desktop jest w PATH:
   ```powershell
   $env:PATH -split ';' | Select-String -Pattern 'docker'
   ```

### Problem: "WSL 2 installation is incomplete"

**Rozwiązanie:**
1. Zainstaluj WSL 2:
   ```powershell
   wsl --install
   ```
2. Zrestartuj komputer
3. Uruchom ponownie Docker Desktop

### Problem: "Virtualization is not enabled"

**Rozwiązanie:**
1. Zrestartuj komputer
2. Wejdź do BIOS/UEFI (zwykle F2, F10, Del podczas startu)
3. Znajdź opcję "Virtualization Technology" lub "Intel VT-x" / "AMD-V"
4. Włącz ją
5. Zapisz i wyjdź z BIOS

### Problem: Docker Desktop nie uruchamia się

**Rozwiązanie:**
1. Sprawdź czy masz wystarczająco pamięci RAM (minimum 4GB)
2. Sprawdź czy Windows Update jest aktualny
3. Uruchom Docker Desktop jako Administrator
4. Sprawdź logi: `%LOCALAPPDATA%\Docker\log.txt`

## Po instalacji

Gdy Docker Desktop jest uruchomiony, możesz używać:

```powershell
# Nowa składnia (rekomendowana)
docker compose up

# Stara składnia (jeśli dostępna)
docker-compose up
```

**Uwaga**: W najnowszych wersjach Docker Desktop używa się `docker compose` (bez myślnika) zamiast `docker-compose`.

## Aktualizacja dokumentacji

Po zainstalowaniu Dockera, zaktualizuj `docs/DOCKER_INSTRUKCJA.md` - wszystkie komendy będą działać.

## Następne kroki

1. ✅ Docker Desktop zainstalowany i uruchomiony
2. ✅ Weryfikacja działa (`docker --version`)
3. ⏭️ Przejdź do `docs/DOCKER_INSTRUKCJA.md` i uruchom aplikację
















