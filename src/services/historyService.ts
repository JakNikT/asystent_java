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
 * Klient widoczny jako jedna pozycja: rekordy z FireSnow i archiwum o tym samym nazwisku, imieniu i telefonie
 */
export interface ClientGroup {
  key: string;
  pelna_nazwa: string;
  telefon: string;
  members: ClientData[];
  sources: HistorySource[];
}

/**
 * Klucz nazwy: nazwisko + imię bez diakrytyków, wielkości liter i kolejności tokenów
 * (FireSnow zwraca "NAZWISKO IMIĘ", a nazwiska dwuczłonowe mogą trafić częściowo do imienia)
 */
export function normalizeName(c: ClientData): string {
  return `${c.nazwisko} ${c.imie}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/Ł/g, 'L')
    .replace(/[^A-Z]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * Klucz telefonu: ostatnie 9 cyfr; brak, "0" i śmieci (<9 cyfr) dają pusty klucz
 */
export function phoneKey(telefon: string): string {
  const digits = (telefon ?? '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
}

const SOURCE_ORDER: HistorySource[] = ['firesnow', 'mysql'];

/**
 * Łączy rekordy z obu źródeł w jedną pozycję, gdy zgadza się nazwa i telefon.
 * Klient bez telefonu nigdy nie łączy się z innym rekordem.
 */
export function groupClients(clients: ClientData[]): ClientGroup[] {
  const groups = new Map<string, ClientData[]>();

  for (const c of clients) {
    const phone = phoneKey(c.telefon);
    const key = phone ? `${normalizeName(c)}|${phone}` : `${normalizeName(c)}|id:${c.source}-${c.id}`;
    const members = groups.get(key);
    if (members) {
      members.push(c);
    } else {
      groups.set(key, [c]);
    }
  }

  const entries = Array.from(groups, ([key, members]) => {
    const display = members.find((m) => m.source === 'mysql') ?? members[0]!;
    const group: ClientGroup = {
      key,
      pelna_nazwa: display.pelna_nazwa,
      telefon: members.find((m) => m.telefon)?.telefon ?? '',
      members,
      sources: SOURCE_ORDER.filter((s) => members.some((m) => m.source === s))
    };
    return { group, sortKey: `${display.nazwisko} ${display.imie}` };
  });

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'pl', { sensitivity: 'base' }));
  return entries.map((e) => e.group);
}

/**
 * Wynik wyszukiwania: klienci z obu źródeł + źródła, które nie odpowiedziały
 */
export interface ClientSearchResult {
  clients: ClientGroup[];
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
 * Okres wypożyczenia z informacją o źródle i rekordzie klienta, z którego pochodzi
 */
export interface HistoryDateRange extends DateRange {
  source: HistorySource;
  client_id: number;
}

/**
 * Wynik pobierania dat: okresy ze wszystkich źródeł + źródła, które nie odpowiedziały
 */
export interface ClientDatesResult {
  dates: HistoryDateRange[];
  unavailableSources: HistorySource[];
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

    const groups = groupClients(clients);
    this.logger.info(`Znaleziono ${groups.length} klientów`);
    return { clients: groups, unavailableSources };
  }

  /**
   * Pobiera daty (FireSnow: umowy) wypożyczeń dla wszystkich rekordów klienta z obu źródeł
   * Awaria jednego źródła nie blokuje drugiego; wynik posortowany malejąco po dacie rozpoczęcia.
   * Toast błędu tylko wtedy, gdy nie odpowiedziało żadne źródło.
   */
  static async getClientDates(client: ClientGroup): Promise<ClientDatesResult> {
    this.logger.debug('Pobieranie dat dla klienta:', client.key);

    const results = await Promise.allSettled(
      client.members.map((member) => {
        const path = member.source === 'firesnow' ? 'historia/firesnow/klient' : 'historia/klient';
        return this.fetchJson<DateRange[]>(`${API_BASE_URL}/${path}/${member.id}/daty`);
      })
    );

    const dates: HistoryDateRange[] = [];
    const unavailableSources: HistorySource[] = [];
    const failures: unknown[] = [];

    results.forEach((result, index) => {
      const member = client.members[index]!;
      if (result.status === 'fulfilled') {
        dates.push(...result.value.map((d) => ({ ...d, source: member.source, client_id: member.id })));
      } else {
        this.logger.error(`Błąd pobierania dat klienta (${member.source}):`, result.reason);
        if (!unavailableSources.includes(member.source)) {
          unavailableSources.push(member.source);
        }
        failures.push(result.reason);
      }
    });

    if (failures.length === results.length) {
      toastService.showError(handleApiError(failures[0], 'Nie udało się załadować dat wypożyczeń'));
    }

    dates.sort((a, b) => (b.od_iso ?? '').localeCompare(a.od_iso ?? ''));
    this.logger.info(`Znaleziono ${dates.length} unikalnych dat`);
    return { dates, unavailableSources };
  }

  /**
   * Pobiera sprzęt wypożyczony w konkretnym okresie (FireSnow: na konkretnej umowie)
   * Źródło i ID klienta pochodzą z wybranego okresu.
   */
  static async getClientEquipment(dateRange: HistoryDateRange): Promise<HistoryEquipmentData[]> {
    try {
      this.logger.debug('Pobieranie sprzętu dla klienta ID:', dateRange.client_id, 'źródło:', dateRange.source, 'okres:', dateRange);

      let url: string;
      if (dateRange.source === 'firesnow') {
        const queryParams = new URLSearchParams({ dokument: String(dateRange.dokument_id ?? '') });
        url = `${API_BASE_URL}/historia/firesnow/klient/${dateRange.client_id}/sprzet?${queryParams.toString()}`;
      } else {
        const params: Record<string, string> = { od: dateRange.od, do: dateRange.do };
        if (dateRange.sezon) {
          params.sezon = dateRange.sezon;
        }
        url = `${API_BASE_URL}/historia/klient/${dateRange.client_id}/sprzet?${new URLSearchParams(params).toString()}`;
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

