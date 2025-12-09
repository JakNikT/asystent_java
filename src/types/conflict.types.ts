// src/types/conflict.types.ts: Typy TypeScript dla wykrywania konfliktów w kalendarzu sprzętu

import type { ReservationData } from '../services/reservationService';

/**
 * Informacje o pojedynczym konflikcie między dwoma rezerwacjami/wypożyczeniami
 */
export interface Conflict {
  rezerwacja1: {
    klient: string;
    od: Date;
    do: Date;
    kod: string;
    sprzet: string;
    numer?: string;
    source?: 'reservation' | 'rental';
  };
  rezerwacja2: {
    klient: string;
    od: Date;
    do: Date;
    kod: string;
    sprzet: string;
    numer?: string;
    source?: 'reservation' | 'rental';
  };
  przerwaDni: number; // Liczba dni przerwy (0, 1 < 2)
}

/**
 * Informacje o konfliktach dla konkretnego sprzętu (kodu)
 */
export interface ConflictInfo {
  kod: string;              // Kod sprzętu (np. "N123")
  sprzet: string;           // Nazwa sprzętu
  konflikty: Conflict[];    // Lista konfliktów dla tego sprzętu
  wszystkieRezerwacje: ReservationData[]; // Wszystkie rezerwacje tego sprzętu (dla timeline)
}

/**
 * Wynik analizy konfliktów dla całego okresu
 */
export interface ConflictAnalysisResult {
  okresOd: Date;
  okresDo: Date;
  sprzetyZKonfliktami: ConflictInfo[];
  lacznaLiczbaKonfliktow: number;
  lacznaLiczbaSprzetow: number;
}

/**
 * Dane dla wizualizacji timeline (dla react-calendar-timeline)
 */
export interface TimelineItem {
  id: string;
  group: string; // ID grupy (kod sprzętu)
  title: string; // Tytuł (klient + numer)
  start_time: Date;
  end_time: Date;
  canMove?: boolean;
  canResize?: boolean;
  className?: string; // Dla stylowania konfliktów
  itemProps?: {
    'data-konflikt'?: boolean;
    'data-klient'?: string;
    'data-kod'?: string;
  };
}

/**
 * Grupa dla timeline (jeden sprzęt)
 */
export interface TimelineGroup {
  id: string; // Kod sprzętu
  title: string; // Nazwa sprzętu
  rightTitle?: string; // Dodatkowy tytuł po prawej
  height?: number;
  stackItems?: boolean;
}

