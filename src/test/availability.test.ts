import { describe, it, expect } from 'vitest';
import { calendarDayNumber, dayGap, SERVICE_BUFFER_DAYS } from '../utils/availability';
import { ReservationApiClient } from '../services/reservationApiClient';
import { detectConflicts } from '../utils/conflictDetector';
import type { ReservationData } from '../types/reservation.types';

const res = (od: string, doo: string, kod = 'N1'): ReservationData => ({
  klient: 'Test',
  sprzet: 'NARTY TEST 160',
  kod,
  od,
  do: doo,
  typumowy: 'STANDARD',
  numer: `${kod}-${od}`,
});

describe('dayGap / calendarDayNumber', () => {
  it('ignoruje godziny w obrębie dnia', () => {
    expect(calendarDayNumber(new Date(2026, 1, 13, 0, 0))).toBe(calendarDayNumber(new Date(2026, 1, 13, 23, 59)));
  });

  it('liczy dni kalendarzowe przez zmianę czasu (DST)', () => {
    // 29.03.2026 - przejście na czas letni (doba ma 23 h)
    expect(dayGap(new Date(2026, 2, 28, 23, 0), new Date(2026, 2, 30, 0, 30))).toBe(2);
    expect(dayGap(new Date(2026, 2, 29, 12, 0), new Date(2026, 2, 29, 12, 0))).toBe(0);
    expect(dayGap(new Date(2026, 2, 30), new Date(2026, 2, 28))).toBe(-2);
  });

  it('liczy dni na granicach miesiąca i roku (w tym luty roku przestępnego)', () => {
    expect(dayGap(new Date(2026, 0, 31), new Date(2026, 1, 1))).toBe(1);
    expect(dayGap(new Date(2026, 1, 28), new Date(2026, 2, 1))).toBe(1); // 2026 nieprzestępny
    expect(dayGap(new Date(2028, 1, 28), new Date(2028, 2, 1))).toBe(2); // 29.02.2028 istnieje
    expect(dayGap(new Date(2026, 11, 31), new Date(2027, 0, 1))).toBe(1);
  });
});

describe('getSkiAvailabilityStatus (system 3-kolorowy)', () => {
  const userFrom = new Date(2026, 1, 10);
  const userTo = new Date(2026, 1, 13); // lokalna północ - rezerwacja z godziną tego dnia też koliduje

  const status = async (data: ReservationData[]) =>
    (await ReservationApiClient.getSkiAvailabilityStatus('N1', userFrom, userTo, data)).status;

  it('czerwony, gdy rezerwacja zaczyna się o 11:00 w ostatnim dniu użytkownika', async () => {
    expect(await status([res('2026-02-13 11:00:00', '2026-02-20 19:00:00')])).toBe('reserved');
  });

  it('czerwony, gdy rezerwacja kończy się w pierwszym dniu użytkownika', async () => {
    expect(await status([res('2026-02-01 11:00:00', '2026-02-10 09:00:00')])).toBe('reserved');
  });

  it('żółty przy przerwie 1-2 dni przed i po okresie, zielony od 3 dni', async () => {
    expect(await status([res('2026-02-01 11:00:00', '2026-02-09 19:00:00')])).toBe('warning'); // przerwa 1
    expect(await status([res('2026-02-01 11:00:00', '2026-02-08 19:00:00')])).toBe('warning'); // przerwa 2
    expect(await status([res('2026-02-01 11:00:00', '2026-02-07 19:00:00')])).toBe('available'); // przerwa 3
    expect(await status([res('2026-02-14 11:00:00', '2026-02-20 19:00:00')])).toBe('warning'); // przerwa 1
    expect(await status([res('2026-02-15 11:00:00', '2026-02-20 19:00:00')])).toBe('warning'); // przerwa 2
    expect(await status([res('2026-02-16 11:00:00', '2026-02-20 19:00:00')])).toBe('available'); // przerwa 3
  });

  it('ignoruje rezerwacje innych kodów', async () => {
    expect(await status([res('2026-02-11 11:00:00', '2026-02-12 19:00:00', 'N2')])).toBe('available');
  });

  it('przerwa 3 dni kalendarzowe przez przejście na czas letni (27→30.03.2026) to zielony, nie żółty', async () => {
    // W strefie Europe/Warsaw 27.03 19:00 → 30.03 00:00 to mniej niż 72 h (doba 29.03 ma 23 h)
    const data = [res('2026-03-20 11:00:00', '2026-03-27 19:00:00')];
    const from = new Date(2026, 2, 30);
    const to = new Date(2026, 3, 2);
    expect((await ReservationApiClient.getSkiAvailabilityStatus('N1', from, to, data)).status).toBe('available');
    // przerwa 2 dni (28→30.03) pozostaje żółta
    const near = [res('2026-03-20 11:00:00', '2026-03-28 19:00:00')];
    expect((await ReservationApiClient.getSkiAvailabilityStatus('N1', from, to, near)).status).toBe('warning');
  });
});

describe('detectConflicts - bufor serwisowy', () => {
  const from = new Date(2026, 0, 1);
  const to = new Date(2026, 11, 31);

  it('przerwa <= SERVICE_BUFFER_DAYS jest konfliktem, dłuższa nie', () => {
    expect(SERVICE_BUFFER_DAYS).toBe(2);
    const gap2 = detectConflicts([res('2026-02-01', '2026-02-10'), res('2026-02-12', '2026-02-20')], from, to);
    expect(gap2.lacznaLiczbaKonfliktow).toBe(1);
    const gap3 = detectConflicts([res('2026-02-01', '2026-02-10'), res('2026-02-13', '2026-02-20')], from, to);
    expect(gap3.lacznaLiczbaKonfliktow).toBe(0);
  });
});
