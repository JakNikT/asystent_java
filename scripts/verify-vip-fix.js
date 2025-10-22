/**
 * Skrypt weryfikacji poprawek VIP
 */

import fs from 'fs/promises';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv');

async function verifyVipFix() {
  console.log('🔍 Weryfikacja poprawek VIP w zakresie N-0250 do N-0393...\n');
  
  const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ','
  });
  
  const skis = result.data;
  
  const startIndex = skis.findIndex(ski => ski.ID === 'N-0250');
  const endIndex = skis.findIndex(ski => ski.ID === 'N-0393');
  
  const targetSkis = skis.slice(startIndex, endIndex + 1);
  
  let vipCount = 0;
  let topCount = 0;
  let vipWithData = 0;
  let vipWithoutData = 0;
  const topItems = [];
  
  targetSkis.forEach(ski => {
    if (ski.KATEGORIA === 'VIP') {
      vipCount++;
      if (ski.PRZEZNACZENIE) {
        vipWithData++;
      } else {
        vipWithoutData++;
      }
    } else if (ski.KATEGORIA === 'TOP') {
      topCount++;
      topItems.push(`${ski.ID} (${ski.KOD}): ${ski.MARKA} ${ski.MODEL} ${ski.DLUGOSC}cm`);
    }
  });
  
  console.log('📊 Statystyki zakresu N-0250 do N-0393:');
  console.log(`   Całkowita liczba nart: ${targetSkis.length}`);
  console.log(`   VIP: ${vipCount} (${(vipCount/targetSkis.length*100).toFixed(1)}%)`);
  console.log(`   ├─ VIP z danymi: ${vipWithData}`);
  console.log(`   └─ VIP bez danych: ${vipWithoutData}`);
  console.log(`   TOP: ${topCount} (${(topCount/targetSkis.length*100).toFixed(1)}%)`);
  
  if (topItems.length > 0) {
    console.log('\n⚠️  Pozostałe narty TOP:');
    topItems.forEach(item => console.log(`   - ${item}`));
  } else {
    console.log('\n✅ Wszystkie narty w zakresie są VIP!');
  }
}

verifyVipFix().catch(error => {
  console.error('❌ Błąd:', error);
  process.exit(1);
});



