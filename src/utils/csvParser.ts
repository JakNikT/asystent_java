// Parser CSV dla bazy danych nart
import type { SkiData } from '../types/ski.types';

export class CSVParser {
  /**
   * Parsuje plik CSV i zwraca tablicę obiektów SkiData
   */
  static async parseCSV(csvContent: string): Promise<SkiData[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Plik CSV jest pusty lub nieprawidłowy');
    }

    // Pomijamy nagłówek (pierwsza linia)
    const dataLines = lines.slice(1);
    
    const skis: SkiData[] = [];

    for (const line of dataLines) {
      try {
        const ski = this.parseLine(line);
        if (ski) {
          skis.push(ski);
        }
      } catch (error) {
        console.error('Błąd parsowania linii:', line, error);
      }
    }

    return skis;
  }

  /**
   * Parsuje pojedynczą linię CSV
   * src/utils/csvParser.ts: Obsługuje 3 formaty:
   * - Nowy format (17 pól): ID,TYP_SPRZETU,KATEGORIA,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ATUTY,ROK,KOD
   * - Format z kodem (15 pól): ID,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ATUTY,ROK,KOD
   * - Stary format (14 pól): ID,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ROK,KOD
   */
  private static parseLine(line: string): SkiData | null {
    // src/utils/csvParser.ts: Dzieli linię zachowując przecinki w cudzysłowach
    const fields = this.splitCSVLine(line);
    
    console.log(`src/utils/csvParser.ts: Parsowanie linii z ${fields.length} polami`);
    
    if (fields.length < 14) {
      console.warn('src/utils/csvParser.ts: Zbyt mało pól w linii CSV:', fields.length);
      return null;
    }

    try {
      // NOWY FORMAT z TYP_SPRZETU i KATEGORIA (17 pól)
      if (fields.length >= 17) {
        console.log('src/utils/csvParser.ts: Wykryto nowy format (17 pól) z TYP_SPRZETU i KATEGORIA');
        return {
          ID: fields[0].trim(),
          TYP_SPRZETU: fields[1].trim() as 'NARTY' | 'BUTY' | 'DESKI' | 'BUTY_SNOWBOARD',
          KATEGORIA: fields[2].trim() as 'VIP' | 'TOP' | 'JUNIOR' | 'DOROSLE' | '',
          MARKA: fields[3].trim(),
          MODEL: fields[4].trim(),
          DLUGOSC: parseFloat(fields[5]) || 0,
          ILOSC: parseInt(fields[6]) || 1,
          POZIOM: fields[7].trim(),
          PLEC: fields[8].trim(),
          WAGA_MIN: parseInt(fields[9]) || 0,
          WAGA_MAX: parseInt(fields[10]) || 0,
          WZROST_MIN: parseInt(fields[11]) || 0,
          WZROST_MAX: parseInt(fields[12]) || 0,
          PRZEZNACZENIE: fields[13].trim(),
          ATUTY: fields[14] ? fields[14].trim() : '',
          ROK: parseInt(fields[15]) || 0,
          KOD: fields[16] ? fields[16].trim() : ''
        };
      }
      // Format z kodem (15 pól) - stara baza NOWABAZA_final.csv
      else if (fields.length >= 15) {
        console.log('src/utils/csvParser.ts: Wykryto format z kodem (15 pól)');
        return {
          ID: fields[0].trim(),
          TYP_SPRZETU: 'NARTY', // Domyślnie narty dla starej bazy
          KATEGORIA: '', // Puste dla starej bazy
          MARKA: fields[1].trim(),
          MODEL: fields[2].trim(),
          DLUGOSC: parseInt(fields[3]) || 0,
          ILOSC: parseInt(fields[4]) || 0,
          POZIOM: fields[5].trim(),
          PLEC: fields[6].trim(),
          WAGA_MIN: parseInt(fields[7]) || 0,
          WAGA_MAX: parseInt(fields[8]) || 0,
          WZROST_MIN: parseInt(fields[9]) || 0,
          WZROST_MAX: parseInt(fields[10]) || 0,
          PRZEZNACZENIE: fields[11].trim(),
          ATUTY: fields[12] ? fields[12].trim() : '',
          ROK: parseInt(fields[13]) || 2024,
          KOD: fields[14] ? fields[14].trim() : ''
        };
      } else {
        // Stary format (14 pól) - kompatybilność wsteczna
        console.log('src/utils/csvParser.ts: Wykryto stary format (14 pól)');
        const przeznaczenie = fields[11].trim();
        let newPrzeznaczenie = przeznaczenie;
        let atuty = '';
        
        if (przeznaczenie.includes(',')) {
          const parts = przeznaczenie.split(',').map(p => p.trim());
          if (parts.length === 2) {
            newPrzeznaczenie = parts[0];
            atuty = parts[1];
          }
        }
        
        return {
          ID: fields[0].trim(),
          TYP_SPRZETU: 'NARTY', // Domyślnie narty
          KATEGORIA: '', // Puste
          MARKA: fields[1].trim(),
          MODEL: fields[2].trim(),
          DLUGOSC: parseInt(fields[3]) || 0,
          ILOSC: parseInt(fields[4]) || 0,
          POZIOM: fields[5].trim(),
          PLEC: fields[6].trim(),
          WAGA_MIN: parseInt(fields[7]) || 0,
          WAGA_MAX: parseInt(fields[8]) || 0,
          WZROST_MIN: parseInt(fields[9]) || 0,
          WZROST_MAX: parseInt(fields[10]) || 0,
          PRZEZNACZENIE: newPrzeznaczenie,
          ATUTY: atuty,
          ROK: parseInt(fields[12]) || 2024,
          KOD: fields[13] ? fields[13].trim() : 'NO_CODE'
        };
      }
    } catch (error) {
      console.error('src/utils/csvParser.ts: Błąd tworzenia obiektu SkiData:', error);
      return null;
    }
  }

  /**
   * Dzieli linię CSV zachowując przecinki w cudzysłowach
   */
  private static splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Ładuje plik CSV z public/data
   * src/utils/csvParser.ts: Domyślnie wczytuje nową bazę z butami i deskami
   */
  static async loadFromPublic(filename: string = 'NOWA_BAZA_KOMPLETNA.csv'): Promise<SkiData[]> {
    try {
      const response = await fetch(`/data/${filename}`);
      
      if (!response.ok) {
        throw new Error(`Nie można załadować pliku: ${response.statusText}`);
      }

      const csvContent = await response.text();
      return this.parseCSV(csvContent);
    } catch (error) {
      console.error('Błąd ładowania CSV:', error);
      throw error;
    }
  }
}

