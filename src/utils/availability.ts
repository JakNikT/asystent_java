// src/utils/availability.ts: Stałe i pomocnicze funkcje dni kalendarzowych dla logiki dostępności sprzętu

/** Domyślny czas trwania aktywnego wypożyczenia bez określonego terminu zwrotu (w dniach) */
export const DEFAULT_RENTAL_DAYS = 30;

/** Bufor serwisowy w dniach: przerwa 1..SERVICE_BUFFER_DAYS dni między rezerwacjami = żółte ostrzeżenie / konflikt */
export const SERVICE_BUFFER_DAYS = 2;

const MS_PER_DAY = 86_400_000;

/**
 * Numer dnia kalendarzowego (lokalnego) daty - ignoruje godzinę i jest odporny na zmianę czasu (DST)
 */
export const calendarDayNumber = (d: Date): number =>
  Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);

/**
 * Liczba dni kalendarzowych od `from` do `to` (dodatnia, gdy `to` jest późniejszy)
 */
export const dayGap = (from: Date, to: Date): number => calendarDayNumber(to) - calendarDayNumber(from);
