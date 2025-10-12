/**
 * Skrypt mapowania kodów nart z nartyvip.csv do NOWABAZA_final.csv
 * 
 * Cel: Dodanie kolumny "KOD" do bazy nart i rozdzielenie rekordów na poszczególne sztuki
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ścieżki do plików
const nartyvipPath = path.join(__dirname, '../public/data/nartyvip.csv');
const nowabazaPath = path.join(__dirname, '../public/data/NOWABAZA_final.csv');
const outputPath = path.join(__dirname, '../public/data/NOWABAZA_with_codes.csv');

console.log('🚀 Rozpoczynam mapowanie kodów nart...');

// Funkcja parsowania nazwy narty z nartyvip.csv
function parseSkiName(fullName) {
  // Różne formaty:
  // "NARTY KNEISSL MY STAR XC 144cm /2024 //01"
  // "NARTY ATOMIC CLOUD Q14 REVOSHOCK 144cm /2025 /01"
  // "NARTY AK PINK 146cm /2025 //01"
  // "NARTY SAKOMON S/MAX ENDUERANCE 155 cm 2025 //01"
  // "NARTY VOLKL RACETIGER SRC 153cm /2025 ///01"
  
  // Usuń prefix "NARTY "
  let cleanName = fullName.replace(/^NARTY\s+/, '').trim();
  
  // Wyodrębnij długość (różne formaty: "144cm", "155 cm")
  const dlugoscMatch = cleanName.match(/(\d+)\s*cm/);
  if (!dlugoscMatch) {
    console.warn(`⚠️ Nie można znaleźć długości w: ${fullName}`);
    return null;
  }
  
  const dlugosc = parseInt(dlugoscMatch[1]);
  
  // Znajdź pozycję długości i usuń wszystko po niej
  const dlugoscIndex = cleanName.indexOf(dlugoscMatch[0]);
  cleanName = cleanName.substring(0, dlugoscIndex).trim();
  
  // Wyodrębnij markę i model
  const parts = cleanName.split(/\s+/);
  if (parts.length < 2) {
    console.warn(`⚠️ Za mało części w nazwie: ${fullName}`);
    return null;
  }
  
  const marka = parts[0].toUpperCase();
  const model = parts.slice(1).join(' ').toUpperCase();
  
  return {
    marka,
    model,
    dlugosc
  };
}

// Funkcja normalizacji nazw dla porównania
function normalizeName(name) {
  return name.toUpperCase().replace(/\s+/g, ' ').trim();
}

// Wczytanie danych z nartyvip.csv
function loadNartyvipData() {
  console.log('📖 Wczytuję dane z nartyvip.csv...');
  
  const content = fs.readFileSync(nartyvipPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const skiCodes = new Map();
  
  for (const line of lines) {
    const [fullName, kod] = line.split(',');
    if (!fullName || !kod) continue;
    
    const parsed = parseSkiName(fullName.trim());
    if (!parsed) continue;
    
    const key = `${parsed.marka}|${parsed.model}|${parsed.dlugosc}`;
    
    if (!skiCodes.has(key)) {
      skiCodes.set(key, []);
    }
    skiCodes.get(key).push(kod.trim());
  }
  
  console.log(`✅ Wczytano ${skiCodes.size} unikalnych nart z ${lines.length} wpisów`);
  return skiCodes;
}

// Wczytanie danych z NOWABAZA_final.csv
function loadNowabazaData() {
  console.log('📖 Wczytuję dane z NOWABAZA_final.csv...');
  
  const content = fs.readFileSync(nowabazaPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const header = lines[0];
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 15) continue;
    
    const record = {
      ID: values[0],
      MARKA: values[1],
      MODEL: values[2],
      DLUGOSC: parseInt(values[3]),
      ILOSC: parseInt(values[4]),
      POZIOM: values[5],
      PLEC: values[6],
      WAGA_MIN: parseInt(values[7]),
      WAGA_MAX: parseInt(values[8]),
      WZROST_MIN: parseInt(values[9]),
      WZROST_MAX: parseInt(values[10]),
      PRZEZNACZENIE: values[11],
      ATUTY: values[12] || '',
      ROK: parseInt(values[13]),
      UWAGI: values[14] || ''
    };
    
    data.push(record);
  }
  
  console.log(`✅ Wczytano ${data.length} rekordów z bazy nart`);
  return { header, data };
}

// Mapowanie i rozdzielanie rekordów
function mapAndSplitRecords(nowabazaData, skiCodes) {
  console.log('🔗 Mapuję kody i rozdzielam rekordy...');
  
  const { header, data } = nowabazaData;
  const newRecords = [];
  let newId = 1;
  let mappedCount = 0;
  let unmappedCount = 0;
  
  for (const record of data) {
    const key = `${record.MARKA}|${record.MODEL}|${record.DLUGOSC}`;
    const codes = skiCodes.get(key);
    
    if (codes && codes.length > 0) {
      // Znaleziono kody - rozdziel rekord na poszczególne sztuki
      for (let i = 0; i < record.ILOSC; i++) {
        const kod = codes[i] || `AUTO_${record.ID}_${i + 1}`;
        
        const newRecord = {
          ...record,
          ID: newId++,
          ILOSC: 1, // Każda sztuka jako osobny rekord
          KOD: kod
        };
        
        newRecords.push(newRecord);
      }
      mappedCount++;
    } else {
      // Nie znaleziono kodów - zachowaj oryginalny rekord
      const newRecord = {
        ...record,
        ID: newId++,
        KOD: `NO_CODE_${record.ID}`
      };
      
      newRecords.push(newRecord);
      unmappedCount++;
      
      console.warn(`⚠️ Nie znaleziono kodów dla: ${record.MARKA} ${record.MODEL} ${record.DLUGOSC}cm`);
    }
  }
  
  console.log(`✅ Zmapowano ${mappedCount} nart, ${unmappedCount} bez kodów`);
  console.log(`📊 Utworzono ${newRecords.length} rekordów (było ${data.length})`);
  
  return newRecords;
}

// Zapisanie wyników
function saveResults(records) {
  console.log('💾 Zapisuję wyniki...');
  
  const header = 'ID,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ATUTY,ROK,KOD';
  
  const csvContent = [
    header,
    ...records.map(record => {
      // Upewnij się że wszystkie wartości są poprawnie sformatowane z cudzysłowami
      const values = [
        record.ID,
        `"${record.MARKA}"`,
        `"${record.MODEL}"`,
        record.DLUGOSC,
        record.ILOSC,
        `"${record.POZIOM}"`,
        `"${record.PLEC}"`,
        record.WAGA_MIN,
        record.WAGA_MAX,
        record.WZROST_MIN,
        record.WZROST_MAX,
        `"${record.PRZEZNACZENIE}"`,
        `"${record.ATUTY || ''}"`,
        record.ROK,
        `"${record.KOD}"`
      ];
      return values.join(',');
    })
  ].join('\n');
  
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  
  console.log(`✅ Zapisano wyniki do: ${outputPath}`);
  console.log(`📊 Łącznie ${records.length} rekordów z kodami`);
}

// Główna funkcja
function main() {
  try {
    const skiCodes = loadNartyvipData();
    const nowabazaData = loadNowabazaData();
    const newRecords = mapAndSplitRecords(nowabazaData, skiCodes);
    saveResults(newRecords);
    
    console.log('🎉 Mapowanie zakończone pomyślnie!');
    console.log('\n📋 Następne kroki:');
    console.log('1. Sprawdź plik NOWABAZA_with_codes.csv');
    console.log('2. Zastąp NOWABAZA_final.csv nowym plikiem');
    console.log('3. Zaktualizuj aplikację o pole KOD');
    
  } catch (error) {
    console.error('❌ Błąd podczas mapowania:', error);
    process.exit(1);
  }
}

// Uruchomienie skryptu
main();