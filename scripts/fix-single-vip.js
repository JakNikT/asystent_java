/**
 * Skrypt do naprawy pojedynczej narty N-0344
 */

import fs from 'fs/promises';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv');

async function fixSingleVip() {
  console.log('🔧 Naprawa N-0344 (HEAD e-MAGNUM)...\n');
  
  const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ','
  });
  
  const skis = result.data;
  const index = skis.findIndex(ski => ski.ID === 'N-0344');
  
  if (index === -1) {
    console.error('❌ Nie znaleziono narty N-0344');
    return;
  }
  
  console.log('Przed:', skis[index]);
  
  // Zmień na VIP + ustaw podstawowe dane (uniwersalne)
  skis[index].KATEGORIA = 'VIP';
  skis[index].PLEC = skis[index].PLEC || 'U';
  skis[index].PRZEZNACZENIE = skis[index].PRZEZNACZENIE || 'SLG';
  
  console.log('Po:', skis[index]);
  
  // Zapisz
  const csvContentNew = Papa.unparse(skis, {
    delimiter: ',',
    header: true,
    columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'ROK', 'KOD']
  });
  
  await fs.writeFile(CSV_PATH, csvContentNew, 'utf-8');
  
  console.log('\n✅ Narta N-0344 naprawiona!');
}

fixSingleVip().catch(error => {
  console.error('❌ Błąd:', error);
  process.exit(1);
});



