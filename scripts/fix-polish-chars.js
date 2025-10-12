#!/usr/bin/env node

/**
 * Skrypt naprawy polskich znaków w pliku CSV
 * Naprawia zniekształcone polskie znaki na poprawne
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Naprawiam polskie znaki w pliku CSV...');

// Ścieżki plików
const inputFile = path.join(__dirname, '../public/data/newrez_fixed.csv');
const outputFile = path.join(__dirname, '../public/data/newrez.csv');

try {
    // Wczytaj plik
    const content = fs.readFileSync(inputFile, 'utf8');
    console.log(`📁 Wczytano plik: ${inputFile}`);
    
    // Napraw polskie znaki
    const fixedContent = content
        // Napraw konkretne przypadki
        .replace(/JAďż˝Dďż˝EWSKA/g, 'JAŻDŹEWSKA')
        .replace(/ďż˝UKASIEWICZ/g, 'ŁUKASIEWICZ')
        .replace(/ďż˝/g, 'Ż')  // ďż˝ → Ż (ogólnie)
        .replace(/Ä/g, 'Ą')
        .replace(/Ä™/g, 'ę')
        .replace(/Ä†/g, 'Ć')
        .replace(/Ĺ/g, 'Ł')
        .replace(/Ĺ‚/g, 'ł')
        .replace(/Ĺš/g, 'Ś')
        .replace(/Ĺš/g, 'ś')
        .replace(/Ĺą/g, 'Ź')
        .replace(/Ĺş/g, 'ź')
        .replace(/Ăł/g, 'ó')
        .replace(/Ăł/g, 'Ó')
        .replace(/Ĺ„/g, 'Ń')
        .replace(/Ĺ„/g, 'ń')
        // Konwertuj średniki na przecinki
        .replace(/;/g, ',')
        // Konwertuj formaty cen (przecinki na kropki) - tylko dla cen, nie dat
        .replace(/(\d+),(\d{2}),/g, '$1.$2,')  // 40,00, → 40.00,
        .replace(/(\d+),(\d{2})$/g, '$1.$2')   // 40,00$ → 40.00
        // Napraw nagłówek
        .replace(/^Klient,Sprzęt$/m, 'Klient,Sprzęt,Kod,Od,Do,Użytkownik,Cena,Zapłacono,Rabat');
    
    // Zapisz naprawiony plik
    fs.writeFileSync(outputFile, fixedContent, 'utf8');
    
    console.log(`✅ Zapisano naprawiony plik: ${outputFile}`);
    console.log(`📊 Przykłady napraw:`);
    console.log(`   ďż˝UKASIEWICZ → ŁUKASIEWICZ`);
    console.log(`   SprzÄ™t → Sprzęt`);
    console.log(`   180,00 → 180.00`);
    console.log(`   ; → ,`);
    
    console.log('🎉 Naprawa zakończona pomyślnie!');
    
} catch (error) {
    console.error('❌ Błąd podczas naprawy:', error.message);
    process.exit(1);
}
