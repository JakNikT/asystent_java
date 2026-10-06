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
- **Lokalizacja:** [src/components/dashboard/hooks/useEmployeeAuth.ts:6](file:///c:/Users/narty/Desktop/asystent_java/src/components/dashboard/hooks/useEmployeeAuth.ts#L6)
- **Problem:** Hasło autoryzacji personelu jest zdefiniowane jako stała w kodzie TypeScript po stronie klienta (`const EMPLOYEE_PASSWORD = "0000";`). Po zbudowaniu aplikacji wartość ta jest jawnie widoczna w paczce JavaScript `dist/assets/*.js`.
- **Dowód:** Każdy użytkownik otwierający aplikację może wpisać `0000` i uzyskać dostęp do panelu edycji nart, widoku rezerwacji ze wszystkimi danymi klientów oraz cenami. Dodatkowo backend nie wymaga żadnego tokenu ani nagłówka autoryzacyjnego przy wywołaniach API (`POST /api/equipment`, `PUT /api/equipment/:id`).
- **Zalecana poprawka:** Przenieść uwierzytelnianie na backend: endpoint `/api/auth/login` weryfikujący hash hasła i zwracający bezpieczne ciasteczko sesyjne `HttpOnly` lub token JWT. Endpointy modyfikacji sprzętu i podglądu rezerwacji zabezpieczyć middleware sprawdzającym uprawnienia.
- **Status:** ⚠️ Wymaga implementacji sesji/tokenów.

#### [WYS-02] Jednowątkowość i brak kontroli dostępu w procesie Java FireSnowBridge
- **Lokalizacja:** [FireSnowBridge/src/FireSnowBridge.java:1317, 1330](file:///c:/Users/narty/Desktop/asystent_java/FireSnowBridge/src/FireSnowBridge.java#L1317-L1330)
- **Problem:** 
  1. Serwer HTTP wbudowany w FireSnowBridge uruchamiany jest z domyślnym jednowątkowym egzekutorem (`server.setExecutor(null);`). Wszelkie dłuższe zapytania SQL lub operacje odczytu dyskowego blokują całą obsługę API mostka.
  2. Serwer nasłuchuje na wszystkich interfejsach sieciowych (`0.0.0.0`), a nagłówek CORS w wierszu 1374 ustawiono na wildcard `*`, co pozwala dowolnej maszynie w sieci lokalnej na nieautoryzowany odczyt danych FireSnow na porcie 8081.
- **Dowód:**
  ```java
  HttpServer server = HttpServer.create(new InetSocketAddress(API_PORT), 0);
  server.setExecutor(null); // Jednowątkowa kolejka!
  ```
- **Zalecana poprawka:** 
  1. Zastąpić `null` pulą wątków: `server.setExecutor(Executors.newFixedThreadPool(8));`.
  2. Ograniczyć gniazdo wyłącznie do pętli zwrotnej: `new InetSocketAddress("127.0.0.1", API_PORT)`.
- **Status:** ⚠️ Do wdrożenia w kodzie FireSnowBridge.java.

---

### 🟡 ŚREDNIE (Medium Severity)

#### [SRED-01] Błąd generatora ID sprzętu przy dodawaniu nowych pozycji (Prefix NaN Bug)
- **Lokalizacja:** [src/server/services/equipmentService.ts:78-79](file:///c:/Users/narty/Desktop/asystent_java/src/server/services/equipmentService.ts#L78-L79)
- **Problem:** Metoda `create` wylicza kolejny identyfikator za pomocą:
  ```typescript
  const maxId = Math.max(...skis.map(ski => parseInt(ski.ID) || 0), 0);
  const newId = (maxId + 1).toString();
  ```
- **Dowód:** Identyfikatory sprzętu w systemie mają format alfanumeryczny z prefiksem, np. `N-0001`, `B-0001`. W JavaScript `parseInt('N-0001')` zwraca `NaN`, co z operatorem `|| 0` daje zawsze `0`. Zatem `maxId` wynosi 0, a nowe sztuki otrzymują numery `'1'`, `'2'`, niszcząc konwencję bazy sprzętu.
- **Zalecana poprawka:** Ekstrakcja części numerycznej za pomocą wyrażenia regularnego (np. `ski.ID?.match(/\d+/)`) i zachowanie odpowiedniego prefiksu (`N-` dla nart, `B-` dla butów, `D-` dla desek).
- **Status:** ⚠️ Do wdrożenia w `equipmentService.ts`.

#### [SRED-02] Omijanie centralnego middleware obsługi błędów w kontrolerach Express
- **Lokalizacja:** [src/server/controllers/equipmentController.ts:31](file:///c:/Users/narty/Desktop/asystent_java/src/server/controllers/equipmentController.ts#L31), `reservationController.ts`, `fireSnowController.ts`
- **Problem:** Kontrolery przechwytują błędy w lokalnych blokach `try...catch` i bezpośrednio odpowiadają kodem `res.status(500).json(...)`. Nigdy nie wywołują `next(error)`.
- **Dowód:** Centralny middleware [src/server/middleware/errorHandler.ts](file:///c:/Users/narty/Desktop/asystent_java/src/server/middleware/errorHandler.ts) jest całkowicie omijany. Błędy nie są jednolicie formatowane ani logowane do centralnego loggera Winston.
- **Zalecana poprawka:** Przekazywać błędy do `next(error)` we wszystkich kontrolerach.
- **Status:** ⚠️ Do wdrożenia w kontrolerach serwera.

#### [SRED-03] Monolityczna logika doboru sprzętu bez testów jednostkowych
- **Lokalizacja:** [src/services/skiMatchingServiceV2.ts](file:///c:/Users/narty/Desktop/asystent_java/src/services/skiMatchingServiceV2.ts) (1,967 linii)
- **Problem:** Główny rdzeń biznesowy aplikacji — obliczanie dopasowania nart, wagi parametrów (poziom 40%, waga 25%, wzrost 20%), progi tolerancji i alternatywy — mieści się w jednym monolitycznym pliku i nie posiada ani jednego testu jednostkowego w `src/test/`.
- **Dowód:** W katalogu `src/test/` istnieją jedynie testy parsera CSV, formatowania dat i mapera grup. Każda modyfikacja wag lub progów tolerancji w `skiMatchingServiceV2.ts` niesie ryzyko niezauważonej regresji.
- **Zalecana poprawka:** Napisać zestaw testów jednostkowych w Vitest weryfikujących poprawność punktacji i rekomendacji.
- **Status:** ⚠️ Wymaga stworzenia zestawu testów.

#### [SRED-04] Błąd skryptu `test:coverage` z powodu braku pakietu `@vitest/coverage-v8`
- **Lokalizacja:** [package.json:28](file:///c:/Users/narty/Desktop/asystent_java/package.json#L28)
- **Problem:** Uruchomienie `npm run test:coverage` kończy się natychmiastowym błędem z powodu braku zależności `@vitest/coverage-v8`.
- **Dowód:**
  ```text
  Error: Failed to load provider "@vitest/coverage-v8"
  ```
- **Zalecana poprawka:** Zainstalować `@vitest/coverage-v8` jako devDependency: `npm install -D @vitest/coverage-v8`.
- **Status:** ⚠️ Wymaga instalacji pakietu npm.

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

---

## 4. Dziennik Wykonanych Zmian (Changelog Gałęzi `audit/cleanup`)

Na dedykowanej gałęzi `audit/cleanup` wykonano 5 atomowych commitów:

- `7888af7` — `fix(core): resolve React Rules of Hooks violations and dead code in Dashboard, Modal, Timeline`
- `0796ec1` — `refactor(components): hoist loggers and helper functions to module scope to avoid re-instantiation`
- `2ee5422` — `chore: remove dead backup/scratch files and untrack .vite cache directory`
- `8d473a4` — `fix(types): resolve any assertions and eliminate all ESLint errors`
- `aafb3b5` — `fix(security): isolate equipment CSV, remove legacy personal data CSVs, and sanitize db config`

---

## 5. Pięć Najważniejszych Kolejnych Kroków

1. **Izolacja danych klientów (RODO / CSV Data Isolation)** — *Nakład: S (1-2h)*  
   Przenieść pliki z `public/data/` do prywatnego katalogu serwera, uniemożliwiając ich pobieranie jako statycznych assetów.
2. **Wdrożenie bezpiecznej autoryzacji pracownika na backendzie** — *Nakład: M (4-6h)*  
   Usunąć PIN `0000` z frontendu, dodać endpoint `/api/auth/login` i zabezpieczyć trasy mutujące sprzęt.
3. **Poprawka generatora ID w `equipmentService.ts`** — *Nakład: S (30min)*  
   Wdrożyć parsowanie części numerycznej ID z zachowaniem prefiksu alfanumerycznego.
4. **Wielowątkowość w FireSnowBridge (`FireSnowBridge.java`)** — *Nakład: S (1h)*  
   Skonfigurować pulę wątków egzekutora i ograniczyć nasłuch do adresu `127.0.0.1`.
5. **Pokrycie testami serwisu `skiMatchingServiceV2.ts`** — *Nakład: M (4-6h)*  
   Doinstalować `@vitest/coverage-v8` i napisać testy sprawdzające algorytmy doboru i tolerancji.
