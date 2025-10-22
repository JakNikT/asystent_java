/**
 * Skrypt do naprawy kategorii VIP/TOP w bazie danych nart
 * 
 * Problem: W zakresie N-0250 do N-0393, te same modele nart mają:
 * - Jedna narta: VIP + pełne dane
 * - Pozostałe: TOP + brak danych
 * 
 * Rozwiązanie:
 * 1. Grupuj narty po (MARKA, MODEL, DLUGOSC)
 * 2. Jeśli w grupie jest przynajmniej jedna VIP, wszystkie powinny być VIP
 * 3. Skopiuj pełne dane z pierwszej narty VIP do pozostałych w grupie
 */

import fs from 'fs/promises';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv');
const BACKUP_PATH = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.BACKUP_' + Date.now() + '.csv');

async function fixVipCategories() {
  console.log('🔧 Naprawa kategorii VIP w bazie danych nart...\n');
  
  // 1. Wczytaj CSV
  console.log('📖 Wczytuję dane z CSV...');
  const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ','
  });
  
  const skis = result.data;
  console.log(`✅ Wczytano ${skis.length} nart\n`);
  
  // 2. Stwórz backup
  console.log('💾 Tworzę kopię zapasową...');
  await fs.writeFile(BACKUP_PATH, csvContent, 'utf-8');
  console.log(`✅ Backup zapisany: ${path.basename(BACKUP_PATH)}\n`);
  
  // 3. Filtruj zakres N-0250 do N-0393
  const startIndex = skis.findIndex(ski => ski.ID === 'N-0250');
  const endIndex = skis.findIndex(ski => ski.ID === 'N-0393');
  
  console.log(`🎯 Przetwarzam zakres: N-0250 (index ${startIndex}) do N-0393 (index ${endIndex})\n`);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('❌ Nie znaleziono zakresu N-0250 do N-0393');
    return;
  }
  
  const targetSkis = skis.slice(startIndex, endIndex + 1);
  console.log(`📊 Znaleziono ${targetSkis.length} nart w zakresie\n`);
  
  // 4. Grupuj narty po (MARKA, MODEL, DLUGOSC)
  const groups = new Map();
  
  targetSkis.forEach((ski, relativeIndex) => {
    const key = `${ski.MARKA}|${ski.MODEL}|${ski.DLUGOSC}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push({
      ski,
      originalIndex: startIndex + relativeIndex
    });
  });
  
  console.log(`🔍 Znaleziono ${groups.size} unikalnych modeli nart\n`);
  
  // 5. Napraw każdą grupę
  let fixedCount = 0;
  let groupsFixed = 0;
  
  for (const [key, skiGroup] of groups.entries()) {
    if (skiGroup.length === 1) continue; // Pojedyncze narty - pomijamy
    
    const [marka, model, dlugosc] = key.split('|');
    
    // Znajdź pierwszą nartę VIP z pełnymi danymi
    const vipReference = skiGroup.find(item => 
      item.ski.KATEGORIA === 'VIP' && 
      item.ski.POZIOM && 
      item.ski.PRZEZNACZENIE
    );
    
    // Jeśli nie ma VIP z pełnymi danymi, użyj pierwszej VIP
    const reference = vipReference || skiGroup.find(item => item.ski.KATEGORIA === 'VIP');
    
    if (!reference) {
      // Brak VIP w grupie - wszystkie są TOP, zmień pierwszą na VIP jeśli ma pełne dane
      const firstWithData = skiGroup.find(item => 
        item.ski.POZIOM && item.ski.PRZEZNACZENIE
      );
      
      if (firstWithData) {
        console.log(`⚠️  Grupa bez VIP: ${marka} ${model} ${dlugosc}cm - zmieniam pierwszą nartę na VIP`);
        skis[firstWithData.originalIndex].KATEGORIA = 'VIP';
        fixedCount++;
        groupsFixed++;
        
        // Ustaw pozostałe jako VIP + skopiuj dane
        skiGroup.forEach(item => {
          if (item.originalIndex !== firstWithData.originalIndex) {
            skis[item.originalIndex].KATEGORIA = 'VIP';
            skis[item.originalIndex].POZIOM = firstWithData.ski.POZIOM || '';
            skis[item.originalIndex].PLEC = firstWithData.ski.PLEC || '';
            skis[item.originalIndex].WAGA_MIN = firstWithData.ski.WAGA_MIN || '';
            skis[item.originalIndex].WAGA_MAX = firstWithData.ski.WAGA_MAX || '';
            skis[item.originalIndex].WZROST_MIN = firstWithData.ski.WZROST_MIN || '';
            skis[item.originalIndex].WZROST_MAX = firstWithData.ski.WZROST_MAX || '';
            skis[item.originalIndex].PRZEZNACZENIE = firstWithData.ski.PRZEZNACZENIE || '';
            skis[item.originalIndex].ATUTY = firstWithData.ski.ATUTY || '';
            fixedCount++;
          }
        });
      }
      continue;
    }
    
    // Napraw wszystkie narty w grupie
    let groupNeedsFixing = false;
    skiGroup.forEach(item => {
      if (item.ski.KATEGORIA !== 'VIP' || !item.ski.POZIOM || !item.ski.PRZEZNACZENIE) {
        groupNeedsFixing = true;
      }
    });
    
    if (groupNeedsFixing) {
      console.log(`🔧 Naprawiam grupę: ${marka} ${model} ${dlugosc}cm (${skiGroup.length} nart)`);
      groupsFixed++;
      
      skiGroup.forEach(item => {
        const needsFix = item.ski.KATEGORIA !== 'VIP' || !item.ski.POZIOM || !item.ski.PRZEZNACZENIE;
        
        if (needsFix) {
          console.log(`   ├─ ${item.ski.ID} (${item.ski.KOD}): ${item.ski.KATEGORIA} → VIP`);
          
          // Ustaw kategorię na VIP
          skis[item.originalIndex].KATEGORIA = 'VIP';
          
          // Skopiuj dane z referencyjnej narty
          if (!item.ski.POZIOM) {
            skis[item.originalIndex].POZIOM = reference.ski.POZIOM || '';
          }
          if (!item.ski.PLEC) {
            skis[item.originalIndex].PLEC = reference.ski.PLEC || '';
          }
          if (!item.ski.WAGA_MIN) {
            skis[item.originalIndex].WAGA_MIN = reference.ski.WAGA_MIN || '';
          }
          if (!item.ski.WAGA_MAX) {
            skis[item.originalIndex].WAGA_MAX = reference.ski.WAGA_MAX || '';
          }
          if (!item.ski.WZROST_MIN) {
            skis[item.originalIndex].WZROST_MIN = reference.ski.WZROST_MIN || '';
          }
          if (!item.ski.WZROST_MAX) {
            skis[item.originalIndex].WZROST_MAX = reference.ski.WZROST_MAX || '';
          }
          if (!item.ski.PRZEZNACZENIE) {
            skis[item.originalIndex].PRZEZNACZENIE = reference.ski.PRZEZNACZENIE || '';
          }
          if (!item.ski.ATUTY) {
            skis[item.originalIndex].ATUTY = reference.ski.ATUTY || '';
          }
          
          fixedCount++;
        }
      });
    }
  }
  
  console.log(`\n✅ Naprawiono ${fixedCount} nart w ${groupsFixed} grupach\n`);
  
  // 6. Zapisz naprawiony CSV
  console.log('💾 Zapisuję naprawiony plik CSV...');
  const csvContentNew = Papa.unparse(skis, {
    delimiter: ',',
    header: true,
    columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'ROK', 'KOD']
  });
  
  await fs.writeFile(CSV_PATH, csvContentNew, 'utf-8');
  console.log('✅ Plik zapisany pomyślnie!\n');
  
  console.log('🎉 Naprawa zakończona!');
  console.log(`📊 Podsumowanie:`);
  console.log(`   - Naprawionych nart: ${fixedCount}`);
  console.log(`   - Naprawionych grup: ${groupsFixed}`);
  console.log(`   - Backup: ${path.basename(BACKUP_PATH)}`);
}

// Uruchom skrypt
fixVipCategories().catch(error => {
  console.error('❌ Błąd:', error);
  process.exit(1);
});



