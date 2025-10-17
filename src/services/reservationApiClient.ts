/**
 * Klient API dla komunikacji z serwerem rezerwacji
 * Zastępuje bezpośredni odczyt CSV przez HTTP API
 */

import type { ReservationData, ReservationInfo, AvailabilityInfo } from './reservationService';

const API_BASE_URL = '/api';

/**
 * Klient API dla rezerwacji
 */
export class ReservationApiClient {
  private static cache: ReservationData[] = [];
  private static lastFetch: number = 0;
  private static readonly CACHE_DURATION = 30000; // 30 sekund

  /**
   * Pobiera wszystkie rezerwacje z serwera (z cache)
   */
  static async loadReservations(): Promise<ReservationData[]> {
    const now = Date.now();
    
    // Użyj cache jeśli dane są świeże
    if (this.cache.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      console.log('ReservationApiClient: Używam danych z cache');
      return this.cache;
    }

    try {
      console.log('ReservationApiClient: Pobieram rezerwacje z serwera...');
      const response = await fetch(`${API_BASE_URL}/reservations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reservations = await response.json();
      this.cache = reservations;
      this.lastFetch = now;
      
      console.log(`ReservationApiClient: Pobrano ${reservations.length} rezerwacji`);
      return reservations;
    } catch (error) {
      console.error('ReservationApiClient: Błąd pobierania rezerwacji:', error);
      
      // Jeśli cache jest pusty, zwróć pustą tablicę
      if (this.cache.length === 0) {
        return [];
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      console.log('ReservationApiClient: Używam cache mimo błędu');
      return this.cache;
    }
  }

  /**
   * Sprawdza czy konkretna narta jest zarezerwowana w danym okresie (po kodzie)
   */
  static async isSkiReservedByCode(
    kod: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    
    console.log(`ReservationApiClient.isSkiReservedByCode: Sprawdzam kod ${kod} w okresie ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    const matchingReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (reservation.kod === kod) {
        console.log(`ReservationApiClient: Znaleziono rezerwację dla kodu ${kod}:`, reservation);
        
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          console.log(`ReservationApiClient: Okresy się nakładają dla kodu ${kod}`);
          matchingReservations.push({
            id: reservation.kod,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi || '',
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: this.getReservationStatus(reservation)
          });
        }
      }
    }
    
    console.log(`ReservationApiClient: Zwracam ${matchingReservations.length} rezerwacji dla kodu ${kod}`);
    return matchingReservations;
  }

  /**
   * Sprawdza czy konkretna narta jest zarezerwowana w danym okresie (po nazwie)
   */
  static async isSkiReserved(
    marka: string, 
    model: string, 
    dlugosc: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    const matchingReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          matchingReservations.push({
            id: reservation.numer,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi || '',
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: this.getReservationStatus(reservation)
          });
        }
      }
    }
    
    return matchingReservations;
  }

  /**
   * Sprawdza status dostępności narty z systemem 3-kolorowym
   */
  static async getSkiAvailabilityStatus(
    kod: string,
    userDateFrom: Date,
    userDateTo: Date
  ): Promise<AvailabilityInfo> {
    const reservations = await this.loadReservations();
    
    console.log(`ReservationApiClient.getSkiAvailabilityStatus: Sprawdzam kod ${kod} dla okresu ${userDateFrom.toLocaleDateString()} - ${userDateTo.toLocaleDateString()}`);
    
    const allReservations: ReservationInfo[] = [];
    let hasDirectConflict = false;
    let hasWarningConflict = false;
    
    for (const reservation of reservations) {
      if (reservation.kod === kod) {
        const resStart = new Date(reservation.od);
        const resEnd = new Date(reservation.do);
        
        const reservationInfo: ReservationInfo = {
          id: reservation.kod,
          clientName: reservation.klient,
          equipment: reservation.sprzet,
          startDate: resStart,
          endDate: resEnd,
          notes: reservation.uwagi || '',
          price: parseFloat(String(reservation.cena)) || 0,
          paid: parseFloat(String(reservation.zaplacono)) || 0,
          status: this.getReservationStatus(reservation)
        };
        
        // Sprawdź CZERWONY (bezpośredni konflikt)
        if (resStart <= userDateTo && resEnd >= userDateFrom) {
          hasDirectConflict = true;
          allReservations.push(reservationInfo);
          console.log(`  🔴 CZERWONY: Rezerwacja ${resStart.toLocaleDateString()}-${resEnd.toLocaleDateString()} nachodzi na okres klienta`);
        }
        // Sprawdź ŻÓŁTY (bufor 1-2 dni)
        else {
          const daysBefore = this.differenceInDays(userDateFrom, resEnd);
          const daysAfter = this.differenceInDays(resStart, userDateTo);
          
          const isBeforeWarning = daysBefore >= 1 && daysBefore <= 2;
          const isAfterWarning = daysAfter >= 1 && daysAfter <= 2;
          
          if (isBeforeWarning || isAfterWarning) {
            hasWarningConflict = true;
            allReservations.push(reservationInfo);
            
            if (isBeforeWarning) {
              console.log(`  🟡 ŻÓŁTY: Rezerwacja kończy się ${daysBefore} dni przed okresem klienta`);
            }
            if (isAfterWarning) {
              console.log(`  🟡 ŻÓŁTY: Rezerwacja zaczyna się ${daysAfter} dni po okresie klienta`);
            }
          }
        }
      }
    }
    
    // Określ końcowy status
    if (hasDirectConflict) {
      return {
        status: 'reserved',
        color: 'red',
        emoji: '🔴',
        message: 'Zarezerwowane w wybranym terminie',
        reservations: allReservations
      };
    }
    
    if (hasWarningConflict) {
      return {
        status: 'warning',
        color: 'yellow',
        emoji: '🟡',
        message: 'Rezerwacja blisko terminu (za mało czasu na serwis)',
        reservations: allReservations
      };
    }
    
    return {
      status: 'available',
      color: 'green',
      emoji: '🟢',
      message: 'Dostępne - wystarczająco czasu na serwis',
      reservations: []
    };
  }

  /**
   * Tworzy nową rezerwację
   */
  static async createReservation(reservationData: Partial<ReservationData>): Promise<boolean> {
    try {
      console.log('ReservationApiClient: Tworzenie nowej rezerwacji:', reservationData);
      
      const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Wyczyść cache aby wymusić odświeżenie danych
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('ReservationApiClient: Rezerwacja utworzona pomyślnie');
      return true;
    } catch (error) {
      console.error('ReservationApiClient: Błąd tworzenia rezerwacji:', error);
      return false;
    }
  }

  /**
   * Aktualizuje istniejącą rezerwację
   */
  static async updateReservation(id: string, updates: Partial<ReservationData>): Promise<boolean> {
    try {
      console.log('ReservationApiClient: Aktualizacja rezerwacji:', id, updates);
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('ReservationApiClient: Rezerwacja zaktualizowana pomyślnie');
      return true;
    } catch (error) {
      console.error('ReservationApiClient: Błąd aktualizacji rezerwacji:', error);
      return false;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string): Promise<boolean> {
    try {
      console.log('ReservationApiClient: Usuwanie rezerwacji:', id);
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('ReservationApiClient: Rezerwacja usunięta pomyślnie');
      return true;
    } catch (error) {
      console.error('ReservationApiClient: Błąd usuwania rezerwacji:', error);
      return false;
    }
  }

  /**
   * Pobiera wszystkie aktywne rezerwacje dla konkretnej narty
   */
  static async getActiveReservationsForSki(
    marka: string, 
    model: string, 
    dlugosc: string
  ): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    const activeReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        const status = this.getReservationStatus(reservation);
        if (status === 'active') {
          activeReservations.push({
            id: reservation.numer,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi || '',
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: status
          });
        }
      }
    }
    
    return activeReservations;
  }

  /**
   * Pobiera wszystkie rezerwacje w danym okresie
   */
  static async getReservationsInPeriod(startDate: Date, endDate: Date): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    const periodReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (this.isDateRangeOverlapping(
        new Date(reservation.od),
        new Date(reservation.do),
        startDate,
        endDate
      )) {
        periodReservations.push({
          id: reservation.numer,
          clientName: reservation.klient,
          equipment: reservation.sprzet,
          startDate: new Date(reservation.od),
          endDate: new Date(reservation.do),
          notes: reservation.uwagi || '',
          price: parseFloat(String(reservation.cena)) || 0,
          paid: parseFloat(String(reservation.zaplacono)) || 0,
          status: this.getReservationStatus(reservation)
        });
      }
    }
    
    return periodReservations;
  }

  /**
   * Sprawdza dostępność konkretnej sztuki nart
   */
  static async checkSkiAvailability(
    marka: string, 
    model: string, 
    dlugosc: string, 
    _sztukaNumber: number,
    startDate: Date, 
    endDate: Date
  ): Promise<{ isAvailable: boolean; reservations: ReservationInfo[] }> {
    const reservations = await this.isSkiReserved(marka, model, dlugosc, startDate, endDate);
    
    return {
      isAvailable: reservations.length === 0,
      reservations: reservations
    };
  }

  // Metody pomocnicze (przeniesione z ReservationService)

  private static matchesSki(sprzet: string, marka: string, model: string, dlugosc: string): boolean {
    if (!sprzet || !marka || !model || !dlugosc) {
      return false;
    }

    const sprzetLower = sprzet.toLowerCase();
    const markaLower = marka.toLowerCase();
    const modelLower = model.toLowerCase();
    const dlugoscStr = dlugosc.toString();

    return sprzetLower.includes(markaLower) && 
           sprzetLower.includes(modelLower) && 
           sprzetLower.includes(dlugoscStr);
  }

  private static isDateRangeOverlapping(
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  private static differenceInDays(date1: Date, date2: Date): number {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  private static getReservationStatus(reservation: ReservationData): 'active' | 'completed' | 'cancelled' {
    const now = new Date();
    const endDate = new Date(reservation.do);
    
    if (endDate < now) {
      return 'completed';
    }
    
    return 'active';
  }
}
