// @vitest-environment node
/**
 * src/test/fireSnowHistoryService.test.ts: Mapowanie historii FireSnow na kształty archiwum MySQL
 * - format dat i sezon, - aktywna umowa (STOPTIME = 0), - liczba dni, - PROMOTOR, - wyłączone FireSnow API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const searchHistoryClients = vi.fn();
const getHistoryContracts = vi.fn();
const getHistoryEquipment = vi.fn();
const mockConfig = vi.hoisted(() => ({ useFireSnowApi: true }));

vi.mock('../server/config/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('../server/config/env', () => ({ config: mockConfig }));

vi.mock('../server/services/fireSnowService', () => ({
  fireSnowService: {
    searchHistoryClients: (...args: unknown[]) => searchHistoryClients(...args),
    getHistoryContracts: (...args: unknown[]) => getHistoryContracts(...args),
    getHistoryEquipment: (...args: unknown[]) => getHistoryEquipment(...args)
  }
}));

import { fireSnowHistoryService, seasonForTimestamp } from '../server/services/fireSnowHistoryService';

// Czas lokalny, tak jak w serwisie (strefa serwera)
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  searchHistoryClients.mockReset();
  getHistoryContracts.mockReset();
  getHistoryEquipment.mockReset();
  mockConfig.useFireSnowApi = true;
});

describe('seasonForTimestamp', () => {
  it('30 czerwca należy do sezonu kończącego się w tym roku, 1 lipca otwiera nowy', () => {
    expect(seasonForTimestamp(local(2025, 6, 30, 23))).toBe('2024/25');
    expect(seasonForTimestamp(local(2025, 7, 1, 0))).toBe('2025/26');
  });

  it('styczeń należy do sezonu zaczętego w poprzednim roku, a sezon przez rok 2099/2100 daje 99/00', () => {
    expect(seasonForTimestamp(local(2026, 1, 15))).toBe('2025/26');
    expect(seasonForTimestamp(local(2099, 12, 1))).toBe('2099/00');
  });
});

describe('fireSnowHistoryService.getClientDates', () => {
  it('mapuje zakończoną umowę na DD.MM.YYYY + ISO + sezon + numer', async () => {
    getHistoryContracts.mockResolvedValue([{
      dokument_id: 55, numer_dokumentu: 'WP 12/01/2026',
      data_od: local(2026, 1, 5, 9), data_do: local(2026, 1, 9, 17), min_stop: local(2026, 1, 9, 17),
      liczba_pozycji: 3, cena: 300, zaplacono: 300
    }]);

    const [contract] = await fireSnowHistoryService.getClientDates(1);

    expect(contract).toEqual({
      od: '05.01.2026',
      do: '09.01.2026',
      od_iso: '2026-01-05T09:00:00',
      do_iso: '2026-01-09T17:00:00',
      sezon: '2025/26',
      liczba_pozycji: 3,
      dokument_id: 55,
      numer: 'WP 12/01/2026'
    });
  });

  it('umowa z min_stop = 0 jest w trakcie: brak daty końca nawet gdy inna pozycja już wróciła', async () => {
    getHistoryContracts.mockResolvedValue([{
      dokument_id: 56, numer_dokumentu: 'WP 1/10/2026',
      data_od: local(2026, 10, 1), data_do: local(2026, 10, 3), min_stop: 0,
      liczba_pozycji: 2, cena: 50, zaplacono: 50
    }]);

    const [contract] = await fireSnowHistoryService.getClientDates(1);

    expect(contract!.do).toBe('w trakcie');
    expect(contract!.do_iso).toBe('');
  });
});

describe('fireSnowHistoryService.getClientEquipment', () => {
  const position = (overrides: Record<string, unknown>) => ({
    session_id: 1, nazwa_sprzetu: 'NARTY ATOMIC', kod_sprzetu: 'A01',
    data_od: local(2026, 1, 5, 9), data_do: local(2026, 1, 8, 10),
    cena: 120, zaplacono: 100, numer_dokumentu: 'WP 12/01/2026',
    ...overrides
  });

  it('zwrot sprzętu: status Oddane, liczba dni zaokrąglona w górę, bez długości', async () => {
    getHistoryEquipment.mockResolvedValue([position({})]); // 3 dni + 1 h

    const [item] = await fireSnowHistoryService.getClientEquipment(1, 55);

    expect(item).toMatchObject({
      status: 'Oddane', liczba_dni: 4, dlugosc: null, source: 'firesnow',
      cena: '120', zaplacono: '100', kod: 'A01', typumowy: 'STANDARD'
    });
  });

  it('niezwrócony sprzęt (STOPTIME = 0) liczy dni do "teraz" i ma status Nie oddane', async () => {
    const start = local(2026, 10, 1, 9);
    getHistoryEquipment.mockResolvedValue([position({ data_od: start, data_do: 0, numer_dokumentu: 'WP 1/10/2026' })]);

    const [item] = await fireSnowHistoryService.getClientEquipment(1, 56, start + 2 * DAY + 1);

    expect(item).toMatchObject({ status: 'Nie oddane', liczba_dni: 3, do: '' });
  });

  it('numer dokumentu z prefiksem P to PROMOTOR, a WP to STANDARD', async () => {
    getHistoryEquipment.mockResolvedValue([
      position({ numer_dokumentu: 'P 3/12/2025' }),
      position({ numer_dokumentu: 'WP 3/12/2025' })
    ]);

    const items = await fireSnowHistoryService.getClientEquipment(1, 55);

    expect(items.map(i => i.typumowy)).toEqual(['PROMOTOR', 'STANDARD']);
  });
});

describe('fireSnowHistoryService.searchClients', () => {
  it('nazwa "NAZWISKO IMIĘ" z FireSnow rozbija na nazwisko i imię, gdy RENT_CUSTOMERS ich nie ma', async () => {
    searchHistoryClients.mockResolvedValue([
      { klient_id: 70750, imie: '', nazwisko: '', telefon: '605430662', klient_nazwa: 'JANUS PATRYK' }
    ]);

    const [client] = await fireSnowHistoryService.searchClients('janus');

    expect(client).toEqual({
      id: 70750, nazwisko: 'JANUS', imie: 'PATRYK', telefon: '605430662',
      pelna_nazwa: 'JANUS PATRYK', source: 'firesnow'
    });
  });

  it('za krótkie zapytanie nie odpytuje bridge\'a', async () => {
    expect(await fireSnowHistoryService.searchClients(' k ')).toEqual([]);
    expect(searchHistoryClients).not.toHaveBeenCalled();
  });
});

describe('useFireSnowApi = false', () => {
  it('wszystkie metody zwracają [] bez odpytywania bridge\'a', async () => {
    mockConfig.useFireSnowApi = false;

    expect(await fireSnowHistoryService.searchClients('kowalski')).toEqual([]);
    expect(await fireSnowHistoryService.getClientDates(1)).toEqual([]);
    expect(await fireSnowHistoryService.getClientEquipment(1, 2)).toEqual([]);
    expect(searchHistoryClients).not.toHaveBeenCalled();
    expect(getHistoryContracts).not.toHaveBeenCalled();
    expect(getHistoryEquipment).not.toHaveBeenCalled();
  });
});
