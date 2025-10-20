# Skrypt parsowania bazy danych sprzętu

## Opis

Skrypt `parse-data-base.cjs` automatycznie parsuje plik `data_base.csv` i tworzy ustrukturyzowaną bazę danych dla wszystkich typów sprzętu narciarskiego i snowboardowego.

## Typy sprzętu obsługiwane przez skrypt

- ⛷️ **Narty** (VIP, TOP, JUNIOR)
- 🥾 **Buty narciarskie** (DOROSLE, JUNIOR)
- 🏂 **Deski snowboardowe**
- 👢 **Buty snowboardowe**

## Jak używać

### 1. Przygotowanie

Upewnij się, że masz:
- Plik `public/data/data_base.csv` - źródłowe dane sprzętu
- Plik `public/data/NOWABAZA_final.csv` - stara baza nart VIP (do mapowania parametrów)

### 2. Uruchomienie skryptu

```bash
node scripts/parse-data-base.cjs
```

### 3. Wynik

Skrypt utworzy plik: `public/data/NOWA_BAZA_KOMPLETNA.csv`

## Struktura wyjściowego pliku CSV

```
ID,TYP_SPRZETU,KATEGORIA,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ATUTY,ROK,KOD
```

### Pola

| Pole | Typ | Opis | Przykład |
|------|-----|------|----------|
| ID | string | Unikalny identyfikator | N-0001, B-0001, D-0001, BS-0001 |
| TYP_SPRZETU | string | Typ sprzętu | NARTY, BUTY, DESKI, BUTY_SNOWBOARD |
| KATEGORIA | string | Kategoria sprzętu | VIP, TOP, JUNIOR, DOROSLE, (puste) |
| MARKA | string | Marka sprzętu | NORDICA, HEAD, ATOMIC |
| MODEL | string | Model sprzętu | BELLE 73, EDGE LYT 7 W R |
| DLUGOSC | number | Długość (narty/deski) lub rozmiar (buty) w cm | 144, 23, 120 |
| ILOSC | number | Zawsze 1 (każda sztuka osobno) | 1 |
| POZIOM | string | Poziom zaawansowania | 1-6, 1K-6K, 1M-6M |
| PLEC | string | Płeć | M, K, U |
| WAGA_MIN | number | Minimalna waga (kg) | 55 |
| WAGA_MAX | number | Maksymalna waga (kg) | 90 |
| WZROST_MIN | number | Minimalny wzrost (cm) | 155 |
| WZROST_MAX | number | Maksymalny wzrost (cm) | 165 |
| PRZEZNACZENIE | string | Styl jazdy | SL, G, SLG, OFF |
| ATUTY | string | Dodatkowe cechy | C, premium |
| ROK | number | Rok produkcji | 2024, 2025 |
| KOD | string | Unikalny kod sprzętu | A01428, BO21, 65692 |

## Funkcje skryptu

### 1. Automatyczne rozpoznawanie typu sprzętu

Skrypt rozpoznaje typ sprzętu na podstawie prefiksu nazwy:
- `NARTY ...` → TYP_SPRZETU: NARTY
- `BUTY ... JR` → TYP_SPRZETU: BUTY, KATEGORIA: JUNIOR
- `BUTY HEAD 4D` → TYP_SPRZETU: BUTY_SNOWBOARD
- `DESKA SNOWBOARDOWA ...` → TYP_SPRZETU: DESKI

### 2. Parsowanie rozmiarów butów

Skrypt obsługuje różne formaty rozmiarów:
- `rozm23` → 23
- `rozm24.5` → 24.5
- `rozm24,5` → 24.5
- `rozm 24` → 24
- `rozm 24.5` → 24.5

### 3. Mapowanie parametrów z starej bazy

Dla nart VIP (zaawansowanych 4-6):
- Szuka w `NOWABAZA_final.csv` po kodzie
- Jeśli znajdzie → przepisuje wszystkie parametry (POZIOM, PLEC, WAGA, WZROST, PRZEZNACZENIE, ATUTY)
- Jeśli nie znajdzie → pozostawia pola puste

### 4. Wykrywanie kategorii

- **Narty VIP**: Automatycznie rozpoznawane po poziomie 4-6 ze starej bazy
- **Narty TOP**: Wszystkie pozostałe narty (bez parametrów)
- **Narty JUNIOR**: Rozpoznawane po słowie "JUNIOR" lub "JR" w nazwie
- **Buty DOROSLE**: Buty bez "JR" w nazwie (do linii ~1132)
- **Buty JUNIOR**: Buty z "JR" w nazwie (linie 1132+)

### 5. Generowanie ID

Format ID zależny od typu:
- **Narty**: N-0001, N-0002, N-0003, ...
- **Buty**: B-0001, B-0002, B-0003, ...
- **Deski**: D-0001, D-0002, D-0003, ...
- **Buty snowboard**: BS-0001, BS-0002, BS-0003, ...

## Przykłady parsowania

### Narty
```
Input:  "NARTY NORDICA BELLE 73 144 cm /2025 //01", "A01428"
Output: N-0001,NARTY,TOP,NORDICA,BELLE 73,144,1,,U,,,,,,,2025,A01428
```

### Buty dorosłe
```
Input:  "BUTY HEAD EDGE LYT 7 W R rozm23 /2025 //01", "BO21"
Output: B-0001,BUTY,DOROSLE,HEAD,EDGE LYT 7 W R,23,1,,U,,,,,,,2025,BO21
```

### Buty junior
```
Input:  "BUTY SALOMON T1 RT JR rozm15 /2024 //01", "B4277"
Output: B-0132,BUTY,JUNIOR,SALOMON,T1 RT JR,15,1,,U,,,,,,,2024,B4277
```

### Deska snowboardowa
```
Input:  "DESKA SNOWBOARDOWA HEAD FLOCKA LFW 4D 120cm //01", "65692"
Output: D-0001,DESKI,,HEAD,FLOCKA LFW 4D,120,1,,U,,,,,,,,65692
```

### Buty snowboardowe
```
Input:  "BUTY HEAD 4D rozm23 /2025 //01", "2363274"
Output: BS-0001,BUTY_SNOWBOARD,,HEAD,4D,23,1,,U,,,,,,,2025,2363274
```

## Statystyki (przykładowe)

Po uruchomieniu skryptu na pełnej bazie:
- 📊 **1632 rekordów** w sumie
- ⛷️ **728 nart** (VIP + TOP + JUNIOR)
- 🥾 **716 butów narciarskich**
- 🏂 **99 desek snowboardowych**
- 👢 **89 butów snowboardowych**

## Rozwiązywanie problemów

### Błąd: "Nie znaleziono pliku data_base.csv"
```bash
# Upewnij się, że plik istnieje:
ls public/data/data_base.csv

# Jeśli nie, skopiuj z dist:
cp dist/data/data_base.csv public/data/
```

### Błąd: "Nie znaleziono pliku NOWABAZA_final.csv"
```bash
# Upewnij się, że plik istnieje:
ls public/data/NOWABAZA_final.csv
```

### Ostrzeżenie: "Nie znaleziono w starej bazie"
To normalne dla nowych nart TOP i JUNIOR - ich parametry będą puste i trzeba je uzupełnić ręcznie.

## Uwagi

1. **Backup**: Skrypt nie nadpisuje istniejących plików - tworzy nowy plik `NOWA_BAZA_KOMPLETNA.csv`
2. **Parametry puste**: Dla nart TOP, JUNIOR i wszystkich butów/desek parametry (POZIOM, WAGA, WZROST) są puste - trzeba je uzupełnić ręcznie
3. **Kompatybilność**: Parser CSV w aplikacji obsługuje zarówno stary jak i nowy format
4. **Kody**: Każdy sprzęt musi mieć unikalny kod - używany przez system rezerwacji

## Autor

Ten skrypt został stworzony jako część projektu rozszerzenia bazy danych aplikacji "Asystent Doboru Nart".

Data utworzenia: 2025-10-20

