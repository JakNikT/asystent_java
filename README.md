# 🎿 Asystent Doboru Nart - Wersja Web

## 📋 Opis

Nowoczesna aplikacja webowa do inteligentnego doboru sprzętu narciarskiego i snowboardowego. Aplikacja została w pełni zmigrowana z języka Python (PyQt5) do **React** z **TypeScript**, oferując profesjonalne narzędzie do zarządzania wypożyczalnią sprzętu narciarskiego.

## ✨ Główne funkcje

- **Inteligentny dobór sprzętu** - zaawansowany algorytm dopasowujący narty, buty i deski snowboardowe na podstawie kryteriów użytkownika (wzrost, waga, poziom, płeć, styl jazdy)
- **System wielokartowy** - obsługa wielu klientów jednocześnie w jednej sesji
- **Przeglądanie bazy danych** - interaktywna tabela do przeglądania, sortowania i filtrowania całego dostępnego sprzętu
- **Zarządzanie sprzętem** - możliwość dodawania, edytowania i usuwania pozycji z bazy danych (tryb pracownika)
- **System rezerwacji** - integracja w czasie rzeczywistym z systemem FireSnow, wizualizacja dostępności sprzętu
- **Historia klientów** - przeglądanie historii wypożyczeń i rezerwacji
- **Nowoczesny interfejs** - zaprojektowany z użyciem Tailwind CSS i Framer Motion
- **Responsywność** - aplikacja dostosowana do urządzeń mobilnych i desktopowych

## 🚀 Szybki start

### Wymagania

- **Node.js** (wersja LTS)
- **npm** (instalowany razem z Node.js)
- **Java 21** (wymagana dla FireSnow Bridge API)

### Instalacja zależności

```bash
npm install
```

### Konfiguracja

1. Skopiuj plik `env.example` do `.env`:
```bash
cp env.example .env
```

2. Uzupełnij dane w pliku `.env`:
   - `DB_PASSWORD` - hasło do bazy danych MySQL (wymagane)
   - `DB_HOST`, `DB_USER`, `DB_NAME` - dane połączenia z bazą
   - `FIRESNOW_API_URL` - URL do FireSnow Bridge API (domyślnie: `http://localhost:8081`)

### Uruchomienie

#### Opcja 1: Wszystkie serwisy w jednym oknie (zalecane)

```bash
start_jedno_okno.bat
```

Lub na Linux/Mac:
```bash
npm run dev:all
```

To uruchomi:
- **FireSnow Bridge API** (port 8081)
- **Backend Express Server** (port 5001)
- **Vite Dev Server** (port 5002)

Aplikacja będzie dostępna pod adresem: **http://localhost:5002**

#### Opcja 2: Uruchomienie osobno

```bash
# Terminal 1: FireSnow Bridge
cd FireSnowBridge
start-headless.bat

# Terminal 2: Backend API
npm run server

# Terminal 3: Frontend
npm run dev
```

## 📁 Struktura projektu

```
asystent_java/
├── src/
│   ├── components/          # Komponenty React
│   │   ├── dashboard/       # Główny dashboard
│   │   │   ├── Dashboard.tsx (~1,802 linii)
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── SkierForm.tsx
│   │   │   └── TabNavigation.tsx
│   │   ├── BrowseSkisComponent.tsx
│   │   ├── ReservationsView.tsx
│   │   ├── HistoryView.tsx
│   │   └── ui/              # Komponenty UI (Button, Input, etc.)
│   ├── server/              # Backend Express.js
│   │   ├── app.js           # Główna aplikacja Express
│   │   ├── config/          # Konfiguracja (env, database, logger)
│   │   ├── controllers/     # Kontrolery API
│   │   ├── services/        # Logika biznesowa
│   │   ├── routes/         # Routing API
│   │   └── utils/          # Narzędzia pomocnicze
│   ├── services/            # Serwisy frontend (TypeScript)
│   │   ├── skiMatchingServiceV2.ts (1,851 linii)
│   │   ├── reservationApiClient.ts
│   │   └── skiDataService.ts
│   ├── types/               # Definicje typów TypeScript
│   ├── utils/               # Narzędzia pomocnicze
│   └── App.tsx
├── FireSnowBridge/          # Integracja z FireSnow
│   ├── src/
│   │   └── FireSnowBridge.java (1,136+ linii)
│   └── config.properties
├── public/
│   ├── data/                # Pliki CSV (baza sprzętu)
│   └── images/              # Obrazy i zasoby
├── server.js                # Entry point backendu
├── start_jedno_okno.bat     # Skrypt uruchomienia (Windows)
├── package.json
├── vite.config.ts
└── .env                     # Konfiguracja środowiskowa (nie w repo)
```

## 🔌 Porty serwerów

- **5002** - Vite Dev Server (frontend)
- **5001** - Express Backend API
- **8081** - FireSnow Bridge API (Java)

## 🎯 API Endpoints

### Rezerwacje
- `GET /api/reservations` - Pobierz wszystkie rezerwacje
- `POST /api/reservations` - Utwórz rezerwację
- `PUT /api/reservations/:id` - Aktualizuj rezerwację
- `DELETE /api/reservations/:id` - Usuń rezerwację

### Wypożyczenia
- `GET /api/wypozyczenia/aktualne` - Aktywne wypożyczenia
- `GET /api/wypozyczenia/przeszle` - Przeszłe wypożyczenia

### Sprzęt
- `GET /api/skis` - Pobierz wszystkie pozycje sprzętu
- `POST /api/skis` - Dodaj nowy sprzęt
- `PUT /api/skis/:id` - Aktualizuj sprzęt
- `PUT /api/skis/bulk` - Masowa aktualizacja

### Historia
- `GET /api/historia/klienci/wyszukaj` - Wyszukaj klientów
- `GET /api/historia/klient/:id/daty` - Daty klienta
- `GET /api/historia/klient/:id/sprzet` - Sprzęt klienta

### FireSnow
- `GET /api/firesnow/status` - Status FireSnow Bridge
- `POST /api/firesnow/refresh` - Odśwież cache
- `GET /api/dostepnosc/okres` - Dostępność w okresie

### Health Check
- `GET /api/health` - Status serwera

## 🗄️ Baza danych

### CSV (lokalna)
- `NOWABAZA_final.csv` - główna baza sprzętu narciarskiego

### MySQL (opcjonalna)
- `sprzet_narciarski` - główna baza danych
- `history` - baza historii wypożyczeń

### FireSnow (read-only)
- Integracja przez FireSnow Bridge API
- Automatyczne pobieranie rezerwacji i wypożyczeń

## 🛠️ Technologie

### Frontend
- **React 19.1.1** - Framework UI
- **TypeScript 5.8.3** - Type safety
- **Vite 7.1.7** - Build tool
- **Tailwind CSS 3.4.17** - Styling
- **Framer Motion 12.23.22** - Animacje

### Backend
- **Node.js** (LTS) - Runtime
- **Express.js 5.1.0** - HTTP server
- **MySQL2** - Połączenie z bazą danych
- **Winston** - System logowania

### Integracja
- **Java 21** - FireSnow Bridge API (wymagana)
- **HSQLDB** - Połączenie z bazą FireSnow

## 📊 Algorytm dopasowywania

System wykorzystuje zaawansowany algorytm z ważoną średnią:

- **Poziom** (40%) - najważniejsze kryterium
- **Waga** (25%) - kontrola nart
- **Wzrost** (20%) - stabilność
- **Płeć** (10%) - ergonomia
- **Przeznaczenie** (5%) - styl jazdy

Wyniki są kategoryzowane w 5 kategoriach:
1. ✅ **Idealne** - wszystkie kryteria spełnione
2. ⚠️ **Alternatywy** - jedno kryterium w tolerancji
3. 🟡 **Poziom za nisko** - bezpieczniejsza opcja
4. 👥 **Inna płeć** - wszystkie inne kryteria idealne
5. 🔴 **Na siłę** - większe tolerancje

## 🔧 Konfiguracja

### Zmienne środowiskowe (.env)

```env
# Serwer
PORT=5001

# FireSnow API
FIRESNOW_API_URL=http://localhost:8081
USE_FIRESNOW_API=true

# Baza Danych MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=twoje_haslo
DB_NAME=sprzet_narciarski
DB_HISTORY_NAME=history

# Logowanie
LOG_LEVEL=info
LOG_DIR=logs
```

### FireSnow Bridge

Konfiguracja w `FireSnowBridge/config.properties`:
```properties
api.port=8081
db.url=jdbc:hsqldb:file:C:/FireSoft/FireSnowServer20/database/FireSport_database_4;readonly=true
```

## 🧪 Testy

```bash
# Uruchom testy
npm test

# Testy z UI
npm run test:ui

# Pokrycie kodu
npm run test:coverage
```

## 📦 Build produkcyjny

```bash
# Build frontendu
npm run build

# Uruchomienie produkcyjne
npm run preview
```

## 🐳 Docker

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose up -d
```

## 📚 Dokumentacja

- **README+.md** - Kompleksowa dokumentacja techniczna
- **docs/** - Szczegółowa dokumentacja
- **INSTRUKCJA_URUCHOMIENIA.md** - Instrukcja uruchomienia

## 🛠️ Rozwój

1. Fork projektu
2. Utwórz branch (`git checkout -b feature/nowa-funkcja`)
3. Commit zmian (`git commit -am 'Dodaj nową funkcję'`)
4. Push do branch (`git push origin feature/nowa-funkcja`)
5. Utwórz Pull Request

## 📄 Licencja

Projekt prywatny - WYPAS Ski Rental

## 👥 Autorzy

- **Główny deweloper** - WYPAS Ski Rental
- **Migracja Python → React** - AI Assistant

## 🔄 Historia wersji

- **v6.0+** - Pełna migracja do React/TypeScript, integracja z FireSnow
- **v5.x** - Wersja Python/PyQt5 (archiwum)

---

**Ostatnia aktualizacja:** 2025-01-XX  
**Wersja aplikacji:** 6.0+
