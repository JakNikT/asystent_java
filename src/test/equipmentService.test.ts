// @vitest-environment node
/**
 * src/test/equipmentService.test.ts: Nadpisania parametrów sprzętu w MySQL (equipment_overrides)
 * - zapis tylko edytowanych pól, - jedno pobranie z FireSnow na masową edycję, - błędy FireSnow nie maskowane
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const query = vi.fn();
const getAllEquipment = vi.fn();

vi.mock('../server/config/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('../server/config/env', () => ({ config: { useFireSnowApi: true } }));

vi.mock('../server/config/database', () => ({
  getDBConnection: vi.fn(async () => ({ query }))
}));

vi.mock('../server/services/fireSnowService', () => ({
  fireSnowService: { getAllEquipment: (...args: unknown[]) => getAllEquipment(...args) }
}));

import { equipmentService } from '../server/services/equipmentService';

// Grupa 130615 = NARTY TOP; ID mappera: N-{obiekt_id dopełnione do 4 cyfr}
const rawSki = (obiektId: number, kod: string) => ({
  obiekt_id: obiektId,
  parent_group_id: 130615,
  nazwa_sprzetu: `ATOMIC REDSTER ${obiektId} 170cm /2025`,
  kod,
  poziom: '2M',
  wzrost_min: 160,
  wzrost_max: 180
});

const inserts = () =>
  query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO equipment_overrides'));

const insertedColumns = (sql: string): string[] =>
  /INSERT INTO equipment_overrides \(([^)]*)\)/.exec(sql)![1]!.split(',').map(c => c.trim());

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([[]]); // brak istniejących nadpisań, CREATE TABLE / INSERT przechodzą
  getAllEquipment.mockReset();
  getAllEquipment.mockResolvedValue([rawSki(1, 'K1'), rawSki(2, 'K2'), rawSki(3, 'K3')]);
});

describe('equipmentService.update', () => {
  it('zapisuje wyłącznie kolumny id, kod i faktycznie edytowane pole', async () => {
    const updated = await equipmentService.update('N-0001', { POZIOM: '3' });

    expect(inserts()).toHaveLength(1);
    const [sql, values] = inserts()[0]!;
    expect(insertedColumns(sql as string)).toEqual(['id', 'kod', 'poziom']);
    expect(values).toEqual(['N-0001', 'K1', '3']);
    // klauzula UPDATE nie dotyka pól, których użytkownik nie edytował
    expect(sql).toContain('poziom = VALUES(poziom)');
    expect(sql).not.toMatch(/marka = |model = |dlugosc = |wzrost_min = /);
    expect(updated?.POZIOM).toBe('3');
  });

  it('null czyści nadpisanie (kolumna trafia do zapisu z wartością NULL)', async () => {
    await equipmentService.update('N-0002', { WZROST_MIN: null });

    const [sql, values] = inserts()[0]!;
    expect(insertedColumns(sql as string)).toEqual(['id', 'kod', 'wzrost_min']);
    expect(values).toEqual(['N-0002', 'K2', null]);
  });

  it('nieznane ID → null i brak zapisu', async () => {
    expect(await equipmentService.update('N-9999', { POZIOM: '3' })).toBeNull();
    expect(inserts()).toHaveLength(0);
  });

  it('błąd FireSnow jest rzucany (a nie maskowany jako "nie znaleziono")', async () => {
    getAllEquipment.mockRejectedValue(new Error('most niedostępny'));
    await expect(equipmentService.update('N-0001', { POZIOM: '3' })).rejects.toThrow('most niedostępny');
    expect(inserts()).toHaveLength(0);
  });
});

describe('equipmentService.bulkUpdate', () => {
  it('pobiera sprzęt z FireSnow jeden raz i zapisuje po jednym wierszu na ID', async () => {
    const result = await equipmentService.bulkUpdate(['N-0001', 'N-0002', 'N-0003'], { ATUTY: 'C' });

    expect(getAllEquipment).toHaveBeenCalledTimes(1);
    expect(inserts()).toHaveLength(3);
    expect(inserts().map(([, values]) => (values as unknown[])[0])).toEqual(['N-0001', 'N-0002', 'N-0003']);
    expect(result.map(r => r.ID)).toEqual(['N-0001', 'N-0002', 'N-0003']);
  });

  it('ignoruje ID i KOD przekazane w updates oraz pomija nieistniejące ID', async () => {
    const result = await equipmentService.bulkUpdate(['N-0001', 'N-9999'], { ID: 'HACK', KOD: 'HACK', ATUTY: 'C' });

    expect(result.map(r => r.ID)).toEqual(['N-0001']);
    const [sql, values] = inserts()[0]!;
    expect(insertedColumns(sql as string)).toEqual(['id', 'kod', 'atuty']);
    expect(values).toEqual(['N-0001', 'K1', 'C']);
  });
});
