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
  PRZEZNACZENIE: string;
  ROK: number;
  UWAGI: string;
}

export interface SearchCriteria {
  wzrost: number;
  waga: number;
  poziom: number;
  plec: 'M' | 'K';
  styl_jazdy: string;
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
  kategoria: 'idealne' | 'bardzo_dobre' | 'dobre' | 'akceptowalne';
  zielone_punkty: number;
}

export type MatchCategory = 'idealne' | 'bardzo_dobre' | 'dobre' | 'akceptowalne';

export interface SearchResults {
  idealne: SkiMatch[];
  bardzo_dobre: SkiMatch[];
  dobre: SkiMatch[];
  akceptowalne: SkiMatch[];
  wszystkie: SkiMatch[];
}

