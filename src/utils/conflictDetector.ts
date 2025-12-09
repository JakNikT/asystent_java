// src/utils/conflictDetector.ts: Logika wykrywania konfliktów w kalendarzu sprzętu
// Sprawdza czy przerwy między rezerwacjami/wypożyczeniami tego samego sprzętu są mniejsze niż 2 dni

import type { ReservationData } from '../services/reservationService';
import type { ConflictInfo, Conflict, ConflictAnalysisResult } from '../types/conflict.types';

/**
 * Oblicza różnicę w dniach między dwiema datami (bez godzin)
 * Zwraca liczbę całkowitych dni między datami
 */
export function calculateDaysBetween(date1: Date, date2: Date): number {
  // Normalizuj daty do początku dnia (bez godzin)
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Grupuje rezerwacje po kodzie sprzętu
 */
export function groupByEquipmentCode(data: ReservationData[]): Map<string, ReservationData[]> {
  const grouped = new Map<string, ReservationData[]>();
  
  for (const reservation of data) {
    // Pomiń rezerwacje bez kodu
    if (!reservation.kod || reservation.kod.trim() === '') {
      continue;
    }
    
    const kod = reservation.kod.trim();
    
    if (!grouped.has(kod)) {
      grouped.set(kod, []);
    }
    
    grouped.get(kod)!.push(reservation);
  }
  
  return grouped;
}

/**
 * Sortuje rezerwacje chronologicznie (od najwcześniejszej daty rozpoczęcia)
 */
function sortReservationsChronologically(reservations: ReservationData[]): ReservationData[] {
  return [...reservations].sort((a, b) => {
    const dateA = new Date(a.od).getTime();
    const dateB = new Date(b.od).getTime();
    return dateA - dateB;
  });
}

/**
 * Wykrywa konflikty dla pojedynczego sprzętu (kodu)
 * Konflikt = przerwa < 2 dni między kolejnymi rezerwacjami
 */
function detectConflictsForEquipment(
  _kod: string,
  _sprzet: string,
  reservations: ReservationData[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Sortuj chronologicznie
  const sorted = sortReservationsChronologically(reservations);
  
  // Sprawdź przerwy między kolejnymi rezerwacjami
  for (let i = 0; i < sorted.length - 1; i++) {
    const res1 = sorted[i];
    const res2 = sorted[i + 1];
    
    const endDate1 = new Date(res1.do);
    const startDate2 = new Date(res2.od);
    
    // Oblicz przerwę w dniach
    // Przerwa = różnica między końcem rezerwacji 1 a początkiem rezerwacji 2
    const przerwaDni = calculateDaysBetween(startDate2, endDate1);
    
    // Konflikt gdy przerwa < 2 dni
    if (przerwaDni < 2) {
      conflicts.push({
        rezerwacja1: {
          klient: res1.klient,
          od: new Date(res1.od),
          do: endDate1,
          kod: res1.kod,
          sprzet: res1.sprzet,
          numer: res1.numer,
          source: res1.source
        },
        rezerwacja2: {
          klient: res2.klient,
          od: startDate2,
          do: new Date(res2.do),
          kod: res2.kod,
          sprzet: res2.sprzet,
          numer: res2.numer,
          source: res2.source
        },
        przerwaDni: przerwaDni
      });
    }
  }
  
  return conflicts;
}

/**
 * Główna funkcja wykrywania konfliktów
 * Analizuje wszystkie rezerwacje i wypożyczenia w danym okresie
 * 
 * @param data - Wszystkie rezerwacje i wypożyczenia
 * @param dateFrom - Początek okresu analizy
 * @param dateTo - Koniec okresu analizy
 * @returns Wynik analizy z listą konfliktów
 */
export function detectConflicts(
  data: ReservationData[],
  dateFrom: Date,
  dateTo: Date
): ConflictAnalysisResult {
  console.log('conflictDetector.ts: Rozpoczynam analizę konfliktów...');
  console.log(`conflictDetector.ts: Okres analizy: ${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`);
  console.log(`conflictDetector.ts: Liczba rezerwacji do analizy: ${data.length}`);
  
  // Filtruj rezerwacje w zakresie dat (lub które mogą wpływać na okres)
  // Bierzemy rezerwacje które:
  // - Zaczynają się przed końcem okresu
  // - Kończą się po początku okresu
  const filteredData = data.filter(reservation => {
    const resStart = new Date(reservation.od);
    const resEnd = new Date(reservation.do);
    
    // Rezerwacja wpływa na okres jeśli się z nim nakłada
    return resStart <= dateTo && resEnd >= dateFrom;
  });
  
  console.log(`conflictDetector.ts: Po filtrowaniu: ${filteredData.length} rezerwacji w zakresie`);
  
  // Grupuj po kodzie sprzętu
  const grouped = groupByEquipmentCode(filteredData);
  console.log(`conflictDetector.ts: Znaleziono ${grouped.size} unikalnych kodów sprzętu`);
  
  const sprzetyZKonfliktami: ConflictInfo[] = [];
  let lacznaLiczbaKonfliktow = 0;
  
  // Dla każdego sprzętu wykryj konflikty
  for (const [kod, reservations] of grouped.entries()) {
    // Pobierz nazwę sprzętu z pierwszej rezerwacji
    const sprzet = reservations[0]?.sprzet || kod;
    
    // Wykryj konflikty
    const konflikty = detectConflictsForEquipment(kod, sprzet, reservations);
    
    if (konflikty.length > 0) {
      console.log(`conflictDetector.ts: Sprzęt ${kod} (${sprzet}): ${konflikty.length} konfliktów`);
      
      sprzetyZKonfliktami.push({
        kod,
        sprzet,
        konflikty,
        wszystkieRezerwacje: reservations
      });
      
      lacznaLiczbaKonfliktow += konflikty.length;
    }
  }
  
  console.log(`conflictDetector.ts: Analiza zakończona. Znaleziono ${sprzetyZKonfliktami.length} sprzętów z konfliktami, łącznie ${lacznaLiczbaKonfliktow} konfliktów`);
  
  return {
    okresOd: dateFrom,
    okresDo: dateTo,
    sprzetyZKonfliktami,
    lacznaLiczbaKonfliktow,
    lacznaLiczbaSprzetow: grouped.size
  };
}

