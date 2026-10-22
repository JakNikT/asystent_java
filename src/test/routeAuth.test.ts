// @vitest-environment node
/**
 * src/test/routeAuth.test.ts: Kontrola dostępu na trasach API (prawdziwa aplikacja Express na losowym porcie,
 * serwisy z danymi zamockowane)
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

vi.mock('../server/config/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('../server/services/fireSnowService', () => ({
  fireSnowService: {
    getAvailability: vi.fn(async () => ({
      reservations: [{ kod: 'N1', od: '2026-02-01 11:00:00.0', do: '2026-02-05 19:00:00.0', klient: 'Jan Kowalski', klient_id: 7, uwagi: 'tajne', sprzet: 'NARTY TEST' }],
      rentals: [{ kod: 'N2', od: 1767225600000, do: 1767484800000, klient: 'Anna Nowak', sprzet: 'NARTY TEST 2' }]
    })),
    refreshCache: vi.fn(async () => ({ status: 'ok' })),
    checkHealth: vi.fn(async () => ({ status: 'ok' }))
  }
}));

vi.mock('../server/services/historyService', () => ({
  historyService: { searchClients: vi.fn(async () => []), getClientDates: vi.fn(async () => []), getClientEquipment: vi.fn(async () => []) }
}));

vi.mock('../server/services/rentalService', () => ({
  rentalService: { getActive: vi.fn(async () => []), getPast: vi.fn(async () => []) }
}));

import app from '../server/app';
import { createSessionToken } from '../server/utils/authUtils';

let server: Server;
let base: string;

beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

const call = (path: string, init: RequestInit = {}) => fetch(`${base}${path}`, init);
const bearer = () => ({ Authorization: `Bearer ${createSessionToken('employee')}` });

describe('trasy z danymi klientów wymagają tokenu pracownika', () => {
  const protectedRoutes: Array<[string, string]> = [
    ['GET', '/api/historia/klienci/wyszukaj?nazwisko=a'],
    ['GET', '/api/historia/firesnow/klienci/wyszukaj?nazwisko=ab'],
    ['GET', '/api/historia/firesnow/klient/1/daty'],
    ['GET', '/api/historia/firesnow/klient/1/sprzet?dokument=1'],
    ['GET', '/api/wypozyczenia/aktualne'],
    ['GET', '/api/wypozyczenia/przeszle'],
    ['POST', '/api/firesnow/refresh'],
    ['GET', '/api/reservations'],
    ['PUT', '/api/skis/1']
  ];

  it.each(protectedRoutes)('%s %s → 401 bez tokenu', async (method, path) => {
    const res = await call(path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'PUT' ? '{}' : undefined });
    expect(res.status).toBe(401);
  });

  it('te same trasy z ważnym tokenem nie zwracają 401', async () => {
    const res = await call('/api/wypozyczenia/aktualne', { headers: bearer() });
    expect(res.status).toBe(200);
    const refresh = await call('/api/firesnow/refresh', { method: 'POST', headers: bearer() });
    expect(refresh.status).toBe(200);
  });

  it('token z błędnym podpisem jest odrzucany', async () => {
    const res = await call('/api/wypozyczenia/aktualne', { headers: { Authorization: 'Bearer abc.def' } });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dostepnosc/okres', () => {
  const clientKeys = ['klient', 'klient_id', 'klient_nazwisko', 'uwagi'];
  const items = (body: { reservations: Record<string, unknown>[]; rentals: Record<string, unknown>[] }) => [...body.reservations, ...body.rentals];

  it('bez tokenu: odpowiedź bez pól klienta, reszta pól zachowana', async () => {
    const body = await (await call('/api/dostepnosc/okres?from=1&to=2')).json();
    expect(items(body)).toHaveLength(2);
    for (const item of items(body)) {
      for (const key of clientKeys) expect(item).not.toHaveProperty(key);
      expect(item).toHaveProperty('kod');
      expect(item).toHaveProperty('sprzet');
    }
  });

  it('z błędnym tokenem: nadal bez pól klienta i bez 401', async () => {
    const res = await call('/api/dostepnosc/okres', { headers: { Authorization: 'Bearer zly.token' } });
    expect(res.status).toBe(200);
    for (const item of items(await res.json())) expect(item).not.toHaveProperty('klient');
  });

  it('z ważnym tokenem: pole klient jest obecne', async () => {
    const body = await (await call('/api/dostepnosc/okres', { headers: bearer() })).json();
    expect(items(body).map((i: Record<string, unknown>) => i.klient)).toEqual(['Jan Kowalski', 'Anna Nowak']);
  });
});

describe('nieznane trasy', () => {
  it('GET /api/nieistnieje → 404 w formacie JSON', async () => {
    const res = await call('/api/nieistnieje');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });
});

describe('limit nieudanych prób logowania', () => {
  const login = (password: string) =>
    call('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });

  it('po 5 błędnych próbach 6. (nawet z poprawnym PIN-em) → 429 z Retry-After', async () => {
    for (let i = 0; i < 5; i++) expect((await login('zly-pin')).status).toBe(401);

    const blocked = await login('482913'); // PIN z test.env
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
