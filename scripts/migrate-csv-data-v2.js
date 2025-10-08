#!/usr/bin/env node

/**
 * Skrypt migracji danych CSV - Restrukturyzacja Systemu Filtrowania Nart (v2)
 * 
 * Cel: Przekształcenie kolumny PRZEZNACZENIE i dodanie nowej kolumny ATUTY
 * 
 * Reguły konwersji:
 * - "SLG,C" → PRZEZNACZENIE="SLG", ATUTY="C"
 * - "SL,C" → PRZEZNACZENIE="SL", ATUTY="C"  
 * - "G,C" → PRZEZNACZENIE="G", ATUTY="C"
 * - "SLG" → PRZEZNACZENIE="SLG", ATUTY=""
 * - "SL" → PRZEZNACZENIE="SL", ATUTY=""
 * - "G" → PRZEZNACZENIE="G", ATUTY=""
 * - "OFF" → PRZEZNACZENIE="OFF", ATUTY=""
 */

const fs = require('fs');
const path = require('path');

// Ścieżki plików
const inputFile = path.join(__dirname, '../asystent-nart-web/public/data/NOWABAZA_final.csv');
const outputFile = path.join(__dirname, '../asystent-nart-web/public/data/NOWABAZA_final.csv');
const backupFile = path.join(__dirname, '../asystent-nart-web/public/data/NOWABAZA_final_backup.csv');

console.log('🔄 Rozpoczynam migrację danych CSV (v2)...');
console.log(`📁 Plik wejściowy: ${inputFile}`);

// Sprawdź czy plik wejściowy istnieje
if (!fs.existsSync(inputFile)) {
  console.error('❌ Błąd: Plik wejściowy nie istnieje:', inputFile);
  process.exit(1);
}

try {
  // Wczytaj dane z pliku CSV
  const csvContent = fs.readFileSync(inputFile, 'utf8');
  const lines = csvContent.trim().split('\n');
  
  console.log(`📊 Wczytano ${lines.length} linii z pliku CSV`);
  
  // Sprawdź czy plik ma już kolumnę ATUTY
  const header = lines[0];
  if (header.includes('ATUTY')) {
    console.log('⚠️  Ostrzeżenie: Plik już zawiera kolumnę ATUTY. Kończę bez zmian.');
    process.exit(0);
  }
  
  // Utwórz backup
  console.log('💾 Tworzę backup pliku...');
  fs.copyFileSync(inputFile, backupFile);
  console.log(`✅ Backup utworzony: ${backupFile}`);
  
  // Przetwórz nagłówek
  const headerColumns = header.split(',');
  const przeznaczenieIndex = headerColumns.indexOf('PRZEZNACZENIE');
  
  if (przeznaczenieIndex === -1) {
    console.error('❌ Błąd: Nie znaleziono kolumny PRZEZNACZENIE w nagłówku');
    process.exit(1);
  }
  
  // Wstaw kolumnę ATUTY po PRZEZNACZENIE
  const newHeader = [
    ...headerColumns.slice(0, przeznaczenieIndex + 1),
    'ATUTY',
    ...headerColumns.slice(przeznaczenieIndex + 1)
  ];
  
  console.log('📝 Nowy nagłówek:', newHeader.join(','));
  
  // Przetwórz dane
  const processedLines = [newHeader.join(',')];
  let convertedCount = 0;
  let skippedCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skippedCount++;
      continue;
    }
    
    // Użyj prostego parsowania CSV
    const columns = line.split(',');
    
    // Sprawdź czy linia ma wystarczającą liczbę kolumn
    if (columns.length < headerColumns.length) {
      console.warn(`⚠️  Pomijam linię ${i + 1}: za mało kolumn (${columns.length}/${headerColumns.length})`);
      skippedCount++;
      continue;
    }
    
    // Pobierz wartość PRZEZNACZENIE
    let przeznaczenie = columns[przeznaczenieIndex];
    let newPrzeznaczenie = przeznaczenie;
    let atuty = '';
    
    // Usuń cudzysłowy jeśli istnieją
    if (przeznaczenie.startsWith('"') && przeznaczenie.endsWith('"')) {
      przeznaczenie = przeznaczenie.slice(1, -1);
    }
    
    // Sprawdź czy już ma format z ATUTY (np. "SLG,SLG,C")
    if (columns.length > headerColumns.length) {
      // Format: "SLG,SLG,C" - już rozdzielone
      newPrzeznaczenie = przeznaczenie;
      atuty = columns[przeznaczenieIndex + 1] || '';
      convertedCount++;
    } else if (przeznaczenie.includes(',')) {
      // Format: "SL,C" lub "SLG,C"
      const parts = przeznaczenie.split(',').map(p => p.trim());
      if (parts.length === 2) {
        newPrzeznaczenie = parts[0]; // SL, SLG, G
        atuty = parts[1]; // C
        convertedCount++;
      } else {
        console.warn(`⚠️  Nieznany format w linii ${i + 1}: ${przeznaczenie}`);
      }
    } else {
      // Format: "SLG", "SL", "G", "OFF" - bez zmian
      newPrzeznaczenie = przeznaczenie;
      atuty = '';
    }
    
    // Zastąp PRZEZNACZENIE i wstaw ATUTY
    const newColumns = [
      ...columns.slice(0, przeznaczenieIndex),
      newPrzeznaczenie,
      atuty,
      ...columns.slice(przeznaczenieIndex + 1)
    ];
    
    processedLines.push(newColumns.join(','));
  }
  
  // Zapisz przetworzone dane
  console.log('💾 Zapisuję przetworzone dane...');
  fs.writeFileSync(outputFile, processedLines.join('\n'), 'utf8');
  
  // Podsumowanie
  console.log('\n✅ Migracja zakończona pomyślnie!');
  console.log(`📊 Statystyki:`);
  console.log(`   - Przetworzonych linii: ${processedLines.length - 1}`);
  console.log(`   - Skonwertowanych rekordów: ${convertedCount}`);
  console.log(`   - Pominiętych linii: ${skippedCount}`);
  console.log(`   - Backup: ${backupFile}`);
  console.log(`   - Nowy plik: ${outputFile}`);
  
  // Pokaż przykłady konwersji
  console.log('\n📋 Przykłady konwersji:');
  const examples = [
    { from: 'SLG,C', to: 'SLG + ATUTY=C' },
    { from: 'SL,C', to: 'SL + ATUTY=C' },
    { from: 'G,C', to: 'G + ATUTY=C' },
    { from: 'SLG', to: 'SLG + ATUTY=' },
    { from: 'SL', to: 'SL + ATUTY=' },
    { from: 'OFF', to: 'OFF + ATUTY=' }
  ];
  
  examples.forEach(example => {
    console.log(`   ${example.from} → ${example.to}`);
  });
  
} catch (error) {
  console.error('❌ Błąd podczas migracji:', error.message);
  process.exit(1);
}

