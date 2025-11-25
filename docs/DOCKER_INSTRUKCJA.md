# Docker - Instrukcja Uruchomienia

## Wymagania

- **Docker Desktop** zainstalowany i uruchomiony
  - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Linux: Docker Engine + Docker Compose
  - **Instalacja na Windows**: Zobacz `docs/DOCKER_INSTALACJA_WINDOWS.md`

- **FireSnow Bridge** uruchomiony na hoście (nie w kontenerze)
  - Port: `8080`
  - Musi być dostępny pod adresem `http://localhost:8080` na hoście

- **MySQL** uruchomiony na hoście (lub w osobnym kontenerze)
  - Domyślnie na porcie `3306`

**UWAGA**: W najnowszych wersjach Docker Desktop używa się `docker compose` (bez myślnika) zamiast `docker-compose`. Wszystkie komendy w tej dokumentacji można używać z obiema składniami.

## Instalacja Docker Desktop

### Windows/Mac
1. Pobierz Docker Desktop z [docker.com](https://www.docker.com/products/docker-desktop)
2. Zainstaluj i uruchom
3. Sprawdź instalację: `docker --version`

### Linux
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Sprawdź instalację
docker --version
docker-compose --version
```

## Konfiguracja

### 1. Skopiuj plik konfiguracyjny

```bash
cp .env.example .env
```

### 2. Edytuj `.env` i dostosuj wartości

```env
# Tryb działania
NODE_ENV=production  # lub development

# Porty
PORT=3000

# FireSnow Bridge (na hoście)
FIRESNOW_API_URL=http://host.docker.internal:8080
USE_FIRESNOW_API=true

# MySQL (na hoście)
DB_HOST=host.docker.internal
DB_USER=root
DB_PASSWORD=TwojeHaslo
DB_NAME=sprzet_narciarski
DB_HISTORY_NAME=history

# Logowanie
LOG_LEVEL=info
LOG_DIR=logs
```

**Ważne**: 
- `host.docker.internal` działa automatycznie w Docker Desktop (Windows/Mac)
- Na Linuxie może być potrzebne użycie IP hosta zamiast `host.docker.internal`

## Uruchomienie

### Tryb Production (używanie aplikacji)

```bash
# Budowanie obrazu i uruchomienie (nowa składnia - rekomendowana)
docker compose up --build

# Lub stara składnia (jeśli dostępna)
docker-compose up --build

# Lub w tle (detached mode)
docker compose up -d --build
```

Aplikacja będzie dostępna pod adresem:
- Frontend + Backend: `http://localhost:3000`
- API: `http://localhost:3000/api/`

### Tryb Development (praca nad kodem)

```bash
# Budowanie i uruchomienie w trybie development (nowa składnia - rekomendowana)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Lub stara składnia (jeśli dostępna)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Lub w tle
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Aplikacja będzie dostępna pod adresami:
- Frontend (Vite dev server): `http://localhost:5173` (hot-reload)
- Backend (Express): `http://localhost:3000`
- API: `http://localhost:3000/api/`

**Uwaga**: W trybie development zmiany w kodzie są widoczne od razu (hot-reload).

## Zarządzanie kontenerem

### Zatrzymanie

```bash
# Zatrzymaj kontener (nowa składnia)
docker compose down

# Lub stara składnia
docker-compose down

# Zatrzymaj i usuń volumes (UWAGA: usuwa dane!)
docker compose down -v
```

### Logi

```bash
# Wyświetl logi (nowa składnia)
docker compose logs -f

# Lub stara składnia
docker-compose logs -f

# Logi tylko aplikacji
docker compose logs -f app
```

### Restart

```bash
# Restart kontenera (nowa składnia)
docker compose restart

# Lub stara składnia
docker-compose restart

# Restart z przebudowaniem obrazu
docker compose up -d --build
```

### Wejście do kontenera

```bash
# Wejście do kontenera (nowa składnia)
docker compose exec app sh

# Lub stara składnia
docker-compose exec app sh

# Sprawdzenie procesów
docker compose exec app ps aux
```

## Struktura Volumes

Docker montuje następujące foldery z hosta do kontenera:

- `./public/data` → `/app/public/data` - Pliki CSV (rezerwacje, wypożyczenia, narty)
- `./logs` → `/app/logs` - Logi aplikacji

**Ważne**: Zmiany w tych folderach są widoczne zarówno w kontenerze jak i na hoście.

## Rozwiązywanie problemów

### Problem: Nie można połączyć się z FireSnow Bridge

**Objawy**: Błędy w logach typu "ECONNREFUSED" lub "Cannot connect to FireSnow API"

**Rozwiązanie**:
1. Sprawdź czy FireSnow Bridge jest uruchomiony na hoście: `http://localhost:8080/api/health`
2. W `.env` upewnij się że `FIRESNOW_API_URL=http://host.docker.internal:8080`
3. Na Linuxie może być potrzebne użycie IP hosta zamiast `host.docker.internal`:
   ```bash
   # Znajdź IP hosta
   ip addr show docker0
   # Użyj tego IP w .env zamiast host.docker.internal
   ```

### Problem: Nie można połączyć się z MySQL

**Objawy**: Błędy połączenia z bazą danych

**Rozwiązanie**:
1. Sprawdź czy MySQL jest uruchomiony na hoście
2. Sprawdź czy MySQL akceptuje połączenia z zewnątrz (nie tylko localhost)
3. W `.env` upewnij się że `DB_HOST=host.docker.internal`
4. Na Linuxie użyj IP hosta zamiast `host.docker.internal`

### Problem: Port już zajęty

**Objawy**: Błąd "port is already allocated"

**Rozwiązanie**:
1. Zmień port w `.env`: `PORT=3001`
2. Lub zatrzymaj aplikację działającą na tym porcie

### Problem: Hot-reload nie działa w development

**Objawy**: Zmiany w kodzie nie są widoczne

**Rozwiązanie**:
1. Sprawdź czy używasz `docker-compose.dev.yml`
2. Sprawdź czy volume `./src:/app/src` jest zamontowany
3. Sprawdź logi: `docker-compose logs -f app`

### Problem: Brak uprawnień do zapisu w volumes

**Objawy**: Błędy zapisu do plików CSV lub logów

**Rozwiązanie**:
```bash
# Sprawdź uprawnienia folderów
ls -la public/data
ls -la logs

# Jeśli potrzeba, zmień uprawnienia
chmod -R 777 public/data logs
```

### Problem: Obraz nie buduje się

**Objawy**: Błędy podczas `docker-compose build`

**Rozwiązanie**:
1. Sprawdź czy wszystkie pliki są na miejscu (package.json, Dockerfile, etc.)
2. Wyczyść cache Docker: `docker system prune -a`
3. Spróbuj zbudować bez cache: `docker-compose build --no-cache`

## Dostęp do hosta z kontenera

### Windows/Mac
Użyj `host.docker.internal` - działa automatycznie w Docker Desktop.

### Linux
Może być potrzebna dodatkowa konfiguracja:

```yaml
# W docker-compose.yml dodaj:
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Lub użyj IP hosta bezpośrednio:
```bash
# Znajdź IP
ip route show default | awk '/default/ {print $3}'

# Użyj tego IP w .env zamiast host.docker.internal
```

## Backup danych

Pliki CSV i logi są w folderach na hoście, więc backup jest prosty:

```bash
# Backup plików CSV
cp -r public/data backup/data-$(date +%Y%m%d)

# Backup logów
cp -r logs backup/logs-$(date +%Y%m%d)
```

## Aktualizacja aplikacji

```bash
# 1. Zatrzymaj kontener
docker-compose down

# 2. Pobierz najnowszy kod (git pull, itp.)

# 3. Przebuduj i uruchom
docker-compose up -d --build
```

## Monitoring

### Sprawdzenie statusu

```bash
# Status kontenerów
docker-compose ps

# Zasoby (CPU, pamięć)
docker stats asystent-nart-app
```

### Healthcheck

Kontener ma wbudowany healthcheck. Sprawdź status:

```bash
docker inspect --format='{{.State.Health.Status}}' asystent-nart-app
```

## Przydatne komendy

```bash
# Wyświetl wszystkie kontenery
docker ps -a

# Wyświetl obrazy
docker images

# Wyczyść nieużywane obrazy
docker image prune -a

# Wyświetl logi z ostatnich 100 linii
docker-compose logs --tail=100 app

# Restart tylko jednego serwisu
docker-compose restart app
```

## Bezpieczeństwo

- Kontener działa jako użytkownik non-root (nodejs:nodejs)
- Tylko niezbędne porty są eksponowane
- Volumes są montowane tylko dla potrzebnych folderów
- `.env` nie jest commitowany do git (jest w .gitignore)

## Wsparcie

W razie problemów sprawdź:
1. Logi kontenera: `docker-compose logs -f app`
2. Status kontenera: `docker-compose ps`
3. Dokumentację Docker: [docs.docker.com](https://docs.docker.com)

