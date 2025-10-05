"""
Moduł wczytywania danych z plików CSV
Obsługuje bazę nart i rezerwacje z FireSnow
"""
import csv
import logging
import os
import pandas as pd

logger = logging.getLogger(__name__)

# ========== STAŁE ŚCIEŻEK ==========
CSV_FILE_PATH = os.path.join('data', 'csv', 'NOWABAZA_final.csv')
REZ_CSV_PATH = os.path.join('data', 'csv', 'rez.csv')
REZ_XLSX_PATH = os.path.join('data', 'excel', 'rez.xlsx')

def wczytaj_narty():
    """Wczytuje wszystkie narty z bazy danych"""
    try:
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        csv_file = os.path.join(current_dir, '..', CSV_FILE_PATH)
        
        with open(csv_file, 'r', newline='', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            return list(reader)
    except Exception as e:
        logger.error(f"Błąd podczas wczytywania nart: {e}")
        return []

def wczytaj_rezerwacje_firesnow():
    """Wczytuje rezerwacje z pliku rez.csv (sprawdzony format)"""
    try:
        # Sprawdź w katalogu programu
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rez_csv = os.path.join(current_dir, '..', REZ_CSV_PATH)
        rez_xlsx = os.path.join(current_dir, '..', REZ_XLSX_PATH)
        
        # Użyj sprawdzonego pliku rez.csv
        if os.path.exists(rez_csv):
            # Użyj pliku CSV - header=1 bo pierwszy wiersz to "Unnamed", ale sprawdź strukturę
            try:
                df = pd.read_csv(rez_csv, encoding='utf-8-sig', header=1)
                logger.info("Wczytano dane z rez.csv")
                return przetworz_dane_narty(df)
            except Exception as e:
                logger.warning(f"Błąd parsowania z header=1, próbuję header=0: {e}")
                # Fallback: spróbuj z header=0
                df = pd.read_csv(rez_csv, encoding='utf-8-sig', header=0)
                logger.info("Wczytano dane z rez.csv (header=0)")
                return przetworz_dane_narty(df)
        elif os.path.exists(rez_xlsx):
            # Wczytaj dane z Excel
            df = pd.read_excel(rez_xlsx, header=1)
            logger.info("Wczytano dane z rez.xlsx")
            return przetworz_dane_narty(df)
        else:
            logger.warning("Brak plików z rezerwacjami")
            return pd.DataFrame()
        
    except Exception as e:
        logger.error(f"Błąd podczas wczytywania rezerwacji: {e}")
        return pd.DataFrame()

def przetworz_dane_narty(df):
    """Przetwarza surowe dane rezerwacji i wyciąga informacje o nartach"""
    try:
        # Wyciągnij narty z rezerwacji
        df_narty = _wyciagnij_narty_z_rezerwacji(df)
        if df_narty.empty:
            logger.info("Brak rezerwacji nart w pliku")
            return pd.DataFrame()
        
        # Dodaj informacje o nartach
        df_narty = _dodaj_informacje_o_nartach(df_narty)
        
        logger.info(f"Przetworzono {len(df_narty)} rezerwacji nart")
        return df_narty
        
    except Exception as e:
        logger.error(f"Błąd podczas przetwarzania danych nart: {e}")
        return pd.DataFrame()

def _wyciagnij_narty_z_rezerwacji(df):
    """Wyciąga tylko rezerwacje nart z DataFrame"""
    # Sprawdź czy kolumny istnieją - obsłuż różne formaty
    if 'Od' in df.columns and 'Do' in df.columns and 'Sprzęt' in df.columns:
        # Nowy format z polskimi nazwami kolumn
        df_rezerwacje = df.dropna(subset=['Od', 'Do']).copy()
        df_narty = df_rezerwacje[df_rezerwacje['Sprzęt'].str.contains('NARTY', na=False)].copy()
    elif 'Data_Od' in df.columns and 'Data_Do' in df.columns and 'Sprzet' in df.columns:
        # Stary format z angielskimi nazwami kolumn
        df_rezerwacje = df.dropna(subset=['Data_Od', 'Data_Do']).copy()
        df_narty = df_rezerwacje[df_rezerwacje['Sprzet'].str.contains('NARTY', na=False)].copy()
        # Mapuj na nowe nazwy
        df_narty = df_narty.rename(columns={'Data_Od': 'Od', 'Data_Do': 'Do', 'Sprzet': 'Sprzęt'})
    else:
        logger.warning(f"Nieznany format kolumn: {list(df.columns)}")
        return pd.DataFrame()
    
    return df_narty

def _dodaj_informacje_o_nartach(df_narty):
    """Dodaje markę, model, długość i numer narty"""
    # Wyciągnij informacje o nartach z kolumny Sprzęt
    narty_info = df_narty['Sprzęt'].apply(_wyciagnij_info_narty)
    df_narty['Marka'] = [info[0] for info in narty_info]
    df_narty['Model'] = [info[1] for info in narty_info]
    df_narty['Dlugosc'] = [info[2] for info in narty_info]
    df_narty['Numer_Narty'] = [info[3] for info in narty_info]
    
    # Filtruj tylko wiersze z poprawnie wyciągniętymi danymi
    df_narty = df_narty.dropna(subset=['Marka', 'Model', 'Dlugosc'])
    
    return df_narty

def _wyciagnij_info_narty(sprzet):
    """Wyciąga markę, model, długość i numer narty z opisu sprzętu"""
    if pd.isna(sprzet) or not isinstance(sprzet, str):
        return None, None, None, None
    
    # Przykład: "NARTY KNEISSL MY STAR XC 144cm /2024 //01"
    parts = sprzet.split()
    if len(parts) < 4:
        return None, None, None, None
    
    # Znajdź markę (pierwsze słowo po "NARTY")
    marka = parts[1] if len(parts) > 1 else None
    
    # Znajdź długość (słowo zawierające "cm")
    dlugosc = None
    for part in parts:
        if 'cm' in part:
            dlugosc = part.replace('cm', '').strip()
            break
    
    # Znajdź numer narty (ostatnie //XX)
    numer = None
    for part in parts:
        if part.startswith('//') and len(part) > 2:
            numer = part
            break
    
    # Model to wszystko między marką a długością
    model_parts = []
    for i, part in enumerate(parts[2:], 2):
        if 'cm' in part:
            break
        model_parts.append(part)
    model = ' '.join(model_parts) if model_parts else None
    
    return marka, model, dlugosc, numer

def sprawdz_czy_narta_zarezerwowana(marka, model, dlugosc, data_od=None, data_do=None, rezerwacje_cache=None):
    """Sprawdza czy narta jest zarezerwowana w danym terminie"""
    try:
        # Użyj cache jeśli dostępny, w przeciwnym razie wczytaj
        if rezerwacje_cache is not None:
            rezerwacje = rezerwacje_cache
        else:
            rezerwacje = wczytaj_rezerwacje_firesnow()
        
        if rezerwacje.empty:
            return False, None, None
        
        # Konwertuj daty do porównania
        if data_od and data_do:
            data_od = pd.to_datetime(data_od).date()
            data_do = pd.to_datetime(data_do).date()
        else:
            return False, None, None
        
        # Sprawdź czy narta jest zarezerwowana w danym terminie
        for _, rezerwacja in rezerwacje.iterrows():
            if (rezerwacja['Marka'] == marka and 
                rezerwacja['Model'] == model and 
                str(rezerwacja['Dlugosc']) == str(dlugosc)):
                
                # Konwertuj daty rezerwacji - sprawdź różne nazwy kolumn
                try:
                    # Sprawdź czy to nowy format (Od, Do) czy stary (Data_Od, Data_Do)
                    if 'Od' in rezerwacja and 'Do' in rezerwacja:
                        data_od_rez = pd.to_datetime(rezerwacja['Od']).date()
                        data_do_rez = pd.to_datetime(rezerwacja['Do']).date()
                    elif 'Data_Od' in rezerwacja and 'Data_Do' in rezerwacja:
                        data_od_rez = pd.to_datetime(rezerwacja['Data_Od']).date()
                        data_do_rez = pd.to_datetime(rezerwacja['Data_Do']).date()
                    else:
                        continue
                    
                    # Sprawdź czy terminy się nakładają
                    if not (data_do < data_od_rez or data_od > data_do_rez):
                        numer_narty = rezerwacja.get('Numer_Narty', '')
                        return True, f"{data_od_rez} - {data_do_rez}", numer_narty
                except:
                    continue
        
        return False, None, None
        
    except Exception as e:
        logger.error(f"Błąd podczas sprawdzania rezerwacji: {e}")
        return False, None, None

def sprawdz_zarezerwowane_sztuki(marka, model, dlugosc, data_od=None, data_do=None, rezerwacje_cache=None):
    """Sprawdza które konkretne numery sztuk są zarezerwowane w danym terminie"""
    try:
        # Użyj cache jeśli dostępny, w przeciwnym razie wczytaj
        if rezerwacje_cache is not None:
            rezerwacje = rezerwacje_cache
        else:
            rezerwacje = wczytaj_rezerwacje_firesnow()
        
        if rezerwacje.empty:
            logger.info("Brak danych rezerwacji")
            return []
        
        # Konwertuj daty do porównania
        if data_od and data_do:
            data_od = pd.to_datetime(data_od).date()
            data_do = pd.to_datetime(data_do).date()
        else:
            logger.info("Brak dat rezerwacji")
            return []
        
        logger.info(f"Szukam rezerwacji dla: {marka} {model} {dlugosc}cm w terminie {data_od} - {data_do}")
        logger.info(f"Typ marka: {type(marka)}, typ model: {type(model)}, typ dlugosc: {type(dlugosc)}")
        
        zarezerwowane_sztuki = []
        
        # Sprawdź które sztuki są zarezerwowane w danym terminie
        for _, rezerwacja in rezerwacje.iterrows():
            logger.info(f"Sprawdzam rezerwację: Marka='{rezerwacja.get('Marka')}' Model='{rezerwacja.get('Model')}' Dlugosc='{rezerwacja.get('Dlugosc')}'")
            logger.info(f"Porównanie: marka '{marka}' == '{rezerwacja.get('Marka')}' = {marka == rezerwacja.get('Marka')}")
            logger.info(f"Porównanie: model '{model}' == '{rezerwacja.get('Model')}' = {model == rezerwacja.get('Model')}")
            logger.info(f"Porównanie: dlugosc '{dlugosc}' == '{rezerwacja.get('Dlugosc')}' = {str(dlugosc) == str(rezerwacja.get('Dlugosc'))}")
            
            if (rezerwacja['Marka'] == marka and 
                rezerwacja['Model'] == model and 
                str(rezerwacja['Dlugosc']) == str(dlugosc)):
                
                logger.info(f"Znaleziono pasującą nartę: {rezerwacja}")
                
                # Konwertuj daty rezerwacji - sprawdź różne nazwy kolumn
                try:
                    # Sprawdź czy to nowy format (Od, Do) czy stary (Data_Od, Data_Do)
                    if 'Od' in rezerwacja and 'Do' in rezerwacja:
                        data_od_rez = pd.to_datetime(rezerwacja['Od']).date()
                        data_do_rez = pd.to_datetime(rezerwacja['Do']).date()
                    elif 'Data_Od' in rezerwacja and 'Data_Do' in rezerwacja:
                        data_od_rez = pd.to_datetime(rezerwacja['Data_Od']).date()
                        data_do_rez = pd.to_datetime(rezerwacja['Data_Do']).date()
                    else:
                        logger.info("Brak kolumn z datami")
                        continue
                    
                    logger.info(f"Data rezerwacji: {data_od_rez} - {data_do_rez}")
                    
                    # Sprawdź czy terminy się nakładają
                    if not (data_do < data_od_rez or data_od > data_do_rez):
                        numer_narty = rezerwacja.get('Numer_Narty', '')
                        logger.info(f"Numer narty: {numer_narty}")
                        
                        # Wyciągnij numer sztuki z numeru narty (np. //01 -> 1)
                        if numer_narty and numer_narty.startswith('//'):
                            try:
                                numer_sztuki = int(numer_narty[2:])
                                zarezerwowane_sztuki.append({
                                    'numer': numer_sztuki,
                                    'data_od': data_od_rez,
                                    'data_do': data_do_rez,
                                    'info': f"{data_od_rez} - {data_do_rez}"
                                })
                                logger.info(f"Dodano zarezerwowaną sztukę: {numer_sztuki}")
                            except ValueError:
                                logger.info(f"Błąd parsowania numeru sztuki: {numer_narty}")
                                continue
                        else:
                            logger.info(f"Nieprawidłowy format numeru narty: {numer_narty}")
                    else:
                        logger.info("Terminy się nie nakładają")
                except Exception as e:
                    logger.error(f"Błąd podczas przetwarzania rezerwacji: {e}")
                    continue
        
        logger.info(f"Znaleziono {len(zarezerwowane_sztuki)} zarezerwowanych sztuk")
        return zarezerwowane_sztuki
        
    except Exception as e:
        logger.error(f"Błąd podczas sprawdzania zarezerwowanych sztuk: {e}")
        return []