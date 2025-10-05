"""
Moduł oceny dopasowania nart do klienta
Zawiera system współczynnika idealności i wag
"""
import math
import logging

logger = logging.getLogger(__name__)

class CompatibilityScorer:
    """Klasa do obliczania współczynnika idealności dopasowania nart"""
    
    def __init__(self):
        # Domyślne wagi kryteriów (suma = 1.0)
        self.wagi_kryteriow = {
            'poziom': 0.35,      # 35% - Najważniejsze (bezpieczeństwo)
            'waga': 0.25,        # 25% - Bardzo ważne (kontrola nart)
            'wzrost': 0.20,      # 20% - Ważne (stabilność i zwrotność)
            'plec': 0.15,        # 15% - Mniej ważne (ergonomia)
            'przeznaczenie': 0.05 # 5% - Najmniej ważne (styl jazdy)
        }
        
        # Parametry funkcji gaussowskich dla różnych kryteriów
        self.tolerancje = {
            'poziom': 1.0,       # Standardowe odchylenie dla poziomu
            'waga': 8.0,         # Standardowe odchylenie dla wagi (kg)
            'wzrost': 8.0,       # Standardowe odchylenie dla wzrostu (cm)
        }
    
    def gaussian_score(self, value, target, tolerance):
        """
        Oblicza wynik na podstawie funkcji gaussowskiej
        Zwraca wartość 0-1, gdzie 1 = idealne dopasowanie
        """
        if tolerance == 0:
            return 1.0 if value == target else 0.0
        
        distance = abs(value - target)
        return math.exp(-0.5 * (distance / tolerance) ** 2)
    
    def score_poziom(self, poziom_klienta, poziom_narty_info):
        """Ocenia dopasowanie poziomu umiejętności"""
        # Wyciągnij rzeczywisty poziom z informacji o narcie
        if isinstance(poziom_narty_info, tuple) and len(poziom_narty_info) >= 3:
            status, opis, poziom_str = poziom_narty_info
            
            if status == 'green' and 'OK' in opis:
                return 1.0  # Idealne dopasowanie
            elif status == 'orange':
                if 'jeden poziom' in opis:
                    return 0.7  # Dobry wynik dla 1 poziom różnicy
                else:
                    return 0.4  # Słabszy wynik dla większych różnic
            else:
                return 0.1  # Bardzo słaby wynik
        
        return 0.5  # Domyślny wynik gdy nie można sparsować
    
    def score_waga(self, waga_klienta, waga_narty_info):
        """Ocenia dopasowanie wagi"""
        if isinstance(waga_narty_info, tuple) and len(waga_narty_info) >= 4:
            status, opis, waga_min, waga_max = waga_narty_info
            
            if status == 'green':
                # Oblicz jak blisko środka zakresu jest klient
                waga_srodek = (waga_min + waga_max) / 2
                return self.gaussian_score(waga_klienta, waga_srodek, self.tolerancje['waga'])
            elif status == 'orange':
                # Klient jest poza zakresem ale w tolerancji
                if waga_klienta > waga_max:
                    distance = waga_klienta - waga_max
                else:
                    distance = waga_min - waga_klienta
                
                # Im mniejsza odległość od zakresu, tym lepszy wynik
                return max(0.3, 0.8 - (distance / 10.0))
            else:
                return 0.1
        
        return 0.5
    
    def score_wzrost(self, wzrost_klienta, wzrost_narty_info):
        """Ocenia dopasowanie wzrostu"""
        if isinstance(wzrost_narty_info, tuple) and len(wzrost_narty_info) >= 4:
            status, opis, wzrost_min, wzrost_max = wzrost_narty_info
            
            if status == 'green':
                # Oblicz jak blisko środka zakresu jest klient
                wzrost_srodek = (wzrost_min + wzrost_max) / 2
                return self.gaussian_score(wzrost_klienta, wzrost_srodek, self.tolerancje['wzrost'])
            elif status == 'orange':
                # Klient jest poza zakresem ale w tolerancji
                if wzrost_klienta > wzrost_max:
                    distance = wzrost_klienta - wzrost_max
                else:
                    distance = wzrost_min - wzrost_klienta
                
                # Im mniejsza odległość od zakresu, tym lepszy wynik
                return max(0.3, 0.8 - (distance / 15.0))
            else:
                return 0.1
        
        return 0.5
    
    def score_plec(self, plec_klienta, plec_narty_info):
        """Ocenia dopasowanie płci"""
        if isinstance(plec_narty_info, tuple) and len(plec_narty_info) >= 2:
            status, opis = plec_narty_info[:2]
            
            if status == 'green' and 'OK' in opis:
                return 1.0  # Idealne dopasowanie
            elif status == 'orange':
                if 'Narta męska' in opis or 'Narta kobieca' in opis:
                    return 0.6  # Narta dla przeciwnej płci
                else:
                    return 0.8  # Inne problemy z płcią
            else:
                return 0.2
        
        return 0.5
    
    def score_przeznaczenie(self, styl_klienta, przeznaczenie_narty_info):
        """Ocenia dopasowanie przeznaczenia/stylu jazdy"""
        if not styl_klienta or styl_klienta == "Wszystkie":
            return 1.0  # Brak preferencji = pełny wynik
        
        if isinstance(przeznaczenie_narty_info, tuple) and len(przeznaczenie_narty_info) >= 2:
            status, opis = przeznaczenie_narty_info[:2]
            
            if status == 'green' and 'OK' in opis:
                return 1.0  # Idealne dopasowanie stylu
            elif status == 'orange':
                return 0.5  # Inne przeznaczenie
            else:
                return 0.2
        
        return 0.7  # Domyślny wynik gdy brak informacji
    
    def oblicz_wspolczynnik_idealnosci(self, dopasowanie, wzrost_klienta, waga_klienta, 
                                     poziom_klienta, plec_klienta, styl_klienta=None):
        """
        Główna funkcja obliczająca współczynnik idealności (0-100%)
        """
        wyniki_kryteriow = {}
        
        # Oceń każde kryterium
        if 'poziom' in dopasowanie:
            wyniki_kryteriow['poziom'] = self.score_poziom(poziom_klienta, dopasowanie['poziom'])
        
        if 'waga' in dopasowanie:
            wyniki_kryteriow['waga'] = self.score_waga(waga_klienta, dopasowanie['waga'])
        
        if 'wzrost' in dopasowanie:
            wyniki_kryteriow['wzrost'] = self.score_wzrost(wzrost_klienta, dopasowanie['wzrost'])
        
        if 'plec' in dopasowanie:
            wyniki_kryteriow['plec'] = self.score_plec(plec_klienta, dopasowanie['plec'])
        
        if 'przeznaczenie' in dopasowanie:
            wyniki_kryteriow['przeznaczenie'] = self.score_przeznaczenie(styl_klienta, dopasowanie['przeznaczenie'])
        
        # Oblicz ważoną średnią
        suma_wazona = 0.0
        suma_wag = 0.0
        
        for kryterium, wynik in wyniki_kryteriow.items():
            if kryterium in self.wagi_kryteriow:
                waga = self.wagi_kryteriow[kryterium]
                suma_wazona += wynik * waga
                suma_wag += waga
        
        # Znormalizuj wynik do 0-100%
        if suma_wag > 0:
            wspolczynnik = (suma_wazona / suma_wag) * 100
        else:
            wspolczynnik = 0
        
        return round(wspolczynnik, 1), wyniki_kryteriow
    
    def ustaw_wagi(self, nowe_wagi):
        """Pozwala na dostosowanie wag kryteriów"""
        suma = sum(nowe_wagi.values())
        if abs(suma - 1.0) > 0.01:
            raise ValueError(f"Suma wag musi wynosić 1.0, a wynosi {suma}")
        
        self.wagi_kryteriow.update(nowe_wagi)
        logger.info(f"Zaktualizowano wagi kryteriów: {self.wagi_kryteriow}")

# Globalna instancja scorera
compatibility_scorer = CompatibilityScorer()
