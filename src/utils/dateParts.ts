// src/utils/dateParts.ts: Czyste funkcje pomocnicze dla szybkiego wyboru daty (QuickDatePicker)
// Wszystkie daty w formacie ISO "YYYY-MM-DD" (czas lokalny, bez stref czasowych).

export interface DateParts {
  day?: number;
  month?: number;
  year?: number;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Liczba dni w miesiącu. Bez roku luty ma 29 dni (najbardziej liberalnie). */
export const daysInMonth = (month: number, year?: number): number => {
  if (month === 2) {
    if (year === undefined) return 29;
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/** Czy dzień/miesiąc/rok tworzą istniejącą datę */
export const isValidDate = (day: number, month: number, year?: number): boolean =>
  month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month, year);

/** Zakres lat do wyboru: bieżący rok ± span */
export const yearRange = (today: Date = new Date(), span = 3): number[] => {
  const y = today.getFullYear();
  const years: number[] = [];
  for (let i = y - span; i <= y + span; i++) years.push(i);
  return years;
};

/** Składa datę ISO "YYYY-MM-DD" */
export const toISO = (day: number, month: number, year: number): string =>
  `${year}-${pad2(month)}-${pad2(day)}`;

/** Data lokalna -> ISO */
export const dateToISO = (date: Date): string =>
  toISO(date.getDate(), date.getMonth() + 1, date.getFullYear());

/** Rozbija ISO "YYYY-MM-DD" na części (lub {} gdy pusty/niepoprawny) */
export const splitISO = (iso?: string): DateParts => {
  if (!iso) return {};
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return {};
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
};

/** Dodaje n dni do daty ISO */
export const addDays = (iso: string, n: number): string => {
  const { day, month, year } = splitISO(iso);
  if (!day || !month || !year) return iso;
  return dateToISO(new Date(year, month - 1, day + n));
};

/** Czy data ISO jest poza zakresem [min, max] (porównanie leksykograficzne ISO) */
export const isOutOfRange = (iso: string, min?: string, max?: string): boolean =>
  (!!min && iso < min) || (!!max && iso > max);

/** Różnica w dniach |a - b| dla dat ISO */
const dayDistance = (a: string, b: string): number => {
  const pa = splitISO(a);
  const pb = splitISO(b);
  const ta = Date.UTC(pa.year!, pa.month! - 1, pa.day!);
  const tb = Date.UTC(pb.year!, pb.month! - 1, pb.day!);
  return Math.abs(ta - tb) / 86_400_000;
};

export interface ResolveYearOptions {
  today?: Date;
  /** Data minimalna (np. "Data od" dla pola "Data do") */
  notBefore?: string;
  /** Data maksymalna */
  notAfter?: string;
}

/**
 * Automatycznie dobiera rok dla podanego dnia i miesiąca.
 * - bez `notBefore`: rok, przy którym data jest najbliżej dzisiaj
 * - z `notBefore`: najwcześniejsza data >= notBefore (np. grudzień -> styczeń następnego roku)
 * Zwraca null, gdy żaden kandydat nie spełnia ograniczeń.
 */
export const resolveYear = (
  day: number,
  month: number,
  { today = new Date(), notBefore, notAfter }: ResolveYearOptions = {}
): number | null => {
  const y = today.getFullYear();
  const todayISO = dateToISO(today);
  const candidates: string[] = [];
  for (let year = y - 1; year <= y + 3; year++) {
    if (!isValidDate(day, month, year)) continue;
    const iso = toISO(day, month, year);
    if (isOutOfRange(iso, notBefore, notAfter)) continue;
    candidates.push(iso);
  }
  if (candidates.length === 0) return null;

  const best = notBefore
    ? candidates[0] // kandydaci są posortowani rosnąco -> najwcześniejszy >= notBefore
    : candidates.reduce((acc, c) => (dayDistance(c, todayISO) < dayDistance(acc, todayISO) ? c : acc));
  return splitISO(best).year!;
};

/**
 * Dokleja wciśnięty klawisz do bufora wpisywania (tylko cyfry, format DDMM[RR|RRRR]).
 * - pierwsza cyfra dnia > 3  -> automatycznie "0d"
 * - pierwsza cyfra miesiąca > 1 -> automatycznie "0m"
 * - separator (. / - spacja) po jednej cyfrze dnia/miesiąca dopełnia zerem
 */
export const appendKey = (buffer: string, key: string): string => {
  if (/^[./\- ]$/.test(key)) {
    if (buffer.length === 1 || buffer.length === 3) {
      return buffer.slice(0, -1) + '0' + buffer.slice(-1);
    }
    return buffer;
  }
  if (!/^\d$/.test(key) || buffer.length >= 8) return buffer;
  const digit = Number(key);
  if (buffer.length === 0 && digit > 3) return `0${key}`;
  if (buffer.length === 2 && digit > 1) return `${buffer}0${key}`;
  return buffer + key;
};

/** Parsuje tekst wpisany z klawiatury: "1501", "15.01", "15 1", "150127", "15012027" */
export const parseTypedDate = (input: string): DateParts => {
  const trimmed = input.trim();
  if (!trimmed) return {};

  let dd = '';
  let mm = '';
  let yy = '';
  if (/[./\- ]/.test(trimmed)) {
    [dd = '', mm = '', yy = ''] = trimmed.split(/[./\- ]+/);
  } else {
    let buffer = '';
    for (const ch of trimmed) buffer = appendKey(buffer, ch);
    dd = buffer.slice(0, 2);
    mm = buffer.slice(2, 4);
    yy = buffer.slice(4);
  }

  const result: DateParts = {};
  const day = Number(dd);
  if (dd && day >= 1 && day <= 31) result.day = day;
  const month = Number(mm);
  if (mm && month >= 1 && month <= 12) result.month = month;
  if (yy.length === 2) result.year = 2000 + Number(yy);
  else if (yy.length === 4) result.year = Number(yy);
  return result;
};
