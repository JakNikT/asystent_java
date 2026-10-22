/**
 * src/test/historyService.test.ts: Wyszukiwanie klientów w historii z dwóch źródeł (FireSnow + archiwum MySQL)
 * - awaria jednego źródła nie blokuje drugiego, - toast tylko gdy padną oba,
 * - łączenie tego samego klienta (nazwa + telefon) w jedną pozycję, - okresy z obu źródeł, sprzęt wg źródła okresu
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
import type { ClientData, ClientGroup, DateRange, HistoryDateRange } from '../services/historyService';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const client = (source: ClientData['source'], id: number, nazwisko: string, imie: string, telefon: string): ClientData => ({
  id,
  nazwisko,
  imie,
  telefon,
  pelna_nazwa: source === 'mysql' ? `${imie} ${nazwisko}` : `${nazwisko} ${imie}`,
  source
});

const fsReimann = client('firesnow', 36841, 'REIMANN', 'ELWIRA', '693-508-412');
const dbReimann = client('mysql', 10063, 'Reimann', 'Elwira', '693508412');

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

const search = async (fs: ClientData[], db: ClientData[]) => {
  routeResponses({
    '/api/historia/firesnow/klienci/wyszukaj': fs,
    '/api/historia/klienci/wyszukaj': db
  });
  return HistoryService.searchClients('kowal');
};

beforeEach(() => {
  authFetch.mockReset();
  showError.mockReset();
});

describe('HistoryService.searchClients', () => {
  it('ten sam klient w obu źródłach: jedna grupa z oboma źródłami i nazwą z archiwum', async () => {
    const result = await search([fsReimann], [dbReimann]);

    expect(result.clients).toHaveLength(1);
    const group = result.clients[0]!;
    expect(group.members).toEqual([fsReimann, dbReimann]);
    expect(group.sources).toEqual(['firesnow', 'mysql']);
    expect(group.pelna_nazwa).toBe('Elwira Reimann');
    expect(group.telefon).toBe('693-508-412');
    expect(result.unavailableSources).toEqual([]);
    expect(showError).not.toHaveBeenCalled();
  });

  it('ta sama nazwa, różny telefon: dwie grupy', async () => {
    const result = await search(
      [client('firesnow', 1, 'ŁĄCZKOWSKI', 'PRZEMYSŁAW', '502-399-095')],
      [client('mysql', 2, 'Łączkowski', 'Przemysław', '605264677')]
    );

    expect(result.clients).toHaveLength(2);
  });

  it('klient bez telefonu (pusty, "0") nie łączy się z nikim', async () => {
    const noPhone = await search([client('firesnow', 1, 'NOWAK', 'JAN', '')], [client('mysql', 2, 'Nowak', 'Jan', '')]);
    expect(noPhone.clients).toHaveLength(2);

    const zero = await search([client('firesnow', 1, 'NOWAK', 'JAN', '601-421-398')], [client('mysql', 2, 'Nowak', 'Jan', '0')]);
    expect(zero.clients).toHaveLength(2);
  });

  it('nazwisko dwuczłonowe rozbite inaczej w FireSnow i archiwum: jedna grupa', async () => {
    const result = await search(
      [client('firesnow', 1, 'KOWALSKA', 'NOWAK ANNA', '600100200')],
      [client('mysql', 2, 'Kowalska Nowak', 'Anna', '600100200')]
    );

    expect(result.clients).toHaveLength(1);
  });

  it('różnice w diakrytykach i wielkości liter nie rozdzielają klienta', async () => {
    const result = await search(
      [client('firesnow', 1, 'ŁĘCKI', 'ŻANETA', '600100200')],
      [client('mysql', 2, 'Lecki', 'Zaneta', '600100200')]
    );

    expect(result.clients).toHaveLength(1);
  });

  it('telefon z prefiksem kraju łączy się z numerem bez prefiksu', async () => {
    const result = await search(
      [client('firesnow', 1, 'REIMANN', 'ELWIRA', '+48 693 508 412')],
      [dbReimann]
    );

    expect(result.clients).toHaveLength(1);
  });

  it('FireSnow odrzucony: zwraca klientów archiwum i wskazuje niedostępne źródło bez toasta', async () => {
    routeResponses({
      '/api/historia/firesnow/klienci/wyszukaj': new Error('fetch failed'),
      '/api/historia/klienci/wyszukaj': [dbReimann]
    });

    const result = await HistoryService.searchClients('reimann');

    expect(result.clients.map(g => g.members)).toEqual([[dbReimann]]);
    expect(result.clients[0]!.sources).toEqual(['mysql']);
    expect(result.unavailableSources).toEqual(['firesnow']);
    expect(showError).not.toHaveBeenCalled();
  });

  it('archiwum zwraca 500: klienci FireSnow zostają, niedostępne = mysql', async () => {
    authFetch.mockImplementation(async (url: string) =>
      url.startsWith('/api/historia/firesnow') ? json([fsReimann]) : json({ error: 'Błąd' }, 500)
    );

    const result = await HistoryService.searchClients('reimann');

    expect(result.clients.map(g => g.members)).toEqual([[fsReimann]]);
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

const range = (od_iso: string, extra: Partial<DateRange> = {}): DateRange => ({
  od: od_iso.slice(0, 10),
  do: od_iso.slice(0, 10),
  od_iso,
  do_iso: od_iso,
  liczba_pozycji: 1,
  sezon: '',
  ...extra
});

describe('HistoryService.getClientDates', () => {
  const group: ClientGroup = {
    key: 'ELWIRA REIMANN|693508412',
    pelna_nazwa: 'Elwira Reimann',
    telefon: '693-508-412',
    members: [fsReimann, dbReimann],
    sources: ['firesnow', 'mysql']
  };

  const FS_DATES = '/api/historia/firesnow/klient/36841/daty';
  const DB_DATES = '/api/historia/klient/10063/daty';

  it('scala okresy z obu źródeł malejąco po dacie i oznacza źródło oraz ID rekordu', async () => {
    routeResponses({
      [FS_DATES]: [
        range('2025-04-13T10:00:00', { dokument_id: 111 }),
        range('2026-04-13T10:00:00', { dokument_id: 222 })
      ],
      [DB_DATES]: [range('2023-04-21T10:00:00', { sezon: '2223' })]
    });

    const result = await HistoryService.getClientDates(group);

    expect(authFetch.mock.calls.map(c => c[0]).sort()).toEqual([FS_DATES, DB_DATES]);
    expect(result.unavailableSources).toEqual([]);
    expect(result.dates.map(d => [d.od_iso.slice(0, 4), d.source, d.client_id])).toEqual([
      ['2026', 'firesnow', 36841],
      ['2025', 'firesnow', 36841],
      ['2023', 'mysql', 10063]
    ]);
  });

  it('FireSnow odrzucony: okresy z archiwum, niedostępne = firesnow, bez toasta', async () => {
    routeResponses({
      [FS_DATES]: new Error('fetch failed'),
      [DB_DATES]: [range('2023-04-21T10:00:00')]
    });

    const result = await HistoryService.getClientDates(group);

    expect(result.dates.map(d => d.source)).toEqual(['mysql']);
    expect(result.unavailableSources).toEqual(['firesnow']);
    expect(showError).not.toHaveBeenCalled();
  });

  it('oba źródła odrzucone: brak okresów i jeden toast', async () => {
    routeResponses({
      [FS_DATES]: new Error('fetch failed'),
      [DB_DATES]: new Error('fetch failed')
    });

    const result = await HistoryService.getClientDates(group);

    expect(result.dates).toEqual([]);
    expect(result.unavailableSources).toEqual(['firesnow', 'mysql']);
    expect(showError).toHaveBeenCalledTimes(1);
  });
});

describe('HistoryService.getClientEquipment', () => {
  it('FireSnow: trasa firesnow z dokument_id i client_id z okresu', async () => {
    authFetch.mockResolvedValue(json([]));
    const dateRange: HistoryDateRange = {
      ...range('2026-04-13T10:00:00', { dokument_id: 130332 }),
      source: 'firesnow',
      client_id: 36841
    };

    await HistoryService.getClientEquipment(dateRange);

    expect(authFetch.mock.calls.map(c => c[0])).toEqual(['/api/historia/firesnow/klient/36841/sprzet?dokument=130332']);
  });

  it('archiwum: trasa historii z od/do/sezon i client_id z okresu', async () => {
    authFetch.mockResolvedValue(json([]));
    const dateRange: HistoryDateRange = {
      ...range('2023-04-21T10:00:00', { od: '21.04.2023', do: '08.05.2023', sezon: '2223' }),
      source: 'mysql',
      client_id: 10063
    };

    await HistoryService.getClientEquipment(dateRange);

    expect(authFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/historia/klient/10063/sprzet?od=21.04.2023&do=08.05.2023&sezon=2223'
    ]);
  });
});
