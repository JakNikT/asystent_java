/**
 * src/test/historyService.test.ts: Wyszukiwanie klientów w historii z dwóch źródeł (FireSnow + archiwum MySQL)
 * - awaria jednego źródła nie blokuje drugiego, - toast tylko gdy padną oba, - wybór endpointu wg źródła klienta
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const authFetch = vi.fn();
const showError = vi.fn();

vi.mock('../services/authService', () => ({
  AuthService: { fetch: (...args: unknown[]) => authFetch(...args) }
}));

vi.mock('../hooks/useToast', () => ({
  toastService: { showError: (...args: unknown[]) => showError(...args) }
}));

import { HistoryService } from '../services/historyService';
import type { ClientData, DateRange } from '../services/historyService';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const fsClient: ClientData = { id: 1, nazwisko: 'KOWALSKI', imie: 'JAN', telefon: '', pelna_nazwa: 'KOWALSKI JAN', source: 'firesnow' };
const dbClient: ClientData = { ...fsClient, id: 1, pelna_nazwa: 'Jan Kowalski', source: 'mysql' };

// Odpowiedź wg adresu: wartość Error → odrzucone połączenie
const routeResponses = (routes: Record<string, unknown | Error>) => {
  authFetch.mockImplementation(async (url: string) => {
    const key = Object.keys(routes).find(k => url.startsWith(k));
    if (!key) throw new Error(`nieoczekiwany adres ${url}`);
    const value = routes[key];
    if (value instanceof Error) throw value;
    return json(value);
  });
};

beforeEach(() => {
  authFetch.mockReset();
  showError.mockReset();
});

describe('HistoryService.searchClients', () => {
  it('łączy oba źródła: FireSnow pierwszy, potem archiwum', async () => {
    routeResponses({
      '/api/historia/firesnow/klienci/wyszukaj': [fsClient],
      '/api/historia/klienci/wyszukaj': [dbClient]
    });

    const result = await HistoryService.searchClients('kowal');

    expect(result.clients.map(c => c.source)).toEqual(['firesnow', 'mysql']);
    expect(result.unavailableSources).toEqual([]);
    expect(showError).not.toHaveBeenCalled();
  });

  it('FireSnow odrzucony: zwraca klientów archiwum i wskazuje niedostępne źródło bez toasta', async () => {
    routeResponses({
      '/api/historia/firesnow/klienci/wyszukaj': new Error('fetch failed'),
      '/api/historia/klienci/wyszukaj': [dbClient]
    });

    const result = await HistoryService.searchClients('kowal');

    expect(result.clients).toEqual([dbClient]);
    expect(result.unavailableSources).toEqual(['firesnow']);
    expect(showError).not.toHaveBeenCalled();
  });

  it('archiwum zwraca 500: klienci FireSnow zostają, niedostępne = mysql', async () => {
    authFetch.mockImplementation(async (url: string) =>
      url.startsWith('/api/historia/firesnow') ? json([fsClient]) : json({ error: 'Błąd' }, 500)
    );

    const result = await HistoryService.searchClients('kowal');

    expect(result.clients).toEqual([fsClient]);
    expect(result.unavailableSources).toEqual(['mysql']);
    expect(showError).not.toHaveBeenCalled();
  });

  it('oba źródła odrzucone: pusta lista, oba niedostępne i jeden toast', async () => {
    routeResponses({
      '/api/historia/firesnow/klienci/wyszukaj': new Error('fetch failed'),
      '/api/historia/klienci/wyszukaj': new Error('fetch failed')
    });

    const result = await HistoryService.searchClients('kowal');

    expect(result.clients).toEqual([]);
    expect(result.unavailableSources).toEqual(['firesnow', 'mysql']);
    expect(showError).toHaveBeenCalledTimes(1);
  });

  it('zapytanie krótsze niż 2 znaki nie odpytuje żadnego źródła', async () => {
    const result = await HistoryService.searchClients(' k');

    expect(result).toEqual({ clients: [], unavailableSources: [] });
    expect(authFetch).not.toHaveBeenCalled();
  });
});

describe('HistoryService: endpoint wg źródła klienta', () => {
  const contract: DateRange = {
    od: '01.10.2026', do: 'w trakcie', od_iso: '2026-10-01T09:00:00', do_iso: '', liczba_pozycji: 2,
    sezon: '2026/27', dokument_id: 132251, numer: 'WP 1/10/2026'
  };

  it('klient FireSnow: daty i sprzęt z tras firesnow, sprzęt po dokument_id', async () => {
    authFetch.mockResolvedValue(json([]));

    await HistoryService.getClientDates(fsClient);
    await HistoryService.getClientEquipment(fsClient, contract);

    expect(authFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/historia/firesnow/klient/1/daty',
      '/api/historia/firesnow/klient/1/sprzet?dokument=132251'
    ]);
  });

  it('klient archiwum: dotychczasowe trasy z od/do/sezon', async () => {
    authFetch.mockResolvedValue(json([]));

    await HistoryService.getClientDates(dbClient);
    await HistoryService.getClientEquipment(dbClient, { ...contract, od: '01.01.2023', do: '05.01.2023', sezon: '22/23', dokument_id: undefined });

    expect(authFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/historia/klient/1/daty',
      '/api/historia/klient/1/sprzet?od=01.01.2023&do=05.01.2023&sezon=22%2F23'
    ]);
  });
});
