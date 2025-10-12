/**
 * Skrypt do naprawienia kodowania polskich znaków w pliku newrez.csv
 * Konwertuje z Windows-1250 na UTF-8
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixCsvEncoding() {
  try {
    const inputPath = path.join(__dirname, '../public/data/newrez.csv');
    const outputPath = path.join(__dirname, '../public/data/newrez_fixed.csv');
    
    console.log('🔧 Naprawiam kodowanie pliku newrez.csv...');
    
    // Wczytaj plik jako buffer (binarnie)
    const buffer = fs.readFileSync(inputPath);
    
    // Konwertuj z Windows-1250 na UTF-8
    const text = iconv.decode(buffer, 'windows-1250');
    
    // Usuń BOM (Byte Order Mark) jeśli istnieje - różne warianty
    let cleanText = text
      .replace(/^\uFEFF/, '')  // UTF-8 BOM
      .replace(/^\uFFFE/, '')  // UTF-16 LE BOM
      .replace(/^\uFEFF/, '')  // UTF-16 BE BOM
      .replace(/^ď»ż/, '');    // Widoczny BOM
    
    // Napraw polskie znaki ręcznie
    const fixedText = cleanText
      .replace(/Sprz[^\s]*t/g, 'Sprzęt')
      .replace(/U[^\s]*ytkownik/g, 'Użytkownik')
      .replace(/Zap[^\s]*acono/g, 'Zapłacono')
      .replace(/SKARBI[^\s]*SKI/g, 'SKARBIŃSKI')
      .replace(/B[^\s]*BEL/g, 'BĄBEL')
      .replace(/CEGIO[^\s]*KA/g, 'CEGIOŁKA')
      .replace(/CHE[^\s]*CHOWSKI/g, 'CHEŁCHOWSKI')
      .replace(/CITKOWSKI S[^\s]*AWOMIR/g, 'CITKOWSKI SŁAWOMIR')
      .replace(/BIA[^\s]*Y/g, 'BIAŁY');
    
    // Zapisz naprawiony plik
    fs.writeFileSync(outputPath, fixedText, 'utf8');
    
    console.log('✅ Plik naprawiony i zapisany jako newrez_fixed.csv');
    console.log('📁 Lokalizacja:', outputPath);
    
    // Pokaż pierwsze kilka linii
    const lines = fixedText.split('\n').slice(0, 3);
    console.log('📋 Pierwsze linie naprawionego pliku:');
    lines.forEach((line, i) => {
      console.log(`${i + 1}: ${line}`);
    });
    
  } catch (error) {
    console.error('❌ Błąd podczas naprawiania kodowania:', error);
  }
}

// Uruchom skrypt
fixCsvEncoding();
