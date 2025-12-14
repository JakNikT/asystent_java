/**
 * Serwis do obsługi historii wypożyczeń z MySQL (2022-2023)
 * Komunikacja z API historii wypożyczeń
 */

import { createLogger } from '../utils/logger';
import { toastService } from '../hooks/useToast';
import { parseApiError, handleApiError } from '../utils/apiErrorHandler';

const API_BASE_URL = '/api';

/**
 * Dane klienta z bazy historii
 */
export interface ClientData {
  id: number;
  nazwisko: string;
  imie: string;
  telefon: string;
  pelna_nazwa: string;
}

/**
 * Zakres dat wypożyczenia
 */
export interface DateRange {
  od: string; // Format DD.MM.YYYY
  do: string; // Format DD.MM.YYYY
  od_iso: string; // Format ISO 8601
  do_iso: string; // Format ISO 8601
  liczba_pozycji: number;
  sezon: string;
}

/**
 * Dane sprzętu z historii wypożyczeń
 */
export interface HistoryEquipmentData {
  klient: string;
  sprzet: string;
  kod: string;
  od: string; // Format ISO 8601
  do: string; // Format ISO 8601
  cena: string;
  zaplacono: string;
  numer: string;
  typumowy: string;
  uwagi?: string;
  status?: string; // Status: "Oddane" lub "Nie oddane"
  source: 'history';
  dlugosc?: number | null;
  liczba_dni?: number;
}

/**
 * Serwis historii wypożyczeń
 */
export class HistoryService {
  // src/services/historyService.ts: Logger dla HistoryService
  private static logger = createLogger('HistoryService');

  /**
   * Wyszukuje klientów po nazwisku
   * historyService.ts: Wyszukiwanie klientów w bazie historii
   */
  static async searchClients(nazwisko: string): Promise<ClientData[]> {
    if (!nazwisko || nazwisko.trim().length < 2) {
      return [];
    }

    try {
      this.logger.info('Wyszukiwanie klientów po nazwisku:', nazwisko);

      const response = await fetch(
        `${API_BASE_URL}/historia/klienci/wyszukaj?nazwisko=${encodeURIComponent(nazwisko)}`
      );

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const clients = await response.json();
      this.logger.info(`Znaleziono ${clients.length} klientów`);
      return clients;
    } catch (error) {
      this.logger.error('Błąd wyszukiwania klientów:', error);
      const errorMessage = handleApiError(error, 'Nie udało się wyszukać klientów');
      toastService.showError(errorMessage);
      return []; // Zwróć pustą tablicę zamiast rzucać błąd
    }
  }

  /**
   * Pobiera daty wypożyczeń dla klienta
   * historyService.ts: Pobieranie unikalnych dat wypożyczeń dla wybranego klienta
   */
  static async getClientDates(clientId: number): Promise<DateRange[]> {
    try {
      this.logger.debug('Pobieranie dat dla klienta ID:', clientId);

      const response = await fetch(`${API_BASE_URL}/historia/klient/${clientId}/daty`);

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const dates = await response.json();
      this.logger.info(`Znaleziono ${dates.length} unikalnych dat`);
      return dates;
    } catch (error) {
      this.logger.error('Błąd pobierania dat klienta:', error);
      const errorMessage = handleApiError(error, 'Nie udało się załadować dat wypożyczeń');
      toastService.showError(errorMessage);
      return []; // Zwróć pustą tablicę zamiast rzucać błąd
    }
  }

  /**
   * Pobiera sprzęt wypożyczony przez klienta w konkretnym okresie
   * historyService.ts: Pobieranie sprzętu dla wybranej daty wypożyczenia
   */
  static async getClientEquipment(
    clientId: number,
    od: string,
    doDate: string,
    sezon?: string
  ): Promise<HistoryEquipmentData[]> {
    try {
      this.logger.debug('Pobieranie sprzętu dla klienta ID:', clientId, 'od:', od, 'do:', doDate, 'sezon:', sezon);

      const params: Record<string, string> = {
        od: od,
        do: doDate
      };

      if (sezon) {
        params.sezon = sezon;
      }

      const queryParams = new URLSearchParams(params);

      const response = await fetch(
        `${API_BASE_URL}/historia/klient/${clientId}/sprzet?${queryParams.toString()}`
      );

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const equipment = await response.json();
      this.logger.info(`Znaleziono ${equipment.length} pozycji sprzętu`);
      return equipment;
    } catch (error) {
      this.logger.error('Błąd pobierania sprzętu klienta:', error);
      const errorMessage = handleApiError(error, 'Nie udało się załadować sprzętu klienta');
      toastService.showError(errorMessage);
      return []; // Zwróć pustą tablicę zamiast rzucać błąd
    }
  }
}

