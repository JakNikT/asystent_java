// scripts/parse-data-base.js: Skrypt parsujący data_base.csv i generujący NOWA_BAZA_KOMPLETNA.csv
// 
// Ten skrypt przekonwertuje plik data_base.csv na strukturę kompatybilną z aplikacją
// Obsługuje: narty TOP, narty VIP, narty junior, buty dorosłe, buty junior, deski snowboard, buty snowboard

const fs = require('fs');
const path = require('path');

console.log('🚀 scripts/parse-data-base.js: Rozpoczynam parsowanie data_base.csv...\n');

// Ścieżki do plików
const INPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'data_base.csv');
const OLD_DATABASE = path.join(__dirname, '..', 'public', 'data', 'NOWABAZA_final.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv');

// Sprawdź czy pliki wejściowe istnieją
if (!fs.existsSync(INPUT_FILE)) {
  console.error('❌ Błąd: Nie znaleziono pliku data_base.csv');
  process.exit(1);
}

if (!fs.existsSync(OLD_DATABASE)) {
  console.error('❌ Błąd: Nie znaleziono pliku NOWABAZA_final.csv');
  process.exit(1);
}

// ==================== FUNKCJE POMOCNICZE ====================

/**
 * Wczytuje starą bazę danych (NOWABAZA_final.csv) do mapy
 * Mapowanie: KOD -> obiekt z danymi
 */
function loadOldDatabase() {
  console.log('📖 scripts/parse-data-base.js: Wczytuję starą bazę danych (NOWABAZA_final.csv)...');
  
  const content = fs.readFileSync(OLD_DATABASE, 'utf-8');
  const lines = content.trim().split('\n');
  
  const oldSkisMap = new Map();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    if (fields.length < 15) continue;
    
    const skiData = {
      ID: fields[0],
      MARKA: fields[1],
      MODEL: fields[2],
      DLUGOSC: fields[3],
      ILOSC: fields[4],
      POZIOM: fields[5],
      PLEC: fields[6],
      WAGA_MIN: fields[7],
      WAGA_MAX: fields[8],
      WZROST_MIN: fields[9],
      WZROST_MAX: fields[10],
      PRZEZNACZENIE: fields[11],
      ATUTY: fields[12] || '',
      ROK: fields[13],
      KOD: fields[14]
    };
    
    oldSkisMap.set(skiData.KOD, skiData);
  }
  
  console.log(`✅ scripts/parse-data-base.js: Wczytano ${oldSkisMap.size} rekordów ze starej bazy\n`);
  return oldSkisMap;
}

/**
 * Parsuje linię CSV z obsługą cudzysłowów
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current);
  return fields;
}

/**
 * Parsuje rozmiar buta z różnych formatów
 * Obsługuje: rozm23, rozm24,5, rozm24.5, rozm 24, rozm 24,5, rozm 24.5
 * Zwraca: liczbę (np. 23, 24.5)
 */
function parseBootSize(text) {
  // Usuń "rozm" i spacje
  let size = text.replace(/rozm\s*/i, '').trim();
  
  // Zamień przecinek na kropkę
  size = size.replace(',', '.');
  
  // Sparsuj do liczby
  const parsed = parseFloat(size);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parsuje rok z różnych formatów
 * Obsługuje: /2025, /2024, brak roku
 * Zwraca: string (np. "2025", "2024", "")
 */
function parseYear(text) {
  const match = text.match(/\/(\d{4})/);
  return match ? match[1] : '';
}

/**
 * Parsuje długość z tekstu
 * Obsługuje: "144 cm", "144cm", "120 cm"
 * Zwraca: liczbę (np. 144, 120)
 */
function parseLength(text) {
  const match = text.match(/(\d+)\s*cm/i);
  return match ? parseInt(match[1]) : 0;
}

// ==================== PARSOWANIE POSZCZEGÓLNYCH TYPÓW SPRZĘTU ====================

/**
 * Parsuje narty
 * Format: "NARTY NORDICA BELLE 73 144 cm /2025 //01"
 */
function parseSkis(text, kod, oldSkisMap) {
  console.log(`📝 scripts/parse-data-base.js: Parsuję narty: "${text.substring(0, 50)}..."`);
  
  // Usuń "NARTY " z początku
  let remaining = text.replace(/^NARTY\s+/i, '');
  
  // Wyciągnij rok
  const rok = parseYear(remaining);
  
  // Wyciągnij długość
  const dlugosc = parseLength(remaining);
  
  // Usuń długość i rok z tekstu
  remaining = remaining.replace(/\d+\s*cm/i, '').replace(/\/\d{4}/, '').trim();
  
  // Usuń numer sztuki (//01, /01, etc.)
  remaining = remaining.replace(/\/+\d+$/, '').trim();
  
  // Rozdziel markę i model
  // Pierwsza część to marka (pierwsze słowo lub dwa słowa dla marki)
  const parts = remaining.split(/\s+/);
  let marka = '';
  let model = '';
  
  if (parts.length > 0) {
    marka = parts[0]; // Pierwsza część to zawsze marka
    model = parts.slice(1).join(' '); // Reszta to model
  }
  
  // Spróbuj znaleźć w starej bazie po kodzie
  const oldSki = oldSkisMap.get(kod);
  
  let kategoria = '';
  let poziom = '';
  let plec = 'U';
  let waga_min = '';
  let waga_max = '';
  let wzrost_min = '';
  let wzrost_max = '';
  let przeznaczenie = '';
  let atuty = '';
  
  if (oldSki) {
    // Znaleziono w starej bazie - przepisz parametry
    console.log(`  ✅ scripts/parse-data-base.js: Znaleziono w starej bazie (kod: ${kod})`);
    poziom = oldSki.POZIOM;
    plec = oldSki.PLEC;
    waga_min = oldSki.WAGA_MIN;
    waga_max = oldSki.WAGA_MAX;
    wzrost_min = oldSki.WZROST_MIN;
    wzrost_max = oldSki.WZROST_MAX;
    przeznaczenie = oldSki.PRZEZNACZENIE;
    atuty = oldSki.ATUTY;
    
    // Określ kategorię na podstawie poziomu
    if (poziom && (poziom.includes('4') || poziom.includes('5') || poziom.includes('6'))) {
      kategoria = 'VIP';
    } else if (poziom && (poziom.includes('1') || poziom.includes('2') || poziom.includes('3'))) {
      kategoria = 'TOP';
    }
  } else {
    console.log(`  ⚠️  scripts/parse-data-base.js: Nie znaleziono w starej bazie (kod: ${kod})`);
  }
  
  return {
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: kategoria,
    MARKA: marka,
    MODEL: model,
    DLUGOSC: dlugosc,
    ILOSC: 1,
    POZIOM: poziom,
    PLEC: plec,
    WAGA_MIN: waga_min,
    WAGA_MAX: waga_max,
    WZROST_MIN: wzrost_min,
    WZROST_MAX: wzrost_max,
    PRZEZNACZENIE: przeznaczenie,
    ATUTY: atuty,
    ROK: rok,
    KOD: kod
  };
}

/**
 * Parsuje buty
 * Format: "BUTY HEAD EDGE LYT 7 W R rozm23 /2025 //01"
 * Format: "BUTY SALOMON T1 RT JR rozm15 /2024 //01"
 */
function parseBoots(text, kod, kategoria) {
  console.log(`📝 scripts/parse-data-base.js: Parsuję buty (${kategoria}): "${text.substring(0, 50)}..."`);
  
  // Usuń "BUTY " z początku
  let remaining = text.replace(/^BUTY\s+/i, '');
  
  // Wyciągnij rok
  const rok = parseYear(remaining);
  
  // Wyciągnij rozmiar
  const rozmiarMatch = remaining.match(/rozm\s*[\d.,]+/i);
  const rozmiar = rozmiarMatch ? parseBootSize(rozmiarMatch[0]) : 0;
  
  // Usuń rozmiar, rok i numer sztuki z tekstu
  remaining = remaining.replace(/rozm\s*[\d.,]+/i, '').replace(/\/\d{4}/, '').replace(/\/+\d+$/, '').trim();
  
  // Rozdziel markę i model
  const parts = remaining.split(/\s+/);
  let marka = '';
  let model = '';
  
  if (parts.length > 0) {
    marka = parts[0]; // Pierwsza część to zawsze marka
    model = parts.slice(1).join(' '); // Reszta to model
  }
  
  return {
    TYP_SPRZETU: 'BUTY',
    KATEGORIA: kategoria,
    MARKA: marka,
    MODEL: model,
    DLUGOSC: rozmiar,
    ILOSC: 1,
    POZIOM: '',
    PLEC: 'U',
    WAGA_MIN: '',
    WAGA_MAX: '',
    WZROST_MIN: '',
    WZROST_MAX: '',
    PRZEZNACZENIE: '',
    ATUTY: '',
    ROK: rok,
    KOD: kod
  };
}

/**
 * Parsuje deski snowboardowe
 * Format: "DESKA SNOWBOARDOWA HEAD FLOCKA LFW 4D 120cm //01"
 * Format: "SNOWBOARD HEAD FLOCKA LFW 140cm /2018 //002"
 * Format: "DESKA NOWA SNOWB. HEAD PRIDE 2.0 AQUA 142cm /2025 //01"
 */
function parseSnowboard(text, kod) {
  console.log(`📝 scripts/parse-data-base.js: Parsuję deskę snowboardową: "${text.substring(0, 50)}..."`);
  
  // Usuń prefiksy
  let remaining = text.replace(/^DESKA\s+SNOWBOARDOWA\s+/i, '')
                      .replace(/^DESKA\s+NOWA\s+SNOWB\.\s+/i, '')
                      .replace(/^SNOWBOARD\s+/i, '');
  
  // Wyciągnij rok
  const rok = parseYear(remaining);
  
  // Wyciągnij długość
  const dlugosc = parseLength(remaining);
  
  // Usuń długość, rok i numer sztuki z tekstu
  remaining = remaining.replace(/\d+\s*cm/i, '').replace(/\/\d{4}/, '').replace(/\/+\d+$/, '').trim();
  
  // Rozdziel markę i model
  const parts = remaining.split(/\s+/);
  let marka = '';
  let model = '';
  
  if (parts.length > 0) {
    marka = parts[0];
    model = parts.slice(1).join(' ');
  }
  
  return {
    TYP_SPRZETU: 'DESKI',
    KATEGORIA: '',
    MARKA: marka,
    MODEL: model,
    DLUGOSC: dlugosc,
    ILOSC: 1,
    POZIOM: '',
    PLEC: 'U',
    WAGA_MIN: '',
    WAGA_MAX: '',
    WZROST_MIN: '',
    WZROST_MAX: '',
    PRZEZNACZENIE: '',
    ATUTY: '',
    ROK: rok,
    KOD: kod
  };
}

/**
 * Parsuje buty snowboardowe
 * Format: "BUTY HEAD 4D rozm23 /2025 //01"
 */
function parseSnowboardBoots(text, kod) {
  console.log(`📝 scripts/parse-data-base.js: Parsuję buty snowboardowe: "${text.substring(0, 50)}..."`);
  
  // Usuń "BUTY " z początku
  let remaining = text.replace(/^BUTY\s+/i, '');
  
  // Wyciągnij rok
  const rok = parseYear(remaining);
  
  // Wyciągnij rozmiar
  const rozmiarMatch = remaining.match(/rozm\s*[\d.,]+/i);
  const rozmiar = rozmiarMatch ? parseBootSize(rozmiarMatch[0]) : 0;
  
  // Usuń rozmiar, rok i numer sztuki z tekstu
  remaining = remaining.replace(/rozm\s*[\d.,]+/i, '').replace(/\/\d{4}/, '').replace(/\/+\d+$/, '').trim();
  
  // Rozdziel markę i model
  const parts = remaining.split(/\s+/);
  let marka = '';
  let model = '';
  
  if (parts.length > 0) {
    marka = parts[0];
    model = parts.slice(1).join(' ');
  }
  
  return {
    TYP_SPRZETU: 'BUTY_SNOWBOARD',
    KATEGORIA: '',
    MARKA: marka,
    MODEL: model,
    DLUGOSC: rozmiar,
    ILOSC: 1,
    POZIOM: '',
    PLEC: 'U',
    WAGA_MIN: '',
    WAGA_MAX: '',
    WZROST_MIN: '',
    WZROST_MAX: '',
    PRZEZNACZENIE: '',
    ATUTY: '',
    ROK: rok,
    KOD: kod
  };
}

// ==================== GŁÓWNA LOGIKA PARSOWANIA ====================

function main() {
  console.log('📂 scripts/parse-data-base.js: Wczytuję pliki...\n');
  
  // Wczytaj starą bazę danych
  const oldSkisMap = loadOldDatabase();
  
  // Wczytaj nowy plik data_base.csv
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  
  console.log(`📊 scripts/parse-data-base.js: Wczytano ${lines.length} linii z data_base.csv\n`);
  console.log('🔄 scripts/parse-data-base.js: Rozpoczynam parsowanie...\n');
  
  const parsedData = [];
  let counters = {
    narty: 0,
    buty: 0,
    deski: 0,
    butySnowboard: 0
  };
  
  // Pomijamy nagłówek (linia 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Pomiń puste linie
    if (!line || line === ',,,') continue;
    
    const fields = parseCSVLine(line);
    if (fields.length < 2) continue;
    
    const sprzet = fields[0].trim();
    const kod = fields[1].trim();
    
    if (!sprzet || !kod) continue;
    
    let parsed = null;
    
    // Określ typ sprzętu i kategorię na podstawie linii
    if (sprzet.startsWith('NARTY')) {
      // Narty - określ kategorię na podstawie mapowania ze starą bazą
      parsed = parseSkis(sprzet, kod, oldSkisMap);
      
      // Jeśli nie ma kategorii (nie znaleziono w starej bazie), ustaw na TOP lub JUNIOR
      if (!parsed.KATEGORIA) {
        if (sprzet.includes('JR') || sprzet.includes('JUNIOR')) {
          parsed.KATEGORIA = 'JUNIOR';
        } else {
          parsed.KATEGORIA = 'TOP';
        }
      }
      
      counters.narty++;
      parsed.ID = `N-${String(counters.narty).padStart(4, '0')}`;
      
    } else if (sprzet.startsWith('BUTY')) {
      // Sprawdź czy to buty snowboardowe czy narciarskie
      const isSnowboard = sprzet.includes('4D') || 
                          sprzet.includes('SNOWBOARD') ||
                          (i >= 1568); // Buty snowboard zaczynają się od linii ~1568
      
      if (isSnowboard) {
        parsed = parseSnowboardBoots(sprzet, kod);
        counters.butySnowboard++;
        parsed.ID = `BS-${String(counters.butySnowboard).padStart(4, '0')}`;
      } else {
        // Określ kategorię butów narciarskich
        const kategoria = (sprzet.includes('JR') || sprzet.includes('JUNIOR') || i >= 1132) ? 'JUNIOR' : 'DOROSLE';
        parsed = parseBoots(sprzet, kod, kategoria);
        counters.buty++;
        parsed.ID = `B-${String(counters.buty).padStart(4, '0')}`;
      }
      
    } else if (sprzet.includes('DESKA') || sprzet.startsWith('SNOWBOARD')) {
      parsed = parseSnowboard(sprzet, kod);
      counters.deski++;
      parsed.ID = `D-${String(counters.deski).padStart(4, '0')}`;
    }
    
    if (parsed) {
      parsedData.push(parsed);
    }
  }
  
  console.log('\n✅ scripts/parse-data-base.js: Parsowanie zakończone!\n');
  console.log('📊 Statystyki:');
  console.log(`   - Narty: ${counters.narty}`);
  console.log(`   - Buty narciarskie: ${counters.buty}`);
  console.log(`   - Deski snowboardowe: ${counters.deski}`);
  console.log(`   - Buty snowboardowe: ${counters.butySnowboard}`);
  console.log(`   - RAZEM: ${parsedData.length} rekordów\n`);
  
  // Zapisz do pliku CSV
  console.log(`💾 scripts/parse-data-base.js: Zapisuję do ${OUTPUT_FILE}...\n`);
  
  const header = 'ID,TYP_SPRZETU,KATEGORIA,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ATUTY,ROK,KOD\n';
  
  const csvLines = parsedData.map(item => {
    return [
      item.ID,
      item.TYP_SPRZETU,
      item.KATEGORIA,
      item.MARKA,
      item.MODEL,
      item.DLUGOSC,
      item.ILOSC,
      item.POZIOM,
      item.PLEC,
      item.WAGA_MIN,
      item.WAGA_MAX,
      item.WZROST_MIN,
      item.WZROST_MAX,
      item.PRZEZNACZENIE,
      item.ATUTY,
      item.ROK,
      item.KOD
    ].join(',');
  });
  
  const output = header + csvLines.join('\n');
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  
  console.log('✅ scripts/parse-data-base.js: Plik zapisany pomyślnie!\n');
  console.log(`📄 Wygenerowano: ${OUTPUT_FILE}\n`);
  console.log('🎉 scripts/parse-data-base.js: Proces zakończony sukcesem!\n');
}

// Uruchom główną funkcję
main();

