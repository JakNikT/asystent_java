# Plan: rabat, dni gratisowe i uwagi do umowy w widoku „Historia” (FireSnow)

## Context
Widok historii ([HistoryView.tsx](src/components/HistoryView.tsx)) dla umów z FireSnow pokazuje dziś tylko daty, numer umowy, sprzęt i kwotę. Pracownik chce widzieć też, **jaki rabat dostał klient**, **ile dni gratis** i **uwagi wpisane do umowy**. Dane są w bazie FireSnow, ale bridge ich nie pobiera. Archiwum MySQL (2012–2023) nie ma tych danych, więc tam nic się nie zmienia.

## Gdzie są dane (sprawdzone w `FireSnowBridge/lib/FireSport_database_4.script`)
| Informacja | Źródło | Uwagi |
|---|---|---|
| Uwagi do umowy | `ABSTRACTDOCUMENT.DESCRIPTION` (VARCHAR 4096) | np. `'WIĄZANIA S'`, `'P, sprzęt nr 1: waga 68kg'`; często NULL lub `''` |
| Rabat na całą umowę | `ABSTRACTCASHABLEDOCUMENT.PERCENTDISCOUNTHIB` (ułamek, 0.15 = 15%) i `.VALUEDISCOUNTHIB` (zł) | ID = `RENTDOCUMENT_ID`; ok. 1060 umów wypożyczenia ma rabat |
| Rabat na pozycję | `SESSIONINFOFGHJ.PERCENTDISCOUNTHIB` (ułamek) i `.VALUEDISCOUNTHIB` (zł) | np. PRICE 405, VALUEDISCOUNT 45 → PAYMENT 360 |
| Dni gratis | `SESSIONINFOFGHJ.BONUSTIME` (ms) | 86400000 = 1 dzień; ta sama wartość na wszystkich pozycjach umowy |

## Zmiany

### 1. Bridge: [FireSnowBridge.java](FireSnowBridge/src/FireSnowBridge.java)
**`HistoriaUmowyHandler`** (~linia 1333): rozszerzyć SQL:
```sql
LEFT JOIN ABSTRACTCASHABLEDOCUMENT acd ON acd.ID = si.RENTDOCUMENT_ID
-- nowe kolumny (MAX zamiast GROUP BY, żeby nie grupować po VARCHAR(4096)):
MAX(doc.DESCRIPTION)             as uwagi,
MAX(acd.PERCENTDISCOUNTHIB)      as rabat_procent_umowy,
MAX(acd.VALUEDISCOUNTHIB)        as rabat_kwota_umowy,
MAX(si.PERCENTDISCOUNTHIB)       as rabat_procent_pozycji_max,
SUM(si.VALUEDISCOUNTHIB)         as rabat_kwota_pozycji,
MAX(si.BONUSTIME)                as bonus_ms
```
Dopisać pola do JSON-a tak jak istniejące (`escapeJson` dla `uwagi`, `getDouble`/`getLong` dla liczb; NULL → 0 / `""`).

**`HistoriaSprzetHandler`** (~linia 1409): dodać `si.PERCENTDISCOUNTHIB as rabat_procent`, `si.VALUEDISCOUNTHIB as rabat_kwota` do SELECT i JSON-a (rabat dla każdej pozycji).

### 2. Typy backendu: [services.types.ts](src/server/types/services.types.ts)
- `FireSnowHistoryContract` (+ `uwagi`, `rabat_procent_umowy`, `rabat_kwota_umowy`, `rabat_procent_pozycji_max`, `rabat_kwota_pozycji`, `bonus_ms`)
- `FireSnowHistoryPosition` (+ `rabat_procent`, `rabat_kwota`)

### 3. Mapowanie: [fireSnowHistoryService.ts](src/server/services/fireSnowHistoryService.ts)
- `getClientDates`: do zwracanego obiektu dodać:
  - `rabat_procent`: `round((rabat_procent_umowy || rabat_procent_pozycji_max) * 100)`, czyli rabat procentowy umowy, a jeśli go nie ma, to największy rabat z pozycji
  - `rabat_kwota`: `rabat_kwota_umowy + rabat_kwota_pozycji` (zaokrąglone do 0,01)
  - `dni_gratis`: `Math.round(bonus_ms / DAY_MS)` (używa istniejącego `DAY_MS`)
  - `uwagi`: `(row.uwagi || '').trim()`
- `getClientEquipment`: dodać `rabat_procent` i `rabat_kwota` na pozycję. Istniejące pole `uwagi` („Oddana”/„Nie oddana”) zostaje bez zmian.
- Mała helper-funkcja `toPercent(fraction)` w tym pliku.

### 4. Interfejsy wspólne
- [historyService.ts (server)](src/server/services/historyService.ts): `ClientDate` (+ opcjonalne `rabat_procent?`, `rabat_kwota?`, `dni_gratis?`, `uwagi?`), `ClientEquipment` (+ opcjonalne `rabat_procent?`, `rabat_kwota?`). Pola są opcjonalne, więc archiwum MySQL działa jak dotąd.
- [historyService.ts (frontend)](src/services/historyService.ts): te same opcjonalne pola w `DateRange` i `HistoryEquipmentData`. `getClientDates` przekazuje je dalej sam (`{ ...d, source, client_id }`), więc nie trzeba zmieniać logiki.

### 5. UI: [HistoryView.tsx](src/components/HistoryView.tsx)
- **Krok 2 (lista umów)**: pod liczbą pozycji małe znaczniki, tylko gdy mają wartość, np. `Rabat 15%` / `Rabat 45 zł`, `+1 dzień gratis`, `📝 uwagi`. Dzięki temu widać to przy przeglądaniu listy.
- **Krok 3 (sprzęt)**: nad tabelą panel „Szczegóły umowy” (tylko dla `source === 'firesnow'`) z wierszami: Rabat (procent i/lub kwota albo „brak”), Dni gratis (liczba albo „brak”), Uwagi (pełny tekst z `whitespace-pre-wrap` albo „brak”). Styl jak istniejące kafelki (`bg-[#0f2744]/50 rounded-lg border border-white/5`).
- W tabeli sprzętu kolumna „Rabat”, tylko dla FireSnow (np. `20%` / `45 zł` / `-`).
- Mały helper `formatDiscount(procent, kwota)` w komponencie, z polską odmianą „dzień/dni”.

### 6. Testy
- [fireSnowHistoryService.test.ts](src/test/fireSnowHistoryService.test.ts): zaktualizować `toEqual` w `getClientDates` (nowe pola) i dodać przypadki:
  - rabat na umowie 0.15 → `rabat_procent: 15`; brak rabatu umowy, ale pozycja 0.2 → 20
  - `rabat_kwota_umowy 5 + rabat_kwota_pozycji 45` → 50
  - `bonus_ms 172800000` → `dni_gratis: 2`
  - `uwagi: null` → `''`, `'  WIĄZANIA S '` → `'WIĄZANIA S'`
  - `getClientEquipment` mapuje `rabat_procent` / `rabat_kwota` pozycji

## Weryfikacja
1. `npm test -- src/test/fireSnowHistoryService.test.ts src/test/historyService.test.ts`, potem `npm run typecheck` i `npm run lint`.
2. Przebudować i zrestartować bridge (`cd FireSnowBridge && start-headless.bat`), potem np. `curl "http://localhost:8081/api/historia/umowy?klient=1667"`. Umowa `WP 144/12/2023` (dok. 10060) powinna mieć `rabat_procent_umowy: 0.15` i `rabat_kwota_pozycji: 45`. Dla klienta 4280 `bonus_ms` = 86400000.
3. `npm run dev:all` → Historia → wyszukać klienta z rabatem lub uwagami → sprawdzić znaczniki na liście umów i panel „Szczegóły umowy” w kroku 3. Dla klienta tylko z archiwum MySQL nie powinno być żadnych nowych elementów.
