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
   */
  private static parseLine(line: string): SkiData | null {
    // Dzieli linię zachowując przecinki w cudzysłowach
    const fields = this.splitCSVLine(line);
    
    // Sprawdź czy ma nowy format (z ATUTY) czy stary
    const hasAtuty = fields.length >= 15;
    
    if (fields.length < 14) {
      return null;
    }

    try {
      // Nowy format: ID,MARKA,MODEL,DLUGOSC,ILOSC,POZIOM,PLEC,WAGA_MIN,WAGA_MAX,WZROST_MIN,WZROST_MAX,PRZEZNACZENIE,ATUTY,ROK,UWAGI
      if (hasAtuty) {
        return {
          ID: fields[0].trim(),
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
          UWAGI: fields[14] ? fields[14].trim() : ''
        };
      } else {
        // Stary format - kompatybilność wsteczna
        // Sprawdź czy PRZEZNACZENIE zawiera przecinek (format "SLG,C")
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
          UWAGI: fields[13] ? fields[13].trim() : ''
        };
      }
    } catch (error) {
      console.error('Błąd tworzenia obiektu SkiData:', error);
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
   */
  static async loadFromPublic(filename: string = 'NOWABAZA_final.csv'): Promise<SkiData[]> {
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

