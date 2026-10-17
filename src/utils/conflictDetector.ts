// src/utils/conflictDetector.ts: Logika wykrywania konfliktów w kalendarzu sprzętu
// Sprawdza czy przerwy między rezerwacjami/wypożyczeniami tego samego sprzętu mieszczą się w buforze serwisowym

import type { ReservationData } from '../types/reservation.types';
import type { ConflictInfo, Conflict, ConflictAnalysisResult } from '../types/conflict.types';
import { SERVICE_BUFFER_DAYS, dayGap } from './availability';
import { createLogger } from './logger';

const logger = createLogger('conflictDetector');

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
 * Sprawdza czy rezerwacja dotyczy nart lub butów narciarskich
 * Filtruje tylko sprzęt typu NARTY i BUTY (wyklucza kije, kaski, deski, buty snowboardowe, etc.)
 * 
 * @param reservation - Rezerwacja do sprawdzenia
 * @returns true jeśli sprzęt to narty lub buty narciarskie
 */
function isSkiOrBoot(reservation: ReservationData): boolean {
  // src/utils/conflictDetector.ts: Sprawdzanie typu sprzętu na podstawie parent_group_id
  // Equipment type IDs for skis and boots
  const SKI_BOOT_PARENT_GROUP_IDS = [
    82293, // NARTY TOP
    82412, // NARTY VIP  
    82758, // NARTY JUNIOR
    82738, // BUTY DOROSLE
    82827  // BUTY JUNIOR
  ];
  
  // Check parent_group_id if available (preferred method)
  if (reservation.parent_group_id) {
    return SKI_BOOT_PARENT_GROUP_IDS.includes(reservation.parent_group_id);
  }
  
  // Fallback: check equipment name if parent_group_id is not available
  const sprzet = reservation.sprzet.toLowerCase();
  const isSki = sprzet.includes('narty');
  const isBoot = sprzet.includes('buty') && !sprzet.includes('snowboard') && !sprzet.includes('sb');
  
  return isSki || isBoot;
}

/**
 * Wykrywa konflikty dla pojedynczego sprzętu (kodu)
 * Konflikt = przerwa <= SERVICE_BUFFER_DAYS dni między kolejnymi rezerwacjami (spójnie z żółtym w Przeglądaj)
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
    
    // Oblicz przerwę w dniach kalendarzowych
    // Przerwa = różnica między końcem rezerwacji 1 a początkiem rezerwacji 2
    const przerwaDni = dayGap(endDate1, startDate2);
    
    // Konflikt gdy przerwa mieści się w buforze serwisowym
    if (przerwaDni <= SERVICE_BUFFER_DAYS) {
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
  logger.debug('conflictDetector.ts: Rozpoczynam analizę konfliktów...');
  logger.debug(`conflictDetector.ts: Okres analizy: ${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`);
  logger.debug(`conflictDetector.ts: Liczba rezerwacji do analizy: ${data.length}`);
  
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
  
  logger.debug(`conflictDetector.ts: Po filtrowaniu dat: ${filteredData.length} rezerwacji w zakresie`);
  
  // Filtruj tylko narty i buty (wyklucz kije, kaski, deski, buty snowboardowe, etc.)
  const skiBootData = filteredData.filter(isSkiOrBoot);
  
  const filteredOutCount = filteredData.length - skiBootData.length;
  if (filteredOutCount > 0) {
    logger.debug(`conflictDetector.ts: Wykluczono ${filteredOutCount} rezerwacji innych typów sprzętu (kije, kaski, deski, etc.)`);
  }
  logger.debug(`conflictDetector.ts: Po filtrowaniu typów: ${skiBootData.length} rezerwacji (tylko narty i buty)`);
  
  // src/utils/conflictDetector.ts: Deduplikuj rezerwacje - usuń duplikaty na podstawie klient+kod+data
  // Ta sama rezerwacja może być w systemie zarówno jako 'reservation' jak i 'rental'
  const deduplicated = skiBootData.reduce((acc, curr) => {
    const key = `${curr.klient}|${curr.kod}|${curr.od}|${curr.do}`;
    
    // Jeśli już mamy tę rezerwację, zachowaj 'reservation' nad 'rental' (lepsze źródło)
    const existing = acc.get(key);
    if (!existing || (existing.source === 'rental' && curr.source === 'reservation')) {
      acc.set(key, curr);
    }
    
    return acc;
  }, new Map<string, ReservationData>());
  
  const uniqueData = Array.from(deduplicated.values());
  const duplicatesRemoved = skiBootData.length - uniqueData.length;
  if (duplicatesRemoved > 0) {
    logger.debug(`conflictDetector.ts: Usunięto ${duplicatesRemoved} duplikatów rezerwacji`);
  }
  logger.debug(`conflictDetector.ts: Po deduplikacji: ${uniqueData.length} unikalnych rezerwacji`);
  
  // Grupuj po kodzie sprzętu (tylko unikalne narty i buty)
  const grouped = groupByEquipmentCode(uniqueData);
  logger.debug(`conflictDetector.ts: Znaleziono ${grouped.size} unikalnych kodów sprzętu`);
  
  const sprzetyZKonfliktami: ConflictInfo[] = [];
  let lacznaLiczbaKonfliktow = 0;
  
  // Dla każdego sprzętu wykryj konflikty
  for (const [kod, reservations] of grouped.entries()) {
    // Pobierz nazwę sprzętu z pierwszej rezerwacji
    const sprzet = reservations[0]?.sprzet || kod;
    
    // Wykryj konflikty
    const konflikty = detectConflictsForEquipment(kod, sprzet, reservations);
    
    if (konflikty.length > 0) {
      logger.debug(`conflictDetector.ts: Sprzęt ${kod} (${sprzet}): ${konflikty.length} konfliktów`);
      
      sprzetyZKonfliktami.push({
        kod,
        sprzet,
        konflikty,
        wszystkieRezerwacje: reservations
      });
      
      lacznaLiczbaKonfliktow += konflikty.length;
    }
  }
  
  logger.debug(`conflictDetector.ts: Analiza zakończona. Znaleziono ${sprzetyZKonfliktami.length} sprzętów z konfliktami, łącznie ${lacznaLiczbaKonfliktow} konfliktów`);
  
  return {
    okresOd: dateFrom,
    okresDo: dateTo,
    sprzetyZKonfliktami,
    lacznaLiczbaKonfliktow,
    lacznaLiczbaSprzetow: grouped.size
  };
}

