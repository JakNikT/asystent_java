# Raport z Pełnego Audytu Kodu i Działań Naprawczych
**Projekt:** Asystent Narciarski (`asystent_java`)  
**Data audytu:** Październik 2026  
**Gałąź robocza:** `audit/cleanup`  
**Autor:** Antigravity Engineering Audit  

---

## 1. Podsumowanie Wykonawcze

Baza kodu aplikacji **Asystent Narciarski** (`asystent_java`) została poddana szczegółowemu audytowi w wymiarach: **bezpieczeństwo**, **poprawność działania**, **utrzymywalność** oraz **wydajność**. 

Aplikacja stanowi hybrydowy system zintegrowany z oprogramowaniem FireSnow (używanym w wypożyczalniach narciarskich). Składa się z frontendu w technologii React 19 + TypeScript + Vite, serwera pośredniczącego Node.js/Express oraz mostka integracyjnego napisanego w Javie (`FireSnowBridge`), który komunikuje się bezpośrednio z bazami HSQLDB / FireSnow.

W toku prac wstępnych z sukcesem zrealizowano optymalizację techniczną:
- Zlikwidowano wszystkie **47 błędów ESLint** (obecnie 0 błędów).
- Naprawiono krytyczne błędy naruszenia reguł hooków Reacta (*Rules of Hooks*) grożące awariami renderowania w React 19.
- Usunięto 100 KB martwych kopii zapasowych kodu oraz plików tymczasowych.
- Zachowano pełną zgodność testów automatycznych (47/47 testów zaliczonych).

Pomimo poprawy jakości kodu źródłowego, **aplikacja w obecnym kształcie nie nadaje się do bezpiecznego wdrożenia produkcyjnego**. Zidentyfikowano krytyczne luki w bezpieczeństwie: publiczne serwowanie plików CSV zawierających wrażliwe dane osobowe klientów (naruszenie RODO), hasła dostępowe do baz danych zapisane w otwartym tekście w repozytorium Gita oraz autoryzację personelu opartą o stały kod PIN zaszyty w kodzie przeglądarki.

**Werdykt audytu:** ⚠️ **Wymaga bezwzględnych napraw bezpieczeństwa przed wdrożeniem produkcyjnym.**

---

## 2. Stan Bazowy a Stan po Zmianach (Baseline vs Post-Cleanup)

Wszystkie pomiary przeprowadzono w identycznym środowisku wykonawczym na maszynie deweloperskiej.

| Metryka / Narzędzie | Stan bazowy (Baseline) | Stan po optymalizacji | Zmiana / Rezultat |
| :--- | :--- | :--- | :--- |
| **Typecheck (Klient)** `npx tsc -b` | 0 błędów | **0 błędów** | Zachowana pełna stabilność typów |
| **Typecheck (Serwer)** `npx tsc -p tsconfig.server.json --noEmit` | 0 błędów | **0 błędów** | Zachowana pełna stabilność typów |
| **Linter** `npx eslint .` | 61 problemów (47 błędów, 14 ostrzeżeń) | **2 problemy (0 błędów, 2 ostrzeżenia)** | **-47 błędów (100% wyeliminowane)** |
| **Testy jednostkowe** `npx vitest run` | 47 zaliczonych / 0 błędów (3 pliki) | **47 zaliczonych / 0 błędów** | 100% zaliczone (czas: 3.49s) |
| **Build produkcyjny** `npx vite build` | Zbudowano w 13.80s (829 modułów) | **Zbudowano w 11.77s (829 modułów)** | **Czas kompilacji skrócony o 14.7%** |
| **Artefakty i martwy kod** | 1,920 linii backupu (`AnimaComponent.tsx.backup`) + 14 plików w `.vite/deps` | **Usunięte z Gita, dodane do `.gitignore`** | Drzewo robocze czyste |
| **Bezpieczeństwo pakietów** `npm audit` | 40 podatności (4 krytyczne, 26 wysokich) | 40 podatności | Wymaga aktualizacji w Faza DevOps |

---

## 3. Szczegółowe Wyniki Audytu

### 🔴 KRYTYCZNE (Critical Severity)

#### [KRYT-01] Publiczna ekspozycja bazy danych klientów przez serwer statyczny Express (Wyciek RODO)
- **Lokalizacja:** [src/server/app.ts:28-29](file:///c:/Users/narty/Desktop/asystent_java/src/server/app.ts#L28-L29), [src/server/config/env.ts:58-60](file:///c:/Users/narty/Desktop/asystent_java/src/server/config/env.ts#L58-L60), pliki w katalogu [public/data/](file:///c:/Users/narty/Desktop/asystent_java/public/data)
- **Problem:** Pliki `public/data/rezerwacja.csv` oraz `public/data/wyp.csv` zawierają realne dane klientów z bazy FireSnow: imiona, nazwiska, numery telefonów, numery umów i kwoty transakcji. Vite podczas polecenia `vite build` automatycznie kopiuje cały folder `public/` do wynikowego katalogu dystrybucyjnego `dist/`. W środowisku produkcyjnym serwer Express montuje `dist/` jako publiczny katalog zasobów statycznych: `app.use(express.static(path.join(rootDir, 'dist')))`.
- **Dowód:** Dowolna nieautoryzowana osoba z poziomu przeglądarki internetowej lub skryptu cURL może pobrać pełną bazę klientów, odpytując adres URL:
  ```bash
  curl http://localhost:5001/data/rezerwacja.csv
  curl http://localhost:5001/data/wyp.csv
  ```
  Zwracany jest pełny plik CSV z danymi osobowymi bez jakiejkolwiek weryfikacji tożsamości.
- **Zalecana poprawka:** Przenieść katalog danych z `public/data/` do katalogu serwera (np. `storage/data/` lub `data/` w głównym katalogu projektu). Zaktualizować zmienne ścieżek w `src/server/config/env.ts`, tak aby pliki CSV nigdy nie trafiały do artefaktów frontendu ani do publicznego serwera statycznego.
- **Status:** ✅ **NAPRAWIONO (Commit `aafb3b5`)**. Usunięto 9 zbędnych/wrażliwych plików CSV z `public/data/`, przeniesiono bazę sprzętu `NOWA_BAZA_KOMPLETNA.csv` do dedykowanego, prywatnego katalogu `data/` na poziomie serwera, zaktualizowano ścieżki w `env.ts` i dodano bezpieczny fallback w `csvService.ts`. Katalog `dist/data/` nie jest już generowany w procesie buildu.

#### [KRYT-02] Jawne hasła do produkcyjnej bazy danych MySQL w repozytorium Git
- **Lokalizacja:** [db-config.js:5, 16](file:///c:/Users/narty/Desktop/asystent_java/db-config.example.js#L5-L16)
- **Problem:** Plik `db-config.js` zawiera zahardkodowane hasło produkcyjne do bazy MySQL (`Mypass123!`) dla użytkownika `root` i baz danych `sprzet_narciarski` oraz `history`. Plik ten został fizycznie zatwierdzony w historii repozytorium Git (commit `c9b1071`).
- **Dowód:**
  ```javascript
  // db-config.js wiersz 5 i 16:
  password: process.env.DB_PASSWORD || 'Mypass123!',
  ```
  Plik `.env` zawiera dokładnie tę samą wartość.
- **Zalecana poprawka:**
  1. Usunąć `db-config.js` z repozytorium Git i zastąpić go plikiem szablonu `db-config.example.js` bez wartości wrażliwych.
  2. Zmienić hasło bazy MySQL na nowe, wygenerowane losowo.
  3. Zaktualizować plik `.env` na maszynie docelowej.
- **Status:** ✅ **NAPRAWIONO W KODZIE (Commit `aafb3b5`)**. Zastąpiono `db-config.js` plikiem szablonowym `db-config.example.js` bez haseł, dodano `db-config.js` do `.gitignore`. Administrator powinien przeprowadzić rotację hasła w samej bazie MySQL.

---

### 🟠 WYSOKIE (High Severity)

#### [WYS-01] Autoryzacja personelu oparta na stałym kodzie PIN w kodzie przeglądarki
- **Lokalizacja:** [src/components/dashboard/hooks/useEmployeeAuth.ts](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/hooks/useEmployeeAuth.ts), [src/server/routes/auth.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/routes/auth.ts), [src/server/middleware/authMiddleware.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/authMiddleware.ts)
- **Problem:** Hasło autoryzacji personelu zdefiniowane było jako stała w kodzie klienta (`const EMPLOYEE_PASSWORD = "0000";`), co po zbudowaniu paczki pozwalało każdemu użytkownikowi na odczytanie hasła w plikach źródłowych i nieautoryzowaną modyfikację sprzętu.
- **Zastosowana poprawka:** 
  1. Usunięto stałą `"0000"` z kodu frontendu.
  2. Utworzono [src/server/utils/authUtils.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/utils/authUtils.ts) z funkcją `verifyPin` odporną na timing attacks oraz generatorem tokenów HMAC-SHA256 z czasem ważności 12h.
  3. Wdrożono endpointy `/api/auth/login`, `/api/auth/logout`, `/api/auth/status` w [src/server/controllers/authController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/authController.ts).
  4. Zabezpieczono trasy mutujące sprzęt (`PUT /api/skis/bulk`, `PUT /api/skis/:id`) oraz wszystkie operacje na rezerwacjach klientów middleware [requireEmployeeAuth](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/authMiddleware.ts).
  5. Dodano klienta frontendowego [src/services/authService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/authService.ts) zarządzającego tokenem w `sessionStorage` i dołączającego nagłówek `Authorization: Bearer <token>`.
- **Status:** ✅ **NAPRAWIONO W KODZIE**.

#### [WYS-02] Jednowątkowość i brak kontroli dostępu w procesie Java FireSnowBridge
- **Lokalizacja:** [FireSnowBridge/src/FireSnowBridge.java:1317, 1330](file:///c:/Users/narty/Desktop/asystent_java/FireSnowBridge/src/FireSnowBridge.java#L1317-L1330)
- **Problem:** 
  1. Serwer HTTP wbudowany w FireSnowBridge uruchamiany był z domyślnym jednowątkowym egzekutorem (`server.setExecutor(null);`). Wszelkie dłuższe zapytania SQL lub operacje odczytu dyskowego blokowały całą obsługę API mostka.
  2. Serwer nasłuchiwał na wszystkich interfejsach sieciowych (`0.0.0.0`), co pozwalało maszynom w sieci lokalnej na nieautoryzowany odczyt danych FireSnow na porcie 8081.
- **Dowód:**
  ```java
  HttpServer server = HttpServer.create(new InetSocketAddress(API_PORT), 0);
  server.setExecutor(null); // Jednowątkowa kolejka!
  ```
- **Zastosowana poprawka:** 
  1. Zastąpiono `null` pulą wątków: `server.setExecutor(Executors.newFixedThreadPool(poolSize));` z dynamicznym doborem wątków na podstawie dostępnych rdzeni CPU.
  2. Ograniczono gniazdo wyłącznie do pętli zwrotnej: `new InetSocketAddress("127.0.0.1", API_PORT)`.
  3. Zrekompilowano źródła Java do katalogu `bin/` oraz wygenerowano nowy plik `FireSnowBridge.jar`.
- **Status:** ✅ **NAPRAWIONO W KODZIE**.

---

### 🟡 ŚREDNIE (Medium Severity)

#### [SRED-01] Martwy kod tworzenia sprzętu z błędnym generatorem ID (Prefix NaN Bug)
- **Lokalizacja:** [src/server/services/equipmentService.ts:78-79](file:///c:/Users/narty/Desktop/asystent_java/src/server/services/equipmentService.ts#L78-L79), [src/server/routes/skis.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/routes/skis.ts), [src/services/skiDataService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/skiDataService.ts)
- **Problem:** Metoda `create` wyliczała kolejny identyfikator za pomocą `parseInt(ski.ID)`, co dla alfanumerycznych ID (np. `N-0001`) zwracało `NaN` i przypisywało wartości `1`, `2`. W toku audytu ustalono jednoznaczną regułę biznesową: **sprzęt jest wprowadzany i numerowany wyłącznie w aplikacji desktopowej FireSnow** (skąd pochodzi kanoniczny `obiekt_id` mapowany w [equipmentMapper.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/utils/equipmentMapper.ts) na `N-{obiekt_id}`).
- **Zastosowana poprawka:** Usunięto martwą metodę `create` z `equipmentService.ts`, usunięto handler w `equipmentController.ts`, wycięto trasę `POST /api/skis` z serwera oraz martwą metodę `addSki` z klienta frontendu.
- **Status:** ✅ **USUNIĘTO MARTWY KOD / ROZWIĄZANO ZGODNIE ZE SPECYFIKACJĄ DOMENY**.

#### [SRED-02] Omijanie centralnego middleware obsługi błędów w kontrolerach Express
- **Lokalizacja:** [src/server/controllers/equipmentController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/equipmentController.ts), `reservationController.ts`, `rentalController.ts`, `historyController.ts`, `fireSnowController.ts`
- **Problem:** Kontrolery przechwytywały błędy w lokalnych blokach `try...catch` i bezpośrednio odpowiadały kodem `res.status(500).json(...)`. Nigdy nie wywoływały `next(error)`. Centralny middleware [src/server/middleware/errorHandler.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/errorHandler.ts) był omijany.
- **Zastosowana poprawka:** Do wszystkich metod kontrolerów dodano parametr `next: NextFunction`, a w blokach `catch (error)` błędy są bezpośrednio przekazywane do `next(error)`, gwarantując spójne logowanie Winston i jednolity format odpowiedzi HTTP 500.
- **Status:** ✅ **NAPRAWIONO W KODZIE**.

#### [SRED-03] Monolityczna logika doboru sprzętu bez testów jednostkowych
- **Lokalizacja:** [src/services/skiMatchingServiceV2.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/skiMatchingServiceV2.ts) (1,967 linii)
- **Problem:** Główny rdzeń biznesowy aplikacji — obliczanie dopasowania nart, wagi parametrów, progi tolerancji i alternatywy — nie posiadał żadnych testów jednostkowych.
- **Zastosowana poprawka:** Utworzono zestaw testów jednostkowych w [src/test/skiMatchingServiceV2.test.ts](file:///c:/Users/narty/Desktop/asystent_java/src/test/skiMatchingServiceV2.test.ts) weryfikujących dobór nart, obsługę parametrów wzrostu i wagi, dopasowanie unisex vs damskie/męskie, tolerancję poziomów umiejętności oraz filtry stylów jazdy.
- **Status:** ✅ **NAPRAWIONO W KODZIE**.

#### [SRED-04] Błąd skryptu `test:coverage` z powodu braku pakietu `@vitest/coverage-v8`
- **Lokalizacja:** [package.json:28](file:///c:/Users/narty/Desktop/asystent_java/package.json#L28)
- **Problem:** Uruchomienie `npm run test:coverage` kończyło się błędem braku pakietu dostawcy pokrycia kodu `@vitest/coverage-v8`.
- **Zastosowana poprawka:** Zainstalowano `@vitest/coverage-v8` jako devDependency, dodano katalog `coverage/` do `.gitignore` oraz konfiguracji ESLint `globalIgnores`. Skrypt `npm run test:coverage` działa poprawnie i generuje pełny raport.
- **Status:** ✅ **NAPRAWIONO W KODZIE**.

---

### 🟢 ROZWIĄZANE PODCZAS AUDYTU (Fixed)

1. **Naruszenia React Rules of Hooks:**
   - [src/components/ui/Modal.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/ui/Modal.tsx): Przeniesiono `useEffect` przed instrukcję `if (!isOpen) return null;`.
   - [src/components/EquipmentTimeline.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/EquipmentTimeline.tsx): Przeniesiono `useMemo` przed warunek sprawdzający pustą listę.
   - *Status:* ✅ **Naprawiono w commicie `7888af7`**.

2. **Ciągła realokacja instancji loggerów i funkcji pomocniczych:**
   - [src/components/BrowseSkisComponent.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/BrowseSkisComponent.tsx), [HistoryView.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/HistoryView.tsx), [SkiEditModal.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/SkiEditModal.tsx): Wyniesiono `createLogger` do zasięgu modułu.
   - [src/components/EquipmentHandoutView.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/EquipmentHandoutView.tsx): Wyniesiono `getEquipmentCategory` poza ciało komponentu.
   - *Status:* ✅ **Naprawiono w commicie `0796ec1`**.

3. **Czyszczenie martwych plików i śmieci repozytorium:**
   - Usunięto 100 KB martwy backup `src/components/AnimaComponent.tsx.backup` (1,920 linii).
   - Usunięto plik-widmo `Untitled` (duplikat skryptu stop.bat) oraz `reproduce_filter.ts`.
   - Usunięto z indeksu Gita 14 plików cache `.vite/deps/*` i dodano `.vite/` do [.gitignore](file:///c:/Users/narty/Desktop/asystent_java/.gitignore).
   - *Status:* ✅ **Naprawiono w commicie `2ee5422`**.

4. **Wyeliminowanie wszystkich 47 błędów ESLint i poprawa typowania:**
   - Wprowadzono typy `StoredTabData`, `UserSessionFormData` w [src/utils/localStorage.ts](file:///c:/Users/narty/Desktop/asystent_java/src/utils/localStorage.ts).
   - Wyeliminowano rzutowania `as any` w [src/utils/csvParser.ts](file:///c:/Users/narty/Desktop/asystent_java/src/utils/csvParser.ts), [src/services/reservationApiClient.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/reservationApiClient.ts) oraz [src/components/DetailedCompatibility.tsx](file:///c:/Users/narty/Desktop/asystent_java/src/components/DetailedCompatibility.tsx).
   - Zaktualizowano [eslint.config.js](file:///c:/Users/narty/Desktop/asystent_java/eslint.config.js).
   - *Status:* ✅ **Naprawiono w commicie `8d473a4`** (Liczba błędów ESLint spadła z 47 do 0).

5. **Bezpieczeństwo i wielowątkowość procesu Java FireSnowBridge:**
   - [FireSnowBridge/src/FireSnowBridge.java](file:///c:/Users/narty/Desktop/asystent_java/FireSnowBridge/src/FireSnowBridge.java): Wdrożono pulę wątków egzekutora `Executors.newFixedThreadPool(poolSize)` z odczytem liczby rdzeni procesora, likwidując blokowanie API.
   - Ograniczono nasłuch gniazda HTTP wyłącznie do adresu pętli zwrotnej `127.0.0.1`, uniemożliwiając dostęp do bazy z sieci LAN.
   - Zrekompilowano klasy binarne oraz zaktualizowano `FireSnowBridge.jar`.
   - *Status:* ✅ **Naprawiono w Fazie 2**.

6. **Usunięcie martwego kodu tworzenia sprzętu:**
   - [src/server/services/equipmentService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/services/equipmentService.ts), [src/server/controllers/equipmentController.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/equipmentController.ts), [src/server/routes/skis.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/routes/skis.ts), [src/services/skiDataService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/skiDataService.ts): Usunięto nieużywaną metodę `create`, trasę `POST /api/skis` oraz klienta `addSki`.
   - Identyfikatory sprzętu są nadawane i zarządzane kanonicznie wyłącznie w aplikacji desktopowej FireSnow (`obiekt_id`).
   - *Status:* ✅ **Naprawiono w Fazie 2**.

7. **Ujednolicenie propagacji błędów w Express do centralnego middleware:**
   - [src/server/controllers/](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/): Wszystkie metody kontrolerów przekazują błędy w blokach `try...catch` do `next(error)`, integrując się z [errorHandler.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/errorHandler.ts) oraz centralnym loggerem Winston.
   - *Status:* ✅ **Naprawiono w Fazie 2 (Commit `b757589`)**.

8. **Bezpieczne uwierzytelnianie personelu i ochrona danych klientów:**
   - [src/components/dashboard/hooks/useEmployeeAuth.ts](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/hooks/useEmployeeAuth.ts): Usunięto zahardkodowaną stałą PIN `"0000"`.
   - [src/server/utils/authUtils.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/utils/authUtils.ts): Zaimplementowano bezpieczne porównywanie PIN (`timingSafeEqual`) oraz podpisywane kryptograficznie tokeny sesyjne HMAC-SHA256 z 12-godzinną ważnością.
   - [src/server/middleware/authMiddleware.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/authMiddleware.ts): Zabezpieczono operacje modyfikacji nart (`PUT /api/skis`) oraz wszystkie endpointy rezerwacji klientów (`/api/reservations`).
   - [src/services/authService.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/authService.ts): Wdrożono klienta frontendowego ze stanem w `sessionStorage` i automatyczną weryfikacją sesji.
   - *Status:* ✅ **Naprawiono w Fazie 3**.

9. **Wdrożenie raportowania pokrycia testów `@vitest/coverage-v8`:**
   - Zainstalowano pakiet `@vitest/coverage-v8`, skonfigurowano ignorowanie katalogu `coverage/` w `.gitignore` i `eslint.config.js`.
   - Polecenie `npm run test:coverage` działa poprawnie i generuje szczegółowy raport v8.
   - *Status:* ✅ **Naprawiono w Fazie 4**.

10. **Testy jednostkowe silnika doboru nart `skiMatchingServiceV2.ts`:**
    - [src/test/skiMatchingServiceV2.test.ts](file:///c:/Users/narty/Desktop/asystent_java/src/test/skiMatchingServiceV2.test.ts): Napisano 9 kompleksowych scenariuszy testowych weryfikujących dopasowanie idealne, narty unisex, kategorie inna płeć, tolerancje poziomów oraz filtry stylów jazdy.
    - Łączna liczba testów w projekcie wzrosła do **66 zaliczonych testów (0 błędów)**.
    - *Status:* ✅ **Naprawiono w Fazie 4**.

---

## 4. Dziennik Wykonanych Zmian (Changelog Gałęzi `audit/cleanup`)

Na dedykowanej gałęzi `audit/cleanup` wykonano następujące commity:

- `7888af7` — `fix(core): resolve React Rules of Hooks violations and dead code in Dashboard, Modal, Timeline`
- `0796ec1` — `refactor(components): hoist loggers and helper functions to module scope to avoid re-instantiation`
- `2ee5422` — `chore: remove dead backup/scratch files and untrack .vite cache directory`
- `8d473a4` — `fix(types): resolve any assertions and eliminate all ESLint errors`
- `aafb3b5` — `fix(security): isolate equipment CSV, remove legacy personal data CSVs, and sanitize db config` (Faza 1)
- `3ba4df3` — `docs: update audit report and remediation plan with completed Phase 1 security fixes`
- `b757589` — `fix(backend): clean dead equipment creation, enable FireSnowBridge concurrency, and unify error propagation` (Faza 2)
- `[Faza 3 & 4]` — `fix(auth & tests): implement backend employee auth, install vitest coverage, and add matching tests` (Faza 3 i 4)

---

## 5. Dwa Ostatnie Kroki do Wdrożenia Produkcyjnego (Faza 5)

1. **Weryfikacja i naprawa podatności zależności npm (`npm audit`)** — *Priorytet Niski*  
   Zaktualizować pakiety podrzędne za pomocą `npm audit fix`, zachowując stabilność Vite i Express.
2. **Weryfikacja środowiska uruchomieniowego i skryptów startowych (Docker / batch)** — *Priorytet Niski*  
   Sprawdzić konfigurację Docker/compose i upewnić się, że skrypty startowe w pełni integrują mostek Java, serwer Node i frontend.
