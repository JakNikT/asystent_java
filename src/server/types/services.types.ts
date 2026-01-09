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
  obiekt_id?: number;
  parent_group_id?: number | null;
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
  obiekt_id?: number;
  klient_id?: number;
  parent_group_id?: number | null;
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
 * Dane do utworzenia rezerwacji
 */
export interface CreateReservationData {
  klient: string;
  sprzet: string;
  kod: string;
  od: string;
  do: string;
  cena?: string;
  zaplacono?: string;
  typumowy?: string;
}

/**
 * Dane do aktualizacji rezerwacji
 */
export interface UpdateReservationData extends Partial<CreateReservationData> {
  numer?: string;
}

/**
 * Dane do utworzenia sprzętu
 */
export interface CreateEquipmentData {
  TYP_SPRZETU: string;
  KATEGORIA: string;
  MARKA: string;
  MODEL: string;
  DLUGOSC: number;
  PLEC: string;
  KOD: string;
  POZIOM?: string;
  WAGA_MIN?: number;
  WAGA_MAX?: number;
  WZROST_MIN?: number;
  WZROST_MAX?: number;
  PRZEZNACZENIE?: string;
  ATUTY?: string;
}

/**
 * Dane do aktualizacji sprzętu
 */
export interface UpdateEquipmentData extends Partial<CreateEquipmentData> {
  ID?: string;
}

/**
 * Bulk update data
 */
export interface BulkUpdateData {
  ids: string[];
  updates: Partial<UpdateEquipmentData>;
}






