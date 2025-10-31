═══════════════════════════════════════════════════════════════════════════════
DOKUMENTACJA API - ASYSTENT JAVA (System Wypożyczalni Nart)
═══════════════════════════════════════════════════════════════════════════════

Data utworzenia: 28 października 2025
Wersja: 1.0

═══════════════════════════════════════════════════════════════════════════════
SPIS TREŚCI
═══════════════════════════════════════════════════════════════════════════════

1. ARCHITEKTURA SYSTEMU
2. FIRESNOW BRIDGE API (Java) - Port 8080
3. EXPRESS SERVER API (Node.js) - Port 3000
4. UŻYCIE W APLIKACJI FRONTEND
5. FORMATY DANYCH
6. PRZYKŁADY UŻYCIA
7. DIAGNOSTYKA I DEBUGOWANIE

═══════════════════════════════════════════════════════════════════════════════
1. ARCHITEKTURA SYSTEMU
═══════════════════════════════════════════════════════════════════════════════

System składa się z trzech warstw:

┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA 1: REACT FRONTEND (Vite + TypeScript)                               │
│ - Komponenty UI w src/components/                                           │
│ - Serwisy w src/services/                                                   │
│ - Komunikacja przez fetch() API                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTP
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA 2: EXPRESS SERVER (Node.js) - http://localhost:3000                │
│ - Serwuje aplikację React (dist/)                                           │
│ - Proxy i agregacja danych z FireSnow API                                   │
│ - Fallback do CSV gdy FireSnow niedostępny                                  │
│ - Plik: server.js                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTP
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA 3: FIRESNOW BRIDGE API (Java 8) - http://localhost:8080            │
│ - Bridge do bazy HSQLDB FireSnow                                            │
│ - Połączenia READ-ONLY z auto-refresh co 2 min                              │
│ - Plik: FireSnowBridge/src/FireSnowBridge.java                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ JDBC
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA 4: BAZA DANYCH HSQLDB - FireSnow Database                          │
│ - jdbc:hsqldb:hsql://192.168.8.48:9001/FireSport_database_4                │
│ - Tabele: SESSIONINFOFGHJ, RESERVATIONPOSITION, RENT_CUSTOMERS, etc.       │
└─────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
2. FIRESNOW BRIDGE API (Java) - http://localhost:8080
═══════════════════════════════════════════════════════════════════════════════

FireSnowBridge to REST API napisane w Java 8, które łączy się bezpośrednio
z bazą danych HSQLDB systemu FireSnow i udostępnia dane przez HTTP.

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2.1. GET /api/health                                                        │
│ Sprawdź status API i połączenie z bazą danych                               │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:8080/api/health
Metoda:      GET
Autoryzacja: Brak
CORS:        Dozwolone (*)

OPIS:
Sprawdza czy FireSnow Bridge API działa i może się połączyć z bazą danych.

RESPONSE (200 OK):
{
  "status": "ok",
  "database": "connected",
  "message": "FireSnow Bridge API is running"
}

RESPONSE (500 Error):
{
  "status": "error",
  "database": "disconnected",
  "error": "Connection refused: connect"
}

UŻYCIE W APLIKACJI:
- src/services/skiDataService.ts → checkServerHealth()
- Sprawdzanie dostępności serwera przed operacjami


┌─────────────────────────────────────────────────────────────────────────────┐
│ 2.2. GET /api/refresh                                                       │
│ Wymusza odświeżenie cache połączeń do bazy danych                           │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:8080/api/refresh
Metoda:      GET
Autoryzacja: Brak
CORS:        Dozwolone (*)

OPIS:
Zamyka wszystkie połączenia do bazy danych i wymusza garbage collection.
Następne zapytanie otworzy nowe połączenie i pobierze świeże dane z dysku.

DLACZEGO TO WAŻNE:
HSQLDB cache'uje dane w pamięci. Po zmianach w FireSnow trzeba wymusić
odświeżenie żeby zobaczyć najnowsze dane.

RESPONSE (200 OK):
{
  "status": "ok",
  "message": "Database connections refreshed. Next request will read fresh data from disk."
}

UŻYCIE W APLIKACJI:
- Automatyczne odświeżanie co 2 minuty (TTL w getConnection())
- Ręczne odświeżanie przez POST /api/firesnow/refresh (Express)


┌─────────────────────────────────────────────────────────────────────────────┐
│ 2.3. GET /api/rezerwacje/aktywne                                            │
│ Pobierz listę aktywnych rezerwacji                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:8080/api/rezerwacje/aktywne
Metoda:      GET
Autoryzacja: Brak
CORS:        Dozwolone (*)

OPIS:
Zwraca wszystkie aktywne rezerwacje (data zakończenia > CURRENT_TIMESTAMP).

SQL QUERY:
SELECT 
  rp.ID as rezerwacja_id,
  p.NAME as nazwa_sprzetu,
  ae.CODE as kod_sprzetu,
  rp.BEGINDATE as data_od,
  rp.ENDDATE as data_do,
  rp.PRICE as cena,
  rp.RENTOBJECT_ID as obiekt_id,
  rp.CUSTOMER_ID as klient_id,
  rc.FORENAME as imie,
  rc.SURNAME as nazwisko,
  rc.PHONE1 as telefon
FROM RESERVATIONPOSITION rp
JOIN ABSTRACTPOSITION p ON p.ID = rp.ID
LEFT JOIN ABSTRACTENTITYCM ae ON ae.ID = rp.RENTOBJECT_ID
LEFT JOIN RENT_CUSTOMERS rc ON rc.ID = rp.CUSTOMER_ID
WHERE rp.ENDDATE > CURRENT_TIMESTAMP
ORDER BY rp.BEGINDATE

RESPONSE (200 OK):
[
  {
    "rezerwacja_id": 86213,
    "nazwa_sprzetu": "NARTY ATOMIC REDSTER G9 //01",
    "kod_sprzetu": "01",
    "data_od": "2026-02-13 11:00:00.0",
    "data_do": "2026-02-15 17:00:00.0",
    "cena": 55.0,
    "obiekt_id": 84298,
    "klient_id": 83903,
    "imie": "SZYMON",
    "nazwisko": "KOWALCZAK",
    "telefon": "790697793"
  }
]

UŻYCIE W APLIKACJI:
- Express Server → loadReservationsFromFireSnowAPI()
- Używane w GET /api/reservations (warstwa Express)

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- imie + nazwisko → Kolumna "Klient" w widoku rezerwacji
- nazwa_sprzetu → Kolumna "Sprzęt" w widoku rezerwacji
- kod_sprzetu → Kolumna "Kod" w widoku rezerwacji
- data_od → Kolumna "Od" (data rozpoczęcia rezerwacji)
- data_do → Kolumna "Do" (data zakończenia rezerwacji)
- cena → Kolumna "Cena" w widoku rezerwacji
- telefon → Kolumna "Telefon" lub szczegóły rezerwacji
- rezerwacja_id → Kolumna "Numer" rezerwacji


┌─────────────────────────────────────────────────────────────────────────────┐
│ 2.4. GET /api/wypozyczenia/aktualne                                         │
│ Pobierz listę aktywnych wypożyczeń (sprzęt u klienta)                       │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:8080/api/wypozyczenia/aktualne
Metoda:      GET
Autoryzacja: Brak
CORS:        Dozwolone (*)

OPIS:
Zwraca wszystkie aktywne wypożyczenia (STOPTIME = 0, sprzęt nie zwrócony).

SQL QUERY:
SELECT 
  si.ID as session_id,
  si.STARTTIME as data_od,
  si.STOPTIME as data_do,
  si.REMAININGTIME as pozostaly_czas,
  si.PRICE as cena,
  si.PAYMENT as zaplacono,
  si.RENTOBJECT_ID as obiekt_id,
  si.CUSTOMER_ID as klient_id,
  si.RENTDOCUMENT_ID as dokument_id,
  ae_customer.NAME as klient_nazwa,
  ae_equipment.NAME as nazwa_sprzetu,
  ae_equipment.CODE as kod_sprzetu,
  doc.NUMBER as numer_dokumentu
FROM SESSIONINFOFGHJ si
LEFT JOIN ABSTRACTENTITYCM ae_customer ON ae_customer.ID = si.CUSTOMER_ID
LEFT JOIN ABSTRACTENTITYCM ae_equipment ON ae_equipment.ID = si.RENTOBJECT_ID
LEFT JOIN ABSTRACTDOCUMENT doc ON doc.ID = si.RENTDOCUMENT_ID
WHERE si.STOPTIME = 0
ORDER BY si.STARTTIME DESC

RESPONSE (200 OK):
[
  {
    "session_id": 86210,
    "nazwa_sprzetu": "NARTY ATOMIC REDSTER G9 //01",
    "kod_sprzetu": "01",
    "data_od": 1761569463107,
    "data_do": 0,
    "pozostaly_czas": 104940000,
    "cena": 55.0,
    "zaplacono": 55.0,
    "obiekt_id": 84298,
    "klient_id": 83903,
    "dokument_id": 86213,
    "klient_nazwa": "KOWALCZAK SZYMON",
    "numer_dokumentu": "WP 13/10/2025"
  }
]

UWAGA - FORMAT DAT:
- data_od: timestamp w milisekundach (Unix epoch)
- data_do: 0 = aktywne wypożyczenie (nie zwrócone)

UŻYCIE W APLIKACJI:
- Express Server → loadRentalsFromFireSnowAPI()
- Używane w GET /api/wypozyczenia/aktualne (warstwa Express)

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- klient_nazwa → Kolumna "Klient" w widoku wypożyczeń
- nazwa_sprzetu → Kolumna "Sprzęt" w widoku wypożyczeń
- kod_sprzetu → Kolumna "Kod" w widoku wypożyczeń
- data_od → Kolumna "Od" (data rozpoczęcia wypożyczenia, format timestamp)
- data_do → Kolumna "Do" (0 = aktywne, nie zwrócone)
- cena → Kolumna "Cena" w widoku wypożyczeń
- zaplacono → Kolumna "Zapłacono" w widoku wypożyczeń
- numer_dokumentu → Kolumna "Numer" dokumentu wypożyczenia
- obiekt_id → Używane do weryfikacji dostępności w systemie doboru nart


┌─────────────────────────────────────────────────────────────────────────────┐
│ 2.5. GET /api/wypozyczenia/przeszle                                         │
│ Pobierz listę przeszłych wypożyczeń (sprzęt zwrócony)                       │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:8080/api/wypozyczenia/przeszle
Metoda:      GET
Autoryzacja: Brak
CORS:        Dozwolone (*)

OPIS:
Zwraca wszystkie zakończone wypożyczenia (STOPTIME != 0, sprzęt zwrócony).

SQL QUERY:
Identyczne jak /api/wypozyczenia/aktualne, ale:
WHERE si.STOPTIME != 0

RESPONSE (200 OK):
[
  {
    "session_id": 86210,
    "nazwa_sprzetu": "NARTY ATOMIC REDSTER G9 //01",
    "kod_sprzetu": "01",
    "data_od": 1761569463107,
    "data_do": 1761674403107,
    "pozostaly_czas": 104940000,
    "cena": 55.0,
    "zaplacono": 55.0,
    "obiekt_id": 84298,
    "klient_id": 83903,
    "dokument_id": 86213,
    "klient_nazwa": "KOWALCZAK SZYMON",
    "numer_dokumentu": "WP 13/10/2025"
  }
]

UŻYCIE W APLIKACJI:
- Express Server → loadPastRentalsFromFireSnowAPI()
- Używane w GET /api/wypozyczenia/przeszle (warstwa Express)

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- klient_nazwa → Kolumna "Klient" w historii wypożyczeń
- nazwa_sprzetu → Kolumna "Sprzęt" w historii wypożyczeń
- kod_sprzetu → Kolumna "Kod" w historii wypożyczeń
- data_od → Kolumna "Od" (data rozpoczęcia)
- data_do → Kolumna "Do" (data zwrotu sprzętu)
- cena → Kolumna "Cena" w historii
- zaplacono → Kolumna "Zapłacono"
- numer_dokumentu → Kolumna "Numer" dokumentu


┌─────────────────────────────────────────────────────────────────────────────┐
│ 2.6. GET /api/narty/zarezerwowane                                           │
│ Pobierz listę zarezerwowanych nart (kody zajęte)                            │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:8080/api/narty/zarezerwowane
Metoda:      GET
Autoryzacja: Brak
CORS:        Dozwolone (*)

OPIS:
Zwraca listę sprzętu, który jest obecnie zarezerwowany (DISTINCT).

SQL QUERY:
SELECT DISTINCT
  ro.ID as obiekt_id,
  p.NAME as nazwa,
  p.CODE as kod
FROM RENTOBJECTS ro
JOIN ABSTRACTPOSITION p ON p.ID = ro.ID
WHERE ro.ID IN (
  SELECT RENTOBJECT_ID
  FROM RESERVATIONPOSITION
  WHERE ENDDATE > CURRENT_TIMESTAMP
)
ORDER BY p.NAME

RESPONSE (200 OK):
[
  {
    "obiekt_id": 84298,
    "nazwa": "NARTY ATOMIC REDSTER G9 //01",
    "kod": "01"
  },
  {
    "obiekt_id": 84306,
    "nazwa": "NARTY ROSSIGNOL HERO ELITE //02",
    "kod": "02"
  }
]

UŻYCIE W APLIKACJI:
- Obecnie nieużywane w frontend
- Może być użyte do szybkiego sprawdzenia dostępności

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- obiekt_id → ID używane wewnętrznie do weryfikacji
- nazwa → Pełna nazwa sprzętu w liście dostępności
- kod → Kod sprzętu używany do identyfikacji w systemie


═══════════════════════════════════════════════════════════════════════════════
3. EXPRESS SERVER API (Node.js) - http://localhost:3000
═══════════════════════════════════════════════════════════════════════════════

Express Server to warstwa pośrednia, która:
1. Serwuje aplikację React (dist/)
2. Agreguje dane z FireSnow API i CSV
3. Zapewnia fallback gdy FireSnow API nie działa
4. Obsługuje CRUD operacje na nartach (CSV)

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.1. GET /api/health                                                        │
│ Sprawdź status serwera Express                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:3000/api/health
Metoda:      GET
Autoryzacja: Brak

RESPONSE (200 OK):
{
  "status": "ok",
  "timestamp": "2025-10-28T12:00:00.000Z",
  "message": "Serwer asystenta nart działa poprawnie"
}

UŻYCIE W APLIKACJI:
- src/services/skiDataService.ts → checkServerHealth()


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.2. GET /api/reservations                                                  │
│ Pobierz wszystkie rezerwacje (FireSnow API lub CSV)                         │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:3000/api/reservations
Metoda:      GET
Autoryzacja: Brak

OPIS:
Pobiera rezerwacje z FireSnow API. Jeśli API nie działa, używa CSV fallback.

ŹRÓDŁA DANYCH (w kolejności priorytetu):
1. FireSnow API → GET http://localhost:8080/api/rezerwacje/aktywne
2. CSV Fallback → public/data/rezerwacja.csv

MAPOWANIE DANYCH (FireSnow → Frontend):
{
  klient: `${item.imie || ''} ${item.nazwisko || ''}`.trim() || `Klient #${item.klient_id}`,
  sprzet: item.nazwa_sprzetu,
  kod: item.kod_sprzetu,
  od: formatFireSnowDate(item.data_od),      // "2026-02-13 11:00:00" → "2026-02-13T11:00:00"
  do: formatFireSnowDate(item.data_do),
  cena: item.cena.toString(),
  zaplacono: "",
  numer: item.rezerwacja_id.toString(),
  // telefon: USUNIĘTE ze względów prywatności
  obiekt_id: item.obiekt_id,
  klient_id: item.klient_id
}

UWAGA - MAPOWANIE IMIENIA I NAZWISKA:
- FireSnow API zwraca osobno: `imie` (FORENAME) i `nazwisko` (SURNAME)
- W aplikacji łączymy je w jedno pole `klient`: "SZYMON KOWALCZAK"
- Jeśli brak imienia/nazwiska → fallback: "Klient #12345" (BEZ telefonu!)

RESPONSE (200 OK):
[
  {
    "klient": "KOWALCZAK SZYMON",
    "sprzet": "NARTY ATOMIC REDSTER G9 //01",
    "kod": "01",
    "od": "2026-02-13T11:00:00",
    "do": "2026-02-15T17:00:00",
    "cena": "55",
    "zaplacono": "",
    "numer": "86213",
    "telefon": "790697793"
  }
]

UŻYCIE W APLIKACJI:
- src/services/reservationApiClient.ts → loadReservations()
- Komponent: src/components/ReservationsView.tsx

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- klient → Kolumna "Klient" w widoku rezerwacji (ReservationsView) - wyświetla imię i nazwisko razem: "SZYMON KOWALCZAK"
- sprzet → Kolumna "Sprzęt" - nazwa wyposażenia
- kod → Kolumna "Kod" - krótki identyfikator sprzętu
- od → Kolumna "Od" - data rozpoczęcia rezerwacji
- do → Kolumna "Do" - data zakończenia rezerwacji
- cena → Kolumna "Cena" - koszt rezerwacji
- zaplacono → Kolumna "Zapłacono" - kwota wpłacona
- numer → Kolumna "Numer" - numer rezerwacji/dokumentu


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.3. GET /api/wypozyczenia/aktualne                                         │
│ Pobierz wszystkie aktywne wypożyczenia (FireSnow API lub CSV)               │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:3000/api/wypozyczenia/aktualne
Metoda:      GET
Autoryzacja: Brak

OPIS:
Pobiera wypożyczenia z FireSnow API. Jeśli API nie działa, używa CSV fallback.

ŹRÓDŁA DANYCH (w kolejności priorytetu):
1. FireSnow API → GET http://localhost:8080/api/wypozyczenia/aktualne
2. CSV Fallback → public/data/wyp.csv

MAPOWANIE DANYCH (FireSnow → Frontend):
{
  klient: item.klient_nazwa || `Klient #${item.klient_id}`,
  sprzet: item.nazwa_sprzetu,
  kod: item.kod_sprzetu,
  od: formatTimestamp(item.data_od),         // 1761569463107 → "2025-10-27"
  do: formatTimestamp(item.data_do),
  cena: item.cena.toString(),
  zaplacono: item.zaplacono.toString(),
  numer: item.numer_dokumentu || `WYP-${item.session_id}`,
  typumowy: "STANDARD",
  obiekt_id: item.obiekt_id,
  klient_id: item.klient_id
}

RESPONSE (200 OK):
[
  {
    "klient": "KOWALCZAK SZYMON",
    "sprzet": "NARTY ATOMIC REDSTER G9 //01",
    "kod": "01",
    "od": "2025-10-27",
    "do": "",
    "cena": "55",
    "zaplacono": "55",
    "numer": "WP 13/10/2025",
    "typumowy": "STANDARD"
  }
]

UŻYCIE W APLIKACJI:
- src/services/reservationApiClient.ts → loadRentals()
- Używane do sprawdzania dostępności nart

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- klient → Kolumna "Klient" w widoku wypożyczeń
- sprzet → Kolumna "Sprzęt" - nazwa nart/sprzętu
- kod → Kolumna "Kod" - identyfikator używany w systemie doboru
- od → Kolumna "Od" - data wypożyczenia
- do → Kolumna "Do" - puste dla aktywnych wypożyczeń
- cena → Kolumna "Cena" - koszt wypożyczenia
- zaplacono → Kolumna "Zapłacono" - kwota uiszczona
- numer → Kolumna "Numer" - numer dokumentu WP
- typumowy → Typ umowy (STANDARD/PROMOTOR) - może być wyświetlany jako badge


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.4. GET /api/wypozyczenia/przeszle                                         │
│ Pobierz wszystkie przeszłe wypożyczenia (sprzęt zwrócony)                   │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:3000/api/wypozyczenia/przeszle
Metoda:      GET
Autoryzacja: Brak

OPIS:
Pobiera historię wypożyczeń (zwrócone) z FireSnow API.

ŹRÓDŁA DANYCH:
1. FireSnow API → GET http://localhost:8080/api/wypozyczenia/przeszle
2. Pusta lista jeśli API nie działa (CSV nie ma tej informacji)

RESPONSE (200 OK):
[
  {
    "klient": "KOWALCZAK SZYMON",
    "sprzet": "NARTY ATOMIC REDSTER G9 //01",
    "kod": "01",
    "od": "2025-10-27",
    "do": "2025-10-28",
    "cena": "55",
    "zaplacono": "55",
    "numer": "WP 13/10/2025",
    "typumowy": "STANDARD",
    "source": "rental"
  }
]

UŻYCIE W APLIKACJI:
- src/services/reservationApiClient.ts → loadPastRentals()

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- klient → Kolumna "Klient" w historii wypożyczeń
- sprzet → Kolumna "Sprzęt" - nazwa nart
- kod → Kolumna "Kod" - identyfikator sprzętu
- od → Kolumna "Od" - data wypożyczenia
- do → Kolumna "Do" - data zwrotu
- cena → Kolumna "Cena" - koszt
- zaplacono → Kolumna "Zapłacono" - zapłacona kwota
- numer → Kolumna "Numer" - numer dokumentu
- typumowy → Typ umowy - wyświetlany jako badge lub etykieta
- source → Wewnętrzne (oznaczenie że to wypożyczenie, nie rezerwacja)


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.5. POST /api/reservations                                                 │
│ Utwórz nową rezerwację                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    POST http://localhost:3000/api/reservations
Metoda:      POST
Autoryzacja: Brak
Content-Type: application/json

OPIS:
Dodaje nową rezerwację do CSV (public/data/rezerwacja.csv).

REQUEST BODY:
{
  "klient": "KOWALSKI JAN",
  "sprzet": "NARTY ATOMIC REDSTER G9 //01",
  "kod": "01",
  "od": "2026-03-01T10:00:00",
  "do": "2026-03-05T18:00:00",
  "cena": "120",
  "zaplacono": "60",
  "uwagi": "Klient prosi o wczesny odbiór"
}

RESPONSE (200 OK):
{
  "klient": "KOWALSKI JAN",
  "sprzet": "NARTY ATOMIC REDSTER G9 //01",
  "kod": "01",
  "od": "2026-03-01T10:00:00",
  "do": "2026-03-05T18:00:00",
  "cena": "120",
  "zaplacono": "60",
  "numer": "1730115600000",
  "uwagi": "Klient prosi o wczesny odbiór"
}

UWAGI:
- numer jest generowany automatycznie (timestamp)
- Zapisuje do CSV, NIE do bazy FireSnow
- Wymaga restartu FireSnow aby zmiany były widoczne

UŻYCIE W APLIKACJI:
- src/services/reservationApiClient.ts → createReservation()


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.6. PUT /api/reservations/:id                                              │
│ Zaktualizuj istniejącą rezerwację                                           │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    PUT http://localhost:3000/api/reservations/:id
Metoda:      PUT
Autoryzacja: Brak
Content-Type: application/json

PARAMETRY:
- :id - numer rezerwacji lub kod sprzętu

REQUEST BODY:
{
  "zaplacono": "120",
  "uwagi": "Wpłacono resztę"
}

RESPONSE (200 OK):
{
  "klient": "KOWALSKI JAN",
  "sprzet": "NARTY ATOMIC REDSTER G9 //01",
  "kod": "01",
  "od": "2026-03-01T10:00:00",
  "do": "2026-03-05T18:00:00",
  "cena": "120",
  "zaplacono": "120",
  "numer": "1730115600000",
  "uwagi": "Wpłacono resztę"
}

UŻYCIE W APLIKACJI:
- src/services/reservationApiClient.ts → updateReservation()


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.7. DELETE /api/reservations/:id                                           │
│ Usuń rezerwację                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    DELETE http://localhost:3000/api/reservations/:id
Metoda:      DELETE
Autoryzacja: Brak

PARAMETRY:
- :id - numer rezerwacji lub kod sprzętu

RESPONSE (200 OK):
{
  "klient": "KOWALSKI JAN",
  "sprzet": "NARTY ATOMIC REDSTER G9 //01",
  "kod": "01",
  ...
}

UŻYCIE W APLIKACJI:
- src/services/reservationApiClient.ts → deleteReservation()


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.8. GET /api/skis                                                          │
│ Pobierz wszystkie narty z bazy CSV                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:3000/api/skis
Metoda:      GET
Autoryzacja: Brak

OPIS:
Pobiera wszystkie narty z CSV (public/data/NOWA_BAZA_KOMPLETNA.csv).

RESPONSE (200 OK):
[
  {
    "ID": "1",
    "TYP_SPRZETU": "NARTY",
    "KATEGORIA": "SPORT",
    "MARKA": "ATOMIC",
    "MODEL": "REDSTER G9",
    "DLUGOSC": "183",
    "ILOSC": "1",
    "POZIOM": "ZAAWANSOWANY",
    "PLEC": "MEZCZYZNA",
    "WAGA_MIN": "70",
    "WAGA_MAX": "95",
    "WZROST_MIN": "175",
    "WZROST_MAX": "195",
    "PRZEZNACZENIE": "STOK",
    "ATUTY": "Szybkie, stabilne, precyzyjne",
    "ROK": "2024",
    "KOD": "01"
  }
]

UŻYCIE W APLIKACJI:
- src/services/skiDataService.ts → getAllSkis()
- Wszystkie komponenty wyświetlające listę nart

GDZIE WYŚWIETLAJĄ SIĘ DANE W UI:
- ID → Używane wewnętrznie jako unikalny identyfikator
- TYP_SPRZETU → Filtr typu (NARTY/SNOWBOARD/BUTY) w systemie doboru
- KATEGORIA → Filtr kategorii (SPORT/JUNIOR/VIP/OGÓLNE)
- MARKA → Wyświetlana w karcie narty, nazwa producenta
- MODEL → Wyświetlany w karcie narty, model
- DLUGOSC → Wyświetlana w szczegółach narty (cm), używana w algorytmie
- ILOSC → Liczba dostępnych sztuk (administracja)
- POZIOM → Filtr poziomu narciarza w systemie doboru
- PLEC → Filtr płci w systemie doboru
- WAGA_MIN/WAGA_MAX → Używane w algorytmie dopasowania nart
- WZROST_MIN/WZROST_MAX → Używane w algorytmie dopasowania nart
- PRZEZNACZENIE → Filtr typu terenu (STOK/FREERIDE/PARK)
- ATUTY → Wyświetlane w karcie narty jako opis/zalety
- ROK → Rok produkcji, wyświetlany w szczegółach
- KOD → Kod sprzętu wyświetlany w liście nart, używany do rezerwacji


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.9. POST /api/skis                                                         │
│ Dodaj nową nartę do bazy                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    POST http://localhost:3000/api/skis
Metoda:      POST
Autoryzacja: Brak
Content-Type: application/json

REQUEST BODY:
{
  "TYP_SPRZETU": "NARTY",
  "KATEGORIA": "JUNIOR",
  "MARKA": "ROSSIGNOL",
  "MODEL": "HERO JUNIOR",
  "DLUGOSC": 150,
  "ILOSC": 2,
  "POZIOM": "SREDNIOZAAWANSOWANY",
  "PLEC": "DZIECKO",
  "WAGA_MIN": 40,
  "WAGA_MAX": 60,
  "WZROST_MIN": 140,
  "WZROST_MAX": 160,
  "PRZEZNACZENIE": "STOK",
  "ATUTY": "Łatwe w prowadzeniu",
  "ROK": 2024
}

UWAGI:
- ID jest generowane automatycznie (max ID + 1)
- KOD jest generowany automatycznie jeśli nie podano (NEW_001, NEW_002, etc.)

RESPONSE (200 OK):
{
  "ID": "125",
  "KOD": "NEW_001",
  "TYP_SPRZETU": "NARTY",
  "KATEGORIA": "JUNIOR",
  ...
}

UŻYCIE W APLIKACJI:
- src/services/skiDataService.ts → addSki()
- Komponent: src/components/SkiEditor.tsx (dodawanie)


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.10. PUT /api/skis/:id                                                     │
│ Zaktualizuj istniejącą nartę                                                │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    PUT http://localhost:3000/api/skis/:id
Metoda:      PUT
Autoryzacja: Brak
Content-Type: application/json

PARAMETRY:
- :id - ID narty

REQUEST BODY:
{
  "KATEGORIA": "VIP",
  "ROK": 2025
}

UWAGI:
- Można zaktualizować dowolne pole oprócz ID i KOD (są chronione)
- Zmienia tylko podane pola (partial update)

RESPONSE (200 OK):
{
  "ID": "1",
  "KOD": "01",
  "TYP_SPRZETU": "NARTY",
  "KATEGORIA": "VIP",
  "ROK": "2025",
  ...
}

UŻYCIE W APLIKACJI:
- src/services/skiDataService.ts → updateSki()
- Komponent: src/components/SkiEditor.tsx (edycja)


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.11. PUT /api/skis/bulk                                                    │
│ Zaktualizuj wiele nart jednocześnie                                         │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    PUT http://localhost:3000/api/skis/bulk
Metoda:      PUT
Autoryzacja: Brak
Content-Type: application/json

UWAGA: Ten endpoint MUSI być PRZED /api/skis/:id w pliku server.js!

REQUEST BODY:
{
  "ids": ["1", "2", "3"],
  "updates": {
    "KATEGORIA": "VIP",
    "ROK": 2025
  }
}

RESPONSE (200 OK):
[
  {
    "ID": "1",
    "KATEGORIA": "VIP",
    "ROK": "2025",
    ...
  },
  {
    "ID": "2",
    "KATEGORIA": "VIP",
    "ROK": "2025",
    ...
  }
]

UŻYCIE W APLIKACJI:
- src/services/skiDataService.ts → updateMultipleSkis()
- Bulk operations w panelu administracyjnym


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.12. GET /api/firesnow/status                                              │
│ Sprawdź status połączenia z FireSnow API                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    GET http://localhost:3000/api/firesnow/status
Metoda:      GET
Autoryzacja: Brak

OPIS:
Sprawdza czy FireSnow Bridge API jest dostępny.

RESPONSE (200 OK - API Online):
{
  "status": "online",
  "api_url": "http://localhost:8080",
  "api_response": {
    "status": "ok",
    "database": "connected",
    "message": "FireSnow Bridge API is running"
  }
}

RESPONSE (200 OK - API Offline):
{
  "status": "offline",
  "api_url": "http://localhost:8080",
  "error": "fetch failed"
}

UŻYCIE W APLIKACJI:
- Dashboard do monitorowania statusu systemu


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3.13. POST /api/firesnow/refresh                                            │
│ Wymusza odświeżenie cache w FireSnow API                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Endpoint:    POST http://localhost:3000/api/firesnow/refresh
Metoda:      POST
Autoryzacja: Brak

OPIS:
Wysyła żądanie odświeżenia do FireSnow Bridge API.

RESPONSE (200 OK):
{
  "success": true,
  "message": "FireSnow API odświeżone",
  "api_response": {
    "status": "ok",
    "message": "Database connections refreshed..."
  }
}

UŻYCIE W APLIKACJI:
- Przycisk "Odśwież dane" w interfejsie
- Automatyczne odświeżanie po zmianach w FireSnow


═══════════════════════════════════════════════════════════════════════════════
4. UŻYCIE W APLIKACJI FRONTEND
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ 4.1. SERWISY (src/services/)                                                │
└─────────────────────────────────────────────────────────────────────────────┘

reservationApiClient.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GŁÓWNY KLIENT API DLA REZERWACJI

Metody:
- loadReservations()            → GET /api/reservations
- loadRentals()                 → GET /api/wypozyczenia/aktualne
- loadPastRentals()             → GET /api/wypozyczenia/przeszle
- loadAll()                     → Pobiera rezerwacje + wypożyczenia
- isSkiReservedByCode()         → Sprawdza dostępność po kodzie
- getSkiAvailabilityStatus()    → System 3-kolorowy (🔴🟡🟢)
- createReservation()           → POST /api/reservations
- updateReservation()           → PUT /api/reservations/:id
- deleteReservation()           → DELETE /api/reservations/:id

Cache: 30 sekund

skiDataService.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KLIENT API DLA ZARZĄDZANIA NARTAMI

Metody:
- getAllSkis()                  → GET /api/skis
- updateSki()                   → PUT /api/skis/:id
- addSki()                      → POST /api/skis
- updateMultipleSkis()          → PUT /api/skis/bulk
- clearCache()                  → Wyczyść cache
- checkServerHealth()           → GET /api/health

Cache: 30 sekund
Fallback: Wczytuje z CSV jeśli API nie działa

reservationService.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEGACY SERVICE - Bezpośredni odczyt CSV

STATUS: Zastąpiony przez reservationApiClient.ts
Używany tylko jako fallback

┌─────────────────────────────────────────────────────────────────────────────┐
│ 4.2. KOMPONENTY (src/components/)                                           │
└─────────────────────────────────────────────────────────────────────────────┘

ReservationsView.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WIDOK LISTY REZERWACJI

Używane API:
- reservationApiClient.loadReservations()
- reservationApiClient.loadRentals()
- reservationApiClient.deleteReservation()

SkiMatching.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GŁÓWNY WIDOK DOBORU NART

Używane API:
- skiDataService.getAllSkis()
- reservationApiClient.loadAll()
- reservationApiClient.getSkiAvailabilityStatus()

SkiEditor.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDYTOR NART (DODAWANIE/EDYCJA)

Używane API:
- skiDataService.getAllSkis()
- skiDataService.addSki()
- skiDataService.updateSki()
- skiDataService.updateMultipleSkis()


═══════════════════════════════════════════════════════════════════════════════
5. FORMATY DANYCH
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ 5.1. ReservationData (Frontend)                                             │
└─────────────────────────────────────────────────────────────────────────────┘

interface ReservationData {
  klient: string;        // Nazwa klienta
  sprzet: string;        // Nazwa sprzętu (np. "NARTY ATOMIC REDSTER G9 //01")
  kod: string;           // Kod sprzętu (np. "01")
  od: string;            // Data rozpoczęcia (ISO 8601: "2026-02-13T11:00:00")
  do: string;            // Data zakończenia (ISO 8601: "2026-02-15T17:00:00")
  typumowy?: string;     // Typ umowy: "PROMOTOR" lub "STANDARD"
  numer: string;         // Numer rezerwacji/wypożyczenia
  cena?: string;         // Cena (string!)
  zaplacono?: string;    // Zapłacono (string!)
  uwagi?: string;        // Uwagi
  source?: 'reservation' | 'rental';  // Źródło: rezerwacja lub wypożyczenie
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 5.2. SkiData (Frontend)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

interface SkiData {
  ID: string;
  TYP_SPRZETU: string;   // "NARTY" | "SNOWBOARD" | "BUTY"
  KATEGORIA: string;     // "SPORT" | "JUNIOR" | "VIP" | "OGOLNE"
  MARKA: string;
  MODEL: string;
  DLUGOSC: number;       // cm
  ILOSC: number;         // liczba sztuk
  POZIOM: string;        // "POCZATKUJACY" | "SREDNIOZAAWANSOWANY" | "ZAAWANSOWANY"
  PLEC: string;          // "MEZCZYZNA" | "KOBIETA" | "DZIECKO" | "UNISEX"
  WAGA_MIN: number;      // kg
  WAGA_MAX: number;      // kg
  WZROST_MIN: number;    // cm
  WZROST_MAX: number;    // cm
  PRZEZNACZENIE: string; // "STOK" | "FREERIDE" | "PARK"
  ATUTY: string;         // Opis
  ROK: number;           // Rok produkcji
  KOD: string;           // Unikalny kod (np. "01")
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 5.3. AvailabilityInfo (System 3-kolorowy)                                   │
└─────────────────────────────────────────────────────────────────────────────┘

interface AvailabilityInfo {
  status: 'available' | 'warning' | 'reserved';
  color: 'green' | 'yellow' | 'red';
  emoji: '🟢' | '🟡' | '🔴';
  message: string;
  reservations: ReservationInfo[];
}

LOGIKA:
🔴 CZERWONY (reserved)
- Rezerwacja nachodzi bezpośrednio na okres klienta
- Warunek: resStart <= userDateTo AND resEnd >= userDateFrom

🟡 ŻÓŁTY (warning)
- Rezerwacja 1-2 dni przed/po okresie klienta
- Za mało czasu na serwis nart

🟢 ZIELONY (available)
- Min. 2 dni przerwy przed/po rezerwacji
- Wystarczająco czasu na serwis


═══════════════════════════════════════════════════════════════════════════════
6. PRZYKŁADY UŻYCIA
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6.1. Sprawdzenie dostępności narty                                          │
└─────────────────────────────────────────────────────────────────────────────┘

import { ReservationApiClient } from './services/reservationApiClient';

async function checkAvailability() {
  const kod = "01"; // Kod narty
  const dateFrom = new Date("2026-03-10");
  const dateTo = new Date("2026-03-15");
  
  const availability = await ReservationApiClient.getSkiAvailabilityStatus(
    kod,
    dateFrom,
    dateTo
  );
  
  console.log(availability.emoji, availability.message);
  // 🟢 Dostępne - wystarczająco czasu na serwis
  
  if (availability.reservations.length > 0) {
    console.log("Znalezione rezerwacje:", availability.reservations);
  }
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6.2. Pobranie wszystkich nart                                               │
└─────────────────────────────────────────────────────────────────────────────┘

import { SkiDataService } from './services/skiDataService';

async function loadSkis() {
  const skis = await SkiDataService.getAllSkis();
  
  console.log(`Załadowano ${skis.length} nart`);
  
  // Filtruj tylko narty sportowe
  const sportSkis = skis.filter(ski => ski.KATEGORIA === "SPORT");
  console.log(`Narty sportowe: ${sportSkis.length}`);
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6.3. Dodanie nowej narty                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

import { SkiDataService } from './services/skiDataService';

async function addNewSki() {
  const newSki = {
    TYP_SPRZETU: "NARTY",
    KATEGORIA: "VIP",
    MARKA: "HEAD",
    MODEL: "SUPERSHAPE",
    DLUGOSC: 170,
    ILOSC: 1,
    POZIOM: "ZAAWANSOWANY",
    PLEC: "MEZCZYZNA",
    WAGA_MIN: 70,
    WAGA_MAX: 90,
    WZROST_MIN: 170,
    WZROST_MAX: 185,
    PRZEZNACZENIE: "STOK",
    ATUTY: "Najnowszy model 2025",
    ROK: 2025
  };
  
  const result = await SkiDataService.addSki(newSki);
  
  if (result) {
    console.log("Narta dodana:", result.KOD);
  }
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6.4. Aktualizacja wielu nart jednocześnie                                   │
└─────────────────────────────────────────────────────────────────────────────┘

import { SkiDataService } from './services/skiDataService';

async function upgradeToVIP() {
  const idsToUpgrade = ["1", "5", "12"];
  
  const result = await SkiDataService.updateMultipleSkis(
    idsToUpgrade,
    { KATEGORIA: "VIP" }
  );
  
  if (result) {
    console.log(`Zaktualizowano ${result.length} nart do VIP`);
  }
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6.5. Sprawdzenie statusu FireSnow API                                       │
└─────────────────────────────────────────────────────────────────────────────┘

async function checkFireSnowStatus() {
  const response = await fetch('/api/firesnow/status');
  const status = await response.json();
  
  if (status.status === 'online') {
    console.log('✅ FireSnow API działa');
  } else {
    console.log('❌ FireSnow API niedostępne:', status.error);
  }
}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6.6. Odświeżenie danych FireSnow                                            │
└─────────────────────────────────────────────────────────────────────────────┘

async function refreshFireSnow() {
  const response = await fetch('/api/firesnow/refresh', {
    method: 'POST'
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ FireSnow odświeżone');
  }
}


═══════════════════════════════════════════════════════════════════════════════
7. DIAGNOSTYKA I DEBUGOWANIE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7.1. Sprawdzanie logów                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

FIRESNOW BRIDGE (Java):
Logi w konsoli PowerShell gdzie uruchomiono start.bat
Przykład:
  FireSnowBridge: Active rentals requested
  FireSnowBridge: Returned active rentals

EXPRESS SERVER (Node.js):
Logi w konsoli PowerShell gdzie uruchomiono start-server.bat
Przykład:
  Server: Pobieranie rezerwacji z FireSnow API: http://localhost:8080
  Server: Otrzymano 15 rezerwacji z FireSnow API

FRONTEND (React):
Logi w konsoli przeglądarki (F12 → Console)
Przykład:
  ReservationApiClient: Pobieram rezerwacje z serwera...
  ReservationApiClient: Pobrano 15 rezerwacji

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7.2. Testowanie endpointów                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

PowerShell - Test FireSnow API:
curl http://localhost:8080/api/health

PowerShell - Test Express Server:
curl http://localhost:3000/api/health

PowerShell - Pobranie rezerwacji:
curl http://localhost:3000/api/reservations

PowerShell - Sprawdzenie statusu FireSnow:
curl http://localhost:3000/api/firesnow/status

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7.3. Typowe problemy                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

PROBLEM: FireSnow API zwraca puste dane
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Przyczyna: Cache HSQLDB nie odświeżył się
Rozwiązanie: POST /api/firesnow/refresh

PROBLEM: "Connection refused" przy połączeniu z FireSnow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Przyczyna: FireSnowBridge nie działa lub zły adres IP
Rozwiązanie:
1. Sprawdź czy FireSnowBridge działa: curl http://localhost:8080/api/health
2. Sprawdź config.properties - czy adres IP bazy jest poprawny
3. Sprawdź czy serwer HSQLDB działa na 192.168.8.48:9001

PROBLEM: Zmiany w CSV nie są widoczne
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Przyczyna: Cache w serwisach (30 sekund)
Rozwiązanie:
1. Poczekaj 30 sekund
2. Odśwież stronę (F5)
3. Wyczyść cache: SkiDataService.clearCache()

PROBLEM: CORS errors w przeglądarce
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Przyczyna: Brak nagłówków CORS
Rozwiązanie: Sprawdź czy setCorsHeaders() jest wywołane w każdym handlerze

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7.4. Monitoring i Performance                                               │
└─────────────────────────────────────────────────────────────────────────────┘

Cache TTL:
- FireSnow Bridge: Połączenia odświeżane co 2 minuty
- Express Server: Brak cache (proxy)
- Frontend Services: 30 sekund

Timeouty:
- FireSnow status check: 5 sekund
- Pozostałe: Domyślne (brak timeout)

Optymalizacje:
- Connection pooling w FireSnowBridge
- Cache w frontend services
- Fallback do CSV gdy API nie działa


═══════════════════════════════════════════════════════════════════════════════
KONIEC DOKUMENTACJI
═══════════════════════════════════════════════════════════════════════════════

Wersja: 1.0
Data: 28 października 2025

Dla pytań lub sugestii dotyczących API, skontaktuj się z zespołem rozwoju.

