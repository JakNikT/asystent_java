// Typy danych dla aplikacji dobierania nart

// src/types/ski.types.ts: Definicje typów sprzętu
export type TYP_SPRZETU = 'NARTY' | 'BUTY' | 'DESKI' | 'BUTY_SNOWBOARD';
export type KATEGORIA_SPRZETU = 'VIP' | 'TOP' | 'JUNIOR' | 'DOROSLE' | '';

export interface SkiData {
  ID: string;
  TYP_SPRZETU: TYP_SPRZETU;           // NOWE: typ sprzętu
  KATEGORIA: KATEGORIA_SPRZETU;        // NOWE: kategoria sprzętu
  MARKA: string;
  MODEL: string;
  DLUGOSC: number;                     // dla butów: rozmiar w cm (długość wkładki)
  ILOSC: number;                       // zawsze 1 (każda sztuka osobno)
  POZIOM: string;                      // opcjonalnie puste dla butów/desek
  PLEC: string;                        // M/K/U
  WAGA_MIN: number;                    // opcjonalnie puste
  WAGA_MAX: number;                    // opcjonalnie puste
  WZROST_MIN: number;                  // opcjonalnie puste dla butów
  WZROST_MAX: number;                  // opcjonalnie puste dla butów
  PRZEZNACZENIE: string;               // SL, G, SLG, OFF (opcjonalnie puste)
  ATUTY: string;                       // np. "C", "C,premium" lub ""
  ROK: number;                         // opcjonalnie puste dla niektórych desek
  KOD: string;                         // kod sprzętu
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

