# Asystent Nart – plan kolejnych usprawnień

## Context

Ask (PL): przeanalizować strukturę projektu `asystent_java`, kod źródłowy i przygotować plan kolejnych usprawnień. Stan bazowy (zmierzony): `tsc` app + server 0 błędów, `eslint` 0 błędów/2 ostrzeżenia, `vitest run` 102 testy zielone. Dotychczasowe dokumenty (`RAPORT_AUDYTU.md`, `PLAN_NAPRAWY_BLEDOW.md`) deklarują "wszystko naprawione", ale kod temu przeczy: dane klientów są w git i dostępne bez auth, secret/PIN mają zahardkodowane fallbacki, warstwa dostępności w UI "fail-open", w repo leży ~3 000 linii martwego kodu, a most Java ma wyścig przy przeładowaniu bazy. Plan zamyka te luki w kolejności: higiena repo/PII → backend → frontend → martwy kod → most Java → DX/CI.

Decyzje użytkownika (wiążące):
- Zrzut bazy FireSnow i historyczne dane klientów: **untrack + purge historii** (`git filter-repo`); force-push wykonuje użytkownik, plan NIE pushuje.
- Sprzątanie: usuń martwy kod/skrypty/zbędne `.bat`; stare dokumenty z roota → `docs/archive/` (nie kasować).
- Dane klientów w API: auth na `/wypozyczenia/*`, `/historia/*`, `POST /firesnow/refresh`; `/dostepnosc/okres` bez nazwisk dla niezalogowanych (kolory dostępności w trybie klienta działają dalej).

Kolejność faz jest obowiązkowa: Faza 0 PIERWSZA (przepisanie historii przy czystym drzewie); Faza 1 przed 2 (frontend zależy od nowych kontraktów auth); Faza 3 po 2 (te same pliki); Fazy 4 i 5 niezależne od 1–3.

## Approach

### Faza 0 – Higiena repo i PII (git, bez zmian w kodzie aplikacji)

**0.1 Untrack plików, które nie powinny być w git** (jeden commit `chore(repo): untrack PII dump, binaries, scratch files`):
- `git rm --cached` (pliki zostają na dysku): `FireSnowBridge/lib/FireSport_database_4.script`, `FireSnowBridge/lib/FireSport_database_4.properties`, `FireSnowBridge/FireSnowBridge.jar`, `FireSnowBridge/*.class` (5 plików w rootcie), `FireSnowBridge/bin/*.class` (9), `logs/.*-audit.json` (2), `.cursor/scratchpad.md`, `.gemini/scratchpad.md`. `lib/hsqldb.jar` zostaje śledzony (jest potrzebny do builda).
- `.gitignore`: usuń linie 79–80 (`hsqldb.jar - jest potrzebny!` – śmieciowy wzorzec; `!FireSnowBridge/lib/hsqldb.jar` – zbędny, bo `*.jar` dotyczy tylko `FireSnowBridge/*.jar`). Dodaj `.cursor/` i `.gemini/`.
- Usuń z dysku `.cursor/scratchpad.md`, `.gemini/scratchpad.md` (`git rm` zamiast `--cached` dla nich).

**0.2 Purge historii** (po commicie z 0.1, drzewo czyste):
1. Backup: `git clone --mirror . ../asystent_java-backup.git`.
2. `pip install git-filter-repo` (Python 3.14 jest dostępny; `git filter-repo` nie jest zainstalowany).
3. Plik z listą ścieżek `../purge-paths.txt` (jedna ścieżka na linię, literalnie): `FireSnowBridge/lib/FireSport_database_4.script`, `FireSnowBridge/lib/FireSport_database_4.properties`, `db-config.js`, `public/data/rezerwacja.csv`, `public/data/wyp.csv`, `public/data/rez.csv`, `public/data/reezerwacja.csv`, `public/data/data_base.csv`, `data/csv/rez.csv`, `data/excel/rez.xlsx`. (To są pliki z danymi klientów / hasłem znalezione w `git log --all --diff-filter=D`; CSV-y ze sprzętem – `NOWA_BAZA*`, `NOWABAZA*`, `sprzet.csv`, `nartyvip.csv` – zostają.)
4. `git filter-repo --force --invert-paths --paths-from-file ../purge-paths.txt` (przepisuje wszystkie refy: `main`, `calendar`, `audit/cleanup`, `podział_server` i zdalne `origin/*`).
5. filter-repo usuwa remote `origin` → `git remote add origin https://github.com/JakNikT/asystent_java.git`.
6. `git reflog expire --expire=now --all && git gc --prune=now --aggressive`.
7. NIE wykonuj `git push`. W podsumowaniu końcowym podaj użytkownikowi komendy: `git push --force --all origin` oraz `git push --force --tags origin`, ostrzeżenie że hashe commitów się zmieniły (każdy inny klon trzeba sklonować od nowa) oraz że GitHub może trzymać stare obiekty w cache/forkach – zalecić Support GitHub "remove sensitive data" i ocenę obowiązku zgłoszenia naruszenia RODO.

### Faza 1 – Backend: kontrola dostępu, sekrety, odporność (`src/server`, `server.ts`)

Kolejność w fazie: 1.1 → 1.2 → 1.3 → 1.4 → reszta dowolnie.

**1.1 Wymagane sekrety, brak fallbacków** – `src/server/config/env.ts`:
- `requiredEnvVars = ['DB_PASSWORD', 'EMPLOYEE_PIN', 'AUTH_SECRET']`.
- Po sprawdzeniu brakujących, dodatkowa walidacja z tym samym wzorcem `console.error` + `process.exit(1)`: `EMPLOYEE_PIN` musi pasować do `/^\d{4,12}$/` i być różny od `0000`; `AUTH_SECRET` musi mieć ≥ 32 znaki i NIE równać się `firesnow-asystent-jwt-secret-key-2026` ani `change-me`.
- `config.auth` = `{ employeePin: process.env.EMPLOYEE_PIN!, secret: process.env.AUTH_SECRET! }` (usuń `|| '0000'` i `|| 'firesnow-…'`).
- Popraw komunikat: `Skopiuj plik env.example do .env` (plik nazywa się `env.example`). Usuń zduplikowany `.env.example` (rozjeżdża się z `env.example`).
- `env.example`: ustaw `EMPLOYEE_PIN=` i `AUTH_SECRET=` bez wartości; w komentarzach usuń "domyślnie 0000" i dodaj `# AUTH_SECRET: wygeneruj: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- Lokalny `.env` (gitignored; dziś NIE zawiera tych kluczy, więc serwer po zmianie nie wystartuje): dopisz `AUTH_SECRET=<64 hex z crypto.randomBytes(32)>` i `EMPLOYEE_PIN=<losowe 6 cyfr, pierwsza ≠ 0>`; wartość PIN-u podaj użytkownikowi w podsumowaniu (zmieni się względem dotychczasowego `0000`).
- `vitest.config.ts` → `test.env = { DB_PASSWORD: 'test', EMPLOYEE_PIN: '482913', AUTH_SECRET: 'x'.repeat(40) }` (bo `authUtils.ts` importuje `config/env.ts`, które kończy proces przy braku zmiennych – testy muszą działać bez `.env`, np. w CI).

**1.2 Auth na endpointach z danymi klientów:**
- `src/server/routes/history.ts` i `src/server/routes/rentals.ts`: `router.use(requireEmployeeAuth);` na początku (wzorzec identyczny jak w `routes/reservations.ts:12`).
- `src/server/routes/firesnow.ts`: `router.post('/refresh', requireEmployeeAuth, fireSnowController.refreshCache)`; `/status` zostaje publiczny.
- `fireSnowController.checkHealth`: odpowiedź tylko `{ status: 'online' }` lub `{ status: 'error' }` (usuń `api_url`, `api_response`, `err.message`; błąd zaloguj `logger.warn`).
- Frontend – dołącz `AuthService.getAuthHeaders()` (docelowo przez `AuthService.fetch` z 2.1) do: `reservationApiClient.ts:103` (`/wypozyczenia/aktualne`), `:262` (`/wypozyczenia/przeszle`), `historyService.ts:74,102,144` (3× `/historia/*`), `ReservationsView.tsx:411,440` (`POST /api/firesnow/refresh`).

**1.3 `/dostepnosc/okres` bez nazwisk dla niezalogowanych:**
- `authMiddleware.ts`: dodaj `export function optionalEmployeeAuth(req, _res, next)` – jeśli nagłówek `Authorization: Bearer <t>` ma ważny token (`verifySessionToken`), ustaw `req.isEmployee = true`; w każdym innym przypadku `false`; NIGDY nie zwraca 401. Rozszerz `AppRequest` w `types/express.types.ts` o `isEmployee?: boolean` (zamiast rzutowania jak przy `user` w `requireEmployeeAuth`).
- `routes/index.ts:26`: `router.get('/dostepnosc/okres', optionalEmployeeAuth, fireSnowController.getAvailability);` i usuń komentarz "Special route from server.ts".
- `fireSnowController.getAvailability`: gdy `!req.isEmployee`, przed `res.json` usuń pole `klient` z każdego elementu tablic `reservations` i `rentals` odpowiedzi (kształt `{reservations: [...], rentals: [...]}`; zachowaj resztę pól). Nie mutuj obiektu z serwisu – mapuj do kopii.
- Frontend: `reservationApiClient.loadAvailabilityForPeriod` wysyła nagłówki auth (zalogowany pracownik dostaje `klient`). `BrowseSkisComponent.tsx:439-440` – linię `Klient: …` w tooltipie renderuj tylko gdy `klient` niepusty (dla gościa pole jest puste). `DashboardHeader.tsx`: nowy prop `isEmployeeMode: boolean` (przekaż z `Dashboard.tsx`); `onClick` logo otwiera modal tylko gdy `isEmployeeMode`, `cursor-pointer`/`title` tylko wtedy; `ConflictCheckerModal` renderuj warunkowo `isEmployeeMode && isConflictModalOpen`.

**1.4 Limit prób logowania** – nowy plik `src/server/middleware/loginRateLimit.ts` (brak zależności; `express-rate-limit` nie jest potrzebny):
- Stan: `Map<string, { count: number; resetAt: number }>`; stałe `MAX_FAILED = 5`, `WINDOW_MS = 15*60*1000`.
- Eksporty: `loginRateLimit(req,res,next)` – jeśli wpis dla `req.ip` istnieje, `resetAt > now` i `count >= MAX_FAILED` → `429 { success:false, error:'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.' }` + nagłówek `Retry-After` (sekundy); `recordFailedLogin(ip)`; `clearFailedLogins(ip)`. Czyszczenie wygasłych wpisów: `setInterval(..., WINDOW_MS).unref()`.
- `routes/auth.ts`: `router.post('/login', loginRateLimit, authController.login)`. `authController.login`: `recordFailedLogin(req.ip)` przy 401, `clearFailedLogins(req.ip)` przy sukcesie. `req.ip` może być `undefined` → użyj `req.ip ?? 'unknown'`.

**1.5 `errorHandler.ts`** (`src/server/middleware/errorHandler.ts`):
- `logContext` (≈L218-228): usuń `body` i `query` (PIN w `/auth/login`, nazwiska w `/historia/klienci/wyszukaj`); zostaw `params`.
- `getUserFriendlyMessage` (L60-86): dla `statusCode >= 500` zwracaj wyłącznie `error.userMessage` albo domyślny komunikat ze `switch` (nie `error.message`). Dla 4xx bez zmian.
- `isDatabaseError` (L91-106): zastąp heurystykę po podciągach (`sql`, `db`, `connection`, `timeout`) warunkiem: `typeof err.code === 'string' && (err.code.startsWith('ER_') || err.code.startsWith('PROTOCOL_'))` lub `err.sqlState !== undefined` (sygnatura błędów `mysql2`).
- Ujednolicenie kształtu błędu: kontrolery zwracają dziś `{ error: '…' }` (`authController`, `authMiddleware`), handler `{ success:false, error:{message,code} }`. Zostaw bez zmian kształt `authController`/`authMiddleware` (frontend `authService.ts` i `apiErrorHandler.ts` parsują oba) – NIE wprowadzaj trzeciego formatu.

**1.6 `app.ts`:**
- Usuń `app.use(cors())`, import `cors` i zależności `cors`, `@types/cors` (frontend woła API przez proxy Vite / ten sam origin w produkcji; jedyny bezpośredni cross-origin to `EquipmentHandoutView.tsx:12` – naprawiany w 2.6).
- `app.disable('x-powered-by')`; `express.json({ limit: '100kb' })`.
- `routes/index.ts` na końcu: `router.use((_req, res) => res.status(404).json({ success:false, error:{ message:'Nie znaleziono zasobu', code:'NOT_FOUND' } }))` (użyj stałej z `ERROR_CODES` w `errorHandler.ts`, jeśli jest eksportowana – `grep ERROR_CODES`).
- Catch-all SPA (L31): `app.get('/{*splat}', …)` (składnia Express 5/path-to-regexp 8; `'*'` jest tu niepoprawne) zamiast nieograniczonego `app.use`.

**1.7 Martwa ścieżka zapisu rezerwacji (CSV)** – potwierdzone grepem: `ReservationApiClient.createReservation/updateReservation/deleteReservation` nie mają żadnych wywołań; serwer zapisuje do CSV, a czyta z FireSnow, więc POST zwraca sukces dla danych, których GET nigdy nie zwróci:
- Usuń trasy `POST /`, `PUT /:id`, `DELETE /:id` z `routes/reservations.ts` i metody `create/update/delete` z `reservationController.ts`; zostaw `GET /date`, `GET /`.
- `reservationService.ts`: usuń `create/update/delete` (L136-185) i całą gałąź CSV w `getAll/getForDate` (L127-183); gdy `!config.useFireSnowApi` → `logger.warn` + `return []` (wzorzec z `equipmentService.getAll` L139-142; nie wprowadzaj trzeciego zachowania). Analogicznie `rentalService.ts` (fallback CSV ≈L128).
- Usuń `csvService.ts`, `src/server/utils/csvParser.ts` + test `src/test/csvParser.test.js`, `config.paths` z `env.ts`, linie bannera CSV w `server.ts:23-26`, typy/komentarze CSV w `types/services.types.ts` jeśli osierocone (`grep -ri csv src/server`). Wyczyść `.gitignore` (`data/rezerwacja.csv`, `data/wyp.csv`, `data/*.tmp.csv`).
- Frontend: usuń trzy metody z `reservationApiClient.ts` (≈L416-510).
- Martwe typy serwera: usuń `src/server/types/api.types.ts`, nieużywane `AppMiddleware`/`AppRouteHandler` (`express.types.ts`), `DBConnectionSingle`/`QueryResultHeader`/`QueryResultWithInfo` (`database.types.ts`), `logger.logInfo/logError/logWarn/logDebug` (`config/logger.ts:61-83`) – każdą po potwierdzeniu 0 referencji (`xd://lsp` references). `config/logger.ts:51`: użyj `config.logDir` zamiast stałego `'logs/error-%DATE%.log'`.

**1.8 `equipmentService.ts` – nadpisania zamrażały dane FireSnow:**
- Dziś `update` (L183-256) zapisuje wszystkie 13 pól (bieżące wartości z FireSnow + edycja), więc edycja jednego pola na stałe przypina `marka/model/dlugosc` itd., a `applyOverride` ignoruje późniejsze zmiany w FireSnow.
- Nowe zachowanie: INSERT … ON DUPLICATE KEY UPDATE zawiera tylko kolumny `id`, `kod` oraz te pola `UpdateEquipmentData`, które są `!== undefined` w `data` (mapowanie pole→kolumna jak w istniejącym SQL: `WZROST_MIN→wzrost_min`, … `DLUGOSC→dlugosc`; budowane z jawnej białej listy, nigdy z kluczy żądania). `kod` = `data.KOD ?? current.KOD ?? null`.
- Dopasowanie sprzętu wyłącznie po `s.ID === id` (usuń `|| (data.KOD && s.KOD === data.KOD)` – L186; może trafić inną sztukę). Zweryfikuj `grep -n "skis/" src/services/skiDataService.ts`: oba wywołania wysyłają ID.
- `getAll()` połyka błędy FireSnow i zwraca `[]` (L173-177) → przy awarii edycja kończy się 404. Wydziel prywatne `fetchMergedEquipment()` (obecna treść `try`, rzuca); `getAll()` = `try { return await fetchMergedEquipment() } catch { log; return [] }` (bez zmiany dla GET); `update/bulkUpdate` używają wersji rzucającej → błąd trafia do `next(error)` (500 z generycznym komunikatem).
- `bulkUpdate` (L261-278): jedno `fetchMergedEquipment()` na wywołanie, potem pętla po ID wywołująca wewnętrzne `applyUpdate(current, data)` (wydzielone z `update`); `update(id,data)` = fetch + `applyUpdate`. Sygnatury publiczne bez zmian.
- `ensureTableExists` (L54-84): po niepowodzeniu nie próbuj ponownie częściej niż co 60 s (`lastInitAttempt` timestamp); nie loguj `warn` przy każdym `GET /skis`.
- Walidacja wejścia w `equipmentController.update/bulkUpdate`: `req.body` musi być obiektem, a `bulkUpdate` wymaga `Array.isArray(ids)` z elementami `string` i obiektu `updates`; w przeciwnym razie `res.status(400).json({ error: 'Nieprawidłowe dane wejściowe' })`. Wartości tekstowe > 255 znaków (kolumna `atuty`) → 400. Wartości liczbowe pól `WZROST_*`, `WAGA_*`, `DLUGOSC` muszą być `number` lub `null`.

**1.9 Cykl życia procesu** – `server.ts`: zachowaj zwrócony `Server`; `server.on('error', e => { logger.error(...); process.exit(1) })` (EADDRINUSE); `SIGINT`/`SIGTERM` → `server.close()` → `pool.end()` obu pul (dodaj `export async function closeDBPools()` w `config/database.ts`, który kończy istniejące pule i zeruje zmienne) → `process.exit(0)`, z zabezpieczeniem `setTimeout(() => process.exit(1), 10000).unref()`; `process.on('unhandledRejection', …)` i `uncaughtException` logują błąd przez `logger.error` (po `uncaughtException` – `process.exit(1)`).

**1.10 Skrypty** (`package.json`): usuń `build:server`, `server:js` (wskazuje nieistniejący `server.js`; wynik kompilacji trafiał do `dist/server/src/server/...` i rozjeżdżał `rootDir` w `app.ts:15`/`env.ts:16`); produkcja = `tsx server.ts`. Dodaj `"start": "tsx server.ts"`, `"typecheck": "tsc -b && tsc -p tsconfig.server.json --noEmit"`, zmień `"test": "vitest run"` i dodaj `"test:watch": "vitest"`. `tsconfig.app.json`: dodaj `"exclude": ["src/server"]` (kod serwera sprawdza `tsconfig.server.json`, nie ustawienia DOM/vite).

### Faza 2 – Frontend: poprawność dostępności i sesji

**2.1 Centralna obsługa 401** – `src/services/authService.ts`: `static async fetch(input: string, init: RequestInit = {}): Promise<Response>` – scala `AuthService.getAuthHeaders()` z `init.headers`; jeśli odpowiedź ma status 401 ORAZ token istniał → `removeToken()` i `window.dispatchEvent(new Event('auth:expired'))`. Zamień nim wszystkie wywołania do endpointów chronionych: `reservationApiClient.ts` (rezerwacje, wypożyczenia, `przeszle`, `dostepnosc/okres`), `historyService.ts` (3×), `EquipmentHandoutView.tsx:183`, `ReservationsView.tsx:411,440`, `skiDataService.ts:106,145`. `login` i `logout` zostają na gołym `fetch` (login 401 ≠ wygaśnięcie sesji).
- `useEmployeeAuth.ts`: `useEffect` nasłuchujący `auth:expired` → `setIsEmployeeMode(false)`, `clearHandoutState()` (patrz 2.2), `setAppMode('search')` gdy `appMode` ∈ {`reservations`,`history`} (hook potrzebuje `appMode`/`setAppMode` – przekaż jako argumenty `useEmployeeAuth(appMode, setAppMode)`; zaktualizuj jedyne wywołanie w `useDashboardState.ts:131-139`; przesuń deklarację `appMode` przed wywołanie hooka).

**2.2 Gating UI** –
- `EmployeeControls.tsx`: używaj `isEmployeeMode` (usuń `_isEmployeeMode`); przyciski "Historia" i "Wydania" renderuj tylko gdy `true`.
- `useEmployeeAuth.handleToggleEmployeeMode` (wylogowanie): `setAppMode('search')` gdy `appMode` ∈ {`reservations`,`history`} (dziś tylko `reservations`); wywołaj `clearHandoutState()` – wyczyść zapisany `HandoutState` (`selectedClient`) w `utils/localStorage.ts` (L243-249) przez istniejące `saveAppState`/odpowiednik; jeśli brak funkcji kasującej sam fragment, dodaj `clearHandoutState()` w `localStorage.ts`.
- `useDashboardState.ts:154`: przywrócony z localStorage `appMode` ∈ {`reservations`,`history`} zamień na `'search'` (sesja pracownika jest weryfikowana asynchronicznie po starcie).

**2.3 Dostępność – poprawność logiki** (`reservationApiClient.ts`; nowy plik `src/utils/availability.ts`):
- Nowy `availability.ts` eksportuje: `SERVICE_BUFFER_DAYS = 2`, `DEFAULT_RENTAL_DAYS = 30` (przeniesione z `reservationApiClient.ts:17-19`), `calendarDayNumber(d: Date): number = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)` (lokalny dzień kalendarzowy, odporny na DST), `dayGap(from: Date, to: Date): number = calendarDayNumber(to) - calendarDayNumber(from)`. Usuń trzy kopie pomocnika różnicy dni (`reservationApiClient.ts:666-671`, `conflictDetector.ts:11-17`, `reservationService.ts:385` – ta ostatnia znika w Fazie 3) i `diffDays` z `dateParts.ts`, jeśli bez innych wywołań (xd://lsp references).
- `getSkiAvailabilityStatus` (L337-381): czerwony gdy `calendarDayNumber(resStart) <= calendarDayNumber(userDateTo) && calendarDayNumber(resEnd) >= calendarDayNumber(userDateFrom)` (porównanie na dniach, nie na timestampach – dziś rezerwacja zaczynająca się o 11:00 w ostatnim dniu użytkownika jest zielona, bo `userDateTo` to UTC-północ z `new Date("YYYY-MM-DD")`). Żółty: `gapBefore = dayGap(resEnd, userFrom)`, `gapAfter = dayGap(userTo, resStart)`; żółty gdy `1 <= gap <= SERVICE_BUFFER_DAYS` (progi jak dotąd; 3+ = zielony).
- `loadAvailabilityForPeriod` (L168-238): usuń `catch → toast + return []` – niech rzuca (błąd z `parseApiError`); formatuj daty wypożyczeń `od`/`do` przez `dateToISO(new Date(ms))` z `utils/dateParts.ts:41` (dziś `toISOString()` = data UTC, może być o dzień wcześniejsza); domyślny koniec aktywnego wypożyczenia: `dateToISO(new Date(Date.now() + DEFAULT_RENTAL_DAYS * 86400000))`.
- `BrowseSkisComponent.loadAvailabilityStatuses` (L225-313): w `catch` NIE nadpisuj `availabilityStatuses` (zostaje poprzedni stan), ustaw `availabilityError = true` (nowy `useState<boolean>`) i pokaż toast tylko przy przejściu `false→true`; sukces ustawia `false`. Gdy `availabilityError`, nad tabelą wyświetl baner: `Nie udało się pobrać dostępności – kolory mogą być nieaktualne.`
- `ConflictCheckerModal` (L67-85) już ma `try/catch` – po zmianie dostanie wyjątek zamiast `[]` i pokaże `setError(...)`; bez zmian logiki.
- `conflictDetector.ts:115`: warunek `przerwaDni < 2` → `przerwaDni <= SERVICE_BUFFER_DAYS` (import z `availability.ts`), liczone przez `dayGap`; zaktualizuj tekst "min. 2 dni" w `ConflictCheckerModal.tsx` (≈L303) na `Bufor serwisowy: ${SERVICE_BUFFER_DAYS} dni`.

**2.4 Pętla odświeżania w Przeglądaj:**
- `Dashboard.tsx:140-147`: obiekt `browseCriteria` zbuduj w `useMemo` z zależnościami prymitywnymi `[formData.height.value, formData.weight.value, formData.level, formData.gender, formData.dateFrom, formData.dateTo]` (nowe `Date` z `parseDate` co render powodowały nową tożsamość `loadAvailabilityStatuses` i refetch przy każdym znaku).
- `BrowseSkisComponent.tsx`: zależności `useCallback`/`useEffect` (L313, L332, effect kolorów L342-362) oprzyj na `const dateFromMs = browseCriteria?.dateFrom?.getTime(); const dateToMs = browseCriteria?.dateTo?.getTime();` zamiast na obiektach `Date`. W `loadAvailabilityStatuses` dodaj `const requestIdRef = useRef(0)`: `const myId = ++requestIdRef.current;` na starcie, i przed każdym `setAvailabilityStatuses/setLastRefreshTime/setAvailabilityError` `if (myId !== requestIdRef.current) return;`.
- Predykat „te same narty modelu" używany przy L368, L561, L1649 (`allSkis.filter(...)` na wiersz) wydziel do `getModelGroupKey(ski)` (klucz z tych samych pól, których dziś używa filtr – odczytaj go z kodu) i zbuduj raz `const skisByModel = useMemo(() => Map<string, SkiData[]>, [allSkis])`; w wierszach użyj `skisByModel.get(key)`.

**2.5 Błędy stanu:**
- `useTabsState.ts:73,117` – `newId = (tabs.length + 1).toString()` daje duplikaty po usunięciu karty. Dodaj `const nextTabId = useRef(2)`; `newId = String(nextTabId.current++)`; etykieta `Osoba ${newId}`. `removeTab` (L120-130): oblicz `const filtered = tabs.filter(...)`, następnie `setTabs(filtered); if (tabId === activeTabId) setActiveTabId(filtered[0].id);` (bez `setActiveTabId` wewnątrz updatera `setTabs` – nieczyste w StrictMode).
- `useDashboardState.ts:247-255` `handleBrowseCriteriaChange`: `criteria` jest pełnym zestawem (`{...browseCriteria}` z nadpisanym polem, `BrowseSkisComponent.tsx:520-532`), więc `undefined` = pole wyczyszczone. Zamień `criteria.wzrost?.toString() || prev.height.value` na `criteria.wzrost !== undefined ? String(criteria.wzrost) : ''` (analogicznie `waga`, `poziom`; `gender: criteria.plec ? criteria.plec.toUpperCase() : ''`).

**2.6 Pozostałe poprawki:**
- `EquipmentHandoutView.tsx:12`: `API_BASE_URL = '/api'` (usuń `VITE_API_URL || 'http://localhost:5001/api'`); fetch z L183 w `useEffect` z flagą `let cancelled = false` (cleanup ustawia `true`; po `await` `if (cancelled) return;`) – odrzuca spóźnioną odpowiedź.
- `BrowseSkisComponent.tsx:336`: napraw uszkodzony znak (`'�� Ręczne…'` → `'🔄 Ręczne odświeżanie dostępności...'`).
- `index.html`: `<html lang="pl">`, `<title>Asystent Doboru Nart</title>`.
- `PasswordModal.tsx`: `role="dialog" aria-modal="true" aria-labelledby`, `<label>` (`htmlFor`) dla pola hasła, zamykanie klawiszem Escape. (Trzy osobne implementacje modali zostawiamy – konsolidacja poza zakresem.)

### Faza 3 – Martwy kod frontendu i zależności

Zasada dla każdego usunięcia: przed skasowaniem `grep`/`xd://lsp` references = 0 poza plikami kasowanymi; po każdej grupie `npx tsc -b` + `npx eslint .`.

**3.1 Pliki do usunięcia** (zweryfikowane grepem jako osierocone/użyte tylko przez siebie nawzajem): `src/services/skiMatchingService.ts` (V1, 876 linii), `src/components/dashboard/SearchResults.tsx`, `DetailedCompatibility.tsx`, `MatchIndicators.tsx`, `StyleFilterPanel.tsx`, `SkiStyleBadge.tsx`, `ui/Badge.tsx`, `ui/Card.tsx`, `ui/Select.tsx` (każdy sprawdź grepem osobno), `src/assets/react.svg`, `src/utils/csvParser.ts`.

**3.2 `reservationService.ts` (frontend, 588 linii)** – żyją tylko typy `ReservationData`, `ReservationInfo`, `AvailabilityInfo`. Przenieś je do nowego `src/types/reservation.types.ts` (bez zmiany pól), zmień importy w: `ConflictCheckerModal.tsx:11`, `EquipmentHandoutView.tsx:2`, `ReservationsView.tsx:3`, `reservationApiClient.ts:9`, `types/conflict.types.ts:3`, `utils/conflictDetector.ts:4`, `DetailedCompatibility.tsx:8` (kasowany), i skasuj klasę wraz z `fetch('/data/rezerwacja.csv')`. Skonsoliduj trzy różne `AvailabilityInfo`/`AvailabilityStatus` (`types/ski.types.ts`, nowy plik, `BrowseSkisComponent.tsx:59`) – zostaw wersję 3-kolorową z `reservationService` jako jedyną, jeśli `BrowseSkisComponent` używa jej pól; w przeciwnym razie zostaw lokalną string-ową i zmień jej nazwę na `BrowseAvailabilityStatus`.

**3.3 Martwe fragmenty hooków i silnika dopasowania:**
- `useSearchLogic.ts` / `useDashboardState.ts`: usuń `handleSubmit`, `handleSubmitWithStyles`, `handleStyleToggle`, `filterSearchResults`, `groupMatchesByModel`, `suggestions`/`setSuggestions` oraz `filteredSearchResults`/`groupedResults` (L371-376 liczone przy każdym renderze) z zwracanych typów i implementacji – po usunięciu `SearchResults.tsx` nikt ich nie czyta. Zostaw wszystko, co wywołuje `Dashboard.tsx` (kompilator wskaże).
- `skiMatchingServiceV2.ts`: usuń metody bez wywołań zewnętrznych po 3.1: `generateSuggestions*`, `generate*Explanation`, `generateDetailedCompatibilityInfo`, `checkAvailability`, `isSkiReserved`, `getReservationInfo` oraz osierocone typy z `types/ski.types.ts` (`DetailedCompatibilityInfo` itd.). Zachowaj: `findMatchingSkis`, `sortAllResultsByAvailabilityAndCompatibility`, `getMatchDetails` i wszystko, co one wywołują. `src/test/skiMatchingServiceV2.test.ts` musi pozostać zielony bez zmian.
- `utils/localStorage.ts`: usuń `saveUserSession/loadUserSession/clearUserSession`, `loadSearchHistory/clearSearchHistory`, `saveAllTabs/loadAllTabs/clearAllTabs`; usuń też zapis `saveSearchHistory` (wywołanie w `useSearchLogic.ts:6`; dane nigdzie nieczytane) razem z jego definicją. `utils/formValidation.ts`: usuń `validateDay/Month/Year/Date/DayFinal/MonthFinal` bez wywołań.
- `ConflictCheckerModal.tsx`: usuń `generateTestData`, `handleTestData` i przycisk danych testowych (≈L100-270); domyślne daty przez `dateToISO` (L27,34 używają `toISOString().split('T')[0]` = UTC).
- `DashboardHeader.tsx`: `ConflictCheckerModal` ładuj przez `React.lazy(() => import('../ConflictCheckerModal').then(m => ({ default: m.ConflictCheckerModal })))` + `<Suspense fallback={null}>` (wyciąga `react-calendar-timeline` + moment z głównego bundla).
- `eslint.config.js`: reguła `no-console: ['error', { allow: ['warn', 'error'] }]` dla `src/**` poza `src/utils/logger.ts`, `src/server/**` i `src/test/**`; napraw wszystkie naruszenia zamieniając `console.log` na `createLogger(...)` (`utils/logger.ts`) – dotyczy m.in. `formValidation.ts`, `localStorage.ts`, `conflictDetector.ts`, `ConflictCheckerModal.tsx`, `useDashboardState.ts:165`. `eslint.config.js:9` ignoruj dodatkowo nic (datapicker kasowany w Fazie 5).

**3.4 Zależności i konfiguracja** (`npm uninstall` po potwierdzeniu 0 importów grepem w `src/`, `server.ts`):
- Usuń: `framer-motion`, `jsdom`, `buffer`, `stream-browserify`, `util`, `iconv-lite`, `@types/iconv-lite`, `papaparse`, `@types/papaparse` (po 1.7 i 3.1-3.2 brak użyć), `cors`, `@types/cors` (1.6).
- `vite.config.ts`: usuń aliasy `buffer`/`stream`/`util` (≈L29-33) i `define: { global }` jeśli dotyczy tylko nich (odczytaj plik); `manualChunks` (≈L55): warunek `id.includes('node_modules/react')` → `/node_modules\/(react|react-dom|scheduler)\//.test(id)` (obecny łapie też `react-calendar-timeline`, przez co chunk `timeline` jest nieosiągalny).
- `skiDataService.ts:73-83`: usuń fallback `CSVParser.loadFromPublic()`; `getAllSkis` przy błędzie HTTP rzuca błąd (z `parseApiError`), przy pustej liście zwraca `[]` (bez cache pustego wyniku, jak dotąd `cache.length > 0`). Sprawdź w `Dashboard`/`useDashboardState.loadDatabase`, że `catch` ustawia widoczny błąd (istniejący stan `error`/toast) – jeśli nie, użyj `toastService.showError`.

### Faza 4 – Most Java (`FireSnowBridge/src/FireSnowBridge.java`)

Bridge nie ma testów; każdy punkt weryfikuje smoke test z sekcji Verification.

**4.1 Konfiguracja bez ukrytych domyślnych**: `loadConfig()` (L40-69): brak pliku lub klucza `db.url` → `System.err.println("FireSnowBridge: brak config.properties lub db.url"); System.exit(1);` (usuń domyślne `jdbc:hsqldb:hsql://192.168.8.48:9001/...` z L47 i L62 – LAN-owy IP w kodzie, a `SHUTDOWN` może wtedy zatrzymać prawdziwy serwer HSQLDB). `equipment.groups` walidowane regexem `\d+(,\d+)*` (inaczej exit(1)), bo trafia do SQL konkatenacją (≈L1229). Usuń `db.ttl`/`TTL` (patrz 4.2) z kodu i `config.properties`.

**4.2 Przeładowanie bazy bez ubijania zapytań w locie** – zastąp `synchronized getConnection()` (L130-162) i `shutdownDatabaseIfMounted()`/`closeAllConnections()` (L108-173):
- `private static final ReentrantReadWriteLock dbLock`.
- `static final class DbSession implements AutoCloseable { final Connection connection; … close() { try { connection.close(); } finally { dbLock.readLock().unlock(); } } }`.
- `static DbSession openSession() throws SQLException`: (1) jeśli `reloadNeeded()` → `dbLock.writeLock().lock()` (czeka aż zakończą się wszystkie sesje-czytelnicy), ponownie `if (reloadNeeded()) shutdownDatabaseIfMounted()`, odblokuj; (2) `dbLock.readLock().lock()`; w `try` utwórz `DriverManager.getConnection(...)`, `setReadOnly(true)`, zamontuj jeśli `!isDatabaseMounted` (ustaw `lastDbFilesModified`), zwróć `new DbSession(conn)`; w `catch (SQLException | RuntimeException e)` zwolnij read lock i rzuć dalej. `reloadNeeded()` = `getFileDbBasePath() != null && isDatabaseMounted && getDatabaseFilesLastModified(base) > lastDbFilesModified` (TTL usunięty – reload wyłącznie przy zmianie plików na dysku lub ręcznym `/api/refresh`; dotąd re-parse 34 MB co 30 s ruchu).
- `shutdownDatabaseIfMounted()`: na początku `if (getFileDbBasePath() == null) { isDatabaseMounted = false; return; }` (nigdy `SHUTDOWN` na zdalnym `hsql://`); usuń `System.gc()`.
- Wszystkie 9 handlerów: `try (Connection conn = getConnection())` → `try (DbSession session = openSession()) { Connection conn = session.connection; … }`; `RefreshHandler` wywołuje `reloadNow()` = write lock + `shutdownDatabaseIfMounted()`. `main` (L1349) też przez `openSession()`.

**4.3 Pojedyncze błędy:**
- `AktywneWypozyczeniaHandler` (L624-625): zapisuj `dataDo` (zmienną obliczoną w L616-618), nie `rs.getLong("data_do")`. Przed zmianą `grep -n "data_do" src/server` – jeśli `rentalService.mapFireSnowRental` już sam liczy koniec z `pozostaly_czas`, nie zmieniaj (unikasz podwójnego dodania); wtedy usuń martwe obliczenie z handlera.
- `DostepnoscOkresHandler` (L691-704): parsowanie `from`/`to` PRZED otwarciem sesji; `NumberFormatException` → `400` `{"error":"Nieprawidłowy parametr from/to"}`; `bufferAfter = (dateTo > Long.MAX_VALUE - 172800000L) ? Long.MAX_VALUE : dateTo + 172800000L` (brak `to` dziś przepełnia `long` do wartości ujemnej i zwraca pusty wynik); `parseQuery` (L901-911): `URLDecoder.decode(pair[0|1], UTF_8)`, `split("=", 2)`.
- Wspólny helper `private static void sendJson(HttpExchange ex, int status, String body)` (bajty UTF-8, `Content-Type: application/json; charset=UTF-8`, `sendResponseHeaders`, zamknięcie strumienia) zastępuje ≈9 kopii bloku zapisu odpowiedzi; każdy handler owinięty w `try { … } catch (Exception e) { sendJson(ex, 500, "{\"error\":\"Błąd wewnętrzny\"}"); }` – niezależnie od typu wyjątku klient dostaje poprawny JSON zamiast zerwanego połączenia. `escapeJson` (L926-933): dodaj ucieczkę wszystkich znaków `< 0x20` jako `\u00XX`.
- `RefreshHandler`: tylko `POST` (inna metoda → `405` + `Allow: POST`); banner startowy: `POST /api/refresh`.
- `setCorsHeaders` (L917-921) i obsługa `OPTIONS` (np. L686-689): usuń – Express woła most server-to-server, a `Access-Control-Allow-Origin: *` pozwalał dowolnej stronie w przeglądarce operatora czytać dane klientów z `127.0.0.1:8081`.
- Format znaczników czasu (`Timestamp.toString()`) NIE zmieniamy – parsują go mappery serwera.

**4.4 Build i uruchamianie (Windows, jedyna wspierana platforma stosu):**
- Docelowo Java 21 (portable `FireSnowBridge/jdk` i `start-headless.bat` już na to wskazują; `bin/*.class` mają major 65): `compile.bat:94` → `--release 21`; komentarz nagłówkowy w Javie (L4) i linie "Java 8" w docs mostka – popraw; usuń z `start-headless.bat` fallbacki `jre1.8.0_471` i `C:\FireSoft\FireSnow21\jre`; gdy brak `FireSnowBridge.jar` (L6) wypisz `FireSnowBridge.jar nie istnieje - uruchom: npm run build:bridge` przed `exit /b 1`.
- `package.json`: `"build:bridge": "cd FireSnowBridge && compile.bat"` (jar jest ignorowany przez git, więc świeży klon musi go zbudować). W `compile.bat` zamień końcowe `pause` na `if "%CI%"=="" pause`.
- Usuń z `FireSnowBridge/`: `start.bat`, `start-fixed.bat`, `start_debug.bat`, `start_bez_kompilacji.bat`, `start_from_class.bat`, `start_portable.bat`, `start-with-watchdog.bat`, `start_hsqldb_server.bat`, `compile_portable.bat`, `test_database_structure.bat`, `watchdog.ps1`, `config copy.properties` (watchdog zastąpiony wbudowanym przeładowaniem z 4.2). Zostają `compile.bat`, `start-headless.bat`, `config.properties`. `stop.bat`: `findstr ":5001"` → `findstr /R /C:":5001 .*LISTENING"` (nie zabija procesów na portach typu 50011).

### Faza 5 – Porządki i CI

**5.1 Usunięcia (kod/skrypty):** `scripts/` (cały; operują na nieistniejącym `public/data/*.csv`, duplikaty `.js`/`.cjs`), skrypt npm `convert-firefnow`, `datapicker/` (osierocony scaffold MUI), `db-config.example.js`. `eslint.config.js` globalIgnores bez zmian.

**5.2 Dokumenty → `docs/archive/`** (`git mv`): z roota `README+.md`, `REVIEW_APLIKACJI.md`, `REVIEW_2025-12-15.md`, `PODSUMOWANIE_POPRAWEK.md`, `implementation_plan.md`, `RAPORT_AUDYTU.md`, `PLAN_NAPRAWY_BLEDOW.md`; z `FireSnowBridge/` → `docs/archive/firesnowbridge/`: `PODSUMOWANIE.md`, `EXPRESS_INTEGRATION.md`, `REACT_EXAMPLES.md`, `INSTRUKCJA_TESTOWANIE_LOKALNE.md`, `WATCHDOG_INSTRUKCJA.md`. `README.md`, `CLAUDE.md`, `GEMINI.md`, `INSTRUKCJA_URUCHOMIENIA.md` i reszta `docs/` zostają w miejscach.

**5.3 CI** – nowy `.github/workflows/ci.yml` (trigger `push` i `pull_request`), runner `ubuntu-latest`: `actions/setup-node@v4` (node 22, cache npm) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm test`; drugi job `bridge`: `actions/setup-java@v4` (temurin 21) → `javac --release 21 -cp FireSnowBridge/lib/hsqldb.jar -d "$RUNNER_TEMP/out" FireSnowBridge/src/FireSnowBridge.java`. Testy używają `test.env` z 1.1, więc nie potrzebują `.env`.

**5.4 Testy trwałe (nowe, w `src/test/`):**
- `availability.test.ts` – `ReservationApiClient.getSkiAvailabilityStatus(kod, from, to, cachedData)` z przekazanym `cachedData` (bez fetch). Daty zawsze konstruowane z lokalnych komponentów (`new Date(2026, 2, 27)`), więc test przechodzi w każdej strefie. Przypadki: nakładanie → `reserved`; rezerwacja kończąca się w dniu `from` o 11:00 → `reserved` (regresja same-day); koniec dzień przed `from` → `warning`; 2 dni przerwy → `warning`; 3 dni przerwy → `available`; 3-dniowa przerwa przez przejście na czas letni (2026-03-29 w Europe/Warsaw; test ustawia przerwę 27→30 marca) → `available` (regresja DST); `calendarDayNumber`/`dayGap` w skrajach miesiąca.
- `routeAuth.test.ts` (`// @vitest-environment node`) – uruchamia `app` z `server/app.ts` na `app.listen(0)`, serwisy (`fireSnowService`, `historyService`, `rentalService`) zamockowane `vi.mock`, zapytania natywnym `fetch`: 401 bez tokenu dla `GET /api/historia/klienci/wyszukaj?nazwisko=a`, `GET /api/wypozyczenia/aktualne`, `GET /api/wypozyczenia/przeszle`, `POST /api/firesnow/refresh`, `GET /api/reservations`, `PUT /api/skis/1`; `GET /api/dostepnosc/okres` bez tokenu → odpowiedź bez klucza `klient`, z ważnym tokenem (`createSessionToken`) → z `klient`; `GET /api/nieistnieje` → 404 JSON; `POST /api/auth/login` ze złym PIN-em 5× → 6. próba (nawet z poprawnym PIN-em) → 429.
- `equipmentService.test.ts` – `getDBConnection` zamockowany (pool z `query = vi.fn()`), `fireSnowService.getAllEquipment` zamockowany: `update(id, { POZIOM: '3' })` generuje INSERT zawierający wyłącznie kolumny `id, kod, poziom` (brak pozostałych 12), a `bulkUpdate` na 3 ID wywołuje `getAllEquipment` dokładnie raz.

## Critical files & anchors

- `src/server/routes/index.ts` + `routes/{history,rentals,firesnow,auth}.ts` – miejsce nakładania auth/404/limitera (1.2–1.4, 1.6).
- `src/server/services/equipmentService.ts` `update`/`bulkUpdate`/`ensureTableExists` (L54-84, L183-278) – semantyka nadpisań MySQL i koszt N×fetch (1.8).
- `src/services/reservationApiClient.ts` `loadAvailabilityForPeriod` (L168-238), `getSkiAvailabilityStatus` (L318-411) – logika 3 kolorów, fail-open, daty (2.3).
- `src/components/BrowseSkisComponent.tsx` L225-362 (ładowanie dostępności i efekty) + `Dashboard.tsx:140-147` (`browseCriteria`) – pętla refetch (2.4).
- `FireSnowBridge/src/FireSnowBridge.java` L108-173 (mount/SHUTDOWN), L679-912 (`DostepnoscOkresHandler`), L917-933 (CORS/JSON) – wyścig i błędy mostu (Faza 4).

## Verification

Wymagania wstępne: Node 22, `.env` uzupełniony wg 1.1; do testów mostu Java 21+ (`FireSnowBridge/jdk/bin/java.exe` lub systemowy Java 25 – `--release 21` działa na obu).

**Po każdej fazie 1–3:** `npx tsc -b`, `npx tsc -p tsconfig.server.json --noEmit`, `npx eslint .` (0 błędów), `npx vitest run` – wszystko zielone (baza: 102 testy; liczba zmieni się o usunięty `csvParser.test.js` i nowe testy z 5.4).

**Faza 0:**
- `git ls-files | grep -E "FireSport_database|\.jar$|\.class$|audit\.json|scratchpad"` → tylko `FireSnowBridge/lib/hsqldb.jar`.
- Po filter-repo: `git log --all --oneline -- FireSnowBridge/lib/FireSport_database_4.script db-config.js public/data/rezerwacja.csv public/data/wyp.csv public/data/rez.csv` → puste; `git count-objects -vH` → `size` wyraźnie mniejszy niż 224 MiB; `git branch -a` pokazuje te same gałęzie; `git status` czysty.

**Faza 1 (smoke, `npm run server` w tle, `NODE_ENV` bez zmian):**
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/historia/klienci/wyszukaj?nazwisko=a` → `401`; to samo dla `/api/wypozyczenia/aktualne`, `/api/wypozyczenia/przeszle`; `curl -X POST http://localhost:5001/api/firesnow/refresh` → `401`.
- `TOKEN=$(curl -s -X POST localhost:5001/api/auth/login -H "Content-Type: application/json" -d '{"password":"<PIN z .env>"}' | jq -r .token)`; z `-H "Authorization: Bearer $TOKEN"` te same endpointy → `200`.
- Bridge na 8081 uruchomiony: `curl "localhost:5001/api/dostepnosc/okres?from=1767225600000&to=1769904000000"` → w JSON brak klucza `klient`; z tokenem → klucz `klient` obecny.
- `curl -i localhost:5001/api/nieistnieje` → `404` z JSON (nie HTML).
- 6 × `curl -X POST localhost:5001/api/auth/login -d '{"password":"bad"}' -H "Content-Type: application/json"` → ostatnie `429`.
- Start bez `AUTH_SECRET` (`AUTH_SECRET= npm run server`) → proces kończy się komunikatem o brakującej zmiennej.
- `Ctrl+C` na serwerze → w logu wpis o zamknięciu, proces kończy się kodem 0.

**Faza 2 (UI, przeglądarka):** `npm run dev:all`; w Chromium (`browser`): (a) wpisz daty i wzrost w formularzu, wejdź w „Przeglądaj", zmień wzrost w pasku kryteriów 3 razy – w zakładce Network jedno żądanie `/api/dostepnosc/okres` na zmianę dat, ZERO na zmianę wzrostu i brak powtórzeń poza interwałem 30 s; (b) wyłącz bridge → w Przeglądaj pojawia się baner „Nie udało się pobrać dostępności…", kolory nie zmieniają się na zielone; (c) jako gość przyciski „Historia"/„Wydania" niewidoczne, klik w logo nic nie otwiera, tooltip kwadracika bez „Klient:"; po zalogowaniu wszystko widoczne; (d) usuń token z `sessionStorage` w DevTools i kliknij odśwież w Wydania → UI wraca do trybu klienta i widoku `search`; (e) dodaj 3 karty osób, usuń 2., dodaj nową → unikalne `id`/etykieta (React bez ostrzeżenia o duplikacie `key`); (f) wyczyść pole wzrostu w Przeglądaj → pole wzrostu w formularzu głównym też puste.

**Faza 3:** `npx vite build` – brak ostrzeżeń o brakujących modułach; w `dist/assets` chunk z `react-calendar-timeline` osobno (nie w `index-*.js`); `npm ls framer-motion papaparse cors jsdom` → puste/`(empty)`; `grep -rn "console.log" src --include=*.ts --include=*.tsx` poza `utils/logger.ts` i `src/test` → 0.

**Faza 4 (smoke mostu, nie dotyka produkcyjnej bazy `C:/database`):**
1. `npm run build:bridge` → powstaje `FireSnowBridge/FireSnowBridge.jar`.
2. Utwórz katalog tymczasowy `FireSnowBridge/tmp-smoke/` (ignorowany: dodaj do `.gitignore` na czas testu lub usuń po) z `config.properties`: `db.url=jdbc:hsqldb:file:<abs>/FireSnowBridge/lib/FireSport_database_4;readonly=true;ifexists=true`, `db.user=SA`, `db.password=`, `api.port=8099`, `equipment.groups=130615,130679,131174,131361,131364,131534,131533`; uruchom z tego katalogu: `java -cp ../FireSnowBridge.jar;../lib/hsqldb.jar FireSnowBridge`.
3. `curl localhost:8099/api/health` → 200. 10 równoległych żądań (`for i in $(seq 10); do curl -s -o /dev/null -w "%{http_code}\n" localhost:8099/api/rezerwacje/aktywne & done; wait`) → wszystkie `200`.
4. `touch FireSnowBridge/lib/FireSport_database_4.script`, następnie 10 równoległych żądań jak wyżej → wszystkie `200` (brak `500`), w logu mostu dokładnie jedna linia "reloading", a kolejne serie żądań bez ponownego przeładowania.
5. `curl -i "localhost:8099/api/dostepnosc/okres?from=abc"` → `400` JSON; `curl "localhost:8099/api/dostepnosc/okres?from=1767225600000"` (bez `to`) → `200` z niepustą tablicą (jeśli dane w zrzucie obejmują okres; w przeciwnym razie `200` i poprawny JSON).
6. `curl -i localhost:8099/api/refresh` (GET) → `405`; `curl -i -X POST localhost:8099/api/refresh` → `200`; brak nagłówka `Access-Control-Allow-Origin` w żadnej odpowiedzi (`curl -i`).
7. Zamknij proces mostu, usuń `FireSnowBridge/tmp-smoke/`.

**Faza 5:** `git status` po `git mv` pokazuje rename (nie delete+add); `npm run lint && npm run typecheck && npm test` lokalnie = to, co robi CI; poprawność YAML: `npx --yes yaml-lint .github/workflows/ci.yml` lub otwarcie w edytorze (workflow uruchomi się dopiero po push użytkownika).

## Assumptions & contingencies

- **PIN pracownika** – wygenerowany losowo w kroku 1.1 i podany użytkownikowi (stary `0000` jest odrzucany przez walidację). Jeśli użytkownik woli własny PIN, wystarczy zmiana `EMPLOYEE_PIN` w `.env` (min. 4 cyfry, ≠ `0000`).
- **Limit logowania** – 5 nieudanych prób / 15 min / IP, w pamięci procesu (reset po restarcie). Przy dostępie przez reverse proxy `req.ip` to adres proxy – wtedy ustaw `app.set('trust proxy', …)`; obecnie brak proxy.
- **Brak `helmet` i HSTS** – serwer działa po HTTP w LAN; CSP/HSTS zepsułyby SPA (Google Fonts, style inline) bez zysku. Jeśli powstanie TLS-owy reverse proxy, dodać `helmet` osobno.
- **Reguła bufora serwisowego** – `CLAUDE.md` mówi „żółty = 1–2 dni, zielony = 3+", a `ConflictCheckerModal` dotąd uznawał przerwę 2 dni za OK. Plan ujednolica modal do reguły z Przeglądaj (`przerwa <= SERVICE_BUFFER_DAYS` = konflikt). Jeśli intencją było „min. 2 dni OK", zmień jeden warunek w `conflictDetector.ts` na `< SERVICE_BUFFER_DAYS` i zostaw `reservationApiClient` bez zmian.
- **TTL przeładowania bazy usunięty (4.2)** – reload tylko przy zmianie mtime plików HSQLDB lub ręcznym `/api/refresh`. Jeśli po wdrożeniu dane są nieaktualne mimo zmian w FireSnow (FireSnow nie zmienia mtime żadnego z `.script/.log/.properties/.data/.lck`), przywróć `db.ttl` jako dodatkowy warunek `reloadNeeded()` (`now - dbMountedTime > TTL`), z reloadem nadal pod write lockiem z 4.2 (poprawny wyścigowo, kosztem re-parse ~34 MB co TTL).
- **`filter-repo` niedostępny** (np. brak `pip`): fallback `git filter-branch --index-filter 'git rm -r --cached --ignore-unmatch <ścieżki>' --prune-empty -- --all` z tą samą listą ścieżek; reszta kroków 0.2 bez zmian.
- **Brak zrzutu `FireSnowBridge/lib/FireSport_database_4.script` na dysku w momencie testu mostu** (np. po `git clean`): smoke test Fazy 4 wymaga dowolnej kopii bazy HSQLDB – wskaż `db.url` na kopię w `C:/database/` (ta sama, której używa produkcja, tryb `readonly=true`; test nie zapisuje).
- **`data_do` w `AktywneWypozyczeniaHandler`** – kierunek poprawki zależy od wyniku `grep` opisanego w 4.3; oba warianty są dopuszczalne i rozstrzygane wyłącznie tym grepem.
- Zakres świadomie pominięty: self-hosting czcionek Google, konsolidacja 3 implementacji modali, podział `BrowseSkisComponent`/`ReservationsView`/`EquipmentHandoutView` na mniejsze komponenty, `npm audit fix` (40 podatności – osobne zadanie z testem zgodności Vite/Express).
