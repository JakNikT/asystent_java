#!/usr/bin/env node

/**
 * Skrypt konwersji newrez_fixed.csv do formatu kompatybilnego z aplikacją
 * Konwertuje średniki na przecinki i formaty cen
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Konwersja newrez_fixed.csv do formatu aplikacji...');

// Ścieżki plików
const inputFile = path.join(__dirname, '../public/data/newrez_fixed.csv');
const outputFile = path.join(__dirname, '../public/data/newrez.csv');

try {
    // Wczytaj plik
    const content = fs.readFileSync(inputFile, 'utf8');
    console.log(`📁 Wczytano plik: ${inputFile}`);
    
    // Podziel na linie
    const lines = content.split('\n');
    console.log(`📊 Liczba linii: ${lines.length}`);
    
    // Konwertuj każdą linię
    const convertedLines = lines.map((line, index) => {
        if (line.trim() === '') return line; // Pusta linia
        
        // Podziel średnikami
        const parts = line.split(';');
        
        // Napraw nagłówek (linia 1 ma tylko 2 kolumny, ale dane mają 9)
        if (index === 0 && parts.length === 2) {
            const fullHeader = 'Klient,Sprzęt,Kod,Od,Do,Użytkownik,Cena,Zapłacono,Rabat';
            console.log(`🔧 Naprawiono nagłówek: ${line} → ${fullHeader}`);
            return fullHeader;
        }
        
        // Konwertuj formaty cen (przecinki na kropki)
        const convertedParts = parts.map(part => {
            // Jeśli to wygląda jak cena (liczba z przecinkiem)
            if (/^\d+,\d{2}$/.test(part.trim())) {
                return part.replace(',', '.');
            }
            return part;
        });
        
        // Połącz przecinkami
        return convertedParts.join(',');
    });
    
    // Zapisz skonwertowany plik
    const outputContent = convertedLines.join('\n');
    fs.writeFileSync(outputFile, outputContent, 'utf8');
    
    console.log(`✅ Zapisano skonwertowany plik: ${outputFile}`);
    console.log(`📊 Przykład konwersji:`);
    console.log(`   PRZED: Klient;Sprzęt;Kod;Od;Do;Użytkownik;Cena;Zapłacono;Rabat`);
    console.log(`   PO:    Klient,Sprzęt,Kod,Od,Do,Użytkownik,Cena,Zapłacono,Rabat`);
    console.log(`   PRZED: 180,00`);
    console.log(`   PO:    180.00`);
    
    console.log('🎉 Konwersja zakończona pomyślnie!');
    
} catch (error) {
    console.error('❌ Błąd podczas konwersji:', error.message);
    process.exit(1);
}
