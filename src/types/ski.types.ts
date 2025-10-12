// Typy danych dla aplikacji dobierania nart

export interface SkiData {
  ID: string;
  MARKA: string;
  MODEL: string;
  DLUGOSC: number;
  ILOSC: number;
  POZIOM: string;
  PLEC: string;
  WAGA_MIN: number;
  WAGA_MAX: number;
  WZROST_MIN: number;
  WZROST_MAX: number;
  PRZEZNACZENIE: string; // Teraz tylko: SL, G, SLG, OFF
  ATUTY: string;         // NOWE: np. "C", "C,premium" lub ""
  ROK: number;
  KOD: string;           // NOWE: kod narty z nartyvip.csv
}

export interface SearchCriteria {
  wzrost: number;
  waga: number;
  poziom: number;
  plec: 'M' | 'K' | 'W'; // M = męski, K = kobiecy, W = wszyscy
  styl_jazdy?: string[]; // ZMIANA: opcjonalna tablica stylów (może być pusta)
  dateFrom?: Date; // Data rozpoczęcia rezerwacji
  dateTo?: Date;   // Data zakończenia rezerwacji
}

export interface SkiMatch {
  ski: SkiData;
  compatibility: number;
  dopasowanie: {
    poziom: string;
    plec: string;
    waga: string;
    wzrost: string;
    przeznaczenie: string;
  };
  kategoria: 'idealne' | 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile';
  zielone_punkty: number;
  sredniaKompatybilnosc?: number; // Opcjonalne pole dla średniej kompatybilności
}

export type MatchCategory = 'idealne' | 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile';

export interface SearchResults {
  idealne: SkiMatch[];
  alternatywy: SkiMatch[];
  poziom_za_nisko: SkiMatch[];
  inna_plec: SkiMatch[];
  na_sile: SkiMatch[];
  wszystkie: SkiMatch[];
}

// ========== SYSTEM DOSTĘPNOŚCI ==========

export interface SkiPiece {
  number: number;
  status: 'available' | 'reserved';
  reservationInfo: string | null;
}

export interface AvailabilityInfo {
  total: number;
  available: SkiPiece[];
  reserved: SkiPiece[];
  availabilityStatus: 'all_available' | 'partially_available' | 'all_reserved' | 'unknown';
}

// ========== SZCZEGÓŁOWE INFORMACJE O DOPASOWANIU ==========

export interface CriteriaDetails {
  status: 'perfect' | 'good' | 'warning' | 'error';
  message: string;
  recommendation: string;
  details: string;
  icon: string;
}

export interface DetailedCompatibilityInfo {
  poziom: CriteriaDetails;
  waga: CriteriaDetails;
  wzrost: CriteriaDetails;
  plec: CriteriaDetails;
  przeznaczenie: CriteriaDetails;
  ogolne: CriteriaDetails;
}

