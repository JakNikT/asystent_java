# Plan Ulepszeń Aplikacji Asystent Nart

## 1. Backend: Refaktoryzacja `server.js` (Priorytet: Wysoki)
Obecny plik `server.js` jest monolityczny (1600+ linii) i trudny w utrzymaniu.
**Plan działań:**
- Podział na strukturę modułową:
  - `src/server/routes/` - definicje endpointów API.
  - `src/server/controllers/` - logika obsługi żądań.
  - `src/server/services/` - logika biznesowa (integracja z FireSnow, obsługa CSV).
  - `src/server/config/` - konfiguracja (baza danych, zmienne środowiskowe).
- Zachowanie podwójnego trybu działania (API + CSV fallback).

## 2. Frontend: Rozbicie "God Component" (Priorytet: Średni)
Plik `src/components/AnimaComponent.tsx` jest zbyt duży i odpowiedzialny za zbyt wiele rzeczy.
**Plan działań:**
- Zmiana nazwy na `Dashboard` lub `MainLayout`.
- Wydzielenie mniejszych komponentów:
  - `Sidebar` / `Navigation`
  - `Header`
  - `RentalTable` / `ReservationTable`
- Poprawa typowania TypeScript w nowych komponentach.

## 3. Konfiguracja i Bezpieczeństwo (Priorytet: Wysoki)
W kodzie znajdują się "twarde" ścieżki i adresy URL.
**Plan działań:**
- Utworzenie pliku `.env` dla konfiguracji (porty, adresy API, ścieżki do plików).
- Aktualizacja `db-config.js` i `server.js` aby korzystały z `process.env`.

## 4. Testy i Jakość Kodu (Priorytet: Średni)
Brak automatycznych testów zwiększa ryzyko błędów przy refaktoryzacji.
**Plan działań:**
- Instalacja i konfiguracja **Vitest**.
- Napisanie testów jednostkowych dla kluczowych funkcji backendowych (np. parsowanie dat, mapowanie kategorii sprzętu).

## 5. DevOps (Opcjonalnie)
Brak konteneryzacji utrudnia uruchamianie w różnych środowiskach.
**Plan działań:**
- Utworzenie `Dockerfile` dla aplikacji.
- Utworzenie `docker-compose.yml` dla całej infrastruktury (App + DB).
