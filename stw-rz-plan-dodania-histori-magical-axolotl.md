# Plan: historia klientów z FireSnow obok historii z MySQL

## Kontekst
Widok „Historia” ([HistoryView.tsx](src/components/HistoryView.tsx)) pokazuje dziś tylko archiwum MySQL (`history`, sezony 2012–2023: `id_klient_old`, `id_daty_old`, `id_sprzet_old`). Wypożyczenia z bieżących sezonów są wyłącznie w FireSnow (HSQLDB, przez Java Bridge). Cel: jedno wyszukiwanie po nazwisku odpytuje obie bazy, a wynik to wspólna lista klientów z etykietą źródła. Dalej działa ten sam przepływ w 3 krokach (klient → okres/umowa → sprzęt). Z FireSnow bierzemy **tylko wypożyczenia** (`SESSIONINFOFGHJ`, zwrócone i aktywne), pogrupowane po umowie (`RENTDOCUMENT_ID`). Każde źródło działa niezależnie: awaria jednego nie blokuje drugiego.

## 1. Java Bridge: 3 nowe endpointy (tylko odczyt)
Plik: [FireSnowBridge.java](FireSnowBridge/src/FireSnowBridge.java). Wzorujemy się na `RezerwacjeDlaDatyHandler` (`openSession()`, `parseQuery`, `PreparedStatement`, `escapeJson`, `sendJson`, 400 przy błędnych parametrach, 500 `"Błąd wewnętrzny"`). Wszystkie parametry idą przez `?` w PreparedStatement, bez konkatenacji. Rejestracja w `main()` obok obecnych `createContext` i dopisanie do listy endpointów wypisywanej przy starcie.

- **`GET /api/historia/klienci?nazwisko=X`** (`HistoriaKlienciHandler`). Gdy brak parametru lub ma mniej niż 2 znaki: 400.
  `RENT_CUSTOMERS rc` → `rc.ID, rc.FORENAME, rc.SURNAME, rc.PHONE1`, `WHERE UPPER(rc.SURNAME) LIKE UPPER(?)` (`%X%`) `AND EXISTS (SELECT 1 FROM SESSIONINFOFGHJ si WHERE si.CUSTOMER_ID = rc.ID)`, `ORDER BY SURNAME, FORENAME`, `LIMIT 50`. Zapasowa nazwa: `ABSTRACTENTITYCM.NAME` (tak jak w rezerwacjach).
- **`GET /api/historia/umowy?klient=ID`** (`HistoriaUmowyHandler`): umowy klienta.
  `SESSIONINFOFGHJ si` z `LEFT JOIN ABSTRACTDOCUMENT doc ON doc.ID = si.RENTDOCUMENT_ID`, `WHERE si.CUSTOMER_ID = ?`, `GROUP BY si.RENTDOCUMENT_ID, doc.NUMBER` → `MIN(STARTTIME) data_od`, `MAX(STOPTIME) data_do`, `MIN(STOPTIME) min_stop` (0 = wciąż aktywne), `COUNT(*) liczba_pozycji`, `SUM(PRICE) cena`, `SUM(PAYMENT) zaplacono`, `ORDER BY data_od DESC`. Czasy to BIGINT w ms, tak jak w `PrzeszleWypozyczeniaHandler`.
- **`GET /api/historia/sprzet?klient=ID&dokument=ID`** (`HistoriaSprzetHandler`): pozycje jednej umowy.
  Te same JOIN-y co w `PrzeszleWypozyczeniaHandler` (`ae_equipment.NAME/CODE`, `doc.NUMBER`), `WHERE si.CUSTOMER_ID = ? AND si.RENTDOCUMENT_ID = ?`, `ORDER BY ae_equipment.NAME`. Zwraca `session_id, nazwa_sprzetu, kod_sprzetu, data_od, data_do, cena, zaplacono, numer_dokumentu`.

Jeśli w trakcie okaże się, że kolumna ma inną nazwę (np. telefon w `RENT_CUSTOMERS`), sprawdzamy to w HSQLDB Database Manager, tak jak przy dotychczasowych zapytaniach.

## 2. Backend (Express)
- [fireSnowService.ts](src/server/services/fireSnowService.ts): dochodzą `searchHistoryClients(nazwisko)`, `getHistoryContracts(clientId)`, `getHistoryEquipment(clientId, documentId)` przez istniejące `fetchFireSnow` (z `encodeURIComponent` / `URLSearchParams`).
- Typy surowych odpowiedzi w [services.types.ts](src/server/types/services.types.ts) (`FireSnowHistoryClient`, `FireSnowHistoryContract`, `FireSnowHistoryPosition`).
- Nowy plik `src/server/services/fireSnowHistoryService.ts`. Mapuje odpowiedzi na **te same kształty**, które zwraca MySQL ([historyService.ts](src/server/services/historyService.ts): `ClientSearchResult`, `ClientDate`, `ClientEquipment`), z dodatkami:
  - `ClientSearchResult` dostaje `source: 'mysql' | 'firesnow'` (w MySQL zawsze `'mysql'`).
  - `ClientDate` dostaje opcjonalne `dokument_id` i `numer`. `od`/`do` w formacie DD.MM.YYYY, `od_iso`/`do_iso` jako ISO. `sezon` liczony z daty startu (lipiec–czerwiec → np. `2024/25`). Gdy `min_stop = 0`, `do` = „w trakcie”.
  - `ClientEquipment`: `source: 'firesnow'`, `status` = „Oddane” / „Nie oddane” zależnie od `STOPTIME != 0`, `liczba_dni` = zaokrąglona w górę różnica (stop lub teraz − start) / 86 400 000, `dlugosc: null`, `typumowy` z prefiksu numeru dokumentu (`P` → PROMOTOR, tak jak w bridge'u).
  - Gdy `config.useFireSnowApi === false`, zwraca `[]` (tak samo jak reszta backendu).
- [historyController.ts](src/server/controllers/historyController.ts): 3 nowe handlery w obecnym stylu (`parseInt` + 400, `next(error)`).
- [routes/history.ts](src/server/routes/history.ts): nowe trasy za tym samym `requireEmployeeAuth`:
  - `GET /api/historia/firesnow/klienci/wyszukaj?nazwisko=`
  - `GET /api/historia/firesnow/klient/:id/daty`
  - `GET /api/historia/firesnow/klient/:id/sprzet?dokument=`
  Istniejące trasy MySQL zostają bez zmian, poza dodaniem `source: 'mysql'` w odpowiedzi wyszukiwania.

## 3. Frontend
- [src/services/historyService.ts](src/services/historyService.ts):
  - `ClientData.source: 'mysql' | 'firesnow'`, `DateRange.dokument_id?`, `DateRange.numer?`, `HistoryEquipmentData.source: 'history' | 'firesnow'`.
  - `searchClients` odpytuje oba endpointy przez `Promise.allSettled` i zwraca `{ clients, unavailableSources: ('mysql' | 'firesnow')[] }`. Lista: najpierw FireSnow (nowsze), potem MySQL. Toast błędu tylko wtedy, gdy padną oba źródła.
  - `getClientDates(client)` i `getClientEquipment(client, dateRange)` wybierają endpoint po `client.source`; dla FireSnow wysyłają `dokument_id`.
- [HistoryView.tsx](src/components/HistoryView.tsx):
  - Klucz listy `${source}-${id}` (ID z obu baz mogą się powtarzać).
  - Etykieta przy kliencie: „FireSnow” lub „Archiwum 2012–2023”.
  - Żółta informacja, gdy jedno źródło jest niedostępne („FireSnow niedostępny, pokazano tylko archiwum”).
  - W kroku 2 dla FireSnow widać numer umowy. W kroku 3 kolumna „Długość” pokazuje „-”, a kwota to suma pozycji (dziś w MySQL bierzemy z pierwszego wiersza; w FireSnow sumujemy `cena`).
  - Nagłówek zmieniony na ogólny, np. „Historia wypożyczeń klientów”.

## 4. Testy
- [src/test/routeAuth.test.ts](src/test/routeAuth.test.ts): 3 nowe trasy `/api/historia/firesnow/...` na liście tras chronionych (401 bez tokena).
- Nowy `src/test/fireSnowHistoryService.test.ts`: mock `fireSnowService` i sprawdzenie mapowania: format dat, liczenie sezonu na granicy czerwiec/lipiec, aktywna umowa (`STOPTIME = 0`), `liczba_dni`, wykrycie PROMOTOR, `useFireSnowApi=false` → `[]`.
- Test frontendowego `HistoryService.searchClients`: jedno źródło odrzucone → klienci z drugiego + `unavailableSources`.

## Weryfikacja
1. `cd FireSnowBridge && compile.bat`, potem `start-headless.bat`. Ręcznie: `curl "http://localhost:8081/api/historia/klienci?nazwisko=kow"`, następnie `/api/historia/umowy?klient=<id>` i `/api/historia/sprzet?klient=<id>&dokument=<id>`. Sprawdzić, że `nazwisko=k` daje 400.
2. `npm run typecheck`, `npm run lint`, `npm test`.
3. `npm run dev:all`: zalogować się jako pracownik, otworzyć Historię, wpisać nazwisko znanego klienta z FireSnow i z archiwum. Na liście mają być oba z etykietami. Przejść 3 kroki dla każdego źródła. Potem zatrzymać bridge i sprawdzić, że archiwum MySQL działa dalej i widać ostrzeżenie o FireSnow