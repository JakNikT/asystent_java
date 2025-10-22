/**
 * Skrypt do naprawy kategorii VIP/TOP na podstawie innych długości tego samego modelu
 * 
 * Logika:
 * - Jeśli ten sam model (MARKA + MODEL) w innych długościach jest VIP, 
 *   to wszystkie długości powinny być VIP
 * - Skopiuj dane z najbliższej długości VIP tego samego modelu
 */

import fs from 'fs/promises';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv');
const BACKUP_PATH = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.BACKUP_MODEL_' + Date.now() + '.csv');

async function fixVipByModel() {
  console.log('🔧 Naprawa kategorii VIP na podstawie innych długości modelu...\n');
  
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
  
  // 4. Dla każdego modelu, sprawdź czy inne długości są VIP
  const modelGroups = new Map(); // Mapa: "MARKA|MODEL" -> tablica nart
  
  // Grupuj wszystkie narty w bazie po modelu (bez długości)
  skis.forEach((ski, index) => {
    if (ski.TYP_SPRZETU === 'NARTY') {
      const modelKey = `${ski.MARKA}|${ski.MODEL}`;
      if (!modelGroups.has(modelKey)) {
        modelGroups.set(modelKey, []);
      }
      modelGroups.get(modelKey).push({ ski, index });
    }
  });
  
  console.log(`🔍 Znaleziono ${modelGroups.size} unikalnych modeli w całej bazie\n`);
  
  // 5. Napraw narty w zakresie docelowym
  let fixedCount = 0;
  
  for (let i = 0; i < targetSkis.length; i++) {
    const targetSki = targetSkis[i];
    const originalIndex = startIndex + i;
    
    // Pomiń narty, które już są VIP z danymi
    if (targetSki.KATEGORIA === 'VIP' && targetSki.PRZEZNACZENIE) {
      continue;
    }
    
    const modelKey = `${targetSki.MARKA}|${targetSki.MODEL}`;
    const allSameModel = modelGroups.get(modelKey) || [];
    
    // Znajdź narty VIP tego samego modelu z pełnymi danymi
    // (wystarczy PRZEZNACZENIE - POZIOM może być pusty)
    const vipWithData = allSameModel.filter(item => 
      item.ski.KATEGORIA === 'VIP' && 
      item.ski.PRZEZNACZENIE
    );
    
    if (vipWithData.length === 0) {
      continue; // Brak VIP tego modelu - pomijamy
    }
    
    // Znajdź najbliższą długość VIP
    const targetLength = parseInt(targetSki.DLUGOSC) || 0;
    let closestVip = vipWithData[0];
    let minDiff = Math.abs(parseInt(closestVip.ski.DLUGOSC) - targetLength);
    
    vipWithData.forEach(item => {
      const diff = Math.abs(parseInt(item.ski.DLUGOSC) - targetLength);
      if (diff < minDiff) {
        minDiff = diff;
        closestVip = item;
      }
    });
    
    // Napraw nartę
    if (targetSki.KATEGORIA !== 'VIP' || !targetSki.PRZEZNACZENIE) {
      console.log(`🔧 ${targetSki.ID} (${targetSki.KOD}): ${targetSki.MARKA} ${targetSki.MODEL} ${targetSki.DLUGOSC}cm`);
      console.log(`   ├─ KATEGORIA: ${targetSki.KATEGORIA} → VIP`);
      console.log(`   └─ Kopiuję dane z długości ${closestVip.ski.DLUGOSC}cm`);
      
      // Ustaw kategorię na VIP
      skis[originalIndex].KATEGORIA = 'VIP';
      
      // Skopiuj dane z najbliższej VIP
      if (!targetSki.POZIOM) {
        skis[originalIndex].POZIOM = closestVip.ski.POZIOM || '';
      }
      if (!targetSki.PLEC) {
        skis[originalIndex].PLEC = closestVip.ski.PLEC || '';
      }
      if (!targetSki.WAGA_MIN) {
        skis[originalIndex].WAGA_MIN = closestVip.ski.WAGA_MIN || '';
      }
      if (!targetSki.WAGA_MAX) {
        skis[originalIndex].WAGA_MAX = closestVip.ski.WAGA_MAX || '';
      }
      if (!targetSki.WZROST_MIN) {
        skis[originalIndex].WZROST_MIN = closestVip.ski.WZROST_MIN || '';
      }
      if (!targetSki.WZROST_MAX) {
        skis[originalIndex].WZROST_MAX = closestVip.ski.WZROST_MAX || '';
      }
      if (!targetSki.PRZEZNACZENIE) {
        skis[originalIndex].PRZEZNACZENIE = closestVip.ski.PRZEZNACZENIE || '';
      }
      if (!targetSki.ATUTY) {
        skis[originalIndex].ATUTY = closestVip.ski.ATUTY || '';
      }
      
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Naprawiono ${fixedCount} nart\n`);
  
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
  console.log(`   - Backup: ${path.basename(BACKUP_PATH)}`);
}

// Uruchom skrypt
fixVipByModel().catch(error => {
  console.error('❌ Błąd:', error);
  process.exit(1);
});

