/**
 * src/services/skiDataService.ts: Klient API dla zarządzania danymi nart
 * 
 * Komunikacja z backend API do edycji i dodawania nart
 */

import type { SkiData } from '../types/ski.types';

const API_BASE_URL = '/api';

/**
 * Serwis do zarządzania danymi nart przez API
 */
export class SkiDataService {
  private static cache: SkiData[] = [];
  private static lastFetch: number = 0;
  private static readonly CACHE_DURATION = 30000; // 30 sekund

  /**
   * Pobiera wszystkie narty z serwera (z cache)
   */
  static async getAllSkis(): Promise<SkiData[]> {
    const now = Date.now();
    
    // Użyj cache jeśli dane są świeże
    if (this.cache.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      console.log('SkiDataService: Używam danych z cache');
      return this.cache;
    }

    try {
      console.log('SkiDataService: Pobieram narty z serwera...');
      const response = await fetch(`${API_BASE_URL}/skis`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const skis = await response.json();
      
      // Przekonwertuj pola numeryczne
      const processedSkis = skis.map((ski: any) => ({
        ...ski,
        DLUGOSC: parseInt(ski.DLUGOSC) || 0,
        ILOSC: parseInt(ski.ILOSC) || 0,
        WAGA_MIN: parseInt(ski.WAGA_MIN) || 0,
        WAGA_MAX: parseInt(ski.WAGA_MAX) || 0,
        WZROST_MIN: parseInt(ski.WZROST_MIN) || 0,
        WZROST_MAX: parseInt(ski.WZROST_MAX) || 0,
        ROK: parseInt(ski.ROK) || new Date().getFullYear()
      }));
      
      this.cache = processedSkis;
      this.lastFetch = now;
      
      console.log(`SkiDataService: Pobrano ${processedSkis.length} nart`);
      return processedSkis;
    } catch (error) {
      console.error('SkiDataService: Błąd pobierania nart:', error);
      
      // Jeśli cache jest pusty, zwróć pustą tablicę
      if (this.cache.length === 0) {
        return [];
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      console.log('SkiDataService: Używam cache mimo błędu');
      return this.cache;
    }
  }

  /**
   * Aktualizuje istniejącą nartę
   */
  static async updateSki(id: string, updates: Partial<SkiData>): Promise<SkiData | null> {
    try {
      console.log('SkiDataService: Aktualizacja narty:', id, updates);
      
      const response = await fetch(`${API_BASE_URL}/skis/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedSki = await response.json();
      
      // Wyczyść cache aby wymusić odświeżenie danych
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('SkiDataService: Narta zaktualizowana pomyślnie');
      return updatedSki;
    } catch (error) {
      console.error('SkiDataService: Błąd aktualizacji narty:', error);
      return null;
    }
  }

  /**
   * Dodaje nową nartę
   */
  static async addSki(skiData: Partial<SkiData>): Promise<SkiData | null> {
    try {
      console.log('SkiDataService: Dodawanie nowej narty:', skiData);
      
      const response = await fetch(`${API_BASE_URL}/skis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skiData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newSki = await response.json();
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('SkiDataService: Narta dodana pomyślnie:', newSki);
      return newSki;
    } catch (error) {
      console.error('SkiDataService: Błąd dodawania narty:', error);
      return null;
    }
  }

  /**
   * Wyczyść cache (wymusza ponowne pobranie danych)
   */
  static clearCache(): void {
    this.cache = [];
    this.lastFetch = 0;
    console.log('SkiDataService: Cache wyczyszczony');
  }

  /**
   * Sprawdź czy serwer API jest dostępny
   */
  static async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('SkiDataService: Serwer niedostępny:', error);
      return false;
    }
  }
}

