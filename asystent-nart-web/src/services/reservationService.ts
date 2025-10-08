/**
 * Serwis obsługi rezerwacji nart
 * Zawiera funkcje do wczytywania, sprawdzania i zarządzania rezerwacjami
 */

import Papa from 'papaparse';

export interface ReservationData {
  od: string;           // Data rozpoczęcia
  do: string;           // Data zakończenia
  uzytkownik: string;   // Użytkownik
  klient: string;       // Klient
  sprzet: string;       // Sprzęt (narty)
  uwagi: string;        // Uwagi
  kod: string;          // Kod
  cena: number;        // Cena
  zaplacono: number;   // Zapłacono
  cennik: string;      // Cennik
  rabat: string;        // Rabat
  rabat_procent: string; // Rabat %
  czas: string;         // Czas
  do_startu: string;    // Do startu
  numer: string;        // Numer
}

export interface ReservationInfo {
  id: string;
  clientName: string;
  equipment: string;
  startDate: Date;
  endDate: Date;
  notes: string;
  price: number;
  paid: number;
  status: 'active' | 'completed' | 'cancelled';
}

export class ReservationService {
  private static reservations: ReservationData[] = [];
  private static isLoaded = false;

  /**
   * Wczytuje dane rezerwacji z pliku CSV
   */
  static async loadReservations(): Promise<ReservationData[]> {
    if (this.isLoaded && this.reservations.length > 0) {
      return this.reservations;
    }

    try {
      const response = await fetch('/data/rez.csv');
      const csvText = await response.text();
      
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Mapowanie nagłówków na polskie nazwy
          const headerMap: { [key: string]: string } = {
            'Od': 'od',
            'Do': 'do',
            'Użytkownik': 'uzytkownik',
            'Klient': 'klient',
            'Sprzęt': 'sprzet',
            'Uwagi': 'uwagi',
            'Kod': 'kod',
            'Cena': 'cena',
            'Zapłacono': 'zaplacono',
            'Cennik': 'cennik',
            'Rabat': 'rabat',
            'Rabat %': 'rabat_procent',
            'Czas': 'czas',
            'Do Startu': 'do_startu',
            'Numer': 'numer'
          };
          return headerMap[header] || header.toLowerCase();
        }
      });

      this.reservations = result.data as ReservationData[];
      this.isLoaded = true;
      
      console.log('ReservationService: Wczytano', this.reservations.length, 'rezerwacji');
      return this.reservations;
    } catch (error) {
      console.error('ReservationService: Błąd wczytywania rezerwacji:', error);
      return [];
    }
  }

  /**
   * Sprawdza czy konkretna narta jest zarezerwowana w danym okresie
   */
  static async isSkiReserved(
    marka: string, 
    model: string, 
    dlugosc: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      // Sprawdź czy rezerwacja dotyczy tej narty
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        // Sprawdź czy okresy się nakładają
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          reservations.push({
            id: reservation.numer,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi,
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: this.getReservationStatus(reservation)
          });
        }
      }
    }
    
    return reservations;
  }

  /**
   * Sprawdza czy opis sprzętu pasuje do narty
   */
  private static matchesSki(sprzet: string, marka: string, model: string, dlugosc: string): boolean {
    if (!sprzet || !marka || !model || !dlugosc) {
      return false;
    }

    const sprzetLower = sprzet.toLowerCase();
    const markaLower = marka.toLowerCase();
    const modelLower = model.toLowerCase();
    const dlugoscStr = dlugosc.toString();

    // Sprawdź czy zawiera markę, model i długość
    return sprzetLower.includes(markaLower) && 
           sprzetLower.includes(modelLower) && 
           sprzetLower.includes(dlugoscStr);
  }

  /**
   * Sprawdza czy dwa okresy czasowe się nakładają
   */
  private static isDateRangeOverlapping(
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Określa status rezerwacji
   */
  private static getReservationStatus(reservation: ReservationData): 'active' | 'completed' | 'cancelled' {
    const now = new Date();
    const endDate = new Date(reservation.do);
    
    if (endDate < now) {
      return 'completed';
    }
    
    // TODO: Dodać logikę dla anulowanych rezerwacji
    return 'active';
  }

  /**
   * Pobiera wszystkie aktywne rezerwacje dla konkretnej narty
   */
  static async getActiveReservationsForSki(
    marka: string, 
    model: string, 
    dlugosc: string
  ): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        const status = this.getReservationStatus(reservation);
        if (status === 'active') {
          reservations.push({
            id: reservation.numer,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi,
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: status
          });
        }
      }
    }
    
    return reservations;
  }

  /**
   * Sprawdza dostępność konkretnej sztuki nart
   */
  static async checkSkiAvailability(
    marka: string, 
    model: string, 
    dlugosc: string, 
    sztukaNumber: number,
    startDate: Date, 
    endDate: Date
  ): Promise<{ isAvailable: boolean; reservations: ReservationInfo[] }> {
    const reservations = await this.isSkiReserved(marka, model, dlugosc, startDate, endDate);
    
    // TODO: Implementuj logikę sprawdzania konkretnej sztuki
    // Na razie sprawdzamy ogólną dostępność nart
    
    return {
      isAvailable: reservations.length === 0,
      reservations: reservations
    };
  }

  /**
   * Pobiera wszystkie rezerwacje w danym okresie
   */
  static async getReservationsInPeriod(startDate: Date, endDate: Date): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      if (this.isDateRangeOverlapping(
        new Date(reservation.od),
        new Date(reservation.do),
        startDate,
        endDate
      )) {
        reservations.push({
          id: reservation.numer,
          clientName: reservation.klient,
          equipment: reservation.sprzet,
          startDate: new Date(reservation.od),
          endDate: new Date(reservation.do),
          notes: reservation.uwagi,
          price: parseFloat(String(reservation.cena)) || 0,
          paid: parseFloat(String(reservation.zaplacono)) || 0,
          status: this.getReservationStatus(reservation)
        });
      }
    }
    
    return reservations;
  }

  /**
   * Tworzy nową rezerwację
   */
  static async createReservation(reservationData: Partial<ReservationData>): Promise<boolean> {
    try {
      // TODO: Implementuj tworzenie nowej rezerwacji
      // Na razie tylko logujemy
      console.log('ReservationService: Tworzenie nowej rezerwacji:', reservationData);
      return true;
    } catch (error) {
      console.error('ReservationService: Błąd tworzenia rezerwacji:', error);
      return false;
    }
  }

  /**
   * Aktualizuje istniejącą rezerwację
   */
  static async updateReservation(id: string, updates: Partial<ReservationData>): Promise<boolean> {
    try {
      // TODO: Implementuj aktualizację rezerwacji
      console.log('ReservationService: Aktualizacja rezerwacji:', id, updates);
      return true;
    } catch (error) {
      console.error('ReservationService: Błąd aktualizacji rezerwacji:', error);
      return false;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string): Promise<boolean> {
    try {
      // TODO: Implementuj usuwanie rezerwacji
      console.log('ReservationService: Usuwanie rezerwacji:', id);
      return true;
    } catch (error) {
      console.error('ReservationService: Błąd usuwania rezerwacji:', error);
      return false;
    }
  }
}
