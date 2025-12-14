/**
 * src/services/skiDataService.ts: Klient API dla zarządzania danymi nart
 * 
 * Komunikacja z backend API do edycji i dodawania nart
 * FALLBACK: Jeśli API nie działa, wczytuje z lokalnego CSV
 */

import { createLogger } from '../utils/logger';
import { toastService } from '../hooks/useToast';
import { parseApiError, handleApiError } from '../utils/apiErrorHandler';
import type { SkiData } from '../types/ski.types';
import { CSVParser } from '../utils/csvParser';

const API_BASE_URL = '/api';
const logger = createLogger('SkiDataService');

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
      logger.debug('Używam danych z cache');
      return this.cache;
    }

    try {
      logger.info('Pobieram narty z serwera...');
      const response = await fetch(`${API_BASE_URL}/skis`);
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const skis = await response.json();
      
      // Przekonwertuj pola numeryczne
      // src/services/skiDataService.ts: Używamy parseFloat dla DLUGOSC aby zachować połówki butów (24.5)
      const processedSkis = skis.map((ski: any) => ({
        ...ski,
        DLUGOSC: parseFloat(ski.DLUGOSC) || 0,  // parseFloat zamiast parseInt dla połówki butów (24.5)
        ILOSC: parseInt(ski.ILOSC) || 0,
        WAGA_MIN: parseInt(ski.WAGA_MIN) || 0,
        WAGA_MAX: parseInt(ski.WAGA_MAX) || 0,
        WZROST_MIN: parseInt(ski.WZROST_MIN) || 0,
        WZROST_MAX: parseInt(ski.WZROST_MAX) || 0
      }));
      
      this.cache = processedSkis;
      this.lastFetch = now;
      
      logger.info(`Pobrano ${processedSkis.length} nart`);
      return processedSkis;
    } catch (error) {
      logger.error('Błąd pobierania nart z API:', error);
      
      // FALLBACK: Spróbuj wczytać z lokalnego CSV
      if (this.cache.length === 0) {
        try {
          logger.info('Próbuję wczytać z lokalnego CSV...');
          const skisFromCSV = await CSVParser.loadFromPublic();
          this.cache = skisFromCSV;
          this.lastFetch = Date.now();
          logger.info(`Załadowano ${skisFromCSV.length} nart z CSV`);
          toastService.showInfo('Używam danych z lokalnego pliku (API niedostępne)');
          return skisFromCSV;
        } catch (csvError) {
          logger.error('Błąd wczytywania CSV:', csvError);
          const errorMessage = handleApiError(csvError, 'Nie udało się załadować danych o nartach');
          toastService.showError(errorMessage);
          return [];
        }
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      logger.warn('Używam cache mimo błędu');
      const errorMessage = handleApiError(error, 'Problem z połączeniem. Używam danych z cache.');
      toastService.showInfo(errorMessage);
      return this.cache;
    }
  }

  /**
   * Aktualizuje istniejącą nartę
   */
  static async updateSki(id: string, updates: Partial<SkiData>): Promise<SkiData | null> {
    try {
      logger.info('Aktualizacja narty:', id);
      logger.debug('Wszystkie pola do aktualizacji:', updates);
      logger.debug('KATEGORIA do wysłania:', updates.KATEGORIA);
      logger.debug('TYP_SPRZETU do wysłania:', updates.TYP_SPRZETU);
      logger.debug('PRZEZNACZENIE do wysłania:', updates.PRZEZNACZENIE);
      
      const response = await fetch(`${API_BASE_URL}/skis/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const updatedSki = await response.json();
      
      // Wyczyść cache aby wymusić odświeżenie danych
      this.cache = [];
      this.lastFetch = 0;
      
      logger.info('Narta zaktualizowana pomyślnie');
      toastService.showSuccess('Narta została zaktualizowana');
      return updatedSki;
    } catch (error) {
      logger.error('Błąd aktualizacji narty:', error);
      const errorMessage = handleApiError(error, 'Nie udało się zaktualizować narty');
      toastService.showError(errorMessage);
      return null;
    }
  }

  /**
   * Dodaje nową nartę
   */
  static async addSki(skiData: Partial<SkiData>): Promise<SkiData | null> {
    try {
      logger.info('Dodawanie nowej narty:', skiData);
      
      const response = await fetch(`${API_BASE_URL}/skis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skiData)
      });
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const newSki = await response.json();
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      logger.info('Narta dodana pomyślnie:', newSki);
      toastService.showSuccess('Narta została dodana');
      return newSki;
    } catch (error) {
      logger.error('Błąd dodawania narty:', error);
      const errorMessage = handleApiError(error, 'Nie udało się dodać narty');
      toastService.showError(errorMessage);
      return null;
    }
  }

  /**
   * Aktualizuje wiele nart jednocześnie
   */
  static async updateMultipleSkis(ids: string[], updates: Partial<SkiData>): Promise<SkiData[] | null> {
    try {
      logger.info('Aktualizacja wielu nart:', ids);
      logger.debug('Dane do aktualizacji:', updates);
      
      const response = await fetch(`${API_BASE_URL}/skis/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids, updates })
      });
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const updatedSkis = await response.json();
      
      // Wyczyść cache aby wymusić odświeżenie danych
      this.cache = [];
      this.lastFetch = 0;
      
      logger.info(`${updatedSkis.length} nart zaktualizowanych pomyślnie`);
      toastService.showSuccess(`${updatedSkis.length} nart zostało zaktualizowanych`);
      return updatedSkis;
    } catch (error) {
      logger.error('Błąd aktualizacji wielu nart:', error);
      const errorMessage = handleApiError(error, 'Nie udało się zaktualizować nart');
      toastService.showError(errorMessage);
      return null;
    }
  }

  /**
   * Wyczyść cache (wymusza ponowne pobranie danych)
   */
  static clearCache(): void {
    this.cache = [];
    this.lastFetch = 0;
    logger.debug('Cache wyczyszczony');
  }

  /**
   * Sprawdź czy serwer API jest dostępny
   */
  static async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      logger.error('Serwer niedostępny:', error);
      return false;
    }
  }
}

