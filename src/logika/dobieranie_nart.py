"""
Moduł głównej logiki dobierania nart
Zawiera funkcje wyszukiwania i kategoryzacji nart
"""
import logging
from src.logika.ocena_dopasowania import compatibility_scorer
from src.logika.parsowanie_poziomow import parsuj_poziom

logger = logging.getLogger(__name__)

# ========== STAŁE TOLERANCJI ==========
POZIOM_TOLERANCJA_W_DOL = 2
WAGA_TOLERANCJA = 5
WZROST_TOLERANCJA = 5

def sprawdz_dopasowanie_narty(row, wzrost, waga, poziom, plec, styl_jazdy):
    """Sprawdza dopasowanie pojedynczej narty do kryteriów klienta"""
    try:
        # Sprawdź czy narta ma wszystkie wymagane dane
        if not _czy_narta_ma_wszystkie_dane(row):
            return None

        # Wyciągnij dane narty
        dane_narty = _wyciagnij_dane_narty(row)
        if not dane_narty:
            return None

        # Sprawdź czy poziom nie jest za niski
        poziom_min, poziom_display = _sprawdz_poziom_narty(row, plec)
        if not poziom_min or poziom < poziom_min - POZIOM_TOLERANCJA_W_DOL:
            return None

        # Sprawdź wszystkie kryteria
        dopasowanie = {}
        zielone_punkty = 0
        poziom_niżej_kandydat = False

        # Sprawdź poziom
        poziom_result = _sprawdz_poziom(poziom, poziom_min, poziom_display)
        if not poziom_result:
            return None
        dopasowanie['poziom'] = poziom_result[0]
        zielone_punkty += poziom_result[1]
        poziom_niżej_kandydat = poziom_result[2]

        # Sprawdź płeć
        plec_result = _sprawdz_plec(plec, dane_narty['narta_plec'])
        dopasowanie['plec'] = plec_result[0]
        zielone_punkty += plec_result[1]

        # Sprawdź wagę
        waga_result = _sprawdz_wage(waga, dane_narty['waga_min'], dane_narty['waga_max'])
        dopasowanie['waga'] = waga_result[0]
        zielone_punkty += waga_result[1]

        # Sprawdź wzrost
        wzrost_result = _sprawdz_wzrost(wzrost, dane_narty['wzrost_min'], dane_narty['wzrost_max'])
        dopasowanie['wzrost'] = wzrost_result[0]
        zielone_punkty += wzrost_result[1]

        # Sprawdź przeznaczenie
        przeznaczenie_result = _sprawdz_przeznaczenie(styl_jazdy, row)
        dopasowanie['przeznaczenie'] = przeznaczenie_result[0]
        zielone_punkty += przeznaczenie_result[1]

        # Wyklucz narty z czerwonymi kryteriami (ale nie waga/wzrost w tolerancji)
        czerwone_kryteria = [k for k, v in dopasowanie.items() if v[0] == 'red']
        if czerwone_kryteria:
            # Sprawdź czy to tylko problemy z wagą/wzrostem (dopuszczalne w alternatywach)
            niedopuszczalne_czerwone = [k for k in czerwone_kryteria if k not in ['waga', 'wzrost']]
            if niedopuszczalne_czerwone:
                return None  # Wyklucz jeśli czerwone kryteria to nie waga/wzrost

        # Oblicz współczynnik idealności
        wspolczynnik, detale_oceny = compatibility_scorer.oblicz_wspolczynnik_idealnosci(
            dopasowanie, wzrost, waga, poziom, plec, styl_jazdy
        )

        return {
            'dane': row,
            'dopasowanie': dopasowanie,
            'wspolczynnik_idealnosci': wspolczynnik,
            'detale_oceny': detale_oceny,
            'zielone_punkty': zielone_punkty,
            'poziom_niżej_kandydat': poziom_niżej_kandydat
        }

    except (ValueError, TypeError) as e:
        logger.warning(f"Pominięto wiersz z powodu błędu danych: {row} - {e}")
        return None

def _czy_narta_ma_wszystkie_dane(row):
    """Sprawdza czy narta ma wszystkie wymagane dane"""
    required_keys = ['POZIOM', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'DLUGOSC', 'PLEC']
    return all(key in row and row[key] for key in required_keys)

def _wyciagnij_dane_narty(row):
    """Wyciąga dane narty z wiersza"""
    try:
        return {
            'waga_min': int(float(row['WAGA_MIN'])),
            'waga_max': int(float(row['WAGA_MAX'])),
            'wzrost_min': int(float(row['WZROST_MIN'])),
            'wzrost_max': int(float(row['WZROST_MAX'])),
            'narta_plec': row.get('PLEC', 'U').strip() or 'U'
        }
    except (ValueError, TypeError):
        return None

def _sprawdz_poziom_narty(row, plec):
    """Sprawdza poziom narty i parsuje go"""
    poziom_text = row.get('POZIOM', '').strip()
    return parsuj_poziom(poziom_text, plec)

def _sprawdz_poziom(poziom, poziom_min, poziom_display):
    """Sprawdza dopasowanie poziomu"""
    if poziom == poziom_min:
        return (('green', 'OK', poziom_display), 1, False)
    elif poziom == poziom_min + 1:
        return (('orange', f'Narta słabsza o jeden poziom', poziom_display), 0, True)
    elif poziom > poziom_min + 1:
        return None  # Wyklucz całkowicie
    else:
        return None

def _sprawdz_plec(plec, narta_plec):
    """Sprawdza dopasowanie płci"""
    if plec == "Wszyscy":
        return (('green', 'OK', narta_plec), 1)
    elif plec == "Kobieta":
        if narta_plec in ["K", "D", "U"]:
            return (('green', 'OK', narta_plec), 1)
        elif narta_plec == "M":
            return (('orange', 'Narta męska', narta_plec), 0)
        else:
            return (('orange', 'Nieznana płeć', narta_plec), 0)
    elif plec == "Mężczyzna":
        if narta_plec in ["M", "U"]:
            return (('green', 'OK', narta_plec), 1)
        elif narta_plec in ["K", "D"]:
            return (('orange', 'Narta kobieca', narta_plec), 0)
        else:
            return (('orange', 'Nieznana płeć', narta_plec), 0)
    else:
        return (('orange', 'Nieznana płeć', narta_plec), 0)

def _sprawdz_wage(waga, waga_min, waga_max):
    """Sprawdza dopasowanie wagi"""
    if waga_min <= waga <= waga_max:
        return (('green', 'OK', waga_min, waga_max), 1)
    elif waga > waga_max and waga <= waga_max + WAGA_TOLERANCJA:
        return (('orange', f'O {waga - waga_max} kg za duża (miększa)', waga_min, waga_max), 0)
    elif waga < waga_min and waga >= waga_min - WAGA_TOLERANCJA:
        return (('orange', f'O {waga_min - waga} kg za mała (sztywniejsza)', waga_min, waga_max), 0)
    else:
        return (('red', 'Niedopasowana', waga_min, waga_max), 0)

def _sprawdz_wzrost(wzrost, wzrost_min, wzrost_max):
    """Sprawdza dopasowanie wzrostu"""
    if wzrost_min <= wzrost <= wzrost_max:
        return (('green', 'OK', wzrost_min, wzrost_max), 1)
    elif wzrost > wzrost_max and wzrost <= wzrost_max + WZROST_TOLERANCJA:
        return (('orange', f'O {wzrost - wzrost_max} cm za duży (zwrotniejsza)', wzrost_min, wzrost_max), 0)
    elif wzrost < wzrost_min and wzrost >= wzrost_min - WZROST_TOLERANCJA:
        return (('orange', f'O {wzrost_min - wzrost} cm za mały (stabilniejsza)', wzrost_min, wzrost_max), 0)
    else:
        return (('red', 'Niedopasowany', wzrost_min, wzrost_max), 0)

def _sprawdz_przeznaczenie(styl_jazdy, row):
    """Sprawdza dopasowanie przeznaczenia"""
    if not styl_jazdy or styl_jazdy == "Wszystkie":
        return (('green', 'OK', row.get('PRZEZNACZENIE', '')), 1)
    
    przeznaczenie = row.get('PRZEZNACZENIE', '')
    if przeznaczenie:
        przeznaczenia = [p.strip() for p in przeznaczenie.replace(',', ',').split(',')]
        if styl_jazdy in przeznaczenia:
            return (('green', 'OK', przeznaczenie), 1)
        else:
            return (('orange', f'Inne przeznaczenie ({przeznaczenie})', przeznaczenie), 0)
    else:
        return (('orange', 'Brak przeznaczenia', ''), 0)

def znajdz_idealne_dopasowania(narty, wzrost, waga, poziom, plec, styl_jazdy):
    """Znajduje narty z idealnym dopasowaniem (wszystkie kryteria na zielono)"""
    idealne = []
    
    for row in narty:
        narta_info = sprawdz_dopasowanie_narty(row, wzrost, waga, poziom, plec, styl_jazdy)
        if narta_info:
            # Sprawdź czy WSZYSTKIE kryteria są na zielono
            dopasowanie = narta_info['dopasowanie']
            wszystkie_zielone = True
            
            # Sprawdź każde kryterium
            for kryterium, status in dopasowanie.items():
                if status[0] != 'green':  # Jeśli nie jest zielone
                    wszystkie_zielone = False
                    break
            
            if wszystkie_zielone:
                idealne.append(narta_info)
    
    return idealne

def znajdz_poziom_za_nisko(narty, wzrost, waga, poziom, plec, styl_jazdy):
    """Znajduje narty z poziomem za niskim (wszystkie inne kryteria na zielono)"""
    poziom_za_nisko = []
    
    for row in narty:
        narta_info = sprawdz_dopasowanie_narty(row, wzrost, waga, poziom, plec, styl_jazdy)
        if narta_info and narta_info['poziom_niżej_kandydat']:
            # Sprawdź czy WSZYSTKIE inne kryteria są na zielono
            dopasowanie = narta_info['dopasowanie']
            wszystkie_inne_zielone = True
            
            # Sprawdź każde kryterium oprócz poziomu
            for kryterium, status in dopasowanie.items():
                if kryterium == 'poziom':
                    continue  # Pomiń poziom - ma być pomarańczowy
                if status[0] != 'green':  # Jeśli nie jest zielone
                    wszystkie_inne_zielone = False
                    break
            
            if wszystkie_inne_zielone:
                poziom_za_nisko.append(narta_info)
    
    return poziom_za_nisko

def znajdz_alternatywy(narty, wzrost, waga, poziom, plec, styl_jazdy):
    """Znajduje narty alternatywne (poziom OK, płeć OK, ale tylko JEDNO kryterium nie idealne)"""
    alternatywy = []
    
    logger.info("Szukam alternatyw: poziom OK, płeć OK, ale tylko JEDNO kryterium nie idealne")
    
    for row in narty:
        # Sprawdź czy narta ma wszystkie wymagane dane
        if not _czy_narta_ma_wszystkie_dane(row):
            continue

        # Wyciągnij dane narty
        dane_narty = _wyciagnij_dane_narty(row)
        if not dane_narty:
            continue

        # Sprawdź czy poziom nie jest za niski
        poziom_min, poziom_display = _sprawdz_poziom_narty(row, plec)
        if not poziom_min or poziom < poziom_min - POZIOM_TOLERANCJA_W_DOL:
            continue

        # Sprawdź wszystkie kryteria
        dopasowanie = {}
        zielone_punkty = 0
        poziom_niżej_kandydat = False

        # Sprawdź poziom
        poziom_result = _sprawdz_poziom(poziom, poziom_min, poziom_display)
        if not poziom_result:
            continue
        dopasowanie['poziom'] = poziom_result[0]
        zielone_punkty += poziom_result[1]
        poziom_niżej_kandydat = poziom_result[2]

        # Sprawdź płeć
        plec_result = _sprawdz_plec(plec, dane_narty['narta_plec'])
        dopasowanie['plec'] = plec_result[0]
        zielone_punkty += plec_result[1]

        # Sprawdź wagę
        waga_result = _sprawdz_wage(waga, dane_narty['waga_min'], dane_narty['waga_max'])
        dopasowanie['waga'] = waga_result[0]
        zielone_punkty += waga_result[1]

        # Sprawdź wzrost
        wzrost_result = _sprawdz_wzrost(wzrost, dane_narty['wzrost_min'], dane_narty['wzrost_max'])
        dopasowanie['wzrost'] = wzrost_result[0]
        zielone_punkty += wzrost_result[1]

        # Sprawdź przeznaczenie
        przeznaczenie_result = _sprawdz_przeznaczenie(styl_jazdy, row)
        dopasowanie['przeznaczenie'] = przeznaczenie_result[0]
        zielone_punkty += przeznaczenie_result[1]

        # Wyklucz narty z czerwonymi kryteriami (poza tolerancją)
        if any(v[0] == 'red' for v in dopasowanie.values()):
            continue

        # Sprawdź czy poziom i płeć są OK
        poziom_ok = dopasowanie.get('poziom') and dopasowanie['poziom'][0] == 'green'
        plec_ok = dopasowanie.get('plec') and dopasowanie['plec'][0] == 'green'
        
        if poziom_ok and plec_ok and not poziom_niżej_kandydat:
            # Sprawdź czy nie jest idealna (wszystkie kryteria zielone)
            wszystkie_zielone = True
            for kryterium, status in dopasowanie.items():
                if status[0] != 'green':
                    wszystkie_zielone = False
                    break
            
            # Jeśli nie jest idealna, sprawdź czy tylko JEDNO kryterium nie jest zielone
            if not wszystkie_zielone:
                nie_zielone_kryteria = [k for k, v in dopasowanie.items() if v[0] != 'green']
                
                # Tylko narty z JEDNYM kryterium nie idealnym
                if len(nie_zielone_kryteria) == 1:
                    # Oblicz współczynnik idealności
                    wspolczynnik, detale_oceny = compatibility_scorer.oblicz_wspolczynnik_idealnosci(
                        dopasowanie, wzrost, waga, poziom, plec, styl_jazdy
                    )

                    narta_info = {
                        'dane': row,
                        'dopasowanie': dopasowanie,
                        'wspolczynnik_idealnosci': wspolczynnik,
                        'detale_oceny': detale_oceny,
                        'zielone_punkty': zielone_punkty,
                        'poziom_niżej_kandydat': poziom_niżej_kandydat
                    }
                    
                    alternatywy.append(narta_info)
                    logger.info(f"Znaleziono alternatywę: {narta_info['dane'].get('MARKA', 'N/A')} {narta_info['dane'].get('MODEL', 'N/A')} - problem z: {nie_zielone_kryteria[0]}")
    
    logger.info(f"Znaleziono {len(alternatywy)} alternatyw")
    return alternatywy

def znajdz_inna_plec(narty, wzrost, waga, poziom, plec, styl_jazdy):
    """Znajduje narty z niepasującą płcią (wszystkie inne kryteria na zielono)"""
    inna_plec = []
    
    logger.info(f"Szukam nart INNA PŁEĆ dla: plec={plec}")
    
    for row in narty:
        narta_info = sprawdz_dopasowanie_narty(row, wzrost, waga, poziom, plec, styl_jazdy)
        if narta_info and not narta_info['poziom_niżej_kandydat']:
            dopasowanie = narta_info['dopasowanie']
            
            # Sprawdź czy to problem z płcią
            plec_status = dopasowanie.get('plec')
            if plec_status and plec_status[1] not in ['OK']:
                logger.info(f"Sprawdzam nartę {row.get('MARKA', 'N/A')} {row.get('MODEL', 'N/A')} - plec_status: {plec_status}")
                if 'Narta męska' in plec_status[1] or 'Narta kobieca' in plec_status[1]:
                    # Sprawdź czy WSZYSTKIE inne kryteria są na zielono
                    wszystkie_inne_zielone = True
                    for kryterium, status in dopasowanie.items():
                        if kryterium == 'plec':
                            continue  # Pomiń płeć - ma być pomarańczowa
                        if status[0] != 'green':  # Jeśli nie jest zielone
                            wszystkie_inne_zielone = False
                            logger.info(f"Kryterium {kryterium} nie jest zielone: {status}")
                            break
                    
                    if wszystkie_inne_zielone:
                        inna_plec.append(narta_info)
                        logger.info(f"Znaleziono nartę INNA PŁEĆ: {row.get('MARKA', 'N/A')} {row.get('MODEL', 'N/A')}")
                    else:
                        logger.info(f"Narta {row.get('MARKA', 'N/A')} {row.get('MODEL', 'N/A')} nie spełnia warunków INNA PŁEĆ - nie wszystkie inne kryteria zielone")
    
    logger.info(f"Znaleziono {len(inna_plec)} nart INNA PŁEĆ")
    return inna_plec

def znajdz_na_sile(narty, wzrost, waga, poziom, plec, styl_jazdy, juz_wybrane=None):
    """Znajduje narty 'NA SIŁĘ' - z większymi tolerancjami, wykluczając narty już w innych kategoriach"""
    na_sile = []
    
    if juz_wybrane is None:
        juz_wybrane = set()
    
    logger.info("Szukam nart NA SIŁĘ: z tolerancjami 10± lub poziom za nisko + tolerancja 5±")
    
    for row in narty:
        # Sprawdź czy narta ma wszystkie wymagane dane
        if not _czy_narta_ma_wszystkie_dane(row):
            continue

        # Wyciągnij dane narty
        dane_narty = _wyciagnij_dane_narty(row)
        if not dane_narty:
            continue
        
        # Sprawdź czy narta już jest w innych kategoriach
        marka = row.get('MARKA', '')
        model = row.get('MODEL', '')
        dlugosc = row.get('DLUGOSC', '')
        narta_id = f"{marka}|{model}|{dlugosc}"
        
        if narta_id in juz_wybrane:
            logger.info(f"Pomijam nartę {marka} {model} {dlugosc} - już jest w innej kategorii")
            continue

        # Sprawdź czy poziom nie jest za niski (maksymalnie 2 poziomy różnicy)
        poziom_min, poziom_display = _sprawdz_poziom_narty(row, plec)
        if not poziom_min or poziom < poziom_min - 2:
            continue

        # Sprawdź wszystkie kryteria z większymi tolerancjami
        dopasowanie = {}
        zielone_punkty = 0
        poziom_niżej_kandydat = False

        # Sprawdź poziom
        poziom_result = _sprawdz_poziom(poziom, poziom_min, poziom_display)
        if not poziom_result:
            continue
        dopasowanie['poziom'] = poziom_result[0]
        zielone_punkty += poziom_result[1]
        poziom_niżej_kandydat = poziom_result[2]

        # Sprawdź płeć
        plec_result = _sprawdz_plec(plec, dane_narty['narta_plec'])
        dopasowanie['plec'] = plec_result[0]
        zielone_punkty += plec_result[1]

        # Sprawdź wagę z tolerancją 10±
        waga_result = _sprawdz_wage_na_sile(waga, dane_narty['waga_min'], dane_narty['waga_max'])
        dopasowanie['waga'] = waga_result[0]
        zielone_punkty += waga_result[1]

        # Sprawdź wzrost z tolerancją 10±
        wzrost_result = _sprawdz_wzrost_na_sile(wzrost, dane_narty['wzrost_min'], dane_narty['wzrost_max'])
        dopasowanie['wzrost'] = wzrost_result[0]
        zielone_punkty += wzrost_result[1]

        # Sprawdź przeznaczenie
        przeznaczenie_result = _sprawdz_przeznaczenie(styl_jazdy, row)
        dopasowanie['przeznaczenie'] = przeznaczenie_result[0]
        zielone_punkty += przeznaczenie_result[1]

        # Sprawdź czy to kandydat na "NA SIŁĘ" - tylko 4 opcje (nie kombinacje):
        # 1. Poziom za niski + wzrost w tolerancji 5 (TYLKO wzrost, nie waga)
        # 2. Poziom za niski + waga w tolerancji 5 (TYLKO waga, nie wzrost)
        # 3. Waga w tolerancji 10 (TYLKO waga, poziom OK)
        # 4. Wzrost w tolerancji 10 (TYLKO wzrost, poziom OK)
        is_na_sile = False
        na_sile_powod = ""
        
        # PŁEĆ MUSI PASOWAĆ (być zielona) w kategorii NA SIŁĘ
        if dopasowanie.get('plec', ('', '', ''))[0] != 'green':
            logger.info(f"NA SIŁĘ - płeć nie pasuje: {dane_narty.get('MARKA', 'N/A')} {dane_narty.get('MODEL', 'N/A')}")
        else:
            # Opcja 1: Poziom za niski + wzrost w tolerancji 5 (TYLKO wzrost)
            if poziom_niżej_kandydat:
                wzrost_w_tolerancji_5 = (wzrost_result[0][0] in ['green', 'orange'] and 
                                       (abs(wzrost - dane_narty['wzrost_min']) <= 5 or abs(wzrost - dane_narty['wzrost_max']) <= 5))
                waga_pasuje = waga_result[0][0] == 'green'  # Waga musi być zielona
                
                if wzrost_w_tolerancji_5 and waga_pasuje:
                    is_na_sile = True
                    na_sile_powod = "poziom za niski + wzrost w tolerancji 5"
                    logger.info(f"NA SIŁĘ - {na_sile_powod}: {dane_narty.get('MARKA', 'N/A')} {dane_narty.get('MODEL', 'N/A')}")
            
            # Opcja 2: Poziom za niski + waga w tolerancji 5 (TYLKO waga)
            if not is_na_sile and poziom_niżej_kandydat:
                waga_w_tolerancji_5 = (waga_result[0][0] in ['green', 'orange'] and 
                                     (abs(waga - dane_narty['waga_min']) <= 5 or abs(waga - dane_narty['waga_max']) <= 5))
                wzrost_pasuje = wzrost_result[0][0] == 'green'  # Wzrost musi być zielony
                
                if waga_w_tolerancji_5 and wzrost_pasuje:
                    is_na_sile = True
                    na_sile_powod = "poziom za niski + waga w tolerancji 5"
                    logger.info(f"NA SIŁĘ - {na_sile_powod}: {dane_narty.get('MARKA', 'N/A')} {dane_narty.get('MODEL', 'N/A')}")
            
            # Opcja 3: Waga w tolerancji 10 (TYLKO waga, poziom OK)
            if not is_na_sile and not poziom_niżej_kandydat:
                waga_tolerancja_10 = (waga_result[0][0] in ['orange', 'red'] and 
                                    (5 < abs(waga - dane_narty['waga_min']) <= 10 or 5 < abs(waga - dane_narty['waga_max']) <= 10))
                wzrost_pasuje = wzrost_result[0][0] == 'green'  # Wzrost musi być zielony
                
                if waga_tolerancja_10 and wzrost_pasuje:
                    # Sprawdź czy reszta kryteriów pasuje (przeznaczenie)
                    reszta_pasuje = True
                    for kryterium, status in dopasowanie.items():
                        if kryterium not in ['waga', 'wzrost', 'plec']:  # Pomiń wagę, wzrost i płeć
                            if status[0] != 'green':
                                reszta_pasuje = False
                                break
                    
                    if reszta_pasuje:
                        is_na_sile = True
                        na_sile_powod = "waga w tolerancji 10"
                        logger.info(f"NA SIŁĘ - {na_sile_powod}: {dane_narty.get('MARKA', 'N/A')} {dane_narty.get('MODEL', 'N/A')}")
            
            # Opcja 4: Wzrost w tolerancji 10 (TYLKO wzrost, poziom OK)
            if not is_na_sile and not poziom_niżej_kandydat:
                wzrost_tolerancja_10 = (wzrost_result[0][0] in ['orange', 'red'] and 
                                      (5 < abs(wzrost - dane_narty['wzrost_min']) <= 10 or 5 < abs(wzrost - dane_narty['wzrost_max']) <= 10))
                waga_pasuje = waga_result[0][0] == 'green'  # Waga musi być zielona
                
                if wzrost_tolerancja_10 and waga_pasuje:
                    # Sprawdź czy reszta kryteriów pasuje (przeznaczenie)
                    reszta_pasuje = True
                    for kryterium, status in dopasowanie.items():
                        if kryterium not in ['waga', 'wzrost', 'plec']:  # Pomiń wagę, wzrost i płeć
                            if status[0] != 'green':
                                reszta_pasuje = False
                                break
                    
                    if reszta_pasuje:
                        is_na_sile = True
                        na_sile_powod = "wzrost w tolerancji 10"
                        logger.info(f"NA SIŁĘ - {na_sile_powod}: {dane_narty.get('MARKA', 'N/A')} {dane_narty.get('MODEL', 'N/A')}")

        if is_na_sile:
            # Oblicz współczynnik idealności
            wspolczynnik, detale_oceny = compatibility_scorer.oblicz_wspolczynnik_idealnosci(
                dopasowanie, wzrost, waga, poziom, plec, styl_jazdy
            )

            narta_info = {
                'dane': row,
                'dopasowanie': dopasowanie,
                'wspolczynnik_idealnosci': wspolczynnik,
                'detale_oceny': detale_oceny,
                'zielone_punkty': zielone_punkty,
                'poziom_niżej_kandydat': poziom_niżej_kandydat
            }
            
            na_sile.append(narta_info)
            logger.info(f"Znaleziono nartę NA SIŁĘ: {narta_info['dane'].get('MARKA', 'N/A')} {narta_info['dane'].get('MODEL', 'N/A')}")
    
    logger.info(f"Znaleziono {len(na_sile)} nart NA SIŁĘ")
    return na_sile

def _sprawdz_wage_na_sile(waga, waga_min, waga_max):
    """Sprawdza dopasowanie wagi z tolerancją dla kategorii NA SIŁĘ - czerwone dla 5-10"""
    if waga_min <= waga <= waga_max:
        return (('green', 'OK', waga_min, waga_max), 1)
    elif waga > waga_max and waga <= waga_max + 5:  # Tolerancja 5±
        return (('orange', f'O {waga - waga_max} kg za duża (miększa)', waga_min, waga_max), 0)
    elif waga < waga_min and waga >= waga_min - 5:  # Tolerancja 5±
        return (('orange', f'O {waga_min - waga} kg za mała (sztywniejsza)', waga_min, waga_max), 0)
    elif waga > waga_max and waga <= waga_max + 10:  # Tolerancja 5-10 (czerwone)
        return (('red', f'O {waga - waga_max} kg za duża (miększa)', waga_min, waga_max), 0)
    elif waga < waga_min and waga >= waga_min - 10:  # Tolerancja 5-10 (czerwone)
        return (('red', f'O {waga_min - waga} kg za mała (sztywniejsza)', waga_min, waga_max), 0)
    else:
        return (('red', 'Niedopasowana', waga_min, waga_max), 0)

def _sprawdz_wzrost_na_sile(wzrost, wzrost_min, wzrost_max):
    """Sprawdza dopasowanie wzrostu z tolerancją dla kategorii NA SIŁĘ - czerwone dla 5-10"""
    if wzrost_min <= wzrost <= wzrost_max:
        return (('green', 'OK', wzrost_min, wzrost_max), 1)
    elif wzrost > wzrost_max and wzrost <= wzrost_max + 5:  # Tolerancja 5±
        return (('orange', f'O {wzrost - wzrost_max} cm za duży (zwrotniejsza)', wzrost_min, wzrost_max), 0)
    elif wzrost < wzrost_min and wzrost >= wzrost_min - 5:  # Tolerancja 5±
        return (('orange', f'O {wzrost_min - wzrost} cm za mały (stabilniejsza)', wzrost_min, wzrost_max), 0)
    elif wzrost > wzrost_max and wzrost <= wzrost_max + 10:  # Tolerancja 5-10 (czerwone)
        return (('red', f'O {wzrost - wzrost_max} cm za duży (zwrotniejsza)', wzrost_min, wzrost_max), 0)
    elif wzrost < wzrost_min and wzrost >= wzrost_min - 10:  # Tolerancja 5-10 (czerwone)
        return (('red', f'O {wzrost_min - wzrost} cm za mały (stabilniejsza)', wzrost_min, wzrost_max), 0)
    else:
        return (('red', 'Niedopasowany', wzrost_min, wzrost_max), 0)

def dobierz_narty(wzrost, waga, poziom, plec, styl_jazdy=None):
    """Główna funkcja dobierania nart - teraz z osobnymi wyszukiwaniami dla każdej kategorii"""
    logger.info(f"Szukanie nart: wzrost={wzrost}, waga={waga}, poziom={poziom}, plec={plec}, styl={styl_jazdy}")
    
    try:
        # Import tutaj aby uniknąć cyklicznych importów
        from src.dane.wczytywanie_danych import wczytaj_narty
        
        # Wczytaj wszystkie narty
        wszystkie_narty = wczytaj_narty()
        if not wszystkie_narty:
            logger.error("Nie znaleziono nart w bazie danych")
            return None, None, None, None, None

        # Znajdź narty w każdej kategorii osobno
        idealne = znajdz_idealne_dopasowania(wszystkie_narty, wzrost, waga, poziom, plec, styl_jazdy)
        alternatywy = znajdz_alternatywy(wszystkie_narty, wzrost, waga, poziom, plec, styl_jazdy)
        poziom_za_nisko = znajdz_poziom_za_nisko(wszystkie_narty, wzrost, waga, poziom, plec, styl_jazdy)
        inna_plec = znajdz_inna_plec(wszystkie_narty, wzrost, waga, poziom, plec, styl_jazdy)
        
        # Zbierz narty, które już są w innych kategoriach (żeby wykluczyć je z NA SIŁĘ)
        juz_wybrane = set()
        for kategoria in [idealne, alternatywy, poziom_za_nisko, inna_plec]:
            for narta in kategoria:
                marka = narta['dane'].get('MARKA', '')
                model = narta['dane'].get('MODEL', '')
                dlugosc = narta['dane'].get('DLUGOSC', '')
                juz_wybrane.add(f"{marka}|{model}|{dlugosc}")
        
        na_sile = znajdz_na_sile(wszystkie_narty, wzrost, waga, poziom, plec, styl_jazdy, juz_wybrane)

        # Sortuj wyniki
        def sort_key(narta_info):
            wspolczynnik = narta_info.get('wspolczynnik_idealnosci', 0)
            return -wspolczynnik  # Od najwyższego do najniższego

        idealne.sort(key=sort_key)
        alternatywy.sort(key=sort_key)
        poziom_za_nisko.sort(key=sort_key)
        inna_plec.sort(key=sort_key)
        na_sile.sort(key=sort_key)

        logger.info(f"Znaleziono: {len(idealne)} idealnych, {len(alternatywy)} alternatyw, {len(poziom_za_nisko)} poziom za nisko, {len(inna_plec)} inna płeć, {len(na_sile)} na siłę")
        return idealne, alternatywy, poziom_za_nisko, inna_plec, na_sile

    except Exception as e:
        logger.error(f"Wystąpił nieoczekiwany błąd: {e}")
        from PyQt5.QtWidgets import QMessageBox
        QMessageBox.critical(None, "Błąd Krytyczny", f"Wystąpił nieoczekiwany błąd: {e}")
        return None, None, None, None, None
