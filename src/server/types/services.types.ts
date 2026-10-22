/**
 * src/server/types/services.types.ts: Typy dla serwisów (rezerwacje, wypożyczenia, sprzęt)
 */

/**
 * Rezerwacja z FireSnow API (surowe dane)
 */
export interface FireSnowReservation {
  rezerwacja_id?: number;
  klient_id?: number;
  klient_nazwa?: string;
  imie?: string;
  nazwisko?: string;
  nazwa_sprzetu?: string;
  kod_sprzetu?: string;
  data_od?: string;
  data_do?: string;
  cena?: number;
  typumowy?: string;
  uwagi?: string;
  obiekt_id?: number;
  parent_group_id?: number | null;
  status?: number; // 0 = aktywna, != 0 = wydana/nieaktywna
}

/**
 * Zmapowana rezerwacja (po przetworzeniu)
 */
export interface Reservation {
  klient: string;
  sprzet: string;
  kod: string;
  od: string;
  do: string;
  cena: string;
  zaplacono: string;
  numer: string;
  typumowy: string;
  uwagi?: string;
  obiekt_id?: number;
  klient_id?: number;
  parent_group_id?: number | null;
  status?: number; // 0 = aktywna, != 0 = wydana/nieaktywna
}

/**
 * Wypożyczenie z FireSnow API
 */
export interface FireSnowRental {
  wypozyczenie_id?: number;
  klient_id?: number;
  klient_nazwa?: string;
  imie?: string;
  nazwisko?: string;
  imie_nazwisko?: string;
  nazwa_sprzetu?: string;
  kod_sprzetu?: string;
  STARTTIME?: string;
  STOPTIME?: string;
  data_od?: number | string;
  data_do?: number;
  data_rozpoczecia?: string;
  pozostaly_czas?: number;
  cena?: number;
  zaplacono?: number;
  typumowy?: string;
  obiekt_id?: number;
  parent_group_id?: number | null;
  numer_dokumentu?: string;
  session_id?: string;
}

/**
 * Klient z historii FireSnow (GET /api/historia/klienci)
 * imie/nazwisko bywają puste - wtedy nazwa jest tylko w klient_nazwa ("NAZWISKO IMIĘ")
 */
export interface FireSnowHistoryClient {
  klient_id: number;
  imie: string;
  nazwisko: string;
  telefon: string;
  klient_nazwa: string;
}

/**
 * Umowa klienta z historii FireSnow (GET /api/historia/umowy)
 * Czasy w ms; min_stop = 0 oznacza, że co najmniej jedna pozycja jest wciąż wypożyczona
 */
export interface FireSnowHistoryContract {
  dokument_id: number;
  numer_dokumentu: string;
  data_od: number;
  data_do: number;
  min_stop: number;
  liczba_pozycji: number;
  cena: number;
  zaplacono: number;
  uwagi: string | null;
  rabat_procent_umowy: number; // ułamek: 0.15 = 15%
  rabat_kwota_umowy: number;
  rabat_procent_pozycji_max: number; // największy rabat procentowy z pozycji (ułamek)
  rabat_kwota_pozycji: number; // suma rabatów kwotowych pozycji
  bonus_ms: number; // dni gratis w ms (86400000 = 1 dzień)
}

/**
 * Pozycja umowy z historii FireSnow (GET /api/historia/sprzet)
 * Czasy w ms; data_do = 0 oznacza sprzęt nieoddany
 */
export interface FireSnowHistoryPosition {
  session_id: number;
  nazwa_sprzetu: string;
  kod_sprzetu: string;
  data_od: number;
  data_do: number;
  cena: number;
  zaplacono: number;
  numer_dokumentu: string;
  rabat_procent: number; // ułamek: 0.15 = 15%
  rabat_kwota: number;
}

/**
 * Sprzęt z FireSnow API
 */
export interface FireSnowEquipment {
  ID?: string;
  TYP_SPRZETU?: string;
  KATEGORIA?: string;
  MARKA?: string;
  MODEL?: string;
  DLUGOSC?: number;
  ILOSC?: number;
  POZIOM?: string;
  poziom?: string;
  PLEC?: string;
  WAGA_MIN?: number;
  waga_min?: number;
  WAGA_MAX?: number;
  waga_max?: number;
  WZROST_MIN?: number;
  wzrost_min?: number;
  WZROST_MAX?: number;
  wzrost_max?: number;
  PRZEZNACZENIE?: string;
  przeznaczenie?: string;
  ATUTY?: string;
  typ?: string;
  KOD?: string;
  kod?: string;
  obiekt_id?: number;
  parent_group_id?: number;
  parent_group_name?: string;
  sub_group_id?: number;
  nazwa_sprzetu?: string;
}

/**
 * Sprzęt (zmapowany)
 */
export interface Equipment {
  ID: string;
  TYP_SPRZETU: string;
  KATEGORIA: string;
  MARKA: string;
  MODEL: string;
  DLUGOSC: number;
  ILOSC: number;
  POZIOM?: string;
  PLEC: string;
  WAGA_MIN?: number;
  WAGA_MAX?: number;
  WZROST_MIN?: number;
  WZROST_MAX?: number;
  PRZEZNACZENIE?: string;
  ATUTY?: string;
  KOD: string;
}

/**
 * Dane do aktualizacji sprzętu
 */
export interface UpdateEquipmentData {
  ID?: string;
  TYP_SPRZETU?: string;
  KATEGORIA?: string;
  MARKA?: string;
  MODEL?: string;
  DLUGOSC?: number | null;
  PLEC?: string;
  KOD?: string;
  POZIOM?: string;
  WAGA_MIN?: number | null;
  WAGA_MAX?: number | null;
  WZROST_MIN?: number | null;
  WZROST_MAX?: number | null;
  PRZEZNACZENIE?: string;
  ATUTY?: string;
}

/**
 * Bulk update data
 */
export interface BulkUpdateData {
  ids: string[];
  updates: Partial<UpdateEquipmentData>;
}






