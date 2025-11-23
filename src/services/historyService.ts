/**
 * Serwis do obsługi historii wypożyczeń z MySQL (2022-2023)
 * Komunikacja z API historii wypożyczeń
 */

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
  /**
   * Wyszukuje klientów po nazwisku
   * historyService.ts: Wyszukiwanie klientów w bazie historii
   */
  static async searchClients(nazwisko: string): Promise<ClientData[]> {
    if (!nazwisko || nazwisko.trim().length < 2) {
      return [];
    }

    try {
      console.log('HistoryService: Wyszukiwanie klientów po nazwisku:', nazwisko);
      
      const response = await fetch(
        `${API_BASE_URL}/historia/klienci/wyszukaj?nazwisko=${encodeURIComponent(nazwisko)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const clients = await response.json();
      console.log(`HistoryService: Znaleziono ${clients.length} klientów`);
      return clients;
    } catch (error) {
      console.error('HistoryService: Błąd wyszukiwania klientów:', error);
      throw error;
    }
  }

  /**
   * Pobiera daty wypożyczeń dla klienta
   * historyService.ts: Pobieranie unikalnych dat wypożyczeń dla wybranego klienta
   */
  static async getClientDates(clientId: number): Promise<DateRange[]> {
    try {
      console.log('HistoryService: Pobieranie dat dla klienta ID:', clientId);
      
      const response = await fetch(`${API_BASE_URL}/historia/klient/${clientId}/daty`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const dates = await response.json();
      console.log(`HistoryService: Znaleziono ${dates.length} unikalnych dat`);
      return dates;
    } catch (error) {
      console.error('HistoryService: Błąd pobierania dat klienta:', error);
      throw error;
    }
  }

  /**
   * Pobiera sprzęt wypożyczony przez klienta w konkretnym okresie
   * historyService.ts: Pobieranie sprzętu dla wybranej daty wypożyczenia
   */
  static async getClientEquipment(
    clientId: number,
    od: string,
    doDate: string
  ): Promise<HistoryEquipmentData[]> {
    try {
      console.log('HistoryService: Pobieranie sprzętu dla klienta ID:', clientId, 'od:', od, 'do:', doDate);
      
      const queryParams = new URLSearchParams({
        od: od,
        do: doDate
      });
      
      const response = await fetch(
        `${API_BASE_URL}/historia/klient/${clientId}/sprzet?${queryParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const equipment = await response.json();
      console.log(`HistoryService: Znaleziono ${equipment.length} pozycji sprzętu`);
      return equipment;
    } catch (error) {
      console.error('HistoryService: Błąd pobierania sprzętu klienta:', error);
      throw error;
    }
  }
}

