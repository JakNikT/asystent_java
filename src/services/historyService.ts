/**
 * Serwis do obsługi historii wypożyczeń: archiwum MySQL (2012-2023) i FireSnow (bieżące sezony)
 * Komunikacja z API historii wypożyczeń
 */

import { createLogger } from '../utils/logger';
import { toastService } from '../hooks/useToast';
import { parseApiError, handleApiError } from '../utils/apiErrorHandler';
import { AuthService } from './authService';

const API_BASE_URL = '/api';

/**
 * Źródło danych klienta: archiwum MySQL lub FireSnow
 */
export type HistorySource = 'mysql' | 'firesnow';

/**
 * Dane klienta z bazy historii
 */
export interface ClientData {
  id: number;
  nazwisko: string;
  imie: string;
  telefon: string;
  pelna_nazwa: string;
  source: HistorySource;
}

/**
 * Wynik wyszukiwania: klienci z obu źródeł + źródła, które nie odpowiedziały
 */
export interface ClientSearchResult {
  clients: ClientData[];
  unavailableSources: HistorySource[];
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
  dokument_id?: number; // Tylko FireSnow: ID umowy
  numer?: string; // Tylko FireSnow: numer umowy
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
  source: 'history' | 'firesnow';
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
   * Pobiera JSON z endpointu historii; błąd HTTP zamienia na wyjątek
   */
  private static async fetchJson<T>(url: string): Promise<T> {
    const response = await AuthService.fetch(url);

    if (!response.ok) {
      const errorMessage = await parseApiError(response);
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Wyszukuje klientów po nazwisku w FireSnow i archiwum MySQL jednocześnie
   * Lista: najpierw FireSnow (nowsze), potem archiwum. Awaria jednego źródła nie blokuje drugiego.
   * Toast błędu tylko wtedy, gdy nie odpowiedziało żadne źródło.
   */
  static async searchClients(nazwisko: string): Promise<ClientSearchResult> {
    if (!nazwisko || nazwisko.trim().length < 2) {
      return { clients: [], unavailableSources: [] };
    }

    this.logger.info('Wyszukiwanie klientów po nazwisku:', nazwisko);
    const query = `nazwisko=${encodeURIComponent(nazwisko)}`;

    const sources: HistorySource[] = ['firesnow', 'mysql'];
    const results = await Promise.allSettled([
      this.fetchJson<ClientData[]>(`${API_BASE_URL}/historia/firesnow/klienci/wyszukaj?${query}`),
      this.fetchJson<ClientData[]>(`${API_BASE_URL}/historia/klienci/wyszukaj?${query}`)
    ]);

    const clients: ClientData[] = [];
    const unavailableSources: HistorySource[] = [];
    const failures: unknown[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        clients.push(...result.value);
      } else {
        this.logger.error(`Błąd wyszukiwania klientów (${sources[index]}):`, result.reason);
        unavailableSources.push(sources[index]!);
        failures.push(result.reason);
      }
    });

    if (failures.length === results.length) {
      toastService.showError(handleApiError(failures[0], 'Nie udało się wyszukać klientów'));
    }

    this.logger.info(`Znaleziono ${clients.length} klientów`);
    return { clients, unavailableSources };
  }

  /**
   * Pobiera daty (FireSnow: umowy) wypożyczeń dla klienta z jego źródła
   * historyService.ts: Pobieranie unikalnych dat wypożyczeń dla wybranego klienta
   */
  static async getClientDates(client: ClientData): Promise<DateRange[]> {
    try {
      this.logger.debug('Pobieranie dat dla klienta ID:', client.id, 'źródło:', client.source);

      const path = client.source === 'firesnow' ? 'historia/firesnow/klient' : 'historia/klient';
      const dates = await this.fetchJson<DateRange[]>(`${API_BASE_URL}/${path}/${client.id}/daty`);

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
   * Pobiera sprzęt wypożyczony przez klienta w konkretnym okresie (FireSnow: na konkretnej umowie)
   * historyService.ts: Pobieranie sprzętu dla wybranej daty wypożyczenia
   */
  static async getClientEquipment(client: ClientData, dateRange: DateRange): Promise<HistoryEquipmentData[]> {
    try {
      this.logger.debug('Pobieranie sprzętu dla klienta ID:', client.id, 'źródło:', client.source, 'okres:', dateRange);

      let url: string;
      if (client.source === 'firesnow') {
        const queryParams = new URLSearchParams({ dokument: String(dateRange.dokument_id ?? '') });
        url = `${API_BASE_URL}/historia/firesnow/klient/${client.id}/sprzet?${queryParams.toString()}`;
      } else {
        const params: Record<string, string> = { od: dateRange.od, do: dateRange.do };
        if (dateRange.sezon) {
          params.sezon = dateRange.sezon;
        }
        url = `${API_BASE_URL}/historia/klient/${client.id}/sprzet?${new URLSearchParams(params).toString()}`;
      }

      const equipment = await this.fetchJson<HistoryEquipmentData[]>(url);
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

