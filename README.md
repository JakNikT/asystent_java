# 🎿 Asystent Doboru Nart - Wersja Web

## 📋 Opis

Nowoczesna aplikacja webowa do inteligentnego doboru sprzętu narciarskiego i snowboardowego. Aplikacja została w pełni zmigrowana z języka Python (PyQt5) do **React** z **TypeScript**, oferując profesjonalne narzędzie do zarządzania wypożyczalnią sprzętu narciarskiego.

## ✨ Główne funkcje

- **Inteligentny dobór sprzętu** - zaawansowany algorytm dopasowujący narty, buty i deski snowboardowe na podstawie kryteriów użytkownika (wzrost, waga, poziom, płeć, styl jazdy)
- **System wielokartowy** - obsługa wielu klientów jednocześnie w jednej sesji
- **Przeglądanie bazy danych** - interaktywna tabela do przeglądania, sortowania i filtrowania całego dostępnego sprzętu
- **Zarządzanie sprzętem** - edycja pozycji (pojedynczo i zbiorczo) po zalogowaniu PIN-em pracownika; dane bazowe pochodzą z FireSnow, a zmiany zapisywane są w MySQL jako nadpisania
- **Rezerwacje i dostępność** - integracja z systemem FireSnow (tylko odczyt), wizualizacja dostępności sprzętu w systemie 3 kolorów oraz oś czasu zajętości
- **Historia klientów** - przeglądanie historii wypożyczeń z dwóch źródeł: archiwum MySQL (2012–2023) i FireSnow (bieżące sezony); awaria jednego źródła nie blokuje drugiego
- **Obsługa błędów** - React Error Boundary, globalny error handler API, system powiadomień Toast
- **Nowoczesny interfejs** - Tailwind CSS i Material UI (MUI)
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
   - `DB_PASSWORD` - hasło do bazy danych MySQL (wymagane, serwer nie wystartuje bez niego)
   - `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_HISTORY_NAME` - dane połączenia z bazą
   - `FIRESNOW_API_URL` - URL do FireSnow Bridge API (domyślnie: `http://localhost:8081`)
   - `EMPLOYEE_PIN` - PIN pracownika (4-12 cyfr, różny od `0000`)
   - `AUTH_SECRET` - losowy sekret min. 32 znaki, np. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

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
npm run dev:server

# Terminal 3: Frontend
npm run dev
```

## 📁 Struktura projektu

```
asystent_java/
├── src/
│   ├── components/          # Komponenty React
│   │   ├── dashboard/       # Główny dashboard (Dashboard.tsx jest orkiestratorem)
│   │   │   ├── hooks/       # useFormLogic, useSearchLogic, useSkiData, useEmployeeAuth, useTabsState
│   │   │   └── ...          # DashboardForm, SkierForm, EquipmentFilters, EmployeeControls itd.
│   │   ├── BrowseSkisComponent.tsx
│   │   ├── EquipmentTimeline.tsx
│   │   ├── EquipmentHandoutView.tsx
│   │   ├── ConflictCheckerModal.tsx
│   │   ├── ReservationsView.tsx
│   │   ├── HistoryView.tsx
│   │   ├── PasswordModal.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Toast.tsx
│   │   └── ui/              # Komponenty UI (Button, Input, Label, Modal)
│   ├── hooks/               # useToast.tsx (Toast Manager)
│   ├── server/              # Backend Express.js (TypeScript)
│   │   ├── app.ts           # Główna aplikacja Express
│   │   ├── config/          # Konfiguracja (env, database, logger)
│   │   ├── controllers/     # Kontrolery API
│   │   ├── services/        # Logika biznesowa
│   │   ├── routes/          # Routing API
│   │   ├── middleware/      # authMiddleware, errorHandler, loginRateLimit
│   │   ├── types/
│   │   └── utils/
│   ├── services/            # Serwisy frontend
│   │   ├── skiMatchingServiceV2.ts   # Algorytm doboru
│   │   ├── reservationApiClient.ts   # Dostępność (system 3 kolorów)
│   │   ├── skiDataService.ts
│   │   ├── historyService.ts
│   │   └── authService.ts
│   ├── types/               # Definicje typów TypeScript
│   ├── utils/               # Narzędzia pomocnicze
│   └── App.tsx
├── FireSnowBridge/          # Integracja z FireSnow (Java)
│   ├── src/FireSnowBridge.java
│   └── config.properties
├── public/
│   ├── fonts/
│   └── images/
├── server.ts                # Entry point backendu
├── start_jedno_okno.bat     # Uruchomienie wszystkich serwisów (Windows)
├── start_produkcja.bat      # Uruchomienie produkcyjne (Windows)
├── package.json
├── vite.config.ts
└── .env                     # Konfiguracja środowiskowa (nie w repo)
```

## 🔌 Porty serwerów

- **5002** - Vite Dev Server (frontend)
- **5001** - Express Backend API
- **8081** - FireSnow Bridge API (Java)

## 🎯 API Endpoints

Endpointy oznaczone 🔒 wymagają zalogowania jako pracownik.

### Autoryzacja
- `POST /api/auth/login` - Logowanie PIN-em pracownika
- `POST /api/auth/logout` - Wylogowanie
- `GET /api/auth/status` - Status sesji

### Rezerwacje
- `GET /api/reservations` - Pobierz rezerwacje
- `GET /api/reservations/date` - Rezerwacje dla podanej daty

### Wypożyczenia
- `GET /api/wypozyczenia/aktualne` - Aktywne wypożyczenia
- `GET /api/wypozyczenia/przeszle` - Przeszłe wypożyczenia

### Sprzęt
- `GET /api/skis` - Pobierz wszystkie pozycje sprzętu
- `PUT /api/skis/:id` 🔒 - Aktualizuj sprzęt
- `PUT /api/skis/bulk` 🔒 - Masowa aktualizacja

### Historia
- `GET /api/historia/klienci/wyszukaj` - Wyszukaj klientów
- `GET /api/historia/klient/:id/daty` - Daty klienta
- `GET /api/historia/klient/:id/sprzet` - Sprzęt klienta
- `GET /api/historia/firesnow/klienci/wyszukaj?nazwisko=` - Wyszukaj klientów z wypożyczeniami w FireSnow
- `GET /api/historia/firesnow/klient/:id/daty` - Umowy klienta w FireSnow
- `GET /api/historia/firesnow/klient/:id/sprzet?dokument=` - Sprzęt z jednej umowy FireSnow

### FireSnow
- `GET /api/firesnow/status` - Status FireSnow Bridge
- `POST /api/firesnow/refresh` 🔒 - Odśwież cache
- `GET /api/dostepnosc/okres?from={ts}&to={ts}` - Dostępność w okresie

### Health Check
- `GET /api/health` - Status serwera

## 🗄️ Źródła danych

### FireSnow (główne źródło, tylko odczyt)
- Sprzęt, rezerwacje i wypożyczenia pobierane przez FireSnow Bridge API
- Przy `USE_FIRESNOW_API=false` backend zwraca puste listy (brak innego źródła danych)

### MySQL
- `sprzet_narciarski` - nadpisania danych sprzętu nakładane na dane z FireSnow
- `history` - baza historii wypożyczeń

## 🛠️ Technologie

### Frontend
- **React 19** - Framework UI
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool
- **Tailwind CSS 3.4** - Styling
- **MUI 7** (`@mui/material`, `@mui/x-date-pickers`) - Komponenty UI i wybór dat
- **react-calendar-timeline**, **dayjs** - Oś czasu zajętości i obsługa dat

### Backend
- **Node.js** (LTS) - Runtime
- **Express.js 5.1.0** - HTTP server
- **MySQL2** - Połączenie z bazą danych
- **Winston** - System logowania

### Integracja
- **Java 21** - FireSnow Bridge API (wymagana)
- **HSQLDB** - Połączenie z bazą FireSnow

## 🛡️ Obsługa błędów

Aplikacja posiada kompleksowy system obsługi błędów:

### Frontend
- **Error Boundary** (`src/components/ErrorBoundary.tsx`) - przechwytuje błędy renderowania React i wyświetla przyjazny komunikat z opcjami odzyskania
- **Toast Manager** (`src/hooks/useToast.tsx`) - centralny system powiadomień użytkownika:
  - Context API dla komponentów React
  - Singleton service dla API clients
  - Kolejka powiadomień (max 3 naraz)
  - Auto-dismiss i debouncing
- **Integracja z API clients** - automatyczne powiadomienia o błędach i sukcesach operacji

### Backend
- **Global Error Handler** (`src/server/middleware/errorHandler.ts`) - standaryzowany format odpowiedzi błędów:
  - Obsługa błędów walidacji (400)
  - Obsługa błędów bazy danych (500)
  - Obsługa błędów zewnętrznych API (503)
  - Logowanie błędów z kontekstem
  - Przyjazne komunikaty dla użytkownika

### Format odpowiedzi błędów API

```json
{
  "success": false,
  "error": {
    "message": "Przyjazny komunikat dla użytkownika",
    "code": "ERROR_CODE",
    "details": {} // Tylko w development
  }
}
```

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

# Autoryzacja pracownika
EMPLOYEE_PIN=
AUTH_SECRET=

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
npm test               # Testy (vitest run)
npm run test:ui        # Testy z UI
npm run test:coverage  # Pokrycie kodu
npm run typecheck      # Typecheck frontendu i backendu
npm run lint           # ESLint
```

## 📦 Build produkcyjny

```bash
# Build frontendu
npm run build

# Backend produkcyjny (tsx server.ts)
npm run start
```

Na Windows można użyć `start_produkcja.bat`.

## 📚 Dokumentacja

- **docs/archive/README+.md** - Archiwalna dokumentacja techniczna
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

- **v6.0+** - Pełna migracja do React/TypeScript, integracja z FireSnow, obsługa błędów
- **v5.x** - Wersja Python/PyQt5 (archiwum)

---

**Ostatnia aktualizacja:** 2026-10-21  
**Wersja aplikacji:** 6.0+
