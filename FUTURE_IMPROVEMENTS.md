# FUTURE_IMPROVEMENTS

Usprawnienia, optymalizacje i dług techniczny zauważone w trakcie realizacji `ASYSTENT_NART_PLAN.md`, które są poza bieżącym zakresem. Lista jest uzupełniana na bieżąco. Format wpisu: **co / gdzie / dlaczego / pomysł**.

## Backend

- **Edycja sprzętu nadal przypina wszystkie pola** – `src/components/SkiEditModal.tsx` (`handleSave` → `onSave(formData, …)`) wysyła cały `formData`, więc mimo poprawki 1.8 każdy zapis tworzy nadpisanie dla wszystkich 13 pól i późniejsze zmiany w FireSnow są ignorowane. Pomysł: porównać `formData` z oryginałem (`ski`) i wysyłać tylko zmienione pola (`BrowseSkisComponent.handleSave` / `skiDataService.updateSki`).
- **Odpowiedź PUT `/skis/:id` po wyczyszczeniu pola (`null`)** – `equipmentService.applyUpdate` zwraca `current` (scalone ze starym nadpisaniem), więc wyczyszczone pole w odpowiedzi ma jeszcze starą wartość do następnego `GET /skis`. Pomysł: `fetchMergedEquipment` mógłby zwracać też wartości bazowe z FireSnow (przed nałożeniem nadpisań).
- **Limity długości tekstów zależne od kolumny** – kontroler waliduje wszystkie pola tekstowe do 255 znaków, a kolumny `equipment_overrides` mają różne limity (`poziom` 20, `plec` 10, `kategoria`/`typ_sprzetu`/`przeznaczenie`/`kod` 50, `marka` 100, `model` 200). Wartość mieszcząca się w 255, ale przekraczająca limit kolumny, daje 500 z MySQL. Pomysł: limity per pole w `equipmentController`.
- **`details` w odpowiedziach błędów przy `NODE_ENV=development`** – `errorHandler.ts` dołącza `message` i `stack` do odpowiedzi także dla 5xx; lokalny `.env` ma `NODE_ENV=development`. Pomysł: dołączać `details` tylko dla statusów < 500 albo usunąć całkiem; ustawić `NODE_ENV=production` na stanowisku produkcyjnym.
- **Niepełne mapowanie kodów błędów** – `getErrorCode` zna tylko 400/401/403/404; inne 4xx (np. 413 `PayloadTooLargeError`, 429) dostają `INTERNAL_SERVER_ERROR`. Pomysł: mapowanie z `ERROR_CODES` dla pozostałych 4xx.
- **Awaria mostu jest nie do odróżnienia od pustych danych** – `reservationService`, `rentalService.getActive`/`getPast` i `equipmentService.getAll` przy błędzie FireSnow zwracają `[]` (200). Widoki pracownika pokazują pustą listę bez informacji o awarii. Pomysł: nagłówek/flaga `degraded` w odpowiedzi albo 503 + obsługa w UI (spójnie z 2.3 dla dostępności).
- **Limit logowania tylko w pamięci i per IP** – `loginRateLimit.ts` resetuje się przy restarcie, a za reverse proxy wymaga `app.set('trust proxy', …)`. Pomysł: jeśli powstanie proxy, ustawić `trust proxy`; rozważyć dodatkowy licznik globalny.
- **Brak testów automatycznych dla nowych zachowań serwera** – `optionalEmployeeAuth`, `loginRateLimit`, `withoutClientData`, `parseUpdateData`, `applyUpdate` zweryfikowano tylko smoke testami. Pomysł: testy jednostkowe w `src/test/` (czyste funkcje: `parseUpdateData`, `withoutClientData`, rate limiter z `vi.useFakeTimers`).
- **Tabela `equipment_overrides` tworzona w locie** – `ensureTableExists` robi `CREATE TABLE IF NOT EXISTS` w kodzie aplikacji. Pomysł: osobny skrypt migracji.
- **`fireSnowService.getAvailability` zwraca `unknown`** – kontroler musi pracować na `unknown` (`withoutClientData`). Pomysł: typ odpowiedzi `{ reservations: …[]; rentals: …[] }` w `types/services.types.ts`.
- **Zamykanie procesu na Windows** – `SIGTERM` nie jest na Windows dostarczany (zakończenie przez `taskkill` bez `/F` / zamknięcie okna konsoli to `SIGBREAK`/`CTRL_CLOSE_EVENT`), więc łagodne zamknięcie (`server.ts`) działa tylko dla Ctrl+C (`SIGINT`). Pomysł: obsłużyć też `SIGBREAK` i sprawdzić, jak `start_jedno_okno.bat` zamyka serwer.
- **`applyOverride` ma niespójne warunki** – część pól sprawdza `!== null && !== undefined && !== ''`, część `||` (`KATEGORIA`, `TYP_SPRZETU`, `MARKA`, `MODEL`, `PLEC`). Efekt jest dziś równoważny dla tekstów (pusty string = brak nadpisania), ale warunki warto ujednolicić jedną funkcją pomocniczą przy okazji zmian w modelu nadpisań.
- **Express 5: `app.listen(port, host, cb)` wywołuje `cb` także przy błędzie nasłuchiwania** – callback dostaje `Error`; w `server.ts` obsłużone (`if (listenError) return`). Warto pamiętać przy innych wywołaniach `listen`.

## Repo i dokumentacja

- **Dokumentacja nadal opisuje fallback CSV** – m.in. `CLAUDE.md` („CSV fallback"), `README.md`, `INSTRUKCJA_URUCHOMIENIA.md`, `docs/`. Po 1.7 serwer nie czyta ani nie zapisuje CSV rezerwacji/wypożyczeń. Pomysł: zaktualizować dokumenty po zakończeniu Fazy 1.
- **Niespójne końce linii** – git ostrzega `CRLF will be replaced by LF` przy kolejnych commitach (pliki w working copy mają CRLF). Pomysł: dodać `.gitattributes` (`* text=auto eol=lf`) i jednorazowo znormalizować.
- **Wiele przestarzałych plików dokumentacji w rootcie** (`PLAN_NAPRAWY_BLEDOW.md`, `RAPORT_AUDYTU.md`, `REVIEW_*.md`, `PODSUMOWANIE_POPRAWEK.md`) – część opisuje stan sprzed zmian (np. „PIN 0000"). Pomysł: przenieść do `docs/archive/` albo usunąć.
- **Frontendowy `src/utils/csvParser.ts` i zależność `papaparse`** – pozostałość po CSV; usuwane w 3.1 / Fazie 3.

## Frontend

- **Fałszywy toast „Dane z FireSnow zostały zsynchronizowane" przy wyłączonym moście** – `GET /skis` zwraca `[]` z 200 (`equipmentService.getAll` połyka błąd), więc `skiDataService`/`useSkiData` zgłasza sukces synchronizacji mimo awarii. Pomysł: rozróżnić awarię od pustej listy (patrz wpis o „degraded" w sekcji Backend).
- **Widok Przeglądaj jest przywracany po odświeżeniu strony** (`appMode = 'browse'` z localStorage), ale bez wybranej grupy i bez wiedzy o sesji – po reloadzie użytkownik ląduje w pustym widoku. Pomysł: nie przywracać `browse` albo przywracać też grupę.
- **Etykiety kart nie są przenumerowywane** po usunięciu karty (np. „Osoba 2", „Osoba 4"). Pomysł: etykieta z indeksu pozycji zamiast z ID.
